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
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final AgentSessionService sessionService;

    public QueryController(GatewayCommandRouter commandRouter,
                           AgentSessionService sessionService) {
        this.commandRouter = commandRouter;
        this.sessionService = sessionService;
    }

    @GetMapping("/sessions/{sessionId}")
    @Operation(summary = "Get Agent Gateway session")
    public ResponseEntity<Message<GatewaySingleResponse>> getSession(
            @Parameter(description = "Session ID or UID") @PathVariable String sessionId) {
        return ResponseEntity.ok(Message.success((GatewaySingleResponse) commandRouter.handle(
                GetSessionCommand.builder()
                        .envelope(envelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("get-session:" + sessionId)
                        .sessionUid(sessionId)
                        .build())));
    }

    @GetMapping("/sessions")
    @Operation(summary = "List current WebUI user's Agent Gateway sessions")
    public ResponseEntity<Message<Page<AgentSession>>> listSessions(
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "50") int pageSize) {
        AgentActor actor = ActorSupport.requireCurrentSurenessActor();
        return ResponseEntity.ok(Message.success(sessionService.findSessions(
                ChannelId.WEB_UI.id(), actor, pageRequest(pageIndex, pageSize))));
    }

    @GetMapping("/alert-analysis/sessions")
    @Operation(summary = "List automatic alert analysis sessions")
    public ResponseEntity<Message<Page<AgentSession>>> listAlertAnalysisSessions(
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "50") int pageSize,
            @RequestParam(required = false) String search) {
        AgentActor actor = AgentActor.alertAnalysisActor();
        return ResponseEntity.ok(Message.success(sessionService.findSessions(
                ChannelId.ALERT.id(), actor, search, pageRequest(pageIndex, pageSize))));
    }

    @GetMapping("/sessions/{sessionUid}/transcript")
    @Operation(summary = "List Agent Gateway session transcript entries")
    public ResponseEntity<Message<Page<AgentTranscriptEntry>>> listSessionTranscript(
            @Parameter(description = "Session UID or numeric ID") @PathVariable String sessionUid,
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "50") int pageSize) {
        return ResponseEntity.ok(Message.success(sessionService.findSession(sessionUid)
                .map(session -> sessionService.findTranscriptEntries(session.getId(),
                        pageRequest(pageIndex, pageSize)))
                .orElseGet(() -> Page.empty(pageRequest(pageIndex, pageSize)))));
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .channelId(ChannelId.WEB_UI.id())
                .receivedAt(System.currentTimeMillis())
                .build();
    }

    private PageRequest pageRequest(int pageIndex, int pageSize) {
        return PageRequest.of(pageIndex, Math.min(pageSize, 200));
    }
}
