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

package org.dromara.hertzbeat.collector.collect.prometheus;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.util.Base64;
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
import org.dromara.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.dromara.hertzbeat.collector.collect.prometheus.parser.MetricFamily;
import org.dromara.hertzbeat.collector.collect.prometheus.parser.TextParser;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.PrometheusProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import org.springframework.util.StringUtils;

import javax.net.ssl.SSLException;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.dromara.hertzbeat.common.constants.SignConstants.RIGHT_DASH;


/**
 * prometheus auto collect
 * @author tomsun28
 */
@Slf4j
public class PrometheusAutoCollectImpl {
    
    private final Set<Integer> defaultSuccessStatusCodes = Stream.of(HttpStatus.SC_OK, HttpStatus.SC_CREATED,
            HttpStatus.SC_ACCEPTED, HttpStatus.SC_MULTIPLE_CHOICES, HttpStatus.SC_MOVED_PERMANENTLY,
            HttpStatus.SC_MOVED_TEMPORARILY).collect(Collectors.toSet());
    
    public PrometheusAutoCollectImpl() {
    }
    
    public List<CollectRep.MetricsData> collect(CollectRep.MetricsData.Builder builder,
                                                Metrics metrics) {
        try {
            validateParams(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return null;
        }
        HttpContext httpContext = createHttpContext(metrics.getPrometheus());
        HttpUriRequest request = createHttpRequest(metrics.getPrometheus());
        try {
            CloseableHttpResponse response = CommonHttpClient.getHttpClient()
                                                     .execute(request, httpContext);
            int statusCode = response.getStatusLine().getStatusCode();
            boolean isSuccessInvoke = defaultSuccessStatusCodes.contains(statusCode);
            log.debug("http response status: {}", statusCode);
            if (!isSuccessInvoke) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("StatusCode " + statusCode);
                return null;
            }
            // todo 这里直接将InputStream转为了String, 对于prometheus exporter大数据来说, 会生成大对象, 可能会严重影响JVM内存空间
            // todo 方法一、使用InputStream进行解析, 代码改动大; 方法二、手动触发gc, 可以参考dubbo for long i
            String resp = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            long collectTime = System.currentTimeMillis();
            builder.setTime(collectTime);
            if (resp == null || "".equals(resp)) {
                log.error("http response content is empty, status: {}.", statusCode);
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("http response content is empty");
            } else {
                try {
                    return parseResponseByPrometheusExporter(resp, metrics.getAliasFields(), builder);
                } catch (Exception e) {
                    log.info("parse error: {}.", e.getMessage(), e);
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("parse response data error:" + e.getMessage());
                }   
            }
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
        } finally {
            if (request != null) {
                request.abort();
            }
        }
        return Collections.singletonList(builder.build());
    }
    
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_PROMETHEUS;
    }
    
    private void validateParams(Metrics metrics) throws Exception {
        if (metrics == null || metrics.getPrometheus() == null) {
            throw new Exception("Prometheus collect must has prometheus params");
        }
        PrometheusProtocol protocol = metrics.getPrometheus();
        if (protocol.getPath() == null
                    || "".equals(protocol.getPath())
                    || !protocol.getPath().startsWith(RIGHT_DASH)) {
            protocol.setPath(protocol.getPath() == null ? RIGHT_DASH : RIGHT_DASH + protocol.getPath().trim());
        }
    }
    
    private List<CollectRep.MetricsData> parseResponseByPrometheusExporter(String resp, List<String> aliasFields,
                                                                           CollectRep.MetricsData.Builder builder) {
        Map<String, MetricFamily> metricFamilyMap = TextParser.textToMetricFamilies(resp);
        List<CollectRep.MetricsData> metricsDataList = new LinkedList<>();
        for (Map.Entry<String, MetricFamily> entry : metricFamilyMap.entrySet()) {
            builder.clearMetrics();
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
                            builder.addFields(CollectRep.Field.newBuilder().setName(label.getName())
                                    .setType(CommonConstants.TYPE_STRING).setLabel(true).build());
                        });
                        builder.addFields(CollectRep.Field.newBuilder().setName("value")
                                .setType(CommonConstants.TYPE_NUMBER).setLabel(false).build());
                    }
                    Map<String, String> labelMap = metric.getLabels()
                            .stream()
                            .collect(Collectors.toMap(MetricFamily.Label::getName, MetricFamily.Label::getValue));
                    CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                    for (String field : metricsFields) {
                        String fieldValue = labelMap.get(field);
                        valueRowBuilder.addColumns(fieldValue == null ? CommonConstants.NULL_VALUE : fieldValue);
                    }
                    valueRowBuilder.addColumns(String.valueOf(metric.getValue()));
                    builder.addValues(valueRowBuilder.build());
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
     * @return context
     */
    public HttpContext createHttpContext(PrometheusProtocol protocol) {
        PrometheusProtocol.Authorization auth = protocol.getAuthorization();
        if (auth != null && DispatchConstants.DIGEST_AUTH.equals(auth.getType())) {
            HttpClientContext clientContext = new HttpClientContext();
            if (StringUtils.hasText(auth.getDigestAuthUsername())
                        && StringUtils.hasText(auth.getDigestAuthPassword())) {
                CredentialsProvider provider = new BasicCredentialsProvider();
                UsernamePasswordCredentials credentials
                        = new UsernamePasswordCredentials(auth.getDigestAuthUsername(), auth.getDigestAuthPassword());
                provider.setCredentials(AuthScope.ANY, credentials);
                AuthCache authCache = new BasicAuthCache();
                authCache.put(new HttpHost(protocol.getHost(), Integer.parseInt(protocol.getPort())), new DigestScheme());
                clientContext.setCredentialsProvider(provider);
                clientContext.setAuthCache(authCache);
                return clientContext;
            }
        }
        return null;
    }

    /**
     * create http request
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
        // The default request header can be overridden if customized
        // keep-alive
        requestBuilder.addHeader(HttpHeaders.CONNECTION, "keep-alive");
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 6.1; WOW64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36");
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
        requestBuilder.addHeader(HttpHeaders.ACCEPT, "*/*");
        
        if (protocol.getAuthorization() != null) {
            PrometheusProtocol.Authorization authorization = protocol.getAuthorization();
            if (DispatchConstants.BEARER_TOKEN.equalsIgnoreCase(authorization.getType())) {
                String value = DispatchConstants.BEARER + " " + authorization.getBearerTokenToken();
                requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, value);
            } else if (DispatchConstants.BASIC_AUTH.equals(authorization.getType())) {
                if (StringUtils.hasText(authorization.getBasicAuthUsername())
                            && StringUtils.hasText(authorization.getBasicAuthPassword())) {
                    String authStr = authorization.getBasicAuthUsername() + ":" + authorization.getBasicAuthPassword();
                    String encodedAuth = new String(Base64.encodeBase64(authStr.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
                    requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, DispatchConstants.BASIC + " " + encodedAuth);
                }
            }
        }

        // if it has payload, would override post params
        if (StringUtils.hasLength(protocol.getPayload())) {
            requestBuilder.setEntity(new StringEntity(protocol.getPayload(), StandardCharsets.UTF_8));
        }
        
        // uri
        String uri = CollectUtil.replaceUriSpecialChar(protocol.getPath());
        if (IpDomainUtil.isHasSchema(protocol.getHost())) {
            
            requestBuilder.setUri(protocol.getHost() + ":" + protocol.getPort() + uri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(protocol.getHost());
            String baseUri = CollectorConstants.IPV6.equals(ipAddressType)
                                     ? String.format("[%s]:%s%s", protocol.getHost(), protocol.getPort(), uri)
                                     : String.format("%s:%s%s", protocol.getHost(), protocol.getPort(), uri);
            boolean ssl = Boolean.parseBoolean(protocol.getSsl());
            if (ssl) {
                requestBuilder.setUri(CollectorConstants.HTTPS_HEADER + baseUri);
            } else {
                requestBuilder.setUri(CollectorConstants.HTTP_HEADER + baseUri);
            }
        }
        
        // custom timeout
        int timeout = CollectUtil.getTimeout(protocol.getTimeout(), 0);
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
