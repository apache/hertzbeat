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

package org.apache.hertzbeat.collector.collect.prometheus;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.PrometheusProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpHost;
import org.apache.http.HttpStatus;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.AuthCache;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.auth.DigestScheme;
import org.apache.http.impl.client.BasicAuthCache;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.net.ssl.SSLException;

import static org.apache.hertzbeat.common.constants.SignConstants.RIGHT_DASH;


@Slf4j
public class PrometheusProxyCollectImpl implements PrometheusCollect {

    private final Set<Integer> defaultSuccessStatusCodes = Stream.of(HttpStatus.SC_OK, HttpStatus.SC_CREATED,
            HttpStatus.SC_ACCEPTED, HttpStatus.SC_MULTIPLE_CHOICES, HttpStatus.SC_MOVED_PERMANENTLY,
            HttpStatus.SC_MOVED_TEMPORARILY).collect(Collectors.toSet());

    public static final String RAW_TEXT_CONTENT_FIELD_NAME = "raw_text_content";

    @Override
    public List<CollectRep.MetricsData> collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        PrometheusProtocol prometheusProtocol = metrics.getPrometheus();
        HttpUriRequest request;
        try {
            validateParams(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return Collections.singletonList(builder.build());
        }

        HttpContext httpContext = createHttpContext(prometheusProtocol);
        request = createHttpRequest(prometheusProtocol);

        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request, httpContext)) {
            int statusCode = response.getStatusLine().getStatusCode();
            log.debug("Prometheus proxy collect, response status: {}", statusCode);

            if (!defaultSuccessStatusCodes.contains(statusCode)) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
                return Collections.singletonList(builder.build());
            }

            String rawTextContent = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);

            builder.clearFields();
            builder.clearValues();

            CollectRep.Field rawDataField = CollectRep.Field.newBuilder()
                    .setName(RAW_TEXT_CONTENT_FIELD_NAME)
                    .setType(CommonConstants.TYPE_STRING)
                    .build();
            builder.addField(rawDataField);

            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            valueRowBuilder.addColumn(rawTextContent);
            builder.addValueRow(valueRowBuilder.build());

            builder.setCode(CollectRep.Code.SUCCESS);
        } catch (ClientProtocolException e1) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e1);
            log.error("Prometheus proxy collect error: {}. Host: {}, Port: {}", errorMsg, prometheusProtocol.getHost(), prometheusProtocol.getPort(), e1);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (UnknownHostException e2) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e2);
            log.info("Prometheus proxy collect unknown host: {}. Host: {}", errorMsg, prometheusProtocol.getHost(), e2);
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("unknown host:" + errorMsg);
        } catch (InterruptedIOException | ConnectException | SSLException e3) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e3);
            log.info("Prometheus proxy collect connect error: {}. Host: {}, Port: {}", errorMsg, prometheusProtocol.getHost(), prometheusProtocol.getPort(), e3);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (IOException e4) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e4);
            log.info("Prometheus proxy collect IO error: {}. Host: {}, Port: {}", errorMsg, prometheusProtocol.getHost(), prometheusProtocol.getPort(), e4);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error("Prometheus proxy collect unknown error: {}. Host: {}, Port: {}", errorMsg, prometheusProtocol.getHost(), prometheusProtocol.getPort(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (request != null) {
                request.abort();
            }
        }
        return Collections.singletonList(builder.build());
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_PROMETHEUS;
    }

    private void validateParams(Metrics metrics) throws Exception {
        if (metrics == null || metrics.getPrometheus() == null) {
            throw new Exception("Prometheus collect must has prometheus params");
        }
        PrometheusProtocol protocol = metrics.getPrometheus();
        if (!StringUtils.hasText(protocol.getHost())
            || !StringUtils.hasText(protocol.getPort())) {
            throw new Exception("Prometheus collect must has host and port params");
        }
        if (protocol.getPath() == null
                || !StringUtils.hasText(protocol.getPath())
                || !protocol.getPath().startsWith(RIGHT_DASH)) {
            protocol.setPath(protocol.getPath() == null ? RIGHT_DASH : RIGHT_DASH + protocol.getPath().trim());
        }
    }
    
    /**
     * create httpContext
     * This method is adapted from PrometheusAutoCollectImpl
     * @param protocol prometheus protocol
     * @return context
     */
    public HttpContext createHttpContext(PrometheusProtocol protocol) {
        PrometheusProtocol.Authorization auth = protocol.getAuthorization();
        if (auth != null && DispatchConstants.DIGEST_AUTH.equals(auth.getType())) {
            HttpClientContext clientContext = new HttpClientContext();
            if (StringUtils.hasText(auth.getDigestAuthUsername())
                        && StringUtils.hasText(auth.getDigestAuthPassword())) {
                CredentialsProvider provider = new BasicCredentialsProvider();
                UsernamePasswordCredentials credentials =
                        new UsernamePasswordCredentials(auth.getDigestAuthUsername(), auth.getDigestAuthPassword());
                provider.setCredentials(AuthScope.ANY, credentials);
                AuthCache authCache = new BasicAuthCache();
                HttpHost targetHost = new HttpHost(protocol.getHost(), Integer.parseInt(protocol.getPort()));
                authCache.put(targetHost, new DigestScheme());
                clientContext.setCredentialsProvider(provider);
                clientContext.setAuthCache(authCache);
                return clientContext;
            }
        }
        return null;
    }

    /**
     * create http request
     * This method is adapted from PrometheusAutoCollectImpl
     * @param protocol http params
     * @return http uri request
     */
    public HttpUriRequest createHttpRequest(PrometheusProtocol protocol) {
        RequestBuilder requestBuilder = RequestBuilder.get();
        // params
        Map<String, String> params = protocol.getParams();
        if (params != null && !params.isEmpty()) {
            for (Map.Entry<String, String> param : params.entrySet()) {
                if (StringUtils.hasText(param.getValue())) {
                    requestBuilder.addParameter(param.getKey(), param.getValue());
                }
            }
        }
        requestBuilder.addHeader(HttpHeaders.CONNECTION, NetworkConstants.KEEP_ALIVE);
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, NetworkConstants.USER_AGENT);
        // headers  The custom request header is overwritten here
        Map<String, String> headers = protocol.getHeaders();
        if (headers != null && !headers.isEmpty()) {
            for (Map.Entry<String, String> header : headers.entrySet()) {
                if (StringUtils.hasText(header.getValue())) {
                    requestBuilder.addHeader(CollectUtil.replaceUriSpecialChar(header.getKey()),
                            CollectUtil.replaceUriSpecialChar(header.getValue()));
                }
            }
        }
        if (headers == null || headers.keySet().stream().noneMatch(HttpHeaders.ACCEPT::equalsIgnoreCase)) {
            requestBuilder.addHeader(HttpHeaders.ACCEPT, MediaType.TEXT_PLAIN_VALUE + ";version=0.0.4,*/*;q=0.1");
        }
        
        if (protocol.getAuthorization() != null) {
            PrometheusProtocol.Authorization authorization = protocol.getAuthorization();
            if (DispatchConstants.BEARER_TOKEN.equalsIgnoreCase(authorization.getType())) {
                if (StringUtils.hasText(authorization.getBearerTokenToken())) {
                    String value = DispatchConstants.BEARER + " " + authorization.getBearerTokenToken();
                    requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, value);
                }
            } else if (DispatchConstants.BASIC_AUTH.equals(authorization.getType())) {
                if (StringUtils.hasText(authorization.getBasicAuthUsername())
                            && StringUtils.hasText(authorization.getBasicAuthPassword())) {
                    String authStr = authorization.getBasicAuthUsername() + ":" + authorization.getBasicAuthPassword();
                    String encodedAuth = Base64Util.encode(authStr);
                    requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, DispatchConstants.BASIC + " " + encodedAuth);
                }
            }
        }

        if (StringUtils.hasLength(protocol.getPayload())) {
            requestBuilder.setEntity(new StringEntity(protocol.getPayload(), StandardCharsets.UTF_8));
            if (headers == null || headers.keySet().stream().noneMatch(HttpHeaders.CONTENT_TYPE::equalsIgnoreCase)) {
                requestBuilder.setHeader(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_PLAIN_VALUE);
            }
        }
        
        String uriPath = CollectUtil.replaceUriSpecialChar(protocol.getPath());
        if (IpDomainUtil.isHasSchema(protocol.getHost())) {
            requestBuilder.setUri(protocol.getHost() + SignConstants.DOUBLE_MARK + protocol.getPort() + uriPath);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(protocol.getHost());
            String baseUri = NetworkConstants.IPV6.equals(ipAddressType)
                                     ? String.format("[%s]:%s%s", protocol.getHost(), protocol.getPort(), uriPath)
                                     : String.format("%s:%s%s", protocol.getHost(), protocol.getPort(), uriPath);
            boolean ssl = Boolean.parseBoolean(protocol.getSsl());
            if (ssl) {
                requestBuilder.setUri(NetworkConstants.HTTPS_HEADER + baseUri);
            } else {
                requestBuilder.setUri(NetworkConstants.HTTP_HEADER + baseUri);
            }
        }
        
        // custom timeout
        int timeout = CollectUtil.getTimeout(protocol.getTimeout());
        if (timeout > 0) {
            RequestConfig requestConfig = RequestConfig.custom()
                                                  .setConnectTimeout(timeout)
                                                  .setSocketTimeout(timeout)
                                                  .setConnectionRequestTimeout(timeout)
                                                  .setRedirectsEnabled(true)
                                                  .build();
            requestBuilder.setConfig(requestConfig);
        } else {
            RequestConfig requestConfig = RequestConfig.custom()
                                                  .setRedirectsEnabled(true)
                                                  .build();
            requestBuilder.setConfig(requestConfig);
        }
        return requestBuilder.build();
    }

    /**
     * get collect instance
     * @return instance
     */
    public static PrometheusProxyCollectImpl getInstance() {
        return PrometheusProxyCollectImpl.SingleInstance.INSTANCE;
    }

    /**
     * static instance
     */
    private static class SingleInstance {
        private static final PrometheusProxyCollectImpl INSTANCE = new PrometheusProxyCollectImpl();
    }
}
