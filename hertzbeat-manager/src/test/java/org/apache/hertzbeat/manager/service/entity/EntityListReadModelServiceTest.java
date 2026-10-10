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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * Contract for the entity catalog list read-model boundary extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityListReadModelServiceTest {

    @InjectMocks
    private EntityListReadModelService entityListReadModelService;

    @Mock
    private EntityCatalogQueryService entityCatalogQueryService;

    @Mock
    private EntityStatusRefreshService entityStatusRefreshService;

    @Mock
    private EntitySummaryReadModelService entitySummaryReadModelService;

    @Test
    void getEntitiesBuildsWorkspaceScopedSummariesFromRealMonitorAndAlertEvidence() {
        ObserveEntity teamAlpha = ObserveEntity.builder()
                .id(31L)
                .type("service")
                .name("checkout")
                .status("unknown")
                .source("manual")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBeta = ObserveEntity.builder()
                .id(32L)
                .type("service")
                .name("payments")
                .status("unknown")
                .source("manual")
                .workspaceId("team-b")
                .build();
        when(entityCatalogQueryService.findEntityPage(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(),
                any(), any(), anyInt(), anyInt(), any()))
                .thenReturn(new PageImpl<>(List.of(teamAlpha), PageRequest.of(0, 8), 1));
        EntityDefinitionActivity definitionActivity = EntityDefinitionActivity.builder()
                .entityId(31L)
                .activityType("definition_update")
                .summary("Definition updated")
                .build();
        when(entitySummaryReadModelService.loadLatestDefinitionActivities(List.of(teamAlpha)))
                .thenReturn(Map.of(31L, definitionActivity));
        EntitySummaryReadModelService.EntitySummaryCounts summaryCounts =
                new EntitySummaryReadModelService.EntitySummaryCounts(2, 1, 3);
        when(entitySummaryReadModelService.loadSummaryCounts(List.of(teamAlpha)))
                .thenReturn(Map.of(31L, summaryCounts));
        List<Monitor> monitors = List.of(
                Monitor.builder().id(701L).status(CommonConstants.MONITOR_UP_CODE).build()
        );
        EntityStatusInfo statusInfo = new EntityStatusInfo(
                "critical", "1 firing alerts", 1, 1, 0, 0, 1, LocalDateTime.now()
        );
        EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence =
                new EntityStatusRefreshService.EntityRuntimeStatusEvidence(monitors, List.of(), statusInfo);
        when(entityStatusRefreshService.refreshEntityStatusesWithEvidence(List.of(teamAlpha), "team-a"))
                .thenReturn(Map.of(31L, runtimeEvidence));
        EntitySummaryInfo summaryInfo = new EntitySummaryInfo();
        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setId(31L);
        entityInfo.setWorkspaceId("team-a");
        summaryInfo.setEntity(entityInfo);
        when(entitySummaryReadModelService.buildEntitySummary(teamAlpha, definitionActivity, statusInfo, monitors,
                summaryCounts))
                .thenReturn(summaryInfo);

        Page<EntitySummaryInfo> page = entityListReadModelService.getEntities(
                null, "service", null, "checkout", null, null, null, null, null, null,
                "gmtUpdate", "desc", 0, 8, "team-a");

        assertEquals(1, page.getContent().size());
        assertEquals(1, page.getTotalElements());
        assertSame(summaryInfo, page.getContent().getFirst());
        assertEquals(31L, page.getContent().getFirst().getEntity().getId());
        verify(entityCatalogQueryService).findEntityPage(
                eq(null), eq("service"), eq(null), eq("checkout"), eq(null), eq(null), eq(null), eq(null), eq(null),
                eq(null), eq("gmtUpdate"), eq("desc"), eq(0), eq(8), eq("team-a"));
        verify(entitySummaryReadModelService).loadLatestDefinitionActivities(List.of(teamAlpha));
        verify(entitySummaryReadModelService).loadSummaryCounts(List.of(teamAlpha));
        verify(entityStatusRefreshService).refreshEntityStatusesWithEvidence(List.of(teamAlpha), "team-a");
    }

    @Test
    void getEntitiesFallsBackTotalElementsWhenDaoAlreadyReturnsScopedRows() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(41L)
                .type("service")
                .name("catalog")
                .status("unknown")
                .workspaceId("team-a")
                .build();
        when(entityCatalogQueryService.findEntityPage(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(),
                any(), any(), anyInt(), anyInt(), any()))
                .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 10), 42));
        when(entitySummaryReadModelService.loadLatestDefinitionActivities(List.of(entity))).thenReturn(Map.of());
        EntitySummaryReadModelService.EntitySummaryCounts summaryCounts =
                new EntitySummaryReadModelService.EntitySummaryCounts(1, 0, 0);
        when(entitySummaryReadModelService.loadSummaryCounts(List.of(entity))).thenReturn(Map.of(41L, summaryCounts));
        EntityStatusInfo statusInfo = new EntityStatusInfo(
                "unknown", "no live evidence bound yet", 0, 0, 0, 0, 0, LocalDateTime.now()
        );
        EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence =
                new EntityStatusRefreshService.EntityRuntimeStatusEvidence(List.of(), List.of(), statusInfo);
        when(entityStatusRefreshService.refreshEntityStatusesWithEvidence(List.of(entity), "team-a"))
                .thenReturn(Map.of(41L, runtimeEvidence));
        EntitySummaryInfo summaryInfo = new EntitySummaryInfo();
        summaryInfo.setEntity(EntityInfo.fromEntity(entity));
        when(entitySummaryReadModelService.buildEntitySummary(entity, null, statusInfo, List.of(), summaryCounts))
                .thenReturn(summaryInfo);

        Page<EntitySummaryInfo> page = entityListReadModelService.getEntities(
                null, null, null, null, null, null, null, null, null, null,
                "gmtUpdate", "desc", 0, 10, "team-a");

        assertEquals(42, page.getTotalElements());
        assertEquals(41L, page.getContent().getFirst().getEntity().getId());
    }

    @Test
    void getEntitiesCapsOversizedPagesBeforeRuntimeEvidenceFanout() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(51L)
                .type("service")
                .name("scale-proof")
                .status("unknown")
                .build();
        when(entityCatalogQueryService.findEntityPage(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(),
                any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 50), 1993));
        when(entitySummaryReadModelService.loadLatestDefinitionActivities(List.of(entity))).thenReturn(Map.of());
        EntitySummaryReadModelService.EntitySummaryCounts summaryCounts =
                new EntitySummaryReadModelService.EntitySummaryCounts(1, 0, 0);
        when(entitySummaryReadModelService.loadSummaryCounts(List.of(entity))).thenReturn(Map.of(51L, summaryCounts));
        EntityStatusInfo statusInfo = new EntityStatusInfo(
                "unknown", "no live evidence bound yet", 0, 0, 0, 0, 0, LocalDateTime.now()
        );
        EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence =
                new EntityStatusRefreshService.EntityRuntimeStatusEvidence(List.of(), List.of(), statusInfo);
        when(entityStatusRefreshService.refreshEntityStatusesWithEvidence(List.of(entity)))
                .thenReturn(Map.of(51L, runtimeEvidence));
        EntitySummaryInfo summaryInfo = new EntitySummaryInfo();
        summaryInfo.setEntity(EntityInfo.fromEntity(entity));
        when(entitySummaryReadModelService.buildEntitySummary(entity, null, statusInfo, List.of(), summaryCounts))
                .thenReturn(summaryInfo);

        Page<EntitySummaryInfo> page = entityListReadModelService.getEntities(
                null, null, null, null, null, null, null, null, null, null,
                "gmtUpdate", "desc", -4, 1000);

        assertEquals(1993, page.getTotalElements());
        assertEquals(51L, page.getContent().getFirst().getEntity().getId());
        verify(entityCatalogQueryService).findEntityPage(
                eq(null), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null),
                eq("gmtUpdate"), eq("desc"), eq(0), eq(50));
    }
}
