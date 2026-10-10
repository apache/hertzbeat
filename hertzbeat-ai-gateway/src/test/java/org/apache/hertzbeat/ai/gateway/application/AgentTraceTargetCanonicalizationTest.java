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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrowsExactly;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTraceRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Strict source-only canonicalization and replay for exact Trace Explore detail targets. */
@ExtendWith(MockitoExtension.class)
class AgentTraceTargetCanonicalizationTest {

    @Mock
    private EntityMonitorMetricTargetCanonicalizer monitorCanonicalizer;
    @Mock
    private AgentTraceTargetAuthorityService traceAuthorityService;

    @Test
    void exactTraceIntentShouldCanonicalizeReplayAndRetryOnlyItsSourceScope() {
        AgentTargetRef source = sourceTarget();
        AgentTargetRef canonical = canonicalTarget();
        when(traceAuthorityService.canonicalize("workspace-a", source.getTrace())).thenReturn(canonical);
        when(traceAuthorityService.normalizeSource(source.getTrace())).thenReturn(source.getTrace());
        when(traceAuthorityService.isCanonicalTarget(canonical)).thenReturn(true);

        assertEquals(canonical, service().canonicalize(command(source)).userInput().getTarget());
        assertEquals(canonical, service().replayCommand(command(source), canonical).userInput().getTarget());
        assertEquals(source, AgentTargetCanonicalizationService.retrySourceIntent(canonical));
        assertEquals(true, service().requiresCanonicalization(command(source)));
    }

    @Test
    void forgedOrUnavailableTraceIntentShouldFailCauseFreeBeforeOtherLookups() {
        List<AgentTargetRef> forged = List.of(
                sourceTarget().toBuilder().entityId(42L).build(),
                sourceTarget().toBuilder().version(AgentTraceTargetAuthorityService.TARGET_VERSION).build(),
                AgentTargetRef.builder().version(AgentTraceTargetAuthorityService.TARGET_VERSION + ".forged").build(),
                AgentTargetRef.builder().authority(AgentTargetAuthority.builder()
                        .version(AgentTraceTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "0".repeat(64)).build()).build());

        for (AgentTargetRef target : forged) {
            AgentTargetCanonicalizationService.TargetCanonicalizationException failure = assertThrowsExactly(
                    AgentTargetCanonicalizationService.TargetCanonicalizationException.class,
                    () -> service().canonicalize(command(target)));
            assertEquals("Investigation target is unavailable", failure.getMessage());
            assertNull(failure.getCause());
        }
        verifyNoInteractions(monitorCanonicalizer);

        when(traceAuthorityService.canonicalize("workspace-a", sourceTarget().getTrace()))
                .thenThrow(new AgentTraceTargetAuthorityService.UnavailableException());
        AgentTargetCanonicalizationService.TargetCanonicalizationException unavailable = assertThrowsExactly(
                AgentTargetCanonicalizationService.TargetCanonicalizationException.class,
                () -> service().canonicalize(command(sourceTarget())));
        assertEquals("Investigation target is unavailable", unavailable.getMessage());
        assertNull(unavailable.getCause());
    }

    private AgentTargetCanonicalizationService service() {
        AgentTraceTargetCanonicalizationAdapter traceAdapter =
                new AgentTraceTargetCanonicalizationAdapter(traceAuthorityService);
        return new AgentTargetCanonicalizationService(monitorCanonicalizer, null, null, null, traceAdapter);
    }

    private InvokeCommand command(AgentTargetRef target) {
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder().channelId("web-ui").workspaceId("workspace-a").receivedAt(1L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(ReplyMode.STREAM).commandId("message-1")
                .userInput(UserInput.builder().conversationId("conversation-1").messageId("message-1")
                        .target(target).message(UserInput.Message.builder().text("inspect").build()).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT).build();
    }

    private AgentTargetRef sourceTarget() {
        return AgentTargetRef.builder().trace(AgentTraceRef.builder()
                .traceId("trace-42").spanId("span-7").start(1_000L).end(2_000L)
                .serviceName("checkout").serviceNamespace("commerce").environment("prod").build()).build();
    }

    private AgentTargetRef canonicalTarget() {
        return sourceTarget().toBuilder()
                .version(AgentTraceTargetAuthorityService.TARGET_VERSION)
                .authority(AgentTargetAuthority.builder()
                        .version(AgentTraceTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }
}
