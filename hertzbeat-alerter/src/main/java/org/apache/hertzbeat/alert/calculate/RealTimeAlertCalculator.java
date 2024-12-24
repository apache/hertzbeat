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

package org.apache.hertzbeat.alert.calculate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.jexl3.JexlException;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.support.event.MonitorDeletedEvent;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JexlExpressionRunner;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

/**
 * Calculate alarms based on the alarm definition rules and collected data
 */
@Component
@Slf4j
public class RealTimeAlertCalculator {

    private static final String SYSTEM_VALUE_ROW_COUNT = "system_value_row_count";
    
    private static final int CALCULATE_THREADS = 3;

    private static final String STATUS_INACTIVE = "inactive";  
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_FIRING = "firing";
    private static final String STATUS_RESOLVED = "resolved";

    /**
     * The alarm in the process is triggered
     * key - monitorId+alertDefineId+tags ｜ The alarm is a common threshold alarm
     * key - monitorId ｜ Indicates the monitoring status availability reachability alarm
     */
    private final Map<String, SingleAlert> pendingAlertMap;
    /**
     * The not recover alert
     * key - monitorId + alertDefineId + tags
     */
    private final Map<String, SingleAlert> firingAlertMap;
    private final AlerterWorkerPool workerPool;
    private final CommonDataQueue dataQueue;
    private final AlertDefineService alertDefineService;
    private final AlarmCommonReduce alarmCommonReduce;

    public RealTimeAlertCalculator(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                                   AlertDefineService alertDefineService,
                                   AlarmCommonReduce alarmCommonReduce) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.alarmCommonReduce = alarmCommonReduce;
        this.alertDefineService = alertDefineService;
        this.pendingAlertMap = new ConcurrentHashMap<>(16);
        this.firingAlertMap = new ConcurrentHashMap<>(16);
        // todo Initialize firing stateAlertMap
        startCalculate();
    }

    private void startCalculate() {
        Runnable runnable = () -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = dataQueue.pollMetricsDataToAlerter();
                    calculate(metricsData);
                    dataQueue.sendMetricsDataToStorage(metricsData);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    log.error("calculate alarm error: {}.", e.getMessage(), e);
                }
            }
        };
        for (int i = 0; i < CALCULATE_THREADS; i++) {
            workerPool.executeJob(runnable);
        }
    }

    private void calculate(CollectRep.MetricsData metricsData) {
        long currentTimeMilli = System.currentTimeMillis();
        long instance = metricsData.getId();
        String app = metricsData.getApp();
        String metrics = metricsData.getMetrics();
        Integer priority = metricsData.getPriority();
        String code = metricsData.getCode().name();
        // todo get all alert define cache
        List<AlertDefine> thresholds = null;
        // todo filter some thresholds by app metrics instance
        Map<String, Object> commonContext = new HashMap<>(8);
        commonContext.put("instance", instance);
        commonContext.put("app", app);
        commonContext.put("priority", priority);
        commonContext.put("code", code);
        commonContext.put("metrics", metrics);
        
        List<CollectRep.Field> fields = metricsData.getFields();
        Map<String, Object> fieldValueMap = new HashMap<>(8);
        int valueRowCount = metricsData.getValuesCount();
        for (AlertDefine define : thresholds) {
            final String expr = define.getExpr();
            if (StringUtils.isBlank(expr)) {
                continue;
            }
            {
                // trigger the expr before the metrics data, due the available up down or others
                try {
                    boolean match = execAlertExpression(fieldValueMap, expr);
                    try {
                        if (match) {
                            // If the threshold rule matches, the number of times the threshold has been triggered is determined and an alarm is triggered
                            afterThresholdRuleMatch(currentTimeMilli, instance, "", fieldValueMap, define);
                            // if the threshold is triggered, ignore other data rows
                            continue;
                        } else {
                            String alarmKey = String.valueOf(instance) + define.getId();
                            handleRecoveredAlert(alarmKey);
                        }
                    } catch (Exception e) {
                        log.error(e.getMessage(), e);
                    }
                } catch (Exception ignored) {}
            }
            for (CollectRep.ValueRow valueRow : metricsData.getValues()) {

                if (CollectionUtils.isEmpty(valueRow.getColumnsList())) {
                    continue;
                }
                fieldValueMap.clear();
                fieldValueMap.put(SYSTEM_VALUE_ROW_COUNT, valueRowCount);
                StringBuilder tagBuilder = new StringBuilder();
                for (int index = 0; index < valueRow.getColumnsList().size(); index++) {
                    String valueStr = valueRow.getColumns(index);
                    if (CommonConstants.NULL_VALUE.equals(valueStr)) {
                        continue;
                    }

                    final CollectRep.Field field = fields.get(index);
                    final int fieldType = field.getType();

                    if (fieldType == CommonConstants.TYPE_NUMBER) {
                        final Double doubleValue;
                        if ((doubleValue = CommonUtil.parseStrDouble(valueStr)) != null) {
                            fieldValueMap.put(field.getName(), doubleValue);
                        }
                    } else if (fieldType == CommonConstants.TYPE_TIME) {
                        final Integer integerValue;
                        if ((integerValue = CommonUtil.parseStrInteger(valueStr)) != null) {
                            fieldValueMap.put(field.getName(), integerValue);
                        }
                    } else {
                        if (StringUtils.isNotEmpty(valueStr)) {
                            fieldValueMap.put(field.getName(), valueStr);
                        }
                    }

                    if (field.getLabel()) {
                        tagBuilder.append("-").append(valueStr);
                    }
                }
                try {
                    boolean match = execAlertExpression(fieldValueMap, expr);
                    try {
                        if (match) {
                            afterThresholdRuleMatch(currentTimeMilli, instance, tagBuilder.toString(), fieldValueMap, define);
                        } else {
                            String alarmKey = String.valueOf(instance) + define.getId() + tagBuilder;
                            handleRecoveredAlert(alarmKey);
                        }
                    } catch (Exception e) {
                        log.error(e.getMessage(), e);
                    }
                } catch (Exception ignored) {}
            }
        }
    }

    private void handleRecoveredAlert(String alarmKey) {
        SingleAlert firingAlert = firingAlertMap.remove(alarmKey);
        if (firingAlert != null) {
            firingAlert.setEndAt(System.currentTimeMillis());
            firingAlert.setStatus(STATUS_RESOLVED);
            alarmCommonReduce.reduceAndSendAlarm(firingAlert);
        }
        pendingAlertMap.remove(alarmKey);
    }

    private void afterThresholdRuleMatch(long currentTimeMilli, long instance, 
                                       String tagStr, Map<String, Object> fieldValueMap, AlertDefine define) {
        String alarmKey = String.valueOf(instance) + define.getId() + tagStr;
        SingleAlert existingAlert = pendingAlertMap.get(alarmKey);
        
        // 构建标签
        Map<String, String> labels = new HashMap<>(8);
        
        // 构建注解
        Map<String, String> annotations = new HashMap<>(4);
        fieldValueMap.putAll(define.getLabels());
        labels.putAll(define.getLabels());

        // 获取所需触发次数阈值,默认为1次
        int requiredTimes = define.getTimes() == null ? 1 : define.getTimes();

        if (existingAlert == null) {
            // 首次触发告警,创建新告警并设置为pending状态
            SingleAlert newAlert = SingleAlert.builder()
                    .labels(labels)
                    .annotations(annotations)
                    .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                    .status(STATUS_PENDING)
                    .triggerTimes(1) 
                    .startAt(currentTimeMilli)
                    .activeAt(currentTimeMilli)
                    .build();
                    
            // 如果所需触发次数为1,直接设为firing状态
            if (requiredTimes <= 1) {
                newAlert.setStatus(STATUS_FIRING);
                firingAlertMap.put(alarmKey, newAlert);
                alarmCommonReduce.reduceAndSendAlarm(newAlert);
            } else {
                // 否则先放入pending队列
                pendingAlertMap.put(alarmKey, newAlert);
            }
        } else {
            // 更新已存在的告警
            existingAlert.setTriggerTimes(existingAlert.getTriggerTimes() + 1);
            existingAlert.setActiveAt(currentTimeMilli);
            
            // 检查是否达到所需触发次数
            if (existingAlert.getStatus().equals(STATUS_PENDING) && existingAlert.getTriggerTimes() >= requiredTimes) {
                // 达到触发次数阈值,转为firing状态
                existingAlert.setStatus(STATUS_FIRING);
                firingAlertMap.put(alarmKey, existingAlert);
                alarmCommonReduce.reduceAndSendAlarm(existingAlert);
                pendingAlertMap.remove(alarmKey);
            }
        }
    }

    private boolean execAlertExpression(Map<String, Object> fieldValueMap, String expr) {
        Boolean match;
        JexlExpression expression;
        try {
            expression = JexlExpressionRunner.compile(expr);
        } catch (JexlException jexlException) {
            log.error("Alarm Rule: {} Compile Error: {}.", expr, jexlException.getMessage());
            throw jexlException;
        } catch (Exception e) {
            log.error("Alarm Rule: {} Unknown Error: {}.", expr, e.getMessage());
            throw e;
        }

        try {
            match = (Boolean) JexlExpressionRunner.evaluate(expression, fieldValueMap);
        } catch (JexlException jexlException) {
            log.error("Alarm Rule: {} Run Error: {}.", expr, jexlException.getMessage());
            throw jexlException;
        } catch (Exception e) {
            log.error("Alarm Rule: {} Unknown Error: {}.", expr, e.getMessage());
            throw e;
        }
        return match != null && match;
    }
    
    @EventListener(MonitorDeletedEvent.class)
    public void onMonitorDeletedEvent(MonitorDeletedEvent event) {
        log.info("calculate alarm receive monitor {} has been deleted.", event.getMonitorId());
        this.pendingAlertMap.remove(String.valueOf(event.getMonitorId()));
    }

}
