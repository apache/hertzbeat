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
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.TraceDetailQuery;
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
        traceQueryService = mock(EntityTraceQueryService.class);
        service = new AgentTraceToolService(traceQueryService);
    }

    @Test
    void shouldBoundTraceListAndRedactResourceAttributes() {
        TraceListItemDto row = new TraceListItemDto();
        row.setTraceId("trace-1");
        row.setServiceName("checkout");
        row.setResourceAttributes(Map.of("api_key", "trace-secret"));
        when(traceQueryService.queryTraceList(9L, 1_000L, 2_000L, null, true,
                "checkout", null, "prod", null, null, null, 2, 50, true))
                .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(2, 50), 101));

        Map<String, Object> result = service.queryTraces(9L, 1_000L, 2_000L, null, true,
                "checkout", null, "prod", null, 2, 500, true);

        assertEquals(101L, result.get("totalElements"));
        assertFalse(result.toString().contains("trace-secret"));
        verify(traceQueryService).queryTraceList(9L, 1_000L, 2_000L, null, true,
                "checkout", null, "prod", null, null, null, 2, 50, true);
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
        when(traceQueryService.getTraceDetail(any(TraceDetailQuery.class))).thenReturn(detail);

        Map<String, Object> result = service.getTrace(7L, "trace-2", 1_000L, 2_000L,
                "checkout", "shop", "prod");

        ArgumentCaptor<TraceDetailQuery> query = ArgumentCaptor.forClass(TraceDetailQuery.class);
        verify(traceQueryService).getTraceDetail(query.capture());
        assertEquals("trace-2", query.getValue().traceId());
        assertEquals(7L, query.getValue().entityId());
        assertFalse(result.toString().contains("private-token"));
        assertFalse(result.toString().contains("span-secret"));
    }

    @Test
    void shouldRejectUnboundedTraceRange() {
        assertThrows(IllegalArgumentException.class,
                () -> service.queryTraces(null, 1_000L, 1_000L + Duration.ofDays(8).toMillis(),
                        null, null, null, null, null, null, null, null, null));
    }
}
