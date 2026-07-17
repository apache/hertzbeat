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

package org.apache.hertzbeat.observability.metrics.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CollectorScopedMetricsQueryServiceImplTest {

    @Mock
    private OtlpIngestionWorkspaceService workspaceService;

    private CollectorScopedMetricsQueryServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CollectorScopedMetricsQueryServiceImpl(workspaceService);
    }

    @Test
    void scopesGeneratedMetricQueryThroughCanonicalCollectorLabel() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getMetricsConsole(
                null, null, 100L, 200L, "checkout", "commerce", "prod", "http_server_duration",
                "span_kind=server and hertzbeat_collector_id=\"collector-a\"", null, null,
                null, "60s", null, null)).thenReturn(result);

        OtlpMetricsConsoleDto actual = service.query(request("collector-a", "http_server_duration"));

        assertEquals("collector-a", actual.getContext().getCollectorId());
    }

    @Test
    void scopesDefaultQueryAndPreservesExistingFilter() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getMetricsConsole(
                null, null, 100L, 200L, "checkout", "commerce", "prod", null,
                "span_kind=server and hertzbeat_collector_id=\"collector-east\"", null, null,
                null, "60s", null, null)).thenReturn(result);

        OtlpMetricsConsoleDto actual = service.query(request("collector-east", null));

        assertEquals("collector-east", actual.getContext().getCollectorId());
    }

    @Test
    void blankCollectorKeepsLegacyRequestUnchanged() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getMetricsConsole(
                null, null, 100L, 200L, "checkout", "commerce", "prod", "http_server_duration",
                "span_kind=server", null, null, null, "60s", null, null)).thenReturn(result);

        OtlpMetricsConsoleDto actual = service.query(request(" ", "http_server_duration"));

        assertNull(actual.getContext().getCollectorId());
    }

    @Test
    void rejectsArbitraryPromqlInsteadOfDroppingCollectorScope() {
        OtlpMetricsConsoleDto result = service.query(request("collector-a", "sum(rate(http_requests_total[5m]))"));

        assertEquals("unsupported_query", result.getEmptyStateReason());
        assertEquals("collector-a", result.getContext().getCollectorId());
        assertNull(result.getResults());
        verifyNoInteractions(workspaceService);
    }

    @Test
    void rejectsInvalidOrDuplicateCollectorScope() {
        assertThrows(IllegalArgumentException.class, () ->
                service.query(request("collector-a\" or other=\"x", null)));
        assertThrows(IllegalArgumentException.class, () -> service.query(new CollectorScopedMetricsQueryService.Request(
                null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a", null,
                "hertzbeat_collector_id=collector-b", null, null, null, "60s", null, null)));
        verifyNoInteractions(workspaceService);
    }

    private CollectorScopedMetricsQueryService.Request request(String collectorId, String query) {
        return new CollectorScopedMetricsQueryService.Request(
                null, null, 100L, 200L, "checkout", "commerce", "prod", collectorId, query,
                "span_kind=server", null, null, null, "60s", null, null);
    }
}
