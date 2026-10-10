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

package org.apache.hertzbeat.observability.traces.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrowsExactly;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.TraceDetailQuery;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceRowQuery;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * External trace reads must never fall back to an unscoped repository query.
 */
@ExtendWith(MockitoExtension.class)
class TraceQueryWorkspaceBoundaryTest {

    @InjectMocks
    private EntityTraceQueryServiceImpl entityTraceQueryService;

    @Mock
    private TraceQueryRepository traceQueryRepository;

    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void traceIdOnlyDetailFailsClosedWithoutTrustedWorkspace() {
        TraceDetailQuery query = new TraceDetailQuery(
                null, "trace-7", null, null, null, null, null, null, null, null, null, null);

        assertThrowsExactly(
                TelemetryStorageUnavailableException.class,
                () -> entityTraceQueryService.getTraceDetail(query));

        verifyNoInteractions(traceQueryRepository, workspaceQueryGateway);
    }

    @Test
    void explicitWorkspaceOverridesAmbientContextForTraceIdOnlyDetail() {
        AuthTokenRequestContext.bindWorkspaceId("team-b");
        TraceDetailQuery query = new TraceDetailQuery(
                null, "trace-7", null, null, null, null, null, null, null, null, null, null);
        when(traceQueryRepository.queryTraceRows(
                org.mockito.ArgumentMatchers.any(TraceRowQuery.class), eq(5000))).thenReturn(List.of());

        assertNull(entityTraceQueryService.getTraceDetail("team-a", query));

        ArgumentCaptor<TraceRowQuery> queryCaptor = ArgumentCaptor.forClass(TraceRowQuery.class);
        verify(traceQueryRepository).queryTraceRows(queryCaptor.capture(), eq(5000));
        assertEquals("team-a", queryCaptor.getValue().workspaceId());
        assertEquals("trace-7", queryCaptor.getValue().traceId());
        verify(traceQueryRepository, never()).queryTraceRows("trace-7", 5000);
        verifyNoInteractions(workspaceQueryGateway);
    }
}
