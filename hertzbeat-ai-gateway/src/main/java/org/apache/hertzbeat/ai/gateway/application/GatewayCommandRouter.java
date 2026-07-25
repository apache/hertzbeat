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

import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ApprovalDecisionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CancelRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionTranscriptCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListSessionsCommand;
import org.springframework.stereotype.Service;

/**
 * Routes Gateway commands to domain services.
 */
@Service
public class GatewayCommandRouter {

    private final AgentCommandService agentCommandService;
    private final ApprovalCommandService approvalCommandService;
    private final RunCommandService runCommandService;
    private final GatewayQueryService queryService;

    public GatewayCommandRouter(AgentCommandService agentCommandService,
                                ApprovalCommandService approvalCommandService,
                                RunCommandService runCommandService,
                                GatewayQueryService queryService) {
        this.agentCommandService = Objects.requireNonNull(agentCommandService, "agentCommandService is required");
        this.approvalCommandService = Objects.requireNonNull(approvalCommandService,
                "approvalCommandService is required");
        this.runCommandService = Objects.requireNonNull(runCommandService, "runCommandService is required");
        this.queryService = Objects.requireNonNull(queryService, "queryService is required");
    }

    public GatewayResponse handle(GatewayCommand command) {
        Objects.requireNonNull(command, "command is required");
        return switch (command) {
            case InvokeCommand invokeCommand -> agentCommandService.handle(invokeCommand);
            case ApprovalDecisionCommand approvalCommand -> approvalCommandService.decide(approvalCommand);
            case CancelRunCommand cancelCommand -> runCommandService.cancel(cancelCommand);
            case GetSessionCommand getSessionCommand -> queryService.getSession(getSessionCommand);
            case ListSessionsCommand listSessionsCommand -> queryService.listSessions(listSessionsCommand);
            case GetSessionTranscriptCommand transcriptCommand ->
                    queryService.getSessionTranscript(transcriptCommand);
        };
    }
}
