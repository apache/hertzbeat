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
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.stereotype.Component;

/**
 * Periodic Alert Calculator
 */

@Slf4j
@Component
public class PeriodicAlertCalculator {
    
    private static final String VALUE = "__value__";
    private static final String TIMESTAMP = "__timestamp__";

    private final DataSourceService dataSourceService;
    private final AlarmCommonReduce alarmCommonReduce;
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
    
    public PeriodicAlertCalculator(DataSourceService dataSourceService, AlarmCommonReduce alarmCommonReduce) {
        this.dataSourceService = dataSourceService;
        this.alarmCommonReduce = alarmCommonReduce;
        this.pendingAlertMap = new ConcurrentHashMap<>(8);
        this.firingAlertMap = new ConcurrentHashMap<>(8);
    }
    
    public void calculate(AlertDefine rule) {
        if (!rule.isEnable() || StringUtils.isEmpty(rule.getExpr())) {
            log.error("Periodic rule {} is disabled or expression is empty", rule.getName());
            return;
        }
        long currentTimeMilli = System.currentTimeMillis();
        try {
            // for prometheus is instant promql query, for db is sql query
            // result: [{'value': 100, 'timestamp': 1343554, 'instance': 'node1'},{'value': 200, 'timestamp': 1343555, 'instance': 'node2'}]
            // the return result should be matched with threshold
            try {
                List<Map<String, Object>> results = dataSourceService.calculate(
                        rule.getDatasource(),
                        rule.getExpr()
                );
                // if no match the expr threshold, the results item map {'value': null} should be null and others field keep
                // if results has multi list, should trigger multi alert
                if (CollectionUtils.isEmpty(results)) {
                    return;
                }
                for (Map<String, Object> result : results) {
                    Map<String, String> fingerPrints = new HashMap<>(8);
                    // here use the alert name as finger, not care the alert name may be changed
                    fingerPrints.put(CommonConstants.LABEL_ALERT_NAME, rule.getName());
                    fingerPrints.putAll(rule.getLabels());
                    for (Map.Entry<String, Object> entry : result.entrySet()) {
                        if (entry.getValue() != null && !VALUE.equals(entry.getKey())
                                && !TIMESTAMP.equals(entry.getKey())) {
                            fingerPrints.put(entry.getKey(), entry.getValue().toString());
                        }
                    }
                    if (result.get(VALUE) == null) {
                        // recovery the alert
                        handleRecoveredAlert(fingerPrints);
                        continue;
                    }
                    Map<String, Object> fieldValueMap = new HashMap<>(8);
                    fieldValueMap.putAll(rule.getLabels());
                    fieldValueMap.put(CommonConstants.LABEL_ALERT_NAME, rule.getName());
                    for (Map.Entry<String, Object> entry : result.entrySet()) {
                        if (entry.getValue() != null) {
                            fieldValueMap.put(entry.getKey(), entry.getValue());
                        }
                    }
                    afterThresholdRuleMatch(currentTimeMilli, fingerPrints, fieldValueMap, rule);
                }
            } catch (Exception ignored) {
                // ignore the query exception eg: no result, timeout, etc
                return;
            }
        } catch (Exception e) {
            log.error("Calculate periodic rule {} failed: {}", rule.getName(), e.getMessage());
        }
    }

    private void afterThresholdRuleMatch(long currentTimeMilli, Map<String, String> fingerPrints,
                                         Map<String, Object> fieldValueMap, AlertDefine define) {
        String fingerprint = calculateFingerprint(fingerPrints);
        SingleAlert existingAlert = pendingAlertMap.get(fingerprint);
        Map<String, String> labels = new HashMap<>(8);
        fieldValueMap.putAll(define.getLabels());
        labels.putAll(fingerPrints);
        int requiredTimes = define.getTimes() == null ? 1 : define.getTimes();
        if (existingAlert == null) {
            // First time triggering alert, create new alert and set to pending status
            SingleAlert newAlert = SingleAlert.builder()
                    .labels(labels)
                    // todo render var content in annotations
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
                firingAlertMap.put(fingerprint, newAlert);
                alarmCommonReduce.reduceAndSendAlarm(newAlert.clone());
            } else {
                // Otherwise put into pending queue first
                pendingAlertMap.put(fingerprint, newAlert);
            }
        } else {
            // Update existing alert
            existingAlert.setTriggerTimes(existingAlert.getTriggerTimes() + 1);
            existingAlert.setActiveAt(currentTimeMilli);

            // Check if required trigger times reached
            if (existingAlert.getStatus().equals(CommonConstants.ALERT_STATUS_PENDING) && existingAlert.getTriggerTimes() >= requiredTimes) {
                // Reached trigger times threshold, change to firing status
                pendingAlertMap.remove(fingerprint);
                existingAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
                firingAlertMap.put(fingerprint, existingAlert);
                alarmCommonReduce.reduceAndSendAlarm(existingAlert.clone());
            }
        }
    }

    private void handleRecoveredAlert(Map<String, String> fingerprints) {
        String fingerprint = calculateFingerprint(fingerprints);
        SingleAlert firingAlert = firingAlertMap.remove(fingerprint);
        if (firingAlert != null) {
            // todo consider multi times to tig for resolved alert
            firingAlert.setTriggerTimes(1);
            firingAlert.setEndAt(System.currentTimeMillis());
            firingAlert.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);
            alarmCommonReduce.reduceAndSendAlarm(firingAlert.clone());
        }
        pendingAlertMap.remove(fingerprint);
    }

    private String calculateFingerprint(Map<String, String> fingerPrints) {
        List<String> keyList = fingerPrints.keySet().stream().filter(Objects::nonNull).sorted().toList();
        List<String> valueList = fingerPrints.values().stream().filter(Objects::nonNull).sorted().toList();
        return Arrays.hashCode(keyList.toArray(new String[0])) + "-"
                + Arrays.hashCode(valueList.toArray(new String[0]));
    }
} 
