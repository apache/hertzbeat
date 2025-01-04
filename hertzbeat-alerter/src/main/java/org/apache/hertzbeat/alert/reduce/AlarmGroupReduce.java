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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.stream.Collectors;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertGroupConvergeDao;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Component;

/**
 * Alarm group reduce
 * refer from prometheus, code with @cursor
 */
@Component
@Slf4j
public class AlarmGroupReduce {

    /**
     * Default initial group wait time 30s
     */
    private static final long DEFAULT_GROUP_WAIT = 30 * 1000L;
    
    /**
     * Default group send interval 5min
     */
    private static final long DEFAULT_GROUP_INTERVAL = 5 * 60 * 1000L;  
    
    /**
     * Default repeat interval 4h
     */
    private static final long DEFAULT_REPEAT_INTERVAL = 4 * 60 * 60 * 1000L;

    /**
     * Milliseconds per second
     */
    private static final long MS_PER_SECOND = 1000L;

    /**
     * Check interval for group send ms
     */
    private static final long CHECK_INTERVAL = 1000L;
    
    private final AlarmInhibitReduce alarmInhibitReduce;
    
    /**
     * Group define rules
     * key: rule name
     * value: group rule configuration
     */
    private final Map<String, AlertGroupConverge> groupDefines;
    
    /**
     * Alert cache grouped by labels
     * key: groupDefineKey:groupKey
     * value: GroupAlertCache
     */
    private final Map<String, GroupAlertCache> groupCacheMap;

    public AlarmGroupReduce(AlarmInhibitReduce alarmInhibitReduce, AlertGroupConvergeDao alertGroupConvergeDao) {
        this.alarmInhibitReduce = alarmInhibitReduce;
        this.groupDefines = new ConcurrentHashMap<>(8);
        this.groupCacheMap = new ConcurrentHashMap<>(8);
        List<AlertGroupConverge> groupConverges = alertGroupConvergeDao.findAlertGroupConvergesByEnableIsTrue();
        refreshGroupDefines(groupConverges);
        startCheckAndSendGroups();
    }

    private void startCheckAndSendGroups() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("Check alarm groups calculate has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("alarm-group-calculate-%d")
                .build();
        ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor(threadFactory);
        scheduledExecutor.scheduleAtFixedRate(() -> {
            try {
                long now = System.currentTimeMillis();
                groupCacheMap.forEach((groupKey, cache) -> {
                    if (shouldSendGroup(cache, now)) {
                        sendGroupAlert(cache);
                        cache.setLastSendTime(now);
                        cache.getAlerts().clear();
                        cache.getAlertFingerprints().clear();
                    }
                });
            } catch (Exception e) {
                log.error("Check alarm groups calculate has exception.: {}", e.getMessage(), e);
            }
        }, 10000, CHECK_INTERVAL, java.util.concurrent.TimeUnit.MILLISECONDS);
    }

    /**
     * Configure group define rules
     * @param groupDefines map of group rule configurations
     */
    public void refreshGroupDefines(List<AlertGroupConverge> groupDefines) {
        this.groupDefines.clear();
        groupDefines.forEach(define -> this.groupDefines.put(define.getName(), define));
    }
    
    /**
     * Process single alert and group by defined rules
     */
    public void processGroupAlert(SingleAlert alert) {
        Map<String, String> labels = alert.getLabels();
        if (labels == null || labels.isEmpty() || groupDefines.isEmpty()) {
            sendSingleAlert(alert);
            return;
        }
        
        // Process each group define rule
        boolean matched = false;
        for (Map.Entry<String, AlertGroupConverge> define : groupDefines.entrySet()) {
            String defineName = define.getKey();
            AlertGroupConverge ruleConfig = define.getValue();
            
            // Check if alert has all required group labels
            if (hasRequiredLabels(labels, ruleConfig.getGroupLabels())) {
                matched = true;
                processAlertByGroupDefine(alert, defineName, ruleConfig);
            }
        }
        
        if (!matched) {
            sendSingleAlert(alert);
        }
    }
    
    private boolean hasRequiredLabels(Map<String, String> labels, List<String> requiredLabels) {
        return requiredLabels.stream().allMatch(labels::containsKey);
    }
    
    private void processAlertByGroupDefine(SingleAlert alert, String defineName, AlertGroupConverge ruleConfig) {
        // Extract group labels based on define
        Map<String, String> extractedLabels = new HashMap<>();
        for (String labelKey : ruleConfig.getGroupLabels()) {
            extractedLabels.put(labelKey, alert.getLabels().get(labelKey));
        }
        
        // Generate group key 
        String groupKey = generateGroupKey(extractedLabels);
        
        // Get or create group cache
        GroupAlertCache cache = groupCacheMap.computeIfAbsent(groupKey, k -> {
            GroupAlertCache newCache = new GroupAlertCache();
            newCache.setGroupKey(groupKey);
            newCache.setGroupLabels(extractedLabels);
            newCache.setGroupDefineName(defineName);
            newCache.setCreateTime(System.currentTimeMillis());
            newCache.setAlertFingerprints(new HashMap<>());
            return newCache;
        });
        String fingerprint = alert.getFingerprint();
        // Check if this is a duplicate alert
        SingleAlert existingAlert = cache.getAlertFingerprints().get(fingerprint);
        if (existingAlert != null) {
            // Update existing alert timestamp
            existingAlert.setActiveAt(System.currentTimeMillis());
            return;
        }
        
        // Add new alert
        cache.getAlertFingerprints().put(fingerprint, alert);
        cache.getAlerts().add(alert);
        
        if (shouldSendGroupImmediately(cache)) {
            sendGroupAlert(cache);
            cache.setLastSendTime(System.currentTimeMillis());
            cache.getAlerts().clear();
            cache.getAlertFingerprints().clear();
        }
    }
    
    private void sendGroupAlert(GroupAlertCache cache) {
        if (cache.getAlerts().isEmpty()) {
            return;
        }
        
        long now = System.currentTimeMillis();
        String status = determineGroupStatus(cache.getAlerts());
        
        // For firing alerts, check repeat interval
        if ("firing".equals(status)) {
            AlertGroupConverge ruleConfig = groupDefines.get(cache.getGroupDefineName());
            long repeatInterval = ruleConfig.getRepeatInterval() != null
                    ? ruleConfig.getRepeatInterval() * MS_PER_SECOND : DEFAULT_REPEAT_INTERVAL;
            
            // Skip if within repeat interval
            if (cache.getLastRepeatTime() > 0 
                && now - cache.getLastRepeatTime() < repeatInterval) {
                return;
            }
            cache.setLastRepeatTime(now);
        }
        
        GroupAlert groupAlert = GroupAlert.builder()
                .groupKey(cache.getGroupKey())
                .groupLabels(cache.getGroupLabels())
                .commonLabels(extractCommonLabels(cache.getAlerts()))
                .commonAnnotations(extractCommonAnnotations(cache.getAlerts()))
                .alerts(new ArrayList<>(cache.getAlerts()))
                .status(status)
                .build();

        alarmInhibitReduce.inhibitAlarm(groupAlert);
    }
    
    private boolean shouldSendGroup(GroupAlertCache cache, long now) {
        AlertGroupConverge ruleConfig = groupDefines.get(cache.getGroupDefineName());
        long groupWait = ruleConfig != null ? ruleConfig.getGroupWait() * MS_PER_SECOND : DEFAULT_GROUP_WAIT;
        long groupInterval = ruleConfig != null ? ruleConfig.getGroupInterval() * MS_PER_SECOND : DEFAULT_GROUP_INTERVAL;
        
        // First wait time reached
        if (cache.getLastSendTime() == 0 
            && now - cache.getCreateTime() >= groupWait) {
            return true;
        }
        // Group interval time reached
        return cache.getLastSendTime() > 0 
            && now - cache.getLastSendTime() >= groupInterval;
    }
    
    private boolean shouldSendGroupImmediately(GroupAlertCache cache) {
        // Check if all alerts are resolved
        return cache.getAlerts().stream()
                .allMatch(alert -> "resolved".equals(alert.getStatus()));
    }
    
    private void sendSingleAlert(SingleAlert alert) {
        // Wrap single alert as group alert
        String groupKey = generateGroupKey(alert.getLabels());
        GroupAlert groupAlert = GroupAlert.builder()
                .groupKey(groupKey)
                .groupLabels(alert.getLabels())
                .commonLabels(alert.getLabels())
                .commonAnnotations(alert.getAnnotations())
                .alerts(Collections.singletonList(alert))
                .status(alert.getStatus())
                .build();

        alarmInhibitReduce.inhibitAlarm(groupAlert);
    }
    
    private String generateGroupKey(Map<String, String> labels) {
        return labels.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + ":" + e.getValue())
                .collect(Collectors.joining(","));
    }
    
    private Map<String, String> extractCommonLabels(List<SingleAlert> alerts) {
        // Extract common labels from all alerts
        Map<String, String> common = new HashMap<>(alerts.get(0).getLabels());
        alerts.forEach(alert -> {
            common.keySet().removeIf(key -> 
                !alert.getLabels().containsKey(key) 
                || !common.get(key).equals(alert.getLabels().get(key)));
        });
        return common;
    }
    
    private Map<String, String> extractCommonAnnotations(List<SingleAlert> alerts) {
        // Extract common annotations from all alerts
        Map<String, String> common = new HashMap<>(alerts.get(0).getAnnotations());
        alerts.forEach(alert -> {
            common.keySet().removeIf(key -> 
                !alert.getAnnotations().containsKey(key) 
                || !common.get(key).equals(alert.getAnnotations().get(key)));
        });
        return common;
    }
    
    private String determineGroupStatus(List<SingleAlert> alerts) {
        // If any alert is firing, group is firing
        return alerts.stream()
                .anyMatch(alert -> "firing".equals(alert.getStatus())) 
                ? "firing" : "resolved";
    }
    
    @Data
    private static class GroupAlertCache {
        private String groupDefineName;
        private String groupKey;
        private Map<String, String> groupLabels;
        private List<SingleAlert> alerts = new ArrayList<>();
        private Map<String, SingleAlert> alertFingerprints = new HashMap<>();
        private long createTime;
        private long lastSendTime;
        private long lastRepeatTime;
    }
}
