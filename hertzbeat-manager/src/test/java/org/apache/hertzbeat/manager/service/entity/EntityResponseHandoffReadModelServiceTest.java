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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsRequest;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity response-handoff read model extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityResponseHandoffReadModelServiceTest {

    @InjectMocks
    private EntityResponseHandoffReadModelService responseHandoffReadModelService;

    @Mock
    private EntityObservabilityGateway entityObservabilityGateway;

    @Test
    void buildResponseHandoffsDelegatesRouteContextEvidenceAndReadiness() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(501L)
                .name("checkout-api")
                .displayName("Checkout API")
                .owner("catalog-oncall")
                .system("commerce-platform")
                .environment("prod")
                .source("otel")
                .build();
        EntityIdentity identity = EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout-api")
                .build();
        ObservedEntityContext entityContext = ObservedEntityContext.from(entity, List.of(identity));
        SingleAlert activeAlert = SingleAlert.builder()
                .id(701L)
                .labels(Map.of("severity", "critical"))
                .build();
        Monitor monitor = Monitor.builder()
                .id(801L)
                .name("checkout-api")
                .app("springboot3")
                .build();
        EntityLogSummaryInfo logSummary = new EntityLogSummaryInfo(
                1,
                "otel-resource",
                "Checkout API logs",
                Map.of("service.name", "checkout-api"),
                List.of("checkout-api"),
                "checkout"
        );
        EntityTraceSummaryDto traceSummary = new EntityTraceSummaryDto(2, 1, 1778340000000L, true, "trace-1");
        List<MetricEvidence> metricEvidence = List.of(new MetricEvidence());
        List<LogEvidence> logEvidence = List.of(new LogEvidence());
        List<TraceEvidence> traceEvidence = List.of(new TraceEvidence());
        List<EntityTraceQueryHintDto> traceQueryHints = List.of(new EntityTraceQueryHintDto());
        EntityOpsSummaryInfo opsSummary = new EntityOpsSummaryInfo(false, true, false, true, true, 60);
        EntityResponseHandoffsInfo expected = new EntityResponseHandoffsInfo();
        when(entityObservabilityGateway.buildEntityReturnLabel(entityContext)).thenReturn("Checkout API");
        when(entityObservabilityGateway.buildEntityResponseHandoffs(any(EntityResponseHandoffsRequest.class)))
                .thenReturn(expected);

        EntityResponseHandoffsInfo handoffs = responseHandoffReadModelService.buildResponseHandoffs(
                501L,
                entityContext,
                List.of(activeAlert),
                List.of(monitor),
                logSummary,
                traceSummary,
                metricEvidence,
                logEvidence,
                traceEvidence,
                traceQueryHints,
                opsSummary
        );

        assertSame(expected, handoffs);
        verify(entityObservabilityGateway).buildEntityReturnLabel(entityContext);
        ArgumentCaptor<EntityResponseHandoffsRequest> requestCaptor =
                ArgumentCaptor.forClass(EntityResponseHandoffsRequest.class);
        verify(entityObservabilityGateway).buildEntityResponseHandoffs(requestCaptor.capture());
        EntityResponseHandoffsRequest request = requestCaptor.getValue();
        assertEquals("/entities/501", request.getReturnTo());
        assertEquals("Checkout API", request.getReturnLabel());
        assertEquals("catalog-oncall", request.getEntityOwner());
        assertEquals("commerce-platform", request.getEntitySystem());
        assertEquals("prod", request.getEntityEnvironment());
        assertEquals("otel", request.getEntitySource());
        assertSame(entityContext, request.getEntityContext());
        assertEquals(List.of(activeAlert), request.getActiveAlerts());
        assertEquals(List.of(monitor), request.getMonitors());
        assertSame(logSummary, request.getLogSummary());
        assertSame(traceSummary, request.getTraceSummary());
        assertSame(metricEvidence, request.getMetricEvidence());
        assertSame(logEvidence, request.getLogEvidence());
        assertSame(traceEvidence, request.getTraceEvidence());
        assertSame(traceQueryHints, request.getTraceQueryHints());
        assertFalse(request.isOwnerReady());
        assertTrue(request.isRunbookReady());
        assertFalse(request.isRelationReady());
        assertTrue(request.isTelemetryReady());
    }

    @Test
    void buildResponseHandoffsKeepsEmptyReadinessWhenOpsSummaryIsMissing() {
        EntityResponseHandoffsInfo expected = new EntityResponseHandoffsInfo();
        when(entityObservabilityGateway.buildEntityReturnLabel(null)).thenReturn("Entity");
        when(entityObservabilityGateway.buildEntityResponseHandoffs(any(EntityResponseHandoffsRequest.class)))
                .thenReturn(expected);

        EntityResponseHandoffsInfo handoffs = responseHandoffReadModelService.buildResponseHandoffs(
                502L,
                null,
                Collections.emptyList(),
                Collections.emptyList(),
                null,
                null,
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList(),
                null
        );

        assertSame(expected, handoffs);
        ArgumentCaptor<EntityResponseHandoffsRequest> requestCaptor =
                ArgumentCaptor.forClass(EntityResponseHandoffsRequest.class);
        verify(entityObservabilityGateway).buildEntityResponseHandoffs(requestCaptor.capture());
        EntityResponseHandoffsRequest request = requestCaptor.getValue();
        assertEquals("/entities/502", request.getReturnTo());
        assertEquals("Entity", request.getReturnLabel());
        assertEquals(Collections.emptyList(), request.getActiveAlerts());
        assertEquals(Collections.emptyList(), request.getMonitors());
        assertFalse(request.isOwnerReady());
        assertFalse(request.isRunbookReady());
        assertFalse(request.isRelationReady());
        assertFalse(request.isTelemetryReady());
    }
}
