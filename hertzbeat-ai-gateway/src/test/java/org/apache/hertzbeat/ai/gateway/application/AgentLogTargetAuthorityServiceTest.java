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

package org.apache.hertzbeat.ai.gateway.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrowsExactly;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/** Exact trusted-workspace authority for one non-empty Log Explore page. */
@ExtendWith(MockitoExtension.class)
class AgentLogTargetAuthorityServiceTest {

    @Mock
    private LogQueryService logQueryService;

    @Test
    void exactLogPageShouldPreserveNormalizedScopeAndObservedAuthority() {
        when(logQueryService.list("team-a", null, 1_000L, 2_000L, "trace-42", "span-7", 17, "ERROR",
                "failed", "checkout", "commerce", "prod", "service.version=1", "http.route=/pay",
                0, 20, true, false)).thenReturn(page(log("request failed")));

        AgentTargetRef canonical = service().canonicalize("team-a", sourceLog());

        assertEquals("log-page.v1", canonical.getVersion());
        assertEquals(sourceLog(), canonical.getLog());
        assertNull(canonical.getAuthority().getBindingId());
        assertEquals("log-page-authority.v1", canonical.getAuthority().getVersion());
        assertTrue(canonical.getAuthority().getHash().matches("sha256:[0-9a-f]{64}"));
        assertNull(canonical.getMonitorId());
        assertNull(canonical.getEntityId());
        assertNull(canonical.getSignal());
        assertNull(canonical.getTopology());
        assertNull(canonical.getTrace());
        assertNull(canonical.getService());
    }

    @Test
    void authorityShouldChangeWhenObservedRowsChangeAndEmptyPagesMustBeUnavailable() {
        when(logQueryService.list("team-a", null, 1_000L, 2_000L, "trace-42", "span-7", 17, "ERROR",
                "failed", "checkout", "commerce", "prod", "service.version=1", "http.route=/pay",
                0, 20, true, false))
                .thenReturn(page(log("first")), page(log("second")), page(log("second")), emptyPage());

        AgentTargetRef first = service().canonicalize("team-a", sourceLog());
        AgentTargetRef second = service().canonicalize("team-a", sourceLog());

        assertFalse(first.getAuthority().getHash().equals(second.getAuthority().getHash()));
        assertFalse(service().verify("team-a", first));
        assertThrowsExactly(AgentLogTargetAuthorityService.UnavailableException.class,
                () -> service().canonicalize("team-a", sourceLog()));
    }

    @Test
    void invalidScopeMustFailCauseFreeBeforeStorage() {
        List<AgentLogRef> invalid = List.of(
                sourceLog().toBuilder().start(null).build(),
                sourceLog().toBuilder().end(1_000L).build(),
                sourceLog().toBuilder().end(1_000L + 8L * 24 * 60 * 60 * 1_000).build(),
                sourceLog().toBuilder().traceId("bad/id").build(),
                sourceLog().toBuilder().severityNumber(25).build(),
                sourceLog().toBuilder().severityText("NOTICE").build(),
                sourceLog().toBuilder().search("authorization=Bearer private").build(),
                sourceLog().toBuilder().pageIndex(-1).build(),
                sourceLog().toBuilder().pageSize(101).build());

        for (AgentLogRef log : invalid) {
            AgentLogTargetAuthorityService.UnavailableException failure = assertThrowsExactly(
                    AgentLogTargetAuthorityService.UnavailableException.class,
                    () -> service().canonicalize("team-a", log));
            assertNull(failure.getCause());
        }
        verifyNoInteractions(logQueryService);
    }

    private AgentLogTargetAuthorityService service() {
        return new AgentLogTargetAuthorityService(logQueryService);
    }

    private AgentLogRef sourceLog() {
        return AgentLogRef.builder()
                .start(1_000L).end(2_000L)
                .traceId("trace-42").spanId("span-7")
                .severityNumber(17).severityText("ERROR").search("failed")
                .serviceName("checkout").serviceNamespace("commerce").environment("prod")
                .resourceFilter("service.version=1").attributeFilter("http.route=/pay")
                .hideInternal(true).hideNoise(false).pageIndex(0).pageSize(20)
                .build();
    }

    private PageImpl<LogEntry> page(LogEntry log) {
        return new PageImpl<>(List.of(log), PageRequest.of(0, 20), 1);
    }

    private PageImpl<LogEntry> emptyPage() {
        return new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
    }

    private LogEntry log(String body) {
        return LogEntry.builder()
                .timeUnixNano(1_500_000_000L).observedTimeUnixNano(1_500_000_001L)
                .severityNumber(17).severityText("ERROR").body(body)
                .traceId("trace-42").spanId("span-7").traceFlags(1)
                .attributes(Map.of("http.route", "/pay"))
                .resource(Map.of("service.name", "checkout", "service.namespace", "commerce"))
                .build();
    }
}
