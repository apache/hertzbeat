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

package org.apache.hertzbeat.collector.collect.push;

import com.fasterxml.jackson.core.type.TypeReference;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.PushProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.push.PushMetricsDto;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpHost;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;
import org.springframework.http.MediaType;

/**
 * push style collect
 */
@Slf4j
public class PushCollectImpl extends AbstractCollect {

    private static final Map<Long, Long> timeMap = new ConcurrentHashMap<>();

    // ms
    private static final Integer DEFAULT_TIMEOUT = 3000;

    private static final Integer SUCCESS_CODE = 200;

    // It's hard to determine how long ago the first data collection was, because there's no way to know when the last collection occurred.
    // This makes it difficult to avoid re-collecting data after a restart. The default is 30 seconds
    private static final Integer FIRST_COLLECT_INTERVAL = 30000;

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getPush() == null) {
            throw new IllegalArgumentException("Push collect must has Push params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder,
                        Metrics metrics) {
        long curTime = System.currentTimeMillis();
        long monitorId = builder.getId();
        PushProtocol pushProtocol = metrics.getPush();

        Long time = timeMap.getOrDefault(monitorId, curTime - FIRST_COLLECT_INTERVAL);
        timeMap.put(monitorId, curTime);

        HttpContext httpContext = createHttpContext(pushProtocol);
        HttpUriRequest request = createHttpRequest(pushProtocol, monitorId, time);

        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request, httpContext)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != SUCCESS_CODE) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
                return;
            }
            String resp = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);

            parseResponse(builder, resp, metrics);

        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }

    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_PUSH;
    }

    private HttpContext createHttpContext(PushProtocol pushProtocol) {
        HttpHost host = new HttpHost(pushProtocol.getHost(), Integer.parseInt(pushProtocol.getPort()));
        HttpClientContext httpClientContext = new HttpClientContext();
        httpClientContext.setTargetHost(host);
        return httpClientContext;
    }

    private HttpUriRequest createHttpRequest(PushProtocol pushProtocol, Long monitorId, Long startTime) {
        RequestBuilder requestBuilder = RequestBuilder.get();


        // uri
        String uri = CollectUtil.replaceUriSpecialChar(pushProtocol.getUri());
        if (IpDomainUtil.isHasSchema(pushProtocol.getHost())) {
            requestBuilder.setUri(pushProtocol.getHost() + ":" + pushProtocol.getPort() + uri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(pushProtocol.getHost());
            String baseUri = NetworkConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s", pushProtocol.getHost(), pushProtocol.getPort() + uri)
                    : String.format("%s:%s", pushProtocol.getHost(), pushProtocol.getPort() + uri);

            requestBuilder.setUri(NetworkConstants.HTTP_HEADER + baseUri);
        }

        requestBuilder.addHeader(HttpHeaders.CONNECTION, NetworkConstants.KEEP_ALIVE);
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, NetworkConstants.USER_AGENT);

        requestBuilder.addParameter("id", String.valueOf(monitorId));
        requestBuilder.addParameter("time", String.valueOf(startTime));
        requestBuilder.addHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);


        //requestBuilder.setUri(pushProtocol.getUri());

        if (DEFAULT_TIMEOUT > 0) {
            RequestConfig requestConfig = RequestConfig.custom()
                    .setConnectTimeout(DEFAULT_TIMEOUT)
                    .setSocketTimeout(DEFAULT_TIMEOUT)
                    .setRedirectsEnabled(true)
                    .build();
            requestBuilder.setConfig(requestConfig);
        }

        return requestBuilder.build();
    }

    private void parseResponse(CollectRep.MetricsData.Builder builder, String resp, Metrics metric) {
        Message<PushMetricsDto> msg = JsonUtil.fromJson(resp, new TypeReference<>() {
        });
        if (msg == null) {
            throw new NullPointerException("parse result is null");
        }
        PushMetricsDto pushMetricsDto = msg.getData();
        if (pushMetricsDto == null || pushMetricsDto.getMetricsList() == null) {
            throw new NullPointerException("parse result is null");
        }
        for (PushMetricsDto.Metrics pushMetrics : pushMetricsDto.getMetricsList()) {
            for (Map<String, String> metrics : pushMetrics.getMetrics()) {
                List<String> metricColumn = new ArrayList<>();
                for (Metrics.Field field : metric.getFields()) {
                    metricColumn.add(metrics.get(field.getField()));
                }
                CollectRep.ValueRow valueRow = CollectRep.ValueRow.newBuilder()
                        .addAllColumns(metricColumn).build();
                builder.addValueRow(valueRow);
            }
        }
        builder.setTime(System.currentTimeMillis());
    }
}
