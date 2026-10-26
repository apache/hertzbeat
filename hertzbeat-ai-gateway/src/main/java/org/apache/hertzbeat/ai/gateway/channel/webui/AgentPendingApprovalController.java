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
import org.apache.hertzbeat.ai.gateway.conversation.AgentPendingApprovalQuery;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Restores only the current user's approval cards after a browser reload. */
@RestController
public class AgentPendingApprovalController {
    private final AgentPendingApprovalQuery query;

    public AgentPendingApprovalController(AgentPendingApprovalQuery query) {
        this.query = query;
    }

    @GetMapping("/api/agent/runs/{runUid}/pending-approvals")
    public Message<AgentPendingApprovalQuery.View> read(@PathVariable String runUid) {
        return Message.success(
                query.read(
                        runUid,
                        GatewayEnvelope.builder()
                                .channelId(ChannelId.WEB_UI.id())
                                .receivedAt(System.currentTimeMillis())
                                .actor(ActorSupport.requireCurrentSurenessActor())
                                .workspaceId(AuthTokenRequestContext.currentWorkspaceId())
                                .build()));
    }
}
