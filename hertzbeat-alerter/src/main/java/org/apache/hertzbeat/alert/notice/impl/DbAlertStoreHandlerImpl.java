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

import java.util.LinkedList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.notice.AlertStoreHandler;
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
    public void store(GroupAlert groupAlert) {
        if (groupAlert == null || groupAlert.getAlerts() == null || groupAlert.getAlerts().isEmpty()) {
            log.error("The Group Alerts is empty, ignore store");
            return;
        }
        // 1. Find if there is an existing alert group
        GroupAlert existGroupAlert = groupAlertDao.findByGroupKey(groupAlert.getGroupKey());
        
        // 2. Process single alerts
        List<String> alertFingerprints = new LinkedList<>();
        groupAlert.getAlerts().forEach(singleAlert -> {
            // Check if there is an existing alert with same fingerprint
            SingleAlert existAlert = singleAlertDao.findByFingerprint(singleAlert.getFingerprint());
            if (existAlert != null) {
                // Update existing alert
                singleAlert.setId(existAlert.getId());
                singleAlert.setStartAt(existAlert.getStartAt());
                // If status changed from resolved to firing, update activeAt
                if ("resolved".equals(existAlert.getStatus()) && "firing".equals(singleAlert.getStatus())) {
                    singleAlert.setActiveAt(System.currentTimeMillis());
                } else {
                    singleAlert.setActiveAt(existAlert.getActiveAt());
                }
                singleAlert.setTriggerTimes(existAlert.getTriggerTimes() + 1);
            }
            // Save new/updated alert
            alertFingerprints.add(singleAlert.getFingerprint());
            singleAlertDao.save(singleAlert);
        });
        
        // 3. If there is an existing alert group, handle resolved alerts
        if (existGroupAlert != null) {
            List<String> existFingerprints = existGroupAlert.getAlertFingerprints();
            if (existFingerprints != null) {
                for (String fingerprint : existFingerprints) {
                    if (!alertFingerprints.contains(fingerprint)) {
                        // Old alert not in new alert list, mark as resolved
                        SingleAlert alert = singleAlertDao.findByFingerprint(fingerprint);
                        if (alert != null && !"resolved".equals(alert.getStatus())) {
                            alert.setStatus("resolved");
                            alert.setEndAt(System.currentTimeMillis());
                            singleAlertDao.save(alert);
                        }
                    }
                }
            }
            // Update alert group ID
            groupAlert.setId(existGroupAlert.getId());
        }
        
        // 4. Save alert group
        groupAlert.setAlertFingerprints(alertFingerprints);
        groupAlertDao.save(groupAlert);
    }
}
