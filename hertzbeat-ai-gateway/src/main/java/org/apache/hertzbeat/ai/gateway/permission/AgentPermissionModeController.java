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

package org.apache.hertzbeat.ai.gateway.permission;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Human WebUI endpoints only. Deliberately absent from the model tool registry. */
@RestController
@RequestMapping("/api/agent/sessions/{sessionUid}/permission-mode")
public class AgentPermissionModeController {
    private final AgentPermissionModeService service;

    public AgentPermissionModeController(AgentPermissionModeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Message<AgentPermissionModeService.View>> status(
            @PathVariable String sessionUid) {
        return ResponseEntity.ok(Message.success(service.status(envelope(), sessionUid)));
    }

    @PostMapping("/challenge")
    public ResponseEntity<Message<AgentPermissionModeService.Challenge>> challenge(
            @PathVariable String sessionUid) {
        return ResponseEntity.ok(Message.success(service.challenge(envelope(), sessionUid)));
    }

    @PostMapping("/confirm")
    public ResponseEntity<Message<AgentPermissionModeService.View>> confirm(
            @PathVariable String sessionUid,
            @RequestBody AgentPermissionModeService.Confirm request) {
        return ResponseEntity.ok(Message.success(service.confirm(envelope(), sessionUid, request)));
    }

    @PostMapping("/revoke")
    public ResponseEntity<Message<AgentPermissionModeService.View>> revoke(
            @PathVariable String sessionUid) {
        return ResponseEntity.ok(Message.success(service.revoke(envelope(), sessionUid)));
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .channelId("web-ui")
                .workspaceId(AuthTokenRequestContext.currentWorkspaceId())
                .actor(ActorSupport.requireCurrentSurenessActor())
                .receivedAt(System.currentTimeMillis())
                .build();
    }
}
