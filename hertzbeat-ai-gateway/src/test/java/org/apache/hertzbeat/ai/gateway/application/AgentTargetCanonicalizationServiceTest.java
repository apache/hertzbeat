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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Gateway adaptation and untrusted source-intent contracts. */
@ExtendWith(MockitoExtension.class)
class AgentTargetCanonicalizationServiceTest {

    @Mock
    private EntityMonitorMetricTargetCanonicalizer canonicalizer;
    @Mock
    private AgentSingleAlertTargetAuthorityService alertAuthorityService;
    @Mock
    private AgentEntityTargetAuthorityService entityAuthorityService;
    @Mock
    private AgentTopologyTargetAuthorityService topologyAuthorityService;

    @Test
    void sourceIntentShouldBecomeTheExactManagerCanonicalTarget() {
        when(canonicalizer.canonicalize("workspace-a", managerIntent())).thenReturn(managerTarget("a".repeat(64)));

        InvokeCommand canonical = service().canonicalize(command(sourceTarget()));

        assertEquals("entity-monitor-metric.v1", canonical.userInput().getTarget().getVersion());
        assertEquals(7L, canonical.userInput().getTarget().getEntityId());
        assertEquals("checkout", canonical.userInput().getTarget().getService().getName());
        assertEquals("sha256:" + "a".repeat(64), canonical.userInput().getTarget().getAuthority().getHash());
        assertEquals("UTC", canonical.userInput().getTarget().getSignal().getTimezone());
    }

    @Test
    void clientSuppliedAuthorityFieldsMustBeRejectedBeforeManagerLookup() {
        List<AgentTargetRef> forged = List.of(
                sourceTarget().toBuilder().entityId(7L).build(),
                sourceTarget().toBuilder().version("entity-monitor-metric.v1").build(),
                sourceTarget().toBuilder().service(AgentServiceRef.builder().name("forged").build()).build(),
                sourceTarget().toBuilder().authority(AgentTargetAuthority.builder()
                        .bindingId(11L).version("1").hash("sha256:" + "0".repeat(64)).build()).build());

        for (AgentTargetRef target : forged) {
            assertThrows(IllegalArgumentException.class, () -> service().canonicalize(command(target)));
        }
    }

    @Test
    void replayAndRetryMustCompareSourceIntentButKeepAuthorityServerSide() {
        AgentTargetRef canonical = canonicalTarget("a".repeat(64));

        InvokeCommand replay = service().replayCommand(command(sourceTarget()), canonical);
        AgentTargetRef retry = AgentTargetCanonicalizationService.retrySourceIntent(canonical);

        assertEquals(canonical, replay.userInput().getTarget());
        assertEquals(sourceTarget(), retry);
        assertNull(retry.getEntityId());
        assertNull(retry.getAuthority());
        assertThrows(IllegalArgumentException.class, () -> service().replayCommand(
                command(sourceTarget().toBuilder().signal(sourceTarget().getSignal().toBuilder()
                        .query("basic.connections").build()).build()), canonical));
    }

    @Test
    void unsafeOrUnexpectedCanonicalResultMustFailClosedWithoutItsCause() {
        var unsafe = new EntityMonitorMetricTargetCanonicalizer.CanonicalTarget(
                "entity-monitor-metric.v1", 7L, 42L,
                new EntityMonitorMetricTargetCanonicalizer.ServiceIdentity(
                        "authorization=Bearer private", "commerce", "prod"),
                managerTarget("a".repeat(64)).signal(), managerTarget("a".repeat(64)).authority());
        when(canonicalizer.canonicalize("workspace-a", managerIntent())).thenReturn(unsafe);

        IllegalArgumentException unsafeFailure = assertThrows(IllegalArgumentException.class,
                () -> service().canonicalize(command(sourceTarget())));
        assertEquals("Investigation target is unavailable", unsafeFailure.getMessage());
        assertNull(unsafeFailure.getCause());

        when(canonicalizer.canonicalize("workspace-a", managerIntent()))
                .thenThrow(new IllegalStateException("jdbc:password=private"));
        IllegalArgumentException unexpectedFailure = assertThrows(IllegalArgumentException.class,
                () -> service().canonicalize(command(sourceTarget())));
        assertEquals("Investigation target is unavailable", unexpectedFailure.getMessage());
        assertNull(unexpectedFailure.getCause());
    }

    @Test
    void exactSingleAlertIntentShouldCanonicalizeAndReplayOnlyItsPersistedTarget() {
        AgentTargetRef source = AgentTargetRef.builder().alertId(42L).alertType("single").build();
        AgentTargetRef canonical = AgentTargetRef.builder()
                .version(AgentSingleAlertTargetAuthorityService.TARGET_VERSION)
                .alertId(42L).alertType("single")
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentSingleAlertTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
        when(alertAuthorityService.canonicalize("workspace-a", 42L)).thenReturn(canonical);

        assertEquals(canonical, service().canonicalize(command(source)).userInput().getTarget());
        assertEquals(canonical, service().replayCommand(command(source), canonical).userInput().getTarget());
        assertEquals(source, AgentTargetCanonicalizationService.retrySourceIntent(canonical));
    }

    @Test
    void malformedOrUnavailableSingleAlertIntentShouldFailCauseFreeWithoutLookingUpOtherResources() {
        AgentTargetRef malformed = AgentTargetRef.builder().alertId(42L).build();

        IllegalArgumentException malformedFailure = assertThrows(IllegalArgumentException.class,
                () -> service().canonicalize(command(malformed)));
        assertEquals("Investigation target is unavailable", malformedFailure.getMessage());
        assertNull(malformedFailure.getCause());
        verifyNoInteractions(alertAuthorityService);

        AgentTargetRef source = AgentTargetRef.builder().alertId(42L).alertType("single").build();
        when(alertAuthorityService.canonicalize("workspace-a", 42L))
                .thenThrow(new AgentSingleAlertTargetAuthorityService.UnavailableException());
        IllegalArgumentException unavailableFailure = assertThrows(IllegalArgumentException.class,
                () -> service().canonicalize(command(source)));
        assertEquals("Investigation target is unavailable", unavailableFailure.getMessage());
        assertNull(unavailableFailure.getCause());
    }

    @Test
    void exactEntityIntentShouldCanonicalizeReplayAndRetryOnlyTheSourceId() {
        AgentTargetRef source = AgentTargetRef.builder().entityId(42L).build();
        AgentTargetRef canonical = entityTarget("a".repeat(64));
        when(entityAuthorityService.canonicalize("workspace-a", 42L)).thenReturn(canonical);

        assertEquals(canonical, service().canonicalize(command(source)).userInput().getTarget());
        assertEquals(canonical, service().replayCommand(command(source), canonical).userInput().getTarget());
        assertEquals(source, AgentTargetCanonicalizationService.retrySourceIntent(canonical));
        assertEquals(true, service().requiresCanonicalization(command(source)));
    }

    @Test
    void malformedOrUnavailableEntityIntentShouldFailCauseFreeBeforeAnyResourceLookup() {
        AgentTargetAuthority authority = AgentTargetAuthority.builder().bindingId(42L)
                .version(AgentEntityTargetAuthorityService.AUTHORITY_VERSION)
                .hash("sha256:" + "0".repeat(64)).build();
        List<AgentTargetRef> malformed = List.of(
                AgentTargetRef.builder().entityId(42L).monitorId(7L).build(),
                AgentTargetRef.builder().version(AgentEntityTargetAuthorityService.TARGET_VERSION).build(),
                AgentTargetRef.builder().version(AgentEntityTargetAuthorityService.TARGET_VERSION + ".forged")
                        .build(),
                AgentTargetRef.builder().authority(authority).build());

        for (AgentTargetRef target : malformed) {
            IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
                    () -> service().canonicalize(command(target)));
            assertEquals("Investigation target is unavailable", failure.getMessage());
            assertNull(failure.getCause());
        }
        verifyNoInteractions(entityAuthorityService);
        verifyNoInteractions(canonicalizer);
        verifyNoInteractions(alertAuthorityService);

        when(entityAuthorityService.canonicalize("workspace-a", 42L))
                .thenThrow(new AgentEntityTargetAuthorityService.UnavailableException());
        IllegalArgumentException unavailable = assertThrows(IllegalArgumentException.class,
                () -> service().canonicalize(command(AgentTargetRef.builder().entityId(42L).build())));
        assertEquals("Investigation target is unavailable", unavailable.getMessage());
        assertNull(unavailable.getCause());
    }

    @Test
    void exactTopologyIntentShouldCanonicalizeReplayAndRetryOnlyItsSourceScope() {
        AgentTargetRef source = AgentTargetRef.builder().topology(topologyScope()).build();
        AgentTargetRef canonical = topologyTarget("a".repeat(64));
        when(topologyAuthorityService.canonicalize("workspace-a", topologyScope())).thenReturn(canonical);
        when(topologyAuthorityService.normalizeSource(topologyScope())).thenReturn(topologyScope());

        assertEquals(canonical, service().canonicalize(command(source)).userInput().getTarget());
        assertEquals(canonical, service().replayCommand(command(source), canonical).userInput().getTarget());
        assertEquals(source, AgentTargetCanonicalizationService.retrySourceIntent(canonical));
        assertEquals(true, service().requiresCanonicalization(command(source)));
    }

    @Test
    void malformedOrUnavailableTopologyIntentShouldFailCauseFreeBeforeAnyResourceLookup() {
        List<AgentTargetRef> malformed = List.of(
                AgentTargetRef.builder().entityId(42L).topology(topologyScope()).build(),
                AgentTargetRef.builder().topology(topologyScope().toBuilder().rootEntityId(null).build()).build(),
                AgentTargetRef.builder().version(AgentTopologyTargetAuthorityService.TARGET_VERSION).build(),
                AgentTargetRef.builder().version(AgentTopologyTargetAuthorityService.TARGET_VERSION + ".forged")
                        .build());

        for (AgentTargetRef target : malformed) {
            IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
                    () -> service().canonicalize(command(target)));
            assertEquals("Investigation target is unavailable", failure.getMessage());
            assertNull(failure.getCause());
        }
        verifyNoInteractions(topologyAuthorityService);
        verifyNoInteractions(canonicalizer);
        verifyNoInteractions(alertAuthorityService);
        verifyNoInteractions(entityAuthorityService);

        when(topologyAuthorityService.canonicalize("workspace-a", topologyScope()))
                .thenThrow(new AgentTopologyTargetAuthorityService.UnavailableException());
        IllegalArgumentException unavailable = assertThrows(IllegalArgumentException.class,
                () -> service().canonicalize(command(AgentTargetRef.builder().topology(topologyScope()).build())));
        assertEquals("Investigation target is unavailable", unavailable.getMessage());
        assertNull(unavailable.getCause());
    }

    private AgentTargetCanonicalizationService service() {
        return new AgentTargetCanonicalizationService(
                canonicalizer, alertAuthorityService, entityAuthorityService, topologyAuthorityService);
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
        return AgentTargetRef.builder().monitorId(42L).signal(AgentSignalRef.builder()
                .type("metrics").query("basic.qps").start(1_000L).end(2_000L).timezone("UTC").build()).build();
    }

    private AgentTargetRef canonicalTarget(String hash) {
        return AgentTargetRef.builder().version("entity-monitor-metric.v1").entityId(7L).monitorId(42L)
                .service(AgentServiceRef.builder().name("checkout").namespace("commerce").environment("prod").build())
                .signal(sourceTarget().getSignal()).authority(AgentTargetAuthority.builder().bindingId(11L)
                .version("1").hash("sha256:" + hash).build()).build();
    }

    private AgentTargetRef entityTarget(String hash) {
        return AgentTargetRef.builder().version(AgentEntityTargetAuthorityService.TARGET_VERSION).entityId(42L)
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentEntityTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + hash).build())
                .build();
    }

    private AgentTopologyRef topologyScope() {
        return AgentTopologyRef.builder()
                .rootEntityId(42L).nodeId("entity:42").depth(2)
                .environment("prod").sourceKind("otlp-trace-call")
                .start(1_000L).end(2_000L).relationType("trace-call")
                .hideInternal(true).pageIndex(0).pageSize(50)
                .build();
    }

    private AgentTargetRef topologyTarget(String hash) {
        return AgentTargetRef.builder()
                .version(AgentTopologyTargetAuthorityService.TARGET_VERSION)
                .entityId(42L)
                .topology(topologyScope())
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentTopologyTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + hash).build())
                .build();
    }

    private EntityMonitorMetricTargetCanonicalizer.SourceIntent managerIntent() {
        return new EntityMonitorMetricTargetCanonicalizer.SourceIntent(
                42L, "metrics", "basic.qps", 1_000L, 2_000L, "UTC");
    }

    private EntityMonitorMetricTargetCanonicalizer.CanonicalTarget managerTarget(String hash) {
        return new EntityMonitorMetricTargetCanonicalizer.CanonicalTarget("entity-monitor-metric.v1", 7L, 42L,
                new EntityMonitorMetricTargetCanonicalizer.ServiceIdentity("checkout", "commerce", "prod"),
                new EntityMonitorMetricTargetCanonicalizer.CanonicalSignal(
                        "metrics", "basic.qps", 1_000L, 2_000L, "UTC"),
                new EntityMonitorMetricTargetCanonicalizer.Authority(11L, "1", "sha256:" + hash));
    }
}
