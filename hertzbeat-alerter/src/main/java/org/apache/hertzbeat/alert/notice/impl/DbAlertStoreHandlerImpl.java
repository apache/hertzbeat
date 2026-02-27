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

package org.apache.hertzbeat.alert.notice.impl;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.notice.AlertStoreHandler;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Component;

/**
 * Alarm data persistence - landing in the database
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DbAlertStoreHandlerImpl implements AlertStoreHandler {

    private final GroupAlertDao groupAlertDao;
    
    private final SingleAlertDao singleAlertDao;

    @Override
    public GroupAlert store(GroupAlert groupAlert) {
        if (groupAlert == null || groupAlert.getAlerts() == null || groupAlert.getAlerts().isEmpty()) {
            log.error("The Group Alerts is empty, ignore store");
            return groupAlert;
        }
        // Process individual alerts
        Set<String> alertFingerprints = new HashSet<>(8);
        List<SingleAlert> originalAlerts = groupAlert.getAlerts();
        List<SingleAlert> newAlerts = new ArrayList<>();

        for (SingleAlert singleAlert : originalAlerts) {
            synchronized (singleAlert.getFingerprint().intern()) {
                SingleAlert existAlert = singleAlertDao.findByFingerprint(singleAlert.getFingerprint());
                if (existAlert != null) {
                    // Update the existing alert with the ID and creation time from the database
                    singleAlert.setId(existAlert.getId());
                    singleAlert.setGmtCreate(existAlert.getGmtCreate());
                    // Status transition logic
                    if (CommonConstants.ALERT_STATUS_FIRING.equals(singleAlert.getStatus())) {
                        // If the alert is firing and the existing alert is not resolved, update the start time and trigger times
                        if (!CommonConstants.ALERT_STATUS_RESOLVED.equals(existAlert.getStatus())) {
                            singleAlert.setStartAt(existAlert.getStartAt());
                            int triggerTimes = Optional.ofNullable(existAlert.getTriggerTimes()).orElse(1)
                                    + Optional.ofNullable(singleAlert.getTriggerTimes()).orElse(1);
                            singleAlert.setTriggerTimes(triggerTimes);
                        }
                    } else if (CommonConstants.ALERT_STATUS_RESOLVED.equals(singleAlert.getStatus())) {
                        // If the alert is resolved, set the end time (if not already set) and copy other fields from the existing alert
                        if (singleAlert.getEndAt() == null) {
                            singleAlert.setEndAt(System.currentTimeMillis());
                        }
                        singleAlert.setStartAt(existAlert.getStartAt());
                        singleAlert.setActiveAt(existAlert.getActiveAt());
                        singleAlert.setTriggerTimes(existAlert.getTriggerTimes());
                    }
                }
                SingleAlert savedSingleAlert = singleAlertDao.save(singleAlert);
                newAlerts.add(savedSingleAlert);
                alertFingerprints.add(savedSingleAlert.getFingerprint());
            }
        }
        groupAlert.setAlerts(newAlerts);
        // Find existing alert group
        synchronized (groupAlert.getGroupKey().intern()) {
            GroupAlert existGroupAlert = groupAlertDao.findByGroupKey(groupAlert.getGroupKey());
            // Process resolved alerts
            if (existGroupAlert != null) {
                List<String> existFingerprints = existGroupAlert.getAlertFingerprints();
                if (existFingerprints != null) {
                    alertFingerprints.addAll(existFingerprints);
                }
                // Merge group information
                groupAlert.setId(existGroupAlert.getId());
                groupAlert.setGmtCreate(existGroupAlert.getGmtCreate());
                // Merge other historical information to preserve
                Map<String, String> existCommonLabels = existGroupAlert.getCommonLabels();
                if (existCommonLabels != null) {
                    Map<String, String> commonLabels = groupAlert.getCommonLabels();
                    if (commonLabels != null) {
                        // filter common label in commonLabels and existCommonLabels
                        commonLabels = commonLabels.entrySet().stream()
                                .filter(entry -> existCommonLabels.containsKey(entry.getKey()))
                                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
                        groupAlert.setCommonLabels(commonLabels);
                    }
                }
                Map<String, String> existCommonAnnotations = existGroupAlert.getCommonAnnotations();
                if (existCommonAnnotations != null) {
                    Map<String, String> commonAnnotations = groupAlert.getCommonAnnotations();
                    if (commonAnnotations != null) {
                        // filter common annotation in commonAnnotations and existCommonAnnotations
                        commonAnnotations = commonAnnotations.entrySet().stream()
                                .filter(entry -> existCommonAnnotations.containsKey(entry.getKey()))
                                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
                        groupAlert.setCommonAnnotations(commonAnnotations);
                    }
                }
            }
            // Save alert group
            groupAlert.setAlertFingerprints(alertFingerprints.stream().toList());
            GroupAlert savedGroupAlert = groupAlertDao.save(groupAlert);
            savedGroupAlert.setAlerts(groupAlert.getAlerts());
            return savedGroupAlert;
        }
    }
}
