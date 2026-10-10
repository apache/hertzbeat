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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.impl.AlertServiceImpl;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Test case for {@link AlertService}
*/
@ExtendWith(MockitoExtension.class)
class AlertServiceTest {
    private static final String WORKSPACE_ID = AuthTokenScopes.DEFAULT_WORKSPACE_ID;
    @Mock
    private GroupAlertDao groupAlertDao;

    @Mock
    private SingleAlertDao singleAlertDao;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @Mock
    private AlertGroupMutationPublisher alertGroupMutationPublisher;

    @InjectMocks
    private AlertServiceImpl alertService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void deleteGroupAlerts() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);
        List<GroupAlert> groupAlerts = List.of(
                GroupAlert.builder().id(1L).alertFingerprints(List.of()).build(),
                GroupAlert.builder().id(2L).alertFingerprints(List.of()).build());
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids)).thenReturn(groupAlerts);

        assertDoesNotThrow(() -> alertService.deleteGroupAlerts(WORKSPACE_ID, ids));

        verify(groupAlertDao, times(1)).deleteGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids);
    }

    @Test
    void deleteGroupAlertsRejectsPartialMissingTargetsBeforeDeletes() {
        HashSet<Long> ids = new HashSet<>(List.of(1L, 2L));
        GroupAlert existingAlert = GroupAlert.builder()
                .id(1L)
                .alertFingerprints(List.of("private-alert-fingerprint"))
                .build();
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids)).thenReturn(List.of(existingAlert));
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertThrows(AlertGroupNotFoundException.class, () -> alertService.deleteGroupAlerts(WORKSPACE_ID, ids));

            assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
            verify(groupAlertDao, never()).deleteGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids);
            verifyNoInteractions(singleAlertDao);
            verifyNoInteractions(alertGroupMutationPublisher);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void deleteGroupAlertsRequestsTombstoneAfterExactDelete() {
        HashSet<Long> ids = new HashSet<>(List.of(2L, 1L));
        List<GroupAlert> groupAlerts = List.of(
                GroupAlert.builder().id(1L).alertFingerprints(List.of()).build(),
                GroupAlert.builder().id(2L).alertFingerprints(List.of()).build());
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids)).thenReturn(groupAlerts);
        alertService.deleteGroupAlerts(WORKSPACE_ID, ids);

        verify(groupAlertDao).deleteGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids);
        verify(alertGroupMutationPublisher).publishDeleted(WORKSPACE_ID, ids);
    }

    @Test
    void editGroupAlertStatus() {
        String status = "firing";
        List<Long> ids = List.of(1L, 2L, 3L);
        GroupAlert groupAlert = GroupAlert.builder()
                .id(1L)
                .status(CommonConstants.ALERT_STATUS_RESOLVED)
                .alertFingerprints(List.of("fingerprint-1"))
                .build();
        GroupAlert secondGroupAlert = GroupAlert.builder()
                .id(2L)
                .status(CommonConstants.ALERT_STATUS_RESOLVED)
                .alertFingerprints(List.of())
                .build();
        GroupAlert thirdGroupAlert = GroupAlert.builder()
                .id(3L)
                .status(CommonConstants.ALERT_STATUS_RESOLVED)
                .alertFingerprints(List.of())
                .build();
        List<GroupAlert> groupAlerts = List.of(groupAlert, secondGroupAlert, thirdGroupAlert);
        SingleAlert singleAlert = SingleAlert.builder()
                .id(1L)
                .fingerprint("fingerprint-1")
                .status(CommonConstants.ALERT_STATUS_RESOLVED)
                .endAt(1L)
                .build();
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids)).thenReturn(groupAlerts);
        when(singleAlertDao.findSingleAlertsByWorkspaceIdAndFingerprintIn(WORKSPACE_ID,
                List.of("fingerprint-1"))).thenReturn(List.of(singleAlert));

        assertDoesNotThrow(() -> alertService.editGroupAlertStatus(WORKSPACE_ID, status, ids));
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, groupAlert.getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, singleAlert.getStatus());
        assertNull(singleAlert.getEndAt());
        verify(groupAlertDao, times(1)).saveAll(groupAlerts);
        verify(singleAlertDao, times(1)).saveAll(List.of(singleAlert));
    }

    @Test
    void editGroupAlertStatusToResolved() {
        List<Long> ids = List.of(1L);
        GroupAlert groupAlert = GroupAlert.builder()
                .id(1L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .alertFingerprints(List.of("fingerprint-2"))
                .build();
        SingleAlert singleAlert = SingleAlert.builder()
                .id(2L)
                .fingerprint("fingerprint-2")
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .activeAt(123L)
                .build();
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids)).thenReturn(List.of(groupAlert));
        when(singleAlertDao.findSingleAlertsByWorkspaceIdAndFingerprintIn(WORKSPACE_ID,
                List.of("fingerprint-2"))).thenReturn(List.of(singleAlert));

        assertDoesNotThrow(() -> alertService.editGroupAlertStatus(
                WORKSPACE_ID, CommonConstants.ALERT_STATUS_RESOLVED, ids));

        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, groupAlert.getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, singleAlert.getStatus());
        assertNull(singleAlert.getActiveAt());
        verify(groupAlertDao, times(1)).saveAll(List.of(groupAlert));
        verify(singleAlertDao, times(1)).saveAll(List.of(singleAlert));
    }

    @Test
    void editGroupAlertStatusToAcknowledged() {
        List<Long> ids = List.of(1L);
        GroupAlert groupAlert = GroupAlert.builder()
                .id(1L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .alertFingerprints(List.of("fingerprint-3"))
                .build();
        SingleAlert singleAlert = SingleAlert.builder()
                .id(3L)
                .fingerprint("fingerprint-3")
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .activeAt(456L)
                .build();
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids)).thenReturn(List.of(groupAlert));
        when(singleAlertDao.findSingleAlertsByWorkspaceIdAndFingerprintIn(WORKSPACE_ID,
                List.of("fingerprint-3"))).thenReturn(List.of(singleAlert));

        assertDoesNotThrow(() -> alertService.editGroupAlertStatus(WORKSPACE_ID, "acknowledged", ids));

        assertEquals("acknowledged", groupAlert.getStatus());
        assertEquals("acknowledged", singleAlert.getStatus());
        assertEquals(456L, singleAlert.getActiveAt());
        assertNull(singleAlert.getEndAt());
        verify(groupAlertDao, times(1)).saveAll(List.of(groupAlert));
        verify(singleAlertDao, times(1)).saveAll(List.of(singleAlert));
    }

    @Test
    void editGroupAlertStatusRejectsPartialMissingTargetsBeforeWrites() {
        List<Long> ids = List.of(1L, 2L);
        GroupAlert existingAlert = GroupAlert.builder()
                .id(1L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .alertFingerprints(List.of("fingerprint-1"))
                .build();
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids)).thenReturn(List.of(existingAlert));
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertThrows(AlertGroupNotFoundException.class,
                    () -> alertService.editGroupAlertStatus(
                            WORKSPACE_ID, CommonConstants.ALERT_STATUS_RESOLVED, ids));

            assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
            verify(groupAlertDao, never()).saveAll(anyList());
            verifyNoInteractions(singleAlertDao);
            verifyNoInteractions(alertGroupMutationPublisher);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void editGroupAlertStatusRequestsRefreshAfterExactWrites() {
        List<Long> ids = List.of(2L, 1L, 2L);
        List<GroupAlert> groupAlerts = List.of(
                GroupAlert.builder().id(1L).alertFingerprints(List.of()).build(),
                GroupAlert.builder().id(2L).alertFingerprints(List.of()).build());
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, List.of(2L, 1L)))
                .thenReturn(groupAlerts);
        alertService.editGroupAlertStatus(WORKSPACE_ID, CommonConstants.ALERT_STATUS_ACKNOWLEDGED, ids);

        verify(groupAlertDao).saveAll(groupAlerts);
        verify(alertGroupMutationPublisher).publishStatusChanged(
                WORKSPACE_ID, List.of(2L, 1L), CommonConstants.ALERT_STATUS_ACKNOWLEDGED);
    }

    @Test
    void editGroupAlertStatusRemainsIdempotentWhenStatusAlreadyApplied() {
        List<Long> ids = List.of(1L);
        GroupAlert groupAlert = GroupAlert.builder()
                .id(1L)
                .status(CommonConstants.ALERT_STATUS_ACKNOWLEDGED)
                .alertFingerprints(List.of())
                .build();
        when(groupAlertDao.findGroupAlertsByWorkspaceIdAndIdIn(WORKSPACE_ID, ids)).thenReturn(List.of(groupAlert));

        assertDoesNotThrow(() -> alertService.editGroupAlertStatus(
                WORKSPACE_ID, CommonConstants.ALERT_STATUS_ACKNOWLEDGED, ids));

        assertEquals(CommonConstants.ALERT_STATUS_ACKNOWLEDGED, groupAlert.getStatus());
        verify(groupAlertDao).saveAll(List.of(groupAlert));
        verifyNoInteractions(singleAlertDao);
    }

    @Test
    void editGroupAlertStatusRejectsUnsupportedStatusBeforeQueriesOrWrites() {
        assertThrows(AlertGroupStatusNotSupportedException.class,
                () -> alertService.editGroupAlertStatus(WORKSPACE_ID, "private-arbitrary-status", List.of(1L)));

        verifyNoInteractions(groupAlertDao, singleAlertDao);
    }

    @Test
    void editSingleAlertStatusRejectsPartialConcurrentWrite() {
        List<Long> ids = List.of(1L, 2L);
        when(singleAlertDao.findAllByWorkspaceIdAndIdInForUpdate(WORKSPACE_ID, ids)).thenReturn(List.of(
                SingleAlert.builder().id(1L).build(),
                SingleAlert.builder().id(2L).build()));
        when(singleAlertDao.updateSingleAlertsStatus(WORKSPACE_ID, CommonConstants.ALERT_STATUS_RESOLVED, ids))
                .thenReturn(1);

        assertThrows(AlertGroupNotFoundException.class, () -> alertService.editSingleAlertStatus(
                WORKSPACE_ID, CommonConstants.ALERT_STATUS_RESOLVED, ids));

        verify(singleAlertDao).findAllByWorkspaceIdAndIdInForUpdate(WORKSPACE_ID, ids);
        verify(singleAlertDao).updateSingleAlertsStatus(WORKSPACE_ID, CommonConstants.ALERT_STATUS_RESOLVED, ids);
    }

    @Test
    void getGroupAlertsFiltersByServiceNamespaceAndEnvironmentLabels() {
        GroupAlert matching = GroupAlert.builder()
                .id(1L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .commonLabels(Map.of(
                        "service.name", "checkout",
                        "service.namespace", "payments",
                        "deployment.environment.name", "prod"))
                .alertFingerprints(List.of("fingerprint-1"))
                .build();
        GroupAlert wrongNamespace = GroupAlert.builder()
                .id(2L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .commonLabels(Map.of(
                        "service.name", "checkout",
                        "service.namespace", "orders",
                        "deployment.environment.name", "prod"))
                .alertFingerprints(List.of("fingerprint-2"))
                .build();
        GroupAlert wrongEnvironment = GroupAlert.builder()
                .id(3L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .commonLabels(Map.of(
                        "service.name", "checkout",
                        "service.namespace", "payments",
                        "deployment.environment.name", "stage"))
                .alertFingerprints(List.of("fingerprint-3"))
                .build();
        when(groupAlertDao.findAll(Mockito.<Specification<GroupAlert>>any(), Mockito.any(Sort.class)))
                .thenReturn(List.of(matching, wrongNamespace, wrongEnvironment));
        when(singleAlertDao.findSingleAlertsByWorkspaceIdAndFingerprintIn(WORKSPACE_ID,
                List.of("fingerprint-1"))).thenReturn(List.of());

        Page<GroupAlert> result = alertService.getGroupAlerts(
                WORKSPACE_ID,
                CommonConstants.ALERT_STATUS_FIRING,
                null,
                null,
                "checkout",
                "payments",
                "prod",
                "gmtUpdate",
                "desc",
                0,
                8);

        assertEquals(1, result.getTotalElements());
        assertEquals(1L, result.getContent().get(0).getId());
        verify(groupAlertDao, times(1)).findAll(Mockito.<Specification<GroupAlert>>any(), Mockito.any(Sort.class));
    }

    @Test
    void testGetAlertsSummary() {
        SingleAlert alert = new SingleAlert();
        alert.setLabels(Collections.singletonMap(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL));

        when(singleAlertDao.querySingleAlertsByWorkspaceIdAndStatus(
                WORKSPACE_ID, CommonConstants.ALERT_STATUS_FIRING)).thenReturn(Collections.singletonList(alert));
        when(singleAlertDao.countByWorkspaceId(WORKSPACE_ID)).thenReturn(10L);

        AlertSummary summary = alertService.getAlertsSummary(WORKSPACE_ID);

        assertNotNull(summary);
        assertEquals(1, summary.getPriorityCriticalNum());
        assertEquals(0, summary.getPriorityEmergencyNum());
        assertEquals(0, summary.getPriorityWarningNum());
        assertEquals(10L, summary.getTotal());
        assertEquals(90.0f, summary.getRate());

        verify(singleAlertDao, times(1)).querySingleAlertsByWorkspaceIdAndStatus(
                WORKSPACE_ID, CommonConstants.ALERT_STATUS_FIRING);
        verify(singleAlertDao, times(1)).countByWorkspaceId(WORKSPACE_ID);
    }

}
