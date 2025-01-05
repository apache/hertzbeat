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

package org.apache.hertzbeat.alert.reduce;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Collections;
import java.util.stream.Collectors;
import java.util.HashMap;

import lombok.Data;
import lombok.AllArgsConstructor;

/**
 * inhibit alarm
 * refer from prometheus, code with @cursor
 */
@Component
@Slf4j
public class AlarmInhibitReduce {

    /**
     * Default TTL for source alerts (4 hours)
     */
    private static final long SOURCE_ALERT_TTL = 4 * 60 * 60 * 1000L;

    /**
     * Interval for checking and cleaning up expired source alerts
     */
    private static final long CHECK_INTERVAL = 60_000L;

    private final AlarmSilenceReduce alarmSilenceReduce;

    private final Map<Long, AlertInhibit> inhibitRules;

    /**
     * Cache for source alerts
     * key: ruleId
     * value: map of source alerts with their fingerprints
     */
    private final Map<Long, Map<String, SourceAlertEntry>> sourceAlertCache;

    public AlarmInhibitReduce(AlarmSilenceReduce alarmSilenceReduce, AlertInhibitDao alertInhibitDao) {
        this.alarmSilenceReduce = alarmSilenceReduce;
        inhibitRules = new ConcurrentHashMap<>(8);
        sourceAlertCache = new ConcurrentHashMap<>(8);
        List<AlertInhibit> inhibits = alertInhibitDao.findAlertInhibitsByEnableIsTrue();
        refreshInhibitRules(inhibits);
        startScheduledCleanupCache();
    }

    private void startScheduledCleanupCache() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("Scheduled clean up inhibit cache has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("inhibit-clean-up-%d")
                .build();
        ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor(threadFactory);
        // Scheduled cleanup of all expired source alerts
        scheduledExecutor.scheduleAtFixedRate(() -> {
            try {
                sourceAlertCache.values().forEach(this::cleanupExpiredEntries);
                // Remove empty rule caches
                sourceAlertCache.entrySet().removeIf(entry -> entry.getValue().isEmpty());
            } catch (Exception e) {
                log.error("Error during scheduled cleanup", e);
            }
        }, CHECK_INTERVAL, CHECK_INTERVAL, java.util.concurrent.TimeUnit.MILLISECONDS);
    }

    /**
     * Configure inhibit rules
     * @param rules Inhibit rule list
     */
    public void refreshInhibitRules(List<AlertInhibit> rules) {
        if (rules == null) {
            log.warn("Attempted to refresh inhibit rules with null list.");
            return;
        }
        this.inhibitRules.clear();
        rules.forEach(rule -> this.inhibitRules.put(rule.getId(), rule));
    }

    /**
     * Process alert with inhibit rules
     * If alert is inhibited, it will not be forwarded
     * @param groupAlert Grouped and pending alerts to be processed
     */
    public void inhibitAlarm(GroupAlert groupAlert) {
        if (groupAlert == null) {
            log.warn("Received null GroupAlert. Skipping processing.");
            return;
        }
        try {
            if (inhibitRules.isEmpty()) {
                alarmSilenceReduce.silenceAlarm(groupAlert);
                return;
            }

            for (AlertInhibit rule : inhibitRules.values()) {
                if (isSourceAlert(groupAlert, rule)) {
                    cacheSourceAlert(groupAlert, rule);
                }
            }

            if (shouldInhibit(groupAlert)) {
                log.debug("Alert {} is inhibited", groupAlert);
                return;
            }

            alarmSilenceReduce.silenceAlarm(groupAlert);
        } catch (Exception e) {
            log.error("Error inhibiting alarm for {}", groupAlert, e);
        }
    }

    /**
     * Check if alert matches inhibit rule source labels
     * @param alert Grouped and pending alerts to be processed
     * @param rule The rule of inhibition
     */
    private boolean isSourceAlert(GroupAlert alert, AlertInhibit rule) {
        if (alert == null || rule == null) {
            log.warn("Received null alert or rule in isSourceAlert");
            return false;
        }
        if (!"firing".equals(alert.getStatus())) {
            return false;
        }
        return matchLabels(alert.getCommonLabels(), rule.getSourceLabels());
    }

    /**
     * Check if alert should be inhibited by any active source alerts
     * @param alert Grouped and pending alerts to be processed
     */
    private boolean shouldInhibit(GroupAlert alert) {
        if (alert == null) {
            log.warn("Received null alert in shouldInhibit");
            return false;
        }
        if ("resolved".equals(alert.getStatus())) {
            return false;
        }

        for (AlertInhibit rule : inhibitRules.values()) {
            if (!matchLabels(alert.getCommonLabels(), rule.getTargetLabels())) {
                continue;
            }

            List<GroupAlert> sourceAlerts = getActiveSourceAlerts(rule);
            if (sourceAlerts.isEmpty()) {
                continue;
            }

            for (GroupAlert source : sourceAlerts) {
                if (matchEqualLabels(source, alert, rule.getEqualLabels())) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if all required labels match
     * @param alertLabels The label of the alarm
     * @param requiredLabels Labels to be matched
     */
    private boolean matchLabels(Map<String, String> alertLabels, Map<String, String> requiredLabels) {
        if (alertLabels == null || requiredLabels == null) {
            log.warn("Received null alertLabels or requiredLabels in matchLabels");
            return false;
        }
        return requiredLabels.entrySet().stream()
                .allMatch(entry -> entry.getValue().equals(alertLabels.get(entry.getKey())));
    }

    /**
     * Check if equal labels have same values in both alerts
     * @param source Alarm used to suppress other alarms
     * @param target Alarm that may be suppressed
     * @param equalLabels Need to be equal labels
     */
    private boolean matchEqualLabels(GroupAlert source, GroupAlert target, List<String> equalLabels) {
        if (source == null || target == null) {
            log.warn("Received null source or target in matchEqualLabels");
            return false;
        }
        if (equalLabels == null || equalLabels.isEmpty()) {
            return true;
        }
        Map<String, String> sourceLabels = source.getCommonLabels();
        Map<String, String> targetLabels = target.getCommonLabels();

        return equalLabels.stream().allMatch(label -> {
            String sourceValue = sourceLabels.get(label);
            String targetValue = targetLabels.get(label);
            return sourceValue != null && sourceValue.equals(targetValue);
        });
    }

    /**
     * Cache source alert for inhibit rule
     * @param alert Grouped and pending alerts to be processed
     * @param rule The rule of inhibition
     */
    private void cacheSourceAlert(GroupAlert alert, AlertInhibit rule) {
        if (alert == null || rule == null) {
            log.warn("Received null alert or rule in cacheSourceAlert");
            return;
        }
        Map<String, SourceAlertEntry> ruleCache = sourceAlertCache.computeIfAbsent(
                rule.getId(),
                k -> new ConcurrentHashMap<>()
        );

        String fingerprint = generateAlertFingerprint(alert);
        SourceAlertEntry entry = new SourceAlertEntry(
                alert,
                System.currentTimeMillis(),
                System.currentTimeMillis() + SOURCE_ALERT_TTL
        );
        ruleCache.put(fingerprint, entry);
        cleanupExpiredEntries(ruleCache);
    }

    /**
     * Get active source alerts for inhibit rule
     * @param rule The rule of inhibition
     */
    private List<GroupAlert> getActiveSourceAlerts(AlertInhibit rule) {
        if (rule == null) {
            log.warn("Received null rule in getActiveSourceAlerts");
            return Collections.emptyList();
        }
        Map<String, SourceAlertEntry> ruleCache = sourceAlertCache.get(rule.getId());
        if (ruleCache == null || ruleCache.isEmpty()) {
            return Collections.emptyList();
        }

        long now = System.currentTimeMillis();
        return ruleCache.values().stream()
                .filter(entry -> entry.getExpiryTime() > now)
                .map(SourceAlertEntry::getAlert)
                .collect(Collectors.toList());
    }

    /**
     * Generate fingerprint for alert deduplication
     * @param alert Grouped and pending alerts to be processed
     */
    private String generateAlertFingerprint(GroupAlert alert) {
        if (alert == null) {
            log.warn("Received null alert in generateAlertFingerprint");
            return "";
        }
        Map<String, String> labels = new HashMap<>(alert.getCommonLabels());
        labels.remove("timestamp");

        return labels.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + ":" + e.getValue())
                .collect(Collectors.joining(","));
    }

    /**
     * Remove expired entries from cache
     * @param cache Source alert cache entry map
     */
    private void cleanupExpiredEntries(Map<String, SourceAlertEntry> cache) {
        if (cache == null) {
            log.warn("Received null cache in cleanupExpiredEntries");
            return;
        }
        long now = System.currentTimeMillis();
        cache.entrySet().removeIf(entry -> entry.getValue().getExpiryTime() <= now);
    }

    /**
     * Source alert cache entry
     */
    @Data
    @AllArgsConstructor
    private static class SourceAlertEntry {
        private final GroupAlert alert;
        private final long createTime;
        private final long expiryTime;
    }
}
