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

import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_CODE_NOT_REACH;
import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_CODE_PENDING;
import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_CODE_SOLVED;
import static org.apache.hertzbeat.common.constants.CommonConstants.TAG_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.TAG_METRIC;
import static org.apache.hertzbeat.common.constants.CommonConstants.TAG_METRICS;
import static org.apache.hertzbeat.common.constants.CommonConstants.TAG_MONITOR_APP;
import static org.apache.hertzbeat.common.constants.CommonConstants.TAG_MONITOR_ID;
import static org.apache.hertzbeat.common.constants.CommonConstants.TAG_MONITOR_NAME;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.jexl3.JexlException;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.dao.AlertMonitorDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.TagItem;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.support.event.MonitorDeletedEvent;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JexlExpressionRunner;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.springframework.context.event.EventListener;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

/**
 * Calculate alarms based on the alarm definition rules and collected data
 */
@Component
@Slf4j
public class CalculateAlarm {

    private static final String SYSTEM_VALUE_ROW_COUNT = "system_value_row_count";
    
    private static final int CALCULATE_THREADS = 3;

    /**
     * The alarm in the process is triggered
     * key - monitorId+alertDefineId+tags ｜ The alarm is a common threshold alarm
     * key - monitorId ｜ Indicates the monitoring status availability reachability alarm
     */
    private final Map<String, Alert> triggeredAlertMap;
    /**
     * The not recover alert
     * key - monitorId + alertDefineId + tags
     */
    private final Map<String, Alert> notRecoveredAlertMap;
    private final AlerterWorkerPool workerPool;
    private final CommonDataQueue dataQueue;
    private final AlertDefineService alertDefineService;
    private final AlarmCommonReduce alarmCommonReduce;
    private ResourceBundle bundle;
    private final AlertService alertService;

    public CalculateAlarm(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                          AlertDefineService alertDefineService, AlertMonitorDao monitorDao,
                          AlarmCommonReduce alarmCommonReduce, AlertService alertService) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.alarmCommonReduce = alarmCommonReduce;
        this.alertDefineService = alertDefineService;
        this.alertService = alertService;
        this.bundle = ResourceBundleUtil.getBundle("alerter");
        this.triggeredAlertMap = new ConcurrentHashMap<>(16);
        this.notRecoveredAlertMap = new ConcurrentHashMap<>(16);
        // Initialize stateAlertMap
        List<Monitor> monitors = monitorDao.findMonitorsByStatus(CommonConstants.MONITOR_DOWN_CODE);
        if (monitors != null) {
            for (Monitor monitor : monitors) {
                HashMap<String, String> tags = new HashMap<>(8);
                tags.put(TAG_MONITOR_ID, String.valueOf(monitor.getId()));
                tags.put(TAG_MONITOR_NAME, monitor.getName());
                tags.put(TAG_MONITOR_APP, monitor.getApp());
                this.notRecoveredAlertMap.put(monitor.getId() + CommonConstants.AVAILABILITY,
                        Alert.builder().tags(tags).target(CommonConstants.AVAILABILITY).status(ALERT_STATUS_CODE_PENDING).build());
            }
        }
        startCalculate();
    }

    private void startCalculate() {
        Runnable runnable = () -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = dataQueue.pollMetricsDataToAlerter();
                    if (metricsData != null) {
                        calculate(metricsData);
                    }
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
        long monitorId = metricsData.getId();
        String app = metricsData.getApp();
        if (app.startsWith(CommonConstants.PROMETHEUS_APP_PREFIX)) {
            app = CommonConstants.PROMETHEUS;
        }
        String metrics = metricsData.getMetrics();
        // If the metrics whose scheduling priority is 0 has the status of collecting response data UN_REACHABLE/UN_CONNECTABLE,
        // the highest severity alarm is generated to monitor the status change
        if (metricsData.getPriority() == 0) {
            handlerAvailableMetrics(monitorId, app, metricsData);
        }
        // Query the alarm definitions associated with the metrics of the monitoring type
        // field - define[]
        Map<String, List<AlertDefine>> defineMap = alertDefineService.getMonitorBindAlertDefines(monitorId, app, metrics);
        if (defineMap.isEmpty()) {
            return;
        }
        List<CollectRep.Field> fields = metricsData.getFieldsList();
        Map<String, Object> fieldValueMap = new HashMap<>(8);
        int valueRowCount = metricsData.getValuesCount();
        for (Map.Entry<String, List<AlertDefine>> entry : defineMap.entrySet()) {
            List<AlertDefine> defines = entry.getValue();
            for (AlertDefine define : defines) {
                final String expr = define.getExpr();
                if (StringUtils.isBlank(expr)) {
                    continue;
                }
                if (expr.contains(SYSTEM_VALUE_ROW_COUNT) && metricsData.getValuesCount() == 0) {
                    fieldValueMap.put(SYSTEM_VALUE_ROW_COUNT, valueRowCount);
                    try {
                        boolean match = execAlertExpression(fieldValueMap, expr);
                        try {
                            if (match) {
                                // If the threshold rule matches, the number of times the threshold has been triggered is determined and an alarm is triggered
                                afterThresholdRuleMatch(currentTimeMilli, monitorId, app, metrics, "", fieldValueMap, define);
                                // if the threshold is triggered, ignore other data rows
                                continue;
                            } else {
                                String alarmKey = String.valueOf(monitorId) + define.getId();
                                triggeredAlertMap.remove(alarmKey);
                                if (define.isRecoverNotice()) {
                                    handleRecoveredAlert(currentTimeMilli, define, expr, alarmKey);
                                }
                            }
                        } catch (Exception e) {
                            log.error(e.getMessage(), e);
                        }
                    } catch (Exception ignored) {}
                }
                for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {

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
                                // If the threshold rule matches, the number of times the threshold has been triggered is determined and an alarm is triggered
                                afterThresholdRuleMatch(currentTimeMilli, monitorId, app, metrics, tagBuilder.toString(), fieldValueMap, define);
                            } else {
                                String alarmKey = String.valueOf(monitorId) + define.getId() + tagBuilder;
                                triggeredAlertMap.remove(alarmKey);
                                if (define.isRecoverNotice()) {
                                    handleRecoveredAlert(currentTimeMilli, define, expr, alarmKey);
                                }
                            }
                        } catch (Exception e) {
                            log.error(e.getMessage(), e);
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
    }

    private void handleRecoveredAlert(long currentTimeMilli, AlertDefine define, String expr, String alarmKey) {
        Alert notResolvedAlert = notRecoveredAlertMap.remove(alarmKey);
        if (notResolvedAlert != null) {
            // Sending an alarm Restore
            Map<String, String> tags = notResolvedAlert.getTags();
            String content = this.bundle.getString("alerter.alarm.recover") + " : " + expr;
            Alert resumeAlert = Alert.builder()
                    .tags(tags)
                    .target(define.getApp() + "." + define.getMetric() + "." + define.getField())
                    .content(content)
                    .priority(CommonConstants.ALERT_PRIORITY_CODE_WARNING)
                    .status(CommonConstants.ALERT_STATUS_CODE_RESTORED)
                    .firstAlarmTime(currentTimeMilli)
                    .lastAlarmTime(notResolvedAlert.getLastAlarmTime())
                    .triggerTimes(1)
                    .build();
            alarmCommonReduce.reduceAndSendAlarm(resumeAlert);
        }
    }

    private void afterThresholdRuleMatch(long currentTimeMilli, long monitorId, String app, String metrics, String tagStr,
                                         Map<String, Object> fieldValueMap, AlertDefine define) {
        String alarmKey = String.valueOf(monitorId) + define.getId() + tagStr;
        Alert triggeredAlert = triggeredAlertMap.get(alarmKey);
        if (triggeredAlert != null) {
            int times = triggeredAlert.getTriggerTimes() + 1;
            triggeredAlert.setTriggerTimes(times);
            triggeredAlert.setFirstAlarmTime(currentTimeMilli);
            triggeredAlert.setLastAlarmTime(currentTimeMilli);
            int defineTimes = define.getTimes() == null ? 1 : define.getTimes();
            if (times >= defineTimes) {
                triggeredAlert.setStatus(ALERT_STATUS_CODE_PENDING);
                triggeredAlertMap.remove(alarmKey);
                notRecoveredAlertMap.put(alarmKey, triggeredAlert);
                alarmCommonReduce.reduceAndSendAlarm(triggeredAlert.clone());
            }
        } else {
            fieldValueMap.put(TAG_MONITOR_APP, app);
            fieldValueMap.put(TAG_METRICS, metrics);
            fieldValueMap.put(TAG_METRIC, define.getField());
            Map<String, String> tags = new HashMap<>(8);
            tags.put(TAG_MONITOR_ID, String.valueOf(monitorId));
            tags.put(TAG_MONITOR_APP, app);
            tags.put(CommonConstants.TAG_THRESHOLD_ID, String.valueOf(define.getId()));
            if (!CollectionUtils.isEmpty(define.getTags())) {
                for (TagItem tagItem : define.getTags()) {
                    fieldValueMap.put(tagItem.getName(), tagItem.getValue());
                    tags.put(tagItem.getName(), tagItem.getValue());
                }
            }
            Alert alert = Alert.builder()
                    .tags(tags)
                    .priority(define.getPriority())
                    .status(ALERT_STATUS_CODE_NOT_REACH)
                    .target(app + "." + metrics + "." + define.getField())
                    .triggerTimes(1)
                    .firstAlarmTime(currentTimeMilli)
                    .lastAlarmTime(currentTimeMilli)
                    // Keyword matching and substitution in the template
                    .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                    .build();
            int defineTimes = define.getTimes() == null ? 1 : define.getTimes();
            if (1 >= defineTimes) {
                alert.setStatus(ALERT_STATUS_CODE_PENDING);
                notRecoveredAlertMap.put(alarmKey, alert);
                alarmCommonReduce.reduceAndSendAlarm(alert.clone());
            } else {
                triggeredAlertMap.put(alarmKey, alert);
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

    private void handlerAvailableMetrics(long monitorId, String app, CollectRep.MetricsData metricsData) {
        if (metricsData.getCode() == CollectRep.Code.TIMEOUT) {
            return;
        }
        // TODO CACHE getMonitorBindAlertAvaDefine
        AlertDefine avaAlertDefine = alertDefineService.getMonitorBindAlertAvaDefine(monitorId, app, CommonConstants.AVAILABILITY);
        if (avaAlertDefine == null) {
            return;
        }
        long currentTimeMill = System.currentTimeMillis();
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            Alert preAlert = triggeredAlertMap.get(String.valueOf(monitorId));
            Map<String, String> tags = new HashMap<>(6);
            tags.put(TAG_MONITOR_ID, String.valueOf(monitorId));
            tags.put(TAG_MONITOR_APP, app);
            tags.put(CommonConstants.TAG_THRESHOLD_ID, String.valueOf(avaAlertDefine.getId()));
            tags.put(TAG_METRICS, CommonConstants.AVAILABILITY);
            tags.put(TAG_CODE, metricsData.getCode().name());
            Map<String, Object> valueMap = tags.entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

            if (!CollectionUtils.isEmpty(avaAlertDefine.getTags())) {
                for (TagItem tagItem : avaAlertDefine.getTags()) {
                    valueMap.put(tagItem.getName(), tagItem.getValue());
                    tags.put(tagItem.getName(), tagItem.getValue());
                }
            }
            if (preAlert == null) {
                Alert.AlertBuilder alertBuilder = Alert.builder()
                        .tags(tags)
                        .priority(avaAlertDefine.getPriority())
                        .status(ALERT_STATUS_CODE_NOT_REACH)
                        .target(CommonConstants.AVAILABILITY)
                        .content(AlertTemplateUtil.render(avaAlertDefine.getTemplate(), valueMap))
                        .firstAlarmTime(currentTimeMill)
                        .lastAlarmTime(currentTimeMill)
                        .triggerTimes(1);
                if (avaAlertDefine.getTimes() == null || avaAlertDefine.getTimes() <= 1) {
                    String notResolvedAlertKey = monitorId + CommonConstants.AVAILABILITY;
                    alertBuilder.status(ALERT_STATUS_CODE_PENDING);
                    notRecoveredAlertMap.put(notResolvedAlertKey, alertBuilder.build());
                    alarmCommonReduce.reduceAndSendAlarm(alertBuilder.build());
                } else {
                    triggeredAlertMap.put(String.valueOf(monitorId), alertBuilder.build());
                }
            } else {
                int times = preAlert.getTriggerTimes() + 1;
                preAlert.setTriggerTimes(times);
                preAlert.setFirstAlarmTime(currentTimeMill);
                preAlert.setLastAlarmTime(currentTimeMill);
                int defineTimes = avaAlertDefine.getTimes() == null ? 1 : avaAlertDefine.getTimes();
                if (times >= defineTimes) {
                    preAlert.setStatus(ALERT_STATUS_CODE_PENDING);
                    String notResolvedAlertKey = monitorId + CommonConstants.AVAILABILITY;
                    notRecoveredAlertMap.put(notResolvedAlertKey, preAlert.clone());
                    alarmCommonReduce.reduceAndSendAlarm(preAlert.clone());
                    triggeredAlertMap.remove(String.valueOf(monitorId));
                }
            }
        } else {
            // Check whether an availability or unreachable alarm is generated before the association monitoring
            // and send a clear alarm to clear the monitoring status
            triggeredAlertMap.remove(String.valueOf(monitorId));
            String notResolvedAlertKey = monitorId + CommonConstants.AVAILABILITY;
            Alert notResolvedAlert = notRecoveredAlertMap.remove(notResolvedAlertKey);
            if (notResolvedAlert != null) {
                // Sending an alarm Restore
                Map<String, String> tags = notResolvedAlert.getTags();
                if (!avaAlertDefine.isRecoverNotice()) {
                    tags.put(CommonConstants.IGNORE, CommonConstants.IGNORE);
                }
                String content = this.bundle.getString("alerter.availability.recover");
                Alert resumeAlert = Alert.builder()
                        .tags(tags)
                        .target(CommonConstants.AVAILABILITY)
                        .content(content)
                        .priority(CommonConstants.ALERT_PRIORITY_CODE_WARNING)
                        .status(CommonConstants.ALERT_STATUS_CODE_RESTORED)
                        .firstAlarmTime(currentTimeMill)
                        .lastAlarmTime(notResolvedAlert.getLastAlarmTime())
                        .triggerTimes(1)
                        .build();
                alarmCommonReduce.reduceAndSendAlarm(resumeAlert);
                Runnable updateStatusJob = () -> {
                    // todo update pre all type alarm status
                    updateAvailabilityAlertStatus(monitorId, resumeAlert);
                };
                workerPool.executeJob(updateStatusJob);
            }
        }
    }

    private void updateAvailabilityAlertStatus(long monitorId, Alert restoreAlert) {
        List<Alert> availabilityAlerts = queryAvailabilityAlerts(monitorId, restoreAlert);
        availabilityAlerts.stream().parallel().forEach(alert -> {
            log.info("updating alert status solved id: {}", alert.getId());
            alertService.editAlertStatus(ALERT_STATUS_CODE_SOLVED, List.of(alert.getId()));
        });
    }

    private List<Alert> queryAvailabilityAlerts(long monitorId, Alert restoreAlert) {
        //create query condition
        Specification<Alert> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();

            Predicate predicateTags = criteriaBuilder.like(root.get("tags").as(String.class), "%" + monitorId + "%");
            andList.add(predicateTags);

            Predicate predicatePriority = criteriaBuilder.equal(root.get("priority"), CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY);
            andList.add(predicatePriority);

            Predicate predicateStatus = criteriaBuilder.equal(root.get("status"), ALERT_STATUS_CODE_PENDING);
            andList.add(predicateStatus);

            Predicate predicateAlertTime = criteriaBuilder.lessThanOrEqualTo(root.get("lastAlarmTime"), restoreAlert.getLastAlarmTime());
            andList.add(predicateAlertTime);

            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };

        //query results
        return alertService.getAlerts(specification);
    }

    @EventListener(SystemConfigChangeEvent.class)
    public void onSystemConfigChangeEvent(SystemConfigChangeEvent event) {
        log.info("calculate alarm receive system config change event: {}.", event.getSource());
        this.bundle = ResourceBundleUtil.getBundle("alerter");
    }

    @EventListener(MonitorDeletedEvent.class)
    public void onMonitorDeletedEvent(MonitorDeletedEvent event) {
        log.info("calculate alarm receive monitor {} has been deleted.", event.getMonitorId());
        this.triggeredAlertMap.remove(String.valueOf(event.getMonitorId()));
    }

}
