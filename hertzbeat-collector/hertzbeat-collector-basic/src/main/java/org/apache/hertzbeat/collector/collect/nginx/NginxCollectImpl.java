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

package org.apache.hertzbeat.collector.collect.nginx;

import static org.apache.hertzbeat.common.constants.SignConstants.RIGHT_DASH;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NginxProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpHost;
import org.apache.http.HttpStatus;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;
import org.springframework.http.MediaType;

/**
 * nginx collect
 */
@Slf4j
public class NginxCollectImpl extends AbstractCollect {

    private static final String NGINX_STATUS_NAME = "nginx_status";
    private static final String REQ_STATUS_NAME = "req_status";
    private static final String AVAILABLE = "available";
    private static final String CONNECTIONS = "connections";
    private static final String ACTIVE = "active";
    private static final String GET = "get";
    private static final String FIELD_SPLIT = "_";
    private static final String REGEX_KEYS = "server\\s+(\\w+)\\s+(\\w+)\\s+(\\w+)";
    private static final String REGEX_VALUES = "(\\d+) (\\d+) (\\d+)";
    private static final String REGEX_SERVER = "(\\w+): (\\d+)";
    private static final String REGEX_SPLIT = "\\r?\\n";
    private static final String REGEX_LINE_SPLIT = "\\s+";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        final NginxProtocol nginxProtocol;
        if (metrics == null || (nginxProtocol = metrics.getNginx()) == null || nginxProtocol.isInValid()) {
            throw new IllegalArgumentException("Nginx collect must has nginx params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        long startTime = System.currentTimeMillis();

        NginxProtocol nginxProtocol = metrics.getNginx();
        String url = nginxProtocol.getUrl();
        if (StringUtils.isEmpty(url) || !url.startsWith(RIGHT_DASH)) {
            nginxProtocol.setUrl(url == null ? RIGHT_DASH : RIGHT_DASH + url.trim());
        }

        HttpContext httpContext = createHttpContext(metrics.getNginx());
        HttpUriRequest request = createHttpRequest(metrics.getNginx());
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request, httpContext)){
            // send an HTTP request and get the response data
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != HttpStatus.SC_OK) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg(NetworkConstants.STATUS_CODE + statusCode);
                return;
            }
            String resp = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);

            Long responseTime = System.currentTimeMillis() - startTime;
            // call different parsing methods based on the metrics name
            if (StringUtils.equalsAny(metrics.getName(), NGINX_STATUS_NAME, AVAILABLE)) {
                parseNginxStatusResponse(builder, resp, metrics, responseTime);
            } else if (REQ_STATUS_NAME.equals(metrics.getName())) {
                parseReqStatusResponse(builder, resp, metrics, responseTime);
            }
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (request != null) {
                request.abort();
            }
        }

    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_NGINX;
    }

    private HttpContext createHttpContext(NginxProtocol nginxProtocol) {
        HttpHost host = new HttpHost(nginxProtocol.getHost(), Integer.parseInt(nginxProtocol.getPort()));
        HttpClientContext httpClientContext = new HttpClientContext();
        httpClientContext.setTargetHost(host);
        return httpClientContext;
    }

    private HttpUriRequest createHttpRequest(NginxProtocol nginxProtocol) {
        RequestBuilder requestBuilder = RequestBuilder.get();
        String portWithUri = nginxProtocol.getPort() + CollectUtil.replaceUriSpecialChar(nginxProtocol.getUrl());
        String host = nginxProtocol.getHost();
        
        if (IpDomainUtil.isHasSchema(host)) {
            requestBuilder.setUri(host + ":" + portWithUri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(host);
            String baseUri = NetworkConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s", host, portWithUri)
                    : String.format("%s:%s", host, portWithUri);

            boolean ssl = Boolean.parseBoolean(nginxProtocol.getSsl());
            if (ssl){
                requestBuilder.setUri(NetworkConstants.HTTPS_HEADER + baseUri);
            } else {
                requestBuilder.setUri(NetworkConstants.HTTP_HEADER + baseUri);
            }
        }

        requestBuilder.addHeader(HttpHeaders.CONNECTION, NetworkConstants.KEEP_ALIVE);
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, NetworkConstants.USER_AGENT);
        requestBuilder.addHeader(HttpHeaders.ACCEPT, MediaType.TEXT_PLAIN_VALUE);

        int timeout = Integer.parseInt(nginxProtocol.getTimeout());
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
     * analyze the information exposed by nginx's built-in ngx_http_stub_status_module
     *
     * @param builder builder
     * @param resp resp
     * @param metrics metrics
     * @param responseTime responseTime
     */
    private void parseNginxStatusResponse(CollectRep.MetricsData.Builder builder, String resp, Metrics metrics,
                                          Long responseTime) {
        //example
        //Active connections: 2
        //server accepts handled requests
        //4 4 2
        //Reading: 0 Writing: 1 Waiting: 1
        List<String> aliasFields = metrics.getAliasFields();
        Map<String, Object> metricMap = regexNginxStatusMatch(resp, metrics.getAliasFields().size());
        // Returned data
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String alias : aliasFields) {
            Object value = metricMap.get(alias);
            if (value != null) {
                valueRowBuilder.addColumn(String.valueOf(value));
            } else {
                if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(responseTime.toString());
                } else {
                    valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                }
            }
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    /**
     * Analyze the information exposed by the ngx_http_reqstat_module module
     *
     * @param builder builder
     * @param resp resp
     * @param metrics metrics
     * @param responseTime responseTime
     */
    private void parseReqStatusResponse(CollectRep.MetricsData.Builder builder, String resp, Metrics metrics,
                                        Long responseTime) {
        //example
        //zone_name       key                    max_active      max_bw  traffic   requests   active  bandwidth
        //imgstore_appid  43                     27              6M      63G       374063     0       0
        //imgstore_appid  53                     329             87M     2058G     7870529    50      25M
        //server_addr     10.128.1.17            2               8968    24M       1849       0       0
        //server_addr     127.0.0.1              1               6M      5G        912        1       0
        //server_addr     180.96.x.1             3358            934M    27550G    141277391  891     356M
        //server_addr     180.96.x.2             78              45M     220G      400704     0       0
        //server_addr     180.96.x.3             242             58M     646G      2990547    42      7M
        //server_name     d.123.sogou.com 478    115M            2850G   30218726             115     39M
        //server_name     dl.pinyin.sogou.com    913             312M    8930G     35345453   225     97M
        //server_name     download.ie.sogou.com  964             275M    7462G     7979817    297     135M
        List<ReqStatusResponse> reqStatusResponses = regexReqStatusMatch(resp);
        List<String> aliasFields = metrics.getAliasFields();

        for (ReqStatusResponse reqStatusResponse : reqStatusResponses) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                if (NetworkConstants.RESPONSE_TIME.equals(alias)) {
                    valueRowBuilder.addColumn(String.valueOf(responseTime));
                } else {
                    try {
                        String methodName = reqStatusResponse.getFieldMethodName(alias);
                        Object value = reflect(reqStatusResponse, methodName);
                        value = value == null ? CommonConstants.NULL_VALUE : value;
                        valueRowBuilder.addColumn(String.valueOf(value));
                    } catch (Exception e) {
                        String errorMsg = CommonUtil.getMessageFromThrowable(e);
                        log.error(errorMsg);
                        builder.setCode(CollectRep.Code.FAIL);
                        builder.setMsg(errorMsg);
                    }
                }
            }
            builder.addValueRow(valueRowBuilder.build());
        }
    }

    private Object reflect(ReqStatusResponse reqStatusResponse, String methodName) throws NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        Class<?> clazz = reqStatusResponse.getClass();
        Method method = clazz.getMethod(methodName);
        return method.invoke(reqStatusResponse);
    }

    private Map<String, Object> regexNginxStatusMatch(String resp, Integer aliasFieldsSize) {
        Map<String, Object> metricsMap = new HashMap<>(aliasFieldsSize);
        // Extract monitoring information using regular expressions
        Pattern pattern = Pattern.compile(REGEX_SERVER);
        Matcher matcher = pattern.matcher(resp);
        while (matcher.find()) {
            String key = StringUtils.lowerCase(matcher.group(1));
            String value = matcher.group(2);
            metricsMap.put(CONNECTIONS.equals(key) ? ACTIVE : key, value);
        }
        Pattern pattern1 = Pattern.compile(REGEX_KEYS);
        Matcher matcher1 = pattern1.matcher(resp);
        Pattern pattern2 = Pattern.compile(REGEX_VALUES);
        Matcher matcher2 = pattern2.matcher(resp);
        if (matcher1.find() && matcher2.find()) {
            for (int i = 0; i < matcher1.groupCount(); i++) {
                metricsMap.put(matcher1.group(i + 1), matcher2.group(i + 1));
            }
        }
        return metricsMap;
    }

    private List<ReqStatusResponse> regexReqStatusMatch(String resp) {
        List<ReqStatusResponse> reqStatusResponses = new ArrayList<>();

        String[] lines = resp.split(REGEX_SPLIT);
        for (int i = 1; i < lines.length; i++) {
            String[] values = lines[i].split(REGEX_LINE_SPLIT);
            ReqStatusResponse reqStatusResponse = ReqStatusResponse.builder()
                    .zoneName(values[0])
                    .key(values[1])
                    .maxActive(values[2])
                    .maxBw(values[3])
                    .traffic(values[4])
                    .requests(values[5])
                    .active(values[6])
                    .bandwidth(values[7])
                    .build();
            reqStatusResponses.add(reqStatusResponse);
        }
        return reqStatusResponses;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    static class ReqStatusResponse {
        private String zoneName; // zone_name

        private String maxActive; // max_active

        private String key; // key

        private String maxBw; // max_bw

        private String traffic; // traffic

        private String requests; // requests

        private String active; // active

        private String bandwidth; // bandwidth

        public String getFieldMethodName(String name) {
            String[] words = name.split(FIELD_SPLIT);
            StringBuilder result = new StringBuilder();
            for (String word : words) {
                result.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
            }
            return GET + result;
        }
    }
}
