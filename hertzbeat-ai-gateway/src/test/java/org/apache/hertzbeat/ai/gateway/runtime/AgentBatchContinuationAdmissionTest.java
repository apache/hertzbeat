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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import jakarta.persistence.EntityManagerFactory;

import org.apache.hertzbeat.ai.gateway.application.AgentBatchContinuationAdmission;
import org.apache.hertzbeat.ai.gateway.application.AgentEntityInvestigationAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentIncidentTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentRunAdmission;
import org.apache.hertzbeat.ai.gateway.application.AgentRunRequestFingerprint;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionKeyBuilder;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import javax.sql.DataSource;

/** Real H2 lock/unique-key proof; no model or platform write is invoked. */
@SpringJUnitConfig(AgentBatchContinuationAdmissionTest.Config.class)
class AgentBatchContinuationAdmissionTest {
    @org.junit.jupiter.api.Test
    void cancelledBatchCannotBeRevivedAfterItsExecutorHasStopped() {
        var original = root();
        runService.markRunning(original);
        runService.markCancelled(original, "Explicit user stop");
        String planHash = hash(original);
        org.junit.jupiter.api.Assertions.assertThrows(
                RuntimeException.class,
                () -> admission.admit(original.getRunUid(), planHash, envelope()));
        org.junit.jupiter.api.Assertions.assertEquals(1, runs.count());
    }

    @Autowired AgentBatchContinuationAdmission admission;
    @Autowired AgentSessionService sessions;
    @Autowired AgentRunService runService;
    @Autowired AgentRunDao runs;
    @Autowired AgentSessionDao sessionDao;
    @Autowired AgentTranscriptEntryDao entries;
    @Autowired AgentTranscriptRecorder recorder;
    @Autowired AgentBatchService batches;
    @Autowired AgentRuntimeControlRegistry controls;

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .channelId("web-ui")
                .workspaceId("batch-test")
                .receivedAt(1L)
                .preferredLanguage("en-US")
                .actor(
                        AgentActor.builder()
                                .type("user")
                                .id("admin")
                                .roles(List.of("admin"))
                                .build())
                .build();
    }

    @AfterEach
    void clean() {
        entries.deleteAll();
        runs.deleteAll();
        sessionDao.deleteAll();
    }

    @Test
    void concurrentContinueAndReconnectAlwaysReplayTheSameChild() throws Exception {
        var root = root();
        String hash = hash(root);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Callable<AgentBatchContinuationAdmission.Admitted> action =
                    () -> {
                        start.await();
                        return admission.admit(root.getRunUid(), hash, envelope());
                    };
            var a = pool.submit(action);
            var b = pool.submit(action);
            start.countDown();
            var first = a.get(20, TimeUnit.SECONDS);
            var second = b.get(20, TimeUnit.SECONDS);
            assertEquals(first.admission().run().getRunUid(), second.admission().run().getRunUid());
            assertEquals(
                    1,
                    List.of(first, second).stream()
                            .filter(
                                    x ->
                                            x.admission().decision()
                                                    == AgentRunAdmission.Decision.EXECUTE_NEW)
                            .count());
            assertEquals(2, runs.count());
            var replay = admission.admit(root.getRunUid(), hash, envelope());
            assertEquals(AgentRunAdmission.Decision.REPLAY_ACTIVE, replay.admission().decision());
            runService.markFailed(replay.admission().run(), "budget reached");
            assertEquals(
                    AgentRunAdmission.Decision.REPLAY_TERMINAL,
                    admission.admit(root.getRunUid(), hash, envelope()).admission().decision());
            assertEquals(2, runs.count());
            var next = admission.admit(replay.admission().run().getRunUid(), hash, envelope());
            assertEquals(2, next.admission().run().getBatchSegment());
            assertEquals(3, runs.count());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void changedPlanForeignOwnerAndMissingWriteRoleFailBeforeAdmission() {
        var root = root();
        String hash = hash(root);
        assertThrows(
                RuntimeException.class,
                () -> admission.admit(root.getRunUid(), "0".repeat(64), envelope()));
        var other =
                envelope().toBuilder()
                        .actor(
                                AgentActor.builder()
                                        .type("user")
                                        .id("other")
                                        .roles(List.of("admin"))
                                        .build())
                        .build();
        assertThrows(RuntimeException.class, () -> admission.admit(root.getRunUid(), hash, other));
        var reader =
                envelope().toBuilder()
                        .actor(
                                AgentActor.builder()
                                        .type("user")
                                        .id("admin")
                                        .roles(List.of("guest"))
                                        .build())
                        .build();
        assertThrows(RuntimeException.class, () -> admission.admit(root.getRunUid(), hash, reader));
        assertEquals(1, runs.count());
    }

    @Test
    void cancelledButStillRegisteredExecutorCannotStartNextSegment() throws Exception {
        var root = root();
        String hash = hash(root);
        try (var registration =
                controls.register(
                        new AgentRuntimeControl(
                                "test", root.getRunUid(), java.time.Clock.systemUTC()))) {
            assertThrows(
                    RuntimeException.class,
                    () -> admission.admit(root.getRunUid(), hash, envelope()));
            assertEquals(1, runs.count());
        }
        assertEquals(
                AgentRunAdmission.Decision.EXECUTE_NEW,
                admission.admit(root.getRunUid(), hash, envelope()).admission().decision());
    }

    @Test
    void unknownCheckpointWithoutLedgerCanOnlyAdmitReadOnlyReconciliation() {
        var root = root();
        var session = sessionDao.findById(root.getSessionId()).orElseThrow();
        var saved = recorder.findRunTaskCheckpoint(root.getId()).orElseThrow().getTaskCheckpoint();
        var items = new java.util.ArrayList<>(saved.monitorBatch().items());
        var item = items.getFirst();
        items.set(
                0,
                new AgentMonitorBatch.Item(
                        item.id(),
                        item.argumentsHash(),
                        item.arguments(),
                        AgentMonitorBatch.Status.UNCERTAIN,
                        null));
        var plan =
                new AgentMonitorBatch.Snapshot(
                        saved.monitorBatch().version(),
                        saved.monitorBatch().runBinding(),
                        saved.monitorBatch().planHash(),
                        items);
        var checkpoint =
                new AgentTaskCheckpoint(
                        saved.version(),
                        saved.runUid(),
                        saved.requestBinding(),
                        saved.goal(),
                        saved.toolBudget(),
                        plan,
                        saved.modelRequests());
        recorder.recordRunMessage(
                session,
                root,
                TranscriptMessage.builder()
                        .role(TranscriptMessage.TranscriptRole.TASK_CHECKPOINT)
                        .taskCheckpoint(checkpoint)
                        .build());
        var progress = batches.progress(session, root, envelope()).orElseThrow();
        assertEquals(1, progress.reviewRequired());
        assertEquals("RECONCILE", progress.nextAction());
        var child = admission.admit(root.getRunUid(), hash(root), envelope());
        assertEquals(Boolean.TRUE, child.admission().run().getBatchReadOnly());
    }

    @Test
    void explicitSegmentContextRestoresFrozenGoalBeforeAnyModel() {
        var root = root();
        var admitted = admission.admit(root.getRunUid(), hash(root), envelope());
        var request =
                AgentRuntimeRequest.builder()
                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                        .envelope(admitted.command().envelope())
                        .userInput(admitted.command().userInput())
                        .session(admitted.admission().session())
                        .run(admitted.admission().run())
                        .chatHistory(List.of())
                        .build();
        var context = new AgentRuntimeContextBuilder().build(request, new AgentRuntimeProperties());
        var restored = batches.contextForSegment(context, request.getSession(), request.getRun());
        org.junit.jupiter.api.Assertions.assertNotNull(restored.batchContinuation());
        assertEquals(root.getRunUid(), restored.batchContinuation().rootRunUid());
        assertEquals(64, restored.batchContinuation().toolBudget());
        assertEquals(0, restored.batchContinuation().priorAttempts().size());
    }

    @Test
    void originalNativeManifestRequiresOwnerAndPreservesFrozenIdentities() {
        var root = root(true);
        var session = sessionDao.findById(root.getSessionId()).orElseThrow();
        var original =
                recorder.findRunTaskCheckpoint(root.getId()).orElseThrow().getTaskCheckpoint();
        var plan = batches.plan(session, root, envelope()).orElseThrow();
        assertEquals(root.getRunUid(), plan.rootRunUid());
        assertEquals(hash(root), plan.planHash());
        assertEquals(2, plan.items().size());
        assertEquals(
                original.monitorBatch().items().getFirst().id(),
                plan.items().getFirst().get("idempotencyKey"));
        var foreign =
                GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .workspaceId("other-workspace")
                        .receivedAt(1L)
                        .actor(envelope().getActor())
                        .build();
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class, () -> batches.plan(session, root, foreign));
    }

    private String hash(AgentRun root) {
        return recorder.findRunTaskCheckpoint(root.getId())
                .orElseThrow()
                .getTaskCheckpoint()
                .monitorBatch()
                .planHash();
    }

    @Test
    void expiredManifestHistoryRemainsOwnerReadableButCannotAuthorizeAnotherSegment() {
        var root = root(true, true);
        var session = sessionDao.findById(root.getSessionId()).orElseThrow();
        var progress = batches.progress(session, root, envelope()).orElseThrow();
        assertEquals(2, progress.total());
        assertEquals("NONE", progress.nextAction());
        assertEquals("PLAN_EXPIRED", progress.actionReason());
        assertEquals(2, batches.plan(session, root, envelope()).orElseThrow().expectedCount());
        assertThrows(
                RuntimeException.class,
                () -> admission.admit(root.getRunUid(), progress.planHash(), envelope()));
        var foreign =
                envelope().toBuilder()
                        .actor(
                                AgentActor.builder()
                                        .type("user")
                                        .id("foreign")
                                        .roles(List.of("admin"))
                                        .build())
                        .build();
        assertThrows(RuntimeException.class, () -> batches.progress(session, root, foreign));
        assertEquals(1, runs.count());
    }

    private AgentRun root() {
        return root(false);
    }

    private AgentRun root(boolean nativeBulk) {
        return root(nativeBulk, false);
    }

    private AgentRun root(boolean nativeBulk, boolean expiredManifest) {
        UserInput input =
                UserInput.builder()
                        .conversationId(UUID.randomUUID().toString())
                        .messageId("original")
                        .message(
                                UserInput.Message.builder()
                                        .text(
                                                expiredManifest
                                                        ? "Create two local website monitors "
                                                              + "{\"items\":[{\"idempotencyKey\":\"a\",\"name\":\"local-a\",\"url\":\"http://127.0.0.1:1/a\",\"intervals\":600},"
                                                              + "{\"idempotencyKey\":\"b\",\"name\":\"local-b\",\"url\":\"http://127.0.0.1:1/b\",\"intervals\":600}]}"
                                                        : "Create two local website monitors")
                                        .attachments(List.of())
                                        .build())
                        .build();
        var session =
                sessions.findOrCreateSession(envelope(), input, AgentRuntimeEntryType.USER_INPUT);
        var root = runService.createOrResumeRun(session, input, AgentRuntimeEntryType.USER_INPUT);
        var command =
                new GatewayCommand.InvokeCommand(
                        envelope(), GatewayCommand.ReplyMode.STREAM, "original", input);
        var snapshot =
                org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot.builder()
                        .version(
                                org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot
                                        .VERSION)
                        .conversationId(input.getConversationId())
                        .messageId(input.getMessageId())
                        .entryType(AgentRuntimeEntryType.USER_INPUT.name())
                        .message(input.getMessage().getText())
                        .attachments(List.of())
                        .preferredLanguage("en-US")
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION.name())
                        .replyMode(GatewayCommand.ReplyMode.STREAM.name())
                        .build();
        recorder.recordUserTranscriptEntry(
                session,
                root,
                input,
                AgentRunRequestFingerprint.VERSION,
                AgentRunRequestFingerprint.from(snapshot),
                snapshot);
        var context =
                new AgentRuntimeContextBuilder()
                        .build(
                                AgentRuntimeRequest.builder()
                                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                                        .envelope(envelope())
                                        .userInput(input)
                                        .session(session)
                                        .run(root)
                                        .chatHistory(List.of())
                                        .build(),
                                new AgentRuntimeProperties());
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "monitor",
                        2,
                        List.of(),
                        Map.of(),
                        List.of(
                                new AgentTaskAssessment.CreateTarget(
                                        "local-a", "http://127.0.0.1:1/a", 600),
                                new AgentTaskAssessment.CreateTarget(
                                        "local-b", "http://127.0.0.1:1/b", 600)));
        var manifest =
                expiredManifest
                        ? AgentExplicitManifestPlan.parse(
                                context,
                                java.time.Clock.offset(
                                        java.time.Clock.systemUTC(),
                                        java.time.Duration.ofMinutes(-31)))
                        : null;
        if (manifest != null) goal = manifest.goal();
        var plan = new AgentMonitorBatch(root.getRunUid());
        if (nativeBulk) {
            plan.enableNativeBulk();
        }
        plan.initialize(goal);
        recorder.recordRunMessage(
                session,
                root,
                TranscriptMessage.builder()
                        .role(TranscriptMessage.TranscriptRole.TASK_CHECKPOINT)
                        .taskCheckpoint(
                                manifest == null
                                        ? AgentTaskCheckpoint.forRuntime(
                                                context, goal, 64, plan.snapshot(), 0)
                                        : new AgentTaskCheckpoint(
                                                AgentTaskCheckpoint.MANIFEST_VERSION,
                                                context.getRunUid(),
                                                AgentTaskCheckpoint.binding(context),
                                                goal,
                                                64,
                                                plan.snapshot(),
                                                1,
                                                manifest.reference().completedPreflight()))
                        .build());
        return runService.markFailed(root, "budget reached");
    }

    @Configuration(proxyBeanMethods = false)
    @EnableJpaRepositories(
            basePackageClasses = {
                AgentSessionDao.class,
                org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao.class
            })
    @EnableTransactionManagement
    @Import({
        AgentBatchContinuationAdmission.class,
        AgentBatchService.class,
        AgentRunService.class,
        AgentSessionService.class,
        AgentSessionKeyBuilder.class,
        AgentTranscriptRecorder.class,
        AgentGroundingEvidenceVerifier.class
    })
    static class Config {
        @Bean
        DataSource dataSource() {
            var source = new DriverManagerDataSource();
            source.setDriverClassName("org.h2.Driver");
            source.setUrl(
                    "jdbc:h2:mem:batch-continue;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000");
            source.setUsername("sa");
            return source;
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setPackagesToScan("org.apache.hertzbeat.common.entity.agent");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(
                    Map.of(
                            "hibernate.hbm2ddl.auto",
                            "create-drop",
                            "hibernate.dialect",
                            "org.hibernate.dialect.H2Dialect"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }

        @Bean
        AgentRuntimeProperties properties() {
            return new AgentRuntimeProperties();
        }

        @Bean
        AgentRuntimeControlRegistry controls() {
            return new AgentRuntimeControlRegistry();
        }

        @Bean
        AgentPolicyService policy() {
            return new AgentPolicyService();
        }

        @Bean
        AgentToolRegistry tools() {
            var registry = new AgentToolRegistry();
            for (String name : List.of("monitor.create", "monitor.get")) {
                registry.register(
                        new AgentToolRegistry.RegisteredTool(
                                AgentToolDescriptor.builder()
                                        .name(name)
                                        .description(name)
                                        .namespace("monitor")
                                        .inputSchema("{}")
                                        .exposure(
                                                org.apache.hertzbeat.ai.gateway.tool.core
                                                        .AgentToolExposure.MODEL_ON_DEMAND)
                                        .risk(
                                                name.endsWith("get")
                                                        ? AgentToolRisk.READ
                                                        : AgentToolRisk.CHANGE)
                                        .build(),
                                x -> {
                                    throw new AssertionError("No platform write in admission test");
                                }));
            }
            return registry;
        }

        @Bean
        AgentIncidentTargetAuthorityService incident() {
            return mock(AgentIncidentTargetAuthorityService.class);
        }

        @Bean
        AgentEntityInvestigationAuthorityService investigation() {
            return mock(AgentEntityInvestigationAuthorityService.class);
        }
    }
}
