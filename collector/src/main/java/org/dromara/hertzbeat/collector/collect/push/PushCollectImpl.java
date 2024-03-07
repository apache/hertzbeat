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

package org.dromara.hertzbeat.collector.collect.push;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpHost;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.PushProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.entity.push.PushMetricsDto;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import org.dromara.hertzbeat.common.util.JsonUtil;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * push style collect
 *
 * @author vinci
 */
@Slf4j
public class PushCollectImpl extends AbstractCollect {

    private static Map<Long, Long> timeMap = new ConcurrentHashMap<>();

    // ms
    private static final Integer timeout = 3000;

    private static final Integer SUCCESS_CODE = 200;

    // 第一次采集多久之前的数据，其实没有办法确定，因为无法确定上次何时采集，难以避免重启后重复采集的现象，默认30s
    private static final Integer firstCollectInterval = 30000;

    public PushCollectImpl() {
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder,
                        long monitorId, String app, Metrics metrics) {
        long curTime = System.currentTimeMillis();

        PushProtocol pushProtocol = metrics.getPush();

        Long time = timeMap.getOrDefault(monitorId, curTime - firstCollectInterval);
        timeMap.put(monitorId, curTime);

        HttpContext httpContext = createHttpContext(pushProtocol);
        HttpUriRequest request = createHttpRequest(pushProtocol, monitorId, time);

        try {
            CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request, httpContext);
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != SUCCESS_CODE) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("StatusCode " + statusCode);
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
            String baseUri = CollectorConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s", pushProtocol.getHost(), pushProtocol.getPort() + uri)
                    : String.format("%s:%s", pushProtocol.getHost(), pushProtocol.getPort() + uri);

            requestBuilder.setUri(CollectorConstants.HTTP_HEADER + baseUri);
        }

        requestBuilder.addHeader(HttpHeaders.CONNECTION, "keep-alive");
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 6.1; WOW64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36");

        requestBuilder.addParameter("id", String.valueOf(monitorId));
        requestBuilder.addParameter("time", String.valueOf(startTime));
        requestBuilder.addHeader(HttpHeaders.ACCEPT, "application/json");


        //requestBuilder.setUri(pushProtocol.getUri());

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

    private void parseResponse(CollectRep.MetricsData.Builder builder, String resp, Metrics metric) {
        Message<PushMetricsDto> msg = JsonUtil.fromJson(resp, new TypeReference<Message<PushMetricsDto>>() {
        });
        if (msg == null) {
            throw new NullPointerException("parse result is null");
        }
        PushMetricsDto pushMetricsDto = msg.getData();
        if (pushMetricsDto == null || pushMetricsDto.getMetricsList() == null) {
            throw new NullPointerException("parse result is null");
        }
        for (PushMetricsDto.Metrics pushMetrics : pushMetricsDto.getMetricsList()) {
            List<CollectRep.ValueRow> rows = new ArrayList<>();
            for (Map<String, String> metrics : pushMetrics.getMetrics()) {
                List<String> metricColumn = new ArrayList<>();
                for (Metrics.Field field : metric.getFields()) {
                    metricColumn.add(metrics.get(field.getField()));
                }
                CollectRep.ValueRow valueRow = CollectRep.ValueRow.newBuilder()
                        .addAllColumns(metricColumn).build();
                rows.add(valueRow);
            }


            builder.addAllValues(rows);
        }
        builder.setTime(System.currentTimeMillis());
    }
}
