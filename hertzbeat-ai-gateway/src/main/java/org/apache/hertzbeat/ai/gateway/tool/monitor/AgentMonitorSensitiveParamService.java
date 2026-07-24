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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.service.AppService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;

/**
 * Approval-scoped sensitive monitor parameters that never enter model or ledger payloads.
 */
@Service
public class AgentMonitorSensitiveParamService {

    public static final String MONITOR_CREATE_TOOL = "monitor.create";

    private final AppService appService;
    private final AgentToolCallLedgerService toolCallLedgerService;
    private final AgentSessionService sessionService;
    private final ConcurrentMap<String, Map<String, Object>> approvalParams = new ConcurrentHashMap<>();

    public AgentMonitorSensitiveParamService(AppService appService,
                                             AgentToolCallLedgerService toolCallLedgerService,
                                             AgentSessionService sessionService) {
        this.appService = appService;
        this.toolCallLedgerService = toolCallLedgerService;
        this.sessionService = sessionService;
    }

    public AgentToolExecutionRequest removeSensitiveArguments(AgentToolExecutionRequest request) {
        if (!MONITOR_CREATE_TOOL.equals(request.getToolName())) {
            return request;
        }
        Map<String, Object> arguments = new LinkedHashMap<>(request.getArguments());
        Map<String, Object> params = objectMap(arguments.get("params"));
        Set<String> sensitiveFields = sensitiveDefinitions(String.valueOf(arguments.get("app"))).stream()
                .map(ParamDefineInfo::getField)
                .collect(Collectors.toSet());
        if (params.keySet().removeAll(sensitiveFields)) {
            arguments.put("params", params);
            return request.toBuilder().arguments(arguments).build();
        }
        return request;
    }

    public List<SensitiveParamDefinition> definitions(String approvalId, AgentActor actor) {
        AgentToolCall toolCall = ownedMonitorApproval(approvalId, actor);
        Map<String, Object> arguments = JsonUtil.fromJson(toolCall.getInputJson(),
                new TypeReference<Map<String, Object>>() { });
        return sensitiveDefinitions(String.valueOf(arguments.get("app"))).stream()
                .map(definition -> new SensitiveParamDefinition(definition.getField(), definition.getName(),
                        definition.isRequired(), definition.getPlaceholder()))
                .toList();
    }

    public void submit(String approvalId, AgentActor actor, Map<String, Object> params) {
        AgentToolCall toolCall = toolCallLedgerService.findApproval(approvalId)
                .orElseThrow(() -> new IllegalArgumentException("Agent approval was not found"));
        if (!MONITOR_CREATE_TOOL.equals(toolCall.getToolName())) {
            if (params != null && !params.isEmpty()) {
                throw new IllegalArgumentException("Sensitive parameters are only accepted for monitor creation");
            }
            return;
        }
        List<SensitiveParamDefinition> definitions = definitions(approvalId, actor);
        Set<String> allowed = definitions.stream().map(SensitiveParamDefinition::field).collect(Collectors.toSet());
        Map<String, Object> submitted = new LinkedHashMap<>(params == null ? Map.of() : params);
        if (!allowed.containsAll(submitted.keySet())) {
            throw new IllegalArgumentException("Approval contains an unknown sensitive monitor parameter");
        }
        for (SensitiveParamDefinition definition : definitions) {
            Object value = submitted.get(definition.field());
            if (definition.required() && (value == null || !StringUtils.hasText(String.valueOf(value)))) {
                throw new IllegalArgumentException("Required sensitive monitor parameter is missing: "
                        + definition.field());
            }
        }
        if (!submitted.isEmpty()) {
            approvalParams.put(approvalId, Map.copyOf(submitted));
        }
    }

    public AgentToolExecutionRequest mergeAndTake(AgentToolExecutionRequest request) {
        if (!MONITOR_CREATE_TOOL.equals(request.getToolName()) || !StringUtils.hasText(request.getApprovalId())) {
            return request;
        }
        Map<String, Object> sensitive = approvalParams.remove(request.getApprovalId());
        if (sensitive == null || sensitive.isEmpty()) {
            return request;
        }
        Map<String, Object> arguments = new LinkedHashMap<>(request.getArguments());
        Map<String, Object> params = objectMap(arguments.get("params"));
        params.putAll(sensitive);
        arguments.put("params", params);
        return request.toBuilder().arguments(arguments).build();
    }

    public void clear(String approvalId) {
        approvalParams.remove(approvalId);
    }

    private AgentToolCall ownedMonitorApproval(String approvalId, AgentActor actor) {
        AgentToolCall toolCall = toolCallLedgerService.findApproval(approvalId)
                .filter(call -> MONITOR_CREATE_TOOL.equals(call.getToolName()))
                .orElseThrow(() -> new IllegalArgumentException("Monitor creation approval was not found"));
        AgentSession session = sessionService.findSession(toolCall.getSessionUid())
                .orElseThrow(() -> new IllegalArgumentException("Approval session was not found"));
        if (!session.getActorType().equals(actor.getType()) || !session.getActorId().equals(actor.getId())) {
            throw new IllegalArgumentException("Approval does not belong to the current actor");
        }
        return toolCall;
    }

    private List<ParamDefineInfo> sensitiveDefinitions(String app) {
        if (!StringUtils.hasText(app) || "null".equals(app)) {
            return List.of();
        }
        return appService.getAppParamDefines(app).stream()
                .filter(definition -> "password".equals(definition.getType()))
                .toList();
    }

    private Map<String, Object> objectMap(Object value) {
        if (!(value instanceof Map<?, ?> values)) {
            return new LinkedHashMap<>();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        values.forEach((key, item) -> result.put(String.valueOf(key), item));
        return result;
    }

    /** Safe parameter metadata rendered by the WebUI approval form. */
    public record SensitiveParamDefinition(String field, Map<String, String> name,
                                           boolean required, String placeholder) {
    }
}
