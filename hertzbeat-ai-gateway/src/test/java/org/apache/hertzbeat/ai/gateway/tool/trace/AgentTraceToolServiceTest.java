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

package org.apache.hertzbeat.ai.gateway.tool.trace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.TraceDetailQuery;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/** Test bounded and redacted trace tools. */
class AgentTraceToolServiceTest {

    private EntityTraceQueryService traceQueryService;
    private AgentTraceToolService service;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindWorkspaceId("team-b");
        traceQueryService = mock(EntityTraceQueryService.class);
        service = new AgentTraceToolService(traceQueryService);
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void shouldBoundTraceListAndRedactResourceAttributes() {
        TraceListItemDto row = new TraceListItemDto();
        row.setTraceId("trace-1");
        row.setServiceName("checkout");
        row.setResourceAttributes(Map.of("api_key", "trace-secret"));
        when(traceQueryService.queryTraceList("team-b", 9L, 1_000L, 2_000L, null, true,
                "checkout", null, "prod", null, null, null, null, 2, 50, true, null, null))
                .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(2, 50), 101));

        Map<String, Object> result = service.queryTraces(9L, 1_000L, 2_000L, null, true,
                "checkout", null, "prod", null, 2, 500, true);

        assertEquals(101L, result.get("totalElements"));
        assertFalse(result.toString().contains("trace-secret"));
        verify(traceQueryService).queryTraceList("team-b", 9L, 1_000L, 2_000L, null, true,
                "checkout", null, "prod", null, null, null, null, 2, 50, true, null, null);
    }

    @Test
    void shouldUseExactDetailContextAndBoundSpanOutput() {
        TraceDetailDto detail = new TraceDetailDto();
        detail.setTraceId("trace-2");
        TraceSpanNodeDto span = new TraceSpanNodeDto();
        span.setTraceId("trace-2");
        span.setSpanId("span-1");
        span.setStatusMessage("failed authorization=private-token");
        span.setSpanAttributes(Map.of("password", "span-secret"));
        detail.setSpans(List.of(span));
        when(traceQueryService.getTraceDetail(any(), any(TraceDetailQuery.class))).thenReturn(detail);

        Map<String, Object> result = service.getTrace("trace-2", "span-1", 1_000L, 2_000L,
                "checkout", "shop", "prod", "service.version=1", "http.status_code=503", 10L, 20L);

        ArgumentCaptor<TraceDetailQuery> query = ArgumentCaptor.forClass(TraceDetailQuery.class);
        verify(traceQueryService).getTraceDetail(org.mockito.ArgumentMatchers.eq("team-b"), query.capture());
        assertEquals("trace-2", query.getValue().traceId());
        assertEquals(null, query.getValue().entityId());
        assertEquals("span-1", query.getValue().spanId());
        assertEquals("service.version=1", query.getValue().resourceFilter());
        assertEquals("http.status_code=503", query.getValue().attributeFilter());
        assertEquals(10L, query.getValue().minDurationMs());
        assertEquals(20L, query.getValue().maxDurationMs());
        assertFalse(result.toString().contains("private-token"));
        assertFalse(result.toString().contains("span-secret"));
    }

    @Test
    void shouldRejectMissingRuntimeWorkspaceBeforeTraceRead() {
        AuthTokenRequestContext.clear();

        assertThrows(CommonException.class, () -> service.getTrace("trace-2", null, 1_000L, 2_000L,
                null, null, null, null, null, null, null));

        verifyNoInteractions(traceQueryService);
    }

    @Test
    void shouldRejectUnboundedTraceRange() {
        assertThrows(IllegalArgumentException.class,
                () -> service.queryTraces(null, 1_000L, 1_000L + Duration.ofDays(8).toMillis(),
                        null, null, null, null, null, null, null, null, null));
    }
}
