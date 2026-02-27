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
        String url = RedfishClient.REDFISH_SESSION_SERVICE + session.location();
        HttpDelete httpDelete = new HttpDelete(url);
        httpDelete.setHeader(NetworkConstants.X_AUTH_TOKEN, session.token());
        httpDelete.setHeader(NetworkConstants.LOCATION, session.location());
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(httpDelete)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != HttpStatus.SC_OK) {
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
        String url = null;
        if (IpDomainUtil.isHasSchema(this.session.host())) {
            url = this.session.host() + ":" + this.session.port() + uri;
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(this.session.host());
            String baseUri = NetworkConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s", this.session.host(), this.session.port() + uri)
                    : String.format("%s:%s", this.session.host(), this.session.port() + uri);
            url = NetworkConstants.HTTPS_HEADER + baseUri;
        }
        HttpGet httpGet = new HttpGet(url);
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
}
