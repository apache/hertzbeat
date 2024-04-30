/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.collect.redfish;

import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.common.constants.CollectorConstants;
import org.apache.hertzbeat.common.entity.job.protocol.RedfishProtocol;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpHost;
import org.apache.http.HttpStatus;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.entity.StringEntity;

/**
 * redfish client impl
 */
public class RedfishClient {
    private final String host;
    private final Integer port;
    private final String username;
    private final String password;
    private final Integer timeout;
    public static final String REDFISH_SESSION_SERVICE = "/redfish/v1/SessionService/Sessions";

    protected RedfishClient(String host, int port, String username, String password, Integer timeout) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.timeout = timeout;
    }

    public static RedfishClient create(RedfishProtocol redfishProtocol) {
        return new RedfishClient(redfishProtocol.getHost(), Integer.parseInt(redfishProtocol.getPort()),
                redfishProtocol.getUsername(), redfishProtocol.getPassword(), Integer.parseInt(redfishProtocol.getTimeout()));
    }

    public ConnectSession connect() throws Exception {
        HttpHost host = new HttpHost(this.host, this.port);
        HttpClientContext httpClientContext = new HttpClientContext();
        httpClientContext.setTargetHost(host);
        RequestBuilder requestBuilder = RequestBuilder.post();

        String uri = REDFISH_SESSION_SERVICE;
        if (IpDomainUtil.isHasSchema(this.host)) {
            requestBuilder.setUri(this.host + ":" + this.port + uri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(this.host);
            String baseUri = CollectorConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s", this.host, this.port + uri)
                    : String.format("%s:%s", this.host, this.port + uri);

            requestBuilder.setUri(CollectorConstants.HTTP_HEADER + baseUri);
        }

        requestBuilder.addHeader(HttpHeaders.CONNECTION, "Keep-Alive");
        requestBuilder.addHeader(HttpHeaders.CONTENT_TYPE, "application/json");
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 6.1; WOW64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36");
        requestBuilder.addHeader(HttpHeaders.CONTENT_ENCODING, "UTF-8");

        final String json = "{\"UserName\": \"" + this.username + "\", \"Password\": \"" + this.password + "\"}";
        StringEntity entity = new StringEntity(json, "UTF-8");
        requestBuilder.setEntity(entity);

        if (this.timeout > 0) {
            RequestConfig requestConfig = RequestConfig.custom()
                    .setConnectTimeout(this.timeout)
                    .setSocketTimeout(this.timeout)
                    .setRedirectsEnabled(true)
                    .build();
            requestBuilder.setConfig(requestConfig);
        }

        HttpUriRequest request = requestBuilder.build();

        Session session;
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request, httpClientContext)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != HttpStatus.SC_CREATED) {
                throw new Exception("Http Status Code: " + statusCode);
            }
            String location = response.getFirstHeader("Location").getValue();
            String auth = response.getFirstHeader("X-Auth-Token").getValue();
            session = new Session(auth, location, this.host, this.port);
        } catch (Exception e) {
            throw new Exception("Redfish session create error: " + e.getMessage());
        } finally {
            request.abort();
        }
        return new RedfishConnectSession(session);
    }
}
