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

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.http.HttpStatus;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.util.EntityUtils;

/**
 * Redfish connect session
 */
public class RedfishConnectSession implements ConnectSession {

    private final Session session;

    private volatile boolean active = true;


    public RedfishConnectSession(Session session) {
        this.session = session;
    }

    @Override
    public boolean isOpen() {
        return this.active;
    }

    @Override
    public void close() throws Exception {
        this.active = false;
        HttpDelete httpDelete = new HttpDelete(buildUrl(session.location()));
        httpDelete.setHeader(NetworkConstants.X_AUTH_TOKEN, session.token());
        httpDelete.setHeader(NetworkConstants.LOCATION, session.location());
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(httpDelete)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != HttpStatus.SC_OK
                    && statusCode != HttpStatus.SC_ACCEPTED
                    && statusCode != HttpStatus.SC_NO_CONTENT) {
                throw new Exception(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
            }
        } catch (Exception e) {
            throw new Exception("Redfish session close error:" + e.getMessage());
        } finally {
            httpDelete.abort();
        }
    }

    @Override
    public String getRedfishResource(String uri) throws Exception {
        if (uri.endsWith("/")) {
            uri = uri.substring(0, uri.length() - 1);
        }
        HttpGet httpGet = new HttpGet(buildUrl(uri));
        httpGet.setHeader(NetworkConstants.X_AUTH_TOKEN, session.token());
        httpGet.setHeader(NetworkConstants.LOCATION, session.location());
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(httpGet)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != HttpStatus.SC_OK) {
                throw new Exception(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
            }
            return EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new Exception("Redfish session get resource error:" + e.getMessage());
        } finally {
            httpGet.abort();
        }
    }

    private String buildUrl(String uri) {
        URI serviceUri = getServiceUri();
        URI resourceUri = serviceUri.resolve(uri);
        if (!hasSameOrigin(serviceUri, resourceUri)) {
            throw new IllegalArgumentException("Redfish resource URI must use the monitored endpoint");
        }
        return resourceUri.toString();
    }

    private URI getServiceUri() {
        String configuredHost = this.session.host();
        if (!IpDomainUtil.isHasSchema(configuredHost)) {
            String host = configuredHost;
            if (NetworkConstants.IPV6.equals(IpDomainUtil.checkIpAddressType(host))) {
                host = "[" + host + "]";
            }
            return URI.create(NetworkConstants.HTTPS_HEADER + host + ":" + this.session.port() + "/");
        }

        URI configuredUri = URI.create(configuredHost);
        if (configuredUri.getHost() == null) {
            throw new IllegalArgumentException("Invalid Redfish host: " + configuredHost);
        }
        int port = configuredUri.getPort() < 0 ? this.session.port() : configuredUri.getPort();
        try {
            return new URI(configuredUri.getScheme(), null, configuredUri.getHost(), port, "/", null, null);
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Invalid Redfish host: " + configuredHost, e);
        }
    }

    private boolean hasSameOrigin(URI serviceUri, URI resourceUri) {
        return resourceUri.getHost() != null
                && serviceUri.getScheme().equalsIgnoreCase(resourceUri.getScheme())
                && serviceUri.getHost().equalsIgnoreCase(resourceUri.getHost())
                && effectivePort(serviceUri) == effectivePort(resourceUri);
    }

    private int effectivePort(URI uri) {
        if (uri.getPort() >= 0) {
            return uri.getPort();
        }
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }
}
