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

package org.apache.hertzbeat.ai.gateway.tool.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/** Test exact workspace-bounded and redacted log queries. */
class AgentLogToolServiceTest {

    private LogQueryService logQueryService;
    private AgentLogToolService service;

    @BeforeEach
    void setUp() {
        logQueryService = mock(LogQueryService.class);
        service = new AgentLogToolService(logQueryService);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
    }

    @AfterEach
    void clearContext() {
        AuthTokenRequestContext.bindWorkspaceId(null);
    }

    @Test
    void shouldUseExactWorkspaceScopeAndRedactTelemetryBeforeModelContext() {
        LogEntry log = LogEntry.builder().timeUnixNano(1_000_000L).severityNumber(17).severityText("ERROR")
                .body("request failed password=super-secret")
                .attributes(Map.of("api_key", "another-secret"))
                .resource(Map.of("service.name", "checkout"))
                .build();
        when(logQueryService.list("team-a", null, 1_000L, 2_000L, null, null, 17, "ERROR", null,
                "checkout", "commerce", "prod", "service.version=1", "http.route=/pay",
                0, 20, true, false))
                .thenReturn(new PageImpl<>(List.of(log), PageRequest.of(0, 20), 1));

        Map<String, Object> result = service.queryLogs(1_000L, 2_000L, null, null, 17, "error", null,
                "checkout", "commerce", "prod", "service.version=1", "http.route=/pay",
                true, false, 0, 20);

        Map<?, ?> row = (Map<?, ?>) ((List<?>) result.get("content")).getFirst();
        assertFalse(((String) row.get("body")).contains("super-secret"));
        assertFalse(((String) row.get("attributes")).contains("another-secret"));
        verify(logQueryService).list("team-a", null, 1_000L, 2_000L, null, null, 17, "ERROR", null,
                "checkout", "commerce", "prod", "service.version=1", "http.route=/pay",
                0, 20, true, false);
    }

    @Test
    void shouldRejectQueriesWiderThanSevenDays() {
        assertThrows(IllegalArgumentException.class,
                () -> service.queryLogs(1_000L, 1_000L + Duration.ofDays(8).toMillis(), null, null,
                        null, null, null, null, null, null, null, null,
                        false, false, 0, 20));
        verifyNoInteractions(logQueryService);
    }

    @Test
    void shouldFailClosedBeforeQueryWhenWorkspaceIsMissing() {
        AuthTokenRequestContext.bindWorkspaceId(null);

        CommonException failure = assertThrows(CommonException.class,
                () -> service.queryLogs(1_000L, 2_000L, null, null, null, null, null,
                        null, null, null, null, null, false, false, 0, 20));

        assertEquals("log_workspace_unavailable", failure.getMessage());
        verifyNoInteractions(logQueryService);
    }

    @Test
    void shouldReportUnavailableWhenProductQueryServiceIsNotConfigured() {
        AgentLogToolService unavailable = new AgentLogToolService((LogQueryService) null);

        CommonException failure = assertThrows(CommonException.class,
                () -> unavailable.queryLogs(1_000L, 2_000L, null, null, null, null, null,
                        null, null, null, null, null, false, false, 0, 20));

        assertEquals("log_query_service_unavailable", failure.getMessage());
    }
}
