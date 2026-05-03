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

package org.apache.hertzbeat.common.observability.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanEventDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanLinkDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;
import org.junit.jupiter.api.Test;

class TraceDtoMigrationTest {

    @Test
    void shouldExposeTraceDtosFromCommonObservabilityPackages() {
        CodeNavigationHint navigationHint = new CodeNavigationHint(
                "https://example.com/repo",
                "github",
                "service/src/main",
                "service error",
                "service error");
        TraceSpanEventDto event = new TraceSpanEventDto(1L, "exception", Map.of("error", true), 0);
        TraceSpanLinkDto link = new TraceSpanLinkDto("trace-1", "span-2", "state", Map.of("peer.service", "checkout"), 0);
        TraceSpanNodeDto span = new TraceSpanNodeDto(
                "trace-1",
                "span-1",
                null,
                "GET /orders",
                "order-service",
                "STATUS_CODE_OK",
                "SPAN_KIND_SERVER",
                null,
                "state",
                "scope",
                "1.0.0",
                1_000L,
                123L,
                true,
                Map.of("service.name", "order-service"),
                Map.of("http.method", "GET"),
                List.of(event),
                List.of(link),
                navigationHint);
        TraceDetailDto detail = new TraceDetailDto(
                "trace-1",
                "span-1",
                "order-service",
                "prod",
                "GET /orders",
                1_000L,
                "STATUS_CODE_OK",
                123L,
                0,
                Map.of("service.name", "order-service"),
                List.of(span));

        assertEquals("trace-1", detail.getTraceId());
        assertEquals("order-service", detail.getServiceName());
        assertNotNull(detail.getSpans());
        assertEquals("github", detail.getSpans().getFirst().getCodeNavigationHint().getProvider());
    }
}
