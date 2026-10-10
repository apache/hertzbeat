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
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

/** Real H2 durable-admission proof for one exact Log Explore page target. */
@SpringJUnitConfig
@ContextConfiguration(classes = AgentRunAdmissionConcurrencyIntegrationTest.TestApplication.class)
class AgentLogCanonicalAdmissionIntegrationTest {

    @Autowired
    private AgentRunAdmissionService admissionService;
    @Autowired
    private AgentSessionDao sessionDao;
    @Autowired
    private AgentRunDao runDao;
    @Autowired
    private AgentTranscriptEntryDao transcriptDao;
    @Autowired
    private LogQueryService logQueryService;

    @BeforeEach
    void setUp() {
        reset(logQueryService);
        when(logQueryService.list("workspace-a", null, 1_000L, 2_000L, "trace-42", "span-7", 17, "ERROR",
                "failed", "checkout", "commerce", "prod", "service.version=1", "http.route=/pay",
                0, 20, true, false)).thenReturn(page("first"));
    }

    @AfterEach
    void cleanDatabase() {
        transcriptDao.deleteAll();
        runDao.deleteAll();
        sessionDao.deleteAll();
        reset(logQueryService);
    }

    @Test
    void exactLogShouldPersistReplayAndRecanonicalizeAfterObservedDrift() {
        AgentRunAdmission first = admissionService.admit(command("message-1", exactScope()));
        AgentTargetRef persisted = AgentRunService.targetFromRun(first.run());
        assertEquals(AgentLogTargetAuthorityService.TARGET_VERSION, persisted.getVersion());
        assertEquals(exactScope(), persisted.getLog());
        assertEquals(persisted, userTranscript().getRequestSnapshot().target());
        String originalHash = persisted.getAuthority().getHash();

        when(logQueryService.list("workspace-a", null, 1_000L, 2_000L, "trace-42", "span-7", 17, "ERROR",
                "failed", "checkout", "commerce", "prod", "service.version=1", "http.route=/pay",
                0, 20, true, false)).thenReturn(page("second"));
        AgentRunAdmission replay = admissionService.admit(command("message-1", exactScope()));
        AgentRunAdmission next = admissionService.admit(command("message-2", exactScope()));

        assertEquals(AgentRunAdmission.Decision.REPLAY_ACTIVE, replay.decision());
        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, next.decision());
        assertEquals(originalHash, AgentRunService.targetFromRun(replay.run()).getAuthority().getHash());
        assertNotEquals(originalHash, AgentRunService.targetFromRun(next.run()).getAuthority().getHash());
        verify(logQueryService, times(2)).list("workspace-a", null, 1_000L, 2_000L,
                "trace-42", "span-7", 17, "ERROR", "failed", "checkout", "commerce", "prod",
                "service.version=1", "http.route=/pay", 0, 20, true, false);
    }

    @Test
    void unavailableMalformedOrForgedLogMustCreateNoDurableState() {
        reset(logQueryService);
        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(command("message-missing", exactScope())));

        AgentTargetRef forged = AgentTargetRef.builder()
                .version(AgentLogTargetAuthorityService.TARGET_VERSION)
                .log(exactScope())
                .authority(AgentTargetAuthority.builder()
                        .version(AgentLogTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "0".repeat(64)).build())
                .build();
        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(withTarget(command("message-forged", exactScope()), forged)));
        assertThrows(IllegalArgumentException.class, () -> admissionService.admit(command(
                "message-malformed", exactScope().toBuilder().end(1_000L).build())));

        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());
    }

    private InvokeCommand command(String messageId, AgentLogRef log) {
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder().channelId("web-ui").workspaceId("workspace-a").receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(ReplyMode.STREAM)
                .commandId(messageId)
                .userInput(UserInput.builder().conversationId("log-conversation").messageId(messageId)
                        .target(AgentTargetRef.builder().log(log).build())
                        .message(UserInput.Message.builder().text("inspect logs").build()).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .build();
    }

    private AgentLogRef exactScope() {
        return AgentLogRef.builder().start(1_000L).end(2_000L).traceId("trace-42").spanId("span-7")
                .severityNumber(17).severityText("ERROR").search("failed")
                .serviceName("checkout").serviceNamespace("commerce").environment("prod")
                .resourceFilter("service.version=1").attributeFilter("http.route=/pay")
                .hideInternal(true).hideNoise(false).pageIndex(0).pageSize(20).build();
    }

    private PageImpl<LogEntry> page(String body) {
        LogEntry log = LogEntry.builder().timeUnixNano(1_500_000_000L).severityNumber(17).severityText("ERROR")
                .body(body).traceId("trace-42").spanId("span-7")
                .attributes(Map.of("http.route", "/pay"))
                .resource(Map.of("service.name", "checkout")).build();
        return new PageImpl<>(List.of(log), PageRequest.of(0, 20), 1);
    }

    private InvokeCommand withTarget(InvokeCommand command, AgentTargetRef target) {
        return new InvokeCommand(command.envelope(), command.replyMode(), command.commandId(),
                command.userInput().toBuilder().target(target).build(), command.entryType());
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
}
