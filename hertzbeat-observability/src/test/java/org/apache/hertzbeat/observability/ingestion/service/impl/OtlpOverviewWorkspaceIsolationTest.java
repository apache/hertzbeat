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

package org.apache.hertzbeat.observability.ingestion.service.impl;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.repository.LogQueryRepository;
import org.apache.hertzbeat.warehouse.repository.MetricQueryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class OtlpOverviewWorkspaceIsolationTest {

    @Mock
    private EntityTraceQueryService traceQueryService;
    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;
    @Mock
    private ObservabilitySignalIntakeGateway intakeGateway;
    @Mock
    private LogQueryRepository logQueryRepository;
    @Mock
    private MetricQueryRepository metricQueryRepository;
    @Mock
    private MetricInventoryRepository metricInventoryRepository;

    private OtlpIngestionWorkspaceServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new OtlpIngestionWorkspaceServiceImpl(
                traceQueryService,
                workspaceQueryGateway,
                intakeGateway,
                new OtlpIngestionGuideFactory(false, 1157, 4317),
                logQueryRepository,
                metricQueryRepository,
                List.of(metricInventoryRepository),
                List.of(),
                List.of(),
                List.of());
    }

    @Test
    void blankWorkspaceFailsBeforeAnyOverviewOrBindingProvider() {
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.getOverview(" "));
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.getBindingSummary(null));

        verifyNoInteractions(logQueryRepository, traceQueryService, intakeGateway, workspaceQueryGateway);
    }

    @Test
    void overviewUsesOnlyExplicitWorkspaceReads() {
        when(logQueryRepository.queryRecentLogs(eq("team-a"), anyLong(), anyLong(), eq(20)))
                .thenReturn(List.of());
        when(traceQueryService.queryRecentTraces(eq("team-a"), anyLong(), anyLong(), eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(intakeGateway.collectRecentExternalIdentitySnapshots(eq("team-a"), eq(List.of()), eq(List.of()), eq(List.of())))
                .thenReturn(List.of());
        when(workspaceQueryGateway.countDistinctBoundEntityIdsByIdentityKeys(eq("team-a"), anySet()))
                .thenReturn(0L);

        service.getOverview("team-a");

        verify(logQueryRepository).queryRecentLogs(eq("team-a"), anyLong(), anyLong(), eq(20));
        verify(traceQueryService).queryRecentTraces(eq("team-a"), anyLong(), anyLong(), eq(20));
        verify(logQueryRepository, never()).queryRecentLogs(anyLong(), anyLong(), eq(20));
        verify(workspaceQueryGateway).countDistinctBoundEntityIdsByIdentityKeys(eq("team-a"), anySet());
    }

    @Test
    void bindingsUsesOnlyExplicitWorkspaceOwnerReads() {
        when(logQueryRepository.queryRecentLogs(eq("team-a"), anyLong(), anyLong(), eq(20)))
                .thenReturn(List.of());
        when(traceQueryService.queryRecentTraces(eq("team-a"), anyLong(), anyLong(), eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(intakeGateway.collectRecentExternalIdentitySnapshots(eq("team-a"), eq(List.of()), eq(List.of()), eq(List.of())))
                .thenReturn(List.of());

        service.getBindingSummary("team-a");

        verify(logQueryRepository).queryRecentLogs(eq("team-a"), anyLong(), anyLong(), eq(20));
        verify(traceQueryService).queryRecentTraces(eq("team-a"), anyLong(), anyLong(), eq(20));
        verify(workspaceQueryGateway, never()).findIdentitiesByKeysAndNormalizedValues(anySet(), anySet());
        verify(workspaceQueryGateway, never()).findEntitiesByIds(anySet());
    }

    @Test
    void overviewPropagatesScopedLogStorageUnavailableEvenWhenTraceStorageIsAvailable() {
        when(logQueryRepository.queryRecentLogs(eq("team-a"), anyLong(), anyLong(), eq(20)))
                .thenThrow(new TelemetryStorageUnavailableException());
        lenient().when(traceQueryService.queryRecentTraces(eq("team-a"), anyLong(), anyLong(), eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        assertThrows(TelemetryStorageUnavailableException.class, () -> service.getOverview("team-a"));
    }

    @Test
    void bindingsPropagatesScopedLogStorageUnavailableEvenWhenTraceStorageIsAvailable() {
        when(logQueryRepository.queryRecentLogs(eq("team-a"), anyLong(), anyLong(), eq(20)))
                .thenThrow(new TelemetryStorageUnavailableException());
        lenient().when(traceQueryService.queryRecentTraces(eq("team-a"), anyLong(), anyLong(), eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        assertThrows(TelemetryStorageUnavailableException.class, () -> service.getBindingSummary("team-a"));
    }
}
