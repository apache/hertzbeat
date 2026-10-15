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

import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySource;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.repository.LogQueryRepository;
import org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository;
import org.apache.hertzbeat.warehouse.repository.MetricQueryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OtlpSelfMetricsContextIsolationTest {
    @AfterEach
    void clear() { TelemetrySourceContext.clear(); }

    @Test
    void selfAutomaticDiscoveryDoesNotConsultExternalIntakeIndex() {
        var intake = mock(ObservabilitySignalIntakeGateway.class);
        var metrics = mock(MetricQueryRepository.class);
        var inventory = mock(MetricInventoryRepository.class);
        when(metrics.hasPromqlExecutor()).thenReturn(true);
        when(inventory.findMetricNames(any(MetricInventoryRepository.Query.class)))
                .thenReturn(MetricInventoryRepository.Result.success(List.of()));
        var service = new OtlpIngestionWorkspaceServiceImpl(mock(EntityTraceQueryService.class),
                mock(ObservabilityWorkspaceQueryGateway.class), intake, new OtlpIngestionGuideFactory(false, 1157, 4317),
                mock(LogQueryRepository.class), metrics, List.of(inventory), List.of(), List.of(), List.of());
        TelemetrySourceContext.bind(new TelemetrySourceContext.Route(TelemetrySource.SELF, "ci_self", "default"));
        var result = service.getMetricsConsole("default", null, null, 1000L, 2000L,
                null, null, null, null, null, null, null, null, null, null, null);
        assertNull(result.getContext().getServiceName());
        verifyNoInteractions(intake);
    }
}
