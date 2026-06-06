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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

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
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAmount;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiConsumer;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.math.NumberUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.AbstractHistoryDataStorage;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponents;
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
    private static final String LOG_TABLE_NAME = WarehouseConstants.LOG_TABLE_NAME;
    private static final String NATIVE_LOG_SELECT_COLUMNS = "timestamp, trace_id, span_id, severity_number, "
            + "severity_text, body, log_attributes, resource_attributes, hertzbeat_event_id, log_record_uid, "
            + "hertzbeat_ingest_id, hertzbeat_entity_id, hertzbeat_workspace_id, service_name";
    private static final String LABEL_KEY_START_TIME = "start";
    private static final String LABEL_KEY_END_TIME = "end";
    private static final int LOG_BATCH_SIZE = 500;
    private static final Pattern DAY_PATTERN = Pattern.compile("^(\\d+)[dD]$");

    private GreptimeDB greptimeDb;

    private final GreptimeProperties greptimeProperties;

    private final RestTemplate restTemplate;

    private final GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;

    public GreptimeDbDataStorage(GreptimeProperties greptimeProperties, RestTemplate restTemplate,
                                 GreptimeSqlQueryExecutor greptimeSqlQueryExecutor) {
        if (greptimeProperties == null) {
            log.error("init error, please config Warehouse GreptimeDB props in application.yml");
            throw new IllegalArgumentException("please config Warehouse GreptimeDB props");
        }
        this.restTemplate = restTemplate;
        this.greptimeProperties = greptimeProperties;
        this.greptimeSqlQueryExecutor = greptimeSqlQueryExecutor;
        serverAvailable = initGreptimeDbClient(greptimeProperties);
        if (serverAvailable) {
            applyDatabaseTtlIfConfigured(greptimeProperties);
        }
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
        } catch (Throwable t) {
            log.error("[warehouse greptime] Fail to start GreptimeDB client", t);
            return false;
        }

        return true;
    }

    private void applyDatabaseTtlIfConfigured(GreptimeProperties properties) {
        String expireTime = normalizeExpireTime(properties.expireTime());
        if (expireTime == null) {
            return;
        }
        String database = properties.database();
        if (!StringUtils.hasText(database)) {
            log.warn("[warehouse greptime] skip ttl init because database is blank.");
            return;
        }
        String sql = "ALTER DATABASE " + database.trim() + " SET 'ttl'='" + expireTime + "'";
        try {
            greptimeSqlQueryExecutor.execute(sql);
            log.info("[warehouse greptime] applied database ttl {} for {}.", expireTime, database.trim());
        } catch (Exception ex) {
            log.warn("[warehouse greptime] failed to apply database ttl {} for {}: {}",
                    expireTime, database.trim(), ex.getMessage());
        }
    }

    private String normalizeExpireTime(String expireTime) {
        if (!StringUtils.hasText(expireTime)) {
            return null;
        }
        String normalized = expireTime.trim();
        if (NumberUtils.isParsable(normalized) || DAY_PATTERN.matcher(normalized).matches()) {
            return normalized;
        }
        try {
            TemporalAmount ignored = TimePeriodUtil.parseTokenTime(normalized);
            return normalized;
        } catch (Exception ex) {
            log.warn("[warehouse greptime] invalid expire-time {}, skip ttl init.", normalized);
            return null;
        }
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValues().isEmpty()) {
            log.info("[warehouse greptime] flush metrics data {} {}is null, ignore.", metricsData.getId(), metricsData.getMetrics());
            return;
        }
        String instance = metricsData.getInstance();
        String app = metricsData.getApp();
        String tableName = getTableName(app, metricsData.getMetrics());
        TableSchema.Builder tableSchemaBuilder = TableSchema.newBuilder(tableName);

        tableSchemaBuilder.addTag("instance", DataType.String)
                .addTimestamp("ts", DataType.TimestampMillisecond);
        List<CollectRep.Field> fields = metricsData.getFields();
        fields.forEach(field -> {
            if (field.getLabel()) {
                tableSchemaBuilder.addTag(field.getName(), DataType.String);
            } else {
                if (field.getType() == CommonConstants.TYPE_NUMBER) {
                    tableSchemaBuilder.addField(field.getName(), DataType.Float64);
                } else if (field.getType() == CommonConstants.TYPE_STRING) {
                    tableSchemaBuilder.addField(field.getName(), DataType.String);
                }
            }
        });
        Table table = Table.from(tableSchemaBuilder.build());
        long now = System.currentTimeMillis();
        Object[] values = new Object[2 + fields.size()];
        values[0] = instance;
        values[1] = now;
        RowWrapper rowWrapper = metricsData.readRow();
        while (rowWrapper.hasNextRow()) {
            rowWrapper = rowWrapper.nextRow();

            AtomicInteger index = new AtomicInteger(-1);
            rowWrapper.cellStream().forEach(cell -> {
                index.getAndIncrement();

                if (CommonConstants.NULL_VALUE.equals(cell.getValue())) {
                    values[2 + index.get()] = null;
                    return;
                }

                Boolean label = cell.getMetadataAsBoolean(MetricDataConstants.LABEL);
                Byte type = cell.getMetadataAsByte(MetricDataConstants.TYPE);

                if (label) {
                    values[2 + index.get()] = cell.getValue();
                } else {
                    if (type == CommonConstants.TYPE_NUMBER) {
                        values[2 + index.get()] = Double.parseDouble(cell.getValue());
                    } else if (type == CommonConstants.TYPE_STRING) {
                        values[2 + index.get()] = cell.getValue();
                    }
                }
            });

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
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(String instance, String app, String metrics, String metric,
                                                         String history) {
        return getHistoryMetricData(instance, app, metrics, metric, history, null, null, null);
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(String instance, String app, String metrics, String metric,
                                                         String history, Long start, Long end, String step) {
        Map<String, Long> timeRange = getTimeRange(history, start, end);
        Long startTime = timeRange.get(LABEL_KEY_START_TIME);
        Long endTime = timeRange.get(LABEL_KEY_END_TIME);

        String queryStep = StringUtils.hasText(step) ? step : getTimeStep(startTime, endTime);

        return getHistoryData(startTime, endTime, queryStep, instance, app, metrics, metric);
    }

    private String getTableName(String app, String metrics) {
        return app + "_" + metrics;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(String instance, String app, String metrics,
                                                                 String metric, String history) {
        return getHistoryIntervalMetricData(instance, app, metrics, metric, history, null, null, null);
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(String instance, String app, String metrics,
                                                                 String metric, String history, Long start, Long end,
                                                                 String step) {
        Map<String, Long> timeRange = getTimeRange(history, start, end);
        Long startTime = timeRange.get(LABEL_KEY_START_TIME);
        Long endTime = timeRange.get(LABEL_KEY_END_TIME);

        String queryStep = StringUtils.hasText(step) ? step : getTimeStep(startTime, endTime);

        Map<String, List<Value>> instanceValuesMap = getHistoryData(startTime, endTime, queryStep, instance, app,
                metrics, metric);

        if (instanceValuesMap.isEmpty()) {
            return Collections.emptyMap();
        }
        // Queries below this point may yield inconsistent results due to exceeding the valid data range.
        // Therefore, we restrict the valid range by obtaining the post-query timeframe.
        // Since Greptime's end excludes the specified time, add one query step.
        List<Value> values = instanceValuesMap.get(instanceValuesMap.keySet().iterator().next());
        // Keep explicitly requested query windows stable across the base, max, min, and avg requests.
        boolean hasAbsoluteWindow = start != null && end != null && start > 0 && end > 0 && start < end;
        long effectiveStart = hasAbsoluteWindow ? startTime : values.get(0).getTime() / 1000;
        long effectiveEnd = hasAbsoluteWindow
                ? endTime
                : values.get(values.size() - 1).getTime() / 1000 + parseStepSeconds(queryStep);

        String name = getTableName(app, metrics);
        String timeSeriesSelector = name + "{" + LABEL_KEY_INSTANCE + "=\"" + instance + "\"";
        if (!CommonConstants.PROMETHEUS.equals(app)) {
            timeSeriesSelector = timeSeriesSelector + "," + LABEL_KEY_FIELD + "=\"" + metric + "\"";
        }
        timeSeriesSelector = timeSeriesSelector + "}";

        try {
            // max
            String finalTimeSeriesSelector = timeSeriesSelector;
            URI uri = getUri(effectiveStart, effectiveEnd, queryStep,
                    uriComponents -> "max_over_time(" + finalTimeSeriesSelector + "[" + queryStep + "])");
            requestIntervalMetricAndPutValue(uri, instanceValuesMap, Value::setMax);
            // min
            uri = getUri(effectiveStart, effectiveEnd, queryStep,
                    uriComponents -> "min_over_time(" + finalTimeSeriesSelector + "[" + queryStep + "])");
            requestIntervalMetricAndPutValue(uri, instanceValuesMap, Value::setMin);
            // avg
            uri = getUri(effectiveStart, effectiveEnd, queryStep,
                    uriComponents -> "avg_over_time(" + finalTimeSeriesSelector + "[" + queryStep + "])");
            requestIntervalMetricAndPutValue(uri, instanceValuesMap, Value::setMean);
        } catch (Exception e) {
            log.error("query interval metrics data from greptime error. {}", e.getMessage(), e);
        }

        return instanceValuesMap;
    }

    /**
     * Get time range
     *
     * @param history history range
     * @return time range
     */
    private Map<String, Long> getTimeRange(String history) {
        // Build start and end times
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
        return Map.of("start", start, "end", end);
    }

    private Map<String, Long> getTimeRange(String history, Long start, Long end) {
        if (start != null && end != null && start > 0 && end > 0 && start < end) {
            return Map.of(LABEL_KEY_START_TIME, start / 1000, LABEL_KEY_END_TIME, end / 1000);
        }
        return getTimeRange(history);
    }

    /**
     * Get time step
     *
     * @param start start time
     * @param end   end time
     * @return step
     */
    private String getTimeStep(long start, long end) {
        // get step
        String step = "60s";
        if (end - start < Duration.ofDays(7).getSeconds() && end - start > Duration.ofDays(1).getSeconds()) {
            step = "1h";
        } else if (end - start >= Duration.ofDays(7).getSeconds()) {
            step = "4h";
        }
        return step;
    }

    private long parseStepSeconds(String step) {
        if (!StringUtils.hasText(step)) {
            return Duration.ofMinutes(1).getSeconds();
        }
        try {
            String normalized = step.trim().toLowerCase(Locale.ROOT);
            if (normalized.endsWith("ms")) {
                long value = Long.parseLong(normalized.substring(0, normalized.length() - 2));
                return Math.max(1L, value / 1000L);
            }
            long value = Long.parseLong(normalized.substring(0, normalized.length() - 1));
            String unit = normalized.substring(normalized.length() - 1);
            return switch (unit) {
                case "s" -> value;
                case "m" -> Duration.ofMinutes(value).getSeconds();
                case "h" -> Duration.ofHours(value).getSeconds();
                case "d" -> Duration.ofDays(value).getSeconds();
                default -> Duration.ofMinutes(1).getSeconds();
            };
        } catch (Exception e) {
            return Duration.ofMinutes(1).getSeconds();
        }
    }

    /**
     * Get history metric data
     *
     * @param start     start time
     * @param end       end time
     * @param step      step
     * @param instance  monitor instance
     * @param app       monitor type
     * @param metrics   metrics
     * @param metric    metric
     * @return history metric data
     */
    private Map<String, List<Value>> getHistoryData(long start, long end, String step, String instance, String app, String metrics, String metric) {
        String name = getTableName(app, metrics);
        String timeSeriesSelector = LABEL_KEY_NAME + "=\"" + name + "\""
                + "," + LABEL_KEY_INSTANCE + "=\"" + instance + "\"";
        if (!CommonConstants.PROMETHEUS.equals(app)) {
            timeSeriesSelector = timeSeriesSelector + "," + LABEL_KEY_FIELD + "=\"" + metric + "\"";
        }

        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        try {
            HttpEntity<Void> httpEntity = getHttpEntity();

            String finalTimeSeriesSelector = timeSeriesSelector;
            URI uri = getUri(start, end, step, uriComponents -> {
                MultiValueMap<String, String> queryParams = uriComponents.getQueryParams();
                if (!queryParams.isEmpty()) {
                    return "{" + finalTimeSeriesSelector + "}";
                }
                return null;
            });

            ResponseEntity<PromQlQueryContent> responseEntity = null;
            if (uri != null) {
                responseEntity = restTemplate.exchange(uri,
                        HttpMethod.GET, httpEntity, PromQlQueryContent.class);
            }
            if (responseEntity != null && responseEntity.getStatusCode().is2xxSuccessful()) {
                log.debug("query metrics data from greptime success. {}", uri);
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
                                valueList.add(new Value(value, timestamp * 1000));
                            }
                        }
                    }
                }
            } else {
                log.error("query metrics data from greptime failed. {}", responseEntity);
            }
        } catch (Exception e) {
            log.error("query metrics data from greptime error. {}", e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    /**
     * Get HTTP instance
     *
     * @return HTTP instance
     */
    private HttpEntity<Void> getHttpEntity() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (StringUtils.hasText(greptimeProperties.username())
                && StringUtils.hasText(greptimeProperties.password())) {
            String authStr = greptimeProperties.username() + ":" + greptimeProperties.password();
            String encodedAuth = Base64Util.encode(authStr);
            headers.add(HttpHeaders.AUTHORIZATION, BASIC + " " + encodedAuth);
        }
        return new HttpEntity<>(headers);
    }

    /**
     * Get Request URI
     *
     * @param start         start time
     * @param end           end time
     * @param step          interval
     * @param queryFunction request parameters
     * @return URI
     */
    private URI getUri(long start, long end, String step, Function<UriComponents, String> queryFunction) {
        UriComponentsBuilder uriComponentsBuilder = UriComponentsBuilder.fromUriString(greptimeProperties.httpEndpoint() + QUERY_RANGE_PATH)
                .queryParam("start", start)
                .queryParam("end", end)
                .queryParam("step", step)
                .queryParam("db", greptimeProperties.database());
        UriComponents cloneUriComponents = uriComponentsBuilder.cloneBuilder().build(true);
        String queryValue = queryFunction.apply(cloneUriComponents);
        if (!StringUtils.hasText(queryValue)) {
            return null;
        }
        UriComponents uriComponents = uriComponentsBuilder
                .queryParam(
                        URLEncoder.encode("query", StandardCharsets.UTF_8),
                        URLEncoder.encode(queryValue, StandardCharsets.UTF_8)
                ).build(true);
        return uriComponents.toUri();
    }

    /**
     * Request greptime and assign a value
     *
     * @param uri               request URI
     * @param instanceValuesMap metrics data
     * @param valueConsumer     consumer used for assigning values
     */
    private void requestIntervalMetricAndPutValue(URI uri, Map<String, List<Value>> instanceValuesMap, BiConsumer<Value, String> valueConsumer) {
        if (uri == null) {
            return;
        }
        HttpEntity<Void> httpEntity = getHttpEntity();
        ResponseEntity<PromQlQueryContent> responseEntity = restTemplate.exchange(uri,
                HttpMethod.GET, httpEntity, PromQlQueryContent.class);
        if (!responseEntity.getStatusCode().is2xxSuccessful()) {
            log.error("query interval metrics data from greptime failed. {}", responseEntity);
            return;
        }
        log.debug("query interval metrics data from greptime success. {}", uri);
        PromQlQueryContent body = responseEntity.getBody();
        if (body == null || body.getData() == null || body.getData().getResult() == null) {
            return;
        }
        List<PromQlQueryContent.ContentData.Content> contents = body.getData().getResult();
        for (PromQlQueryContent.ContentData.Content content : contents) {
            Map<String, String> labels = content.getMetric();
            labels.remove(LABEL_KEY_NAME);
            labels.remove(LABEL_KEY_INSTANCE);
            String labelStr = JsonUtil.toJson(labels);
            if (content.getValues() == null || content.getValues().isEmpty()) {
                continue;
            }
            List<Value> valueList = instanceValuesMap.computeIfAbsent(labelStr, k -> new LinkedList<>());
            if (valueList.size() == content.getValues().size()) {
                for (int timestampIndex = 0; timestampIndex < valueList.size(); timestampIndex++) {
                    Value value = valueList.get(timestampIndex);
                    Object[] valueArr = content.getValues().get(timestampIndex);
                    String avgValue = new BigDecimal(String.valueOf(valueArr[1])).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                    valueConsumer.accept(value, avgValue);
                }
            }
        }
    }

    @Override
    public void destroy() {
        if (this.greptimeDb != null) {
            try {
                this.greptimeDb.shutdownGracefully();
            } catch (Throwable t) {
                log.warn("[warehouse greptime] Fail to shutdown GreptimeDB client gracefully", t);
            }
            this.greptimeDb = null;
        }
    }

    @Override
    public void saveLogData(LogEntry logEntry) {
        if (!isServerAvailable()) {
            return;
        }

        try {
            Table table = newLogTable();
            Object[] values = logValues(logEntry);

            table.addRow(values);

            // Write to GreptimeDB
            CompletableFuture<Result<WriteOk, Err>> writeFuture = greptimeDb.write(table);
            Result<WriteOk, Err> result = writeFuture.get(10, TimeUnit.SECONDS);

            if (result.isOk()) {
                log.debug("[warehouse greptime-log] Write successful");
            } else {
                log.warn("[warehouse greptime-log] Write failed: {}", result.getErr());
            }
        } catch (Exception e) {
            log.error("[warehouse greptime-log] Error saving log entry", e);
        }
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent) {
        return queryLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, Collections.emptySet(), false);
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent,
                                                        Set<String> excludedServiceNames,
                                                        boolean requireServiceName) {
        return queryLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, excludedServiceNames, requireServiceName, null, null, null, null);
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent,
                                                        Set<String> excludedServiceNames,
                                                        boolean requireServiceName,
                                                        String workspaceId,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment) {
        return queryLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, excludedServiceNames, requireServiceName,
                workspaceId, serviceName, serviceNamespace, environment, Map.of(), Map.of());
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent,
                                                        Set<String> excludedServiceNames,
                                                        boolean requireServiceName,
                                                        String workspaceId,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment,
                                                        Map<String, String> resourceFilters,
                                                        Map<String, String> attributeFilters) {
        try {
            StringBuilder sql = new StringBuilder("SELECT ").append(NATIVE_LOG_SELECT_COLUMNS)
                    .append(" FROM ").append(LOG_TABLE_NAME);
            buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                    searchContent, excludedServiceNames, requireServiceName, workspaceId,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
            sql.append(" ORDER BY timestamp DESC");

            List<Map<String, Object>> rows = greptimeSqlQueryExecutor.execute(sql.toString());
            return mapRowsToLogEntries(rows);
        } catch (Exception e) {
            log.error("[warehouse greptime-log] queryLogsByMultipleConditions error: {}", e.getMessage(), e);
            return List.of();
        }
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                      String spanId, Integer severityNumber,
                                                                      String severityText, String searchContent,
                                                                      Integer offset, Integer limit) {
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, offset, limit, Collections.emptySet(), false);
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                      String spanId, Integer severityNumber,
                                                                      String severityText, String searchContent,
                                                                      Integer offset, Integer limit,
                                                                      Set<String> excludedServiceNames,
                                                                      boolean requireServiceName) {
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, offset, limit, excludedServiceNames, requireServiceName, null);
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                      String spanId, Integer severityNumber,
                                                                      String severityText, String searchContent,
                                                                      Integer offset, Integer limit,
                                                                      Set<String> excludedServiceNames,
                                                                      boolean requireServiceName,
                                                                      String workspaceId) {
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, offset, limit, excludedServiceNames, requireServiceName,
                workspaceId, null, null, null);
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                      String spanId, Integer severityNumber,
                                                                      String severityText, String searchContent,
                                                                      Integer offset, Integer limit,
                                                                      Set<String> excludedServiceNames,
                                                                      boolean requireServiceName,
                                                                      String workspaceId,
                                                                      Map<String, String> resourceFilters,
                                                                      Map<String, String> attributeFilters) {
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, offset, limit, excludedServiceNames, requireServiceName,
                workspaceId, null, null, null, resourceFilters, attributeFilters);
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                      String spanId, Integer severityNumber,
                                                                      String severityText, String searchContent,
                                                                      Integer offset, Integer limit,
                                                                      Set<String> excludedServiceNames,
                                                                      boolean requireServiceName,
                                                                      String workspaceId,
                                                                      String serviceName,
                                                                      String serviceNamespace,
                                                                      String environment) {
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, offset, limit, excludedServiceNames, requireServiceName,
                workspaceId, serviceName, serviceNamespace, environment, Map.of(), Map.of());
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                      String spanId, Integer severityNumber,
                                                                      String severityText, String searchContent,
                                                                      Integer offset, Integer limit,
                                                                      Set<String> excludedServiceNames,
                                                                      boolean requireServiceName,
                                                                      String workspaceId,
                                                                      String serviceName,
                                                                      String serviceNamespace,
                                                                      String environment,
                                                                      Map<String, String> resourceFilters,
                                                                      Map<String, String> attributeFilters) {
        try {
            StringBuilder sql = new StringBuilder("SELECT ").append(NATIVE_LOG_SELECT_COLUMNS)
                    .append(" FROM ").append(LOG_TABLE_NAME);
            buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                    searchContent, excludedServiceNames, requireServiceName, workspaceId,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
            sql.append(" ORDER BY timestamp DESC");

            // Add pagination
            if (limit != null && limit > 0) {
                sql.append(" LIMIT ").append(limit);
                if (offset != null && offset > 0) {
                    sql.append(" OFFSET ").append(offset);
                }
            }

            List<Map<String, Object>> rows = greptimeSqlQueryExecutor.execute(sql.toString());
            return mapRowsToLogEntries(rows);
        } catch (Exception e) {
            log.error("[warehouse greptime-log] queryLogsByMultipleConditionsWithPagination error: {}", e.getMessage(), e);
            return List.of();
        }
    }

    @Override
    public long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent) {
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, Collections.emptySet(), false);
    }

    @Override
    public long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName) {
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, null);
    }

    @Override
    public long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId) {
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, workspaceId, null, null, null);
    }

    @Override
    public long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId,
                                             Map<String, String> resourceFilters,
                                             Map<String, String> attributeFilters) {
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, workspaceId,
                null, null, null, resourceFilters, attributeFilters);
    }

    @Override
    public long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId,
                                             String serviceName,
                                             String serviceNamespace,
                                             String environment) {
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, excludedServiceNames, requireServiceName,
                workspaceId, serviceName, serviceNamespace, environment, Map.of(), Map.of());
    }

    @Override
    public long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId,
                                             String serviceName,
                                             String serviceNamespace,
                                             String environment,
                                             Map<String, String> resourceFilters,
                                             Map<String, String> attributeFilters) {
        try {
            StringBuilder sql = new StringBuilder("SELECT COUNT(*) as count FROM ").append(LOG_TABLE_NAME);
            buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                    searchContent, excludedServiceNames, requireServiceName, workspaceId,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);

            List<Map<String, Object>> rows = greptimeSqlQueryExecutor.execute(sql.toString());
            if (rows != null && !rows.isEmpty()) {
                Object countObj = rows.get(0).get("count");
                if (countObj instanceof Number) {
                    return ((Number) countObj).longValue();
                }
            }
            return 0;
        } catch (Exception e) {
            log.error("[warehouse greptime-log] countLogsByMultipleConditions error: {}", e.getMessage(), e);
            return 0;
        }
    }

    @Override
    public Map<String, Long> countLogsBySeverityBuckets(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent,
                                                        Set<String> excludedServiceNames,
                                                        boolean requireServiceName) {
        return countLogsBySeverityBuckets(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, null);
    }

    @Override
    public Map<String, Long> countLogsBySeverityBuckets(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent,
                                                        Set<String> excludedServiceNames,
                                                        boolean requireServiceName,
                                                        String workspaceId) {
        return countLogsBySeverityBuckets(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, workspaceId, null, null, null);
    }

    @Override
    public Map<String, Long> countLogsBySeverityBuckets(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent,
                                                        Set<String> excludedServiceNames,
                                                        boolean requireServiceName,
                                                        String workspaceId,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment) {
        return countLogsBySeverityBuckets(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, excludedServiceNames, requireServiceName,
                workspaceId, serviceName, serviceNamespace, environment, Map.of(), Map.of());
    }

    @Override
    public Map<String, Long> countLogsBySeverityBuckets(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent,
                                                        Set<String> excludedServiceNames,
                                                        boolean requireServiceName,
                                                        String workspaceId,
                                                        String serviceName,
                                                        String serviceNamespace,
                                                        String environment,
                                                        Map<String, String> resourceFilters,
                                                        Map<String, String> attributeFilters) {
        try {
            StringBuilder sql = new StringBuilder("SELECT ")
                    .append("COUNT(*) as totalCount, ")
                    .append("SUM(CASE WHEN severity_number >= 21 AND severity_number <= 24 THEN 1 ELSE 0 END) as fatalCount, ")
                    .append("SUM(CASE WHEN severity_number >= 17 AND severity_number <= 20 THEN 1 ELSE 0 END) as errorCount, ")
                    .append("SUM(CASE WHEN severity_number >= 13 AND severity_number <= 16 THEN 1 ELSE 0 END) as warnCount, ")
                    .append("SUM(CASE WHEN severity_number >= 9 AND severity_number <= 12 THEN 1 ELSE 0 END) as infoCount, ")
                    .append("SUM(CASE WHEN severity_number >= 5 AND severity_number <= 8 THEN 1 ELSE 0 END) as debugCount, ")
                    .append("SUM(CASE WHEN severity_number >= 1 AND severity_number <= 4 THEN 1 ELSE 0 END) as traceCount ")
                    .append("FROM ").append(LOG_TABLE_NAME);
            buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                    searchContent, excludedServiceNames, requireServiceName, workspaceId,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
            List<Map<String, Object>> rows = greptimeSqlQueryExecutor.execute(sql.toString());
            if (rows == null || rows.isEmpty()) {
                return Map.of();
            }
            Map<String, Object> row = rows.get(0);
            Map<String, Long> result = new HashMap<>();
            putLong(result, "totalCount", columnValue(row, "totalCount"));
            putLong(result, "fatalCount", columnValue(row, "fatalCount"));
            putLong(result, "errorCount", columnValue(row, "errorCount"));
            putLong(result, "warnCount", columnValue(row, "warnCount"));
            putLong(result, "infoCount", columnValue(row, "infoCount"));
            putLong(result, "debugCount", columnValue(row, "debugCount"));
            putLong(result, "traceCount", columnValue(row, "traceCount"));
            return result;
        } catch (Exception e) {
            log.error("[warehouse greptime-log] countLogsBySeverityBuckets error: {}", e.getMessage(), e);
            return Map.of();
        }
    }

    @Override
    public Map<String, Long> countLogTraceCoverage(Long startTime, Long endTime, String traceId,
                                                   String spanId, Integer severityNumber,
                                                   String severityText, String searchContent,
                                                   Set<String> excludedServiceNames,
                                                   boolean requireServiceName) {
        return countLogTraceCoverage(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, null);
    }

    @Override
    public Map<String, Long> countLogTraceCoverage(Long startTime, Long endTime, String traceId,
                                                   String spanId, Integer severityNumber,
                                                   String severityText, String searchContent,
                                                   Set<String> excludedServiceNames,
                                                   boolean requireServiceName,
                                                   String workspaceId) {
        return countLogTraceCoverage(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, workspaceId, null, null, null);
    }

    @Override
    public Map<String, Long> countLogTraceCoverage(Long startTime, Long endTime, String traceId,
                                                   String spanId, Integer severityNumber,
                                                   String severityText, String searchContent,
                                                   Set<String> excludedServiceNames,
                                                   boolean requireServiceName,
                                                   String workspaceId,
                                                   String serviceName,
                                                   String serviceNamespace,
                                                   String environment) {
        return countLogTraceCoverage(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, excludedServiceNames, requireServiceName,
                workspaceId, serviceName, serviceNamespace, environment, Map.of(), Map.of());
    }

    @Override
    public Map<String, Long> countLogTraceCoverage(Long startTime, Long endTime, String traceId,
                                                   String spanId, Integer severityNumber,
                                                   String severityText, String searchContent,
                                                   Set<String> excludedServiceNames,
                                                   boolean requireServiceName,
                                                   String workspaceId,
                                                   String serviceName,
                                                   String serviceNamespace,
                                                   String environment,
                                                   Map<String, String> resourceFilters,
                                                   Map<String, String> attributeFilters) {
        try {
            StringBuilder sql = new StringBuilder("SELECT ")
                    .append("COUNT(*) as totalCount, ")
                    .append("SUM(CASE WHEN trace_id IS NOT NULL AND trace_id != '' THEN 1 ELSE 0 END) as withTrace, ")
                    .append("SUM(CASE WHEN span_id IS NOT NULL AND span_id != '' THEN 1 ELSE 0 END) as withSpan, ")
                    .append("SUM(CASE WHEN trace_id IS NOT NULL AND trace_id != '' ")
                    .append("AND span_id IS NOT NULL AND span_id != '' THEN 1 ELSE 0 END) as withBothTraceAndSpan ")
                    .append("FROM ").append(LOG_TABLE_NAME);
            buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                    searchContent, excludedServiceNames, requireServiceName, workspaceId,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
            List<Map<String, Object>> rows = greptimeSqlQueryExecutor.execute(sql.toString());
            if (rows == null || rows.isEmpty()) {
                return Map.of();
            }
            Map<String, Object> row = rows.get(0);
            long totalCount = normalizeLong(columnValue(row, "totalCount"));
            long withTrace = normalizeLong(columnValue(row, "withTrace"));
            Map<String, Long> result = new HashMap<>();
            result.put("withTrace", withTrace);
            result.put("withoutTrace", Math.max(totalCount - withTrace, 0));
            result.put("withSpan", normalizeLong(columnValue(row, "withSpan")));
            result.put("withBothTraceAndSpan", normalizeLong(columnValue(row, "withBothTraceAndSpan")));
            return result;
        } catch (Exception e) {
            log.error("[warehouse greptime-log] countLogTraceCoverage error: {}", e.getMessage(), e);
            return Map.of();
        }
    }

    @Override
    public Map<String, Long> countLogsByHour(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName) {
        return countLogsByHour(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, null);
    }

    @Override
    public Map<String, Long> countLogsByHour(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId) {
        return countLogsByHour(startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, workspaceId, null, null, null);
    }

    @Override
    public Map<String, Long> countLogsByHour(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId,
                                             String serviceName,
                                             String serviceNamespace,
                                             String environment) {
        return countLogsByHour(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, excludedServiceNames, requireServiceName,
                workspaceId, serviceName, serviceNamespace, environment, Map.of(), Map.of());
    }

    @Override
    public Map<String, Long> countLogsByHour(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId,
                                             String serviceName,
                                             String serviceNamespace,
                                             String environment,
                                             Map<String, String> resourceFilters,
                                             Map<String, String> attributeFilters) {
        try {
            StringBuilder sql = new StringBuilder("SELECT date_bin('1 hour', timestamp) as hour, ")
                    .append("COUNT(*) as count FROM ").append(LOG_TABLE_NAME);
            buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                    searchContent, excludedServiceNames, requireServiceName, workspaceId,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
            sql.append(" GROUP BY hour ORDER BY hour ASC");
            List<Map<String, Object>> rows = greptimeSqlQueryExecutor.execute(sql.toString());
            if (rows == null || rows.isEmpty()) {
                return Map.of();
            }
            Map<String, Long> result = new HashMap<>();
            for (Map<String, Object> row : rows) {
                String hour = formatHourBucket(row.get("hour"));
                if (StringUtils.hasText(hour)) {
                    result.put(hour, normalizeLong(row.get("count")));
                }
            }
            return result;
        } catch (Exception e) {
            log.error("[warehouse greptime-log] countLogsByHour error: {}", e.getMessage(), e);
            return Map.of();
        }
    }

    @Override
    public Map<String, Long> countLogsByGroup(Long startTime, Long endTime, String traceId,
                                              String spanId, Integer severityNumber,
                                              String severityText, String searchContent,
                                              Set<String> excludedServiceNames,
                                              boolean requireServiceName,
                                              String workspaceId,
                                              String serviceName,
                                              String serviceNamespace,
                                              String environment,
                                              Map<String, String> resourceFilters,
                                              Map<String, String> attributeFilters,
                                              String groupBy) {
        String groupExpression = logGroupByExpression(groupBy);
        if (!StringUtils.hasText(groupExpression)) {
            return Map.of();
        }
        try {
            String normalizedGroupExpression = "COALESCE(NULLIF(" + groupExpression + ", ''), 'unknown')";
            StringBuilder sql = new StringBuilder("SELECT ")
                    .append(normalizedGroupExpression)
                    .append(" as groupValue, COUNT(*) as count FROM ")
                    .append(LOG_TABLE_NAME);
            buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                    searchContent, excludedServiceNames, requireServiceName, workspaceId,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
            sql.append(" GROUP BY groupValue ORDER BY count DESC LIMIT 20");
            List<Map<String, Object>> rows = greptimeSqlQueryExecutor.execute(sql.toString());
            if (rows == null || rows.isEmpty()) {
                return Map.of();
            }
            Map<String, Long> result = new java.util.LinkedHashMap<>();
            for (Map<String, Object> row : rows) {
                String value = String.valueOf(columnValue(row, "groupValue"));
                if (!StringUtils.hasText(value) || "null".equalsIgnoreCase(value)) {
                    value = "unknown";
                }
                result.put(value, normalizeLong(columnValue(row, "count")));
            }
            return result;
        } catch (Exception e) {
            log.error("[warehouse greptime-log] countLogsByGroup error: {}", e.getMessage(), e);
            return Map.of();
        }
    }

    private static long msToNs(Long ms) {
        return ms * 1_000_000L;
    }

    private static void putLong(Map<String, Long> target, String key, Object value) {
        target.put(key, normalizeLong(value));
    }

    private static Object columnValue(Map<String, Object> row, String key) {
        if (row == null || key == null) {
            return null;
        }
        if (row.containsKey(key)) {
            return row.get(key);
        }
        String lowercaseKey = key.toLowerCase(Locale.ROOT);
        if (row.containsKey(lowercaseKey)) {
            return row.get(lowercaseKey);
        }
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase(key)) {
                return entry.getValue();
            }
        }
        return null;
    }

    private static long normalizeLong(Object value) {
        Long normalized = castToLong(value);
        return normalized == null ? 0L : normalized;
    }

    private static String formatHourBucket(Object value) {
        Long nanos = castTimestampToNanos(value);
        if (nanos == null) {
            String fallback = value == null ? null : String.valueOf(value);
            return StringUtils.hasText(fallback) ? fallback : null;
        }
        long epochSecond = Math.floorDiv(nanos, 1_000_000_000L);
        long nanoAdjustment = Math.floorMod(nanos, 1_000_000_000L);
        return LocalDateTime.ofInstant(
                Instant.ofEpochSecond(epochSecond, nanoAdjustment),
                ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:00"));
    }

    private static String safeString(String input) {
        if (input == null) {
            return "";
        }
        return input.replace("'", "''");
    }

    /**
     *  build WHERE conditions
     * @param sql SQL builder
     * @param startTime start time
     * @param endTime end time
     * @param traceId trace id
     * @param spanId span id
     * @param severityNumber severity number
     */
    private void buildWhereConditions(StringBuilder sql, Long startTime, Long endTime, String traceId,
                                     String spanId, Integer severityNumber, String severityText, String searchContent) {
        buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, Collections.emptySet(), false);
    }

    private void buildWhereConditions(StringBuilder sql, Long startTime, Long endTime, String traceId,
                                     String spanId, Integer severityNumber, String severityText, String searchContent,
                                     Set<String> excludedServiceNames, boolean requireServiceName) {
        buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, null);
    }

    private void buildWhereConditions(StringBuilder sql, Long startTime, Long endTime, String traceId,
                                     String spanId, Integer severityNumber, String severityText, String searchContent,
                                     Set<String> excludedServiceNames, boolean requireServiceName,
                                     String workspaceId) {
        buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, workspaceId, null, null, null);
    }

    private void buildWhereConditions(StringBuilder sql, Long startTime, Long endTime, String traceId,
                                     String spanId, Integer severityNumber, String severityText, String searchContent,
                                     Set<String> excludedServiceNames, boolean requireServiceName,
                                     String workspaceId, String serviceName,
                                     String serviceNamespace, String environment) {
        buildWhereConditions(sql, startTime, endTime, traceId, spanId, severityNumber, severityText,
                searchContent, excludedServiceNames, requireServiceName, workspaceId,
                serviceName, serviceNamespace, environment, Map.of(), Map.of());
    }

    private void buildWhereConditions(StringBuilder sql, Long startTime, Long endTime, String traceId,
                                     String spanId, Integer severityNumber, String severityText, String searchContent,
                                     Set<String> excludedServiceNames, boolean requireServiceName,
                                     String workspaceId, String serviceName,
                                     String serviceNamespace, String environment,
                                     Map<String, String> resourceFilters,
                                     Map<String, String> attributeFilters) {
        List<String> conditions = new ArrayList<>();

        if (startTime != null && endTime != null) {
            conditions.add("timestamp >= to_timestamp_millis(" + startTime + ")"
                    + " AND timestamp <= to_timestamp_millis(" + endTime + ")");
        }

        // TraceId condition
        if (StringUtils.hasText(traceId)) {
            conditions.add("trace_id = '" + safeString(traceId) + "'");
        }

        // SpanId condition
        if (StringUtils.hasText(spanId)) {
            conditions.add("span_id = '" + safeString(spanId) + "'");
        }

        // Severity condition
        if (severityNumber != null) {
            conditions.add("severity_number = " + severityNumber);
        }

        // SeverityText condition
        if (StringUtils.hasText(severityText)) {
            conditions.add("severity_text = '" + safeString(severityText) + "'");
        }

        if (StringUtils.hasText(searchContent)) {
            String escaped = safeString(searchContent);
            conditions.add("matches_term(body, '" + escaped + "')");
        }

        if (StringUtils.hasText(serviceName)) {
            conditions.add("service_name = '" + safeString(serviceName.trim()) + "'");
        }

        String serviceNamespaceCondition = resourceAttributeCondition("service.namespace", serviceNamespace);
        if (StringUtils.hasText(serviceNamespaceCondition)) {
            conditions.add(serviceNamespaceCondition);
        }

        String environmentCondition = resourceAttributeCondition("deployment.environment.name", environment);
        if (StringUtils.hasText(environmentCondition)) {
            conditions.add(environmentCondition);
        }

        appendJsonAttributeConditions(conditions, "resource_attributes", resourceFilters);
        appendJsonAttributeConditions(conditions, "log_attributes", attributeFilters);

        if (requireServiceName) {
            conditions.add("service_name IS NOT NULL");
            conditions.add("service_name != ''");
        }

        if (excludedServiceNames != null && !excludedServiceNames.isEmpty()) {
            String excludedNames = excludedServiceNames.stream()
                    .filter(StringUtils::hasText)
                    .map(name -> "'" + safeString(name.trim().toLowerCase()) + "'")
                    .sorted()
                    .collect(Collectors.joining(", "));
            if (StringUtils.hasText(excludedNames)) {
                conditions.add("LOWER(service_name) NOT IN (" + excludedNames + ")");
            }
        }

        String workspaceCondition = workspaceCondition(workspaceId);
        if (StringUtils.hasText(workspaceCondition)) {
            conditions.add(workspaceCondition);
        }

        // Add WHERE clause if there are conditions
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
    }

    private String resourceAttributeCondition(String key, String value) {
        return jsonAttributeCondition("resource_attributes", key, value);
    }

    private void appendJsonAttributeConditions(List<String> conditions, String columnName, Map<String, String> filters) {
        if (filters == null || filters.isEmpty()) {
            return;
        }
        filters.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> jsonAttributeCondition(columnName, entry.getKey(), entry.getValue()))
                .filter(StringUtils::hasText)
                .forEach(conditions::add);
    }

    private String jsonAttributeCondition(String columnName, String key, String value) {
        if (!StringUtils.hasText(key) || !StringUtils.hasText(value)) {
            return null;
        }
        String trimmedValue = value.trim();
        boolean negate = trimmedValue.startsWith("!");
        String expectedValue = negate ? trimmedValue.substring(1) : trimmedValue;
        if (!StringUtils.hasText(expectedValue)) {
            return null;
        }
        String attributeExpression = "json_get_string(" + columnName + ", '$[\"" + safeString(key.trim()) + "\"]')";
        String expectedCondition = attributeExpression + " = '" + safeString(expectedValue) + "'";
        if (negate) {
            return "(" + attributeExpression + " IS NULL OR "
                    + attributeExpression + " != '" + safeString(expectedValue) + "')";
        }
        return expectedCondition;
    }

    private String logGroupByExpression(String groupBy) {
        if (!StringUtils.hasText(groupBy)) {
            return null;
        }
        String normalized = groupBy.trim();
        if (!normalized.matches("[A-Za-z0-9_.:-]+")) {
            return null;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        if ("service.name".equals(lower) || "service_name".equals(lower)) {
            return "service_name";
        }
        if ("severity".equals(lower) || "severity_text".equals(lower)) {
            return "severity_text";
        }
        if (lower.startsWith("resource:")) {
            return jsonAttributeExpression("resource_attributes", normalized.substring("resource:".length()));
        }
        if (lower.startsWith("attribute:")) {
            return jsonAttributeExpression("log_attributes", normalized.substring("attribute:".length()));
        }
        return jsonAttributeExpression("resource_attributes", normalized);
    }

    private String jsonAttributeExpression(String columnName, String key) {
        if (!StringUtils.hasText(key) || !key.matches("[A-Za-z0-9_.:-]+")) {
            return null;
        }
        return "json_get_string(" + columnName + ", '$[\"" + safeString(key.trim()) + "\"]')";
    }

    private String workspaceCondition(String workspaceId) {
        if (!StringUtils.hasText(workspaceId)) {
            return null;
        }
        String normalizedWorkspaceId = safeString(workspaceId.trim());
        String hertzbeatWorkspace = "json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]')";
        String workspace = "json_get_string(resource_attributes, '$[\"workspace.id\"]')";
        List<String> predicates = new ArrayList<>();
        predicates.add(hertzbeatWorkspace + " = '" + normalizedWorkspaceId + "'");
        predicates.add(workspace + " = '" + normalizedWorkspaceId + "'");
        if ("default".equals(normalizedWorkspaceId)) {
            predicates.add("((" + hertzbeatWorkspace + " IS NULL OR " + hertzbeatWorkspace + " = '')"
                    + " AND (" + workspace + " IS NULL OR " + workspace + " = ''))");
        }
        return "(" + String.join(" OR ", predicates) + ")";
    }

    private List<LogEntry> mapRowsToLogEntries(List<Map<String, Object>> rows) {
        List<LogEntry> list = new LinkedList<>();
        if (rows == null || rows.isEmpty()) {
            return list;
        }
        for (Map<String, Object> row : rows) {
            try {
                LogEntry.InstrumentationScope scope = null;
                Object scopeObj = row.get("instrumentation_scope");
                if (scopeObj instanceof String scopeStr && StringUtils.hasText(scopeStr)) {
                    try {
                        scope = JsonUtil.fromJson(scopeStr, LogEntry.InstrumentationScope.class);
                    } catch (Exception ignore) {
                        scope = null;
                    }
                }

                Long timeUnixNano = firstNonNull(
                        castTimestampToNanos(row.get("timestamp")),
                        castToLong(row.get("time_unix_nano"))
                );
                Object bodyObj = parseJsonMaybe(row.get("body"));
                Map<String, Object> attributes = castToMap(parseJsonMaybe(firstNonNull(
                        row.get("log_attributes"), row.get("attributes"))));
                Map<String, Object> resource = castToMap(parseJsonMaybe(firstNonNull(
                        row.get("resource_attributes"), row.get("resource"))));
                attributes = enrichNativeLogAttributes(attributes, row);
                resource = enrichNativeLogResource(resource, row);

                LogEntry entry = LogEntry.builder()
                        .timeUnixNano(timeUnixNano)
                        .observedTimeUnixNano(firstNonNull(
                                castTimestampToNanos(row.get("observed_timestamp")),
                                firstNonNull(castToLong(row.get("observed_time_unix_nano")), timeUnixNano)))
                        .severityNumber(castToInteger(row.get("severity_number")))
                        .severityText(castToString(row.get("severity_text")))
                        .body(bodyObj)
                        .traceId(castToString(row.get("trace_id")))
                        .spanId(castToString(row.get("span_id")))
                        .traceFlags(castToInteger(row.get("trace_flags")))
                        .attributes(attributes)
                        .resource(resource)
                        .instrumentationScope(scope)
                        .droppedAttributesCount(castToInteger(row.get("dropped_attributes_count")))
                        .build();
                list.add(entry);
            } catch (Exception e) {
                log.warn("[warehouse greptime-log] map row to LogEntry error: {}", e.getMessage());
            }
        }
        return list;
    }

    private static Object parseJsonMaybe(Object value) {
        if (value == null) return null;
        if (value instanceof Map) return value;
        if (value instanceof String str) {
            String s = str.trim();
            if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
                try {
                    return JsonUtil.fromJson(s, Object.class);
                } catch (Exception e) {
                    return s;
                }
            }
            return s;
        }
        return value;
    }

    private static Map<String, Object> enrichNativeLogAttributes(Map<String, Object> attributes, Map<String, Object> row) {
        Map<String, Object> normalized = attributes == null ? new HashMap<>() : new HashMap<>(attributes);
        putIfPresent(normalized, "hertzbeat.event_id", row.get("hertzbeat_event_id"));
        putIfPresent(normalized, "log.record.uid", row.get("log_record_uid"));
        putIfPresent(normalized, "hertzbeat.ingest_id", row.get("hertzbeat_ingest_id"));
        return normalized.isEmpty() ? null : normalized;
    }

    private static Map<String, Object> enrichNativeLogResource(Map<String, Object> resource, Map<String, Object> row) {
        Map<String, Object> normalized = resource == null ? new HashMap<>() : new HashMap<>(resource);
        Object serviceName = row.get("service_name");
        putIfPresent(normalized, "service.name", serviceName);
        putIfPresent(normalized, "service_name", serviceName);
        putIfPresent(normalized, "hertzbeat.entity_id", row.get("hertzbeat_entity_id"));
        putIfPresent(normalized, "hertzbeat.workspace_id", row.get("hertzbeat_workspace_id"));
        return normalized.isEmpty() ? null : normalized;
    }

    private static void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (target == null || !StringUtils.hasText(key) || value == null) {
            return;
        }
        target.putIfAbsent(key, value);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castToMap(Object obj) {
        if (obj instanceof Map) {
            return (Map<String, Object>) obj;
        }
        return null;
    }

    private static Long castToLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(obj));
        } catch (Exception e) {
            return null;
        }
    }

    private static Long castTimestampToNanos(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof Number n) {
            return n.longValue();
        }
        if (obj instanceof Instant instant) {
            return instantToNanos(instant);
        }
        String text = String.valueOf(obj).trim();
        if (!StringUtils.hasText(text)) {
            return null;
        }
        if (NumberUtils.isCreatable(text)) {
            return castToLong(text);
        }
        Instant instant = parseTimestampInstant(text);
        return instant == null ? null : instantToNanos(instant);
    }

    private static Instant parseTimestampInstant(String text) {
        try {
            return Instant.parse(text);
        } catch (Exception ignore) {
            // Try Greptime SQL's common local timestamp rendering next.
        }
        try {
            String normalized = text.contains("T") ? text : text.replace(' ', 'T');
            return LocalDateTime.parse(normalized).toInstant(ZoneOffset.UTC);
        } catch (Exception ignore) {
            return null;
        }
    }

    private static Long instantToNanos(Instant instant) {
        if (instant == null) {
            return null;
        }
        return instant.getEpochSecond() * 1_000_000_000L + instant.getNano();
    }

    private static <T> T firstNonNull(T first, T second) {
        return first != null ? first : second;
    }

    private static Integer castToInteger(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(obj));
        } catch (Exception e) {
            return null;
        }
    }

    private static String castToString(Object obj) {
        return obj == null ? null : String.valueOf(obj);
    }

    @Override
    public boolean batchDeleteLogs(List<Long> timeUnixNanos) {
        if (!isServerAvailable() || timeUnixNanos == null || timeUnixNanos.isEmpty()) {
            return false;
        }

        try {
            StringBuilder sql = new StringBuilder("DELETE FROM ").append(LOG_TABLE_NAME).append(" WHERE timestamp IN (");
            sql.append(timeUnixNanos.stream()
                    .filter(Objects::nonNull)
                    .map(timeUnixNano -> "to_timestamp_nanos(" + timeUnixNano + ")")
                    .collect(Collectors.joining(", ")));
            sql.append(")");

            greptimeSqlQueryExecutor.execute(sql.toString());
            log.info("[warehouse greptime-log] Batch delete executed successfully for {} logs", timeUnixNanos.size());
            return true;

        } catch (Exception e) {
            log.error("[warehouse greptime-log] batchDeleteLogs error: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public void saveLogDataBatch(List<LogEntry> logEntries) {
        if (!isServerAvailable() || logEntries == null || logEntries.isEmpty()) {
            return;
        }

        int total = logEntries.size();
        for (int i = 0; i < total; i += LOG_BATCH_SIZE) {
            int end = Math.min(i + LOG_BATCH_SIZE, total);
            List<LogEntry> batch = logEntries.subList(i, end);
            doSaveLogBatch(batch);
        }
    }

    private void doSaveLogBatch(List<LogEntry> logEntries) {
        try {
            Table table = newLogTable();

            for (LogEntry logEntry : logEntries) {
                table.addRow(logValues(logEntry));
            }

            CompletableFuture<Result<WriteOk, Err>> writeFuture = greptimeDb.write(table);
            Result<WriteOk, Err> result = writeFuture.get(10, TimeUnit.SECONDS);

            if (result.isOk()) {
                log.debug("[warehouse greptime-log] Batch write {} logs successful", logEntries.size());
            } else {
                log.warn("[warehouse greptime-log] Batch write failed: {}", result.getErr());
            }
        } catch (Exception e) {
            log.error("[warehouse greptime-log] Error saving log entries batch", e);
        }
    }

    private static Table newLogTable() {
        TableSchema.Builder tableSchemaBuilder = TableSchema.newBuilder(LOG_TABLE_NAME);
        tableSchemaBuilder.addTimestamp("timestamp", DataType.TimestampNanosecond)
                .addField("trace_id", DataType.String)
                .addField("span_id", DataType.String)
                .addField("severity_number", DataType.Int32)
                .addField("severity_text", DataType.String)
                .addField("body", DataType.String)
                .addField("log_attributes", DataType.Json)
                .addField("resource_attributes", DataType.Json)
                .addField("hertzbeat_event_id", DataType.String)
                .addField("log_record_uid", DataType.String)
                .addField("hertzbeat_ingest_id", DataType.String)
                .addField("hertzbeat_entity_id", DataType.String)
                .addField("hertzbeat_workspace_id", DataType.String)
                .addField("service_name", DataType.String);
        return Table.from(tableSchemaBuilder.build());
    }

    private static Object[] logValues(LogEntry logEntry) {
        Map<String, Object> attributes = logEntry.getAttributes();
        Map<String, Object> resource = logEntry.getResource();
        return new Object[] {
                logEntry.getTimeUnixNano() != null ? logEntry.getTimeUnixNano() : System.nanoTime(),
                logEntry.getTraceId(),
                logEntry.getSpanId(),
                logEntry.getSeverityNumber(),
                logEntry.getSeverityText(),
                logBodyAsString(logEntry.getBody()),
                JsonUtil.toJson(attributes),
                JsonUtil.toJson(resource),
                stringValue(attributes, "hertzbeat.event_id"),
                stringValue(attributes, "log.record.uid"),
                stringValue(attributes, "hertzbeat.ingest_id"),
                stringValue(resource, "hertzbeat.entity_id"),
                stringValue(resource, "hertzbeat.workspace_id"),
                stringValue(resource, "service.name")
        };
    }

    private static String logBodyAsString(Object body) {
        if (body == null) {
            return null;
        }
        if (body instanceof CharSequence) {
            return body.toString();
        }
        return JsonUtil.toJson(body);
    }

    private static String stringValue(Map<String, Object> values, String key) {
        if (values == null || !StringUtils.hasText(key)) {
            return null;
        }
        Object value = values.get(key);
        return value == null ? null : String.valueOf(value);
    }

}
