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
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity activity write-model component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityActivityWriteModelServiceTest {

    @InjectMocks
    private EntityActivityWriteModelService activityWriteModelService;

    @Mock
    private EntityActivityRecordWriteModelService entityActivityRecordWriteModelService;

    @Mock
    private EntityMonitorBindService entityMonitorBindService;

    @Test
    void recordDefinitionActivityDelegatesRequestWorkspaceAndSuccessDetail() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(11L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .workspaceId("team-b")
                .build();

        activityWriteModelService.recordDefinitionActivity(
                11L, "definition_import", "json", entity, "team-a");

        verify(entityActivityRecordWriteModelService).recordActivity(
                11L,
                "definition_import",
                "json",
                "success",
                "Definition imported",
                "service: Checkout API",
                entity,
                "team-a");
    }

    @Test
    void recordDefinitionActivityFailureDelegatesStoredWorkspaceFallbackToRecordBoundary() {
        activityWriteModelService.recordDefinitionActivityFailure(
                12L, "definition_update", "yaml",
                new IllegalArgumentException("Entity name can not be blank"), null);

        verify(entityActivityRecordWriteModelService).recordActivity(
                eq(12L),
                eq("definition_update"),
                eq("yaml"),
                eq("error"),
                eq("Definition update failed"),
                eq("Entity name can not be blank"),
                isNull(),
                isNull());
    }

    @Test
    void resolveModifyLifecycleActivityTypeDetectsTelemetryDiscoveryBindAndRecordsEvidence() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(31L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .source("manual")
                .owner("team-commerce")
                .workspaceId("team-a")
                .build();
        EntityMonitorBind telemetryBind = EntityMonitorBind.builder()
                .monitorId(301L)
                .bindSource("telemetry_discovery")
                .build();
        when(entityMonitorBindService.countMonitorBinds(31L)).thenReturn(2L);

        String activityType = activityWriteModelService.resolveModifyLifecycleActivityType(
                entity, entity, Collections.emptyList(), List.of(telemetryBind));

        assertEquals("discovery_governance", activityType);

        activityWriteModelService.recordEntityLifecycleActivity(31L, activityType, entity, "team-a");

        verify(entityActivityRecordWriteModelService).recordActivity(
                eq(31L),
                eq("discovery_governance"),
                isNull(),
                eq("success"),
                eq("Telemetry discovery applied"),
                argThat(detail -> detail.contains("service: Checkout API")
                        && detail.contains("evidence: 2 monitor binds")),
                eq(entity),
                eq("team-a"));
    }

    @Test
    void resolveModifyLifecycleActivityTypeLoadsCurrentBindsBeforeComparingNextBinds() {
        ObserveEntity current = ObserveEntity.builder()
                .id(61L)
                .source("manual")
                .build();
        ObserveEntity update = ObserveEntity.builder()
                .id(61L)
                .source("manual")
                .build();
        EntityMonitorBind existingTelemetryBind = EntityMonitorBind.builder()
                .monitorId(601L)
                .bindSource("telemetry_discovery")
                .build();
        EntityMonitorBind retainedTelemetryBind = EntityMonitorBind.builder()
                .monitorId(601L)
                .bindSource("telemetry_discovery")
                .build();
        EntityMonitorBind addedTelemetryBind = EntityMonitorBind.builder()
                .monitorId(602L)
                .bindSource("telemetry_discovery")
                .build();
        when(entityMonitorBindService.findMonitorBinds(61L)).thenReturn(List.of(existingTelemetryBind));

        String activityType = activityWriteModelService.resolveModifyLifecycleActivityType(
                current, update, List.of(retainedTelemetryBind, addedTelemetryBind));

        assertEquals("discovery_governance", activityType);
        verify(entityMonitorBindService).findMonitorBinds(61L);
    }

    @Test
    void resolveCreateLifecycleActivityTypeTreatsOtelResourceSourceAsDiscovery() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(41L)
                .type("service")
                .name("payment-api")
                .source("otel_resource")
                .build();
        EntityDto entityDto = new EntityDto();
        entityDto.setEntity(entity);
        entityDto.setMonitorBinds(Collections.emptyList());

        assertEquals("discovery_governance",
                activityWriteModelService.resolveCreateLifecycleActivityType(entityDto));
    }
}
