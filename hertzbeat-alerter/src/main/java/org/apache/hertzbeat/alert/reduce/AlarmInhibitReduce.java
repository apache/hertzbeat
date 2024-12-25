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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
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
@Service
@Slf4j
@RequiredArgsConstructor
public class AlarmInhibitReduce {

    /**
     * Default TTL for source alerts (4 hours)
     */
    private static final long SOURCE_ALERT_TTL = 4 * 60 * 60 * 1000L;

    private final AlarmSilenceReduce alarmSilenceReduce;
    private final Map<Long, AlertInhibit> inhibitRules = new ConcurrentHashMap<>();
    
    /**
     * Cache for source alerts
     * key: ruleId
     * value: map of source alerts with their fingerprints
     */
    private final Map<Long, Map<String, SourceAlertEntry>> sourceAlertCache = new ConcurrentHashMap<>();

    /**
     * Configure inhibit rules
     */
    public void configureInhibitRules(List<AlertInhibit> rules) {
        this.inhibitRules.clear();
        rules.stream()
            .filter(AlertInhibit::getEnable)
            .forEach(rule -> this.inhibitRules.put(rule.getId(), rule));
    }

    /**
     * Process alert with inhibit rules
     * If alert is inhibited, it will not be forwarded
     */
    public void inhibitAlarm(GroupAlert groupAlert) {
        if (inhibitRules.isEmpty()) {
            // No inhibit rules, forward directly
            alarmSilenceReduce.silenceAlarm(groupAlert);
            return;
        }

        // Check if this alert can be a source alert that inhibits others
        for (AlertInhibit rule : inhibitRules.values()) {
            if (isSourceAlert(groupAlert, rule)) {
                // Cache this alert as active source
                cacheSourceAlert(groupAlert, rule);
            }
        }

        // Check if this alert should be inhibited
        if (shouldInhibit(groupAlert)) {
            log.debug("Alert {} is inhibited", groupAlert);
            return;
        }

        // Forward if not inhibited
        alarmSilenceReduce.silenceAlarm(groupAlert);
    }

    /**
     * Check if alert matches inhibit rule source labels
     */
    private boolean isSourceAlert(GroupAlert alert, AlertInhibit rule) {
        // Must be firing status
        if (!"firing".equals(alert.getStatus())) {
            return false;
        }
        
        // Check if labels match
        return matchLabels(alert.getCommonLabels(), rule.getSourceLabels());
    }

    /**
     * Check if alert should be inhibited by any active source alerts
     */
    private boolean shouldInhibit(GroupAlert alert) {
        // Resolved alerts are never inhibited
        if ("resolved".equals(alert.getStatus())) {
            return false;
        }

        for (AlertInhibit rule : inhibitRules.values()) {
            // Check if alert matches target labels
            if (!matchLabels(alert.getCommonLabels(), rule.getTargetLabels())) {
                continue;
            }

            // Check if there are active source alerts for this rule
            List<GroupAlert> sourceAlerts = getActiveSourceAlerts(rule);
            if (sourceAlerts.isEmpty()) {
                continue;
            }

            // Check equal labels
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
     */
    private boolean matchLabels(Map<String, String> alertLabels, Map<String, String> requiredLabels) {
        if (alertLabels == null || requiredLabels == null) {
            return false;
        }
        return requiredLabels.entrySet().stream()
                .allMatch(entry -> entry.getValue().equals(alertLabels.get(entry.getKey())));
    }

    /**
     * Check if equal labels have same values in both alerts
     */
    private boolean matchEqualLabels(GroupAlert source, GroupAlert target, List<String> equalLabels) {
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
     */
    private void cacheSourceAlert(GroupAlert alert, AlertInhibit rule) {
        // Get or create cache for this rule
        Map<String, SourceAlertEntry> ruleCache = sourceAlertCache.computeIfAbsent(
            rule.getId(), 
            k -> new ConcurrentHashMap<>()
        );
        
        // Generate fingerprint for deduplication
        String fingerprint = generateAlertFingerprint(alert);
        
        // Update or add cache entry
        SourceAlertEntry entry = new SourceAlertEntry(
            alert,
            System.currentTimeMillis(),
            System.currentTimeMillis() + SOURCE_ALERT_TTL
        );
        ruleCache.put(fingerprint, entry);
        
        // Cleanup expired entries
        cleanupExpiredEntries(ruleCache);
    }

    /**
     * Get active source alerts for inhibit rule
     */
    private List<GroupAlert> getActiveSourceAlerts(AlertInhibit rule) {
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
     */
    private String generateAlertFingerprint(GroupAlert alert) {
        Map<String, String> labels = new HashMap<>(alert.getCommonLabels());
        // Remove timestamp related fields
        labels.remove("timestamp");
        
        return labels.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(e -> e.getKey() + ":" + e.getValue())
            .collect(Collectors.joining(","));
    }

    /**
     * Remove expired entries from cache
     */
    private void cleanupExpiredEntries(Map<String, SourceAlertEntry> cache) {
        long now = System.currentTimeMillis();
        cache.entrySet().removeIf(entry -> entry.getValue().getExpiryTime() <= now);
    }

    /**
     * Scheduled cleanup of all expired source alerts
     */
    @Scheduled(fixedRate = 60_000) // Run every minute
    public void scheduledCleanup() {
        try {
            sourceAlertCache.values().forEach(this::cleanupExpiredEntries);
            // Remove empty rule caches
            sourceAlertCache.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        } catch (Exception e) {
            log.error("Error during scheduled cleanup", e);
        }
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
