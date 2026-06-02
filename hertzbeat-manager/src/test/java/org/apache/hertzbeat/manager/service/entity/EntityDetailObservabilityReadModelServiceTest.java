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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityAlertSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityObservabilityDetailBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntitySignalEvidenceBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusPageSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityTriageRecommendation;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity detail observability assembly read model.
 */
@ExtendWith(MockitoExtension.class)
class EntityDetailObservabilityReadModelServiceTest {

    @InjectMocks
    private EntityDetailObservabilityReadModelService entityDetailObservabilityReadModelService;

    @Mock
    private EntityDetailReadModelService entityDetailReadModelService;
    @Mock
    private EntityStatusRefreshService entityStatusRefreshService;
    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;
    @Mock
    private EntityObservabilityGateway entityObservabilityGateway;
    @Mock
    private EntityResponseHandoffReadModelService entityResponseHandoffReadModelService;
    @Mock
    private EntityNoiseControlReadModelService entityNoiseControlReadModelService;
    @Mock
    private EntityActivityReadModelService entityActivityReadModelService;

    @Test
    void buildEntityDetailAssemblesRealEvidenceAndHandoffContext() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(501L)
                .name("checkout-api")
                .type("service")
                .workspaceId("team-a")
                .owner("catalog-oncall")
                .build();
        EntityIdentity serviceIdentity = EntityIdentity.builder()
                .entityId(501L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .priority(100)
                .build();
        EntityRelation relation = EntityRelation.builder()
                .sourceEntityId(501L)
                .targetEntityId(601L)
                .relationType("depends_on")
                .build();
        EntityDto entityDto = new EntityDto();
        entityDto.setEntity(entity);
        entityDto.setIdentities(List.of(serviceIdentity));
        entityDto.setRelations(List.of(relation));
        Monitor monitor = Monitor.builder()
                .id(701L)
                .app("springboot3")
                .name("checkout monitor")
                .instance("checkout.default.svc.cluster.local")
                .status((byte) 2)
                .build();
        List<Monitor> monitors = List.of(monitor);
        SingleAlert activeAlert = SingleAlert.builder()
                .id(801L)
                .content("checkout-api is down")
                .status("firing")
                .labels(Map.of("severity", "critical"))
                .build();
        List<SingleAlert> activeAlerts = List.of(activeAlert);
        EntityStatusInfo statusInfo = new EntityStatusInfo(
                "critical", "active alert", 1, 0, 1, 0, 1, LocalDateTime.now());
        List<EntityLogQueryHint> initialLogHints = List.of(new EntityLogQueryHint(
                "resource", Map.of("service.name", "checkout-api"), List.of("checkout-api"),
                null, null, "checkout-api", null, "prod", null, null));
        EntityEvidenceSummaryInfo evidenceSummary = new EntityEvidenceSummaryInfo(1, 1, 0, 1, 1, 123L);
        EntityAlertSummaryInfo alertSummary = new EntityAlertSummaryInfo(
                1, List.of(activeAlert), Map.of("critical", 1L), 456L);
        EntityMonitorSummaryInfo monitorSummary = new EntityMonitorSummaryInfo(
                1, Map.of("springboot3", 1L), Map.of("down", 1L), Collections.emptyList(), 456L);
        EntityLogSummaryInfo initialLogSummary = new EntityLogSummaryInfo(
                1, "otel-resource", "resource", Map.of("service.name", "checkout-api"),
                List.of("checkout-api"), "checkout-api");
        EntityTraceSummaryDto traceSummary = new EntityTraceSummaryDto(2, 1, 987L, true, "trace-1");
        List<EntityTraceQueryHintDto> traceQueryHints = List.of(new EntityTraceQueryHintDto(
                "trace", Map.of("service.name", "checkout-api"), List.of("checkout-api"),
                "trace-1", "span-1", "checkout-api", null, "prod", null, null));
        EntityLogSummaryInfo enrichedLogSummary = new EntityLogSummaryInfo(
                2, "trace-correlated", "trace", Map.of("trace_id", "trace-1"),
                List.of("trace-1"), "trace-1");
        List<EntityLogQueryHint> enrichedLogHints = List.of(new EntityLogQueryHint(
                "trace log", Map.of("trace_id", "trace-1"), List.of("trace-1"),
                "trace-1", "span-1", "checkout-api", null, "prod", null, null));
        EntityUnifiedEvidenceSummary unifiedSummary = new EntityUnifiedEvidenceSummary(
                2, true, true, false, 1, 1, 0, 987L, List.of("metrics", "logs"));
        EntityTriageRecommendation triage = new EntityTriageRecommendation(
                "evidence", "metrics", "Metrics first", "Down monitor", "active alert", "查看监控", 987L);
        List<org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence> metricEvidence =
                Collections.emptyList();
        List<org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence> logEvidence =
                Collections.emptyList();
        List<org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence> traceEvidence =
                Collections.emptyList();
        EntityObservabilityDetailBundle detailBundle = new EntityObservabilityDetailBundle(
                traceSummary, traceQueryHints, enrichedLogSummary, enrichedLogHints, metricEvidence, logEvidence, traceEvidence,
                unifiedSummary, triage);
        EntityOpsSummaryInfo opsSummary = new EntityOpsSummaryInfo(true, false, true, true, true, 80);
        List<EntityNextActionInfo> nextActions = List.of(new EntityNextActionInfo(
                "review_alerts", "Review alerts", "Active alert", "Open alerts", 1));
        EntityStatusPageSummaryInfo statusPageSummary = new EntityStatusPageSummaryInfo(true, 1, 654L, false);
        EntityResponseHandoffInfo alertHandoff = new EntityResponseHandoffInfo();
        alertHandoff.setReturnTo("/entities/501");
        alertHandoff.setSeverity("critical");
        EntityResponseHandoffsInfo handoffs = new EntityResponseHandoffsInfo();
        handoffs.setAlerts(alertHandoff);
        EntityDetailDto.EntityNoiseControlSummaryInfo noiseSummary =
                new EntityDetailDto.EntityNoiseControlSummaryInfo(1, 0, Collections.emptyList(),
                        Collections.emptyList(), false);
        List<EntityDefinitionActivityInfo> definitionActivities = List.of(new EntityDefinitionActivityInfo(
                901L, 501L, "definition_update", "yaml", "success",
                "Definition updated", "service: checkout-api", "operator", LocalDateTime.now()));

        EntityStatusRefreshService.EntityRuntimeStatusEvidence runtimeEvidence =
                new EntityStatusRefreshService.EntityRuntimeStatusEvidence(monitors, activeAlerts, statusInfo);
        when(entityStatusRefreshService.refreshEntityStatusWithEvidence(entity, "team-a")).thenReturn(runtimeEvidence);
        when(entityObservabilityGateway.buildEntityLogQueryHints(entityDto.getIdentities(), monitors))
                .thenReturn(initialLogHints);
        when(entityObservabilityGateway.buildEntityEvidenceSummary(
                any(ObserveEntity.class), same(statusInfo), eq(1L), eq(1), same(monitors), same(activeAlerts)))
                .thenReturn(evidenceSummary);
        when(entityObservabilityGateway.buildEntityAlertSummary(activeAlerts)).thenReturn(alertSummary);
        when(entityObservabilityGateway.buildEntityMonitorSummary(monitors)).thenReturn(monitorSummary);
        when(entityObservabilityGateway.buildEntityLogSummary(initialLogHints)).thenReturn(initialLogSummary);
        when(entityObservabilityGateway.resolveEntityDetailBundle(
                any(ObservedEntityContext.class),
                same(statusInfo),
                same(evidenceSummary),
                same(monitorSummary),
                same(initialLogSummary),
                same(monitors),
                same(initialLogHints))).thenReturn(detailBundle);
        when(entityObservabilityGateway.buildEntityOpsSummary(any(ObserveEntity.class), eq(1L), same(evidenceSummary)))
                .thenReturn(opsSummary);
        when(entityObservabilityGateway.buildEntityNextActions(
                any(ObserveEntity.class), same(evidenceSummary), same(enrichedLogSummary), same(opsSummary)))
                .thenReturn(nextActions);
        when(entityObservabilityGateway.buildEntityStatusPageSummary(any(ObserveEntity.class), same(opsSummary)))
                .thenReturn(statusPageSummary);
        when(entityResponseHandoffReadModelService.buildResponseHandoffs(
                eq(501L), any(ObservedEntityContext.class), same(activeAlerts), same(monitors),
                any(EntitySignalEvidenceBundle.class), same(opsSummary))).thenReturn(handoffs);
        when(entityNoiseControlReadModelService.buildNoiseControlSummary(
                same(entityDto), same(monitors), same(activeAlerts), eq("team-a")))
                .thenReturn(noiseSummary);
        when(entityActivityReadModelService.getDefinitionActivities(501L, 12, "team-a"))
                .thenReturn(definitionActivities);

        EntityDetailDto detail = entityDetailObservabilityReadModelService.buildEntityDetail(entityDto, "team-a");

        assertSame(entityDto, detail.getEntity());
        assertSame(statusInfo, detail.getStatus());
        assertSame(evidenceSummary, detail.getEvidenceSummary());
        assertSame(alertSummary, detail.getAlertSummary());
        assertSame(monitorSummary, detail.getMonitorSummary());
        assertSame(enrichedLogSummary, detail.getLogSummary());
        assertSame(traceSummary, detail.getTraceSummary());
        assertEquals(enrichedLogSummary, detail.getSignalEvidence().getLogSummary());
        assertEquals(traceSummary, detail.getSignalEvidence().getTraceSummary());
        assertSame(unifiedSummary, detail.getUnifiedEvidenceSummary());
        assertSame(triage, detail.getTriageRecommendation());
        assertSame(opsSummary, detail.getOpsSummary());
        assertSame(nextActions, detail.getNextActions());
        assertSame(statusPageSummary, detail.getStatusPageSummary());
        assertSame(handoffs, detail.getResponseHandoffs());
        assertSame(noiseSummary, detail.getNoiseControlSummary());
        assertEquals(701L, detail.getBoundMonitors().getFirst().getId());
        assertSame(activeAlert, detail.getActiveAlerts().getFirst());
        assertSame(enrichedLogHints, detail.getLogQueryHints());
        assertSame(traceQueryHints, detail.getTraceQueryHints());
        assertSame(definitionActivities, detail.getDefinitionActivities());
        verify(entityResponseHandoffReadModelService).buildResponseHandoffs(
                eq(501L), any(ObservedEntityContext.class), same(activeAlerts), same(monitors),
                org.mockito.ArgumentMatchers.argThat(bundle ->
                        bundle != null
                                && bundle.getLogSummary() == enrichedLogSummary
                                && bundle.getTraceSummary() == traceSummary
                                && bundle.getMetricEvidence() == metricEvidence
                                && bundle.getLogEvidence() == logEvidence
                                && bundle.getTraceEvidence() == traceEvidence
                                && bundle.getLogQueryHints() == enrichedLogHints
                                && bundle.getTraceQueryHints() == traceQueryHints
                                && bundle.getUnifiedEvidenceSummary() == unifiedSummary
                                && bundle.getTriageRecommendation() == triage),
                same(opsSummary));
    }

    @Test
    void buildEntityDetailByIdReturnsNullWhenEntityReadModelHasNoAccessibleEntity() {
        when(entityDetailReadModelService.loadEntityDto(501L)).thenReturn(null);

        assertNull(entityDetailObservabilityReadModelService.buildEntityDetail(501L));

        verify(entityDetailReadModelService).loadEntityDto(501L);
        verifyNoInteractions(entityStatusRefreshService, entityObservabilityGateway,
                entityResponseHandoffReadModelService, entityNoiseControlReadModelService,
                entityActivityReadModelService, entityWorkspaceAccessService);
    }

    @Test
    void buildEntityDetailReturnsNullWithoutEvidenceLookupWhenEntityIsMissing() {
        assertNull(entityDetailObservabilityReadModelService.buildEntityDetail(null, "team-a"));
        verifyNoInteractions(entityStatusRefreshService, entityObservabilityGateway,
                entityResponseHandoffReadModelService, entityNoiseControlReadModelService,
                entityActivityReadModelService);
    }
}
