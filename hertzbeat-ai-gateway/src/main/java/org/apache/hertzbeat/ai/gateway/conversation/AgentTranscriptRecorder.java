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

package org.apache.hertzbeat.ai.gateway.conversation;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTraceRef;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeHistoryWindow;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptContent;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;

/**
 * Records and rehydrates Agent Gateway transcript messages.
 */
@Service
public class AgentTranscriptRecorder {

    private static final int TRANSCRIPT_TOOL_NAME_LIMIT = 128;
    private static final int TRANSCRIPT_TOOL_CALL_ID_LIMIT = 128;
    private static final int TRANSCRIPT_TOOL_ERROR_LIMIT = 2048;
    private static final int MYSQL_TEXT_MAX_UTF8_BYTES = 65535;
    private static final String REDACTED_REQUEST_VALUE = "[REDACTED]";

    private final AgentSessionService sessionService;

    public AgentTranscriptRecorder(AgentSessionService sessionService) {
        // Transcript persistence is required for every recorder operation.
        this.sessionService = Objects.requireNonNull(sessionService, "sessionService must not be null");
    }

    public List<TranscriptMessage> chatHistory(Long sessionId) {
        return List.copyOf(sessionService.findRecentTranscriptMessages(sessionId));
    }

    public void recordCompactionCheckpoint(AgentSession session,
                                           AgentRuntimeHistoryWindow.CompactionCheckpoint checkpoint) {
        sessionService.persistCompactionCheckpoint(session.getId(), checkpoint);
    }

    public AgentTranscriptEntry recordUserTranscriptEntry(AgentSession session, AgentRun run, UserInput userInput) {
        return recordUserTranscriptEntry(session, run, userInput, null, null);
    }

    public AgentTranscriptEntry recordUserTranscriptEntry(AgentSession session, AgentRun run, UserInput userInput,
                                                          String fingerprintVersion, String fingerprint) {
        return recordUserTranscriptEntry(session, run, userInput, fingerprintVersion, fingerprint, null);
    }

    public AgentTranscriptEntry recordUserTranscriptEntry(AgentSession session, AgentRun run, UserInput userInput,
                                                          String fingerprintVersion, String fingerprint,
                                                          AgentRunRequestSnapshot requestSnapshot) {
        TranscriptMessage message = validateTranscriptMessage(TranscriptMessage.userText(
            userInput.getMessage().getText(), fingerprintVersion, fingerprint,
            safeRequestSnapshot(requestSnapshot)));
        if (message.getRequestSnapshot() != null && exceedsTranscriptPayloadBudget(message)) {
            message = message.toBuilder().requestSnapshot(null).build();
        }
        return persistTranscriptMessage(session, run, message);
    }

    public Optional<TranscriptMessage> findRunRequestMessage(Long runId) {
        return sessionService.findFirstRunTranscriptMessage(runId, TranscriptMessage.TranscriptRole.USER);
    }

    public Optional<TranscriptMessage> findUniqueRunRequestMessage(Long runId) {
        return sessionService.findUniqueRunTranscriptMessage(runId, TranscriptMessage.TranscriptRole.USER);
    }

    public Optional<TranscriptMessage> findRunFinalAssistantMessage(Long runId) {
        return sessionService.findLatestRunTranscriptMessage(runId, TranscriptMessage.TranscriptRole.ASSISTANT);
    }

    public List<TranscriptMessage> findRunGroundingMessages(Long runId) {
        return sessionService.findRunTranscriptMessages(runId, TranscriptMessage.TranscriptRole.TOOL_RESULT);
    }

    /** Append a runtime message immediately using the owning session's durable sequence. */
    public AgentTranscriptEntry recordRunMessage(AgentSession session, AgentRun run, TranscriptMessage message) {
        return recordTranscriptMessage(session, run, message);
    }

    private AgentTranscriptEntry recordTranscriptMessage(AgentSession session, AgentRun run,
                                                          TranscriptMessage message) {
        return persistTranscriptMessage(session, run, validateTranscriptMessage(message));
    }

    private AgentTranscriptEntry persistTranscriptMessage(AgentSession session, AgentRun run,
                                                           TranscriptMessage validatedMessage) {
        return sessionService.recordTranscriptEntry(AgentTranscriptEntry.builder()
            .sessionId(session.getId())
            .runId(run.getId())
            .payloadJson(toJson(validatedMessage))
            .messageRole(validatedMessage.getRole().wireValue())
            .build());
    }

    private AgentRunRequestSnapshot safeRequestSnapshot(AgentRunRequestSnapshot request) {
        try {
            return validateRequestSnapshot(request);
        } catch (RuntimeException ignored) {
            // Recovery metadata is optional and must never prevent the authoritative USER entry.
            return null;
        }
    }

    private boolean exceedsTranscriptPayloadBudget(TranscriptMessage message) {
        String finalPayload = GatewayText.redactSecrets(toJson(message));
        return finalPayload.getBytes(StandardCharsets.UTF_8).length > MYSQL_TEXT_MAX_UTF8_BYTES;
    }

    private TranscriptMessage validateTranscriptMessage(TranscriptMessage message) {
        // Every persisted payload must have a supported role so checkpoint queries and replay remain deterministic.
        if (message.getRole() == null) {
            throw new IllegalArgumentException("Transcript message role must not be null");
        }
        return message.toBuilder()
            .toolCallId(GatewayText.requireBounded(
                    message.getToolCallId(), TRANSCRIPT_TOOL_CALL_ID_LIMIT,
                    "Transcript model tool-call id"))
            .toolName(GatewayText.requireBounded(
                    message.getToolName(), TRANSCRIPT_TOOL_NAME_LIMIT, "Transcript tool name"))
            .errorMessage(GatewayText.requireBounded(
                    AgentRuntimeTextSanitizer.sanitizeAndLimit(
                            message.getErrorMessage(), TRANSCRIPT_TOOL_ERROR_LIMIT),
                    TRANSCRIPT_TOOL_ERROR_LIMIT,
                    "Transcript tool error"))
            .content(validateTranscriptContent(message.getContent()))
            .build();
    }

    private AgentRunRequestSnapshot validateRequestSnapshot(AgentRunRequestSnapshot request) {
        if (request == null) {
            return null;
        }
        List<String> attachments = request.attachments().stream()
                .map(value -> GatewayText.requireBounded(value, 8192, "Agent request attachment"))
                .toList();
        AgentRunRequestSnapshot bounded = request.toBuilder()
                .version(GatewayText.requireBounded(request.version(), 16, "Agent request snapshot version"))
                .conversationId(GatewayText.requireBounded(
                        request.conversationId(), 256, "Agent request conversation id"))
                .messageId(GatewayText.requireBounded(request.messageId(), 128, "Agent request message id"))
                .entryType(GatewayText.requireBounded(request.entryType(), 32, "Agent request entry type"))
                .message(GatewayText.requireBounded(request.message(), 8192, "Agent request message"))
                .preferredLanguage(GatewayText.requireBounded(
                        request.preferredLanguage(), 128, "Agent request preferred language"))
                .approvalHandling(GatewayText.requireBounded(
                        request.approvalHandling(), 32, "Agent request approval handling"))
                .replyMode(GatewayText.requireBounded(request.replyMode(), 32, "Agent request reply mode"))
                .attachments(attachments)
                .build();
        return bounded.toBuilder()
                .conversationId(redactRequestValue(bounded.conversationId()))
                .messageId(redactRequestValue(bounded.messageId()))
                .entryType(redactRequestValue(bounded.entryType()))
                .target(redactTarget(bounded.target()))
                .alertIncident(redactIncident(bounded.alertIncident()))
                .message(redactRequestValue(bounded.message()))
                .attachments(bounded.attachments().stream().map(this::redactRequestValue).toList())
                .preferredLanguage(redactRequestValue(bounded.preferredLanguage()))
                .approvalHandling(redactRequestValue(bounded.approvalHandling()))
                .replyMode(redactRequestValue(bounded.replyMode()))
                .build();
    }

    private AgentAlertIncidentContext redactIncident(AgentAlertIncidentContext incident) {
        if (incident == null) {
            return null;
        }
        String json = JsonUtil.toJson(incident);
        return Objects.equals(json, GatewayText.redactSecrets(json)) ? incident : null;
    }

    private AgentTargetRef redactTarget(AgentTargetRef target) {
        if (target == null) {
            return null;
        }
        AgentSignalRef signal = target.getSignal();
        AgentTopologyRef topology = target.getTopology();
        AgentTraceRef trace = target.getTrace();
        AgentLogRef log = target.getLog();
        AgentServiceRef service = target.getService();
        AgentTargetAuthority authority = target.getAuthority();
        return AgentTargetRef.builder()
                .version(redactRequestValue(target.getVersion()))
                .monitorId(target.getMonitorId())
                .alertId(target.getAlertId())
                .entityId(target.getEntityId())
                .collector(redactRequestValue(target.getCollector()))
                .signal(signal == null ? null : AgentSignalRef.builder()
                        .type(redactRequestValue(signal.getType()))
                        .query(redactRequestValue(signal.getQuery()))
                        .timeRange(redactRequestValue(signal.getTimeRange()))
                        .start(signal.getStart())
                        .end(signal.getEnd())
                        .timezone(redactRequestValue(signal.getTimezone()))
                        .build())
                .topology(topology == null ? null : AgentTopologyRef.builder()
                        .rootEntityId(topology.getRootEntityId())
                        .nodeId(redactRequestValue(topology.getNodeId()))
                        .edgeId(redactRequestValue(topology.getEdgeId()))
                        .depth(topology.getDepth())
                        .environment(redactRequestValue(topology.getEnvironment()))
                        .sourceKind(redactRequestValue(topology.getSourceKind()))
                        .start(topology.getStart())
                        .end(topology.getEnd())
                        .relationType(redactRequestValue(topology.getRelationType()))
                        .hideInternal(topology.getHideInternal())
                        .pageIndex(topology.getPageIndex())
                        .pageSize(topology.getPageSize())
                        .build())
                .trace(trace == null ? null : AgentTraceRef.builder()
                        .traceId(redactRequestValue(trace.getTraceId()))
                        .spanId(redactRequestValue(trace.getSpanId()))
                        .start(trace.getStart())
                        .end(trace.getEnd())
                        .serviceName(redactRequestValue(trace.getServiceName()))
                        .serviceNamespace(redactRequestValue(trace.getServiceNamespace()))
                        .environment(redactRequestValue(trace.getEnvironment()))
                        .resourceFilter(redactRequestValue(trace.getResourceFilter()))
                        .attributeFilter(redactRequestValue(trace.getAttributeFilter()))
                        .minDurationMs(trace.getMinDurationMs())
                        .maxDurationMs(trace.getMaxDurationMs())
                        .build())
                .log(log == null ? null : AgentLogRef.builder()
                        .start(log.getStart())
                        .end(log.getEnd())
                        .traceId(redactRequestValue(log.getTraceId()))
                        .spanId(redactRequestValue(log.getSpanId()))
                        .severityNumber(log.getSeverityNumber())
                        .severityText(redactRequestValue(log.getSeverityText()))
                        .search(redactRequestValue(log.getSearch()))
                        .serviceName(redactRequestValue(log.getServiceName()))
                        .serviceNamespace(redactRequestValue(log.getServiceNamespace()))
                        .environment(redactRequestValue(log.getEnvironment()))
                        .resourceFilter(redactRequestValue(log.getResourceFilter()))
                        .attributeFilter(redactRequestValue(log.getAttributeFilter()))
                        .hideInternal(log.getHideInternal())
                        .hideNoise(log.getHideNoise())
                        .pageIndex(log.getPageIndex())
                        .pageSize(log.getPageSize())
                        .build())
                .service(service == null ? null : AgentServiceRef.builder()
                        .name(redactRequestValue(service.getName()))
                        .namespace(redactRequestValue(service.getNamespace()))
                        .environment(redactRequestValue(service.getEnvironment()))
                        .build())
                .authority(authority == null ? null : AgentTargetAuthority.builder()
                        .bindingId(authority.getBindingId())
                        .version(redactRequestValue(authority.getVersion()))
                        .hash(redactRequestValue(authority.getHash()))
                        .build())
                .build();
    }

    private String redactRequestValue(String value) {
        String redacted = GatewayText.redactSecrets(value);
        return Objects.equals(value, redacted) ? value : REDACTED_REQUEST_VALUE;
    }

    private List<TranscriptContent> validateTranscriptContent(List<TranscriptContent> content) {
        if (content == null || content.isEmpty()) {
            return List.of();
        }
        return content.stream()
            .filter(Objects::nonNull)
            .map(block -> block.toBuilder()
                .id(GatewayText.requireBounded(
                        block.getId(), TRANSCRIPT_TOOL_CALL_ID_LIMIT, "Transcript tool-call id"))
                .name(GatewayText.requireBounded(
                        block.getName(), TRANSCRIPT_TOOL_NAME_LIMIT, "Transcript tool name"))
                .text(GatewayText.redactSecrets(block.getText()))
                .input(GatewaySecretRedactor.redactMap(
                        block.getInput() == null ? Map.of() : block.getInput()))
                .build())
            .toList();
    }

    private String toJson(TranscriptMessage message) {
        String json = JsonUtil.toJson(message);
        if (GatewayText.isBlank(json)) {
            throw new IllegalArgumentException("Agent transcript payload cannot be serialized");
        }
        return json;
    }
}
