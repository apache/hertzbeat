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
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTraceRef;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.TraceDetailQuery;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Exact trusted-workspace authority for one Trace Explore detail scope. */
@ExtendWith(MockitoExtension.class)
class AgentTraceTargetAuthorityServiceTest {

    @Mock
    private EntityTraceQueryService traceQueryService;

    @Test
    void exactTraceShouldPreserveTheNormalizedScopeAndObservedAuthority() {
        when(traceQueryService.getTraceDetail("team-a", detailQuery())).thenReturn(trace("checkout"));

        AgentTargetRef canonical = service().canonicalize("team-a", sourceTrace());

        assertEquals("trace-detail.v1", canonical.getVersion());
        assertEquals(sourceTrace(), canonical.getTrace());
        assertNull(canonical.getAuthority().getBindingId());
        assertEquals("trace-detail-authority.v1", canonical.getAuthority().getVersion());
        assertTrue(canonical.getAuthority().getHash().matches("sha256:[0-9a-f]{64}"));
        assertNull(canonical.getMonitorId());
        assertNull(canonical.getEntityId());
        assertNull(canonical.getSignal());
        assertNull(canonical.getTopology());
        assertNull(canonical.getService());
    }

    @Test
    void traceAuthorityShouldChangeWhenTheObservedTraceOrExactScopeChanges() {
        when(traceQueryService.getTraceDetail("team-a", detailQuery()))
                .thenReturn(trace("checkout"), trace("payments"), trace("payments"));
        TraceDetailQuery changedQuery = new TraceDetailQuery(null, "trace-42", "span-7", 1_000L, 2_000L,
                "checkout", "commerce", "staging", null, null, null, null);
        when(traceQueryService.getTraceDetail("team-a", changedQuery)).thenReturn(trace("payments"));

        AgentTargetRef original = service().canonicalize("team-a", sourceTrace());
        AgentTargetRef observedChanged = service().canonicalize("team-a", sourceTrace());
        AgentTargetRef scopeChanged = service().canonicalize("team-a", sourceTrace().toBuilder()
                .environment("staging").build());

        assertFalse(original.getAuthority().getHash().equals(observedChanged.getAuthority().getHash()));
        assertFalse(observedChanged.getAuthority().getHash().equals(scopeChanged.getAuthority().getHash()));
        assertFalse(service().verify("team-a", original));
    }

    @Test
    void invalidOrUnavailableTraceMustFailCauseFreeBeforeClaimingAuthority() {
        List<AgentTraceRef> invalid = List.of(
                sourceTrace().toBuilder().traceId(" ").build(),
                sourceTrace().toBuilder().traceId("bad/id").build(),
                sourceTrace().toBuilder().start(null).build(),
                sourceTrace().toBuilder().end(1_000L).build(),
                sourceTrace().toBuilder().end(1_000L + 8L * 24 * 60 * 60 * 1_000).build(),
                sourceTrace().toBuilder().minDurationMs(3L).maxDurationMs(2L).build(),
                sourceTrace().toBuilder().resourceFilter("authorization=Bearer private").build());

        for (AgentTraceRef trace : invalid) {
            AgentTraceTargetAuthorityService.UnavailableException failure = assertThrowsExactly(
                    AgentTraceTargetAuthorityService.UnavailableException.class,
                    () -> service().canonicalize("team-a", trace));
            assertNull(failure.getCause());
        }
        verifyNoInteractions(traceQueryService);

        when(traceQueryService.getTraceDetail("team-a", detailQuery())).thenReturn(null);
        AgentTraceTargetAuthorityService.UnavailableException failure = assertThrowsExactly(
                AgentTraceTargetAuthorityService.UnavailableException.class,
                () -> service().canonicalize("team-a", sourceTrace()));
        assertNull(failure.getCause());
    }

    private AgentTraceTargetAuthorityService service() {
        return new AgentTraceTargetAuthorityService(traceQueryService);
    }

    private AgentTraceRef sourceTrace() {
        return AgentTraceRef.builder()
                .traceId("trace-42")
                .spanId("span-7")
                .start(1_000L)
                .end(2_000L)
                .serviceName("checkout")
                .serviceNamespace("commerce")
                .environment("prod")
                .build();
    }

    private TraceDetailQuery detailQuery() {
        return new TraceDetailQuery(null, "trace-42", "span-7", 1_000L, 2_000L,
                "checkout", "commerce", "prod", null, null, null, null);
    }

    private TraceDetailDto trace(String serviceName) {
        return new TraceDetailDto("trace-42", "root-1", serviceName, "commerce", "GET /checkout",
                12_000L, "ERROR", 1_500L, 1, Map.of("deployment.environment.name", "prod"), List.of());
    }
}
