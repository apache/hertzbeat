/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.shared.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.entity.EntityAlertSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityObservabilityDetailBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntitySignalEvidenceBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusPageSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityTriageRecommendation;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsRequest;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.metrics.MetricCorrelationHint;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class EntityObservabilityGatewayImplTest {

    private final TelemetryIntakeServiceImpl telemetryIntakeService = Mockito.mock(TelemetryIntakeServiceImpl.class);
    private final EntityTraceQueryService entityTraceQueryService = Mockito.mock(EntityTraceQueryService.class);
    private final EntityObservabilityGatewayImpl gateway =
            new EntityObservabilityGatewayImpl(telemetryIntakeService, entityTraceQueryService);

    @Test
    void resolveEntityTraceSummaryShouldFallbackToQueryServiceWhenInactive() {
        ObservedEntityContext entityContext = ObservedEntityContext.from(null, Collections.emptyList());
        EntityTraceSummaryDto inactive = new EntityTraceSummaryDto(0, 0, null, false, null);
        EntityTraceSummaryDto active = new EntityTraceSummaryDto(3, 1, 123L, true, "trace-1");
        when(telemetryIntakeService.buildTraceSummary(any())).thenReturn(inactive);
        when(entityTraceQueryService.buildEntityTraceSummary(any())).thenReturn(active);

        EntityTraceSummaryDto summary = gateway.resolveEntityTraceSummary(entityContext);

        assertEquals(active, summary);
        verify(entityTraceQueryService).buildEntityTraceSummary(entityContext);
    }

    @Test
    void resolveEntityTraceQueryHintsShouldFallbackToQueryServiceWhenTelemetryHintsMissing() {
        ObservedEntityContext entityContext = ObservedEntityContext.from(null, Collections.emptyList());
        List<EntityTraceQueryHintDto> hints = List.of(new EntityTraceQueryHintDto(
                "trace-1",
                Map.of("service.name", "checkout"),
                List.of("checkout"),
                "trace-1",
                "span-1",
                "checkout",
                "commerce",
                "prod",
                1L,
                2L));
        when(telemetryIntakeService.buildTraceQueryHints(any())).thenReturn(Collections.emptyList());
        when(entityTraceQueryService.buildEntityTraceQueryHints(any())).thenReturn(hints);

        List<EntityTraceQueryHintDto> resolved = gateway.resolveEntityTraceQueryHints(entityContext);

        assertEquals(hints, resolved);
        verify(entityTraceQueryService).buildEntityTraceQueryHints(entityContext);
    }

    @Test
    void resolveEntityDetailBundleShouldAggregateTraceAndEvidenceState() {
        ObservedEntityContext entityContext = ObservedEntityContext.from(null, Collections.emptyList());
        EntityStatusInfo statusInfo = new EntityStatusInfo("healthy", "ok", 2, 2, 0, 0, 0, null);
        EntityEvidenceSummaryInfo evidenceSummary = new EntityEvidenceSummaryInfo(1, 0, 2, 3L, 4, 5L);
        EntityMonitorSummaryInfo monitorSummary =
                new EntityMonitorSummaryInfo(2, Map.of(), Map.of(), List.of(), 6L);
        EntityLogSummaryInfo logSummary =
                new EntityLogSummaryInfo(1, "logs", "logs", Map.of(), List.of("service.name"), "service.name");
        List<EntityLogQueryHint> logQueryHints = List.of(new EntityLogQueryHint(
                "logs", Map.of(), List.of("checkout"), null, null, "checkout", "commerce", "prod", 1L, 2L));
        List<MetricEvidence> metricEvidence = List.of(new MetricEvidence(
                "metrics", "metrics", 1L, null, 10L, "healthy", "action", null, null, null,
                "cpu.usage", "CPU Usage", "gauge", "percent", 10.0, Map.of(), "monitor", "otel"));
        List<LogEvidence> logEvidence = List.of(new LogEvidence(
                "logs", "logs", 1L, null, 10L, "info", "reason", null, null,
                "body", "INFO", "trace-1", "span-1", Map.of(), List.of("checkout")));
        EntityTraceSummaryDto traceSummary = new EntityTraceSummaryDto(2, 1, 9L, true, "trace-1");
        List<EntityTraceQueryHintDto> traceHints = List.of(new EntityTraceQueryHintDto(
                "trace-1", Map.of(), List.of("checkout"), "trace-1", "span-1", "checkout", "commerce", "prod", 1L, 2L));
        List<TraceEvidence> traceEvidence = List.of(new TraceEvidence(
                "trace", "trace", 1L, null, 11L, "error", "reason", null, null,
                "trace-1", "span-1", "checkout", "commerce", "error", 3, 22L, Map.of()));
        EntityUnifiedEvidenceSummary unifiedEvidenceSummary =
                new EntityUnifiedEvidenceSummary(3, true, true, true, 1L, 1, 1, 12L, List.of("metrics", "logs", "traces"));
        EntityTriageRecommendation triageRecommendation =
                new EntityTriageRecommendation("focus_logs", "logs", "处理日志", "查看日志", "high", "进入日志", 13L);

        when(telemetryIntakeService.buildMetricEvidence(any(), any(), any())).thenReturn(metricEvidence);
        when(telemetryIntakeService.buildLogEvidence(any(), any(), any())).thenReturn(logEvidence);
        when(telemetryIntakeService.buildTraceSummary(any())).thenReturn(traceSummary);
        when(telemetryIntakeService.buildTraceQueryHints(any())).thenReturn(traceHints);
        when(telemetryIntakeService.buildTraceEvidence(any(), any(), any())).thenReturn(traceEvidence);
        when(telemetryIntakeService.buildUnifiedEvidenceSummary(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(unifiedEvidenceSummary);
        when(telemetryIntakeService.buildTriageRecommendation(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(triageRecommendation);

        EntityObservabilityDetailBundle bundle = gateway.resolveEntityDetailBundle(
                entityContext, statusInfo, evidenceSummary, monitorSummary, logSummary, List.of(), logQueryHints);

        assertSame(traceSummary, bundle.getTraceSummary());
        assertSame(traceHints, bundle.getTraceQueryHints());
        assertEquals(1, bundle.getLogSummary().getHintCount());
        assertEquals(1, bundle.getLogQueryHints().size());
        assertSame(metricEvidence, bundle.getMetricEvidence());
        assertSame(logEvidence, bundle.getLogEvidence());
        assertSame(traceEvidence, bundle.getTraceEvidence());
        assertSame(unifiedEvidenceSummary, bundle.getUnifiedEvidenceSummary());
        assertSame(triageRecommendation, bundle.getTriageRecommendation());
    }

    @Test
    void enrichEntityLogQueryHintsShouldPreferEvidenceAndTraceFallbacks() {
        EntityLogQueryHint originalHint = new EntityLogQueryHint();
        originalHint.setTitle("原始日志");
        originalHint.setResourceFilters(Map.of());
        originalHint.setSearchTerms(List.of());

        TelemetryIdentitySnapshot snapshot = new TelemetryIdentitySnapshot();
        snapshot.setServiceName("checkout");
        snapshot.setServiceNamespace("commerce");
        snapshot.setEnvironmentName("prod");

        LogEvidence logEvidence = new LogEvidence();
        logEvidence.setObservedAt(20L);
        logEvidence.setBody("error body");
        logEvidence.setTraceId("trace-1");
        logEvidence.setSpanId("span-1");
        logEvidence.setIdentitySnapshot(snapshot);
        logEvidence.setResource(Map.of("service.name", "checkout"));
        logEvidence.setPreferredSearchTerms(List.of("checkout", "error"));

        EntityTraceQueryHintDto traceHint = new EntityTraceQueryHintDto();
        traceHint.setResourceFilters(Map.of("service.namespace", "commerce"));
        traceHint.setSearchTerms(List.of("trace search"));
        traceHint.setTraceId("trace-1");
        traceHint.setSpanId("span-1");
        traceHint.setServiceName("checkout");
        traceHint.setServiceNamespace("commerce");
        traceHint.setEnvironment("prod");
        traceHint.setStart(5L);
        traceHint.setEnd(15L);

        List<EntityLogQueryHint> enriched = gateway.enrichEntityLogQueryHints(
                List.of(originalHint), List.of(logEvidence), List.of(traceHint));

        assertEquals(1, enriched.size());
        EntityLogQueryHint first = enriched.getFirst();
        assertEquals("原始日志", first.getTitle());
        assertEquals(Map.of("service.name", "checkout"), first.getResourceFilters());
        assertEquals(List.of("checkout", "error"), first.getSearchTerms());
        assertEquals("trace-1", first.getTraceId());
        assertEquals("span-1", first.getSpanId());
        assertEquals("checkout", first.getServiceName());
        assertEquals("commerce", first.getServiceNamespace());
        assertEquals("prod", first.getEnvironment());
        assertEquals(5L, first.getStart());
        assertEquals(20L, first.getEnd());
        assertTrue(enriched != List.of(originalHint));
    }

    @Test
    void buildEntityLogSummaryShouldUsePreferredHintAsSummarySource() {
        EntityLogQueryHint hint = new EntityLogQueryHint(
                "日志入口",
                Map.of("service.name", "checkout"),
                List.of("checkout", "error"),
                "trace-1",
                "span-1",
                "checkout",
                "commerce",
                "prod",
                1L,
                2L
        );

        EntityLogSummaryInfo summary = gateway.buildEntityLogSummary(List.of(hint));

        assertEquals(1, summary.getHintCount());
        assertEquals("日志入口", summary.getPreferredQueryType());
        assertEquals("日志入口", summary.getPreferredQueryTitle());
        assertEquals(Map.of("service.name", "checkout"), summary.getPreferredResourceFilters());
        assertEquals(List.of("checkout", "error"), summary.getPreferredSearchTerms());
        assertEquals("checkout", summary.getFallbackSearchTerm());
    }

    @Test
    void buildEntityLogQueryHintsShouldComposeResourceAndFallbackHints() {
        EntityIdentity serviceIdentity = EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout")
                .build();
        EntityIdentity namespaceIdentity = EntityIdentity.builder()
                .identityKey("service.namespace")
                .identityValue("commerce")
                .build();
        EntityIdentity environmentIdentity = EntityIdentity.builder()
                .identityKey("deployment.environment.name")
                .identityValue("prod")
                .build();
        Monitor monitor = new Monitor();
        monitor.setName("checkout-monitor");
        monitor.setInstance("10.0.0.8");

        List<EntityLogQueryHint> hints = gateway.buildEntityLogQueryHints(
                List.of(serviceIdentity, namespaceIdentity, environmentIdentity), List.of(monitor));

        assertEquals(2, hints.size());
        EntityLogQueryHint resourceHint = hints.get(0);
        assertEquals("otel-resource", resourceHint.getTitle());
        assertEquals(Map.of(
                "service.name", "checkout",
                "service.namespace", "commerce",
                "deployment.environment.name", "prod"
        ), resourceHint.getResourceFilters());
        assertEquals("checkout", resourceHint.getServiceName());
        assertEquals("commerce", resourceHint.getServiceNamespace());
        assertEquals("prod", resourceHint.getEnvironment());

        EntityLogQueryHint fallbackHint = hints.get(1);
        assertEquals("fallback-search", fallbackHint.getTitle());
        assertEquals(List.of("checkout-monitor", "10.0.0.8"), fallbackHint.getSearchTerms());
    }

    @Test
    void buildEntityAlertSummaryShouldAggregateSeverityAndLatestTimestamp() {
        SingleAlert criticalAlert = new SingleAlert();
        criticalAlert.setLabels(Map.of("severity", "critical"));
        criticalAlert.setStartAt(1000L);
        SingleAlert warningAlert = new SingleAlert();
        warningAlert.setLabels(Map.of("severity", "warning"));
        warningAlert.setActiveAt(2000L);

        EntityAlertSummaryInfo summary = gateway.buildEntityAlertSummary(List.of(criticalAlert, warningAlert));

        assertEquals(2, summary.getTotalActiveAlerts());
        assertEquals(Map.of("critical", 1L, "warning", 1L), summary.getSeverityDistribution());
        assertEquals(2000L, summary.getLatestStatusChangeAt());
        assertEquals(List.of(criticalAlert, warningAlert), summary.getRecentAlerts());
    }

    @Test
    void buildEntityMonitorSummaryShouldGroupAppAndStatusAndKeepLatestAbnormal() {
        LocalDateTime healthyUpdate = LocalDateTime.of(2026, 4, 4, 12, 0);
        LocalDateTime downUpdate = LocalDateTime.of(2026, 4, 4, 12, 5);
        Monitor healthyMonitor = new Monitor();
        healthyMonitor.setId(1L);
        healthyMonitor.setApp("mysql");
        healthyMonitor.setStatus(CommonConstants.MONITOR_UP_CODE);
        healthyMonitor.setGmtUpdate(healthyUpdate);
        healthyMonitor.setName("mysql-prod");
        healthyMonitor.setInstance("mysql-1");

        Monitor downMonitor = new Monitor();
        downMonitor.setId(2L);
        downMonitor.setApp("mysql");
        downMonitor.setStatus(CommonConstants.MONITOR_DOWN_CODE);
        downMonitor.setGmtUpdate(downUpdate);
        downMonitor.setName("mysql-replica");
        downMonitor.setInstance("mysql-2");

        EntityMonitorSummaryInfo summary = gateway.buildEntityMonitorSummary(List.of(healthyMonitor, downMonitor));

        assertEquals(2, summary.getTotalBoundMonitors());
        assertEquals(Map.of("mysql", 2L), summary.getAppDistribution());
        assertEquals(Map.of("up", 1L, "down", 1L), summary.getStatusDistribution());
        assertEquals(1, summary.getAbnormalMonitors().size());
        assertEquals(2L, summary.getAbnormalMonitors().getFirst().getId());
        assertEquals(downUpdate.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli(),
                summary.getLatestStatusChangeAt());
    }

    @Test
    void buildEntityEvidenceSummaryShouldPreferLatestMonitorOrAlertAndFallbackToEntityTimestamp() {
        ObserveEntity entity = new ObserveEntity();
        LocalDateTime entityCreate = LocalDateTime.of(2026, 4, 4, 9, 0);
        LocalDateTime entityUpdate = LocalDateTime.of(2026, 4, 4, 10, 0);
        LocalDateTime monitorUpdate = LocalDateTime.of(2026, 4, 4, 11, 0);
        long expectedEvidenceAt = monitorUpdate.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() + 1000;
        entity.setGmtCreate(entityCreate);
        entity.setGmtUpdate(entityUpdate);

        Monitor monitor = new Monitor();
        monitor.setGmtUpdate(monitorUpdate);

        SingleAlert alert = new SingleAlert();
        alert.setActiveAt(expectedEvidenceAt);

        EntityStatusInfo statusInfo = new EntityStatusInfo("healthy", "ok", 3, 2, 1, 0, 3, null);

        EntityEvidenceSummaryInfo summary = gateway.buildEntityEvidenceSummary(
                entity,
                statusInfo,
                4L,
                2,
                List.of(monitor),
                List.of(alert)
        );

        assertEquals(3, summary.getActiveAlertCount());
        assertEquals(1, summary.getDownMonitorCount());
        assertEquals(2, summary.getHealthyMonitorCount());
        assertEquals(4L, summary.getIdentityCount());
        assertEquals(2, summary.getLogHintCount());
        assertEquals(expectedEvidenceAt, summary.getLastEvidenceAt());
    }

    @Test
    void buildEntityOpsSummaryShouldReflectOperationalReadiness() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout-api");
        entity.setOwner("catalog-oncall");
        entity.setRunbook("https://runbooks/checkout");

        EntityEvidenceSummaryInfo evidenceSummary = new EntityEvidenceSummaryInfo(1, 0, 1, 3L, 2, 100L);

        EntityOpsSummaryInfo summary = gateway.buildEntityOpsSummary(entity, 2L, evidenceSummary);

        assertTrue(summary.isOwnerReady());
        assertTrue(summary.isRunbookReady());
        assertTrue(summary.isRelationReady());
        assertTrue(summary.isTelemetryReady());
        assertTrue(summary.isStatusReady());
        assertEquals(100, summary.getReadinessScore());

        EntityOpsSummaryInfo emptySummary = gateway.buildEntityOpsSummary(
                ObserveEntity.builder().name("empty").build(),
                0L,
                new EntityEvidenceSummaryInfo(0, 0, 0, 0L, 0, null)
        );
        assertFalse(emptySummary.isOwnerReady());
        assertFalse(emptySummary.isRunbookReady());
        assertFalse(emptySummary.isRelationReady());
        assertFalse(emptySummary.isTelemetryReady());
        assertFalse(emptySummary.isStatusReady());
        assertEquals(0, emptySummary.getReadinessScore());
    }

    @Test
    void buildEntityNextActionsShouldSortByPriorityAndFallbackWhenReady() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout-api");

        EntityEvidenceSummaryInfo noisyEvidence = new EntityEvidenceSummaryInfo(2, 1, 0, 1L, 1, 100L);
        EntityOpsSummaryInfo incompleteOps = new EntityOpsSummaryInfo(false, false, false, true, true, 40);
        EntityLogSummaryInfo logSummary = new EntityLogSummaryInfo(
                1, "otel-resource", "otel-resource", Map.of("service.name", "checkout"), List.of("checkout"), "checkout");

        List<EntityNextActionInfo> nextActions =
                gateway.buildEntityNextActions(entity, noisyEvidence, logSummary, incompleteOps);

        assertEquals("review_alerts", nextActions.getFirst().getActionType());
        assertEquals("complete_owner", nextActions.get(1).getActionType());
        assertEquals("complete_runbook", nextActions.get(2).getActionType());
        assertEquals("review_relations", nextActions.getLast().getActionType());

        EntityOpsSummaryInfo readyOps = new EntityOpsSummaryInfo(true, true, true, true, true, 100);
        List<EntityNextActionInfo> fallbackActions = gateway.buildEntityNextActions(
                entity,
                new EntityEvidenceSummaryInfo(0, 0, 1, 1L, 0, 100L),
                null,
                readyOps
        );

        assertEquals(1, fallbackActions.size());
        assertEquals("inspect_logs", fallbackActions.getFirst().getActionType());
    }

    @Test
    void buildEntityStatusPageSummaryShouldRespectLinkedComponentAndExposureSuggestion() {
        ObserveEntity linkedEntity = new ObserveEntity();
        linkedEntity.setType("service");
        linkedEntity.setLabels(Map.of("status.page.component", "checkout-api"));
        EntityStatusPageSummaryInfo linkedSummary = gateway.buildEntityStatusPageSummary(
                linkedEntity, new EntityOpsSummaryInfo(true, true, true, true, true, 100));

        assertTrue(linkedSummary.isLinked());
        assertEquals(1, linkedSummary.getComponentCount());
        assertFalse(linkedSummary.isSuggestExpose());

        ObserveEntity suggestEntity = new ObserveEntity();
        suggestEntity.setType("api");
        EntityStatusPageSummaryInfo suggestSummary = gateway.buildEntityStatusPageSummary(
                suggestEntity, new EntityOpsSummaryInfo(true, true, true, true, true, 100));

        assertFalse(suggestSummary.isLinked());
        assertTrue(suggestSummary.isSuggestExpose());
    }

    @Test
    void buildEntityLogSearchTokenShouldPreferSummaryAndFallbackToIdentity() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout-entity");
        EntityIdentity serviceIdentity = EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout")
                .build();
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, List.of(serviceIdentity));

        EntityLogSummaryInfo logSummary = new EntityLogSummaryInfo(
                1,
                "type",
                "title",
                Map.of(),
                List.of("checkout-error"),
                "fallback"
        );

        assertEquals("checkout-error", gateway.buildEntityLogSearchToken(entityContext, logSummary));
        assertEquals("checkout", gateway.buildEntityLogSearchToken(entityContext, null));
    }

    @Test
    void buildEntityTraceSearchTokenShouldPreferLatestTraceIdAndFallbackToEntityName() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout-entity");
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, Collections.emptyList());
        EntityTraceSummaryDto traceSummary = new EntityTraceSummaryDto(1, 1, 10L, true, "trace-1");

        assertEquals("trace-1", gateway.buildEntityTraceSearchToken(entityContext, traceSummary));
        assertEquals("checkout-entity", gateway.buildEntityTraceSearchToken(entityContext, null));
    }

    @Test
    void buildEntityAlertSearchTokenShouldPreferSharedAlertLabel() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout-entity");
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, Collections.emptyList());
        SingleAlert firstAlert = new SingleAlert();
        firstAlert.setLabels(Map.of("service.name", "checkout-api"));
        SingleAlert secondAlert = new SingleAlert();
        secondAlert.setLabels(Map.of("service.name", "checkout-api"));

        assertEquals("checkout-api", gateway.buildEntityAlertSearchToken(entityContext, List.of(firstAlert, secondAlert)));
    }

    @Test
    void buildEntityReturnLabelShouldPreferDisplayNameThenName() {
        ObserveEntity entity = new ObserveEntity();
        entity.setDisplayName("Checkout Service");
        entity.setName("checkout-service");
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, Collections.emptyList());

        assertEquals("Checkout Service", gateway.buildEntityReturnLabel(entityContext));

        entity.setDisplayName(null);
        assertEquals("checkout-service", gateway.buildEntityReturnLabel(entityContext));
        assertEquals("实体详情", gateway.buildEntityReturnLabel(ObservedEntityContext.from(null, Collections.emptyList())));
    }

    @Test
    void buildEntityAlertSearchTokenShouldFallbackToEntityIdentity() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout-entity");
        EntityIdentity serviceIdentity = EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout-service")
                .build();
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, List.of(serviceIdentity));

        assertEquals("checkout-service", gateway.buildEntityAlertSearchToken(entityContext, Collections.emptyList()));
    }

    @Test
    void buildEntityAlertHandoffShouldIncludeSearchSeverityAndStatus() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout-entity");
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, Collections.emptyList());
        SingleAlert alert = new SingleAlert();
        alert.setLabels(Map.of("service.name", "checkout-api", "priority", "critical"));

        EntityResponseHandoffInfo handoff = gateway.buildEntityAlertHandoff("/entities/1", "Checkout", entityContext, List.of(alert));

        assertEquals("/entities/1", handoff.getReturnTo());
        assertEquals("Checkout", handoff.getReturnLabel());
        assertEquals("checkout-api", handoff.getSearch());
        assertEquals("firing", handoff.getStatus());
        assertEquals("critical", handoff.getSeverity());
    }

    @Test
    void buildEntityMonitorHandoffShouldApplyMetricCorrelation() {
        Monitor monitor = new Monitor();
        monitor.setApp("springboot3");
        monitor.setName("checkout-api");
        monitor.setInstance("checkout.default.svc.cluster.local");
        monitor.setStatus(CommonConstants.MONITOR_DOWN_CODE);

        MetricCorrelationHint correlationHint = new MetricCorrelationHint(
                1L,
                "trace-1",
                "span-1",
                "checkout",
                "commerce",
                "prod",
                10L,
                20L,
                "checkout-api",
                "trace = 'trace-1'",
                "service.name = 'checkout'");
        MetricEvidence metricEvidence = new MetricEvidence();
        metricEvidence.setCorrelationHint(correlationHint);

        EntityResponseHandoffInfo handoff = gateway.buildEntityMonitorHandoff(
                "/entities/3", "Monitor", List.of(monitor), "checkout-api", metricEvidence);

        assertEquals("/entities/3", handoff.getReturnTo());
        assertEquals("Monitor", handoff.getReturnLabel());
        assertEquals("springboot3", handoff.getApp());
        assertEquals("checkout.default.svc.cluster.local", handoff.getContent());
        assertEquals(String.valueOf(CommonConstants.MONITOR_DOWN_CODE), handoff.getStatus());
        assertEquals("trace-1", handoff.getTraceId());
        assertEquals("span-1", handoff.getSpanId());
        assertEquals("checkout", handoff.getServiceName());
        assertEquals("commerce", handoff.getServiceNamespace());
        assertEquals("prod", handoff.getEnvironment());
        assertEquals(10L, handoff.getStart());
        assertEquals(20L, handoff.getEnd());
        assertEquals("checkout-api", handoff.getSearch());
        assertEquals("trace = 'trace-1'", handoff.getQuery());
    }

    @Test
    void buildEntityLogHandoffShouldPreferLogEvidenceAndKeepTraceFallbacks() {
        String traceId = "11111111111111111111111111111111";
        String spanId = "2222222222222222";
        SingleAlert alert = new SingleAlert();
        alert.setLabels(Map.of("priority", "warning"));

        TelemetryIdentitySnapshot snapshot = new TelemetryIdentitySnapshot();
        snapshot.setServiceName("checkout");
        snapshot.setServiceNamespace("commerce");
        snapshot.setEnvironmentName("prod");

        LogEvidence logEvidence = new LogEvidence();
        logEvidence.setTraceId(traceId);
        logEvidence.setSpanId(spanId);
        logEvidence.setIdentitySnapshot(snapshot);
        logEvidence.setObservedAt(1_710_000_000_000L);
        logEvidence.setQueryHint("checkout failed");

        EntityTraceSummaryDto traceSummary = new EntityTraceSummaryDto(1, 1, 1_710_000_000_000L, true, traceId);
        TraceEvidence traceEvidence = new TraceEvidence();
        traceEvidence.setTraceId(traceId);
        traceEvidence.setRootSpanId(spanId);
        traceEvidence.setServiceName("checkout");
        traceEvidence.setServiceNamespace("commerce");

        EntityTraceQueryHintDto traceHint = new EntityTraceQueryHintDto();
        traceHint.setTraceId(traceId);
        traceHint.setSpanId(spanId);
        traceHint.setServiceName("checkout");
        traceHint.setServiceNamespace("commerce");
        traceHint.setEnvironment("prod");
        traceHint.setStart(1_709_999_100_000L);
        traceHint.setEnd(1_710_000_000_500L);

        EntityResponseHandoffInfo handoff = gateway.buildEntityLogHandoff(
                "/entities/1", "Checkout", "checkout-api", List.of(alert), logEvidence, traceSummary, traceEvidence, List.of(traceHint));

        assertEquals("/entities/1", handoff.getReturnTo());
        assertEquals("Checkout", handoff.getReturnLabel());
        assertEquals(traceId, handoff.getSearch());
        assertEquals("warning", handoff.getSeverityText());
        assertEquals(traceId, handoff.getTraceId());
        assertEquals(spanId, handoff.getSpanId());
        assertEquals("checkout", handoff.getServiceName());
        assertEquals("commerce", handoff.getServiceNamespace());
        assertEquals("prod", handoff.getEnvironment());
        assertEquals(1_710_000_000_000L, handoff.getEnd());
        assertEquals(1_709_999_100_000L, handoff.getStart());
    }

    @Test
    void buildEntityTraceHandoffShouldPreferEvidenceButFallbackToSummaryTraceId() {
        TraceEvidence traceEvidence = new TraceEvidence();
        traceEvidence.setRootSpanId("span-1");
        traceEvidence.setServiceName("checkout");
        traceEvidence.setServiceNamespace("commerce");
        traceEvidence.setObservedAt(1_710_000_001_000L);

        TelemetryIdentitySnapshot snapshot = new TelemetryIdentitySnapshot();
        snapshot.setEnvironmentName("prod");
        traceEvidence.setIdentitySnapshot(snapshot);

        EntityTraceSummaryDto traceSummary = new EntityTraceSummaryDto(1, 0, 1_710_000_001_000L, true,
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

        EntityResponseHandoffInfo handoff = gateway.buildEntityTraceHandoff(
                "/entities/2", "Trace", "checkout-api", traceSummary, traceEvidence);

        assertEquals("/entities/2", handoff.getReturnTo());
        assertEquals("Trace", handoff.getReturnLabel());
        assertEquals("checkout-api", handoff.getSearch());
        assertEquals("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", handoff.getTraceId());
        assertEquals("span-1", handoff.getSpanId());
        assertEquals("checkout", handoff.getServiceName());
        assertEquals("commerce", handoff.getServiceNamespace());
        assertEquals("prod", handoff.getEnvironment());
        assertEquals(1_710_000_001_000L, handoff.getEnd());
        assertEquals(1_709_999_101_000L, handoff.getStart());
    }

    @Test
    void buildEntityDiscoveryHandoffShouldCarryEntityContextAndPreferAlertQuery() {
        EntityResponseHandoffInfo handoff = gateway.buildEntityDiscoveryHandoff(
                "/entities/1",
                "结账服务",
                "team-a",
                "checkout",
                "prod",
                "manual",
                "alert-token",
                "log-token",
                "fallback-token"
        );

        assertEquals("/entities/1", handoff.getReturnTo());
        assertEquals("结账服务", handoff.getReturnLabel());
        assertEquals("alert-token", handoff.getQuery());
        assertEquals("team-a", handoff.getOwner());
        assertEquals("checkout", handoff.getSystem());
        assertEquals("prod", handoff.getEnvironment());
        assertEquals("manual", handoff.getSource());
    }

    @Test
    void buildEntityEditorHandoffShouldSelectFocusByReadinessPriority() {
        EntityResponseHandoffInfo ownershipHandoff =
                gateway.buildEntityEditorHandoff("/entities/1", "结账服务", false, true, true, true);
        EntityResponseHandoffInfo relationHandoff =
                gateway.buildEntityEditorHandoff("/entities/1", "结账服务", true, true, false, true);
        EntityResponseHandoffInfo monitorHandoff =
                gateway.buildEntityEditorHandoff("/entities/1", "结账服务", true, true, true, false);
        EntityResponseHandoffInfo defaultHandoff =
                gateway.buildEntityEditorHandoff("/entities/1", "结账服务", true, true, true, true);

        assertEquals("ownership", ownershipHandoff.getFocus());
        assertEquals("relations", relationHandoff.getFocus());
        assertEquals("monitors", monitorHandoff.getFocus());
        assertEquals("basic", defaultHandoff.getFocus());
    }

    @Test
    void buildEntityResponseHandoffsShouldAssembleAllTargetsFromRequest() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout");
        entity.setDisplayName("结账服务");
        EntityIdentity identity = EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout")
                .build();
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, List.of(identity));

        EntityTraceSummaryDto traceSummary = new EntityTraceSummaryDto(1, 1, 20L, true, "trace-1");
        EntityResponseHandoffsRequest request = new EntityResponseHandoffsRequest(
                "/entities/1",
                "结账服务",
                "team-a",
                "checkout-system",
                "prod",
                "manual",
                entityContext,
                List.of(),
                List.of(),
                new EntityLogSummaryInfo(0, null, null, Map.of(), List.of("checkout-error"), "checkout"),
                traceSummary,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                false,
                true,
                true,
                false
        );

        EntityResponseHandoffsInfo handoffs = gateway.buildEntityResponseHandoffs(request);

        assertEquals("/entities/1", handoffs.getAlerts().getReturnTo());
        assertEquals("checkout", handoffs.getAlerts().getSearch());
        assertEquals("trace-1", handoffs.getLogs().getSearch());
        assertEquals("trace-1", handoffs.getTraces().getSearch());
        assertEquals("checkout-system", handoffs.getDiscovery().getSystem());
        assertEquals("ownership", handoffs.getEditor().getFocus());
    }

    @Test
    void buildEntityResponseHandoffsShouldPreferSharedSignalEvidenceBundle() {
        ObserveEntity entity = new ObserveEntity();
        entity.setName("checkout");
        EntityIdentity identity = EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout")
                .build();
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, List.of(identity));
        EntityTraceSummaryDto staleTraceSummary = new EntityTraceSummaryDto(1, 0, 10L, true, "stale-trace");
        EntityTraceSummaryDto bundleTraceSummary = new EntityTraceSummaryDto(2, 1, 20L, true, "bundle-trace");
        EntitySignalEvidenceBundle signalEvidence = new EntitySignalEvidenceBundle(
                new EntityLogSummaryInfo(1, "bundle", "resource", Map.of(), List.of("bundle-log"), "bundle-log"),
                bundleTraceSummary,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                null,
                null
        );
        EntityResponseHandoffsRequest request = new EntityResponseHandoffsRequest(
                "/entities/1",
                "结账服务",
                "team-a",
                "checkout-system",
                "prod",
                "manual",
                entityContext,
                List.of(),
                List.of(),
                new EntityLogSummaryInfo(1, "stale", "resource", Map.of(), List.of("stale-log"), "stale-log"),
                staleTraceSummary,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                signalEvidence,
                true,
                true,
                true,
                true
        );

        EntityResponseHandoffsInfo handoffs = gateway.buildEntityResponseHandoffs(request);

        assertEquals("bundle-trace", handoffs.getLogs().getTraceId());
        assertEquals("bundle-trace", handoffs.getLogs().getSearch());
        assertEquals("bundle-trace", handoffs.getTraces().getTraceId());
        assertEquals("bundle-trace", handoffs.getTraces().getSearch());
    }
}
