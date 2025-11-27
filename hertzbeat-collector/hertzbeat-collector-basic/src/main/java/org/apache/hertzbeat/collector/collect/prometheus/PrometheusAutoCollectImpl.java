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

package org.apache.hertzbeat.collector.collect.prometheus;

import static org.apache.hertzbeat.common.constants.SignConstants.RIGHT_DASH;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.net.ssl.SSLException;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.collect.prometheus.parser.MetricFamily;
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
import org.apache.hertzbeat.collector.collect.prometheus.parser.OnlineParser;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.HttpStatus;
import org.apache.hc.core5.http.ClassicHttpRequest;
import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.auth.AuthCache;
import org.apache.hc.client5.http.ClientProtocolException;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.apache.hc.core5.http.io.support.ClassicRequestBuilder;
import org.apache.hc.client5.http.protocol.HttpClientContext;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.client5.http.impl.auth.DigestScheme;
import org.apache.hc.client5.http.impl.auth.BasicAuthCache;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.core5.http.protocol.HttpContext;
import org.apache.hc.core5.util.Timeout;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;

/**
 * prometheus auto collect
 */
@Slf4j
public class PrometheusAutoCollectImpl implements PrometheusCollect {

    /**
     * Inner class to wrap HTTP request with its configuration
     */
    private static class HttpRequestWithConfig {
        private final ClassicHttpRequest request;
        private final RequestConfig requestConfig;

        public HttpRequestWithConfig(ClassicHttpRequest request, RequestConfig requestConfig) {
            this.request = request;
            this.requestConfig = requestConfig;
        }

        public ClassicHttpRequest getRequest() {
            return request;
        }

        public RequestConfig getRequestConfig() {
            return requestConfig;
        }
    }

    private final Set<Integer> defaultSuccessStatusCodes = Stream.of(HttpStatus.SC_OK, HttpStatus.SC_CREATED,
            HttpStatus.SC_ACCEPTED, HttpStatus.SC_MULTIPLE_CHOICES, HttpStatus.SC_MOVED_PERMANENTLY,
            HttpStatus.SC_MOVED_TEMPORARILY).collect(Collectors.toSet());

    @Override
    public List<CollectRep.MetricsData> collect(CollectRep.MetricsData.Builder builder,
                                                Metrics metrics) {
        try {
            validateParams(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return null;
        }

        HttpRequestWithConfig requestWithConfig = createHttpRequest(metrics.getPrometheus());
        ClassicHttpRequest request = requestWithConfig.getRequest();
        HttpContext httpContext = createHttpContext(metrics.getPrometheus(), requestWithConfig.getRequestConfig());

        HttpClientResponseHandler<List<CollectRep.MetricsData>> responseHandler = response -> {
            int statusCode = response.getCode();
            boolean isSuccessInvoke = defaultSuccessStatusCodes.contains(statusCode);
            log.debug("http response status: {}", statusCode);
            if (!isSuccessInvoke) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
                return null;
            }
            try {
                // Parse directly from the entity stream inside the handler loop while connection is open
                return parseResponseByPrometheusExporter(response.getEntity().getContent(), builder);
            } catch (Exception e) {
                log.info("parse error: {}.", e.getMessage(), e);
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("parse response data error:" + e.getMessage());
                return null;
            }
        };

        try {
            return CommonHttpClient.getHttpClient().execute(request, httpContext, responseHandler);
        } catch (ClientProtocolException e1) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e1);
            log.error(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (UnknownHostException e2) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e2);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("unknown host:" + errorMsg);
        } catch (InterruptedIOException | ConnectException | SSLException e3) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e3);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (IOException e4) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e4);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
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
        if (protocol.getPath() == null
                || !StringUtils.hasText(protocol.getPath())
                || !protocol.getPath().startsWith(RIGHT_DASH)) {
            protocol.setPath(protocol.getPath() == null ? RIGHT_DASH : RIGHT_DASH + protocol.getPath().trim());
        }
    }

    private List<CollectRep.MetricsData> parseResponseByPrometheusExporter(InputStream inputStream, CollectRep.MetricsData.Builder builder) throws IOException {
        long endTime = System.currentTimeMillis();
        builder.setTime(endTime);
        Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(inputStream);
        List<CollectRep.MetricsData> metricsDataList = new LinkedList<>();
        if (metricFamilyMap == null) {
            return metricsDataList;
        }
        for (Map.Entry<String, MetricFamily> entry : metricFamilyMap.entrySet()) {
            builder.clearFields();
            builder.clearValues();
            String metricsName = entry.getKey();
            builder.setMetrics(metricsName);
            MetricFamily metricFamily = entry.getValue();
            if (!metricFamily.getMetricList().isEmpty()) {
                List<String> metricsFields = new LinkedList<>();
                for (int index = 0; index < metricFamily.getMetricList().size(); index++) {
                    MetricFamily.Metric metric = metricFamily.getMetricList().get(index);
                    if (index == 0) {
                        metric.getLabels().forEach(label -> {
                            metricsFields.add(label.getName());
                            builder.addField(CollectRep.Field.newBuilder().setName(label.getName())
                                    .setType(CommonConstants.TYPE_STRING).setLabel(true).build());
                        });
                        builder.addField(CollectRep.Field.newBuilder().setName("metric_value")
                                .setType(CommonConstants.TYPE_NUMBER).setLabel(false).build());
                    }
                    Map<String, String> labelMap = metric.getLabels()
                            .stream()
                            .collect(Collectors.toMap(MetricFamily.Label::getName, MetricFamily.Label::getValue));
                    CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                    for (String field : metricsFields) {
                        String fieldValue = labelMap.get(field);
                        valueRowBuilder.addColumn(fieldValue == null ? CommonConstants.NULL_VALUE : fieldValue);
                    }
                    valueRowBuilder.addColumn(String.valueOf(metric.getValue()));
                    builder.addValueRow(valueRowBuilder.build());
                }
                metricsDataList.add(builder.build());
            }
        }
        return metricsDataList;
    }

    /**
     * create httpContext
     *
     * @param protocol prometheus protocol
     * @param requestConfig request config
     * @return context
     */
    public HttpContext createHttpContext(PrometheusProtocol protocol, RequestConfig requestConfig) {
        HttpClientContext clientContext = HttpClientContext.create();

        if (requestConfig != null) {
            clientContext.setRequestConfig(requestConfig);
        }

        PrometheusProtocol.Authorization auth = protocol.getAuthorization();
        if (auth != null && DispatchConstants.DIGEST_AUTH.equals(auth.getType())) {
            if (StringUtils.hasText(auth.getDigestAuthUsername())
                    && StringUtils.hasText(auth.getDigestAuthPassword())) {
                BasicCredentialsProvider provider = new BasicCredentialsProvider();
                UsernamePasswordCredentials credentials =
                        new UsernamePasswordCredentials(auth.getDigestAuthUsername(), auth.getDigestAuthPassword().toCharArray());
                // Fix: Use specific AuthScope instead of AuthScope.ANY
                AuthScope authScope = new AuthScope(protocol.getHost(), Integer.parseInt(protocol.getPort()));
                provider.setCredentials(authScope, credentials);

                AuthCache authCache = new BasicAuthCache();
                authCache.put(new HttpHost(protocol.getHost(), Integer.parseInt(protocol.getPort())), new DigestScheme());
                clientContext.setCredentialsProvider(provider);
                clientContext.setAuthCache(authCache);
            }
        }
        return clientContext;
    }

    /**
     * create http request
     * @param protocol http params
     * @return http uri request wrapper
     */
    @SuppressWarnings("deprecation")
    private HttpRequestWithConfig createHttpRequest(PrometheusProtocol protocol) {
        ClassicRequestBuilder requestBuilder = ClassicRequestBuilder.get();
        // params
        Map<String, String> params = protocol.getParams();
        if (params != null && !params.isEmpty()) {
            for (Map.Entry<String, String> param : params.entrySet()) {
                if (StringUtils.hasText(param.getValue())) {
                    requestBuilder.addParameter(param.getKey(), param.getValue());
                }
            }
        }
        // The default request header can be overridden if customized
        // keep-alive
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
        // add accept
        requestBuilder.addHeader(HttpHeaders.ACCEPT, MediaType.TEXT_PLAIN_VALUE);

        if (protocol.getAuthorization() != null) {
            PrometheusProtocol.Authorization authorization = protocol.getAuthorization();
            if (DispatchConstants.BEARER_TOKEN.equalsIgnoreCase(authorization.getType())) {
                String value = DispatchConstants.BEARER + " " + authorization.getBearerTokenToken();
                requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, value);
            } else if (DispatchConstants.BASIC_AUTH.equals(authorization.getType())) {
                if (StringUtils.hasText(authorization.getBasicAuthUsername())
                        && StringUtils.hasText(authorization.getBasicAuthPassword())) {
                    String authStr = authorization.getBasicAuthUsername() + ":" + authorization.getBasicAuthPassword();
                    String encodedAuth = Base64Util.encode(authStr);
                    requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, DispatchConstants.BASIC + " " + encodedAuth);
                }
            }
        }

        // if it has payload, would override post params
        if (StringUtils.hasLength(protocol.getPayload()) && (HttpMethod.POST.matches(protocol.getMethod()) || HttpMethod.PUT.matches(protocol.getMethod()))) {
            requestBuilder.setEntity(new StringEntity(protocol.getPayload(), StandardCharsets.UTF_8));
        }

        // uri
        String uri = CollectUtil.replaceUriSpecialChar(protocol.getPath());
        if (IpDomainUtil.isHasSchema(protocol.getHost())) {

            requestBuilder.setUri(protocol.getHost() + SignConstants.DOUBLE_MARK + protocol.getPort() + uri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(protocol.getHost());
            String baseUri = NetworkConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s%s", protocol.getHost(), protocol.getPort(), uri)
                    : String.format("%s:%s%s", protocol.getHost(), protocol.getPort(), uri);
            boolean ssl = Boolean.parseBoolean(protocol.getSsl());
            if (ssl) {
                requestBuilder.setUri(NetworkConstants.HTTPS_HEADER + baseUri);
            } else {
                requestBuilder.setUri(NetworkConstants.HTTP_HEADER + baseUri);
            }
        }

        RequestConfig requestConfig = null;
        // custom timeout
        int timeout = CollectUtil.getTimeout(protocol.getTimeout(), 0);
        if (timeout > 0) {
            requestConfig = RequestConfig.custom()
                    .setConnectTimeout(Timeout.ofMilliseconds(timeout))
                    .setResponseTimeout(Timeout.ofMilliseconds(timeout))
                    .setRedirectsEnabled(true)
                    .build();
        }
        return new HttpRequestWithConfig(requestBuilder.build(), requestConfig);
    }

    /**
     * get collect instance
     * @return instance
     */
    public static PrometheusAutoCollectImpl getInstance() {
        return PrometheusAutoCollectImpl.SingleInstance.INSTANCE;
    }

    /**
     * static instance
     */
    private static class SingleInstance {
        private static final PrometheusAutoCollectImpl INSTANCE = new PrometheusAutoCollectImpl();
    }
}