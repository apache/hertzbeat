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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.persistence.EntityManagerFactory;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.sql.DataSource;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ApprovalDecisionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeApprovalRegistry;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeStoppedException;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentTargetToolAuthorizer;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
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

/** H2 proof that approval ownership and decisions are durable and serialized. */
@SpringJUnitConfig
@ContextConfiguration(classes = AgentApprovalConcurrencyIntegrationTest.TestApplication.class)
class AgentApprovalConcurrencyIntegrationTest {

    @Autowired
    private ApprovalCommandService commandService;
    @Autowired
    private AgentRuntimeApprovalRegistry approvalRegistry;
    @Autowired
    private AgentToolCallLedgerService toolCallLedgerService;
    @Autowired
    private AgentSessionDao sessionDao;
    @Autowired
    private AgentToolCallDao toolCallDao;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @AfterEach
    void cleanDatabase() {
        toolCallDao.deleteAll();
        sessionDao.deleteAll();
    }

    @Test
    void foreignWorkspaceShouldBeIndistinguishableAndLeaveLedgerAndRegistryUntouched() {
        AgentToolCall approval = pendingApproval("foreign");
        var waiter = approvalRegistry.register(approval.getApprovalId());

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> commandService.decide(command(approval, "workspace-b", AgentApprovalDecision.APPROVED)));

        assertEquals("Agent tool approval not found", error.getMessage());
        assertEquals(AgentApprovalStatus.PENDING.name(),
                toolCallDao.findById(approval.getId()).orElseThrow().getApprovalStatus());
        assertTrue(approvalRegistry.isWaiting(approval.getApprovalId()));
        assertEquals(false, waiter.isDone());
        waiter.cancel(false);
    }

    @Test
    void inactiveRuntimeShouldNotCommitApprovalDecision() {
        AgentToolCall approval = pendingApproval("inactive");
        var waiter = approvalRegistry.register(approval.getApprovalId());
        assertTrue(waiter.cancel(false));

        var response = commandService.decide(
                command(approval, "workspace-a", AgentApprovalDecision.APPROVED));

        assertEquals(Map.of("status", "failed"), response.body());
        AgentToolCall durable = toolCallDao.findById(approval.getId()).orElseThrow();
        assertEquals(AgentApprovalStatus.PENDING.name(), durable.getApprovalStatus());
        assertEquals(AgentToolStatus.WAITING_APPROVAL.name(), durable.getStatus());
    }

    @Test
    void unconsumedDeliveredApprovalShouldBecomeDurablyTerminal() {
        AgentToolCall approval = pendingApproval("unconsumed");
        approvalRegistry.register(approval.getApprovalId());
        ApprovalCommandService boundedService = new ApprovalCommandService(
                toolCallLedgerService, approvalRegistry, Duration.ofMillis(20));

        var response = boundedService.decide(
                command(approval, "workspace-a", AgentApprovalDecision.APPROVED));

        assertEquals(Map.of("status", "failed"), response.body());
        AgentToolCall durable = toolCallDao.findById(approval.getId()).orElseThrow();
        assertEquals(AgentApprovalStatus.EXPIRED.name(), durable.getApprovalStatus());
        assertEquals(AgentToolStatus.DENIED.name(), durable.getStatus());
        assertTrue(approvalRegistry.beginConsumption(
                approval.getApprovalId(), AgentApprovalDecision.APPROVED).isEmpty());
    }

    @Test
    void concurrentApproveAndRejectShouldCommitExactlyOneMatchingRuntimeDecision() throws Exception {
        for (int index = 0; index < 12; index++) {
            AgentToolCall approval = pendingApproval("race-" + index);
            var waiter = approvalRegistry.register(approval.getApprovalId());
            waiter.thenAccept(decision -> approvalRegistry.beginConsumption(approval.getApprovalId(), decision)
                    .orElseThrow().complete());
            CountDownLatch start = new CountDownLatch(1);
            try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
                Future<Boolean> approved = executor.submit(() -> attemptAfter(start,
                        command(approval, "workspace-a", AgentApprovalDecision.APPROVED)));
                Future<Boolean> rejected = executor.submit(() -> attemptAfter(start,
                        command(approval, "workspace-a", AgentApprovalDecision.REJECTED)));
                start.countDown();

                assertEquals(1, (approved.get() ? 1 : 0) + (rejected.get() ? 1 : 0));
            }
            AgentToolCall durable = toolCallDao.findById(approval.getId()).orElseThrow();
            AgentApprovalDecision runtimeDecision = waiter.get();
            assertEquals(runtimeDecision.name(), durable.getApprovalStatus());
        }
    }

    @Test
    void cancellationAfterConsumptionClaimShouldStopBlockedResumeBeforeHandler() throws Exception {
        AgentToolCall approval = pendingApproval("blocked-resume");
        var waiter = approvalRegistry.register(approval.getApprovalId());
        var reservation = approvalRegistry.reserve(approval.getApprovalId()).orElseThrow();
        ApprovalDecisionCommand approve = command(approval, "workspace-a", AgentApprovalDecision.APPROVED);
        toolCallLedgerService.decideApproval(approval.getApprovalId(), approve.envelope(),
                AgentRuntimeEntryType.USER_INPUT, AgentApprovalDecision.APPROVED);
        var delivery = reservation.deliver(AgentApprovalDecision.APPROVED);
        assertTrue(delivery.accepted());

        CountDownLatch rowLocked = new CountDownLatch(1);
        CountDownLatch releaseRow = new CountDownLatch(1);
        CountDownLatch consumptionClaimed = new CountDownLatch(1);
        AtomicBoolean handlerCalled = new AtomicBoolean();
        AgentToolExecutionOrchestrator orchestrator = approvalOrchestrator(handlerCalled);
        AgentToolExecutionRequest request = approvalRequest(approval, consumptionClaimed);
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> holder = executor.submit(() -> transactions.executeWithoutResult(status -> {
                toolCallDao.findApprovalForRuntimeResume(approval.getApprovalId()).orElseThrow();
                rowLocked.countDown();
                await(releaseRow);
            }));
            assertTrue(rowLocked.await(5, TimeUnit.SECONDS));
            Future<?> runtime = executor.submit(() -> orchestrator.execute(request));
            assertTrue(consumptionClaimed.await(5, TimeUnit.SECONDS));

            assertFalse(waiter.cancel(false));
            releaseRow.countDown();

            java.util.concurrent.ExecutionException failure = assertThrows(
                    java.util.concurrent.ExecutionException.class,
                    () -> runtime.get(5, TimeUnit.SECONDS));
            assertTrue(failure.getCause() instanceof AgentRuntimeStoppedException);
            holder.get(5, TimeUnit.SECONDS);
        } finally {
            releaseRow.countDown();
        }

        assertFalse(delivery.awaitConsumption(Duration.ofMillis(100)));
        assertFalse(handlerCalled.get());
        AgentToolCall durable = toolCallDao.findById(approval.getId()).orElseThrow();
        assertEquals(AgentToolStatus.FAILED.name(), durable.getStatus());
        assertEquals(AgentApprovalStatus.APPROVED.name(), durable.getApprovalStatus());
        assertTrue(approvalRegistry.beginConsumption(
                approval.getApprovalId(), AgentApprovalDecision.APPROVED).isEmpty());
    }

    @Test
    void foreignOwnerQueryShouldNotWaitForAnOwnedApprovalRowLock() throws Exception {
        AgentToolCall approval = pendingApproval("foreign-lock");
        CountDownLatch ownerLocked = new CountDownLatch(1);
        CountDownLatch releaseOwner = new CountDownLatch(1);
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> holder = executor.submit(() -> transactions.executeWithoutResult(status -> {
                toolCallDao.findOwnedApprovalForUpdate(approval.getApprovalId(), "workspace-a", "web-ui",
                        "user", "admin", AgentRuntimeEntryType.USER_INPUT.name()).orElseThrow();
                ownerLocked.countDown();
                await(releaseOwner);
            }));
            assertTrue(ownerLocked.await(5, TimeUnit.SECONDS));
            Future<String> foreign = executor.submit(() -> {
                try {
                    commandService.decide(command(approval, "workspace-b", AgentApprovalDecision.APPROVED));
                    return "unexpected";
                } catch (IllegalArgumentException exception) {
                    return exception.getMessage();
                }
            });
            try {
                assertEquals("Agent tool approval not found", foreign.get(1, TimeUnit.SECONDS));
            } finally {
                releaseOwner.countDown();
            }
            holder.get(5, TimeUnit.SECONDS);
        }
    }

    private boolean attemptAfter(CountDownLatch start, ApprovalDecisionCommand command) throws InterruptedException {
        start.await();
        try {
            return Map.of("status", "completed").equals(commandService.decide(command).body());
        } catch (IllegalStateException exception) {
            return false;
        }
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out while holding the approval lock");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while holding the approval lock", exception);
        }
    }

    private AgentToolCall pendingApproval(String suffix) {
        AgentSession session = sessionDao.saveAndFlush(AgentSession.builder()
                .sessionUid("session-" + suffix).sessionKey("key-" + suffix).workspaceId("workspace-a")
                .channel("web-ui").originEntryType(AgentRuntimeEntryType.USER_INPUT.name())
                .actorType("user").actorId("admin").actorRoles("admin")
                .status(AgentSessionStatus.ACTIVE).transcriptSequence(0L).build());
        return toolCallDao.saveAndFlush(AgentToolCall.builder()
                .toolCallId("call-" + suffix).runId(100L).runUid("run-" + suffix)
                .sessionId(session.getId()).sessionUid(session.getSessionUid()).toolName("monitor.delete")
                .exposure("MODEL_VISIBLE").risk(AgentToolRisk.CHANGE.name())
                .policyDecision(AgentPolicyDecision.REQUIRE_APPROVAL.name())
                .status(AgentToolStatus.WAITING_APPROVAL.name()).inputJson("{}")
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(Map.of()))
                .approvalId("approval-" + suffix)
                .approvalStatus(AgentApprovalStatus.PENDING.name())
                .approvalExpiresAt(LocalDateTime.now().plusMinutes(10)).build());
    }

    private AgentToolExecutionOrchestrator approvalOrchestrator(AtomicBoolean handlerCalled) {
        AgentToolDescriptor descriptor = AgentToolDescriptor.builder()
                .name("monitor.delete")
                .namespace("monitor")
                .description("Delete monitor")
                .inputSchema("{\"type\":\"object\"}")
                .risk(AgentToolRisk.CHANGE)
                .exposure(AgentToolExposure.MODEL_VISIBLE)
                .build();
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(new AgentToolRegistry.RegisteredTool(descriptor, ignored -> {
            handlerCalled.set(true);
            return AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).modelContent("ok").build();
        }));
        AgentPolicyService policyService = mock(AgentPolicyService.class);
        when(policyService.decide(any(), any())).thenReturn(AgentPolicyResult.builder()
                .decision(AgentPolicyDecision.REQUIRE_APPROVAL)
                .risk(AgentToolRisk.CHANGE)
                .reason("approval required")
                .build());
        AgentInteractionInputService inputs = mock(AgentInteractionInputService.class);
        when(inputs.validateReference(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(inputs.mergeAndTake(any())).thenAnswer(invocation -> invocation.getArgument(0));
        return new AgentToolExecutionOrchestrator(registry, policyService, toolCallLedgerService,
                inputs, new AgentTargetToolAuthorizer());
    }

    private AgentToolExecutionRequest approvalRequest(AgentToolCall approval, CountDownLatch consumptionClaimed) {
        return AgentToolExecutionRequest.builder()
                .sessionUid(approval.getSessionUid())
                .runId(approval.getRunId())
                .runUid(approval.getRunUid())
                .runSessionId(approval.getSessionId())
                .workspaceId("workspace-a")
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .toolName(approval.getToolName())
                .toolCallId(approval.getToolCallId())
                .approvalId(approval.getApprovalId())
                .approvalStatus(AgentApprovalStatus.APPROVED.name())
                .arguments(Map.of())
                .approvalConsumption(() -> {
                    var claim = approvalRegistry.beginConsumption(
                            approval.getApprovalId(), AgentApprovalDecision.APPROVED).orElseThrow();
                    consumptionClaimed.countDown();
                    return claim;
                })
                .build();
    }

    private ApprovalDecisionCommand command(AgentToolCall approval, String workspaceId,
                                            AgentApprovalDecision decision) {
        return ApprovalDecisionCommand.builder().envelope(GatewayEnvelope.builder()
                        .channelId("web-ui").receivedAt(1L).workspaceId(workspaceId)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(ReplyMode.FINAL_ONLY).commandId("command-" + approval.getApprovalId())
                .originEntryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalId(approval.getApprovalId()).decision(decision).build();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableJpaRepositories(basePackageClasses = {AgentSessionDao.class, AgentToolCallDao.class})
    @EnableTransactionManagement
    @Import({AgentToolCallLedgerService.class, ApprovalCommandService.class, AgentRuntimeApprovalRegistry.class})
    static class TestApplication {

        @org.springframework.context.annotation.Bean
        DataSource dataSource() {
            DriverManagerDataSource dataSource = new DriverManagerDataSource();
            dataSource.setDriverClassName("org.h2.Driver");
            dataSource.setUrl("jdbc:h2:mem:agent-approval;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000");
            dataSource.setUsername("sa");
            return dataSource;
        }

        @org.springframework.context.annotation.Bean
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

        @org.springframework.context.annotation.Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
            return new JpaTransactionManager(entityManagerFactory);
        }
    }
}
