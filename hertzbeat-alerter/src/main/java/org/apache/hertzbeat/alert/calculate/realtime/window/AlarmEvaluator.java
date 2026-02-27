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

package org.apache.hertzbeat.alert.calculate.realtime.window;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.springframework.stereotype.Component;

import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.log.LogEntry;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * Alarm Evaluator - Final alarm logic trigger
 * Responsible for:
 * 1. Receiving closed window data from WindowAggregator
 * 2. Applying alert logic (count threshold, alert mode)
 * 3. Generating individual alerts or alert groups
 * 4. Sending alerts to AlarmCommonReduce
 */
@Component
@Slf4j
public class AlarmEvaluator {

    private static final String WINDOW_START_TIME = "window_start_time";
    private static final String WINDOW_END_TIME = "window_end_time";
    private static final String MATCHING_LOGS_COUNT = "matching_logs_count";
    
    private final AlarmCommonReduce alarmCommonReduce;
    private ThreadPoolExecutor workerExecutor;
    
    public AlarmEvaluator(AlarmCommonReduce alarmCommonReduce) {
        this.alarmCommonReduce = alarmCommonReduce;
        initAlarmEvaluator();
    }

    public void initAlarmEvaluator() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("alerter-reduce-worker has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("alerter-reduce-worker-%d")
                .build();
        workerExecutor = new ThreadPoolExecutor(2,
                10,
                10,
                TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    public void sendAndProcessWindowData(WindowAggregator.WindowData windowData) {
        workerExecutor.execute(processWindowData(windowData));
    }
    
    private Runnable processWindowData(WindowAggregator.WindowData windowData) {
        return () -> {
            AlertDefine alertDefine = windowData.getAlertDefine();
            List<MatchingLogEvent> matchingLogs = windowData.getMatchingLogs();

            if (matchingLogs.isEmpty()) {
                return;
            }

            // Check if count threshold is met
            int requiredTimes = alertDefine.getTimes() != null ? alertDefine.getTimes() : 1;
            if (matchingLogs.size() < requiredTimes) {
                log.debug("Window {} has {} matching logs, but requires {} times",
                        windowData.getWindowKey(), matchingLogs.size(), requiredTimes);
                return;
            }

            // Determine alert mode from configuration
            String alertMode = getAlertMode(alertDefine);

            long currentTime = System.currentTimeMillis();

            switch (alertMode) {
                case CommonConstants.ALERT_MODE_INDIVIDUAL:
                    // Generate individual alerts for each matching log
                    for (MatchingLogEvent matchingLog : matchingLogs) {
                        generateIndividualAlert(matchingLog, currentTime);
                    }
                    break;

                case CommonConstants.ALERT_MODE_GROUP:
                    // Generate a single alert group for all matching logs
                    generateGroupAlert(windowData, matchingLogs, currentTime);
                    break;
                default:
                    log.warn("Unknown alert mode for define {}: {}", alertDefine.getName(), alertMode);
            }
        };
    }
    
    private void generateIndividualAlert(MatchingLogEvent matchingLog, long currentTime) {
        AlertDefine define = matchingLog.getAlertDefine();
        LogEntry logEntry = matchingLog.getLogEntry();

        Map<String, String> alertLabels = new HashMap<>(8);

        // Create fingerprints for group alert
        Map<String, String> commonFingerPrints = createCommonFingerprints(define);
        alertLabels.putAll(commonFingerPrints);
        // add the log data to commonFingerPrints
        addLogEntryToMap(logEntry, alertLabels);

        Map<String, Object> fieldValueMap = createFieldValueMap(logEntry, define);
        Map<String, String> alertAnnotations = createAlertAnnotations(define, fieldValueMap);
        // Create and send group alert
        SingleAlert alert = SingleAlert.builder()
                .labels(alertLabels)
                .annotations(alertAnnotations)
                .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .triggerTimes(1)
                .startAt(currentTime)
                .activeAt(currentTime)
                .build();
        
        alarmCommonReduce.reduceAndSendAlarm(alert.clone());
        
        log.debug("Generated individual alert for define: {}", define.getName());
    }
    
    private void generateGroupAlert(WindowAggregator.WindowData windowData, 
                                   List<MatchingLogEvent> matchingLogs, long currentTime) {

        List<SingleAlert> alerts = new ArrayList<>(matchingLogs.size());
        AlertDefine define = windowData.getAlertDefine();
        
        // Create fingerprints for group alert
        Map<String, String> commonFingerPrints = createCommonFingerprints(define);
        
        // Add window information to fingerprints
        commonFingerPrints.put(WINDOW_START_TIME, String.valueOf(windowData.getStartTime()));
        commonFingerPrints.put(WINDOW_END_TIME, String.valueOf(windowData.getEndTime()));
        commonFingerPrints.put(CommonConstants.ALERT_MODE_LABEL, CommonConstants.ALERT_MODE_GROUP);
        commonFingerPrints.put(MATCHING_LOGS_COUNT, String.valueOf(matchingLogs.size()));

        for (MatchingLogEvent event: matchingLogs) {
            LogEntry logEntry = event.getLogEntry();

            Map<String, String> alertLabels = new HashMap<>(8);

            alertLabels.putAll(commonFingerPrints);
            // add the log data to commonFingerPrints
            addLogEntryToMap(logEntry, alertLabels);

            Map<String, Object> fieldValueMap = createFieldValueMap(logEntry, define);
            Map<String, String> alertAnnotations = createAlertAnnotations(define, fieldValueMap);
            // Create and send group alert
            SingleAlert alert = SingleAlert.builder()
                    .labels(alertLabels)
                    .annotations(alertAnnotations)
                    .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                    .status(CommonConstants.ALERT_STATUS_FIRING)
                    .triggerTimes(matchingLogs.size())
                    .startAt(currentTime)
                    .activeAt(currentTime)
                    .build();
            alerts.add(alert.clone());
        }
        alarmCommonReduce.reduceAndSendAlarmGroup(commonFingerPrints, alerts);
        
        log.debug("Generated group alert for define: {} with {} matching logs", 
                 define.getName(), matchingLogs.size());
    }
    
    private String getAlertMode(AlertDefine alertDefine) {
        String mode = null;
        if (alertDefine.getLabels() != null) {
            mode = alertDefine.getLabels().get(CommonConstants.ALERT_MODE_LABEL);
        }
        if (mode == null || mode.isEmpty()) {
            return CommonConstants.ALERT_MODE_GROUP; // Default to group mode if not specified
        } else {
            return mode;
        }
    }
    
    private Map<String, String> createCommonFingerprints(AlertDefine define) {
        Map<String, String> fingerprints = new HashMap<>(8);
        fingerprints.put(CommonConstants.LABEL_ALERT_NAME, define.getName());
        fingerprints.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(define.getId()));
        
        if (define.getLabels() != null) {
            fingerprints.putAll(define.getLabels());
        }
        
        return fingerprints;
    }

    private Map<String, Object> createFieldValueMap(LogEntry logEntry, AlertDefine define) {
        Map<String, Object> fieldValueMap = new HashMap<>(8);
        fieldValueMap.put("log", logEntry);
        
        if (define.getLabels() != null) {
            fieldValueMap.putAll(define.getLabels());
        }
        
        return fieldValueMap;
    }
    
    private Map<String, String> createAlertAnnotations(AlertDefine define, Map<String, Object> fieldValueMap) {
        Map<String, String> annotations = new HashMap<>(8);
        
        if (define.getAnnotations() != null) {
            for (Map.Entry<String, String> entry : define.getAnnotations().entrySet()) {
                annotations.put(entry.getKey(), 
                               AlertTemplateUtil.render(entry.getValue(), fieldValueMap));
            }
        }
        
        return annotations;
    }

    /**
     * Add the content from LogEntry object (except timestamp) to commonFingerPrints
     *
     * @param logEntry log entry object
     * @param context context
     */
    private void addLogEntryToMap(LogEntry logEntry, Map<String, String> context) {
        // Add basic fields
        if (logEntry.getSeverityNumber() != null) {
            context.put("severityNumber", String.valueOf(logEntry.getSeverityNumber()));
        }
        if (logEntry.getSeverityText() != null) {
            context.put("severityText", logEntry.getSeverityText());
        }
        if (logEntry.getBody() != null) {
            context.put("body", String.valueOf(logEntry.getBody()));
        }
        if (logEntry.getDroppedAttributesCount() != null) {
            context.put("droppedAttributesCount", String.valueOf(logEntry.getDroppedAttributesCount()));
        }
        if (logEntry.getTraceId() != null) {
            context.put("traceId", logEntry.getTraceId());
        }
        if (logEntry.getSpanId() != null) {
            context.put("spanId", logEntry.getSpanId());
        }
        if (logEntry.getTraceFlags() != null) {
            context.put("traceFlags", String.valueOf(logEntry.getTraceFlags()));
        }

        // Add attributes
        if (logEntry.getAttributes() != null && !logEntry.getAttributes().isEmpty()) {
            for (Map.Entry<String, Object> entry : logEntry.getAttributes().entrySet()) {
                if (entry.getValue() != null) {
                    context.put("attr_" + entry.getKey(), String.valueOf(entry.getValue()));
                }
            }
        }

        // Add resource
        if (logEntry.getResource() != null && !logEntry.getResource().isEmpty()) {
            for (Map.Entry<String, Object> entry : logEntry.getResource().entrySet()) {
                if (entry.getValue() != null) {
                    context.put("resource_" + entry.getKey(), String.valueOf(entry.getValue()));
                }
            }
        }

        // Add instrumentationScope
        if (logEntry.getInstrumentationScope() != null) {
            LogEntry.InstrumentationScope scope = logEntry.getInstrumentationScope();
            if (scope.getName() != null) {
                context.put("scope_name", scope.getName());
            }
            if (scope.getVersion() != null) {
                context.put("scope_version", scope.getVersion());
            }
            if (scope.getDroppedAttributesCount() != null) {
                context.put("scope_droppedAttributesCount", String.valueOf(scope.getDroppedAttributesCount()));
            }
            if (scope.getAttributes() != null && !scope.getAttributes().isEmpty()) {
                for (Map.Entry<String, Object> entry : scope.getAttributes().entrySet()) {
                    if (entry.getValue() != null) {
                        context.put("scope_attr_" + entry.getKey(), String.valueOf(entry.getValue()));
                    }
                }
            }
        }
    }
}