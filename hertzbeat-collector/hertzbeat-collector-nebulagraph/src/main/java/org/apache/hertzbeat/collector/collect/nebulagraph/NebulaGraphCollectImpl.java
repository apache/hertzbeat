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

package org.apache.hertzbeat.collector.collect.nebulagraph;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import lombok.extern.slf4j.Slf4j;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.protocol.HttpClientContext;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.support.ClassicRequestBuilder;
import org.apache.hc.core5.http.protocol.HttpContext;
import org.apache.hc.core5.util.Timeout;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NebulaGraphProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.IpDomainUtil;

/**
 * NebulaGraph collect
 */
@Slf4j
public class NebulaGraphCollectImpl extends AbstractCollect {
    private static final int SUCCESS_CODE = 200;

    private static final String[] TIME_RANGE = new String[]{"5", "60", "600", "3600"};

    private static final String REGEX = "\\.%s\\=";

    private static final String STR_SPLIT = "\n";

    private static final String STORAGE_SPLIT_KEY_VALUE = "=";

    private static final String GRAPH_API = "/stats";

    private static final String STORAGE_API = "/rocksdb_stats";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getNebulaGraph() == null) {
            throw new IllegalArgumentException("NebulaGraph collect must has NebulaGraph params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        NebulaGraphProtocol nebulaGraph = metrics.getNebulaGraph();
        String timePeriod = nebulaGraph.getTimePeriod();

        if (!Objects.isNull(nebulaGraph.getTimePeriod()) && !Arrays.asList(TIME_RANGE).contains(timePeriod)) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("The time range for metric statistics, currently supporting 5 seconds, 60 seconds, 600 seconds, and 3600 seconds.");
            return;
        }

        if (nebulaGraph.getHost() == null || nebulaGraph.getHost().isEmpty()) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("The host of NebulaGraph must be set");
            return;
        }

        // Create Context and Request
        HttpContext httpContext = createHttpContext();
        HttpUriRequestBase request = createHttpRequest(nebulaGraph.getHost(), nebulaGraph.getPort(),
                nebulaGraph.getUrl(), nebulaGraph.getTimeout());

        // Send an HTTP request to obtain response data
        try {
            // Use ResponseHandler to avoid manual resource management and CloseableHttpResponse deprecation issues
            HttpClientResponseHandler<Void> responseHandler = response -> {
                int statusCode = response.getCode();
                if (statusCode != SUCCESS_CODE) {
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("StatusCode " + statusCode);
                    return null;
                }

                String resp = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
                long responseTime = System.currentTimeMillis() - startTime;
                HashMap<String, String> resultMap = new HashMap<>(64);
                resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));

                // Parse the response differently depending on the API
                if (GRAPH_API.equals(nebulaGraph.getUrl())) {
                    parseStatsResponse(resp, nebulaGraph.getTimePeriod(), resultMap);
                } else if (STORAGE_API.equals(nebulaGraph.getUrl())) {
                    parseStorageResponse(resp, resultMap);
                }

                List<String> aliasFields = metrics.getAliasFields();
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String field : aliasFields) {
                    String fieldValue = resultMap.get(field);
                    valueRowBuilder.addColumn(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
                }
                builder.addValueRow(valueRowBuilder.build());
                return null;
            };

            CommonHttpClient.getHttpClient().execute(request, httpContext, responseHandler);

        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_NEBULAGRAPH;
    }

    private HttpContext createHttpContext() {
        // HttpClient 5 automatically determines the route from the request URI
        return HttpClientContext.create();
    }

    @SuppressWarnings("deprecation")
    private HttpUriRequestBase createHttpRequest(String host, String port, String url, String timeoutStr) {
        // HttpClient 5 uses ClassicRequestBuilder
        ClassicRequestBuilder requestBuilder = ClassicRequestBuilder.get();

        // uri construction
        String uri = CollectUtil.replaceUriSpecialChar(url);
        if (IpDomainUtil.isHasSchema(host)) {
            requestBuilder.setUri(host + ":" + port + uri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(host);
            String baseUri = CollectorConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s%s", host, port, uri)
                    : String.format("%s:%s%s", host, port, uri);

            requestBuilder.setUri(CollectorConstants.HTTP_HEADER + baseUri);
        }

        requestBuilder.addHeader(HttpHeaders.CONNECTION, "keep-alive");
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 6.1; WOW64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36");
        requestBuilder.addHeader(HttpHeaders.ACCEPT, "text/plain");

        HttpUriRequestBase request = (HttpUriRequestBase) requestBuilder.build();

        int timeout = Integer.parseInt(timeoutStr);
        if (timeout > 0) {
            // Use setConnectTimeout despite deprecation to allow per-request connection timeout override on a shared client
            RequestConfig requestConfig = RequestConfig.custom()
                    .setConnectTimeout(Timeout.ofMilliseconds(timeout))
                    .setResponseTimeout(Timeout.ofMilliseconds(timeout))
                    .setRedirectsEnabled(true)
                    .build();
            request.setConfig(requestConfig);
        }
        return request;
    }

    /**
     * Parse Stats response and filter by time period
     *
     * @param responseBody response body
     * @param timePeriod   time period
     * @param resultMap    result map
     */
    private void parseStatsResponse(String responseBody, String timePeriod, HashMap<String, String> resultMap) {
        // Set up regular expression matching
        String timeRegex = String.format(REGEX, timePeriod);
        Pattern pattern = Pattern.compile(timeRegex);
        String[] strArray = responseBody.split(STR_SPLIT);
        for (String str : strArray) {
            Matcher matcher = pattern.matcher(str);
            if (matcher.find()) {
                String[] split = str.split(timeRegex);
                if (split.length > 1) {
                    resultMap.put(split[0], split[1]);
                }
            }
        }
    }

    /**
     * Parse the Storage response and filter by time period
     *
     * @param responseBody response body
     * @param resultMap    result map
     */
    private void parseStorageResponse(String responseBody, HashMap<String, String> resultMap) {
        String[] strArray = responseBody.split(STR_SPLIT);
        for (String str : strArray) {
            String[] split = str.split(STORAGE_SPLIT_KEY_VALUE);
            if (split.length > 1) {
                resultMap.put(split[0], split[1]);
            }
        }
    }
}