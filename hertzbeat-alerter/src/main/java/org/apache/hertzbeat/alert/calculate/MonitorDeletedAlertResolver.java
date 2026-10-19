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

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmGroupReduce;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.support.event.MonitorDeletedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Resolves alerts for a monitor that has been deleted.
 *
 * <p>Collection stops on delete, so a firing alert can never receive the metrics sample that
 * would recover it. Group convergence then keeps resending that alert. Closing it here, without
 * emitting another notification, stops those repeats.</p>
 */
@Component
@Slf4j
public class MonitorDeletedAlertResolver {

    private final AlarmCacheManager alarmCacheManager;

    private final AlarmGroupReduce alarmGroupReduce;

    private final SingleAlertDao singleAlertDao;

    private final GroupAlertDao groupAlertDao;

    private final DeletedMonitorAlertGuard deletedMonitorAlertGuard;

    public MonitorDeletedAlertResolver(AlarmCacheManager alarmCacheManager, AlarmGroupReduce alarmGroupReduce,
                                       SingleAlertDao singleAlertDao, GroupAlertDao groupAlertDao,
                                       DeletedMonitorAlertGuard deletedMonitorAlertGuard) {
        this.alarmCacheManager = alarmCacheManager;
        this.alarmGroupReduce = alarmGroupReduce;
        this.singleAlertDao = singleAlertDao;
        this.groupAlertDao = groupAlertDao;
        this.deletedMonitorAlertGuard = deletedMonitorAlertGuard;
    }

    /**
     * Close firing alerts for the deleted monitor after the delete transaction commits.
     * @param event monitor deletion event
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onMonitorDeleted(MonitorDeletedEvent event) {
        if (event == null || event.getMonitorId() == null || event.getMonitorId() <= 0) {
            return;
        }
        String monitorId = String.valueOf(event.getMonitorId());
        deletedMonitorAlertGuard.markDeleted(event.getMonitorId());
        List<SingleAlert> cached = alarmCacheManager.removeAlertsForMonitor(monitorId);
        int droppedFromGroups = alarmGroupReduce.dropAlertsForMonitor(monitorId);
        int persisted = resolvePersistedAlerts(monitorId);
        if (persisted > 0 || !cached.isEmpty() || droppedFromGroups > 0) {
            log.info("Closed alerts for deleted monitor {}: persisted={}, cached={}, grouped={}",
                    monitorId, persisted, cached.size(), droppedFromGroups);
        }
    }

    private int resolvePersistedAlerts(String monitorId) {
        long now = System.currentTimeMillis();
        Set<String> resolvedFingerprints = new HashSet<>();
        int resolved = 0;
        List<SingleAlert> firingAlerts = singleAlertDao.querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING);
        if (firingAlerts == null) {
            firingAlerts = List.of();
        }
        for (SingleAlert alert : firingAlerts) {
            if (!belongsToMonitor(alert == null ? null : alert.getLabels(), monitorId)) {
                continue;
            }
            alert.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);
            if (alert.getEndAt() == null) {
                alert.setEndAt(now);
            }
            singleAlertDao.save(alert);
            if (alert.getFingerprint() != null) {
                resolvedFingerprints.add(alert.getFingerprint());
            }
            resolved++;
        }
        List<GroupAlert> firingGroups = groupAlertDao.queryGroupAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING);
        if (firingGroups == null) {
            firingGroups = List.of();
        }
        for (GroupAlert group : firingGroups) {
            if (group == null || !shouldResolveGroup(group, monitorId, resolvedFingerprints)) {
                continue;
            }
            group.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);
            groupAlertDao.save(group);
        }
        return resolved;
    }

    private static boolean shouldResolveGroup(GroupAlert group, String monitorId, Set<String> resolvedFingerprints) {
        if (belongsToMonitor(group.getCommonLabels(), monitorId)) {
            return true;
        }
        List<String> fingerprints = group.getAlertFingerprints();
        return fingerprints != null
                && !fingerprints.isEmpty()
                && resolvedFingerprints.containsAll(fingerprints);
    }

    private static boolean belongsToMonitor(Map<String, String> labels, String monitorId) {
        return labels != null && monitorId.equals(labels.get(CommonConstants.LABEL_MONITOR_ID));
    }
}
