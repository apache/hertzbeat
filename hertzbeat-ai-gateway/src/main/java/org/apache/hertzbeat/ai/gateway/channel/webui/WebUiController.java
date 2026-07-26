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

package org.apache.hertzbeat.ai.gateway.channel.webui;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ApprovalDecisionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CancelRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.channel.webui.dto.WebUiChatStreamRequest;
import org.apache.hertzbeat.ai.gateway.contract.AgentResponseLanguage;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ErrorPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewayStreamResponse;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

/**
 * Interactive Agent Gateway endpoints used by the WebUI.
 */
@Tag(name = "Agent WebUI API")
@RestController
@RequestMapping(path = "/api/agent", produces = {APPLICATION_JSON_VALUE})
public class WebUiController {

    private final GatewayCommandRouter commandRouter;
    private final AgentInteractionInputService interactionInputService;

    public WebUiController(GatewayCommandRouter commandRouter,
                           AgentInteractionInputService interactionInputService) {
        this.commandRouter = commandRouter;
        this.interactionInputService = interactionInputService;
    }

    @PostMapping("/webui/chat")
    @Operation(summary = "Send a WebUI chat message")
    public ResponseEntity<Message<GatewaySingleResponse>> chat(
            @Valid @RequestBody WebUiChatStreamRequest request,
            @RequestHeader(name = HttpHeaders.ACCEPT_LANGUAGE, required = false) String acceptLanguage) {
        return ResponseEntity.ok(Message.success((GatewaySingleResponse) commandRouter.handle(
                chatCommand(request, ReplyMode.FINAL_ONLY, acceptLanguage))));
    }

    @PostMapping(value = "/webui/chat/stream", produces = TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream a WebUI chat message")
    public Flux<ServerSentEvent<GatewayEvent>> streamChat(
            @Valid @RequestBody WebUiChatStreamRequest request,
            @RequestHeader(name = HttpHeaders.ACCEPT_LANGUAGE, required = false) String acceptLanguage) {
        return ((GatewayStreamResponse) commandRouter.handle(
                chatCommand(request, ReplyMode.STREAM, acceptLanguage))).events()
                .map(this::toServerSentEvent)
                .onErrorResume(exception -> Flux.just(toServerSentEvent(errorEvent(exception))));
    }

    @PostMapping("/runs/{runUid}/stop")
    @Operation(summary = "Stop an Agent Gateway run")
    public ResponseEntity<Message<GatewaySingleResponse>> stopRun(
            @Parameter(description = "Run UID") @PathVariable String runUid) {
        return ResponseEntity.ok(Message.success((GatewaySingleResponse) commandRouter.handle(
                CancelRunCommand.builder()
                        .envelope(envelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("stop-run:" + runUid)
                        .runUid(runUid)
                        .reason("Stopped by the WebUI user.")
                        .build())));
    }

    @PostMapping("/approvals/{approvalId}/approve")
    @Operation(summary = "Approve Agent Gateway approval")
    public ResponseEntity<Message<GatewaySingleResponse>> approve(
            @Parameter(description = "Approval ID") @PathVariable String approvalId) {
        ApprovalDecisionCommand command = ApprovalDecisionCommand.builder()
                .envelope(envelope())
                .replyMode(ReplyMode.FINAL_ONLY)
                .commandId(approvalId)
                .approvalId(approvalId)
                .decision(AgentApprovalDecision.APPROVED)
                .build();
        return ResponseEntity.ok(Message.success((GatewaySingleResponse) commandRouter.handle(command)));
    }

    @PostMapping("/approvals/{approvalId}/reject")
    @Operation(summary = "Reject Agent Gateway approval")
    public ResponseEntity<Message<GatewaySingleResponse>> reject(
            @Parameter(description = "Approval ID") @PathVariable String approvalId) {
        ApprovalDecisionCommand command = ApprovalDecisionCommand.builder()
                .envelope(envelope())
                .replyMode(ReplyMode.FINAL_ONLY)
                .commandId(approvalId)
                .approvalId(approvalId)
                .decision(AgentApprovalDecision.REJECTED)
                .build();
        return ResponseEntity.ok(Message.success((GatewaySingleResponse) commandRouter.handle(command)));
    }

    @PostMapping("/interactions/{interactionId}/submit")
    @Operation(summary = "Submit values requested by an Agent interaction tool")
    public ResponseEntity<Message<String>> submitInteraction(
            @Parameter(description = "Interaction ID") @PathVariable String interactionId,
            @RequestBody InteractionSubmission submission) {
        interactionInputService.submit(interactionId, ActorSupport.requireCurrentSurenessActor(),
                submission == null ? Map.of() : submission.values());
        return ResponseEntity.ok(Message.success("submitted"));
    }

    private InvokeCommand chatCommand(WebUiChatStreamRequest request, ReplyMode replyMode, String acceptLanguage) {
        // WebUI attachments are optional; commands expose an immutable collection to downstream services.
        List<String> attachments = request.getAttachments() == null
                ? List.of()
                : List.copyOf(request.getAttachments());
        UserInput input = UserInput.builder()
                .messageId(request.getMessageId())
                .conversationId(request.getConversationId())
                .target(request.getTarget())
                .message(UserInput.Message.builder()
                        .text(request.getMessage())
                        .attachments(attachments)
                        .build())
                .build();
        return InvokeCommand.builder()
                .envelope(envelope().toBuilder()
                        .preferredLanguage(AgentResponseLanguage.fromAcceptLanguage(acceptLanguage))
                        .build())
                .replyMode(replyMode)
                .commandId(input.getMessageId())
                .userInput(input)
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .build();
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .channelId(ChannelId.WEB_UI.id())
                .receivedAt(System.currentTimeMillis())
                .actor(ActorSupport.requireCurrentSurenessActor())
                .build();
    }

    private ServerSentEvent<GatewayEvent> toServerSentEvent(GatewayEvent item) {
        return ServerSentEvent.builder(item)
                .event(item.type().name().toLowerCase(Locale.ROOT))
                .id(item.eventId())
                .build();
    }

    private GatewayEvent errorEvent(Throwable exception) {
        String message = StringUtils.hasText(exception.getMessage())
                ? exception.getMessage()
                : "Agent Gateway stream failed";
        return new GatewayEvent(GatewayEventType.ERROR, "webui:error", null, null, null, null,
                new ErrorPayload(null, message), System.currentTimeMillis());
    }

    /** Values supplied to a pending interaction request. */
    public record InteractionSubmission(Map<String, Object> values) {

        public InteractionSubmission {
            values = values == null ? Map.of() : Map.copyOf(values);
        }
    }
}
