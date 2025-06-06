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


import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.jexl3.JexlException;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JexlExpressionRunner;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

/**
 * Calculate alarms based on the alarm definition rules and collected data
 */
@Component
@Slf4j
public class RealTimeAlertCalculator {
    
    private static final int CALCULATE_THREADS = 3;
    
    private static final String KEY_INSTANCE = "__instance__";
    private static final String KEY_INSTANCE_NAME = "__instancename__";
    private static final String KEY_INSTANCE_HOST = "__instancehost__";
    private static final String KEY_APP = "__app__";
    private static final String KEY_METRICS = "__metrics__";
    private static final String KEY_PRIORITY = "__priority__";
    private static final String KEY_CODE = "__code__";
    private static final String KEY_AVAILABLE  = "__available__";
    private static final String KEY_LABELS = "__labels__";
    private static final String UP = "up";
    private static final String DOWN = "down";
    private static final String KEY_ROW = "__row__";

    private static final Pattern APP_PATTERN = Pattern.compile("equals\\(__app__,\"([^\"]+)\"\\)");
    private static final Pattern AVAILABLE_PATTERN = Pattern.compile("equals\\(__available__,\"([^\"]+)\"\\)");
    private static final Pattern LABEL_PATTERN = Pattern.compile("contains\\(__labels__,\\s*\"([^\"]+)\"\\)");
    private static final Pattern INSTANCE_PATTERN = Pattern.compile("equals\\(__instance__,\\s*\"(\\d+)\"\\)");
    private static final Pattern METRICS_PATTERN = Pattern.compile("equals\\(__metrics__,\"([^\"]+)\"\\)");

    private final AlerterWorkerPool workerPool;
    private final CommonDataQueue dataQueue;
    private final AlertDefineService alertDefineService;
    private final AlarmCommonReduce alarmCommonReduce;
    private final AlarmCacheManager alarmCacheManager;

    @Autowired
    public RealTimeAlertCalculator(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                                   AlertDefineService alertDefineService, SingleAlertDao singleAlertDao,
                                   AlarmCommonReduce alarmCommonReduce, AlarmCacheManager alarmCacheManager) {
        this(workerPool, dataQueue, alertDefineService, singleAlertDao, alarmCommonReduce, alarmCacheManager, true);
    }

    /**
     * Constructor for RealTimeAlertCalculator with a toggle to control whether to start alert calculation threads.
     *
     * @param workerPool          The worker pool used for concurrent alert calculation.
     * @param dataQueue           The queue from which metric data is pulled and pushed.
     * @param alertDefineService  The service providing alert definition rules.
     * @param singleAlertDao      The DAO for fetching persisted alert states from storage.
     * @param alarmCommonReduce   The component responsible for reducing and sending alerts.
     * @param start               If true, the alert calculation threads will start automatically;
     *                            set to false to disable thread start (useful for unit testing).
     */
    public RealTimeAlertCalculator(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                                   AlertDefineService alertDefineService, SingleAlertDao singleAlertDao,
                                   AlarmCommonReduce alarmCommonReduce, AlarmCacheManager alarmCacheManager, boolean start) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.alarmCommonReduce = alarmCommonReduce;
        this.alertDefineService = alertDefineService;
        this.alarmCacheManager = alarmCacheManager;
        if (start) {
            startCalculate();
        }
    }

    public void startCalculate() {
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
        String instance = String.valueOf(metricsData.getId());
        String instanceName = metricsData.getInstanceName();
        String instanceHost = metricsData.getInstanceHost();
        String app = metricsData.getApp();
        String metrics = metricsData.getMetrics();
        if ((CommonConstants.PROMETHEUS_APP_PREFIX + instanceName).equals(metricsData.getApp())) {
            app = CommonConstants.PROMETHEUS;
        }
        int priority = metricsData.getPriority();
        int code = metricsData.getCode().getNumber();
        Map<String, String> labels = metricsData.getLabels();
        Map<String, String> annotations = metricsData.getAnnotations();
        List<AlertDefine> thresholds = this.alertDefineService.getRealTimeAlertDefines();
        // Filter thresholds by app, metrics, labels and instance
        thresholds = filterThresholdsByAppAndMetrics(thresholds, app, metrics, labels, instance, priority);
        if (thresholds.isEmpty()) {
            return;
        }
        Map<String, Object> commonContext = new HashMap<>(8);
        commonContext.put(KEY_INSTANCE, instance);
        commonContext.put(KEY_INSTANCE_NAME, instanceName);
        commonContext.put(KEY_INSTANCE_HOST, instanceHost);
        commonContext.put(KEY_APP, app);
        commonContext.put(KEY_PRIORITY, priority);
        commonContext.put(KEY_CODE, code);
        commonContext.put(KEY_METRICS, metrics);
        commonContext.put(KEY_LABELS, String.join(",", kvLabelsToKvStringSet(labels)));
        if (priority == 0) {
            commonContext.put(KEY_AVAILABLE, metricsData.getCode() == CollectRep.Code.SUCCESS ? UP : DOWN);
        }
        if (labels != null) {
            commonContext.putAll(labels);
        }
        List<CollectRep.Field> fields = metricsData.getFields();
        Map<String, Object> fieldValueMap = new HashMap<>(8);
        int valueRowCount = metricsData.getValuesCount();
        for (AlertDefine define : thresholds) {
            if (define.getLabels() == null) {
                define.setLabels(new HashMap<>(8));
            }
            if (define.getAnnotations() == null) {
                define.setAnnotations(new HashMap<>(8));
            }
            fieldValueMap.clear();
            fieldValueMap.putAll(commonContext);
            final String expr = define.getExpr();
            if (StringUtils.isBlank(expr)) {
                continue;
            }
            Map<String, String> commonFingerPrints = new HashMap<>(8);
            commonFingerPrints.put(CommonConstants.LABEL_INSTANCE, instance);
            // here use the alert name as finger, not care the alert name may be changed
            commonFingerPrints.put(CommonConstants.LABEL_ALERT_NAME, define.getName());
            commonFingerPrints.put(CommonConstants.LABEL_INSTANCE_NAME, instanceName);
            commonFingerPrints.put(CommonConstants.LABEL_INSTANCE_HOST, instanceHost);
            commonFingerPrints.putAll(define.getLabels());
            if (labels != null) {
                commonFingerPrints.putAll(labels);
            }
            {
                // trigger the expr before the metrics data, due the available up down or others
                try {
                    boolean match = execAlertExpression(fieldValueMap, expr, true);
                    try {
                        if (match) {
                            // If the threshold rule matches, the number of times the threshold has been triggered is determined and an alarm is triggered
                            afterThresholdRuleMatch(currentTimeMilli, commonFingerPrints, fieldValueMap, define, annotations);
                        } else {
                            handleRecoveredAlert(commonFingerPrints);
                        }
                        // if this threshold pre compile success, ignore blew
                        continue;
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
                fieldValueMap.put(KEY_ROW, valueRowCount);
                fieldValueMap.putAll(commonContext);
                fingerPrints.clear();
                fingerPrints.putAll(commonFingerPrints);
                for (int index = 0; index < valueRow.getColumnsList().size(); index++) {
                    String valueStr = valueRow.getColumns(index);
                    final CollectRep.Field field = fields.get(index);
                    if (CommonConstants.NULL_VALUE.equals(valueStr)) {
                        fieldValueMap.put(field.getName(), null);
                        continue;
                    }
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
                    boolean match = execAlertExpression(fieldValueMap, expr, false);
                    try {
                        if (match) {
                            afterThresholdRuleMatch(currentTimeMilli, fingerPrints, fieldValueMap, define, annotations);
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

    /**
     * Filter alert definitions by app, metrics and instance
     *
     * @param thresholds Alert definitions to filter
     * @param app        Current app name
     * @param metrics    Current metrics name
     * @param instance   Current instance id
     * @param priority  Current priority
     * @return Filtered alert definitions
     */
    public List<AlertDefine> filterThresholdsByAppAndMetrics(List<AlertDefine> thresholds, String app, String metrics, Map<String, String> labels, String instance, int priority) {
        return thresholds.stream()
                .filter(define -> {
                    if (StringUtils.isBlank(define.getExpr())) {
                        return false;
                    }
                    String expr = define.getExpr();

                    // Extract and check app - required
                    Matcher appMatcher = APP_PATTERN.matcher(expr);
                    if (!appMatcher.find() || !app.equals(appMatcher.group(1))) {
                        return false;
                    }
                    
                    // Extract and check available - required
                    if (priority != 0) {
                        Matcher availableMatcher = AVAILABLE_PATTERN.matcher(expr);
                        if (availableMatcher.find()) {
                            return false;
                        }
                    }

                    // Extract and check metrics - optional
                    Matcher metricsMatcher = METRICS_PATTERN.matcher(expr);
                    if (metricsMatcher.find() && !metrics.equals(metricsMatcher.group(1))) {
                        return false;
                    }

                    // Extract and check instance - optional with multiple values
                    Matcher instanceMatcher = INSTANCE_PATTERN.matcher(expr);
                    Matcher labelMatcher = LABEL_PATTERN.matcher(expr);
                    // If no instance and instance labels specified in expr, accept all instances
                    if (!instanceMatcher.find() && !labelMatcher.find()) {
                        return true;
                    }
                    
                    // Reset matcher to check all instances
                    instanceMatcher.reset();
                    labelMatcher.reset();
                    // If instances specified, current instance must match one of them
                    while (instanceMatcher.find()) {
                        if (Objects.equals(instance, instanceMatcher.group(1))) {
                            return true;
                        }
                    }
                    // If instance labels specified, current instance must match one of them
                    Set<String> labelKvStringSet = kvLabelsToKvStringSet(labels);
                    while (labelMatcher.find()) {
                        String label = labelMatcher.group(1);
                        if (labelKvStringSet.contains(label)) {
                            return true;
                        }
                    }
                    return false;
                })
                .collect(Collectors.toList());
    }

    private void handleRecoveredAlert(Map<String, String> fingerprints) {
        String fingerprint = AlertUtil.calculateFingerprint(fingerprints);
        SingleAlert firingAlert = alarmCacheManager.removeFiring(fingerprint);
        if (firingAlert != null) {
            // todo consider multi times to tig for resolved alert
            firingAlert.setTriggerTimes(1);
            firingAlert.setEndAt(System.currentTimeMillis());
            firingAlert.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);
            alarmCommonReduce.reduceAndSendAlarm(firingAlert.clone());
        }
        alarmCacheManager.removePending(fingerprint);
    }

    private void afterThresholdRuleMatch(long currentTimeMilli, Map<String, String> fingerPrints,
                                         Map<String, Object> fieldValueMap, AlertDefine define, Map<String, String> annotations) {
        String fingerprint = AlertUtil.calculateFingerprint(fingerPrints);
        SingleAlert existingAlert = alarmCacheManager.getPending(fingerprint);
        fieldValueMap.putAll(define.getLabels());
        int requiredTimes = define.getTimes() == null ? 1 : define.getTimes();
        if (existingAlert == null) {
            // First time triggering alert, create new alert and set to pending status
            Map<String, String> alertLabels = new HashMap<>(8);
            alertLabels.putAll(fingerPrints);
            Map<String, String> alertAnnotations = new HashMap<>(8);
            if (annotations != null) {
                alertAnnotations.putAll(annotations);
            }
            if (define.getAnnotations() != null) {
                alertAnnotations.putAll(define.getAnnotations());
            }
            // render var content in annotations
            for (Map.Entry<String, String> entry : alertAnnotations.entrySet()) {
                entry.setValue(AlertTemplateUtil.render(entry.getValue(), fieldValueMap));
            }
            SingleAlert newAlert = SingleAlert.builder()
                    .labels(alertLabels)
                    .annotations(alertAnnotations)
                    // render var content in content
                    .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                    .status(CommonConstants.ALERT_STATUS_PENDING)
                    .triggerTimes(1) 
                    .startAt(currentTimeMilli)
                    .activeAt(currentTimeMilli)
                    .build();
                    
            // If required trigger times is 1, set to firing status directly
            if (requiredTimes <= 1) {
                newAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
                alarmCacheManager.putFiring(fingerprint, newAlert);
                alarmCommonReduce.reduceAndSendAlarm(newAlert.clone());
            } else {
                // Otherwise put into pending queue first
                alarmCacheManager.putPending(fingerprint, newAlert);
            }
        } else {
            // Update existing alert
            existingAlert.setTriggerTimes(existingAlert.getTriggerTimes() + 1);
            existingAlert.setActiveAt(currentTimeMilli);
            
            // Check if required trigger times reached
            if (existingAlert.getStatus().equals(CommonConstants.ALERT_STATUS_PENDING) && existingAlert.getTriggerTimes() >= requiredTimes) {
                // Reached trigger times threshold, change to firing status
                alarmCacheManager.removePending(fingerprint);
                existingAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
                alarmCacheManager.putFiring(fingerprint, existingAlert);
                alarmCommonReduce.reduceAndSendAlarm(existingAlert.clone());
            }
        }
    }

    private boolean execAlertExpression(Map<String, Object> fieldValueMap, String expr, boolean ignoreJexlException) {
        Boolean match;
        JexlExpression expression;
        try {
            expression = JexlExpressionRunner.compile(expr);
        } catch (JexlException jexlException) {
            log.warn("Alarm Rule: {} Compile Error: {}.", expr, jexlException.getMessage());
            throw jexlException;
        } catch (Exception e) {
            log.error("Alarm Rule: {} Unknown Error: {}.", expr, e.getMessage());
            throw e;
        }

        try {
            match = (Boolean) JexlExpressionRunner.evaluate(expression, fieldValueMap);
        } catch (JexlException jexlException) {
            if (ignoreJexlException) {
                log.debug("Alarm Rule: {} Run Error: {}.", expr, jexlException.getMessage());
            } else {
                log.error("Alarm Rule: {} Run Error: {}.", expr, jexlException.getMessage());   
            }
            throw jexlException;
        } catch (Exception e) {
            log.error("Alarm Rule: {} Unknown Error: {}.", expr, e.getMessage());
            throw e;
        }
        return match != null && match;
    }

    private Set<String> kvLabelsToKvStringSet(Map<String, String> labels) {
        if (labels == null || labels.isEmpty()) {
            return Collections.singleton("");
        }
        return labels.entrySet().stream()
                .map(item -> item.getKey() + ":" + item.getValue())
                .collect(Collectors.toSet());
    }
}
