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
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Strict source-only canonicalization and replay for exact Log Explore page targets. */
@ExtendWith(MockitoExtension.class)
class AgentLogTargetCanonicalizationTest {

    @Mock
    private EntityMonitorMetricTargetCanonicalizer monitorCanonicalizer;
    @Mock
    private AgentLogTargetAuthorityService logAuthorityService;

    @Test
    void exactLogIntentShouldCanonicalizeReplayAndRetryOnlyItsSourceScope() {
        AgentTargetRef source = sourceTarget();
        AgentTargetRef canonical = canonicalTarget();
        when(logAuthorityService.canonicalize("workspace-a", source.getLog())).thenReturn(canonical);
        when(logAuthorityService.normalizeSource(source.getLog())).thenReturn(source.getLog());
        when(logAuthorityService.isCanonicalTarget(canonical)).thenReturn(true);

        assertEquals(canonical, service().canonicalize(command(source)).userInput().getTarget());
        assertEquals(canonical, service().replayCommand(command(source), canonical).userInput().getTarget());
        assertEquals(source, AgentTargetCanonicalizationService.retrySourceIntent(canonical));
        assertEquals(true, service().requiresCanonicalization(command(source)));
    }

    @Test
    void forgedOrUnavailableLogIntentShouldFailCauseFreeBeforeOtherLookups() {
        List<AgentTargetRef> forged = List.of(
                sourceTarget().toBuilder().entityId(42L).build(),
                sourceTarget().toBuilder().version(AgentLogTargetAuthorityService.TARGET_VERSION).build(),
                AgentTargetRef.builder().version(AgentLogTargetAuthorityService.TARGET_VERSION + ".forged").build(),
                AgentTargetRef.builder().authority(AgentTargetAuthority.builder()
                        .version(AgentLogTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "0".repeat(64)).build()).build());

        for (AgentTargetRef target : forged) {
            AgentTargetCanonicalizationService.TargetCanonicalizationException failure = assertThrowsExactly(
                    AgentTargetCanonicalizationService.TargetCanonicalizationException.class,
                    () -> service().canonicalize(command(target)));
            assertEquals("Investigation target is unavailable", failure.getMessage());
            assertNull(failure.getCause());
        }
        verifyNoInteractions(monitorCanonicalizer);

        when(logAuthorityService.canonicalize("workspace-a", sourceTarget().getLog()))
                .thenThrow(new AgentLogTargetAuthorityService.UnavailableException());
        AgentTargetCanonicalizationService.TargetCanonicalizationException unavailable = assertThrowsExactly(
                AgentTargetCanonicalizationService.TargetCanonicalizationException.class,
                () -> service().canonicalize(command(sourceTarget())));
        assertEquals("Investigation target is unavailable", unavailable.getMessage());
        assertNull(unavailable.getCause());
    }

    private AgentTargetCanonicalizationService service() {
        AgentLogTargetCanonicalizationAdapter logAdapter =
                new AgentLogTargetCanonicalizationAdapter(logAuthorityService);
        return new AgentTargetCanonicalizationService(
                monitorCanonicalizer, null, null, null, null, logAdapter);
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
        return AgentTargetRef.builder().log(AgentLogRef.builder()
                .start(1_000L).end(2_000L).traceId("trace-42").spanId("span-7")
                .severityNumber(17).severityText("ERROR").search("failed")
                .serviceName("checkout").serviceNamespace("commerce").environment("prod")
                .resourceFilter("service.version=1").attributeFilter("http.route=/pay")
                .hideInternal(true).hideNoise(false).pageIndex(0).pageSize(20).build()).build();
    }

    private AgentTargetRef canonicalTarget() {
        return sourceTarget().toBuilder()
                .version(AgentLogTargetAuthorityService.TARGET_VERSION)
                .authority(AgentTargetAuthority.builder()
                        .version(AgentLogTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }
}
