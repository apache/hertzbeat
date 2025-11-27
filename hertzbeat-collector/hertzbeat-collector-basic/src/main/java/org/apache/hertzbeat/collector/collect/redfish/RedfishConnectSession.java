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
import org.apache.hc.client5.http.classic.methods.HttpDelete;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.core5.http.HttpStatus;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.util.IpDomainUtil;

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

        HttpClientResponseHandler<Void> responseHandler = response -> {
            int statusCode = response.getCode();
            if (statusCode != HttpStatus.SC_OK) {
                throw new org.apache.hc.client5.http.ClientProtocolException(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
            }
            EntityUtils.consume(response.getEntity());
            return null;
        };

        try {
            CommonHttpClient.getHttpClient().execute(httpDelete, responseHandler);
        } catch (Exception e) {
            throw new Exception("Redfish session close error:" + e.getMessage(), e);
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

        HttpClientResponseHandler<String> responseHandler = response -> {
            int statusCode = response.getCode();
            if (statusCode != HttpStatus.SC_OK) {
                throw new org.apache.hc.client5.http.ClientProtocolException(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
            }
            return EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
        };

        try {
            return CommonHttpClient.getHttpClient().execute(httpGet, responseHandler);
        } catch (Exception e) {
            throw new Exception("Redfish session get resource error:" + e.getMessage(), e);
        }
    }
}