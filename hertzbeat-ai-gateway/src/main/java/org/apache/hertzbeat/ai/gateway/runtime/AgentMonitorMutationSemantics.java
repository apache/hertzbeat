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

import com.fasterxml.jackson.databind.json.JsonMapper;

import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt.Target;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Domain acceptance for exact monitor mutations; transport success and collection health remain
 * separate.
 */
final class AgentMonitorMutationSemantics {
    private static final JsonMapper JSON =
            JsonMapper.builder()
                    .disable(
                            com.fasterxml.jackson.databind.DeserializationFeature
                                    .ACCEPT_FLOAT_AS_INT)
                    .build();
    private static final Set<String> TOOLS =
            Set.of(
                    "monitor.create",
                    "monitor.create_batch",
                    "monitor.update",
                    "monitor.pause",
                    "monitor.resume");
    private static final Set<String> FIELDS =
            Set.of(
                    "name",
                    "app",
                    "instance",
                    "intervals",
                    "description",
                    "labels",
                    "annotations",
                    "collector",
                    "scheduleType",
                    "cronExpression",
                    "collectionState");

    private AgentMonitorMutationSemantics() {}

    static boolean supports(String tool) {
        return tool != null && TOOLS.contains(tool);
    }

    static boolean isValidationTool(String tool) {
        return "monitor.detect_draft".equals(tool);
    }

    static boolean restoresSafeResult(String tool) {
        return supports(tool)
                || isValidationTool(tool)
                || "monitor.batch_status".equals(tool)
                || AgentDefinitionMutationSemantics.supports(tool)
                || "monitor.definition_preview".equals(tool);
    }

    static AgentTaskAssessment.Operation operation(String tool) {
        return switch (tool) {
            case "monitor.create", "monitor.create_batch" -> AgentTaskAssessment.Operation.CREATE;
            case "monitor.update" -> AgentTaskAssessment.Operation.UPDATE;
            case "monitor.pause" -> AgentTaskAssessment.Operation.PAUSE;
            case "monitor.resume" -> AgentTaskAssessment.Operation.RESUME;
            default -> AgentTaskAssessment.Operation.UNKNOWN;
        };
    }

    static AgentMonitorMutationReceipt parse(
            String tool, Map<String, Object> output, String trustedHash) {
        if (!supports(tool) || output == null || trustedHash == null) {
            return null;
        }
        try {
            var receipt =
                    JSON.convertValue(output.get("mutation"), AgentMonitorMutationReceipt.class);
            if (receipt == null
                    || !AgentMonitorMutationReceipt.VERSION.equals(receipt.version())
                    || !tool.equals(receipt.toolName())
                    || !trustedHash.equals(receipt.inputHash())
                    || receipt.targets().isEmpty()
                    || receipt.targets().size() > 100
                    || receipt.targets().stream().map(Target::monitorId).distinct().count()
                            != receipt.targets().size()) {
                return null;
            }
            for (Target target : receipt.targets()) {
                if (target.monitorId() == null
                        || target.monitorId() <= 0
                        || target.fields().isEmpty()
                        || !FIELDS.containsAll(target.fields().keySet())
                        || !AgentMonitorMutationReceipt.WEBSITE_FIELDS.containsAll(
                                target.parameters().keySet())) {
                    return null;
                }
            }
            return receipt;
        } catch (RuntimeException malformed) {
            return null;
        }
    }

    static boolean matchesRequest(AgentMonitorMutationReceipt receipt, Map<String, Object> args) {
        if (receipt == null || args == null) {
            return false;
        }
        switch (receipt.toolName()) {
            case "monitor.create_batch":
                var submitted = AgentMonitorBulkArguments.items(args);
                return !submitted.isEmpty()
                        && receipt.targets().size() <= submitted.size()
                        && receipt.targets().stream()
                                .allMatch(
                                        target ->
                                                submitted.stream()
                                                        .anyMatch(
                                                                item ->
                                                                        AgentMonitorBulkArguments
                                                                                .targetMatchesItem(
                                                                                        target,
                                                                                        item)));
            case "monitor.create":
                if (receipt.targets().size() != 1) {
                    return false;
                }
                Target t = receipt.targets().getFirst();
                if (!(args.get("name") instanceof String name)
                        || !(args.get("app") instanceof String app)
                        || !Objects.equals(name.trim(), t.fields().get("name"))
                        || !Objects.equals(
                                app.trim().toLowerCase(java.util.Locale.ROOT),
                                t.fields().get("app"))
                        || !"website".equals(t.fields().get("app"))
                        || !t.fields().containsKey("intervals")
                        || !(args.get("params") instanceof Map<?, ?> params)
                        || !AgentMonitorMutationReceipt.WEBSITE_FIELDS.containsAll(params.keySet())
                        || !params.entrySet().stream()
                                .allMatch(
                                        e ->
                                                Objects.equals(
                                                        String.valueOf(e.getValue()),
                                                        t.parameters().get(e.getKey())))
                        || !t.parameters().keySet().containsAll(Set.of("host", "port", "ssl"))) {
                    return false;
                }
                return args.get("intervals") == null
                        || same(args.get("intervals"), t.fields().get("intervals"));
            case "monitor.update":
                return receipt.targets().size() == 1
                        && same(args.get("monitorId"), receipt.targets().getFirst().monitorId())
                        && args.get("updates") instanceof Map<?, ?> updates
                        && !updates.isEmpty()
                        && updates.keySet().equals(receipt.targets().getFirst().fields().keySet())
                        && updates.entrySet().stream()
                                .allMatch(
                                        e ->
                                                same(
                                                        e.getValue(),
                                                        receipt.targets()
                                                                .getFirst()
                                                                .fields()
                                                                .get(e.getKey())));
            case "monitor.pause", "monitor.resume":
                return args.get("monitorIds") instanceof List<?> ids
                        && ids.size() == receipt.targets().size()
                        && ids.stream().distinct().count() == ids.size()
                        && receipt.targets().stream()
                                .allMatch(
                                        target ->
                                                ids.stream()
                                                                .anyMatch(
                                                                        id ->
                                                                                same(
                                                                                        id,
                                                                                        target
                                                                                                .monitorId()))
                                                        && Map.of(
                                                                        "collectionState",
                                                                        receipt.toolName()
                                                                                        .equals(
                                                                                                "monitor.pause")
                                                                                ? "paused"
                                                                                : "enabled")
                                                                .equals(target.fields()));
            default:
                return false;
        }
    }

    static boolean matchesReadback(Target target, Map<String, Object> output) {
        if (!AgentMonitorMutationReceipt.READBACK_VERSION.equals(output.get("readbackVersion"))
                || !same(target.monitorId(), output.get("monitorId"))
                || !target.fields().entrySet().stream()
                        .allMatch(
                                e ->
                                        output.containsKey(e.getKey())
                                                && same(e.getValue(), output.get(e.getKey())))) {
            return false;
        }
        return target.parameters().isEmpty()
                || output.get("parameters") instanceof Map<?, ?> parameters
                        && target.parameters().entrySet().stream()
                                .allMatch(
                                        e ->
                                                Objects.equals(
                                                        e.getValue(), parameters.get(e.getKey())));
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        if (goal == null
                || !goal.valid()
                || !goal.changesResources()
                || !"monitor".equals(goal.resourceType())
                || goal.operation() != operation(tool)) {
            return false;
        }
        if (tool.equals("monitor.create_batch")) {
            return AgentMonitorBulkArguments.permits(goal, args);
        }
        if (tool.equals("monitor.create")) {
            if (!goal.createTargets().isEmpty()) {
                try {
                    return goal.createTargets().stream()
                            .anyMatch(
                                    target ->
                                            same(
                                                    AgentMonitorBatch.createArguments(goal, target),
                                                    args));
                } catch (IllegalArgumentException invalid) {
                    return false;
                }
            }
            return goal.expectedChanges().entrySet().stream()
                    .allMatch(e -> same(e.getValue(), args.get(e.getKey())));
        }
        List<?> ids =
                tool.equals("monitor.update")
                        ? args.get("monitorId") == null ? List.of() : List.of(args.get("monitorId"))
                        : args.get("monitorIds") instanceof List<?> list ? list : List.of();
        return !ids.isEmpty()
                && ids.stream().distinct().count() == ids.size()
                && ids.stream()
                        .allMatch(
                                id ->
                                        goal.resourceIds().stream()
                                                .anyMatch(expected -> same(id, expected)))
                && (!tool.equals("monitor.update")
                        || args.get("updates") instanceof Map<?, ?> updates
                                && updates.keySet().equals(goal.expectedChanges().keySet())
                                && goal.expectedChanges().entrySet().stream()
                                        .allMatch(
                                                e -> same(e.getValue(), updates.get(e.getKey()))));
    }

    static boolean same(Object left, Object right) {
        if (left instanceof Number a && right instanceof Number z) {
            try {
                return new java.math.BigDecimal(a.toString())
                                .compareTo(new java.math.BigDecimal(z.toString()))
                        == 0;
            } catch (NumberFormatException malformed) {
                return false;
            }
        }
        if (left instanceof Map<?, ?> a && right instanceof Map<?, ?> z) {
            return a.keySet().equals(z.keySet())
                    && a.entrySet().stream().allMatch(e -> same(e.getValue(), z.get(e.getKey())));
        }
        if (left instanceof List<?> a && right instanceof List<?> z) {
            if (a.size() != z.size()) {
                return false;
            }
            for (int i = 0; i < a.size(); i++) {
                if (!same(a.get(i), z.get(i))) {
                    return false;
                }
            }
            return true;
        }
        return Objects.equals(left, right);
    }
}
