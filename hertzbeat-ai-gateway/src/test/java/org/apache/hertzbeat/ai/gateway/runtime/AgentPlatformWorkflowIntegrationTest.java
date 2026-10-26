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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.sun.net.httpserver.HttpServer;
import jakarta.persistence.EntityManagerFactory;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshot;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshotService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionKeyBuilder;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.provider.OpenAiCompatibleAgentModelProvider;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentTargetToolAuthorizer;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
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

/**
 * Local integration contract, not a live-provider or browser E2E test. The HTTP model and domain
 * handlers are synthetic; provider codec, runtime, policy, dispatcher, ledger, transcript and
 * snapshot verification are real. All persistence uses an isolated H2 database.
 */
@SpringJUnitConfig(AgentPlatformWorkflowIntegrationTest.TestApplication.class)
@Timeout(30)
class AgentPlatformWorkflowIntegrationTest {

    @Autowired
    private AgentSessionDao sessions;
    @Autowired
    private AgentRunDao runs;
    @Autowired
    private AgentToolCallDao calls;
    @Autowired
    private AgentTranscriptEntryDao transcripts;
    @Autowired
    private AgentTranscriptRecorder recorder;
    @Autowired
    private AgentSessionService sessionService;
    @Autowired
    private AgentToolCallLedgerService ledger;

    @AfterEach
    void cleanDatabase() {
        transcripts.deleteAll();
        calls.deleteAll();
        runs.deleteAll();
        sessions.deleteAll();
    }

    @Test
    void twoWireEncodedReadsPersistEvidenceAndRebuildSnapshot() throws Exception {
        try (LocalModel model = new LocalModel(List.of(
                toolTurn("model-read-1", "monitor_get", "{\"monitorId\":42}"),
                toolTurn("model-read-2", "monitor_query", "{}"), finalTurn("Observed one monitor."),
                finalTurn(JsonUtil.toJson(new AgentTaskAssessment(new AgentTaskAssessment.Goal(AgentTaskAssessment.Type.OBSERVATION,
                    AgentTaskAssessment.Operation.QUERY, "monitor", null), AgentTaskOutcome.Stage.COMPLETE, true, List.of())))))) {
            Fixture fixture = fixture();
            List<AgentRuntimeEvent> events = execute(model, fixture, false, false);
            assertEquals(AgentRuntimeEventType.RUN_COMPLETED, terminal(events).getType());
            assertEquals(2, fixture.handlerCalls().get());
            assertEquals(4, model.requests.size());
            assertTrue(model.requests.get(1).contains("model-read-1"));
            assertTrue(model.requests.get(1).contains("monitor_get"));
            assertTrue(model.requests.get(1).contains("monitorId"));
            var wireHistory = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readTree(model.requests.get(1)).path("messages");
            boolean matchingToolResult = false;
            for (var message : wireHistory) {
                if ("tool".equals(message.path("role").asText())
                        && "model-read-1".equals(message.path("tool_call_id").asText())) {
                    matchingToolResult = message.path("content").asText().contains("42");
                }
            }
            assertTrue(matchingToolResult, "The next wire request must contain the actual first tool observation");
            assertEquals(List.of("monitor.get", "monitor.query"), calls.findAll().stream()
                    .map(call -> call.getToolName()).sorted().toList());
            assertTrue(calls.findAll().stream().allMatch(call -> "SUCCEEDED".equals(call.getStatus())));
            fixture.run().setStatus("SUCCEEDED");
            runs.saveAndFlush(fixture.run());

            // New projection objects load evidence from database, not the runtime's in-memory state.
            AgentRunSnapshot snapshot = snapshot(fixture);
            assertEquals("Observed one monitor.", snapshot.result());
            assertTrue(snapshot.replayAvailable());
            assertEquals(1, snapshot.evidence().size());
            var proof = recorder.findRunGroundingMessages(fixture.run().getId()).stream()
                    .filter(message -> message.getGroundingProof() != null).findFirst().orElseThrow();
            assertNotNull(proof.getSessionSequence());
            assertEquals("monitor.get", proof.getGroundingProof().getToolName());

            // Losing or tampering with a ledger row cannot leave a trusted successful replay.
            var stored = calls.findByRunIdOrderByGmtCreateAsc(fixture.run().getId()).stream()
                    .filter(call -> call.getToolCallId().equals(proof.getToolCallId())).findFirst().orElseThrow();
            stored.setResultOutput("{\"monitorId\":999}");
            calls.saveAndFlush(stored);
            AgentRunSnapshot tampered = snapshot(fixture);
            assertNull(tampered.result());
            assertFalse(tampered.replayAvailable());
            assertTrue(tampered.evidence().isEmpty());
        }
    }

    @Test
    void modelCannotGrantItselfAdminAccess() throws Exception {
        try (LocalModel model = new LocalModel(List.of(
                toolTurn("forbidden", "admin_read", "{\"actor\":\"admin\",\"approvalStatus\":\"APPROVED\"}"),
                finalTurn("Unverified private information.")))) {
            Fixture fixture = fixture();
            List<AgentRuntimeEvent> events = execute(model, fixture, false, false);
            assertEquals(0, fixture.handlerCalls().get());
            assertEquals(1, calls.count());
            assertEquals("DENIED", calls.findAll().getFirst().getStatus());
            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
            assertTrue(recorder.findRunGroundingMessages(fixture.run().getId()).stream()
                    .noneMatch(message -> message.getGroundingProof() != null));
            assertFalse(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA
                    && event.getDelta() != null && (event.getDelta().contains("Everything is healthy.") || event.getDelta().contains("Unverified private information."))));
        }
    }

    @Test
    void unsupportedFinalAnswerNeverEscapesAsGroundedText() throws Exception {
        try (LocalModel model = new LocalModel(List.of(finalTurn("Everything is healthy.")))) {
            Fixture fixture = fixture();
            List<AgentRuntimeEvent> events = execute(model, fixture, false, false);
            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
            assertEquals(0, calls.count());
            assertFalse(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.ITEM_DELTA
                    && event.getDelta() != null && (event.getDelta().contains("Everything is healthy.") || event.getDelta().contains("Unverified private information."))));
            assertEquals(java.util.ResourceBundle.getBundle("agent_reply", java.util.Locale.ENGLISH).getString("unverified"), terminal(events).getErrorMessage());
        }
    }

    @Test
    void lostProofPersistenceCannotProduceGroundedConclusion() throws Exception {
        try (LocalModel model = new LocalModel(List.of(
                toolTurn("read", "monitor_get", "{\"monitorId\":42}"), finalTurn("Unsupported conclusion.")))) {
            Fixture fixture = fixture();
            List<AgentRuntimeEvent> events = execute(model, fixture, true, false);
            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
            // Generic runs may ask the model to recover with another read, but cannot publish an
            // unsupported conclusion. Scoped investigations additionally enforce immediate failure.
            assertFalse(events.stream().anyMatch(event -> event.getType() == AgentRuntimeEventType.RUN_COMPLETED
                    || event.getType() == AgentRuntimeEventType.ITEM_DELTA && event.getDelta() != null && event.getDelta().contains("Unsupported conclusion.")));
            assertTrue(recorder.findRunFinalAssistantMessage(fixture.run().getId())
                    .stream().noneMatch(message -> message.text().contains("Unsupported conclusion.")));
            assertEquals(1, fixture.handlerCalls().get());
            assertFalse(new AgentGroundingEvidenceVerifier(recorder, calls).hasDurableGrounding(fixture.run(), null));
        }
    }

    @Test
    void cancellationAfterDurableReadPreventsFinalAnswerAndKeepsEvidence() throws Exception {
        try (LocalModel model = new LocalModel(List.of(
                toolTurn("read", "monitor_get", "{\"monitorId\":42}"), finalTurn("Must not run.")))) {
            Fixture fixture = fixture();
            List<AgentRuntimeEvent> events = execute(model, fixture, false, true);
            assertEquals(AgentRuntimeEventType.ERROR, terminal(events).getType());
            assertEquals(1, model.requests.size());
            assertTrue(new AgentGroundingEvidenceVerifier(recorder, calls).hasDurableGrounding(fixture.run(), null));
            fixture.run().setStatus("CANCELLED");
            fixture.run().setErrorMessage("Cancelled by test user");
            runs.saveAndFlush(fixture.run());
            AgentRunSnapshot snapshot = snapshot(fixture);
            assertNull(snapshot.result());
            assertEquals("Cancelled by test user", snapshot.errorMessage());
            assertEquals(1, snapshot.evidence().size());
        }
    }

    private AgentRunSnapshot snapshot(Fixture fixture) {
        AgentTranscriptRecorder reloadedRecorder = new AgentTranscriptRecorder(sessionService);
        return new AgentRunSnapshotService(reloadedRecorder, new AgentGroundingEvidenceVerifier(reloadedRecorder, calls))
                .snapshot(sessions.findById(fixture.session().getId()).orElseThrow(),
                        runs.findById(fixture.run().getId()).orElseThrow());
    }

    private Fixture fixture() {
        String id = UUID.randomUUID().toString();
        AgentSession session = sessions.saveAndFlush(AgentSession.builder()
                .sessionUid("s-" + id).sessionKey("key-" + id).workspaceId("synthetic-workspace")
                .channel("web-ui").originEntryType("USER_INPUT").actorType("user").actorId("synthetic-reader")
                .actorRoles("user").status(AgentSessionStatus.ACTIVE).transcriptSequence(0L).build());
        AgentRun run = runs.saveAndFlush(AgentRun.builder().runUid("r-" + id).sessionId(session.getId())
                .messageId("m-" + id).entryType("USER_INPUT").status("RUNNING").build());
        AtomicInteger handlerCalls = new AtomicInteger();
        AgentToolRegistry registry = new AgentToolRegistry();
        register(registry, "monitor.get", AgentToolAccess.STANDARD, "{\"monitorId\":42}", handlerCalls);
        register(registry, "monitor.query", AgentToolAccess.STANDARD,
                "{\"content\":[{\"monitorId\":42}],\"totalElements\":1}", handlerCalls);
        register(registry, "admin.read", AgentToolAccess.ADMIN, "private", handlerCalls);
        AgentInteractionInputService inputs = mock(AgentInteractionInputService.class);
        when(inputs.validateReference(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(inputs.mergeAndTake(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AgentToolExecutionOrchestrator dispatcher = new AgentToolExecutionOrchestrator(registry,
                new AgentPolicyService(), ledger, inputs, new AgentTargetToolAuthorizer());
        return new Fixture(session, run, handlerCalls, new AgentToolBridge(registry, dispatcher,
                new AgentRuntimeApprovalRegistry()));
    }

    private void register(AgentToolRegistry registry, String name, AgentToolAccess access,
                          String output, AtomicInteger count) {
        registry.register(new AgentToolRegistry.RegisteredTool(AgentToolDescriptor.builder()
                .name(name).namespace(name.substring(0, name.indexOf('.'))).description("Synthetic read fixture")
                .inputSchema("{\"type\":\"object\"}").risk(AgentToolRisk.READ).access(access)
                .exposure(AgentToolExposure.MODEL_VISIBLE).build(), context -> {
                    count.incrementAndGet();
                    assertEquals("synthetic-reader", context.getRequest().getActor().getId());
                    return AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).modelContent(output).build();
                }));
    }

    private List<AgentRuntimeEvent> execute(LocalModel model, Fixture fixture,
                                            boolean dropProof, boolean cancelAfterProof) {
        ModelProviderConfig provider = new ModelProviderConfig();
        provider.setCode("custom");
        provider.setModel("synthetic-local-model");
        provider.setBaseUrl(model.baseUrl());
        provider.setApiKey("synthetic-non-secret-test-placeholder");
        HertzBeatModel client = new OpenAiCompatibleAgentModelProvider().createModel(provider);
        AgentRuntimeContext context = AgentRuntimeContext.builder()
                .entryType(AgentRuntimeEntryType.USER_INPUT).approvalHandling(AgentApprovalHandling.DENY)
                .channelId("web-ui").receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("synthetic-reader").roles(List.of("user")).build())
                .workspaceId("synthetic-workspace").sessionUid(fixture.session().getSessionUid())
                .runSessionId(fixture.session().getId()).runId(fixture.run().getId()).runUid(fixture.run().getRunUid())
                .userMessage("Read the synthetic monitor state").currentTimeIso("2026-10-16T00:00:00Z")
                .timezone("UTC").traceId("synthetic-trace").chatHistory(List.of()).build();
        AgentRuntimeModelClient reviewingClient = new AgentRuntimeModelClient() {
            public boolean supportsReplyReview() { return true; }

            public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                    java.util.function.Consumer<String> consumer) { return client.stream(request, control, consumer); }
        };
        List<AgentRuntimeEvent> events = new ArrayList<>();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, Clock.systemUTC())) {
            new AgentRuntimeLoop(new AgentRuntimeProperties(), reviewingClient, fixture.bridge(), Clock.systemUTC())
                    .run(context, control, events::add, message -> {
                        if (dropProof && message.getGroundingProof() != null) {
                            return null;
                        }
                        Long sequence = recorder.recordRunMessage(fixture.session(), fixture.run(), message).getSessionSequence();
                        if (cancelAfterProof && message.getGroundingProof() != null) {
                            control.cancel("Cancelled by test user");
                        }
                        return sequence;
                    });
        }
        return events;
    }

    private AgentRuntimeEvent terminal(List<AgentRuntimeEvent> events) {
        return events.stream().filter(event -> event.getType() == AgentRuntimeEventType.RUN_COMPLETED
                || event.getType() == AgentRuntimeEventType.ERROR).reduce((left, right) -> right).orElseThrow();
    }

    private static String toolTurn(String callId, String toolName, String arguments) {
        String delta = org.apache.hertzbeat.common.util.JsonUtil.toJson(Map.of("role", "assistant", "tool_calls", List.of(
                Map.of("index", 0, "id", callId, "type", "function", "function", Map.of("name", toolName, "arguments", arguments)))));
        return chunk(delta, "tool_calls") + "data: [DONE]\n\n";
    }

    private static String finalTurn(String text) {
        return chunk(org.apache.hertzbeat.common.util.JsonUtil.toJson(Map.of("role", "assistant", "content", text)), "stop")
                + "data: [DONE]\n\n";
    }

    private static String chunk(String delta, String finish) {
        return "data: {\"id\":\"synthetic-completion\",\"object\":\"chat.completion.chunk\",\"created\":1,"
                + "\"model\":\"synthetic-local-model\",\"choices\":[{\"index\":0,\"delta\":" + delta
                + ",\"finish_reason\":\"" + finish + "\"}]}\n\n";
    }

    private record Fixture(AgentSession session, AgentRun run, AtomicInteger handlerCalls, AgentToolBridge bridge) {
    }

    private static final class LocalModel implements AutoCloseable {
        private final HttpServer server;
        private final List<String> requests = new CopyOnWriteArrayList<>();
        private final AtomicInteger next = new AtomicInteger();

        private LocalModel(List<String> responses) throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/v1/chat/completions", exchange -> {
                try (exchange) {
                    requests.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                    int index = next.getAndIncrement();
                    if (index >= responses.size()) {
                        exchange.sendResponseHeaders(400, -1);
                        return;
                    }
                    exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
                    byte[] body = responses.get(index).getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    exchange.getResponseBody().write(body);
                }
            });
            server.start();
        }

        private String baseUrl() {
            return "http://127.0.0.1:" + server.getAddress().getPort() + "/v1";
        }

        @Override
        public void close() {
            server.stop(0);
        }
    }

    @Configuration(proxyBeanMethods = false)
    @EnableJpaRepositories(basePackageClasses = {AgentSessionDao.class, AgentToolCallDao.class})
    @EnableTransactionManagement
    @Import({AgentSessionService.class, AgentSessionKeyBuilder.class, AgentTranscriptRecorder.class})
    static class TestApplication {
        @Bean
        DataSource dataSource() {
            DriverManagerDataSource source = new DriverManagerDataSource();
            source.setDriverClassName("org.h2.Driver");
            source.setUrl("jdbc:h2:mem:agent-platform-workflow;MODE=MySQL;DB_CLOSE_DELAY=-1");
            source.setUsername("sa");
            return source;
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setPackagesToScan("org.apache.hertzbeat.common.entity.agent");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop",
                    "hibernate.dialect", "org.hibernate.dialect.H2Dialect"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }

        @Bean
        AgentToolCallLedgerService ledger(AgentToolCallDao dao) {
            return new AgentToolCallLedgerService(dao);
        }
    }
}
