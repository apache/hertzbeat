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

import org.apache.hertzbeat.ai.gateway.application.AgentBatchCommandService;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.runtime.AgentBatchProgress;
import org.apache.hertzbeat.ai.gateway.runtime.AgentBatchService;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Flux;

import java.util.Locale;

/** Owner-only frozen batch progress and explicit continuation. */
@RestController
@RequestMapping("/api/agent/runs/{runUid}/batch")
public class AgentBatchController {
    private final AgentRunDao runs;
    private final AgentSessionDao sessions;
    private final AgentBatchService batches;
    private final AgentBatchCommandService commands;

    public AgentBatchController(
            AgentRunDao runs,
            AgentSessionDao sessions,
            AgentBatchService batches,
            AgentBatchCommandService commands) {
        this.runs = runs;
        this.sessions = sessions;
        this.batches = batches;
        this.commands = commands;
    }

    @GetMapping
    public Message<AgentBatchProgress> progress(@PathVariable String runUid) {
        var run = runs.findByRunUid(runUid).orElseThrow();
        var session = sessions.findById(run.getSessionId()).orElseThrow();
        return Message.success(batches.progress(session, run, envelope()).orElse(null));
    }

    @PostMapping(value = "/continue", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<GatewayEvent>> continueBatch(
            @PathVariable String runUid,
            @RequestBody Continuation request,
            @org.springframework.web.bind.annotation.RequestHeader(
                            name = "Accept-Language",
                            required = false)
                    String language) {
        GatewayEnvelope envelope =
                envelope().toBuilder()
                        .preferredLanguage(
                                org.apache.hertzbeat.ai.gateway.contract.AgentResponseLanguage
                                        .fromAcceptLanguage(language))
                        .build();
        if (request == null
                || request.planHash() == null
                || !request.planHash().matches("[a-f0-9]{64}")) {
            throw new IllegalArgumentException("Frozen plan hash is required");
        }
        return Flux.defer(
                        () -> commands.continueBatch(runUid, request.planHash(), envelope).events())
                .map(
                        event ->
                                ServerSentEvent.builder(event)
                                        .id(event.eventId())
                                        .event(event.type().name().toLowerCase(Locale.ROOT))
                                        .build());
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .channelId(ChannelId.WEB_UI.id())
                .receivedAt(System.currentTimeMillis())
                .actor(ActorSupport.requireCurrentSurenessActor())
                .workspaceId(AuthTokenRequestContext.currentWorkspaceId())
                .build();
    }

    /** No target, argument, budget or permission override is accepted. */
    public record Continuation(String planHash) {}
}
