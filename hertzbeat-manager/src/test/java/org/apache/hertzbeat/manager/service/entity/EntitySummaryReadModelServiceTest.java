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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity list summary read-model component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntitySummaryReadModelServiceTest {

    @InjectMocks
    private EntitySummaryReadModelService summaryReadModelService;

    @Mock
    private EntityActivityReadModelService entityActivityReadModelService;

    @Mock
    private EntityIdentityReadModelService entityIdentityReadModelService;

    @Mock
    private EntityMonitorBindService entityMonitorBindService;

    @Mock
    private EntityRelationService entityRelationService;

    @Mock
    private EntityObservabilityGateway entityObservabilityGateway;

    @Test
    void buildEntitySummaryKeepsRealCountsGatewayReadinessAndDefinitionActivity() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(301L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .status("critical")
                .build();
        EntityStatusInfo statusInfo = new EntityStatusInfo(
                "critical", "1 firing alerts", 2, 1, 1, 0, 1, LocalDateTime.now()
        );
        List<Monitor> monitors = List.of(
                Monitor.builder().id(701L).name("checkout-up").build(),
                Monitor.builder().id(702L).name("checkout-down").build()
        );
        EntityDefinitionActivity latestActivity = EntityDefinitionActivity.builder()
                .entityId(301L)
                .activityType("definition_update")
                .format("yaml")
                .status("success")
                .summary("Definition updated")
                .gmtCreate(LocalDateTime.of(2026, 5, 10, 2, 30))
                .build();
        when(entityIdentityReadModelService.countIdentities(301L)).thenReturn(2L);
        when(entityMonitorBindService.countMonitorBinds(301L)).thenReturn(3L);
        when(entityRelationService.countEntityRelations(301L)).thenReturn(1L);
        EntityEvidenceSummaryInfo evidenceSummary = new EntityEvidenceSummaryInfo(1, 1, 1, 2, 0, 1778340000000L);
        when(entityObservabilityGateway.buildEntityEvidenceSummary(
                eq(entity), eq(statusInfo), eq(2L), eq(0), eq(monitors), eq(Collections.emptyList())
        )).thenReturn(evidenceSummary);
        EntityOpsSummaryInfo opsSummary = new EntityOpsSummaryInfo(true, true, true, true, true, 100);
        when(entityObservabilityGateway.buildEntityOpsSummary(entity, 1L, evidenceSummary)).thenReturn(opsSummary);
        EntityNextActionInfo nextAction = new EntityNextActionInfo(
                "review_alert", "Review alert", "One alert is firing", "Open alerts", 10
        );
        when(entityObservabilityGateway.buildEntityNextActions(entity, evidenceSummary, null, opsSummary))
                .thenReturn(List.of(nextAction));

        EntitySummaryInfo summary = summaryReadModelService.buildEntitySummary(
                entity, latestActivity, statusInfo, monitors
        );

        assertEquals("checkout-api", summary.getEntity().getName());
        assertEquals(2, summary.getIdentityCount());
        assertEquals(3, summary.getMonitorCount());
        assertEquals(1, summary.getRelationCount());
        assertEquals(1, summary.getActiveAlertCount());
        assertSame(statusInfo, summary.getStatus());
        assertSame(opsSummary, summary.getOpsSummary());
        assertSame(nextAction, summary.getNextAction());
        assertEquals(1778340000000L, summary.getLastEvidenceAt());
        assertEquals("success", summary.getDefinitionActivityStatus());
        assertEquals("Definition updated", summary.getDefinitionActivitySummary());
        assertEquals("yaml", summary.getDefinitionActivityFormat());
        assertEquals(LocalDateTime.of(2026, 5, 10, 2, 30), summary.getDefinitionActivityTime());
    }

    @Test
    void loadLatestDefinitionActivitiesDelegatesLatestDefinitionImportOrUpdateLookup() {
        ObserveEntity firstEntity = ObserveEntity.builder().id(401L).name("checkout-api").build();
        ObserveEntity secondEntity = ObserveEntity.builder().id(402L).name("billing-api").build();
        EntityDefinitionActivity latestDefinitionActivity = EntityDefinitionActivity.builder()
                .id(2L)
                .entityId(401L)
                .activityType("definition_update")
                .summary("Latest definition")
                .build();
        EntityDefinitionActivity secondDefinitionActivity = EntityDefinitionActivity.builder()
                .id(4L)
                .entityId(402L)
                .activityType("definition_import")
                .summary("Second definition")
                .build();
        when(entityActivityReadModelService.findLatestDefinitionActivities(List.of(401L, 402L)))
                .thenReturn(Map.of(
                        401L, latestDefinitionActivity,
                        402L, secondDefinitionActivity
                ));

        Map<Long, EntityDefinitionActivity> latestActivities = summaryReadModelService.loadLatestDefinitionActivities(
                List.of(firstEntity, secondEntity)
        );

        assertEquals(2, latestActivities.size());
        assertSame(latestDefinitionActivity, latestActivities.get(401L));
        assertSame(secondDefinitionActivity, latestActivities.get(402L));
    }

    @Test
    void loadLatestDefinitionActivitiesAvoidsDaoLookupWhenEntitiesAreEmpty() {
        Map<Long, EntityDefinitionActivity> latestActivities = summaryReadModelService.loadLatestDefinitionActivities(List.of());

        assertEquals(Map.of(), latestActivities);
        verify(entityActivityReadModelService, never()).findLatestDefinitionActivities(any());
    }

    @Test
    void loadSummaryCountsBatchesCurrentPageCountEvidence() {
        ObserveEntity firstEntity = ObserveEntity.builder().id(501L).name("checkout-api").build();
        ObserveEntity secondEntity = ObserveEntity.builder().id(502L).name("billing-api").build();
        List<Long> entityIds = List.of(501L, 502L);
        when(entityIdentityReadModelService.countIdentitiesByEntityIds(entityIds))
                .thenReturn(Map.of(501L, 2L, 502L, 1L));
        when(entityMonitorBindService.countMonitorBindsByEntityIds(entityIds))
                .thenReturn(Map.of(501L, 3L));
        when(entityRelationService.countEntityRelationsByEntityIds(entityIds))
                .thenReturn(Map.of(502L, 4L));

        Map<Long, EntitySummaryReadModelService.EntitySummaryCounts> counts =
                summaryReadModelService.loadSummaryCounts(List.of(firstEntity, secondEntity));

        assertEquals(2, counts.size());
        assertEquals(new EntitySummaryReadModelService.EntitySummaryCounts(2, 3, 0), counts.get(501L));
        assertEquals(new EntitySummaryReadModelService.EntitySummaryCounts(1, 0, 4), counts.get(502L));
        verify(entityIdentityReadModelService).countIdentitiesByEntityIds(entityIds);
        verify(entityMonitorBindService).countMonitorBindsByEntityIds(entityIds);
        verify(entityRelationService).countEntityRelationsByEntityIds(entityIds);
    }

    @Test
    void buildEntitySummaryAcceptsPreloadedCountsForListPages() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(601L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .build();
        EntityStatusInfo statusInfo = new EntityStatusInfo(
                "unknown", "no live evidence", 0, 0, 0, 0, 0, LocalDateTime.now()
        );
        EntityEvidenceSummaryInfo evidenceSummary = new EntityEvidenceSummaryInfo(0, 0, 0, 5, 0, 1778340000000L);
        when(entityObservabilityGateway.buildEntityEvidenceSummary(
                eq(entity), eq(statusInfo), eq(5L), eq(0), eq(Collections.emptyList()), eq(Collections.emptyList())
        )).thenReturn(evidenceSummary);
        EntityOpsSummaryInfo opsSummary = new EntityOpsSummaryInfo(true, false, true, true, true, 80);
        when(entityObservabilityGateway.buildEntityOpsSummary(entity, 7L, evidenceSummary)).thenReturn(opsSummary);
        when(entityObservabilityGateway.buildEntityNextActions(entity, evidenceSummary, null, opsSummary))
                .thenReturn(List.of());

        EntitySummaryInfo summary = summaryReadModelService.buildEntitySummary(
                entity,
                null,
                statusInfo,
                List.of(),
                new EntitySummaryReadModelService.EntitySummaryCounts(5, 6, 7)
        );

        assertEquals(5, summary.getIdentityCount());
        assertEquals(6, summary.getMonitorCount());
        assertEquals(7, summary.getRelationCount());
        verify(entityIdentityReadModelService, never()).countIdentities(601L);
        verify(entityMonitorBindService, never()).countMonitorBinds(601L);
        verify(entityRelationService, never()).countEntityRelations(601L);
    }
}
