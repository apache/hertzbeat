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

package org.apache.hertzbeat.alert.calculate.periodic;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


/**
 * Log Periodic Alert Calculator
 */
@Slf4j
@Component
public class LogPeriodicAlertCalculator {
    
    private static final String ROWS = "__rows__";

    private final DataSourceService dataSourceService;
    private final AlarmCommonReduce alarmCommonReduce;


    public LogPeriodicAlertCalculator(DataSourceService dataSourceService, AlarmCommonReduce alarmCommonReduce) {
        this.alarmCommonReduce = alarmCommonReduce;
        this.dataSourceService = dataSourceService;
    }

    public void calculate(AlertDefine define) {
        if (!define.isEnable() || StringUtils.isEmpty(define.getExpr())) {
            log.error("Log define {} is disabled or expression is empty", define.getName());
            return;
        }
        try {
            doCalculate(define);
        } catch (Exception e) {
            log.error("Calculate periodic define {} failed: {}", define.getName(), e.getMessage());
        }
    }

    private void doCalculate(AlertDefine define) {
        try {
            // Log-based queries are SQL queries with log-specific expressions
            List<Map<String, Object>> results = dataSourceService.query(define.getDatasource(), define.getExpr());
            if (CollectionUtils.isEmpty(results)) {
                return;
            }
            afterThresholdRuleMatch(results, define);
        } catch (Exception ignored) {
            // Ignore the query exception eg: no result, timeout, etc
        }
    }

    String getAlertMode(AlertDefine alertDefine) {
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

    /**
     * Handle alert after threshold rule match
     */
    private void afterThresholdRuleMatch(List<Map<String, Object>> alertContext, AlertDefine define) {
        // Determine alert mode from configuration
        String alertMode = getAlertMode(define);

        long currentTime = System.currentTimeMillis();

        switch (alertMode) {
            case CommonConstants.ALERT_MODE_INDIVIDUAL:
                // Generate individual alerts for each matching log
                for (Map<String, Object> context : alertContext) {
                    generateIndividualAlert(define, context, currentTime);
                }
                break;

            case CommonConstants.ALERT_MODE_GROUP:
                // Generate a single alert group for all matching logs
                generateGroupAlert(define, alertContext, currentTime);
                break;
            default:
                log.warn("Unknown alert mode for define {}: {}", define.getName(), alertMode);
        }
    }

    private void generateIndividualAlert(AlertDefine define, Map<String, Object> context, long currentTime) {

        Map<String, String> alertLabels = new HashMap<>(8);

        Map<String, String> commonFingerPrints = createCommonFingerprints(define);
        alertLabels.putAll(commonFingerPrints);
        addContextToMap(context, alertLabels);

        Map<String, Object> fieldValueMap = createFieldValueMap(context, define);
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

    private void addContextToMap(Map<String, Object> context, Map<String, String> alertLabels) {
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            if (entry.getValue() != null) {
                alertLabels.put(entry.getKey(), entry.getValue().toString());
            }
        }
    }

    private void generateGroupAlert(AlertDefine define, List<Map<String, Object>> alertContext, long currentTime) {

        List<SingleAlert> alerts = new ArrayList<>(alertContext.size());

        // Create fingerprints for group alert
        Map<String, String> commonFingerPrints = createCommonFingerprints(define);

        // Add context information to fingerprints
        commonFingerPrints.put(ROWS, String.valueOf(alertContext.size()));
        commonFingerPrints.put(CommonConstants.ALERT_MODE_LABEL, CommonConstants.ALERT_MODE_GROUP);

        for (Map<String, Object> context : alertContext) {

            Map<String, String> alertLabels = new HashMap<>(8);

            alertLabels.putAll(commonFingerPrints);
            // add the context to commonFingerPrints
            addContextToMap(context, alertLabels);

            Map<String, Object> fieldValueMap = createFieldValueMap(context, define);
            Map<String, String> alertAnnotations = createAlertAnnotations(define, fieldValueMap);
            // Create and send group alert
            SingleAlert alert = SingleAlert.builder()
                    .labels(alertLabels)
                    .annotations(alertAnnotations)
                    .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                    .status(CommonConstants.ALERT_STATUS_FIRING)
                    .triggerTimes(alertContext.size())
                    .startAt(currentTime)
                    .activeAt(currentTime)
                    .build();
            alerts.add(alert.clone());
        }
        alarmCommonReduce.reduceAndSendAlarmGroup(commonFingerPrints, alerts);

        log.debug("Generated group alert for define: {} with {} matching data",
                define.getName(), alertContext.size());
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

    private Map<String, Object> createFieldValueMap(Map<String, Object> context, AlertDefine define) {
        Map<String, Object> fieldValueMap = new HashMap<>(8);
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            if (entry.getValue() != null) {
                fieldValueMap.put(entry.getKey(), entry.getValue().toString());
            }
        }
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

}