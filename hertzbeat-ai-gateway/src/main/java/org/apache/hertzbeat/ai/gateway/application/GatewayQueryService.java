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

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListToolsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.springframework.stereotype.Service;

/**
 * Gateway query commands. Query commands never invoke runtime.
 */
@Service
public class GatewayQueryService {

    private final AgentToolRegistry toolRegistry;
    private final AgentRunService runService;
    private final AgentSessionService sessionService;

    public GatewayQueryService(AgentToolRegistry toolRegistry, AgentRunService runService,
                               AgentSessionService sessionService) {
        this.toolRegistry = toolRegistry;
        this.runService = runService;
        this.sessionService = sessionService;
    }

    public GatewaySingleResponse listTools(ListToolsCommand command) {
        return GatewaySingleResponse.builder()
                .meta(Meta.builder()
                        .commandId(command.commandId())
                        .terminal(true)
                        .message("tools")
                        .build())
                .body(Map.of("tools", toolRegistry.descriptors()))
                .events(List.of())
                .build();
    }

    public GatewaySingleResponse getRun(GetRunCommand command) {
        return runService.findRun(command.runUid())
                .<GatewaySingleResponse>map(run -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .runUid(run.getRunUid())
                                .terminal(true)
                                .message("run")
                                .build())
                        .body(run)
                        .events(List.of())
                        .build())
                .orElseGet(() -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .runUid(command.runUid())
                                .terminal(true)
                                .message("Agent run not found")
                                .build())
                        .events(List.of())
                        .build());
    }

    public GatewaySingleResponse getSession(GetSessionCommand command) {
        return sessionService.findSession(command.sessionUid())
                .<GatewaySingleResponse>map(session -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .sessionUid(session.getSessionUid())
                                .terminal(true)
                                .message("session")
                                .build())
                        .body(session)
                        .events(List.of())
                        .build())
                .orElseGet(() -> GatewaySingleResponse.builder()
                        .meta(Meta.builder()
                                .commandId(command.commandId())
                                .sessionUid(command.sessionUid())
                                .terminal(true)
                                .message("Agent session not found")
                                .build())
                        .events(List.of())
                        .build());
    }
}
