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

package org.apache.hertzbeat.collector.milvus;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.collect.prometheus.parser.MetricFamily;
import org.apache.hertzbeat.collector.collect.prometheus.parser.OnlineParser;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.util.EntityUtils;
import org.springframework.util.CollectionUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Milvus Collector
 */
@Slf4j
public class MilvusCollectorImpl extends AbstractCollect {

    private static final String PROTOCOL = "milvus";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getMilvus() == null) {
            throw new IllegalArgumentException("Milvus collect must has milvus params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        HttpProtocol milvus = metrics.getMilvus();
        String host = milvus.getHost();
        String port = milvus.getPort();
        String url = "http://" + host + ":" + port + "/metrics";

        HttpGet request = new HttpGet(url);
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != 200) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("StatusCode " + statusCode);
                return;
            }
            HttpEntity entity = response.getEntity();
            if (entity != null) {
                parseResponse(entity.getContent(), metrics.getAliasFields(), builder);
            }
            EntityUtils.consumeQuietly(entity);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            log.error("Milvus collect error", e);
        }
    }

    private void parseResponse(InputStream content, List<String> aliasFields, CollectRep.MetricsData.Builder builder) throws IOException {
        Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(content, builder.getMetrics());
        if (metricFamilyMap == null || metricFamilyMap.isEmpty()) {
            return;
        }
        MetricFamily metricFamily = metricFamilyMap.get(builder.getMetrics());
        if (null == metricFamily || CollectionUtils.isEmpty(metricFamily.getMetricList())) {
            return;
        }
        for (MetricFamily.Metric metric : metricFamily.getMetricList()) {
             Map<String, String> labelMap = metric.getLabels()
                    .stream()
                    .collect(Collectors.toMap(MetricFamily.Label::getName, MetricFamily.Label::getValue));
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String aliasField : aliasFields) {
                String columnValue = labelMap.get(aliasField);
                if (columnValue != null) {
                    valueRowBuilder.addColumn(columnValue);
                } else if (CommonConstants.PROM_VALUE.equals(aliasField) || CommonConstants.PROM_METRIC_VALUE.equals(aliasField)) {
                    valueRowBuilder.addColumn(String.valueOf(metric.getValue()));
                } else {
                    valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                }
            }
            builder.addValueRow(valueRowBuilder.build());
        }
    }

    @Override
    public String supportProtocol() {
        return PROTOCOL;
    }
}
