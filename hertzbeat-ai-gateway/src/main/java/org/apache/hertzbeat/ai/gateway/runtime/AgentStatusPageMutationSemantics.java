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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.status.AgentStatusPageWriteProof;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Exact status-page operations; public publication stays dangerous and individually approved. */
final class AgentStatusPageMutationSemantics {
    private static final Set<String> TOOLS =
            Set.of(
                    "status_page.organization.save",
                    "status_page.component.create",
                    "status_page.component.update",
                    "status_page.component.delete",
                    "status_page.incident.create",
                    "status_page.incident.update",
                    "status_page.incident.delete");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    static boolean resource(String resource) {
        return Set.of("status_page_organization", "status_page_component", "status_page_incident")
                .contains(resource);
    }

    static Set<String> fields(String tool) {
        return switch (AgentStatusPageWriteProof.kind(tool)) {
            case "organization" ->
                    Set.of("name", "description", "home", "logo", "feedback", "color", "state");
            case "component" ->
                    Set.of("orgId", "name", "description", "labels", "method", "configState");
            default -> Set.of("orgId", "name", "state", "componentIds", "message");
        };
    }

    static boolean create(String tool, Map<String, Object> args) {
        return tool.endsWith(".create")
                || tool.contains("organization") && args.get("expectedOrgId") == null;
    }

    static Object target(String tool, Map<String, Object> args) {
        return args.get(
                tool.contains("organization")
                        ? "expectedOrgId"
                        : tool.contains("component") ? "componentId" : "incidentId");
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.valid()
                    || !goal.changesResources()
                    || !Integer.valueOf(1).equals(goal.expectedCount())
                    || !("status_page_" + AgentStatusPageWriteProof.kind(tool))
                            .equals(goal.resourceType())
                    || !fields(tool).containsAll(goal.expectedChanges().keySet())) return false;
            boolean create = create(tool, args);
            boolean delete = tool.endsWith(".delete");
            if (goal.operation()
                            != (create
                                    ? AgentTaskAssessment.Operation.CREATE
                                    : delete
                                            ? AgentTaskAssessment.Operation.DELETE
                                            : AgentTaskAssessment.Operation.UPDATE)
                    || (create
                            ? !goal.resourceIds().isEmpty()
                            : !goal.resourceIds()
                                    .equals(
                                            List.of(
                                                    AgentLabelMutationSemantics.id(
                                                            target(tool, args)))))) return false;
            String id =
                    tool.contains("organization")
                            ? "expectedOrgId"
                            : tool.contains("component") ? "componentId" : "incidentId";
            if (!create
                    && (!(args.get("sourceHash") instanceof String hash)
                            || !hash.matches("[a-f0-9]{64}"))) return false;
            if (delete)
                return args.keySet().equals(Set.of(id, "reason", "sourceHash"))
                        && goal.expectedChanges().isEmpty()
                        && args.get("reason") instanceof String reason
                        && !reason.isBlank();
            if (!(args.get("configuration") instanceof Map<?, ?> config)
                    || !fields(tool).containsAll(config.keySet())
                    || !safe(config)) return false;
            Set<String> allowed =
                    tool.contains("organization")
                            ? Set.of("configuration", "expectedOrgId", "sourceHash")
                            : create
                                    ? Set.of("configuration")
                                    : Set.of(id, "configuration", "sourceHash");
            if (!allowed.containsAll(args.keySet()) || create && args.get("sourceHash") != null)
                return false;
            if (create
                    && (!(config.get("name") instanceof String name)
                            || !name.equals(goal.expectedChanges().get("name")))) return false;
            if (tool.contains("incident") && !goal.expectedChanges().containsKey("message"))
                return false;
            for (var e : goal.expectedChanges().entrySet())
                if (!same(e.getKey(), e.getValue(), effective(config, e.getKey()))) return false;
            return true;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> output, String hash) {
        try {
            Map<String, Object> row;
            if (tool.endsWith(".delete")) row = output;
            else
                row =
                        Boolean.FALSE.equals(output.get("partial"))
                                        && Boolean.TRUE.equals(output.get("redactionApplied"))
                                        && output.get("data") instanceof Map<?, ?> data
                                ? (Map<String, Object>) data
                                : null;
            if (!supports(tool)
                    || row == null
                    || hash == null
                    || !hash.equals(AgentToolPayloadHasher.normalizedArgumentsHash(args))
                    || !(row.get("mutationReceipt") instanceof Map<?, ?> proof)
                    || !"status-page-write.v1".equals(proof.get("version"))
                    || !tool.equals(proof.get("toolName"))
                    || !Boolean.TRUE.equals(proof.get("verified"))
                    || !Boolean.FALSE.equals(proof.get("atomicVersionPrecondition"))
                    || !AgentStatusPageWriteProof.argumentHash(tool, args)
                            .equals(proof.get("boundArgumentsHash"))) return false;
            long id = AgentLabelMutationSemantics.id(proof.get("id"));
            if (!create(tool, args) && id != AgentLabelMutationSemantics.id(target(tool, args)))
                return false;
            if (tool.endsWith(".delete"))
                return Boolean.TRUE.equals(proof.get("absent"))
                        && "absent".equals(proof.get("postReadHash"))
                        && id == AgentLabelMutationSemantics.id(row.get("deletedId"));
            return Boolean.FALSE.equals(proof.get("absent"))
                    && id == AgentLabelMutationSemantics.id(row.get("id"))
                    && row.get("name") instanceof String name
                    && !name.isBlank()
                    && safe(row)
                    && AgentStatusPageWriteProof.contentHash(tool, row)
                            .equals(proof.get("postReadHash"));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static long identity(Map<String, Object> output) {
        Map<?, ?> row = output.get("data") instanceof Map<?, ?> data ? data : output;
        return AgentLabelMutationSemantics.id(((Map<?, ?>) row.get("mutationReceipt")).get("id"));
    }

    static boolean preserves(
            AgentTaskAssessment.Goal goal,
            String tool,
            Map<String, Object> args,
            Map<String, Object> source) {
        try {
            if (!Boolean.FALSE.equals(source.get("partial"))
                    || !Boolean.TRUE.equals(source.get("redactionApplied"))
                    || !(source.get("data") instanceof Map<?, ?> row)
                    || !safe(row)
                    || !args.get("sourceHash").equals(source.get("sourceHash"))
                    || !args.get("sourceHash")
                            .equals(AgentStatusPageWriteProof.sourceHash(tool, row))
                    || AgentLabelMutationSemantics.id(target(tool, args))
                            != AgentLabelMutationSemantics.id(row.get("id"))) return false;
            if (tool.endsWith(".delete")) return true;
            var baseline = AgentStatusPageWriteProof.fields(tool, row);
            var config = (Map<?, ?>) args.get("configuration");
            for (String field : fields(tool)) {
                if (goal.expectedChanges().containsKey(field) || field.equals("message")) continue;
                if (!same(field, effective(config, field), baseline.get(field))) return false;
            }
            return true;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    private static Object effective(Map<?, ?> config, String field) {
        if (config.containsKey(field)) return config.get(field);
        return Set.of("state", "method", "configState").contains(field) ? 0 : null;
    }

    private static boolean same(String field, Object a, Object b) {
        if (Set.of("state", "method", "configState").contains(field))
            return new java.math.BigDecimal(String.valueOf(a)).intValueExact()
                    == new java.math.BigDecimal(String.valueOf(b)).intValueExact();
        if (field.equals("componentIds") && a instanceof List<?> left && b instanceof List<?> right)
            return left.stream()
                    .map(AgentLabelMutationSemantics::id)
                    .sorted()
                    .toList()
                    .equals(right.stream().map(AgentLabelMutationSemantics::id).sorted().toList());
        return AgentToolPayloadHasher.canonicalArgumentsJson(
                        java.util.Collections.singletonMap("v", a))
                .equals(
                        AgentToolPayloadHasher.canonicalArgumentsJson(
                                java.util.Collections.singletonMap("v", b)));
    }

    private static boolean safe(Object value) {
        String json = JsonUtil.toJson(value);
        return json.length() <= 196608
                && !json.contains("[REDACTED]")
                && json.equals(
                        org.apache.hertzbeat.ai.gateway.text.GatewayText.redactSecrets(json));
    }
}
