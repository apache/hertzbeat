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

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.jexl3.JexlException;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
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
    private static final String LABEL_INSTANCE = "instance";
    private static final String LABEL_ALERT_NAME = "alertname";

    /**
     * The alarm in the process is triggered
     * key - labels fingerprint
     */
    private final Map<String, SingleAlert> pendingAlertMap;
    /**
     * The not recover alert
     * key - labels fingerprint
     */
    private final Map<String, SingleAlert> firingAlertMap;
    private final AlerterWorkerPool workerPool;
    private final CommonDataQueue dataQueue;
    private final AlertDefineService alertDefineService;
    private final AlarmCommonReduce alarmCommonReduce;

    public RealTimeAlertCalculator(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                                   AlertDefineService alertDefineService, SingleAlertDao singleAlertDao,
                                   AlarmCommonReduce alarmCommonReduce) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.alarmCommonReduce = alarmCommonReduce;
        this.alertDefineService = alertDefineService;
        this.pendingAlertMap = new ConcurrentHashMap<>(16);
        this.firingAlertMap = new ConcurrentHashMap<>(16);
        // Initialize firing stateAlertMap
        List<SingleAlert> singleAlerts = singleAlertDao.querySingleAlertsByStatus(STATUS_FIRING);
        for (SingleAlert singleAlert : singleAlerts) {
            String fingerprint = calculateFingerprint(singleAlert.getLabels());
            firingAlertMap.put(fingerprint, singleAlert);
        }
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
        List<AlertDefine> thresholds = this.alertDefineService.getRealTimeAlertDefines();
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
            fieldValueMap.putAll(commonContext);
            {
                // trigger the expr before the metrics data, due the available up down or others
                try {
                    boolean match = execAlertExpression(fieldValueMap, expr);
                    try {
                        Map<String, String> fingerPrints = new HashMap<>(8);
                        fingerPrints.put(LABEL_INSTANCE, String.valueOf(instance));
                        fingerPrints.put(LABEL_ALERT_NAME, define.getName());
                        fingerPrints.putAll(define.getLabels());
                        if (match) {
                            // If the threshold rule matches, the number of times the threshold has been triggered is determined and an alarm is triggered
                            afterThresholdRuleMatch(currentTimeMilli, fingerPrints, fieldValueMap, define);
                            // if the threshold is triggered, ignore other data rows
                            continue;
                        } else {
                            handleRecoveredAlert(fingerPrints);
                        }
                    } catch (Exception e) {
                        log.error(e.getMessage(), e);
                    }
                } catch (Exception ignored) {}
            }
            Map<String, String> fingerPrints = new HashMap<>(8);
            for (CollectRep.ValueRow valueRow : metricsData.getValues()) {
                if (CollectionUtils.isEmpty(valueRow.getColumnsList())) {
                    continue;
                }
                fieldValueMap.clear();
                fieldValueMap.put(SYSTEM_VALUE_ROW_COUNT, valueRowCount);
                fieldValueMap.putAll(commonContext);
                fingerPrints.clear();
                fingerPrints.put(LABEL_INSTANCE, String.valueOf(instance));
                fingerPrints.put(LABEL_ALERT_NAME, define.getName());
                fingerPrints.putAll(define.getLabels());
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
                        fingerPrints.put(field.getName(), valueStr);
                    }
                }
                try {
                    boolean match = execAlertExpression(fieldValueMap, expr);
                    try {
                        if (match) {
                            afterThresholdRuleMatch(currentTimeMilli, fingerPrints, fieldValueMap, define);
                        } else {
                            handleRecoveredAlert(fingerPrints);
                        }
                    } catch (Exception e) {
                        log.error(e.getMessage(), e);
                    }
                } catch (Exception ignored) {}
            }
        }
    }

    private void handleRecoveredAlert(Map<String, String> fingerprints) {
        String fingerprint = calculateFingerprint(fingerprints);
        SingleAlert firingAlert = firingAlertMap.remove(fingerprint);
        if (firingAlert != null) {
            firingAlert.setEndAt(System.currentTimeMillis());
            firingAlert.setStatus(STATUS_RESOLVED);
            alarmCommonReduce.reduceAndSendAlarm(firingAlert);
        }
        pendingAlertMap.remove(fingerprint);
    }

    private void afterThresholdRuleMatch(long currentTimeMilli, Map<String, String> fingerPrints, 
                                         Map<String, Object> fieldValueMap, AlertDefine define) {
        String fingerprint = calculateFingerprint(fingerPrints);
        SingleAlert existingAlert = pendingAlertMap.get(fingerprint);
        Map<String, String> labels = new HashMap<>(8);
        Map<String, String> annotations = new HashMap<>(4);
        fieldValueMap.putAll(define.getLabels());
        labels.putAll(fingerPrints);
        int requiredTimes = define.getTimes() == null ? 1 : define.getTimes();
        if (existingAlert == null) {
            // First time triggering alert, create new alert and set to pending status
            SingleAlert newAlert = SingleAlert.builder()
                    .labels(labels)
                    .annotations(annotations)
                    .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                    .status(STATUS_PENDING)
                    .triggerTimes(1) 
                    .startAt(currentTimeMilli)
                    .activeAt(currentTimeMilli)
                    .build();
                    
            // If required trigger times is 1, set to firing status directly
            if (requiredTimes <= 1) {
                newAlert.setStatus(STATUS_FIRING);
                firingAlertMap.put(fingerprint, newAlert);
                alarmCommonReduce.reduceAndSendAlarm(newAlert);
            } else {
                // Otherwise put into pending queue first
                pendingAlertMap.put(fingerprint, newAlert);
            }
        } else {
            // Update existing alert
            existingAlert.setTriggerTimes(existingAlert.getTriggerTimes() + 1);
            existingAlert.setActiveAt(currentTimeMilli);
            
            // Check if required trigger times reached
            if (existingAlert.getStatus().equals(STATUS_PENDING) && existingAlert.getTriggerTimes() >= requiredTimes) {
                // Reached trigger times threshold, change to firing status
                existingAlert.setStatus(STATUS_FIRING);
                firingAlertMap.put(fingerprint, existingAlert);
                alarmCommonReduce.reduceAndSendAlarm(existingAlert);
                pendingAlertMap.remove(fingerprint);
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
    
    private String calculateFingerprint(Map<String, String> fingerPrints) {
        List<String> keyList = fingerPrints.keySet().stream().filter(Objects::nonNull).sorted().toList();
        List<String> valueList = fingerPrints.values().stream().filter(Objects::nonNull).sorted().toList();
        return Arrays.hashCode(keyList.toArray(new String[0])) + "-"
                + Arrays.hashCode(valueList.toArray(new String[0]));
    }
    
    @EventListener(MonitorDeletedEvent.class)
    public void onMonitorDeletedEvent(MonitorDeletedEvent event) {
        log.info("calculate alarm receive monitor {} has been deleted.", event.getMonitorId());
        this.pendingAlertMap.remove(String.valueOf(event.getMonitorId()));
    }

}
