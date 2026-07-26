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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionTranscriptCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListSessionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only Agent Gateway query API.
 */
@Tag(name = "Agent Query API")
@RestController
@RequestMapping(path = "/api/agent", produces = {APPLICATION_JSON_VALUE})
public class QueryController {

    private final GatewayCommandRouter commandRouter;

    public QueryController(GatewayCommandRouter commandRouter) {
        this.commandRouter = commandRouter;
    }

    @GetMapping("/sessions/{sessionId}")
    @Operation(summary = "Get Agent Gateway session")
    public ResponseEntity<Message<GatewaySingleResponse>> getSession(
            @Parameter(description = "Session ID or UID") @PathVariable String sessionId) {
        return ResponseEntity.ok(Message.success((GatewaySingleResponse) commandRouter.handle(
                GetSessionCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("get-session:" + sessionId)
                        .sessionUid(sessionId)
                        .build())));
    }

    @GetMapping("/sessions")
    @Operation(summary = "List current WebUI user's Agent Gateway sessions")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Message<Page<AgentSession>>> listSessions(
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "50") int pageSize) {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                ListSessionsCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("list-sessions:" + pageIndex)
                        .title(null)
                        .pageIndex(pageIndex)
                        .pageSize(pageSize)
                        .build());
        return ResponseEntity.ok(Message.success((Page<AgentSession>) response.body()));
    }

    @GetMapping("/alert-analysis/sessions")
    @Operation(summary = "List automatic alert analysis sessions")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Message<Page<AgentSession>>> listAlertAnalysisSessions(
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "50") int pageSize,
            @RequestParam(required = false) String search) {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                ListSessionsCommand.builder()
                        .envelope(alertAnalysisEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("list-alert-analysis-sessions:" + pageIndex)
                        .title(search)
                        .pageIndex(pageIndex)
                        .pageSize(pageSize)
                        .build());
        return ResponseEntity.ok(Message.success((Page<AgentSession>) response.body()));
    }

    @GetMapping("/alert-analysis/sessions/{sessionId}")
    @Operation(summary = "Get automatic alert analysis session")
    public ResponseEntity<Message<GatewaySingleResponse>> getAlertAnalysisSession(
            @Parameter(description = "Session ID or UID") @PathVariable String sessionId) {
        return ResponseEntity.ok(Message.success((GatewaySingleResponse) commandRouter.handle(
                GetSessionCommand.builder()
                        .envelope(alertAnalysisEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("get-alert-analysis-session:" + sessionId)
                        .sessionUid(sessionId)
                        .build())));
    }

    @GetMapping("/sessions/{sessionUid}/transcript")
    @Operation(summary = "List Agent Gateway session transcript entries")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Message<Page<AgentTranscriptEntry>>> listSessionTranscript(
            @Parameter(description = "Session UID or numeric ID") @PathVariable String sessionUid,
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "50") int pageSize) {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                GetSessionTranscriptCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("get-session-transcript:" + sessionUid)
                        .sessionUid(sessionUid)
                        .pageIndex(pageIndex)
                        .pageSize(pageSize)
                        .build());
        return ResponseEntity.ok(Message.success((Page<AgentTranscriptEntry>) response.body()));
    }

    @GetMapping("/alert-analysis/sessions/{sessionUid}/transcript")
    @Operation(summary = "List automatic alert analysis session transcript entries")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Message<Page<AgentTranscriptEntry>>> listAlertAnalysisSessionTranscript(
            @Parameter(description = "Session UID or numeric ID") @PathVariable String sessionUid,
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "50") int pageSize) {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                GetSessionTranscriptCommand.builder()
                        .envelope(alertAnalysisEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("get-alert-analysis-session-transcript:" + sessionUid)
                        .sessionUid(sessionUid)
                        .pageIndex(pageIndex)
                        .pageSize(pageSize)
                        .build());
        return ResponseEntity.ok(Message.success((Page<AgentTranscriptEntry>) response.body()));
    }

    private GatewayEnvelope webUiEnvelope() {
        return GatewayEnvelope.builder()
                .channelId(ChannelId.WEB_UI.id())
                .receivedAt(System.currentTimeMillis())
                .actor(ActorSupport.requireCurrentSurenessActor())
                .build();
    }

    private GatewayEnvelope alertAnalysisEnvelope() {
        return GatewayEnvelope.builder()
                .channelId(ChannelId.ALERT.id())
                .receivedAt(System.currentTimeMillis())
                .actor(AgentActor.alertAnalysisActor())
                .build();
    }
}
