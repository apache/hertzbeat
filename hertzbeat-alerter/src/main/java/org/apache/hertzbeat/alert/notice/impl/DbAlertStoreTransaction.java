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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Transactional persistence called while the outer handler owns every scoped store lock. */
@Component
@RequiredArgsConstructor
class DbAlertStoreTransaction {

    private final GroupAlertDao groupAlertDao;

    private final SingleAlertDao singleAlertDao;

    @Transactional
    public GroupAlert storeLocked(GroupAlert groupAlert) {
        String workspaceId = groupAlert.getWorkspaceId();
        Set<String> alertFingerprints = new HashSet<>(8);
        List<SingleAlert> newAlerts = new ArrayList<>();
        for (SingleAlert singleAlert : groupAlert.getAlerts()) {
            SingleAlert existAlert = singleAlertDao.findByWorkspaceIdAndFingerprint(
                    workspaceId, singleAlert.getFingerprint());
            if (existAlert == null) {
                singleAlert.setId(null);
                singleAlert.setGmtCreate(null);
            } else {
                mergeSingleAlert(singleAlert, existAlert);
            }
            SingleAlert savedSingleAlert = singleAlertDao.save(singleAlert);
            newAlerts.add(savedSingleAlert);
            alertFingerprints.add(savedSingleAlert.getFingerprint());
        }
        groupAlert.setAlerts(newAlerts);

        GroupAlert existGroupAlert = groupAlertDao.findByWorkspaceIdAndGroupKey(
                workspaceId, groupAlert.getGroupKey());
        if (existGroupAlert == null) {
            groupAlert.setId(null);
            groupAlert.setGmtCreate(null);
        } else {
            mergeGroupAlert(groupAlert, existGroupAlert, alertFingerprints);
        }
        groupAlert.setAlertFingerprints(alertFingerprints.stream().toList());
        GroupAlert savedGroupAlert = groupAlertDao.save(groupAlert);
        savedGroupAlert.setAlerts(groupAlert.getAlerts());
        return savedGroupAlert;
    }

    private static void mergeSingleAlert(SingleAlert incoming, SingleAlert persisted) {
        incoming.setId(persisted.getId());
        incoming.setGmtCreate(persisted.getGmtCreate());
        if (CommonConstants.ALERT_STATUS_FIRING.equals(incoming.getStatus())) {
            if (!CommonConstants.ALERT_STATUS_RESOLVED.equals(persisted.getStatus())) {
                incoming.setStartAt(persisted.getStartAt());
                int triggerTimes = Optional.ofNullable(persisted.getTriggerTimes()).orElse(1)
                        + Optional.ofNullable(incoming.getTriggerTimes()).orElse(1);
                incoming.setTriggerTimes(triggerTimes);
            }
        } else if (CommonConstants.ALERT_STATUS_RESOLVED.equals(incoming.getStatus())) {
            if (incoming.getEndAt() == null) {
                incoming.setEndAt(System.currentTimeMillis());
            }
            incoming.setStartAt(persisted.getStartAt());
            incoming.setActiveAt(persisted.getActiveAt());
            incoming.setTriggerTimes(persisted.getTriggerTimes());
        }
    }

    private static void mergeGroupAlert(
            GroupAlert incoming, GroupAlert persisted, Set<String> alertFingerprints) {
        if (persisted.getAlertFingerprints() != null) {
            alertFingerprints.addAll(persisted.getAlertFingerprints());
        }
        incoming.setId(persisted.getId());
        incoming.setGmtCreate(persisted.getGmtCreate());
        if (persisted.getCommonLabels() != null && incoming.getCommonLabels() != null) {
            incoming.setCommonLabels(retainHistoricalKeys(
                    incoming.getCommonLabels(), persisted.getCommonLabels()));
        }
        if (persisted.getCommonAnnotations() != null && incoming.getCommonAnnotations() != null) {
            incoming.setCommonAnnotations(retainHistoricalKeys(
                    incoming.getCommonAnnotations(), persisted.getCommonAnnotations()));
        }
    }

    private static Map<String, String> retainHistoricalKeys(
            Map<String, String> current, Map<String, String> persisted) {
        Map<String, String> retained = new LinkedHashMap<>();
        current.forEach((key, value) -> {
            if (persisted.containsKey(key)) {
                retained.put(key, value);
            }
        });
        return retained;
    }
}
