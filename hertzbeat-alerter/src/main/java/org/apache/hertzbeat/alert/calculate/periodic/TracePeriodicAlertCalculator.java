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

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.calculate.AlarmCacheManager;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Component;

/**
 * Periodic trace alert calculator.
 */
@Slf4j
@Component
public class TracePeriodicAlertCalculator {

    private static final String VALUE = "__value__";
    private static final String TIMESTAMP = "__timestamp__";

    private final DataSourceService dataSourceService;
    private final AlarmCommonReduce alarmCommonReduce;
    private final AlarmCacheManager alarmCacheManager;

    public TracePeriodicAlertCalculator(DataSourceService dataSourceService, AlarmCommonReduce alarmCommonReduce,
                                        AlarmCacheManager alarmCacheManager) {
        this.dataSourceService = dataSourceService;
        this.alarmCommonReduce = alarmCommonReduce;
        this.alarmCacheManager = alarmCacheManager;
    }

    /**
     * Calculate one periodic trace alert definition.
     *
     * @param define alert define
     */
    public void calculate(AlertDefine define) {
        if (define == null || !define.isEnable() || StringUtils.isEmpty(define.getExpr())) {
            log.error("Trace periodic define {} is disabled or expression is empty",
                    define == null ? null : define.getName());
            return;
        }

        List<Map<String, Object>> results;
        try {
            results = dataSourceService.query(define.getDatasource(), define.getExpr(),
                    CommonConstants.TRACE_ALERT_THRESHOLD_TYPE_PERIODIC);
        } catch (Exception ex) {
            log.error("Calculate trace periodic define {} query failed: {}", define.getName(), ex.getMessage());
            return;
        }

        if (containsMissingValueColumn(results)) {
            log.warn("Trace periodic define {} query result must include {} column.", define.getName(), VALUE);
            return;
        }

        if (CollectionUtils.isEmpty(results)) {
            recoverAll(define);
            return;
        }

        Set<String> matchedFingerprints = new HashSet<>();
        long currentTimeMillis = System.currentTimeMillis();
        for (Map<String, Object> result : results) {
            Map<String, String> fingerprints = createFingerprints(define, result);
            String fingerprint = AlertUtil.calculateFingerprint(fingerprints);
            matchedFingerprints.add(fingerprint);
            if (result.get(VALUE) == null) {
                recoverFingerprint(define.getId(), fingerprint);
                continue;
            }
            Map<String, Object> fieldValueMap = createFieldValueMap(define, result, fingerprints);
            afterThresholdRuleMatch(currentTimeMillis, fingerprint, fingerprints, fieldValueMap, define);
        }
        recoverUnmatched(define, matchedFingerprints);
    }

    private boolean containsMissingValueColumn(List<Map<String, Object>> results) {
        if (CollectionUtils.isEmpty(results)) {
            return false;
        }
        return results.stream().anyMatch(row -> row == null || !row.containsKey(VALUE));
    }

    private void afterThresholdRuleMatch(long currentTimeMillis, String fingerprint,
                                         Map<String, String> fingerprints,
                                         Map<String, Object> fieldValueMap,
                                         AlertDefine define) {
        Long defineId = define.getId();
        SingleAlert firingAlert = alarmCacheManager.getFiring(defineId, fingerprint);
        if (firingAlert != null) {
            firingAlert.setActiveAt(currentTimeMillis);
            return;
        }

        SingleAlert pendingAlert = alarmCacheManager.getPending(defineId, fingerprint);
        int requiredTimes = define.getTimes() == null ? 1 : Math.max(1, define.getTimes());
        if (pendingAlert == null) {
            SingleAlert newAlert = SingleAlert.builder()
                    .labels(fingerprints)
                    .annotations(createAlertAnnotations(define, fieldValueMap))
                    .content(AlertTemplateUtil.render(StringUtils.defaultString(define.getTemplate()), fieldValueMap))
                    .status(CommonConstants.ALERT_STATUS_PENDING)
                    .triggerTimes(1)
                    .startAt(currentTimeMillis)
                    .activeAt(currentTimeMillis)
                    .build();
            if (requiredTimes <= 1) {
                newAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
                alarmCacheManager.putFiring(defineId, fingerprint, newAlert);
                alarmCommonReduce.reduceAndSendAlarm(newAlert.clone());
            } else {
                alarmCacheManager.putPending(defineId, fingerprint, newAlert);
            }
            return;
        }

        pendingAlert.setTriggerTimes(pendingAlert.getTriggerTimes() + 1);
        pendingAlert.setActiveAt(currentTimeMillis);
        if (pendingAlert.getTriggerTimes() >= requiredTimes) {
            alarmCacheManager.removePending(defineId, fingerprint);
            pendingAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
            alarmCacheManager.putFiring(defineId, fingerprint, pendingAlert);
            alarmCommonReduce.reduceAndSendAlarm(pendingAlert.clone());
        }
    }

    private Map<String, String> createFingerprints(AlertDefine define, Map<String, Object> result) {
        Map<String, String> fingerprints = new HashMap<>(8);
        if (define.getLabels() != null) {
            fingerprints.putAll(define.getLabels());
        }
        fingerprints.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(define.getId()));
        fingerprints.put(CommonConstants.LABEL_ALERT_NAME, define.getName());
        for (Map.Entry<String, Object> entry : result.entrySet()) {
            if (entry.getValue() != null && !VALUE.equals(entry.getKey()) && !TIMESTAMP.equals(entry.getKey())) {
                fingerprints.put(entry.getKey(), entry.getValue().toString());
            }
        }
        return fingerprints;
    }

    private Map<String, Object> createFieldValueMap(AlertDefine define, Map<String, Object> result,
                                                   Map<String, String> fingerprints) {
        Map<String, Object> fieldValueMap = new HashMap<>(8);
        fieldValueMap.putAll(fingerprints);
        if (define.getLabels() != null) {
            fieldValueMap.putAll(define.getLabels());
        }
        for (Map.Entry<String, Object> entry : result.entrySet()) {
            if (entry.getValue() != null) {
                fieldValueMap.put(entry.getKey(), entry.getValue());
            }
        }
        return fieldValueMap;
    }

    private Map<String, String> createAlertAnnotations(AlertDefine define, Map<String, Object> fieldValueMap) {
        if (define.getAnnotations() == null) {
            return Collections.emptyMap();
        }
        Map<String, String> annotations = new HashMap<>(define.getAnnotations().size());
        for (Map.Entry<String, String> entry : define.getAnnotations().entrySet()) {
            annotations.put(entry.getKey(), AlertTemplateUtil.render(entry.getValue(), fieldValueMap));
        }
        return annotations;
    }

    private void recoverAll(AlertDefine define) {
        recoverCached(define.getId(), alarmCacheManager.getFiringAlerts(define.getId()).keySet(), true);
        recoverCached(define.getId(), alarmCacheManager.getPendingAlerts(define.getId()).keySet(), false);
    }

    private void recoverUnmatched(AlertDefine define, Set<String> matchedFingerprints) {
        Set<String> firingFingerprints = new HashSet<>(alarmCacheManager.getFiringAlerts(define.getId()).keySet());
        firingFingerprints.removeAll(matchedFingerprints);
        recoverCached(define.getId(), firingFingerprints, true);

        Set<String> pendingFingerprints = new HashSet<>(alarmCacheManager.getPendingAlerts(define.getId()).keySet());
        pendingFingerprints.removeAll(matchedFingerprints);
        recoverCached(define.getId(), pendingFingerprints, false);
    }

    private void recoverCached(Long defineId, Set<String> fingerprints, boolean notifyResolved) {
        for (String fingerprint : fingerprints) {
            if (notifyResolved) {
                recoverFingerprint(defineId, fingerprint);
            } else {
                alarmCacheManager.removePending(defineId, fingerprint);
            }
        }
    }

    private void recoverFingerprint(Long defineId, String fingerprint) {
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
