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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmGroupReduce;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.support.event.MonitorDeletedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for resolving alerts after a monitor is deleted.
 */
@ExtendWith(MockitoExtension.class)
class MonitorDeletedAlertResolverTest {

    @Mock
    private AlarmCacheManager alarmCacheManager;

    @Mock
    private AlarmGroupReduce alarmGroupReduce;

    @Mock
    private SingleAlertDao singleAlertDao;

    @Mock
    private GroupAlertDao groupAlertDao;

    private DeletedMonitorAlertGuard deletedMonitorAlertGuard;

    private MonitorDeletedAlertResolver resolver;

    @BeforeEach
    void setUp() {
        deletedMonitorAlertGuard = new DeletedMonitorAlertGuard();
        resolver = new MonitorDeletedAlertResolver(alarmCacheManager, alarmGroupReduce, singleAlertDao,
                groupAlertDao, deletedMonitorAlertGuard);
    }

    @Test
    void closesOnlyTheDeletedMonitorsFiringAlerts() {
        SingleAlert deleted = firingAlert(1L, "fp-deleted", "42");
        SingleAlert other = firingAlert(2L, "fp-other", "7");
        GroupAlert fingerprintOnly = firingGroup(Map.of("severity", "critical"), List.of("fp-deleted"));
        GroupAlert commonMonitor = firingGroup(Map.of(CommonConstants.LABEL_MONITOR_ID, "42"), List.of("fp-deleted"));
        GroupAlert partial = firingGroup(Map.of("severity", "critical"), List.of("fp-deleted", "fp-other"));
        GroupAlert unrelated = firingGroup(Map.of("severity", "warning"), List.of("fp-other"));
        when(alarmCacheManager.removeAlertsForMonitor("42")).thenReturn(List.of(deleted));
        when(alarmGroupReduce.dropAlertsForMonitor("42")).thenReturn(1);
        when(singleAlertDao.querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING))
                .thenReturn(List.of(deleted, other));
        when(groupAlertDao.queryGroupAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING))
                .thenReturn(List.of(fingerprintOnly, commonMonitor, partial, unrelated));

        resolver.onMonitorDeleted(new MonitorDeletedEvent(this, 42L));

        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, deleted.getStatus());
        assertNotNull(deleted.getEndAt());
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, other.getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, fingerprintOnly.getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, commonMonitor.getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, partial.getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, unrelated.getStatus());
        verify(singleAlertDao).save(deleted);
        verify(singleAlertDao, never()).save(other);
        verify(groupAlertDao).save(fingerprintOnly);
        verify(groupAlertDao).save(commonMonitor);
        verify(groupAlertDao, never()).save(partial);
        verify(groupAlertDao, never()).save(unrelated);
        assertTrue(deletedMonitorAlertGuard.isDeleted(42L));
        assertFalse(deletedMonitorAlertGuard.isDeleted(7L));
    }

    @Test
    void ignoresMissingMonitorId() {
        resolver.onMonitorDeleted(null);
        resolver.onMonitorDeleted(new MonitorDeletedEvent(this, null));
        resolver.onMonitorDeleted(new MonitorDeletedEvent(this, 0L));

        verifyNoInteractions(alarmCacheManager, alarmGroupReduce, singleAlertDao, groupAlertDao);
        assertFalse(deletedMonitorAlertGuard.isDeleted(0L));
    }

    private static SingleAlert firingAlert(Long id, String fingerprint, String monitorId) {
        Map<String, String> labels = new HashMap<>();
        labels.put(CommonConstants.LABEL_MONITOR_ID, monitorId);
        return SingleAlert.builder()
                .id(id)
                .fingerprint(fingerprint)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(labels)
                .build();
    }

    private static GroupAlert firingGroup(Map<String, String> commonLabels, List<String> fingerprints) {
        return GroupAlert.builder()
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .commonLabels(commonLabels)
                .alertFingerprints(fingerprints)
                .build();
    }
}
