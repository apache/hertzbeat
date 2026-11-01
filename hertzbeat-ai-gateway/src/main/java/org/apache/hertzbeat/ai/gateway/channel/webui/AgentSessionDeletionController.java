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

import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionDeletionService;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Current WebUI user's history management, independent of administrator privileges. */
@RestController
@RequestMapping("/api/agent/sessions")
public class AgentSessionDeletionController {
    private final AgentSessionDeletionService service;

    public AgentSessionDeletionController(AgentSessionDeletionService service) { this.service = service; }

    @GetMapping("/deletion-preview")
    public ResponseEntity<Message<AgentSessionDeletionService.Preview>> preview() {
        return ResponseEntity.ok(Message.success(service.preview(envelope())));
    }

    @PostMapping("/delete")
    public ResponseEntity<Message<AgentSessionDeletionService.Result>> delete(
            @RequestBody AgentSessionDeletionService.Request request) {
        return ResponseEntity.ok(Message.success(service.delete(envelope(), request)));
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder().channelId(ChannelId.WEB_UI.id()).receivedAt(System.currentTimeMillis())
                .actor(ActorSupport.requireCurrentSurenessActor()).workspaceId(AuthTokenRequestContext.currentWorkspaceId()).build();
    }
}
