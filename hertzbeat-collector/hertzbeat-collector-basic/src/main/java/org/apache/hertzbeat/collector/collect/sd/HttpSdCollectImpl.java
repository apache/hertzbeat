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

package org.apache.hertzbeat.collector.collect.sd;

import com.fasterxml.jackson.core.type.TypeReference;
import com.google.common.collect.Lists;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.sd.ConnectionConfig;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryResponseEntity;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.HttpHeaders;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;
import org.springframework.http.MediaType;
import org.springframework.util.CollectionUtils;
import org.springframework.web.util.UriUtils;


/**
 * http sd collector
 */
@Slf4j
public class HttpSdCollectImpl extends AbstractCollect {
    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        List<ConnectionConfig> configList = Lists.newArrayList();

        HttpUriRequest request = createHttpRequest(metrics.getHttp_sd());
        HttpContext httpContext = createHttpContext(metrics.getHttp_sd());
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request, httpContext)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != 200) {
                log.warn("Failed to fetch sd...");
                builder.setMsg("StatusCode " + statusCode);
                builder.setCode(CollectRep.Code.FAIL);
                return;
            }

            String responseBody = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            TypeReference<List<ServiceDiscoveryResponseEntity>> typeReference = new TypeReference<>() {};
            final List<ServiceDiscoveryResponseEntity> responseEntityList = JsonUtil.fromJson(responseBody, typeReference);
            if (CollectionUtils.isEmpty(responseEntityList)) {
                return;
            }

            responseEntityList.stream()
                    .filter(entity -> !CollectionUtils.isEmpty(entity.getTarget()))
                    .forEach(responseEntity -> convertTarget(configList, responseEntity));


            configList.forEach(config -> {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                valueRowBuilder.addColumn(config.getHost());
                valueRowBuilder.addColumn(config.getPort());
                builder.addValueRow(valueRowBuilder.build());
            });
        } catch (IOException e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("Failed to fetch sd... {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    private void convertTarget(List<ConnectionConfig> configList, ServiceDiscoveryResponseEntity responseEntity) {
        responseEntity.getTarget().stream()
                .filter(StringUtils::isNotBlank)
                .forEach(fetchedTarget -> addConfig(configList, fetchedTarget));
    }

    private void addConfig(List<ConnectionConfig> configList, String fetchedTarget) {
        for (String url : fetchedTarget.split(",")) {
            final String[] split = url.split(":");
            if (split.length != 2) {
                continue;
            }

            configList.add(ConnectionConfig.builder()
                    .host(split[0])
                    .port(split[1])
                    .build());
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_HTTP_SD;
    }

    /**
     * create httpContext
     *
     * @param httpSdProtocol http sd protocol
     * @return context
     */
    public HttpContext createHttpContext(HttpProtocol httpSdProtocol) {
        HttpProtocol.Authorization auth = httpSdProtocol.getAuthorization();
        if (auth != null && DispatchConstants.DIGEST_AUTH.equals(auth.getType())) {
            HttpClientContext clientContext = new HttpClientContext();
            if (org.springframework.util.StringUtils.hasText(auth.getDigestAuthUsername())
                    && org.springframework.util.StringUtils.hasText(auth.getDigestAuthPassword())) {
                CredentialsProvider provider = new BasicCredentialsProvider();
                UsernamePasswordCredentials credentials = new UsernamePasswordCredentials(auth.getDigestAuthUsername(),
                        auth.getDigestAuthPassword());
                URL url;
                try {
                    url = new URL(httpSdProtocol.getUrl());
                } catch (MalformedURLException e) {
                    throw new IllegalArgumentException("Invalid URI format.", e);
                }
                int port = url.getPort() != -1 ? url.getPort() : ("https".equals(url.getProtocol()) ? 443 : 80);
                AuthScope authScope = new AuthScope(url.getHost(), port);
                provider.setCredentials(authScope, credentials);

                clientContext.setCredentialsProvider(provider);
                return clientContext;
            }
        }
        return null;
    }

    /**
     * create http request
     *
     * @param httpSdProtocol http request set
     * @return http uri request
     */
    public HttpUriRequest createHttpRequest(HttpProtocol httpSdProtocol) {
        RequestBuilder requestBuilder = RequestBuilder.get();

        // The default request header can be overridden if customized
        // keep-alive
        requestBuilder.addHeader(HttpHeaders.CONNECTION, NetworkConstants.KEEP_ALIVE);
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, NetworkConstants.USER_AGENT);
        // headers  The custom request header is overwritten here
        Map<String, String> headers = httpSdProtocol.getHeaders();
        if (headers != null && !headers.isEmpty()) {
            for (Map.Entry<String, String> header : headers.entrySet()) {
                if (org.springframework.util.StringUtils.hasText(header.getValue())) {
                    requestBuilder.addHeader(header.getKey(), header.getValue());
                }
            }
        }
        // add accept
        requestBuilder.addHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);

        // add authorization
        if (httpSdProtocol.getAuthorization() != null) {
            HttpProtocol.Authorization authorization = httpSdProtocol.getAuthorization();
            if (DispatchConstants.BEARER_TOKEN.equalsIgnoreCase(authorization.getType())) {
                String value = DispatchConstants.BEARER + SignConstants.BLANK + authorization.getBearerTokenToken();
                requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, value);
            } else if (DispatchConstants.BASIC_AUTH.equals(authorization.getType())) {
                if (org.springframework.util.StringUtils.hasText(authorization.getBasicAuthUsername())
                        && org.springframework.util.StringUtils.hasText(authorization.getBasicAuthPassword())) {
                    String authStr = authorization.getBasicAuthUsername() + SignConstants.DOUBLE_MARK + authorization.getBasicAuthPassword();
                    String encodedAuth = Base64Util.encode(authStr);
                    requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, DispatchConstants.BASIC + SignConstants.BLANK + encodedAuth);
                }
            }
        }

        // uri encode, default true
        boolean enableUrlEncoding = Boolean.parseBoolean(httpSdProtocol.getEnableUrlEncoding());
        if (enableUrlEncoding) {
            // if the url contains parameters directly
            if (httpSdProtocol.getUrl().contains("?")) {
                String path = httpSdProtocol.getUrl().substring(0, httpSdProtocol.getUrl().indexOf("?"));
                String query = httpSdProtocol.getUrl().substring(httpSdProtocol.getUrl().indexOf("?") + 1);
                httpSdProtocol.setUrl(UriUtils.encodePath(path, "UTF-8") + "?" + UriUtils.encodeQuery(query, "UTF-8"));
            } else {
                httpSdProtocol.setUrl(UriUtils.encodePath(httpSdProtocol.getUrl(), "UTF-8"));
            }
        }

        // set uri
        try {
            requestBuilder.setUri(httpSdProtocol.getUrl());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid URI with illegal characters: {}. User has disabled URL encoding, not applying any encoding.", httpSdProtocol.getUrl());
            throw e;
        }

        // custom timeout
        int timeout = CollectUtil.getTimeout(httpSdProtocol.getTimeout(), 0);
        if (timeout > 0) {
            RequestConfig requestConfig = RequestConfig.custom()
                    .setConnectTimeout(timeout)
                    .setSocketTimeout(timeout)
                    .setRedirectsEnabled(true)
                    .build();
            requestBuilder.setConfig(requestConfig);
        }
        return requestBuilder.build();
    }
}
