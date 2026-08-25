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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Real H2 proof for two-phase canonical target admission. */
@SpringJUnitConfig
@ContextConfiguration(classes = AgentRunAdmissionConcurrencyIntegrationTest.TestApplication.class)
class AgentCanonicalAdmissionConcurrencyIntegrationTest {

    @Autowired
    private AgentRunAdmissionService admissionService;
    @Autowired
    private AgentSessionService sessionService;
    @Autowired
    private AgentSessionDao sessionDao;
    @Autowired
    private AgentRunDao runDao;
    @Autowired
    private AgentTranscriptEntryDao transcriptDao;
    @Autowired
    private EntityMonitorMetricTargetCanonicalizer canonicalizer;
    @Autowired
    private AlertService alertService;
    @Autowired
    private EntityWorkspaceQueryService entityWorkspaceQueryService;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void setUp() {
        reset(canonicalizer, alertService, entityWorkspaceQueryService);
        when(canonicalizer.canonicalize(eq("workspace-a"), any())).thenAnswer(invocation ->
                canonical(invocation.getArgument(1), "a".repeat(64)));
        when(alertService.findSingleAlert("workspace-a", 42L))
                .thenReturn(Optional.of(singleAlert("firing")));
        when(entityWorkspaceQueryService.findEntityById("workspace-a", 42L))
                .thenReturn(Optional.of(entity("healthy")));
    }

    @AfterEach
    void cleanDatabase() {
        transcriptDao.deleteAll();
        runDao.deleteAll();
        sessionDao.deleteAll();
        reset(canonicalizer, alertService, entityWorkspaceQueryService);
    }

    @Test
    void concurrentSameIntentShouldCreateOneCanonicalRunAndReplayTheWinner() throws Exception {
        List<AgentRunAdmission> results = concurrent(command("message-1", "basic.qps"),
                command("message-1", "basic.qps"));

        assertEquals(1, decisions(results, AgentRunAdmission.Decision.EXECUTE_NEW));
        assertEquals(1, decisions(results, AgentRunAdmission.Decision.REPLAY_ACTIVE));
        assertEquals(1, runDao.count());
        assertEquals(1, userTranscriptCount());
        AgentTargetRef persisted = AgentRunService.targetFromRun(runDao.findAll().getFirst());
        assertEquals("entity-monitor-metric.v1", persisted.getVersion());
        assertEquals("sha256:" + "a".repeat(64), persisted.getAuthority().getHash());
        TranscriptMessage requestMessage = userTranscript();
        AgentRunRequestSnapshot requestSnapshot = requestMessage.getRequestSnapshot();
        assertEquals(persisted, requestSnapshot.target());
        assertEquals(AgentRunRequestFingerprint.from(requestSnapshot), requestMessage.getRequestFingerprint());
    }

    @Test
    void concurrentDifferentIntentWithSameMessageShouldHaveOneWinnerAndOneMismatch() throws Exception {
        List<AgentRunAdmission> results = concurrent(command("message-1", "basic.qps"),
                command("message-1", "basic.connections"));

        assertEquals(1, decisions(results, AgentRunAdmission.Decision.EXECUTE_NEW));
        assertEquals(1, decisions(results, AgentRunAdmission.Decision.REJECT_MISMATCH));
        assertEquals(1, runDao.count());
        assertEquals(1, userTranscriptCount());
    }

    @Test
    void failedCanonicalizationShouldReprobeAndReplayConcurrentWinner() throws Exception {
        CountDownLatch failedAttemptStarted = new CountDownLatch(1);
        CountDownLatch allowFailure = new CountDownLatch(1);
        AtomicInteger calls = new AtomicInteger();
        when(canonicalizer.canonicalize(eq("workspace-a"), any())).thenAnswer(invocation -> {
            if (calls.incrementAndGet() == 1) {
                failedAttemptStarted.countDown();
                assertTrue(allowFailure.await(5, TimeUnit.SECONDS));
                throw new IllegalArgumentException("Entity monitor metric target is unavailable");
            }
            return canonical(invocation.getArgument(1), "a".repeat(64));
        });
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<AgentRunAdmission> loser = executor.submit(() -> admissionService.admit(
                    command("message-1", "basic.qps")));
            assertTrue(failedAttemptStarted.await(5, TimeUnit.SECONDS));
            AgentRunAdmission winner = admissionService.admit(command("message-1", "basic.qps"));
            allowFailure.countDown();

            assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, winner.decision());
            assertEquals(AgentRunAdmission.Decision.REPLAY_ACTIVE, loser.get(5, TimeUnit.SECONDS).decision());
        }
        assertEquals(1, runDao.count());
        assertEquals(1, userTranscriptCount());
    }

    @Test
    void sameMessageShouldReplayOldAuthorityWhileNewMessageRecanonicalizes() {
        AgentRunAdmission first = admissionService.admit(command("message-1", "basic.qps"));
        when(canonicalizer.canonicalize(eq("workspace-a"), any())).thenAnswer(invocation ->
                canonical(invocation.getArgument(1), "b".repeat(64)));

        AgentRunAdmission replay = admissionService.admit(command("message-1", "basic.qps"));
        AgentRunAdmission next = admissionService.admit(command("message-2", "basic.qps"));

        assertEquals(AgentRunAdmission.Decision.REPLAY_ACTIVE, replay.decision());
        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, next.decision());
        assertEquals("sha256:" + "a".repeat(64),
                AgentRunService.targetFromRun(first.run()).getAuthority().getHash());
        assertEquals("sha256:" + "b".repeat(64),
                AgentRunService.targetFromRun(next.run()).getAuthority().getHash());
        verify(canonicalizer, times(2)).canonicalize(eq("workspace-a"), any());
    }

    @Test
    void blockedCanonicalizationMustNotHoldTheExistingSessionWriteLock() throws Exception {
        InvokeCommand command = command("message-1", "basic.qps");
        var session = sessionService.findOrCreateSession(command.envelope(), command.userInput(), command.entryType());
        CountDownLatch canonicalizationStarted = new CountDownLatch(1);
        CountDownLatch releaseCanonicalization = new CountDownLatch(1);
        when(canonicalizer.canonicalize(eq("workspace-a"), any())).thenAnswer(invocation -> {
            canonicalizationStarted.countDown();
            assertTrue(releaseCanonicalization.await(5, TimeUnit.SECONDS));
            return canonical(invocation.getArgument(1), "a".repeat(64));
        });
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<AgentRunAdmission> admission = executor.submit(() -> admissionService.admit(command));
            assertTrue(canonicalizationStarted.await(5, TimeUnit.SECONDS));
            Future<?> lock = executor.submit(() -> transactions.executeWithoutResult(status ->
                    sessionDao.findFirstById(session.getId()).orElseThrow()));
            lock.get(1, TimeUnit.SECONDS);
            releaseCanonicalization.countDown();
            assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW,
                    admission.get(5, TimeUnit.SECONDS).decision());
        }
    }

    @Test
    void forgedAuthorityOrUnavailableCanonicalizationMustNotCreateDurableState() {
        AgentTargetRef forged = command("message-1", "basic.qps").userInput().getTarget().toBuilder()
                .entityId(7L).authority(AgentTargetAuthority.builder().bindingId(11L).version("forged")
                        .hash("sha256:" + "0".repeat(64)).build()).build();
        InvokeCommand forgedCommand = withTarget(command("message-1", "basic.qps"), forged);
        assertThrows(IllegalArgumentException.class, () -> admissionService.admit(forgedCommand));
        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());

        when(canonicalizer.canonicalize(eq("workspace-a"), any()))
                .thenThrow(new IllegalArgumentException("Entity monitor metric target does not match"));
        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(command("message-2", "missing.value")));
        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());
    }

    @Test
    void windowBeyondTwelveWeeksMustFailBeforeAnyDurableState() {
        long overLimitEnd = 1_000L + 12L * 7 * 24 * 60 * 60 * 1_000 + 1;

        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(command("message-1", "basic.qps", 1_000L, overLimitEnd)));

        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());
        verify(canonicalizer, times(0)).canonicalize(eq("workspace-a"), any());
    }

    @Test
    void exactTwelveWeekWindowMustRemainAdmissible() {
        long exactEnd = 1_000L + 12L * 7 * 24 * 60 * 60 * 1_000;

        AgentRunAdmission admission = admissionService.admit(
                command("message-1", "basic.qps", 1_000L, exactEnd));

        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, admission.decision());
        assertEquals(exactEnd, AgentRunService.targetFromRun(admission.run()).getSignal().getEnd());
    }

    @Test
    void exactSingleAlertShouldReplayPersistedAuthorityAndRecanonicalizeNewMessage() {
        AgentRunAdmission first = admissionService.admit(alertCommand("message-alert", 42L));
        AgentTargetRef persisted = AgentRunService.targetFromRun(first.run());
        assertEquals(AgentSingleAlertTargetAuthorityService.TARGET_VERSION, persisted.getVersion());
        assertEquals("single", persisted.getAlertType());
        assertEquals(42L, persisted.getAlertId());
        String originalHash = persisted.getAuthority().getHash();

        when(alertService.findSingleAlert("workspace-a", 42L))
                .thenReturn(Optional.of(singleAlert("resolved")));
        AgentRunAdmission replay = admissionService.admit(alertCommand("message-alert", 42L));
        AgentRunAdmission next = admissionService.admit(alertCommand("message-alert-next", 42L));

        assertEquals(AgentRunAdmission.Decision.REPLAY_ACTIVE, replay.decision());
        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, next.decision());
        assertEquals(originalHash, AgentRunService.targetFromRun(replay.run()).getAuthority().getHash());
        assertNotEquals(originalHash, AgentRunService.targetFromRun(next.run()).getAuthority().getHash());
        verify(alertService, times(2)).findSingleAlert("workspace-a", 42L);
        assertEquals(2, runDao.count());
        assertEquals(2, userTranscriptCount());
    }

    @Test
    void unavailableOrForgedSingleAlertMustCreateNoDurableState() {
        reset(alertService);

        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(alertCommand("message-missing", 42L)));
        AgentTargetRef forged = AgentTargetRef.builder()
                .version(AgentSingleAlertTargetAuthorityService.TARGET_VERSION)
                .alertId(42L).alertType("single")
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentSingleAlertTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "0".repeat(64)).build())
                .build();
        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(withTarget(alertCommand("message-forged", 42L), forged)));

        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());
    }

    @Test
    void malformedSingleAlertMarkersMustFailBeforeCreatingDurableState() {
        AgentTargetAuthority alertAuthority = AgentTargetAuthority.builder()
                .bindingId(42L)
                .version(AgentSingleAlertTargetAuthorityService.AUTHORITY_VERSION)
                .hash("sha256:" + "0".repeat(64))
                .build();
        AgentTargetAuthority missingVersionAuthority = AgentTargetAuthority.builder()
                .bindingId(42L)
                .hash("sha256:" + "0".repeat(64))
                .build();
        List<AgentTargetRef> malformedTargets = List.of(
                AgentTargetRef.builder()
                        .version(AgentSingleAlertTargetAuthorityService.TARGET_VERSION)
                        .build(),
                AgentTargetRef.builder()
                        .version(AgentSingleAlertTargetAuthorityService.TARGET_VERSION + ".forged")
                        .build(),
                AgentTargetRef.builder()
                        .authority(alertAuthority)
                        .build(),
                AgentTargetRef.builder()
                        .version(" " + AgentSingleAlertTargetAuthorityService.TARGET_VERSION)
                        .build(),
                AgentTargetRef.builder()
                        .version(AgentSingleAlertTargetAuthorityService.TARGET_VERSION.toUpperCase())
                        .build(),
                AgentTargetRef.builder()
                        .authority(missingVersionAuthority)
                        .build());

        int index = 0;
        for (AgentTargetRef malformedTarget : malformedTargets) {
            InvokeCommand source = alertCommand("message-malformed-" + index, 42L);

            assertThrows(IllegalArgumentException.class,
                    () -> admissionService.admit(withTarget(source, malformedTarget)));
            index++;
        }

        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());
        verifyNoInteractions(canonicalizer);
        verifyNoInteractions(alertService);
    }

    @Test
    void exactEntityShouldReplayPersistedAuthorityAndRecanonicalizeNewMessage() {
        AgentRunAdmission first = admissionService.admit(entityCommand("message-entity", 42L));
        AgentTargetRef persisted = AgentRunService.targetFromRun(first.run());
        assertEquals(AgentEntityTargetAuthorityService.TARGET_VERSION, persisted.getVersion());
        assertEquals(42L, persisted.getEntityId());
        String originalHash = persisted.getAuthority().getHash();

        when(entityWorkspaceQueryService.findEntityById("workspace-a", 42L))
                .thenReturn(Optional.of(entity("degraded")));
        AgentRunAdmission replay = admissionService.admit(entityCommand("message-entity", 42L));
        AgentRunAdmission next = admissionService.admit(entityCommand("message-entity-next", 42L));

        assertEquals(AgentRunAdmission.Decision.REPLAY_ACTIVE, replay.decision());
        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, next.decision());
        assertEquals(originalHash, AgentRunService.targetFromRun(replay.run()).getAuthority().getHash());
        assertNotEquals(originalHash, AgentRunService.targetFromRun(next.run()).getAuthority().getHash());
        verify(entityWorkspaceQueryService, times(2)).findEntityById("workspace-a", 42L);
        assertEquals(2, runDao.count());
        assertEquals(2, userTranscriptCount());
    }

    @Test
    void unavailableOrForgedEntityMustCreateNoDurableState() {
        reset(entityWorkspaceQueryService);

        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(entityCommand("message-entity-missing", 42L)));
        AgentTargetRef forged = AgentTargetRef.builder()
                .version(AgentEntityTargetAuthorityService.TARGET_VERSION)
                .entityId(42L)
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentEntityTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "0".repeat(64)).build())
                .build();
        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(withTarget(
                        entityCommand("message-entity-forged", 42L), forged)));

        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());
    }

    @Test
    void malformedEntityMarkersMustFailBeforeCreatingDurableState() {
        AgentTargetAuthority entityAuthority = AgentTargetAuthority.builder()
                .bindingId(42L)
                .version(AgentEntityTargetAuthorityService.AUTHORITY_VERSION)
                .hash("sha256:" + "0".repeat(64))
                .build();
        AgentTargetAuthority missingVersionAuthority = AgentTargetAuthority.builder()
                .bindingId(42L)
                .hash("sha256:" + "0".repeat(64))
                .build();
        List<AgentTargetRef> malformedTargets = List.of(
                AgentTargetRef.builder()
                        .version(AgentEntityTargetAuthorityService.TARGET_VERSION)
                        .build(),
                AgentTargetRef.builder()
                        .version(AgentEntityTargetAuthorityService.TARGET_VERSION + ".forged")
                        .build(),
                AgentTargetRef.builder()
                        .authority(entityAuthority)
                        .build(),
                AgentTargetRef.builder()
                        .version(" " + AgentEntityTargetAuthorityService.TARGET_VERSION)
                        .build(),
                AgentTargetRef.builder()
                        .version(AgentEntityTargetAuthorityService.TARGET_VERSION.toUpperCase())
                        .build(),
                AgentTargetRef.builder()
                        .authority(missingVersionAuthority)
                        .build());

        int index = 0;
        for (AgentTargetRef malformedTarget : malformedTargets) {
            InvokeCommand source = entityCommand("message-entity-malformed-" + index, 42L);

            assertThrows(IllegalArgumentException.class,
                    () -> admissionService.admit(withTarget(source, malformedTarget)));
            index++;
        }

        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());
        verifyNoInteractions(canonicalizer);
        verifyNoInteractions(alertService);
        verifyNoInteractions(entityWorkspaceQueryService);
    }

    private List<AgentRunAdmission> concurrent(InvokeCommand first, InvokeCommand second) throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<AgentRunAdmission>> futures = List.of(
                    executor.submit(() -> admitAfter(start, first)),
                    executor.submit(() -> admitAfter(start, second)));
            start.countDown();
            return List.of(futures.get(0).get(), futures.get(1).get());
        }
    }

    private AgentRunAdmission admitAfter(CountDownLatch start, InvokeCommand command) throws Exception {
        assertTrue(start.await(5, TimeUnit.SECONDS));
        return admissionService.admit(command);
    }

    private long decisions(List<AgentRunAdmission> admissions, AgentRunAdmission.Decision decision) {
        return admissions.stream().filter(admission -> admission.decision() == decision).count();
    }

    private long userTranscriptCount() {
        return transcriptDao.findBySessionIdOrderBySessionSequenceAsc(
                        sessionDao.findAll().getFirst().getId(), PageRequest.of(0, 20)).stream()
                .filter(entry -> TranscriptMessage.TranscriptRole.USER.wireValue().equals(entry.getMessageRole()))
                .count();
    }

    private TranscriptMessage userTranscript() {
        var entry = transcriptDao.findBySessionIdOrderBySessionSequenceAsc(
                        sessionDao.findAll().getFirst().getId(), PageRequest.of(0, 20)).stream()
                .filter(candidate -> TranscriptMessage.TranscriptRole.USER.wireValue()
                        .equals(candidate.getMessageRole()))
                .findFirst()
                .orElseThrow();
        return JsonUtil.fromJson(entry.getPayloadJson(), TranscriptMessage.class);
    }

    private InvokeCommand command(String messageId, String metricKey) {
        return command(messageId, metricKey, 1_000L, 2_000L);
    }

    private InvokeCommand command(String messageId, String metricKey, long start, long end) {
        AgentSignalRef signal = AgentSignalRef.builder().type("metrics").query(metricKey)
                .start(start).end(end).timezone("UTC").build();
        return InvokeCommand.builder().envelope(GatewayEnvelope.builder().channelId("web-ui")
                        .workspaceId("workspace-a").receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build()).build())
                .replyMode(ReplyMode.STREAM).commandId(messageId)
                .userInput(UserInput.builder().conversationId("canonical-conversation").messageId(messageId)
                        .target(AgentTargetRef.builder().monitorId(42L).signal(signal).build())
                        .message(UserInput.Message.builder().text("inspect").build()).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT).build();
    }

    private InvokeCommand alertCommand(String messageId, long alertId) {
        return InvokeCommand.builder().envelope(GatewayEnvelope.builder().channelId("web-ui")
                        .workspaceId("workspace-a").receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build()).build())
                .replyMode(ReplyMode.STREAM).commandId(messageId)
                .userInput(UserInput.builder().conversationId("alert-conversation").messageId(messageId)
                        .target(AgentTargetRef.builder().alertId(alertId).alertType("single").build())
                        .message(UserInput.Message.builder().text("inspect alert").build()).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT).build();
    }

    private InvokeCommand entityCommand(String messageId, long entityId) {
        return InvokeCommand.builder().envelope(GatewayEnvelope.builder().channelId("web-ui")
                        .workspaceId("workspace-a").receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build()).build())
                .replyMode(ReplyMode.STREAM).commandId(messageId)
                .userInput(UserInput.builder().conversationId("entity-conversation").messageId(messageId)
                        .target(AgentTargetRef.builder().entityId(entityId).build())
                        .message(UserInput.Message.builder().text("inspect entity").build()).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT).build();
    }

    private SingleAlert singleAlert(String status) {
        return SingleAlert.builder().workspaceId("workspace-a").id(42L).fingerprint("fingerprint-42")
                .status(status).content("Latency exceeded").triggerTimes(2)
                .startAt(1_000L).activeAt(2_000L).build();
    }

    private ObserveEntity entity(String status) {
        return ObserveEntity.builder().workspaceId("workspace-a").id(42L).type("service").name("checkout")
                .displayName("Checkout API").namespace("commerce").environment("prod").status(status)
                .criticality("high").owner("sre").lifecycle("production").tier("tier1").system("commerce")
                .source("manual").description("Checkout service").build();
    }

    private InvokeCommand withTarget(InvokeCommand command, AgentTargetRef target) {
        return new InvokeCommand(command.envelope(), command.replyMode(), command.commandId(),
                command.userInput().toBuilder().target(target).build(), command.entryType());
    }

    private EntityMonitorMetricTargetCanonicalizer.CanonicalTarget canonical(
            EntityMonitorMetricTargetCanonicalizer.SourceIntent intent, String hash) {
        return new EntityMonitorMetricTargetCanonicalizer.CanonicalTarget("entity-monitor-metric.v1", 7L,
                intent.monitorId(),
                new EntityMonitorMetricTargetCanonicalizer.ServiceIdentity("checkout", "commerce", "prod"),
                new EntityMonitorMetricTargetCanonicalizer.CanonicalSignal(intent.signalType(), intent.query(),
                        intent.start(), intent.end(), intent.timezone()),
                new EntityMonitorMetricTargetCanonicalizer.Authority(11L, "1", "sha256:" + hash));
    }
}
