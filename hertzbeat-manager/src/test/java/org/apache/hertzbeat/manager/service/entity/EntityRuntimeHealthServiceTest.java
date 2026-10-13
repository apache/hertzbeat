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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity runtime health component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityRuntimeHealthServiceTest {

    @InjectMocks
    private EntityRuntimeHealthService runtimeHealthService;

    @Mock
    private EntityRuntimeHealthWriteModelService entityRuntimeHealthWriteModelService;

    @Test
    void refreshEntityStatusUsesFiringAlertsAsCriticalEvidenceAndPersistsChangedStatus() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(11L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .build();
        List<Monitor> monitors = List.of(
                Monitor.builder().id(101L).status(CommonConstants.MONITOR_UP_CODE).build(),
                Monitor.builder().id(102L).status(CommonConstants.MONITOR_DOWN_CODE).build(),
                Monitor.builder().id(103L).status(CommonConstants.MONITOR_PAUSED_CODE).build()
        );
        List<SingleAlert> activeAlerts = List.of(
                SingleAlert.builder().id(201L).status(CommonConstants.ALERT_STATUS_FIRING).build(),
                SingleAlert.builder().id(202L).status(CommonConstants.ALERT_STATUS_FIRING).build()
        );

        EntityStatusInfo statusInfo = runtimeHealthService.refreshEntityStatus(entity, monitors, activeAlerts);

        assertEquals("critical", statusInfo.getStatus());
        assertEquals("2 firing alerts", statusInfo.getReason());
        assertEquals(3, statusInfo.getMonitorTotal());
        assertEquals(1, statusInfo.getMonitorUpCount());
        assertEquals(1, statusInfo.getMonitorDownCount());
        assertEquals(1, statusInfo.getMonitorPausedCount());
        assertEquals(2, statusInfo.getActiveAlertCount());
        assertNotNull(statusInfo.getEvaluatedAt());
        verify(entityRuntimeHealthWriteModelService).persistStatus(entity, "critical");
    }

    @Test
    void refreshEntityStatusUsesDownMonitorsAsDegradedWhenNoAlerts() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(12L)
                .type("host")
                .name("worker-01")
                .status("healthy")
                .build();
        List<Monitor> monitors = List.of(
                Monitor.builder().id(111L).status(CommonConstants.MONITOR_UP_CODE).build(),
                Monitor.builder().id(112L).status(CommonConstants.MONITOR_DOWN_CODE).build()
        );

        EntityStatusInfo statusInfo = runtimeHealthService.refreshEntityStatus(entity, monitors, Collections.emptyList());

        assertEquals("degraded", statusInfo.getStatus());
        assertEquals("1 monitors down", statusInfo.getReason());
        assertEquals(2, statusInfo.getMonitorTotal());
        assertEquals(1, statusInfo.getMonitorUpCount());
        assertEquals(1, statusInfo.getMonitorDownCount());
        assertEquals(0, statusInfo.getActiveAlertCount());
        verify(entityRuntimeHealthWriteModelService).persistStatus(entity, "degraded");
    }

    @Test
    void refreshEntityStatusDoesNotPersistWhenHealthyStatusIsUnchanged() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(13L)
                .type("service")
                .name("catalog-api")
                .status("healthy")
                .build();
        List<Monitor> monitors = List.of(
                Monitor.builder().id(121L).status(CommonConstants.MONITOR_UP_CODE).build(),
                Monitor.builder().id(122L).status(CommonConstants.MONITOR_UP_CODE).build()
        );

        EntityStatusInfo statusInfo = runtimeHealthService.refreshEntityStatus(entity, monitors, null);

        assertEquals("healthy", statusInfo.getStatus());
        assertEquals("2 monitors healthy", statusInfo.getReason());
        assertEquals(2, statusInfo.getMonitorUpCount());
        assertEquals(0, statusInfo.getActiveAlertCount());
        verify(entityRuntimeHealthWriteModelService, never()).persistStatus(entity, "healthy");
    }

    @Test
    void refreshEntityStatusKeepsAllPausedMonitorsPaused() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(14L)
                .type("service")
                .name("paused-job")
                .status("unknown")
                .build();
        List<Monitor> monitors = List.of(
                Monitor.builder().id(131L).status(CommonConstants.MONITOR_PAUSED_CODE).build(),
                Monitor.builder().id(132L).status(CommonConstants.MONITOR_PAUSED_CODE).build()
        );

        EntityStatusInfo statusInfo = runtimeHealthService.refreshEntityStatus(entity, monitors, Collections.emptyList());

        assertEquals("paused", statusInfo.getStatus());
        assertEquals("all bound monitors paused", statusInfo.getReason());
        assertEquals(2, statusInfo.getMonitorPausedCount());
        verify(entityRuntimeHealthWriteModelService).persistStatus(entity, "paused");
    }

    @Test
    void refreshEntityStatusKeepsNoEvidenceUnknownWithoutFakeHealth() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(15L)
                .type("service")
                .name("unbound-service")
                .status("unknown")
                .build();

        EntityStatusInfo statusInfo = runtimeHealthService.refreshEntityStatus(entity, Collections.emptyList(), null);

        assertEquals("unknown", statusInfo.getStatus());
        assertEquals("no live evidence bound yet", statusInfo.getReason());
        assertEquals(0, statusInfo.getMonitorTotal());
        assertEquals(0, statusInfo.getActiveAlertCount());
        verify(entityRuntimeHealthWriteModelService, never()).persistStatus(entity, "unknown");
    }
}
