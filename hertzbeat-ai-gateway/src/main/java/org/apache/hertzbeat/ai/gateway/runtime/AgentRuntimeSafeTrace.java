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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Development-only structural diagnostics. Never retains prompt, response or argument contents. */
final class AgentRuntimeSafeTrace {
    private static final org.slf4j.Logger LOG =
            org.slf4j.LoggerFactory.getLogger(AgentRuntimeSafeTrace.class);
    private static final Set<String> FINISH_REASONS =
            Set.of(
                    "stop",
                    "tool_calls",
                    "length",
                    "content_filter",
                    "function_call",
                    "end_turn",
                    "max_tokens",
                    "tool_use");

    private AgentRuntimeSafeTrace() {}

    static String finishReason(String value) {
        if (value == null || value.isBlank()) return "NOT_ADVERTISED";
        String normalized = value.toLowerCase(java.util.Locale.ROOT);
        return FINISH_REASONS.contains(normalized) ? normalized : "OTHER";
    }

    static String phase(AgentRuntimeModelRequest request) {
        String instructions = request.getPrompt().getInstructions();
        if (instructions.startsWith("WEBSITE_BATCH_PROPOSAL_INTENT"))
            return "WEBSITE_PROPOSAL_INTENT";
        if (instructions.startsWith("EXPLICIT_MANIFEST_INTENT")) return "MANIFEST_INTENT";
        if (instructions.startsWith("ORIGINAL_TASK_GOAL_ONLY")) return "ORIGINAL_GOAL";
        if (instructions.startsWith("ORIGINAL_TASK_COMPLETION_REVIEW")) return "COMPLETION_REVIEW";
        return "PLANNING";
    }

    static Map<String, Object> modelShape(
            AgentRuntimeModelRequest request, AgentRuntimeModelResponse response, String finish) {
        String phase = phase(request);
        Set<String> offered =
                request.getAvailableTools().stream()
                        .map(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor::getName)
                        .collect(java.util.stream.Collectors.toSet());
        var histories = new java.util.TreeMap<String, Long>();
        request.getChatHistory()
                .forEach(message -> histories.merge(message.getRole().name(), 1L, Long::sum));
        var shape = new java.util.LinkedHashMap<String, Object>();
        shape.put("phase", phase);
        if (!"PLANNING".equals(phase) && !request.getChatHistory().isEmpty()) {
            String payload = request.getChatHistory().getLast().text();
            shape.put("reviewRequestShape", reviewRequestShape(payload));
        }
        shape.put("historyRoles", histories);
        shape.put("offeredToolCount", offered.size());
        shape.put(
                "maxCompletionTokens",
                request.getMaxCompletionTokens() == null ? -1 : request.getMaxCompletionTokens());
        shape.put("responseType", response == null ? "EMPTY" : response.getType().name());
        shape.put("finishReason", finishReason(finish));
        shape.put(
                "responseTextLength",
                response == null || response.getFinalAnswer() == null
                        ? 0
                        : response.getFinalAnswer().length());
        if (!"PLANNING".equals(phase) && response != null)
            shape.put("reviewJsonShape", reviewJsonShape(response.getFinalAnswer()));
        shape.put(
                "toolCalls",
                response == null
                        ? List.of()
                        : response.getToolCalls().stream()
                                .limit(64)
                                .map(
                                        call ->
                                                Map.of(
                                                        "advertised",
                                                                offered.contains(
                                                                        call.getToolName()),
                                                        "tool",
                                                                offered.contains(call.getToolName())
                                                                        ? call.getToolName()
                                                                        : "UNADVERTISED",
                                                        "argumentCount",
                                                                call.getArguments().size()))
                                .toList());
        return shape;
    }

    static Map<String, Object> reviewRequestShape(String text) {
        if (text == null || text.length() > 64000) return Map.of("payloadState", "UNAVAILABLE");
        try {
            Object parsed = org.apache.hertzbeat.common.util.JsonUtil.fromJson(text, Object.class);
            if (!(parsed instanceof Map<?, ?> root)) return Map.of("payloadState", "NOT_OBJECT");
            var kinds = new java.util.TreeMap<String, Long>();
            int count = 0;
            if (root.get("facts") instanceof List<?> facts) {
                count = facts.size();
                Set<String> allowed =
                        java.util.Arrays.stream(AgentTaskEvidence.Kind.values())
                                .map(Enum::name)
                                .collect(java.util.stream.Collectors.toSet());
                for (Object entry : facts) {
                    Object kind = entry instanceof Map<?, ?> fact ? fact.get("kind") : null;
                    kinds.merge(
                            kind instanceof String name && allowed.contains(name) ? name : "OTHER",
                            1L,
                            Long::sum);
                }
            }
            return Map.of(
                    "payloadState",
                    "OBJECT",
                    "originalGoalPresent",
                    root.get("originalGoal") != null,
                    "factCount",
                    count,
                    "factKinds",
                    kinds,
                    "originalQuestionShape",
                    valueShape(root.get("originalQuestion")),
                    "candidateAnswerShape",
                    valueShape(root.get("candidateAnswer")));
        } catch (RuntimeException malformed) {
            return Map.of("payloadState", "MALFORMED");
        }
    }

    static Map<String, Object> reviewJsonShape(String text) {
        if (text == null) return Map.of("jsonState", "EMPTY");
        if (text.length() > 64000) return Map.of("jsonState", "TOO_LARGE");
        try {
            Object parsed = org.apache.hertzbeat.common.util.JsonUtil.fromJson(text, Object.class);
            if (!(parsed instanceof Map<?, ?> root)) return Map.of("jsonState", "NOT_OBJECT");
            var fields = new java.util.LinkedHashMap<String, Object>();
            for (String field :
                    List.of(
                            "goal",
                            "stage",
                            "answerSupported",
                            "claims",
                            "type",
                            "operation",
                            "resourceType",
                            "expectedCount",
                            "resourceIds",
                            "expectedChanges",
                            "createTargets")) {
                if (root.containsKey(field)) fields.put(field, valueShape(root.get(field)));
            }
            if (root.get("goal") instanceof Map<?, ?> goal) {
                var goalFields = new java.util.LinkedHashMap<String, Object>();
                for (String field :
                        List.of(
                                "type",
                                "operation",
                                "resourceType",
                                "expectedCount",
                                "resourceIds",
                                "expectedChanges",
                                "createTargets")) {
                    if (goal.containsKey(field)) goalFields.put(field, valueShape(goal.get(field)));
                }
                fields.put("goal", goalFields);
            }
            if (root.containsKey("stage"))
                fields.put(
                        "stageEnum", enumShape(root.get("stage"), AgentTaskOutcome.Stage.values()));
            Map<?, ?> rawGoal = root.get("goal") instanceof Map<?, ?> goal ? goal : root;
            if (rawGoal.containsKey("type"))
                fields.put(
                        "goalTypeEnum",
                        enumShape(rawGoal.get("type"), AgentTaskAssessment.Type.values()));
            if (rawGoal.containsKey("operation"))
                fields.put(
                        "operationEnum",
                        enumShape(
                                rawGoal.get("operation"), AgentTaskAssessment.Operation.values()));
            return Map.of(
                    "jsonState", "OBJECT", "rootFieldCount", root.size(), "knownFields", fields);
        } catch (RuntimeException malformed) {
            return Map.of("jsonState", "MALFORMED");
        }
    }

    private static String enumShape(Object value, Enum<?>[] allowed) {
        if (!(value instanceof String text)) return "INVALID_TYPE";
        for (Enum<?> item : allowed) if (item.name().equals(text)) return item.name();
        return "INVALID_ENUM";
    }

    private static Map<String, Object> valueShape(Object value) {
        if (value == null) return Map.of("type", "NULL");
        if (value instanceof Map<?, ?> map) return Map.of("type", "OBJECT", "size", map.size());
        if (value instanceof List<?> list) return Map.of("type", "ARRAY", "size", list.size());
        if (value instanceof String text) return Map.of("type", "STRING", "length", text.length());
        if (value instanceof Boolean) return Map.of("type", "BOOLEAN");
        if (value instanceof Number) return Map.of("type", "NUMBER");
        return Map.of("type", "OTHER");
    }

    static Map<String, Object> assessmentShape(
            AgentTaskAssessment assessment, AgentTaskAssessment.Goal bound) {
        var shape = new java.util.LinkedHashMap<String, Object>();
        shape.put("assessmentPresent", assessment != null);
        shape.put("assessmentValid", assessment != null && assessment.valid());
        shape.put("boundGoalPresent", bound != null);
        shape.put(
                "boundGoalMatches",
                assessment != null && java.util.Objects.equals(bound, assessment.goal()));
        if (assessment != null) {
            shape.put("stage", assessment.stage() == null ? "MISSING" : assessment.stage().name());
            shape.put("answerSupported", Boolean.TRUE.equals(assessment.answerSupported()));
            shape.put("claimCount", assessment.claims() == null ? -1 : assessment.claims().size());
            if (assessment.goal() != null) {
                shape.put("goalStructure", assessment.goal().structure());
                shape.put(
                        "goalValidationRule",
                        assessment.goal().validationFailure() == null
                                ? "NONE"
                                : assessment.goal().validationFailure().name());
                shape.put(
                        "goalType",
                        assessment.goal().type() == null
                                ? "MISSING"
                                : assessment.goal().type().name());
                shape.put(
                        "operation",
                        assessment.goal().operation() == null
                                ? "MISSING"
                                : assessment.goal().operation().name());
                // No free-form resourceType, IDs, expectedChanges, claims or field contents.
            }
        }
        return shape;
    }

    static void model(
            String runUid,
            AgentRuntimeModelRequest request,
            AgentRuntimeModelResponse response,
            String finish) {
        if (LOG.isDebugEnabled())
            LOG.debug(
                    "Agent model structure runUid={} structure={}",
                    runUid,
                    modelShape(request, response, finish));
    }

    static void review(
            String runUid,
            String failure,
            AgentTaskAssessment assessment,
            AgentTaskAssessment.Goal bound,
            AgentTaskCompletionPolicy.Decision decision,
            boolean readProof,
            boolean mutationAttempted,
            int modelRequests,
            int toolCalls) {
        if (LOG.isDebugEnabled())
            LOG.debug(
                    "Agent completion decision runUid={} reviewFailure={} assessment={}"
                        + " decisionStage={} continuePlanning={} publishCandidate={} readProof={}"
                        + " mutationAttempted={} modelRequests={} toolCalls={}",
                    runUid,
                    failure,
                    assessmentShape(assessment, bound),
                    decision.outcome().stage(),
                    decision.continuePlanning(),
                    decision.publishCandidate(),
                    readProof,
                    mutationAttempted,
                    modelRequests,
                    toolCalls);
    }
}
