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

package org.apache.hertzbeat.warehouse.store.history.jpa;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAmount;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.math.NumberUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.warehouse.History;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import org.apache.hertzbeat.warehouse.dao.HistoryDao;
import org.apache.hertzbeat.warehouse.store.history.AbstractHistoryDataStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

/**
 * data storage by mysql/h2 - jpa
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.jpa", name = "enabled", havingValue = "true")
@Slf4j
public class JpaDatabaseDataStorage extends AbstractHistoryDataStorage {
    private final HistoryDao historyDao;
    private final JpaProperties jpaProperties;

    private static final int STRING_MAX_LENGTH = 1024;

    public JpaDatabaseDataStorage(JpaProperties jpaProperties,
                                  HistoryDao historyDao) {
        this.jpaProperties = jpaProperties;
        this.serverAvailable = true;
        this.historyDao = historyDao;
        expiredDataCleaner();
    }

    public void expiredDataCleaner() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("Jpa metrics store has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("jpa-metrics-cleaner-%d")
                .build();
        ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor(threadFactory);
        scheduledExecutor.scheduleAtFixedRate(() -> {
            log.warn("[jpa-metrics-store]-start running expired data cleaner."
                    + "Please use time series db instead of jpa for better performance");
            String expireTimeStr = jpaProperties.expireTime();
            long expireTime;
            try {
                if (NumberUtils.isParsable(expireTimeStr)) {
                    expireTime = NumberUtils.toLong(expireTimeStr);
                    expireTime = (ZonedDateTime.now().toEpochSecond() + expireTime) * 1000L;
                } else {
                    TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(expireTimeStr);
                    ZonedDateTime dateTime = ZonedDateTime.now().minus(temporalAmount);
                    expireTime = dateTime.toEpochSecond() * 1000L;
                }
            } catch (Exception e) {
                log.error("expiredDataCleaner time error: {}. use default expire time to clean: 1h", e.getMessage());
                ZonedDateTime dateTime = ZonedDateTime.now().minus(Duration.ofHours(1));
                expireTime = dateTime.toEpochSecond() * 1000L;
            }
            try {
                int rows = historyDao.deleteHistoriesByTimeBefore(expireTime);
                log.info("[jpa-metrics-store]-delete {} rows.", rows);
                long total = historyDao.count();
                if (total > jpaProperties.maxHistoryRecordNum()) {
                    rows = historyDao.deleteOlderHistoriesRecord(jpaProperties.maxHistoryRecordNum() / 2);
                    log.warn("[jpa-metrics-store]-force delete {} rows due too many. Please use time series db instead of jpa for better performance.", rows);
                }
            } catch (Exception e) {
                log.error("expiredDataCleaner database error: {}.", e.getMessage());
                log.error("try to truncate table hzb_history. Please use time series db instead of jpa for better performance.");
                historyDao.truncateTable();
            }
        }, 5, 30, TimeUnit.SECONDS);
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse jpa] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }
        String monitorType = metricsData.getApp();
        String metrics = metricsData.getMetrics();
        List<CollectRep.Field> fieldsList = metricsData.getFieldsList();
        try {
            List<History> allHistoryList = new LinkedList<>();
            for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                List<History> singleHistoryList = new LinkedList<>();
                Map<String, String> labels = new HashMap<>(8);
                for (int i = 0; i < fieldsList.size(); i++) {
                    History.HistoryBuilder historyBuilder = History.builder()
                            .monitorId(metricsData.getId())
                            .app(monitorType)
                            .metrics(metrics)
                            .time(metricsData.getTime());
                    final CollectRep.Field field = fieldsList.get(i);
                    final int fieldType = field.getType();
                    final String fieldName = field.getName();
                    final String columnValue = valueRow.getColumns(i);

                    historyBuilder.metric(fieldName);

                    if (CommonConstants.NULL_VALUE.equals(columnValue)) {
                        switch (fieldType) {
                            case CommonConstants.TYPE_NUMBER -> historyBuilder.metricType(CommonConstants.TYPE_NUMBER)
                                    .dou(null);
                            case CommonConstants.TYPE_STRING -> historyBuilder.metricType(CommonConstants.TYPE_STRING)
                                    .str(null);
                            case CommonConstants.TYPE_TIME -> historyBuilder.metricType(CommonConstants.TYPE_TIME)
                                    .int32(null);
                            default -> historyBuilder.metricType(CommonConstants.TYPE_NUMBER);
                        }
                    } else {
                        switch (fieldType) {
                            case CommonConstants.TYPE_NUMBER -> historyBuilder.metricType(CommonConstants.TYPE_NUMBER)
                                    .dou(Double.parseDouble(columnValue));
                            case CommonConstants.TYPE_STRING -> historyBuilder.metricType(CommonConstants.TYPE_STRING)
                                    .str(formatStrValue(columnValue));
                            case CommonConstants.TYPE_TIME -> historyBuilder.metricType(CommonConstants.TYPE_TIME)
                                    .int32(Integer.parseInt(columnValue));
                            default -> historyBuilder.metricType(CommonConstants.TYPE_NUMBER)
                                    .dou(Double.parseDouble(columnValue));
                        }

                        if (field.getLabel()) {
                            labels.put(fieldName, columnValue);
                        }
                    }

                    singleHistoryList.add(historyBuilder.build());
                }
                singleHistoryList.forEach(history -> history.setInstance(JsonUtil.toJson(labels)));
                allHistoryList.addAll(singleHistoryList);
            }
            historyDao.saveAll(allHistoryList);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        Specification<History> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            Predicate predicateMonitorId = criteriaBuilder.equal(root.get("monitorId"), monitorId);
            Predicate predicateMonitorType = criteriaBuilder.equal(root.get("app"), app);
            Predicate predicateMonitorMetrics = criteriaBuilder.equal(root.get("metrics"), metrics);
            Predicate predicateMonitorMetric = criteriaBuilder.equal(root.get("metric"), metric);
            andList.add(predicateMonitorId);
            andList.add(predicateMonitorType);
            andList.add(predicateMonitorMetrics);
            andList.add(predicateMonitorMetric);

            if (StringUtils.isNotBlank(label)) {
                Predicate predicateMonitorInstance = criteriaBuilder.equal(root.get("instance"), label);
                andList.add(predicateMonitorInstance);
            }

            if (history != null) {
                try {
                    TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(history);
                    ZonedDateTime dateTime = ZonedDateTime.now().minus(temporalAmount);
                    long timeBefore = dateTime.toEpochSecond() * 1000L;
                    Predicate timePredicate = criteriaBuilder.ge(root.get("time"), timeBefore);
                    andList.add(timePredicate);
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
            Predicate[] predicates = new Predicate[andList.size()];
            Predicate predicate = criteriaBuilder.and(andList.toArray(predicates));
            return query.where(predicate).getRestriction();
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.DESC, "time"));
        List<History> historyList = historyDao.findAll(specification, sortExp);
        for (History dataItem : historyList) {
            String value = "";
            if (dataItem.getMetricType() == CommonConstants.TYPE_NUMBER) {
                if (dataItem.getDou() != null) {
                    value = BigDecimal.valueOf(dataItem.getDou()).setScale(4, RoundingMode.HALF_UP)
                            .stripTrailingZeros().toPlainString();
                }
            } else {
                value = dataItem.getStr();
            }
            String instanceValue = dataItem.getInstance() == null ? "" : dataItem.getInstance();
            List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
            valueList.add(new Value(value, dataItem.getTime()));
        }
        return instanceValuesMap;
    }

    private String formatStrValue(String value) {
        if (value == null) {
            return "";
        }
        value = value.replace("'", "\\'");
        value = value.replace("\"", "\\\"");
        value = value.replace("*", "-");
        value = String.format("`%s`", value);
        if (value.length() > STRING_MAX_LENGTH) {
            value = value.substring(0, STRING_MAX_LENGTH - 1);
        }
        return value;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        return new HashMap<>(8);
    }

    @Override
    public void destroy() throws Exception {
    }
}
