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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
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

@ExtendWith(MockitoExtension.class)
class OtlpWorkspaceEntityIsolationTest {

    @Mock
    private EntityTraceQueryService entityTraceQueryService;
    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;
    @Mock
    private ObservabilitySignalIntakeGateway signalIntakeGateway;
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
                entityTraceQueryService,
                workspaceQueryGateway,
                signalIntakeGateway,
                new OtlpIngestionGuideFactory(false, 1157, 4317),
                logQueryRepository,
                metricQueryRepository,
                List.of(metricInventoryRepository),
                List.of(),
                List.of(),
                List.of());
    }

    @Test
    void foreignEntityIsIndistinguishableFromMissingAndNeverReachesMetricStorage() {
        when(workspaceQueryGateway.findEntityById("team-a", 42L)).thenReturn(Optional.empty());

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> service.getMetricsConsole(
                        "team-a", 42L, null, 1_000L, 2_000L,
                        null, null, null, "requests_total",
                        null, null, null, null, null, null, null));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> service.getMetricsInventory(
                        "team-a", 42L, null, 1_000L, 2_000L,
                        null, null, null, null));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> service.getRelatedMetrics(
                        "team-a", 42L, null, 1_000L, 2_000L,
                        null, null, null, null, null, "8"));

        verifyNoInteractions(metricQueryRepository, metricInventoryRepository);
        verify(workspaceQueryGateway, never()).findEntityById(42L);
    }
}
