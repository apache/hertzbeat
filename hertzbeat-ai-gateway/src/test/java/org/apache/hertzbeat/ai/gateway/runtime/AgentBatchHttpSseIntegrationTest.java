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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.subject.support.SinglePrincipalMap;
import com.usthe.sureness.subject.support.SurenessSubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;

import org.apache.catalina.startup.Tomcat;
import org.apache.hertzbeat.ai.gateway.application.AgentBatchCommandService;
import org.apache.hertzbeat.ai.gateway.application.AgentBatchContinuationAdmission;
import org.apache.hertzbeat.ai.gateway.application.AgentCommandService;
import org.apache.hertzbeat.ai.gateway.application.AgentRunAdmissionService;
import org.apache.hertzbeat.ai.gateway.application.AgentRunRequestFingerprint;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayRuntimeEventProjector;
import org.apache.hertzbeat.ai.gateway.channel.webui.AgentBatchController;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshotService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.server.reactive.ServletHttpHandlerAdapter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.web.reactive.config.EnableWebFlux;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.adapter.WebHttpHandlerBuilder;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import javax.sql.DataSource;

/** Real loopback HTTP/SSE, H2 admission and durable replay; synthetic runtime effects only. */
@SpringJUnitConfig(AgentBatchHttpSseIntegrationTest.Config.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AgentBatchHttpSseIntegrationTest {
    @Autowired ApplicationContext context;
    @Autowired AgentSessionService sessions;
    @Autowired AgentRunService runService;
    @Autowired AgentRunDao runs;
    @Autowired AgentTranscriptRecorder recorder;
    @Autowired AgentRuntimeService runtime;
    @Autowired DataSource source;
    @Autowired DisconnectObservation disconnects;
    @TempDir Path temporaryDirectory;

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

    @Test
    @org.junit.jupiter.api.Timeout(45)
    void disconnectedAndRepeatedParentRequestsReplayOneChildWithoutRepeatingEffects()
            throws Exception {
        assertTrue(context.getBeansOfType(AgentRuntimeModelClient.class).isEmpty());
        JdbcTemplate jdbc = new JdbcTemplate(source);
        jdbc.execute("create table transport_test_effect (run_uid varchar(255) primary key)");
        AgentRun root = root();
        String hash =
                recorder.findRunTaskCheckpoint(root.getId())
                        .orElseThrow()
                        .getTaskCheckpoint()
                        .monitorBatch()
                        .planHash();
        AtomicInteger executions = new AtomicInteger();
        Sinks.One<Boolean> finish = Sinks.one();
        Sinks.One<Boolean> probe = Sinks.one();
        CountDownLatch settled = new CountDownLatch(1);
        when(runtime.streamInvoke(any()))
                .thenAnswer(
                        call -> {
                            AgentRuntimeRequest request = call.getArgument(0);
                            return Flux.defer(
                                    () -> {
                                        executions.incrementAndGet();
                                        return Flux.concat(
                                                        Mono.just(
                                                                AgentRuntimeEvent.runStarted(
                                                                        "transport-test",
                                                                        Instant.now())),
                                                        probe.asMono()
                                                                .map(
                                                                        ignored ->
                                                                                AgentRuntimeEvent
                                                                                        .toolStarted(
                                                                                                "disconnect-probe",
                                                                                                "transport-test",
                                                                                                AgentRuntimeToolCall
                                                                                                        .builder()
                                                                                                        .toolCallId(
                                                                                                                "disconnect-probe")
                                                                                                        .toolName(
                                                                                                                "test.transport_probe")
                                                                                                        .arguments(
                                                                                                                Map
                                                                                                                        .of(
                                                                                                                                "padding",
                                                                                                                                "x"
                                                                                                                                        .repeat(
                                                                                                                                                8192)))
                                                                                                        .build(),
                                                                                                Instant
                                                                                                        .now())),
                                                        finish.asMono()
                                                                .map(
                                                                        ignored -> {
                                                                            jdbc.update(
                                                                                    "insert into"
                                                                                        + " transport_test_effect(run_uid)"
                                                                                        + " values"
                                                                                        + " (?)",
                                                                                    request.getRun()
                                                                                            .getRunUid());
                                                                            return AgentRuntimeEvent
                                                                                    .runError(
                                                                                            "transport-test",
                                                                                            "budget"
                                                                                                + " reached",
                                                                                            Instant
                                                                                                    .now());
                                                                        }))
                                                .doFinally(ignored -> settled.countDown());
                                    });
                        });
        var servlet =
                new ServletHttpHandlerAdapter(
                        WebHttpHandlerBuilder.applicationContext(context).build());
        var server = new Tomcat();
        server.setBaseDir(temporaryDirectory.toString());
        server.getConnector().setPort(0);
        server.getConnector().setProperty("address", "127.0.0.1");
        var servletContext = server.addContext("", temporaryDirectory.toString());
        Tomcat.addServlet(servletContext, "gateway", servlet).setAsyncSupported(true);
        servletContext.addServletMappingDecoded("/", "gateway");
        try (HttpClient client =
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
            server.start();
            URI endpoint =
                    URI.create(
                            "http://127.0.0.1:"
                                    + server.getConnector().getLocalPort()
                                    + "/api/agent/runs/"
                                    + root.getRunUid()
                                    + "/batch/continue");
            HttpRequest request =
                    HttpRequest.newBuilder(endpoint)
                            .timeout(Duration.ofSeconds(15))
                            .header("Content-Type", "application/json")
                            .header("Accept", "text/event-stream")
                            .header("Accept-Language", "en-US")
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            "{\"planHash\":\"" + hash + "\"}"))
                            .build();
            String start;
            try (var socket = new java.net.Socket()) {
                socket.connect(
                        new java.net.InetSocketAddress(
                                "127.0.0.1", server.getConnector().getLocalPort()),
                        5000);
                socket.setSoTimeout(10000);
                socket.setSoLinger(true, 0);
                String body = "{\"planHash\":\"" + hash + "\"}";
                String wireRequest =
                        "POST "
                                + endpoint.getRawPath()
                                + " HTTP/1.1\r\n"
                                + "Host: 127.0.0.1\r\nContent-Type: application/json\r\n"
                                + "Accept: text/event-stream\r\nAccept-Language: en-US\r\n"
                                + "Content-Length: "
                                + body.getBytes(java.nio.charset.StandardCharsets.UTF_8).length
                                + "\r\n\r\n"
                                + body;
                socket.getOutputStream()
                        .write(wireRequest.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                socket.getOutputStream().flush();
                var reader =
                        new BufferedReader(
                                new InputStreamReader(
                                        socket.getInputStream(),
                                        java.nio.charset.StandardCharsets.UTF_8));
                assertTrue(reader.readLine().contains("200"));
                String header;
                boolean sse = false;
                while ((header = reader.readLine()) != null && !header.isEmpty()) {
                    sse |= header.toLowerCase(java.util.Locale.ROOT).contains("text/event-stream");
                }
                assertTrue(sse);
                start = readFrame(reader);
                assertTrue(start.contains("event:run_started"), start);
            }
            assertEquals(Sinks.EmitResult.OK, probe.tryEmitValue(true));
            assertTrue(
                    disconnects.cancelled.await(10, TimeUnit.SECONDS),
                    "HTTP subscriber cancellation not observed");
            var children =
                    runs.findByBatchRootRunUidOrderByBatchSegmentAsc(root.getRunUid()).stream()
                            .filter(run -> run.getBatchParentRunUid() != null)
                            .toList();
            assertEquals(1, children.size());
            AgentRun child = children.getFirst();
            assertTrue(
                    AgentBatchService.active(child),
                    "Disconnected executor remains a durable active child");
            assertTrue(start.contains(child.getRunUid()), start);
            assertEquals(1, executions.get());
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "select count(*) from transport_test_effect", Integer.class));

            String active = client.send(request, HttpResponse.BodyHandlers.ofString()).body();
            assertTrue(active.contains("event:run_status"), active);
            assertTrue(active.contains(child.getRunUid()), active);
            assertFalse(active.contains("event:run_started"), active);
            assertEquals(1, executions.get());
            assertEquals(2, runs.count());

            assertEquals(Sinks.EmitResult.OK, finish.tryEmitValue(true));
            assertTrue(settled.await(10, TimeUnit.SECONDS));
            assertEquals("FAILED", runs.findByRunUid(child.getRunUid()).orElseThrow().getStatus());
            assertEquals(
                    1,
                    jdbc.queryForObject(
                            "select count(*) from transport_test_effect", Integer.class));
            for (int i = 0; i < 2; i++) {
                var replay = client.send(request, HttpResponse.BodyHandlers.ofString());
                assertEquals(200, replay.statusCode());
                assertTrue(replay.body().contains("event:run_status"), replay.body());
                assertTrue(replay.body().contains(child.getRunUid()), replay.body());
                assertTrue(replay.body().contains("FAILED"), replay.body());
            }
            verify(runtime, times(1)).streamInvoke(any());
            assertEquals(1, executions.get());
            assertEquals(2, runs.count(), "No automatically admitted next segment");
            assertEquals(
                    1,
                    runs.findByBatchRootRunUidOrderByBatchSegmentAsc(root.getRunUid()).stream()
                            .filter(run -> run.getBatchParentRunUid() != null)
                            .count());
            assertEquals(
                    1,
                    jdbc.queryForObject(
                            "select count(*) from transport_test_effect", Integer.class));
        } finally {
            finish.tryEmitValue(true);
            server.stop();
            server.destroy();
        }
        // The HTTP fixture must not poison Mockito's reusable types with a stopped
        // servlet class loader; later identity tests run in this same JVM.
        SubjectSum laterSubject = mock(SubjectSum.class);
        when(laterSubject.getPrincipalMap())
                .thenReturn(new SinglePrincipalMap(java.util.Map.of("fixture-claim", "isolated")));
        assertEquals("isolated", laterSubject.getPrincipalMap().getPrincipal("fixture-claim"));
    }

    private static String readFrame(BufferedReader reader) throws Exception {
        StringBuilder frame = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.isEmpty() && !frame.isEmpty()) return frame.toString();
            frame.append(line).append('\n');
        }
        throw new AssertionError("SSE closed before its first frame");
    }

    static class DisconnectObservation {
        final CountDownLatch cancelled = new CountDownLatch(1);
    }

    private AgentRun root() {
        UserInput input =
                UserInput.builder()
                        .conversationId(UUID.randomUUID().toString())
                        .messageId("original")
                        .message(
                                UserInput.Message.builder()
                                        .text("Create two local website monitors")
                                        .attachments(List.of())
                                        .build())
                        .build();
        var session =
                sessions.findOrCreateSession(envelope(), input, AgentRuntimeEntryType.USER_INPUT);
        var root = runService.createOrResumeRun(session, input, AgentRuntimeEntryType.USER_INPUT);
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
        var plan = new AgentMonitorBatch(root.getRunUid());
        plan.initialize(goal);
        recorder.recordRunMessage(
                session,
                root,
                TranscriptMessage.builder()
                        .role(TranscriptMessage.TranscriptRole.TASK_CHECKPOINT)
                        .taskCheckpoint(
                                AgentTaskCheckpoint.forRuntime(
                                        context, goal, 64, plan.snapshot(), 0))
                        .build());
        return runService.markFailed(root, "budget reached");
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebFlux
    @Import(AgentBatchContinuationAdmissionTest.Config.class)
    static class Config {
        @Bean
        @Primary
        DataSource httpDataSource() {
            var source = new DriverManagerDataSource();
            source.setDriverClassName("org.h2.Driver");
            source.setUrl(
                    "jdbc:h2:mem:http-sse-"
                            + UUID.randomUUID()
                            + ";MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000");
            source.setUsername("sa");
            return source;
        }

        @Bean
        AgentRuntimeService runtime() {
            return mock(AgentRuntimeService.class);
        }

        @Bean
        AgentCommandService commands(
                AgentRunService runs,
                AgentTranscriptRecorder recorder,
                AgentGroundingEvidenceVerifier verifier,
                AgentRuntimeService runtime) {
            return new AgentCommandService(
                    mock(AgentRunAdmissionService.class),
                    runs,
                    new AgentRunSnapshotService(recorder, verifier),
                    runtime,
                    new GatewayRuntimeEventProjector());
        }

        @Bean
        AgentBatchCommandService batchCommands(
                AgentBatchContinuationAdmission admission,
                AgentCommandService commands,
                DisconnectObservation observation) {
            return new AgentBatchCommandService(admission, commands) {
                @Override
                public org.apache.hertzbeat.ai.gateway.application.GatewayResponse
                                .GatewayStreamResponse
                        continueBatch(String uid, String hash, GatewayEnvelope envelope) {
                    var response = super.continueBatch(uid, hash, envelope);
                    return org.apache.hertzbeat.ai.gateway.application.GatewayResponse
                            .GatewayStreamResponse.builder()
                            .meta(response.meta())
                            .events(response.events().doOnCancel(observation.cancelled::countDown))
                            .build();
                }
            };
        }

        @Bean
        AgentBatchController controller(
                AgentRunDao runs,
                AgentSessionDao sessions,
                AgentBatchService batches,
                AgentBatchCommandService commands) {
            return new AgentBatchController(runs, sessions, batches, commands) {
                @Override
                public Flux<org.springframework.http.codec.ServerSentEvent<org.apache.hertzbeat.ai.gateway.application.GatewayEvent>> continueBatch(
                        @org.springframework.web.bind.annotation.PathVariable String runUid,
                        @org.springframework.web.bind.annotation.RequestBody Continuation request,
                        @org.springframework.web.bind.annotation.RequestHeader(name = "Accept-Language", required = false) String language) {
                    // Avoid caching a Mockito type under Tomcat's disposable request class loader.
                    SubjectSum subject = new SurenessSubjectSum.Builder()
                            .setPrincipal("admin")
                            .setRoles(List.of("admin"))
                            .build();
                    // Test identity belongs to handler invocation, not a pre-body-decoding reactor thread.
                    SurenessContextHolder.bindSubject(subject);
                    AuthTokenRequestContext.bindWorkspaceId("batch-test");
                    try {
                        return super.continueBatch(runUid, request, language);
                    } finally {
                        SurenessContextHolder.clear();
                        AuthTokenRequestContext.clear();
                    }
                }
            };
        }

        @Bean
        DisconnectObservation disconnects() {
            return new DisconnectObservation();
        }

        @Bean
        WebFilter disconnectObservation(DisconnectObservation observation) {
            return (exchange, chain) -> chain.filter(exchange).doFinally(signal -> {
                if (signal == reactor.core.publisher.SignalType.CANCEL) observation.cancelled.countDown();
            });
        }

    }
}
