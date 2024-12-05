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

package org.apache.hertzbeat.warehouse.store.history.greptime;

import io.greptime.GreptimeDB;
import io.greptime.models.AuthInfo;
import io.greptime.models.DataType;
import io.greptime.models.Err;
import io.greptime.models.Result;
import io.greptime.models.Table;
import io.greptime.models.TableSchema;
import io.greptime.models.WriteOk;
import io.greptime.options.GreptimeOptions;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAmount;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.apache.commons.lang3.math.NumberUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import org.apache.hertzbeat.warehouse.store.history.AbstractHistoryDataStorage;
import org.apache.hertzbeat.warehouse.store.history.vm.PromQlQueryContent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * GreptimeDB data storage, only supports GreptimeDB version >= v0.5
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
@Slf4j
public class GreptimeDbDataStorage extends AbstractHistoryDataStorage {

    private static final String BASIC = "Basic";
    private static final String QUERY_RANGE_PATH = "/v1/prometheus/api/v1/query_range";
    private static final String LABEL_KEY_NAME = "__name__";
    private static final String LABEL_KEY_FIELD = "__field__";
    private static final String LABEL_KEY_INSTANCE = "instance";
    private static final String SPILT = "_";

    private GreptimeDB greptimeDb;

    private final GreptimeProperties greptimeProperties;

    private final RestTemplate restTemplate;

    public GreptimeDbDataStorage(GreptimeProperties greptimeProperties, RestTemplate restTemplate) {
        if (greptimeProperties == null) {
            log.error("init error, please config Warehouse GreptimeDB props in application.yml");
            throw new IllegalArgumentException("please config Warehouse GreptimeDB props");
        }
        this.restTemplate = restTemplate;
        this.greptimeProperties = greptimeProperties;
        serverAvailable = initGreptimeDbClient(greptimeProperties);
    }

    private boolean initGreptimeDbClient(GreptimeProperties greptimeProperties) {
        String endpoints = greptimeProperties.grpcEndpoints();
        try {
            GreptimeOptions opts = GreptimeOptions.newBuilder(endpoints.split(","), greptimeProperties.database())
                    .writeMaxRetries(3)
                    .authInfo(new AuthInfo(greptimeProperties.username(), greptimeProperties.password()))
                    .routeTableRefreshPeriodSeconds(30)
                    .build();
            this.greptimeDb = GreptimeDB.create(opts);
        } catch (Exception e) {
            log.error("[warehouse greptime] Fail to start GreptimeDB client");
            return false;
        }

        return true;
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse greptime] flush metrics data {} {}is null, ignore.", metricsData.getId(), metricsData.getMetrics());
            return;
        }
        String monitorId = String.valueOf(metricsData.getId());
        String tableName = getTableName(metricsData.getApp(), metricsData.getMetrics());
        TableSchema.Builder tableSchemaBuilder = TableSchema.newBuilder(tableName);

        tableSchemaBuilder.addTag("instance", DataType.String)
                .addTimestamp("ts", DataType.TimestampMillisecond);

        List<CollectRep.Field> fieldsList = metricsData.getFieldsList();
        for (CollectRep.Field field : fieldsList) {
            // handle field type
            if (field.getLabel()) {
                tableSchemaBuilder.addTag(field.getName(), DataType.String);
            } else {
                if (field.getType() == CommonConstants.TYPE_NUMBER) {
                    tableSchemaBuilder.addField(field.getName(), DataType.Float64);
                } else if (field.getType() == CommonConstants.TYPE_STRING) {
                    tableSchemaBuilder.addField(field.getName(), DataType.String);
                }
            }
        }
        Table table = Table.from(tableSchemaBuilder.build());
        try {
            long now = System.currentTimeMillis();
            Object[] values = new Object[2 + fieldsList.size()];
            values[0] = monitorId;
            values[1] = now;
            for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                for (int i = 0; i < fieldsList.size(); i++) {
                    if (!CommonConstants.NULL_VALUE.equals(valueRow.getColumns(i))) {
                        CollectRep.Field field = fieldsList.get(i);
                        if (field.getLabel()) {
                            values[2 + i] = valueRow.getColumns(i);
                        } else {
                            if (field.getType() == CommonConstants.TYPE_NUMBER) {
                                values[2 + i] = Double.parseDouble(valueRow.getColumns(i));
                            } else if (field.getType() == CommonConstants.TYPE_STRING) {
                                values[2 + i] = valueRow.getColumns(i);
                            }
                        }
                    } else {
                        values[2 + i] = null;
                    }
                }
                table.addRow(values);
            }
            CompletableFuture<Result<WriteOk, Err>> writeFuture = greptimeDb.write(table);
            try {
                Result<WriteOk, Err> result = writeFuture.get(10, TimeUnit.SECONDS);
                if (result.isOk()) {
                    log.debug("[warehouse greptime]-Write successful");
                } else {
                    log.warn("[warehouse greptime]--Write failed: {}", result.getErr());
                }
            } catch (Throwable throwable) {
                log.error("[warehouse greptime]--Error occurred: {}", throwable.getMessage());
            }
        } catch (Exception e) {
            log.error("[warehouse greptime]--Error: {}", e.getMessage(), e);
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric,
                                                         String label, String history) {
        String name = getTableName(app, metrics);
        String timeSeriesSelector = LABEL_KEY_NAME + "=\"" + name + "\""
                + "," + LABEL_KEY_INSTANCE + "=\"" + monitorId + "\"";
        if (!CommonConstants.PROMETHEUS.equals(app)) {
            timeSeriesSelector = timeSeriesSelector + "," + LABEL_KEY_FIELD + "=\"" + metric + "\"";
        }
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (StringUtils.hasText(greptimeProperties.username())
                    && StringUtils.hasText(greptimeProperties.password())) {
                String authStr = greptimeProperties.username() + ":" + greptimeProperties.password();
                String encodedAuth = new String(Base64.encodeBase64(authStr.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
                headers.add(HttpHeaders.AUTHORIZATION, BASIC + " " + encodedAuth);
            }
            Instant now = Instant.now();
            long start;
            try {
                if (NumberUtils.isParsable(history)) {
                    start = NumberUtils.toLong(history);
                    start = (ZonedDateTime.now().toEpochSecond() - start);
                } else {
                    TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(history);
                    assert temporalAmount != null;
                    Instant dateTime = now.minus(temporalAmount);
                    start = dateTime.getEpochSecond();
                }
            } catch (Exception e) {
                log.error("history time error: {}. use default: 6h", e.getMessage());
                start = now.minus(6, ChronoUnit.HOURS).getEpochSecond();
            }
            long end = now.getEpochSecond();
            String step = "60s";
            if (end - start < Duration.ofDays(7).getSeconds() && end - start > Duration.ofDays(1).getSeconds()) {
                step = "1h";
            } else if (end - start >= Duration.ofDays(7).getSeconds()) {
                step = "4h";
            }
            HttpEntity<Void> httpEntity = new HttpEntity<>(headers);
            URI uri = UriComponentsBuilder.fromHttpUrl(greptimeProperties.httpEndpoint() + QUERY_RANGE_PATH)
                    .queryParam(URLEncoder.encode("query", StandardCharsets.UTF_8), URLEncoder.encode("{" + timeSeriesSelector + "}", StandardCharsets.UTF_8))
                    .queryParam("start", start)
                    .queryParam("end", end)
                    .queryParam("step", step)
                    .build(true).toUri();
            ResponseEntity<PromQlQueryContent> responseEntity = restTemplate.exchange(uri,
                    HttpMethod.GET, httpEntity, PromQlQueryContent.class);
            if (responseEntity.getStatusCode().is2xxSuccessful()) {
                log.debug("query metrics data from victoria-metrics success. {}", uri);
                if (responseEntity.getBody() != null && responseEntity.getBody().getData() != null
                        && responseEntity.getBody().getData().getResult() != null) {
                    List<PromQlQueryContent.ContentData.Content> contents = responseEntity.getBody().getData().getResult();
                    for (PromQlQueryContent.ContentData.Content content : contents) {
                        Map<String, String> labels = content.getMetric();
                        labels.remove(LABEL_KEY_NAME);
                        labels.remove(LABEL_KEY_INSTANCE);
                        String labelStr = JsonUtil.toJson(labels);
                        if (content.getValues() != null && !content.getValues().isEmpty()) {
                            List<Value> valueList = instanceValuesMap.computeIfAbsent(labelStr, k -> new LinkedList<>());
                            for (Object[] valueArr : content.getValues()) {
                                long timestamp = ((Double) valueArr[0]).longValue();
                                String value = new BigDecimal(String.valueOf(valueArr[1])).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                                // read timestamp here is s unit
                                valueList.add(new Value(value, timestamp * 1000));
                            }
                        }
                    }
                }
            } else {
                log.error("query metrics data from greptime failed. {}", responseEntity);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    private String getTableName(String app, String metrics) {
        return app + SPILT + metrics;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics,
                                                                 String metric, String label, String history) {
        return getHistoryMetricData(monitorId, app, metrics, metric, label, history);
    }
    
    @Override
    public void destroy() {
        if (this.greptimeDb != null) {
            this.greptimeDb.shutdownGracefully();
            this.greptimeDb = null;
        }
    }
}
