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

package org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud;

import com.google.common.collect.Maps;
import io.searchbox.action.BulkableAction;
import io.searchbox.client.JestClient;
import io.searchbox.client.JestClientFactory;
import io.searchbox.client.config.HttpClientConfig;
import io.searchbox.core.Bulk;
import io.searchbox.core.BulkResult;
import io.searchbox.core.Delete;
import io.searchbox.core.DocumentResult;
import io.searchbox.core.Index;
import io.searchbox.core.Update;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.math.NumberUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import org.apache.hertzbeat.warehouse.store.history.tsdb.AbstractHistoryDataStorage;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.support.BasicAuthenticationInterceptor;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.ObjectUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.ES_INIT_ERROR_MSG;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.INDEX_TYPE;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.LABEL_KEY_HOST;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.LABEL_KEY_INSTANCE;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.LABEL_KEY_JOB;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.LABEL_KEY_NAME;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.QUERY_RANGE_PATH;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.SPLIT;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsConstants.TIME_STREAM;

/**
 * AlibabaCloud elasticsearch data storage.
 * Elasticsearch requires the commercial version, and it supports kernel versions 1.7.0 and above or 1.8.0 and above.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.alibabacloud-es", name = "enabled", havingValue = "true")
public class AlibabaCloudEsDataStorage extends AbstractHistoryDataStorage {

    private final AlibabaCloudEsProperties properties;

    private final RestTemplate restTemplate;

    private final JestClient jestClient;

    public AlibabaCloudEsDataStorage(AlibabaCloudEsProperties properties, RestTemplate restTemplate) {
        if (properties == null) {
            log.error("init error, please config Warehouse alibabaCloud es props in application.yml");
            throw new IllegalArgumentException("please config Warehouse alibabaCloud es props");
        }
        this.properties = properties;
        this.restTemplate = initBasicAuthRestTemplate(restTemplate);
        this.jestClient = initJestClient();
        this.serverAvailable = initAlibabaCloudEsDataStorage();
    }


    /**
     * Used to integrate the Prometheus API.
     *
     * @param restTemplate Global restTemplate
     * @return RestTemplate
     */
    private RestTemplate initBasicAuthRestTemplate(RestTemplate restTemplate) {
        RestTemplate dedicated = new RestTemplate(restTemplate.getRequestFactory());
        if (!CollectionUtils.isEmpty(restTemplate.getInterceptors())) {
            dedicated.setInterceptors(new ArrayList<>(restTemplate.getInterceptors()));
        }
        if (StringUtils.hasText(properties.username())
                && StringUtils.hasText(properties.password())) {
            dedicated.getInterceptors().add(
                    new BasicAuthenticationInterceptor(properties.username(), properties.password())
            );
        }
        return dedicated;
    }

    /**
     * Used for batch writing
     *
     * @return JestClient
     */
    private JestClient initJestClient() {
        JestClientFactory factory = new JestClientFactory();
        HttpClientConfig.Builder httpClientConfigBuiler = new HttpClientConfig.Builder(properties.url());
        // add basic auth
        if (StringUtils.hasText(properties.username()) && StringUtils.hasText(properties.password())) {
            CredentialsProvider provider = new BasicCredentialsProvider();
            UsernamePasswordCredentials credentials = new UsernamePasswordCredentials(properties.username(), properties.password());
            provider.setCredentials(AuthScope.ANY, credentials);
            httpClientConfigBuiler.credentialsProvider(provider);
        }
        JestPoolConfig poolConfig = properties.pool();
        factory.setHttpClientConfig(
                httpClientConfigBuiler
                        .maxConnectionIdleTime(poolConfig.maxConnectionIdleTime(), TimeUnit.MILLISECONDS)
                        .multiThreaded(true)
                        .connTimeout(poolConfig.connTimeout())
                        .readTimeout(poolConfig.readTimeout())
                        .maxTotalConnection(poolConfig.currentCount())
                        .defaultMaxTotalConnectionPerRoute(poolConfig.currentCount())
                        .build());
        return factory.getObject();
    }

    /**
     * Used to check whether the index has been created properly.
     * Because index configuration is highly likely to be customized.
     *
     * @return Is it normal
     */
    private boolean initAlibabaCloudEsDataStorage() {
        try {
            HttpHeaders headers = new HttpHeaders();
            HttpEntity<Void> httpEntity = new HttpEntity<>(headers);
            ResponseEntity<String> responseEntity = restTemplate.exchange(
                    properties.url() + "/" + TIME_STREAM + "/" + properties.database(), HttpMethod.GET, httpEntity, String.class);
            if (responseEntity.getStatusCode().is2xxSuccessful()) {
                log.info("Check alibaba cloud es metrics server status success.");
                return true;
            }
            log.error("Check alibaba cloud es metrics server status failed: {}.", responseEntity.getBody());
        } catch (Exception e) {
            log.error("Check alibaba cloud es metrics server status error: {}.", e.getMessage());
        }
        return false;
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        if (!serverAvailable) {
            log.error(ES_INIT_ERROR_MSG);
            return Collections.emptyMap();
        }
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        try {

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

            String metricsName = metrics + SPLIT + metric;
            if (CommonConstants.PROMETHEUS.equals(app)) {
                metricsName = metrics;
            }

            String timeSeriesSelector = LABEL_KEY_INSTANCE + "=\"" + monitorId + "\"";
            HttpHeaders headers = new HttpHeaders();
            HttpEntity<Void> httpEntity = new HttpEntity<>(headers);

            URI uri = UriComponentsBuilder.fromUriString(properties.url() + "/" + String.format(QUERY_RANGE_PATH, properties.database()))
                    .queryParam(URLEncoder.encode("query", StandardCharsets.UTF_8), URLEncoder.encode(metricsName + "{" + timeSeriesSelector + "}", StandardCharsets.UTF_8))
                    .queryParam("start", start)
                    .queryParam("end", end)
                    .queryParam("step", step)
                    .build(true).toUri();

            ResponseEntity<PromQlQueryContent> responseEntity = restTemplate.exchange(uri, HttpMethod.GET, httpEntity, PromQlQueryContent.class);
            if (responseEntity.getStatusCode().is2xxSuccessful()) {
                log.debug("query metrics data from alibaba cloud es success. {}", uri);
                if (responseEntity.getBody().getData() != null && responseEntity.getBody().getData().getResult() != null) {
                    List<PromQlQueryContent.ContentData.Content> contents = responseEntity.getBody().getData().getResult();
                    for (PromQlQueryContent.ContentData.Content content : contents) {
                        Map<String, String> labels = content.getMetric();
                        labels.remove(LABEL_KEY_NAME);
                        labels.remove(LABEL_KEY_JOB);
                        labels.remove(LABEL_KEY_INSTANCE);
                        String labelStr = JsonUtil.toJson(labels);
                        if (content.getValues() != null && !content.getValues().isEmpty()) {
                            List<Value> valueList = instanceValuesMap.computeIfAbsent(labelStr, k -> new LinkedList<>());
                            for (Object[] valueArr : content.getValues()) {
                                long timestamp = ((Number) valueArr[0]).longValue();
                                String value = new BigDecimal(String.valueOf(valueArr[1])).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                                valueList.add(new Value(value, timestamp * 1000));
                            }
                        }
                    }
                }
            } else {
                log.error("query metrics data from alibaba cloud es failed. {}", responseEntity);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        return getHistoryMetricData(monitorId, app, metrics, metric, label, history);
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!validateAndInitializeServer(metricsData)) {
            return;
        }
        
        Map<String, String> defaultLabels = createDefaultLabels(metricsData);
        List<TimeStreamIndexedEntity> entities = processMetricsData(metricsData, defaultLabels);
        
        if (entities.isEmpty()) {
            return;
        }
        
        bulkWriteToElasticsearch(entities);
    }
    
    private boolean validateAndInitializeServer(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable()) {
            serverAvailable = initAlibabaCloudEsDataStorage();
        }
        if (!isServerAvailable() || null == metricsData || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return false;
        }
        if (metricsData.rowCount() == 0) {
            log.info("[warehouse alibabaCloud es metrics data {} is null, ignore.", metricsData.getId());
            return false;
        }
        return true;
    }
    
    private Map<String, String> createDefaultLabels(CollectRep.MetricsData metricsData) {
        Map<String, String> defaultLabels = Maps.newHashMapWithExpectedSize(4);
        boolean isPrometheusAuto = metricsData.getApp().startsWith(CommonConstants.PROMETHEUS_APP_PREFIX);
        if (isPrometheusAuto) {
            defaultLabels.put(LABEL_KEY_JOB, metricsData.getApp().substring(CommonConstants.PROMETHEUS_APP_PREFIX.length()));
        } else {
            defaultLabels.put(LABEL_KEY_JOB, metricsData.getApp());
        }
        defaultLabels.put(LABEL_KEY_INSTANCE, String.valueOf(metricsData.getId()));
        return defaultLabels;
    }
    
    private List<TimeStreamIndexedEntity> processMetricsData(CollectRep.MetricsData metricsData, Map<String, String> defaultLabels) {
        List<TimeStreamIndexedEntity> entities = new ArrayList<>();
        boolean isPrometheusAuto = metricsData.getApp().startsWith(CommonConstants.PROMETHEUS_APP_PREFIX);
        
        try {
            Map<String, Double> fieldsValue = Maps.newHashMapWithExpectedSize(8);
            Map<String, String> labels = Maps.newHashMapWithExpectedSize(8);

            RowWrapper rowWrapper = metricsData.readRow();

            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();
                labels.clear();
                fieldsValue.clear();

                extractFieldsAndLabels(rowWrapper, fieldsValue, labels);
                List<TimeStreamIndexedEntity> indexedEntities = createTimeStreamEntities(fieldsValue, labels, defaultLabels, metricsData, isPrometheusAuto);
                entities.addAll(indexedEntities);
            }
        } catch (Exception e) {
            log.error("[warehouse alibaba es] Error processing metrics data: {}", e.getMessage(), e);
        }
        return entities;
    }
    
    private void extractFieldsAndLabels(RowWrapper rowWrapper, Map<String, Double> fieldsValue, Map<String, String> labels) {
        rowWrapper.cellStream().forEach(cell -> {
            String value = cell.getValue();
            boolean isLabel = cell.getMetadataAsBoolean(MetricDataConstants.LABEL);
            byte type = cell.getMetadataAsByte(MetricDataConstants.TYPE);

            if (type == CommonConstants.TYPE_NUMBER && !isLabel) {
                // number metrics data
                if (!CommonConstants.NULL_VALUE.equals(value)) {
                    fieldsValue.put(cell.getField().getName(), CommonUtil.parseStrDouble(value));
                }
            }
            // label
            if (isLabel && !CommonConstants.NULL_VALUE.equals(value)) {
                labels.put(cell.getField().getName(), value);
            }
        });
    }
    
    private List<TimeStreamIndexedEntity> createTimeStreamEntities(Map<String, Double> fieldsValue, 
                                                                   Map<String, String> labels,
                                                                   Map<String, String> defaultLabels,
                                                                   CollectRep.MetricsData metricsData,
                                                                   boolean isPrometheusAuto) {
        List<TimeStreamIndexedEntity> entities = new ArrayList<>(fieldsValue.size());
        
        // Pre-calculate common values to avoid repeated computation
        final String instanceHost = metricsData.getInstanceHost();
        final String metricsPrefix = metricsData.getMetrics();
        final long timestamp = metricsData.getTime();
        final Map<String, String> customizedLabels = metricsData.getLabels();
        final boolean hasCustomizedLabels = !ObjectUtils.isEmpty(customizedLabels);
        
        for (Map.Entry<String, Double> entry : fieldsValue.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                try {
                    Map<String, String> entityLabels = Maps.newHashMapWithExpectedSize(8);
                    entityLabels.putAll(labels);
                    entityLabels.putAll(defaultLabels);
                    entityLabels.put(LABEL_KEY_HOST, instanceHost);
                    
                    if (hasCustomizedLabels) {
                        entityLabels.putAll(customizedLabels);
                    }
                    
                    String metricsName = isPrometheusAuto ? metricsPrefix : metricsPrefix + SPLIT + entry.getKey();
                    
                    TimeStreamIndexedEntity indexedEntity = TimeStreamIndexedEntity.builder()
                            .labels(entityLabels)
                            .metrics(Map.of(metricsName, entry.getValue()))
                            .timestamp(timestamp)
                            .operator(TimeStreamIndexedEntity.Operator.INSERT)
                            .build();
                    entities.add(indexedEntity);
                } catch (Exception e) {
                    log.error("combine metrics data error: {}.", e.getMessage(), e);
                }
            }
        }
        
        return entities;
    }
    
    private void bulkWriteToElasticsearch(List<TimeStreamIndexedEntity> entities) {
        try {
            List<BulkableAction<DocumentResult>> actions = new ArrayList<>(entities.size());
            for (TimeStreamIndexedEntity entity : entities) {
                if (entity != null) {
                    BulkableAction<DocumentResult> action = buildAction(entity);
                    actions.add(action);
                }
            }

            if (actions.isEmpty()) {
                return;
            }

            Bulk bulk = new Bulk.Builder()
                    .defaultIndex(properties.database())
                    .defaultType(INDEX_TYPE)
                    .addAction(actions)
                    .build();
            BulkResult bulkResult = jestClient.execute(bulk);

            if (!bulkResult.isSucceeded()) {
                log.error("[warehouse alibaba es] write failed, res: {}", bulkResult.getJsonString());
            }
        } catch (IOException e) {
            log.error("[warehouse alibaba es] IO error writing to Elasticsearch: {}", e.getMessage(), e);
        } catch (Exception e) {
            log.error("[warehouse alibaba es] Error writing to Elasticsearch: {}", e.getMessage(), e);
        }
    }

    private BulkableAction<DocumentResult> buildAction(TimeStreamIndexedEntity indexedEntity) {
        Map<String, Object> actionParams = indexedEntity.getActionParams();
        TimeStreamIndexedEntity.Operator operator = indexedEntity.getOperator();
        indexedEntity.clear();
        if (TimeStreamIndexedEntity.Operator.DELETE.equals(operator)) {
            Delete.Builder builder = new Delete.Builder(indexedEntity.getId());
            if (MapUtils.isNotEmpty(actionParams)) {
                actionParams.forEach(builder::setParameter);
            }
            return builder.build();
        } else if (TimeStreamIndexedEntity.Operator.UPDATE.equals(operator)) {
            Update.Builder builder = new Update.Builder(JsonUtil.toJson(indexedEntity)).id(indexedEntity.getId());
            if (MapUtils.isNotEmpty(actionParams)) {
                actionParams.forEach(builder::setParameter);
            }
            return builder.build();
        } else {
            Index.Builder builder = new Index.Builder(JsonUtil.toJson(indexedEntity));
            if (MapUtils.isNotEmpty(actionParams)) {
                actionParams.forEach(builder::setParameter);
            }
            return builder.build();
        }
    }

    @Override
    public void destroy() throws Exception {
        if (null != jestClient) {
            jestClient.close();
        }
    }

}