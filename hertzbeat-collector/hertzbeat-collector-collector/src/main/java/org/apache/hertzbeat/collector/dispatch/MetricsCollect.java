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

package org.apache.hertzbeat.collector.dispatch;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.prometheus.PrometheusAutoCollectImpl;
import org.apache.hertzbeat.collector.collect.strategy.CollectStrategyFactory;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JexlExpressionRunner;
import org.apache.hertzbeat.common.util.Pair;
import org.springframework.util.CollectionUtils;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * metrics collection
 */
@Slf4j
@Data
public class MetricsCollect implements Runnable, Comparable<MetricsCollect> {
    /**
     * Scheduling alarm threshold time 100ms
     */
    private static final long WARN_DISPATCH_TIME = 100;
    /**
     * collector identity
     */
    protected String collectorIdentity;
    /**
     * tenant id
     */
    protected long tenantId;
    /**
     * task id
     */
    protected long id;
    /**
     * app type name
     */
    protected String app;
    /**
     * metrics configuration
     */
    protected Metrics metrics;
    /**
     * metadata
     */
    protected Map<String, String> metadata;
    /**
     * labels
     */
    protected Map<String, String> labels;
    /**
     * annotations
     */
    protected Map<String, String> annotations;
    /**
     * time wheel timeout
     */
    protected Timeout timeout;
    /**
     * Task and Data Scheduling
     */
    protected CollectDataDispatch collectDataDispatch;
    /**
     * task execution priority
     */
    protected byte runPriority;
    /**
     * Periodic collection or one-time collection true-periodic false-one-time
     */
    protected boolean isCyclic;
    /**
     * Time for creating collection task
     */
    protected long newTime;
    /**
     * Start time of the collection task
     */
    protected long startTime;
    /**
     * Whether it is a service discovery job, true is yes, false is no
     */
    protected boolean isSd;
    /**
     * Whether to use the Prometheus proxy
     */
    protected boolean prometheusProxyMode;

    protected List<UnitConvert> unitConvertList;

    public MetricsCollect(Metrics metrics, Timeout timeout,
                          CollectDataDispatch collectDataDispatch,
                          String collectorIdentity,
                          List<UnitConvert> unitConvertList) {
        this.newTime = System.currentTimeMillis();
        this.timeout = timeout;
        this.metrics = metrics;
        this.collectorIdentity = collectorIdentity;
        WheelTimerTask timerJob = (WheelTimerTask) timeout.task();
        Job job = timerJob.getJob();
        this.id = job.getMonitorId();
        this.tenantId = job.getTenantId();
        this.app = job.getApp();
        this.metadata = job.getMetadata();
        this.labels = job.getLabels();
        this.annotations = job.getAnnotations();
        this.collectDataDispatch = collectDataDispatch;
        this.isCyclic = job.isCyclic();
        this.isSd = job.isSd();
        this.prometheusProxyMode = job.isPrometheusProxyMode();
        this.unitConvertList = unitConvertList;
        // Temporary one-time tasks are executed with high priority
        if (isCyclic) {
            runPriority = (byte) -1;
        } else {
            runPriority = (byte) 1;
        }
    }

    @Override
    public void run() {
        this.startTime = System.currentTimeMillis();
        setNewThreadName(id, app, startTime, metrics);
        CollectRep.MetricsData.Builder response = CollectRep.MetricsData.newBuilder();
        response.setApp(app).setId(id).setTenantId(tenantId)
                .setLabels(labels).setAnnotations(annotations).addMetadataAll(metadata);
        // for prometheus auto or proxy mode
        if (DispatchConstants.PROTOCOL_PROMETHEUS.equalsIgnoreCase(metrics.getProtocol())) {
            List<CollectRep.MetricsData> metricsData;

            // TODO: Refactor Prometheus metrics collection logic.
            // The current implementation for proxy mode and auto mode needs review and potential simplification.
            // Consider a more unified approach or clarify the conditions for each mode.
            /*
            // TODO USE PROXY MODE
            if (prometheusProxyMode) {
                List<CollectRep.MetricsData> proxyData = PrometheusProxyCollectImpl.getInstance().collect(response, metrics);
                List<CollectRep.MetricsData> autoData = PrometheusAutoCollectImpl.getInstance().collect(response, metrics);
                metricsData = new LinkedList<>();
                if (proxyData != null) {
                    metricsData.addAll(proxyData);
                }
                if (autoData != null) {
                    metricsData.addAll(autoData);
                }
            } else {
                metricsData = PrometheusAutoCollectImpl.getInstance().collect(response, metrics);
            }
            */
            metricsData = PrometheusAutoCollectImpl.getInstance().collect(response, metrics);
            validateResponse(metricsData == null ? null : metricsData.stream().findFirst().orElse(null));
            collectDataDispatch.dispatchCollectData(timeout, metrics, metricsData);
            return;
        }
        response.setMetrics(metrics.getName());
        // According to the metrics collection protocol, application type, etc.,
        // dispatch to the real application metrics collection implementation class
        AbstractCollect abstractCollect = CollectStrategyFactory.invoke(metrics.getProtocol());
        if (abstractCollect == null) {
            log.error("[Dispatcher] - not support this: app: {}, metrics: {}, protocol: {}.",
                    app, metrics.getName(), metrics.getProtocol());
            response.setCode(CollectRep.Code.FAIL);
            response.setMsg("not support " + app + ", "
                    + metrics.getName() + ", " + metrics.getProtocol());
        } else {
            try {
                abstractCollect.preCheck(metrics);
                abstractCollect.collect(response, metrics);
            } catch (Exception e) {
                String msg = e.getMessage();
                if (msg == null && e.getCause() != null) {
                    msg = e.getCause().getMessage();
                }
                if (e instanceof IllegalArgumentException) {
                    log.error("[Metrics PreCheck]: {}.", msg, e);
                } else {
                    log.error("[Metrics Collect]: {}.", msg, e);
                }
                response.setCode(CollectRep.Code.FAIL);
                if (msg != null) {
                    response.setMsg(msg);
                }
            }
        }
        // Alias attribute expression replacement calculation
        if (fastFailed()) {
            return;
        }
        calculateFields(metrics, response);
        CollectRep.MetricsData metricsData = validateResponse(response);
        collectDataDispatch.dispatchCollectData(timeout, metrics, metricsData);
    }

    /**
     * Calculate the real metrics value according to the calculates and aliasFields configuration
     *
     * @param metrics     Metrics configuration
     * @param collectData Data collection
     */
    public void calculateFields(Metrics metrics, CollectRep.MetricsData.Builder collectData) {
        collectData.setPriority(metrics.getPriority());
        List<CollectRep.Field> fieldList = new LinkedList<>();
        for (Metrics.Field field : metrics.getFields()) {
            CollectRep.Field.Builder fieldBuilder = CollectRep.Field.newBuilder();
            fieldBuilder.setName(field.getField()).setType(field.getType()).setLabel(field.isLabel());
            if (field.getUnit() != null) {
                fieldBuilder.setUnit(field.getUnit());
            }
            fieldList.add(fieldBuilder.build());
        }
        collectData.addAllFields(fieldList);
        List<CollectRep.ValueRow> aliasRowList = collectData.getValuesList();
        if (aliasRowList == null || aliasRowList.isEmpty()) {
            return;
        }
        collectData.clearValues();
        // Preprocess calculates first
        if (metrics.getCalculates() == null) {
            metrics.setCalculates(Collections.emptyList());
        }
        // eg: database_pages=Database pages unconventional mapping
        Map<String, String> fieldAliasMap = new HashMap<>(8);
        Map<String, JexlExpression> fieldExpressionMap = metrics.getCalculates()
                .stream()
                .map(cal -> transformCal(cal, fieldAliasMap))
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(arr -> (String) arr[0], arr -> (JexlExpression) arr[1], (oldValue, newValue) -> newValue));

        if (metrics.getUnits() == null) {
            metrics.setUnits(Collections.emptyList());
        }
        Map<String, Pair<String, String>> fieldUnitMap = metrics.getUnits()
                .stream()
                .map(this::transformUnit)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(arr -> (String) arr[0], arr -> (Pair<String, String>) arr[1], (oldValue, newValue) -> newValue));

        List<Metrics.Field> fields = metrics.getFields();
        List<String> aliasFields = Optional.ofNullable(metrics.getAliasFields()).orElseGet(Collections::emptyList);
        Map<String, String> aliasFieldValueMap = new HashMap<>(8);
        Map<String, Object> fieldValueMap = new HashMap<>(8);
        Map<String, Object> stringTypefieldValueMap = new HashMap<>(8);
        Map<String, String> aliasFieldUnitMap = new HashMap<>(8);
        CollectRep.ValueRow.Builder realValueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (CollectRep.ValueRow aliasRow : aliasRowList) {
            for (int aliasIndex = 0; aliasIndex < aliasFields.size(); aliasIndex++) {
                String aliasFieldValue = aliasRow.getColumns(aliasIndex);
                String aliasField = aliasFields.get(aliasIndex);
                if (!CommonConstants.NULL_VALUE.equals(aliasFieldValue)) {
                    aliasFieldValueMap.put(aliasField, aliasFieldValue);
                    // whether the alias field is a number
                    CollectUtil.DoubleAndUnit doubleAndUnit = CollectUtil
                            .extractDoubleAndUnitFromStr(aliasFieldValue);
                    if (doubleAndUnit != null && doubleAndUnit.getValue() != null) {
                        fieldValueMap.put(aliasField, doubleAndUnit.getValue());
                        if (doubleAndUnit.getUnit() != null) {
                            aliasFieldUnitMap.put(aliasField, doubleAndUnit.getUnit());
                        }
                    } else {
                        fieldValueMap.put(aliasField, aliasFieldValue);
                    }
                    stringTypefieldValueMap.put(aliasField, aliasFieldValue);
                } else {
                    fieldValueMap.put(aliasField, null);
                    stringTypefieldValueMap.put(aliasField, null);
                }
            }

            for (Metrics.Field field : fields) {
                String realField = field.getField();
                JexlExpression expression = fieldExpressionMap.get(realField);
                String value = null;
                String aliasFieldUnit = null;
                if (expression != null) {
                    try {
                        Map<String, Object> context;
                        if (CommonConstants.TYPE_STRING == field.getType()) {
                            context = stringTypefieldValueMap;
                        } else {
                            for (Map.Entry<String, String> unitEntry : aliasFieldUnitMap.entrySet()) {
                                if (expression.getSourceText().contains(unitEntry.getKey())) {
                                    aliasFieldUnit = unitEntry.getValue();
                                    break;
                                }
                            }
                            context = fieldValueMap;
                        }

                        // Also executed when valueList is empty, covering pure string assignment expressions
                        Object objValue = JexlExpressionRunner.evaluate(expression, context);

                        if (objValue != null) {
                            value = String.valueOf(objValue);
                        }
                    } catch (Exception e) {
                        log.warn("[calculates execute warning, use original value.] {}", e.getMessage());
                        value = Optional.ofNullable(fieldValueMap.get(expression.getSourceText()))
                                .map(String::valueOf)
                                .orElse(null);
                    }
                } else {
                    // does not exist then map the alias value
                    String aliasField = fieldAliasMap.get(realField);
                    if (aliasField != null) {
                        value = aliasFieldValueMap.get(aliasField);
                    } else {
                        value = aliasFieldValueMap.get(realField);
                    }

                    if (value != null) {
                        final byte fieldType = field.getType();
                        if (fieldType == CommonConstants.TYPE_NUMBER) {
                            CollectUtil.DoubleAndUnit doubleAndUnit = CollectUtil
                                    .extractDoubleAndUnitFromStr(value);
                            final Double tempValue = doubleAndUnit == null ? null : doubleAndUnit.getValue();
                            value = tempValue == null ? null : String.valueOf(tempValue);
                            aliasFieldUnit = doubleAndUnit == null ? null : doubleAndUnit.getUnit();
                        } else if (fieldType == CommonConstants.TYPE_TIME) {
                            final int tempValue;
                            value = (tempValue = CommonUtil.parseTimeStrToSecond(value)) == -1 ? null : String.valueOf(tempValue);
                        }
                    }
                }

                Pair<String, String> unitPair = fieldUnitMap.get(realField);
                if (aliasFieldUnit != null) {
                    if (unitPair != null) {
                        unitPair.setLeft(aliasFieldUnit);
                    } else if (field.getUnit() != null && !aliasFieldUnit.equalsIgnoreCase(field.getUnit())) {
                        unitPair = Pair.of(aliasFieldUnit, field.getUnit());
                    }
                }
                if (value != null && unitPair != null) {
                    for (UnitConvert unitConvert : unitConvertList) {
                        if (unitConvert.checkUnit(unitPair.getLeft()) && unitConvert.checkUnit(unitPair.getRight())) {
                            value = unitConvert.convert(value, unitPair.getLeft(), unitPair.getRight());
                        }
                    }
                }
                // Handle metrics values that may have units such as 34%, 34Mb, and limit values to 4 decimal places
                if (CommonConstants.TYPE_NUMBER == field.getType()) {
                    value = CommonUtil.parseDoubleStr(value, field.getUnit());
                }
                if (value == null) {
                    value = CommonConstants.NULL_VALUE;
                }
                realValueRowBuilder.addColumn(value);
            }
            aliasFieldValueMap.clear();
            fieldValueMap.clear();
            aliasFieldUnitMap.clear();
            stringTypefieldValueMap.clear();
            CollectRep.ValueRow realValueRow = realValueRowBuilder.build();
            realValueRowBuilder.clear();
            // apply filter calculation to the real value row
            if (!CollectionUtils.isEmpty(metrics.getFilters())) {
                Map<String, Object> contextMap = new HashMap<>(8);
                for (int i = 0; i < fields.size(); i++) {
                    Metrics.Field field = fields.get(i);
                    String value = realValueRow.getColumns(i);
                    contextMap.put(field.getField(), value);
                }
                boolean isMatch = false;
                for (String filterExpr : metrics.getFilters()) {
                    try {
                        JexlExpression expression = JexlExpressionRunner.compile(filterExpr);
                        if ((Boolean) JexlExpressionRunner.evaluate(expression, contextMap)) {
                            isMatch = true;
                            break;
                        }
                    } catch (Exception e) {
                        log.warn("[metrics data row filters execute warning] {}.", e.getMessage());
                    }
                }
                if (!isMatch) {
                    // ignore this data row
                    continue;
                }
            }
            collectData.addValueRow(realValueRow);
        }
    }

    /**
     * @param cal           cal
     * @param fieldAliasMap field alias map
     * @return expr
     */
    private Object[] transformCal(String cal, Map<String, String> fieldAliasMap) {
        int splitIndex = cal.indexOf("=");
        String field = cal.substring(0, splitIndex).trim();
        String expressionStr = cal.substring(splitIndex + 1).trim().replace("\\#", "#");
        JexlExpression expression;
        try {
            expression = JexlExpressionRunner.compile(expressionStr);
        } catch (Exception e) {
            fieldAliasMap.put(field, expressionStr);
            return null;
        }
        return new Object[]{field, expression};
    }

    /**
     * transform unit
     *
     * @param unit unit
     * @return units
     */
    private Object[] transformUnit(String unit) {
        int equalIndex = unit.indexOf("=");
        int arrowIndex = unit.indexOf("->");
        if (equalIndex < 0 || arrowIndex < 0) {
            return null;
        }
        String field = unit.substring(0, equalIndex).trim();
        String originUnit = unit.substring(equalIndex + 1, arrowIndex).trim();
        String newUnit = unit.substring(arrowIndex + 2).trim();
        return new Object[]{field, Pair.of(originUnit, newUnit)};
    }

    private boolean fastFailed() {
        return this.timeout == null || this.timeout.isCancelled();
    }

    private CollectRep.MetricsData validateResponse(CollectRep.MetricsData.Builder builder) {
        long endTime = System.currentTimeMillis();
        builder.setTime(endTime);
        long runningTime = endTime - startTime;
        long allTime = endTime - newTime;
        if (startTime - newTime >= WARN_DISPATCH_TIME) {
            log.warn("[Collector Dispatch Warn, Dispatch Use {}ms.", startTime - newTime);
        }
        if (builder.getCode() != CollectRep.Code.SUCCESS) {
            log.info("[Collect Failed, Run {}ms, All {}ms] Reason: {}", runningTime, allTime, builder.getMsg());
        } else {
            log.info("[Collect Success, Run {}ms, All {}ms].", runningTime, allTime);
        }
        return builder.build();
    }

    private void validateResponse(CollectRep.MetricsData metricsData) {
        if (metricsData == null) {
            log.error("[Collect Failed] Response metrics data is null.");
            return;
        }
        long endTime = System.currentTimeMillis();
        long runningTime = endTime - startTime;
        long allTime = endTime - newTime;
        if (startTime - newTime >= WARN_DISPATCH_TIME) {
            log.warn("[Collector Dispatch Warn, Dispatch Use {}ms.", startTime - newTime);
        }
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            log.info("[Collect Failed, Run {}ms, All {}ms] Reason: {}", runningTime, allTime, metricsData.getMsg());
        } else {
            log.info("[Collect Success, Run {}ms, All {}ms].", runningTime, allTime);
        }
    }

    private void setNewThreadName(long monitorId, String app, long startTime, Metrics metrics) {
        String builder = monitorId + "-" + app + "-" + metrics.getName()
                + "-" + String.valueOf(startTime).substring(9);
        Thread.currentThread().setName(builder);
    }

    @Override
    public int compareTo(MetricsCollect collect) {
        return collect.runPriority - this.runPriority;
    }
}
