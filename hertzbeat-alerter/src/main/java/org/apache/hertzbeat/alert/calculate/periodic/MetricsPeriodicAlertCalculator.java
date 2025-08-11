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
import org.apache.hertzbeat.alert.calculate.AlarmCacheManager;
import org.apache.hertzbeat.alert.calculate.JexlExprCalculator;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Metrics Periodic Alert Calculator
 */
@Slf4j
@Component
public class MetricsPeriodicAlertCalculator {
    
    private static final String VALUE = "__value__";
    private static final String TIMESTAMP = "__timestamp__";

    private final DataSourceService dataSourceService;
    private final AlarmCommonReduce alarmCommonReduce;
    private final AlarmCacheManager alarmCacheManager;

    public MetricsPeriodicAlertCalculator(DataSourceService dataSourceService, AlarmCommonReduce alarmCommonReduce,
                                          AlarmCacheManager alarmCacheManager) {
        this.alarmCommonReduce = alarmCommonReduce;
        this.alarmCacheManager = alarmCacheManager;
        this.dataSourceService = dataSourceService;
    }

    /**
     * Calculate alerts for the given alert definition
     * @param define The alert definition to calculate
     */
    public void calculate(AlertDefine define) {
        if (!define.isEnable() || StringUtils.isEmpty(define.getExpr())) {
            log.error("Periodic define {} is disabled or expression is empty", define.getName());
            return;
        }

        long currentTimeMilli = System.currentTimeMillis();
        try {
            doCalculate(define, currentTimeMilli);
        } catch (Exception e) {
            log.error("Calculate periodic define {} failed: {}", define.getName(), e.getMessage());
        }
    }

    private void doCalculate(AlertDefine define, long currentTimeMilli) {
        try {
            List<Map<String, Object>> results = dataSourceService.calculate(
                define.getDatasource(),
                define.getExpr()
            );
            // If no match the expr threshold, the results item map {'value': null} should be null and others field keep
            // If results has multi list, should trigger multi alert
            if (CollectionUtils.isEmpty(results)) {
                return;
            }
            
            for (Map<String, Object> result : results) {
                Map<String, String> fingerPrints = new HashMap<>(8);
                // Here use the alert name as finger, not care the alert name may be changed
                fingerPrints.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(define.getId()));
                fingerPrints.put(CommonConstants.LABEL_ALERT_NAME, define.getName());
                fingerPrints.putAll(define.getLabels());
                for (Map.Entry<String, Object> entry : result.entrySet()) {
                    if (entry.getValue() != null && !VALUE.equals(entry.getKey())
                            && !TIMESTAMP.equals(entry.getKey())) {
                        fingerPrints.put(entry.getKey(), entry.getValue().toString());
                    }
                }
                
                if (result.get(VALUE) == null) {
                    // Recovery the alert
                    handleRecoveredAlert(define.getId(), fingerPrints);
                    continue;
                }
                
                Map<String, Object> fieldValueMap = new HashMap<>(8);
                fieldValueMap.putAll(define.getLabels());
                fieldValueMap.put(CommonConstants.LABEL_ALERT_NAME, define.getName());
                for (Map.Entry<String, Object> entry : result.entrySet()) {
                    if (entry.getValue() != null) {
                        fieldValueMap.put(entry.getKey(), entry.getValue());
                    }
                }
                afterThresholdRuleMatch(currentTimeMilli, fingerPrints, fieldValueMap, define);
            }
        } catch (Exception ignored) {
            // Ignore the query exception eg: no result, timeout, etc
        }
    }

    /**
     * Handle alert after threshold rule match
     */
    private void afterThresholdRuleMatch(long currentTimeMilli, Map<String, String> fingerPrints,
                                           Map<String, Object> fieldValueMap, AlertDefine define) {
        Long defineId = define.getId();
        String fingerprint = AlertUtil.calculateFingerprint(fingerPrints);
        SingleAlert existingAlert = alarmCacheManager.getPending(defineId, fingerprint);
        Map<String, String> labels = new HashMap<>(8);
        fieldValueMap.putAll(define.getLabels());
        labels.putAll(fingerPrints);
        int requiredTimes = define.getTimes() == null ? 1 : define.getTimes();
        if (existingAlert == null) {
            // First time triggering alert, create new alert and set to pending status
            SingleAlert newAlert = SingleAlert.builder()
                    .labels(labels)
                    .annotations(define.getAnnotations())
                    .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                    .status(CommonConstants.ALERT_STATUS_PENDING)
                    .triggerTimes(1)
                    .startAt(currentTimeMilli)
                    .activeAt(currentTimeMilli)
                    .build();

            // If required trigger times is 1, set to firing status directly
            if (requiredTimes <= 1) {
                newAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
                alarmCacheManager.putFiring(defineId, fingerprint, newAlert);
                alarmCommonReduce.reduceAndSendAlarm(newAlert.clone());
            } else {
                // Otherwise put into pending queue first
                alarmCacheManager.putPending(defineId, fingerprint, newAlert);
            }
        } else {
            // Update existing alert
            existingAlert.setTriggerTimes(existingAlert.getTriggerTimes() + 1);
            existingAlert.setActiveAt(currentTimeMilli);

            // Check if required trigger times reached
            if (existingAlert.getStatus().equals(CommonConstants.ALERT_STATUS_PENDING) && existingAlert.getTriggerTimes() >= requiredTimes) {
                // Reached trigger times threshold, change to firing status
                alarmCacheManager.removePending(defineId, fingerprint);
                existingAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
                alarmCacheManager.putFiring(defineId, fingerprint, existingAlert);
                alarmCommonReduce.reduceAndSendAlarm(existingAlert.clone());
            }
        }
    }

    /**
     * Handle recovered alert
     */
    private void handleRecoveredAlert(Long defineId, Map<String, String> fingerprints) {
        String fingerprint = AlertUtil.calculateFingerprint(fingerprints);
        SingleAlert firingAlert = alarmCacheManager.removeFiring(defineId, fingerprint);
        if (firingAlert != null) {
            firingAlert.setTriggerTimes(1);
            firingAlert.setEndAt(System.currentTimeMillis());
            firingAlert.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);
            alarmCommonReduce.reduceAndSendAlarm(firingAlert.clone());
        }
        alarmCacheManager.removePending(defineId, fingerprint);
    }

}