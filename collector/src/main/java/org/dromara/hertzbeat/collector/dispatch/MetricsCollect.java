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

package org.dromara.hertzbeat.collector.dispatch;

import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.Expression;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.collect.prometheus.PrometheusAutoCollectImpl;
import org.dromara.hertzbeat.collector.collect.strategy.CollectStrategyFactory;
import org.dromara.hertzbeat.collector.dispatch.timer.Timeout;
import org.dromara.hertzbeat.collector.dispatch.timer.WheelTimerTask;
import org.dromara.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.common.util.Pair;

import java.util.*;
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
     * Tenant ID
     */
    protected long tenantId;
    /**
     * Monitor ID
     */
    protected long monitorId;
    /**
     * Monitoring type name
     */
    protected String app;
    /**
     * Metrics configuration
     */
    protected Metrics metrics;
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
        this.monitorId = job.getMonitorId();
        this.tenantId = job.getTenantId();
        this.app = job.getApp();
        this.collectDataDispatch = collectDataDispatch;
        this.isCyclic = job.isCyclic();
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
        setNewThreadName(monitorId, app, startTime, metrics);
        CollectRep.MetricsData.Builder response = CollectRep.MetricsData.newBuilder();
        response.setApp(app);
        response.setId(monitorId);
        response.setTenantId(tenantId);
        // for prometheus auto 
        if (DispatchConstants.PROTOCOL_PROMETHEUS.equalsIgnoreCase(metrics.getProtocol())) {
            List<CollectRep.MetricsData> metricsData = PrometheusAutoCollectImpl
                    .getInstance().collect(response, metrics);
            validateResponse(metricsData.stream().findFirst().orElse(null));
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
                abstractCollect.collect(response, monitorId, app, metrics);
            } catch (Exception e) {
                String msg = e.getMessage();
                if (msg == null && e.getCause() != null) {
                    msg = e.getCause().getMessage();
                }
                log.error("[Metrics Collect]: {}.", msg, e);
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
    private void calculateFields(Metrics metrics, CollectRep.MetricsData.Builder collectData) {
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
        Map<String, Expression> fieldExpressionMap = metrics.getCalculates()
                .stream()
                .map(cal -> transformCal(cal, fieldAliasMap))
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(arr -> (String) arr[0], arr -> (Expression) arr[1], (oldValue, newValue) -> newValue));

        if (metrics.getUnits() == null) {
            metrics.setUnits(Collections.emptyList());
        }
        Map<String, Pair<String, String>> fieldUnitMap = metrics.getUnits()
                .stream()
                .map(this::transformUnit)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(arr -> (String) arr[0], arr -> (Pair<String, String>) arr[1], (oldValue, newValue) -> newValue));

        List<Metrics.Field> fields = metrics.getFields();
        List<String> aliasFields = metrics.getAliasFields();
        Map<String, String> aliasFieldValueMap = new HashMap<>(16);
        Map<String, Object> fieldValueMap = new HashMap<>(16);
        CollectRep.ValueRow.Builder realValueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (CollectRep.ValueRow aliasRow : aliasRowList) {
            for (int aliasIndex = 0; aliasIndex < aliasFields.size(); aliasIndex++) {
                String aliasFieldValue = aliasRow.getColumns(aliasIndex);
                if (!CommonConstants.NULL_VALUE.equals(aliasFieldValue)) {
                    aliasFieldValueMap.put(aliasFields.get(aliasIndex), aliasFieldValue);
                }
            }

            for (Metrics.Field field : fields) {
                String realField = field.getField();
                Expression expression = fieldExpressionMap.get(realField);
                String value = null;
                String aliasFieldUnit = null;
                if (expression != null) {
                    // If there is a calculation expression, calculate the value
                    if (CommonConstants.TYPE_NUMBER == field.getType()) {
                        for (String variable : expression.getVariableFullNames()) {
                            // extract double value and unit from aliasField value
                            CollectUtil.DoubleAndUnit doubleAndUnit = CollectUtil
                                    .extractDoubleAndUnitFromStr(aliasFieldValueMap.get(variable));
                            if (doubleAndUnit != null) {
                                Double doubleValue = doubleAndUnit.getValue();
                                aliasFieldUnit = doubleAndUnit.getUnit();
                                fieldValueMap.put(variable, doubleValue);
                            } else {
                                fieldValueMap.put(variable, null);
                            }
                        }
                    } else {
                        for (String variable : expression.getVariableFullNames()) {
                            String strValue = aliasFieldValueMap.get(variable);
                            fieldValueMap.put(variable, strValue);
                        }
                    }
                    try {
                        // valueList为空时也执行,涵盖纯字符串赋值表达式
                        Object objValue = expression.execute(fieldValueMap);
                        if (objValue != null) {
                            value = String.valueOf(objValue);
                        }
                    } catch (Exception e) {
                        log.info("[calculates execute warning] {}.", e.getMessage());
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
                            final Double tempValue = doubleAndUnit.getValue();
                            value = tempValue == null ? null : String.valueOf(tempValue);
                            aliasFieldUnit = doubleAndUnit.getUnit();
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
                realValueRowBuilder.addColumns(value);
                fieldValueMap.clear();
            }
            aliasFieldValueMap.clear();
            collectData.addValues(realValueRowBuilder.build());
            realValueRowBuilder.clear();
        }
    }


    /**
     * @param cal cal
     * @param fieldAliasMap field alias map
     * @return expr
     */
    private Object[] transformCal(String cal, Map<String, String> fieldAliasMap) {
        int splitIndex = cal.indexOf("=");
        String field = cal.substring(0, splitIndex).trim();
        String expressionStr = cal.substring(splitIndex + 1).trim().replace("\\#", "#");
        Expression expression;
        try {
            expression = AviatorEvaluator.compile(expressionStr, true);
        } catch (Exception e) {
            fieldAliasMap.put(field, expressionStr);
            return null;
        }
        return new Object[]{field, expression};
    }


    /**
     * transform unit
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
        String builder = monitorId + "-" + app + "-" + metrics.getName() +
                "-" + String.valueOf(startTime).substring(9);
        Thread.currentThread().setName(builder);
    }

    @Override
    public int compareTo(MetricsCollect collect) {
        return runPriority - collect.runPriority;
    }
}
