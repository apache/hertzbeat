/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.collect.redfish;

import java.nio.charset.StandardCharsets;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.protocol.HttpClientContext;
import org.apache.hc.core5.http.ClassicHttpRequest;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.http.HttpStatus;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.http.io.support.ClassicRequestBuilder;
import org.apache.hc.core5.util.Timeout;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.job.protocol.RedfishProtocol;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.springframework.http.MediaType;

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

    @SuppressWarnings("deprecation")
    public ConnectSession connect() throws Exception {
        HttpClientContext httpClientContext = HttpClientContext.create();

        // Configure RequestConfig if timeout is set
        if (this.timeout > 0) {
            RequestConfig requestConfig = RequestConfig.custom()
                    .setConnectTimeout(Timeout.ofMilliseconds(this.timeout))
                    .setResponseTimeout(Timeout.ofMilliseconds(this.timeout))
                    .setRedirectsEnabled(true)
                    .build();
            httpClientContext.setRequestConfig(requestConfig);
        }

        ClassicRequestBuilder requestBuilder = ClassicRequestBuilder.post();

        String uri = REDFISH_SESSION_SERVICE;
        if (IpDomainUtil.isHasSchema(this.host)) {
            requestBuilder.setUri(this.host + ":" + this.port + uri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(this.host);
            String baseUri = NetworkConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s", this.host, this.port + uri)
                    : String.format("%s:%s", this.host, this.port + uri);

            requestBuilder.setUri(NetworkConstants.HTTPS_HEADER + baseUri);
        }

        requestBuilder.addHeader(HttpHeaders.CONNECTION, NetworkConstants.KEEP_ALIVE);
        requestBuilder.addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, NetworkConstants.USER_AGENT);
        // Content-Encoding header is usually for compression, setting charset is done in Content-Type usually,
        // but keeping original logic of setting it explicitly if that was the intent, though standard is usually empty or gzip.
        // original: requestBuilder.addHeader(HttpHeaders.CONTENT_ENCODING, StandardCharsets.UTF_8 + "");

        final String json = "{\"UserName\": \"" + this.username + "\", \"Password\": \"" + this.password + "\"}";
        StringEntity entity = new StringEntity(json, StandardCharsets.UTF_8);
        requestBuilder.setEntity(entity);

        ClassicHttpRequest request = requestBuilder.build();

        HttpClientResponseHandler<Session> responseHandler = response -> {
            int statusCode = response.getCode();
            if (statusCode != HttpStatus.SC_CREATED) {
                throw new org.apache.hc.client5.http.ClientProtocolException(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
            }
            String location = response.getFirstHeader(NetworkConstants.LOCATION).getValue();
            String auth = response.getFirstHeader(NetworkConstants.X_AUTH_TOKEN).getValue();
            return new Session(auth, location, this.host, this.port);
        };

        try {
            Session session = CommonHttpClient.getHttpClient().execute(request, httpClientContext, responseHandler);
            return new RedfishConnectSession(session);
        } catch (Exception e) {
            throw new Exception("Redfish session create error: " + e.getMessage(), e);
        }
    }
}