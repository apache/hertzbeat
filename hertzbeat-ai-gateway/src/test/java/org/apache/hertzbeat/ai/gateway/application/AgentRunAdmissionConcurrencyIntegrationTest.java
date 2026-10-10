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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EntityManagerFactory;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.IntStream;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionKeyBuilder;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.apache.hertzbeat.alert.service.AlertService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import javax.sql.DataSource;

/** H2 proof that the session lock serializes first-run admission. */
@SpringJUnitConfig
@ContextConfiguration(classes = AgentRunAdmissionConcurrencyIntegrationTest.TestApplication.class)
class AgentRunAdmissionConcurrencyIntegrationTest {

    @Autowired
    private AgentRunAdmissionService admissionService;
    @Autowired
    private AgentSessionDao sessionDao;
    @Autowired
    private AgentRunDao runDao;
    @Autowired
    private AgentTranscriptEntryDao transcriptDao;
    @Autowired
    private AgentSessionService sessionService;
    @Autowired
    private AgentRunService runService;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @AfterEach
    void cleanDatabase() {
        transcriptDao.deleteAll();
        runDao.deleteAll();
        sessionDao.deleteAll();
    }

    @Test
    void identicalFirstRequestsShouldAuthorizeExactlyOneRuntime() throws Exception {
        List<AgentRunAdmission> results = concurrent(
                command("conversation-same", "message-1", "inspect"),
                command("conversation-same", "message-1", "inspect"));

        assertEquals(1, decisions(results, AgentRunAdmission.Decision.EXECUTE_NEW));
        assertEquals(1, decisions(results, AgentRunAdmission.Decision.REPLAY_ACTIVE));
        assertEquals(1, sessionDao.count());
        assertEquals(1, runDao.count());
        assertEquals(1, userTranscriptCount());
    }

    @Test
    void mismatchedFirstRequestsShouldHaveOneClaimantAndOneConflict() throws Exception {
        List<AgentRunAdmission> results = concurrent(
                command("conversation-mismatch", "message-1", "inspect A"),
                command("conversation-mismatch", "message-1", "inspect B"));

        assertEquals(1, decisions(results, AgentRunAdmission.Decision.EXECUTE_NEW));
        assertEquals(1, decisions(results, AgentRunAdmission.Decision.REJECT_MISMATCH));
        assertEquals(1, sessionDao.count());
        assertEquals(1, runDao.count());
        assertEquals(1, userTranscriptCount());
    }

    @Test
    void samePrincipalAndConversationShouldRemainIsolatedAcrossWorkspaces() {
        InvokeCommand commandA = command(
                "conversation-workspace", "message-workspace", "inspect", "workspace-a");
        InvokeCommand commandB = command(
                "conversation-workspace", "message-workspace", "inspect", "workspace-b");
        AgentRunAdmission workspaceA = admissionService.admit(commandA);
        AgentRunAdmission workspaceB = admissionService.admit(commandB);

        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, workspaceA.decision());
        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, workspaceB.decision());
        assertEquals(2, sessionDao.count());
        assertEquals(2, runDao.count());
        assertTrue(!workspaceA.session().getSessionKey().equals(workspaceB.session().getSessionKey()));
        assertTrue(sessionService.findOwnedSession(workspaceA.session().getSessionUid(),
                commandB.envelope(), AgentRuntimeEntryType.USER_INPUT).isEmpty());
        assertEquals(List.of("workspace-a"), sessionService.findSessions(commandA.envelope(),
                        AgentRuntimeEntryType.USER_INPUT, null, PageRequest.of(0, 10)).stream()
                .map(AgentSession::getWorkspaceId)
                .toList());
        assertEquals(List.of("workspace-b"), sessionService.findSessions(commandB.envelope(),
                        AgentRuntimeEntryType.USER_INPUT, null, PageRequest.of(0, 10)).stream()
                .map(AgentSession::getWorkspaceId)
                .toList());
    }

    @Test
    void sessionWriteLockShouldBlockSecondAdmissionTransactionUntilReleased() throws Exception {
        InvokeCommand command = command("conversation-lock", "message-lock", "inspect lock");
        AgentSession session = sessionService.findOrCreateSession(
                command.envelope(), command.userInput(), command.entryType());
        CountDownLatch holderLocked = new CountDownLatch(1);
        CountDownLatch releaseHolder = new CountDownLatch(1);
        CountDownLatch contenderStarted = new CountDownLatch(1);
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> holder = executor.submit(() -> transactions.executeWithoutResult(status -> {
                sessionDao.findFirstById(session.getId()).orElseThrow();
                holderLocked.countDown();
                awaitLatch(releaseHolder);
            }));
            assertTrue(holderLocked.await(5, TimeUnit.SECONDS));
            Future<AgentRunAdmission> contender = executor.submit(() -> {
                contenderStarted.countDown();
                return admissionService.admit(command);
            });
            assertTrue(contenderStarted.await(5, TimeUnit.SECONDS));
            try {
                assertThrows(TimeoutException.class, () -> contender.get(500, TimeUnit.MILLISECONDS));
            } finally {
                releaseHolder.countDown();
            }
            holder.get();
            assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW,
                    contender.get(5, TimeUnit.SECONDS).decision());
            assertEquals(1, runDao.count());
            assertEquals(1, userTranscriptCount());
        }
    }

    @Test
    void failedRunShouldBeTheDurableStatusProjectedForItsSession() {
        AgentRunAdmission admission = admissionService.admit(
                command("conversation-failed", "message-failed", "inspect failure"));

        runService.markFailed(admission.run(), "Runtime model returned no response.");

        var persisted = runDao.findByRunUid(admission.run().getRunUid()).orElseThrow();
        var projection = runService.findLatestRunProjections(List.of(admission.session().getId()))
                .get(admission.session().getId());
        assertEquals("FAILED", projection.status());
        assertTrue(projection.gmtUpdate() != null);
        assertTrue(!projection.gmtUpdate().isBefore(admission.run().getStartedAt()));
        assertEquals("Runtime model returned no response.", persisted.getErrorMessage());
    }

    @Test
    void cancellationMustNotOverwriteRecoveryRequiredTerminalState() {
        AgentRunAdmission admission = admissionService.admit(
                command("conversation-recovery-cancel", "message-recovery-cancel", "inspect recovery"));
        runService.markRecoveryRequired(admission.run(), "Check the target state before continuing.");

        var afterCancel = runService.markCancelled(admission.run(), "Runtime stream client disconnected.");

        assertEquals("RECOVERY_REQUIRED", afterCancel.getStatus());
        assertEquals("RECOVERY_REQUIRED",
                runDao.findByRunUid(admission.run().getRunUid()).orElseThrow().getStatus());
        assertEquals("Check the target state before continuing.", afterCancel.getErrorMessage());
    }

    @Test
    void terminalTransitionShouldPromoteSessionBeforeGlobalPagination() {
        List<AgentRunAdmission> admissions = IntStream.range(0, 51)
                .mapToObj(index -> admissionService.admit(command(
                        "conversation-page-" + index, "message-page-" + index, "inspect page")))
                .toList();
        AgentRunAdmission oldest = admissions.getFirst();

        runService.markFailed(oldest.run(), "Runtime model returned no response.");

        List<AgentSession> firstPage = sessionService.findSessions(
                        command("conversation-page-query", "message-page-query", "query").envelope(),
                        AgentRuntimeEntryType.USER_INPUT, null, PageRequest.of(0, 50))
                .getContent();
        assertEquals(50, firstPage.size());
        assertEquals(oldest.session().getSessionUid(), firstPage.getFirst().getSessionUid());
        assertTrue(firstPage.stream().anyMatch(session -> session.getId().equals(oldest.session().getId())));
    }

    @Test
    void terminalTouchShouldSerializeWithTranscriptSequenceAppend() throws Exception {
        AgentRunAdmission admission = admissionService.admit(
                command("conversation-touch", "message-touch", "inspect touch"));
        CountDownLatch transitionReturned = new CountDownLatch(1);
        CountDownLatch releaseTransition = new CountDownLatch(1);
        CountDownLatch appendStarted = new CountDownLatch(1);
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> transition = executor.submit(() -> transactions.executeWithoutResult(status -> {
                runService.markFailed(admission.run(), "Runtime model returned no response.");
                transitionReturned.countDown();
                awaitLatch(releaseTransition);
            }));
            assertTrue(transitionReturned.await(5, TimeUnit.SECONDS));
            Future<?> append = executor.submit(() -> {
                appendStarted.countDown();
                recordAssistantTranscript(admission, "concurrent append");
            });
            assertTrue(appendStarted.await(5, TimeUnit.SECONDS));
            boolean appendCompletedBeforeTransitionCommit;
            try {
                append.get(500, TimeUnit.MILLISECONDS);
                appendCompletedBeforeTransitionCommit = true;
            } catch (TimeoutException exception) {
                appendCompletedBeforeTransitionCommit = false;
            } finally {
                releaseTransition.countDown();
            }
            transition.get(5, TimeUnit.SECONDS);
            append.get(5, TimeUnit.SECONDS);

            assertEquals(false, appendCompletedBeforeTransitionCommit,
                    "Transcript append must wait for the terminal session touch transaction");
        }

        recordAssistantTranscript(admission, "following append");
        AgentSession session = sessionDao.findById(admission.session().getId()).orElseThrow();
        var entries = transcriptDao.findBySessionIdOrderBySessionSequenceAsc(
                session.getId(), PageRequest.of(0, 20));
        assertEquals(3L, session.getTranscriptSequence());
        assertEquals(List.of(1L, 2L, 3L), entries.stream().map(entry -> entry.getSessionSequence()).toList());
    }

    @Test
    void failedSessionTouchShouldRollbackRunTransition() {
        AgentRunAdmission admission = admissionService.admit(
                command("conversation-rollback", "message-rollback", "inspect rollback"));
        transcriptDao.deleteAll();
        sessionDao.deleteById(admission.session().getId());
        sessionDao.flush();

        assertThrows(IllegalStateException.class,
                () -> runService.markFailed(admission.run(), "Runtime model returned no response."));

        assertEquals("RUNNING", runDao.findByRunUid(admission.run().getRunUid()).orElseThrow().getStatus());
    }

    @Test
    void delayedTerminalTouchShouldNotMoveTimestampBehindTranscriptAppend() throws Exception {
        AgentRunAdmission admission = admissionService.admit(
                command("conversation-monotonic", "message-monotonic", "inspect monotonic"));
        CountDownLatch appendFlushed = new CountDownLatch(1);
        CountDownLatch releaseAppend = new CountDownLatch(1);
        AtomicReference<LocalDateTime> appendTimestamp = new AtomicReference<>();
        LocalDateTime strictlyLaterTimestamp = LocalDateTime.now().plusDays(1).withNano(0);
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> append = executor.submit(() -> transactions.executeWithoutResult(status -> {
                recordAssistantTranscript(admission, "holding append");
                AgentSession lockedSession = sessionDao.findFirstById(admission.session().getId()).orElseThrow();
                lockedSession.setGmtUpdate(strictlyLaterTimestamp);
                sessionDao.flush();
                appendTimestamp.set(sessionDao.findById(admission.session().getId()).orElseThrow().getGmtUpdate());
                appendFlushed.countDown();
                awaitLatch(releaseAppend);
            }));
            assertTrue(appendFlushed.await(5, TimeUnit.SECONDS));
            Future<?> transition = executor.submit(() ->
                    runService.markFailed(admission.run(), "Runtime model returned no response."));
            try {
                assertThrows(TimeoutException.class, () -> transition.get(500, TimeUnit.MILLISECONDS));
            } finally {
                releaseAppend.countDown();
            }
            append.get(5, TimeUnit.SECONDS);
            transition.get(5, TimeUnit.SECONDS);
        }

        AgentSession session = sessionDao.findById(admission.session().getId()).orElseThrow();
        var persistedRun = runDao.findByRunUid(admission.run().getRunUid()).orElseThrow();
        assertTrue(persistedRun.getCompletedAt().isBefore(appendTimestamp.get()));
        assertEquals(appendTimestamp.get(), session.getGmtUpdate());
        assertEquals(2L, session.getTranscriptSequence());
    }

    private List<AgentRunAdmission> concurrent(InvokeCommand first, InvokeCommand second) throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<AgentRunAdmission>> futures = List.of(
                    executor.submit(() -> admitAfter(start, first)),
                    executor.submit(() -> admitAfter(start, second)));
            start.countDown();
            try {
                return List.of(futures.get(0).get(), futures.get(1).get());
            } catch (ExecutionException exception) {
                throw new AssertionError("Concurrent admission must converge without an infrastructure error",
                        exception.getCause());
            }
        }
    }

    private AgentRunAdmission admitAfter(CountDownLatch start, InvokeCommand command) throws InterruptedException {
        start.await();
        return admissionService.admit(command);
    }

    private void awaitLatch(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out while holding the session admission lock");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while holding the session admission lock", exception);
        }
    }

    private long decisions(List<AgentRunAdmission> results, AgentRunAdmission.Decision decision) {
        return results.stream().filter(result -> result.decision() == decision).count();
    }

    private long userTranscriptCount() {
        AgentSession session = sessionDao.findAll().getFirst();
        return transcriptDao.findBySessionIdOrderBySessionSequenceAsc(session.getId(), PageRequest.of(0, 20))
                .stream()
                .filter(entry -> TranscriptMessage.TranscriptRole.USER.wireValue().equals(entry.getMessageRole()))
                .count();
    }

    private void recordAssistantTranscript(AgentRunAdmission admission, String text) {
        sessionService.recordTranscriptEntry(org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry.builder()
                .sessionId(admission.session().getId())
                .runId(admission.run().getId())
                .payloadJson("{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\""
                        + text + "\"}]}")
                .messageRole(TranscriptMessage.TranscriptRole.ASSISTANT.wireValue())
                .build());
    }

    private InvokeCommand command(String conversationId, String messageId, String text) {
        return command(conversationId, messageId, text, null);
    }

    private InvokeCommand command(String conversationId, String messageId, String text, String workspaceId) {
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(100L)
                        .preferredLanguage("en-US")
                        .workspaceId(workspaceId)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(ReplyMode.STREAM)
                .commandId(messageId)
                .userInput(UserInput.builder()
                        .conversationId(conversationId)
                        .messageId(messageId)
                        .message(UserInput.Message.builder().text(text).build())
                        .build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .build();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableJpaRepositories(basePackageClasses = AgentSessionDao.class)
    @EnableTransactionManagement
    @Import({AgentRunAdmissionService.class, AgentRunAdmissionTransaction.class,
            AgentRunService.class, AgentSessionKeyBuilder.class,
            AgentSessionService.class, AgentTranscriptRecorder.class, AgentTargetCanonicalizationService.class,
            AgentSingleAlertTargetAuthorityService.class, AgentEntityTargetAuthorityService.class,
            AgentTopologyTargetAuthorityService.class, AgentTraceTargetAuthorityService.class,
            AgentTraceTargetCanonicalizationAdapter.class, AgentLogTargetAuthorityService.class,
            AgentLogTargetCanonicalizationAdapter.class})
    static class TestApplication {

        @Bean
        DataSource dataSource() {
            DriverManagerDataSource dataSource = new DriverManagerDataSource();
            dataSource.setDriverClassName("org.h2.Driver");
            dataSource.setUrl("jdbc:h2:mem:agent-admission;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000");
            dataSource.setUsername("sa");
            return dataSource;
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan("org.apache.hertzbeat.common.entity.agent");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            Map<String, Object> properties = new HashMap<>();
            properties.put("hibernate.hbm2ddl.auto", "create-drop");
            properties.put("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
            factory.setJpaPropertyMap(properties);
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
            return new JpaTransactionManager(entityManagerFactory);
        }

        @Bean
        EntityMonitorMetricTargetCanonicalizer entityMonitorMetricTargetCanonicalizer() {
            return org.mockito.Mockito.mock(EntityMonitorMetricTargetCanonicalizer.class);
        }

        @Bean
        AlertService alertService() {
            return org.mockito.Mockito.mock(AlertService.class);
        }

        @Bean
        EntityWorkspaceQueryService entityWorkspaceQueryService() {
            return org.mockito.Mockito.mock(EntityWorkspaceQueryService.class);
        }

        @Bean
        org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService entityTraceQueryService() {
            return org.mockito.Mockito.mock(
                    org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.class);
        }

        @Bean
        org.apache.hertzbeat.observability.logs.service.LogQueryService logQueryService() {
            return org.mockito.Mockito.mock(org.apache.hertzbeat.observability.logs.service.LogQueryService.class);
        }
    }
}
