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

package com.usthe.alert.calculate;

import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.Expression;
import com.usthe.alert.AlerterProperties;
import com.usthe.alert.AlerterWorkerPool;
import com.usthe.common.queue.CommonDataQueue;
import com.usthe.alert.dao.AlertMonitorDao;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.alerter.AlertDefine;
import com.usthe.alert.service.AlertDefineService;
import com.usthe.alert.util.AlertTemplateUtil;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import com.usthe.common.util.ResourceBundleUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Calculate alarms based on the alarm definition rules and collected data
 * 根据告警定义规则和采集数据匹配计算告警
 * @author tom
 * @date 2021/12/9 14:19
 */
@Configuration
@Slf4j
public class CalculateAlarm {

    /**
     * The alarm in the process is triggered
     * 触发中告警信息
     * key - monitorId+alertDefineId 为普通阈值告警 ｜ The alarm is a common threshold alarm
     * key - monitorId 为监控状态可用性可达性告警 ｜ Indicates the monitoring status availability reachability alarm
     */
    public Map<String, Alert> triggeredAlertMap;

    private AlerterWorkerPool workerPool;
    private CommonDataQueue dataQueue;
    private AlertDefineService alertDefineService;
    private AlerterProperties alerterProperties;
    private ResourceBundle bundle;

    public CalculateAlarm (AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                           AlertDefineService alertDefineService, AlertMonitorDao monitorDao,
                           AlerterProperties alerterProperties) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.alertDefineService = alertDefineService;
        this.alerterProperties = alerterProperties;
        this.bundle = ResourceBundleUtil.getBundle("alerter");
        this.triggeredAlertMap = new ConcurrentHashMap<>(128);
        // Initialize stateAlertMap
        // 初始化stateAlertMap
        List<Monitor> monitors = monitorDao.findMonitorsByStatusIn(Arrays.asList(CommonConstants.UN_AVAILABLE_CODE,
                CommonConstants.UN_REACHABLE_CODE));
        if (monitors != null) {
            for (Monitor monitor : monitors) {
                Map<String, String> tags = new HashMap<>(6);
                tags.put(CommonConstants.TAG_MONITOR_ID, String.valueOf(monitor.getId()));
                tags.put(CommonConstants.TAG_MONITOR_APP, monitor.getApp());
                Alert.AlertBuilder alertBuilder = Alert.builder()
                        .tags(tags)
                        .priority(CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY)
                        .status(CommonConstants.ALERT_STATUS_CODE_PENDING)
                        .target(CommonConstants.AVAILABLE)
                        .content(this.bundle.getString("alerter.availability.emergency") + ": " + CollectRep.Code.UN_AVAILABLE.name())
                        .firstTriggerTime(System.currentTimeMillis())
                        .lastTriggerTime(System.currentTimeMillis())
                        .nextEvalInterval(0L)
                        .times(0);
                if (monitor.getStatus() == CommonConstants.UN_REACHABLE_CODE) {
                    alertBuilder
                            .target(CommonConstants.REACHABLE)
                            .content(this.bundle.getString("alerter.reachability.emergency") + ": " + CollectRep.Code.UN_REACHABLE.name());
                }
                this.triggeredAlertMap.put(String.valueOf(monitor.getId()), alertBuilder.build());
            }
        }
        startCalculate();
    }

    private void startCalculate() {
        Runnable runnable = () -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = dataQueue.pollAlertMetricsData();
                    if (metricsData != null) {
                        calculate(metricsData);
                    }
                } catch (InterruptedException e) {
                    log.error(e.getMessage());
                }
            }
        };
        workerPool.executeJob(runnable);
        workerPool.executeJob(runnable);
        workerPool.executeJob(runnable);
    }

    private void calculate(CollectRep.MetricsData metricsData) {
        long currentTimeMilli = System.currentTimeMillis();
        long monitorId = metricsData.getId();
        String app = metricsData.getApp();
        String metrics = metricsData.getMetrics();
        // If the indicator group whose scheduling priority is 0 has the status of collecting response data UN_REACHABLE/UN_CONNECTABLE, the highest severity alarm is generated to monitor the status change
        // 先判断调度优先级为0的指标组采集响应数据状态 UN_REACHABLE/UN_CONNECTABLE 则需发最高级别告警进行监控状态变更
        if (metricsData.getPriority() == 0) {
            if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
                // Collection and abnormal
                // 采集异常
                if (metricsData.getCode() == CollectRep.Code.UN_AVAILABLE) {
                    // The todo collector is unavailable
                    // todo 采集器不可用
                } else if (metricsData.getCode() == CollectRep.Code.UN_REACHABLE) {
                    // UN_REACHABLE Peer unreachable (Network layer icmp)
                    // UN_REACHABLE 对端不可达(网络层icmp)
                    handlerMonitorStatusAlert(String.valueOf(monitorId), app, metricsData.getCode());
                } else if (metricsData.getCode() == CollectRep.Code.UN_CONNECTABLE) {
                    // UN_CONNECTABLE Peer connection failure (transport layer tcp,udp)
                    // UN_CONNECTABLE 对端连接失败(传输层tcp,udp)
                    handlerMonitorStatusAlert(String.valueOf(monitorId), app, metricsData.getCode());
                } else {
                    // Other exceptions
                    // 其他异常
                    handlerMonitorStatusAlert(String.valueOf(monitorId), app, metricsData.getCode());
                }
                return;
            } else {
                // Check whether an availability or unreachable alarm is generated before the association monitoring, and send a clear alarm to clear the monitoring status
                // 判断关联监控之前是否有可用性或者不可达告警,发送恢复告警进行监控状态恢复
                Alert preAlert = triggeredAlertMap.remove(String.valueOf(monitorId));
                if (preAlert != null && preAlert.getStatus() == CommonConstants.ALERT_STATUS_CODE_PENDING) {
                    // Sending an alarm cleared
                    // 发送告警恢复
                    Map<String, String> tags = new HashMap<>(6);
                    tags.put(CommonConstants.TAG_MONITOR_ID, String.valueOf(monitorId));
                    tags.put(CommonConstants.TAG_MONITOR_APP, app);
                    String target = CommonConstants.AVAILABLE;
                    String content = this.bundle.getString("alerter.availability.resolved");
                    if (CommonConstants.REACHABLE.equals(preAlert.getTarget())) {
                        target = CommonConstants.REACHABLE;
                        content = this.bundle.getString("alerter.reachability.resolved");
                    }
                    Alert resumeAlert = Alert.builder()
                            .tags(tags)
                            .target(target)
                            .content(content)
                            .priority(CommonConstants.ALERT_PRIORITY_CODE_WARNING)
                            .status(CommonConstants.ALERT_STATUS_CODE_RESTORED)
                            .firstTriggerTime(currentTimeMilli)
                            .lastTriggerTime(currentTimeMilli)
                            .times(1)
                            .build();
                    dataQueue.addAlertData(resumeAlert);
                }
            }
        }
        // Query the alarm definitions associated with the indicator set of the monitoring type
        // 查出此监控类型下的此指标集合下关联配置的告警定义信息
        // field - define[]
        Map<String, List<AlertDefine>> defineMap = alertDefineService.getMonitorBindAlertDefines(monitorId, app, metrics);
        if (defineMap == null || defineMap.isEmpty()) {
            return;
        }
        List<CollectRep.Field> fields = metricsData.getFieldsList();
        Map<String, Object> fieldValueMap = new HashMap<>(16);
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            if (!valueRow.getColumnsList().isEmpty()) {
                fieldValueMap.clear();
                String instance = valueRow.getInstance();
                if (!"".equals(instance)) {
                    fieldValueMap.put("instance", instance);
                }
                for (int index = 0; index < valueRow.getColumnsList().size(); index++) {
                    String valueStr = valueRow.getColumns(index);
                    CollectRep.Field field = fields.get(index);
                    if (field.getType() == CommonConstants.TYPE_NUMBER) {
                        Double doubleValue = CommonUtil.parseStrDouble(valueStr);
                        if (doubleValue != null) {
                            fieldValueMap.put(field.getName(), doubleValue);
                        }
                    } else {
                        if (!"".equals(valueStr)) {
                            fieldValueMap.put(field.getName(), valueStr);
                        }
                    }
                }
                for (Map.Entry<String, List<AlertDefine>> entry : defineMap.entrySet()) {
                    List<AlertDefine> defines = entry.getValue();
                    for (AlertDefine define : defines) {
                        String expr = define.getExpr();
                        try {
                            Expression expression = AviatorEvaluator.compile(expr, true);
                            Boolean match = (Boolean) expression.execute(fieldValueMap);
                            if (match != null && match) {
                                // If the threshold rule matches, the number of times the threshold has been triggered is determined and an alarm is triggered
                                // 阈值规则匹配，判断已触发阈值次数，触发告警
                                String monitorAlertKey = String.valueOf(monitorId) + define.getId();
                                Alert triggeredAlert = triggeredAlertMap.get(monitorAlertKey);
                                if (triggeredAlert != null) {
                                    int times = triggeredAlert.getTimes() + 1;
                                    triggeredAlert.setTimes(times);
                                    triggeredAlert.setLastTriggerTime(currentTimeMilli);
                                    int defineTimes = define.getTimes() == null ? 0 : define.getTimes();
                                    if (times >= defineTimes) {
                                        triggeredAlertMap.remove(monitorAlertKey);
                                        dataQueue.addAlertData(triggeredAlert);
                                    }
                                } else {
                                    int times = 1;
                                    fieldValueMap.put("app", app);
                                    fieldValueMap.put("metrics", metrics);
                                    fieldValueMap.put("metric", define.getField());
                                    Map<String, String> tags = new HashMap<>(6);
                                    tags.put(CommonConstants.TAG_MONITOR_ID, String.valueOf(monitorId));
                                    tags.put(CommonConstants.TAG_MONITOR_APP, app);
                                    Alert alert = Alert.builder()
                                            .tags(tags)
                                            .alertDefineId(define.getId())
                                            .priority(define.getPriority())
                                            .status(CommonConstants.ALERT_STATUS_CODE_PENDING)
                                            .target(app + "." + metrics + "." + define.getField())
                                            .times(times)
                                            .firstTriggerTime(currentTimeMilli)
                                            .lastTriggerTime(currentTimeMilli)
                                            // Keyword matching and substitution in the template
                                            // 模板中关键字匹配替换
                                            .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                                            .build();
                                    int defineTimes = define.getTimes() == null ? 0 : define.getTimes();
                                    if (times >= defineTimes) {
                                        dataQueue.addAlertData(alert);
                                    } else {
                                        triggeredAlertMap.put(monitorAlertKey, alert);
                                    }
                                }
                                // Threshold rules below this priority are ignored
                                // 此优先级以下的阈值规则则忽略
                                break;
                            }
                        } catch (Exception e) {
                            log.warn(e.getMessage());
                        }
                    }
                }

            }
        }
    }

    private void handlerMonitorStatusAlert(String monitorId, String app, CollectRep.Code code) {
        Alert preAlert = triggeredAlertMap.get(monitorId);
        long currentTimeMill = System.currentTimeMillis();
        if (preAlert == null) {
            Map<String, String> tags = new HashMap<>(6);
            tags.put(CommonConstants.TAG_MONITOR_ID, monitorId);
            tags.put(CommonConstants.TAG_MONITOR_APP, app);
            Alert.AlertBuilder alertBuilder = Alert.builder()
                    .tags(tags)
                    .priority(CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY)
                    .status(CommonConstants.ALERT_STATUS_CODE_PENDING)
                    .target(CommonConstants.AVAILABLE)
                    .content(this.bundle.getString("alerter.availability.emergency") + ": " + code.name())
                    .firstTriggerTime(currentTimeMill)
                    .lastTriggerTime(currentTimeMill)
                    .nextEvalInterval(alerterProperties.getAlertEvalIntervalBase())
                    .times(1);
            if (code == CollectRep.Code.UN_REACHABLE) {
                alertBuilder
                        .target(CommonConstants.REACHABLE)
                        .content(this.bundle.getString("alerter.reachability.emergency") + ": " + code.name());
            }
            if (alerterProperties.getSystemAlertTriggerTimes() > 1) {
                alertBuilder.nextEvalInterval(0L);
                alertBuilder.status(CommonConstants.ALERT_STATUS_CODE_NOT_REACH);
                Alert alert = alertBuilder.build();
                triggeredAlertMap.put(monitorId, alert);
            } else {
                Alert alert = alertBuilder.build();
                dataQueue.addAlertData(alert.clone());
                triggeredAlertMap.put(monitorId, alert);
            }
            return;
        }
        if (preAlert.getLastTriggerTime() + preAlert.getNextEvalInterval() >= currentTimeMill) {
            // Still in the silent period of the alarm evaluation interval
            // 还在告警评估时间间隔静默期
            preAlert.setTimes(preAlert.getTimes() + 1);
            triggeredAlertMap.put(monitorId, preAlert);
        } else {
            preAlert.setTimes(preAlert.getTimes() + 1);
            if (preAlert.getTimes() >= alerterProperties.getSystemAlertTriggerTimes()) {
                preAlert.setLastTriggerTime(currentTimeMill);
                long nextEvalInterval  = preAlert.getNextEvalInterval() * 2;
                if (preAlert.getNextEvalInterval() == 0L) {
                    nextEvalInterval = alerterProperties.getAlertEvalIntervalBase();
                }
                nextEvalInterval = Math.min(nextEvalInterval, alerterProperties.getMaxAlertEvalInterval());
                preAlert.setNextEvalInterval(nextEvalInterval);
                preAlert.setStatus(CommonConstants.ALERT_STATUS_CODE_PENDING);
                triggeredAlertMap.put(monitorId, preAlert);
                dataQueue.addAlertData(preAlert.clone());
            } else {
                triggeredAlertMap.put(monitorId, preAlert);
            }
        }
    }
}
