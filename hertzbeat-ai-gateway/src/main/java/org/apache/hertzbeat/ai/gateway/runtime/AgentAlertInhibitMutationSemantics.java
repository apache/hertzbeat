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

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Exact original grouping policy intent; independent native readback and snapshot preservation. */
final class AgentAlertInhibitMutationSemantics {
    private static final Set<String> FIELDS =
            Set.of("name", "sourceLabels", "targetLabels", "equalLabels", "enable");

    static boolean supports(String tool) {
        return Set.of("alert_inhibit.create", "alert_inhibit.update", "alert_inhibit.delete")
                .contains(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.valid()
                    || !goal.changesResources()
                    || !"alert_inhibit".equals(goal.resourceType())
                    || !Integer.valueOf(1).equals(goal.expectedCount())
                    || !FIELDS.containsAll(goal.expectedChanges().keySet())) return false;
            boolean create = tool.endsWith(".create");
            boolean delete = tool.endsWith(".delete");
            if (goal.operation()
                    != (create
                            ? AgentTaskAssessment.Operation.CREATE
                            : delete
                                    ? AgentTaskAssessment.Operation.DELETE
                                    : AgentTaskAssessment.Operation.UPDATE)) return false;
            if (create
                    ? !goal.resourceIds().isEmpty()
                    : !goal.resourceIds()
                            .equals(List.of(AgentLabelMutationSemantics.id(args.get("inhibitId")))))
                return false;
            if (!create
                    && (!(args.get("sourceHash") instanceof String hash)
                            || !hash.matches("[a-f0-9]{64}"))) return false;
            if (delete)
                return args.keySet().equals(Set.of("inhibitId", "reason", "sourceHash"))
                        && goal.expectedChanges().isEmpty()
                        && args.get("reason") instanceof String reason
                        && !reason.isBlank();
            if (!args.keySet()
                            .equals(
                                    create
                                            ? Set.of("configuration")
                                            : Set.of("inhibitId", "configuration", "sourceHash"))
                    || !(args.get("configuration") instanceof Map<?, ?> config)
                    || !config.keySet().equals(FIELDS)) return false;
            if (create
                    && (!(config.get("name") instanceof String name)
                            || !name.equals(goal.expectedChanges().get("name")))) return false;
            for (var e : goal.expectedChanges().entrySet())
                if (!same(e.getValue(), config.get(e.getKey()))) return false;
            return true;
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return false;
        }
    }

    /** Fixed diagnostic branch only; no user field contents or resource values are logged. */
    static String mismatch(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        if (!supports(tool)) return "TOOL_UNSUPPORTED";
        if (goal == null || !goal.valid()) return "GOAL_INVALID";
        if (!goal.changesResources()) return "GOAL_NOT_CHANGE";
        if (!"alert_inhibit".equals(goal.resourceType())) return "RESOURCE_TYPE_MISMATCH";
        if (!Integer.valueOf(1).equals(goal.expectedCount())) return "EXPECTED_COUNT_MISMATCH";
        if (!FIELDS.containsAll(goal.expectedChanges().keySet()))
            return "EXPECTED_CHANGE_FIELDS_UNSUPPORTED";
        boolean create = tool.endsWith(".create");
        boolean delete = tool.endsWith(".delete");
        var expected =
                create
                        ? AgentTaskAssessment.Operation.CREATE
                        : delete
                                ? AgentTaskAssessment.Operation.DELETE
                                : AgentTaskAssessment.Operation.UPDATE;
        if (goal.operation() != expected) return "OPERATION_MISMATCH";
        try {
            if (create && !goal.resourceIds().isEmpty()) return "CREATE_IDS_MUST_BE_EMPTY";
            if (!create
                    && !goal.resourceIds()
                            .equals(List.of(AgentLabelMutationSemantics.id(args.get("inhibitId")))))
                return "EXACT_ID_MISMATCH";
            if (!create
                    && (!(args.get("sourceHash") instanceof String hash)
                            || !hash.matches("[a-f0-9]{64}"))) return "SOURCE_HASH_REQUIRED";
            if (!args.keySet()
                    .equals(
                            create
                                    ? Set.of("configuration")
                                    : delete
                                            ? Set.of("inhibitId", "reason", "sourceHash")
                                            : Set.of("inhibitId", "configuration", "sourceHash")))
                return "ARGUMENT_KEYS_MISMATCH";
            if (delete)
                return permits(goal, tool, args)
                        ? null
                        : "DELETE_REASON_OR_ORIGINAL_FIELDS_INVALID";
            if (!(args.get("configuration") instanceof Map<?, ?> config))
                return "CONFIGURATION_OBJECT_REQUIRED";
            if (!config.keySet().equals(FIELDS)) return "CONFIGURATION_KEYS_MISMATCH";
            if (create && !goal.expectedChanges().containsKey("name"))
                return "CREATE_ORIGINAL_NAME_REQUIRED";
            if (create
                    && (!(config.get("name") instanceof String name)
                            || !name.equals(goal.expectedChanges().get("name"))))
                return "CREATE_NAME_MISMATCH";
            for (String field : FIELDS)
                if (goal.expectedChanges().containsKey(field)
                        && !same(goal.expectedChanges().get(field), config.get(field)))
                    return "FIELD_MISMATCH_" + field.toUpperCase(java.util.Locale.ROOT);
            return permits(goal, tool, args) ? null : "EXACT_BINDING_MISMATCH";
        } catch (RuntimeException invalid) {
            return "ARGUMENT_TYPE_INVALID";
        }
    }

    /** Fixed field names, presence and type only; deliberately excludes all field values. */
    static Map<String, Object> mismatchStructure(
            AgentTaskAssessment.Goal goal, Map<String, Object> args) {
        Map<?, ?> config = args.get("configuration") instanceof Map<?, ?> value ? value : Map.of();
        var fields = new java.util.LinkedHashMap<String, Object>();
        for (String key : FIELDS.stream().sorted().toList()) {
            Object expected = goal.expectedChanges().get(key);
            Object actual = config.get(key);
            fields.put(
                    key,
                    Map.of(
                            "expectedPresent",
                            goal.expectedChanges().containsKey(key),
                            "actualPresent",
                            config.containsKey(key),
                            "expectedType",
                            valueType(expected),
                            "actualType",
                            valueType(actual),
                            "matches",
                            same(expected, actual)));
        }
        return Map.of(
                "fields",
                fields,
                "expectedUnknownFieldCount",
                goal.expectedChanges().keySet().stream()
                        .filter(key -> !FIELDS.contains(key))
                        .count(),
                "configurationUnknownFieldCount",
                config.keySet().stream().filter(key -> !FIELDS.contains(key)).count());
    }

    private static String valueType(Object value) {
        if (value == null) return "NULL";
        if (value instanceof Boolean) return "BOOLEAN";
        if (value instanceof String) return "STRING";
        if (value instanceof Map) return "MAP";
        if (value instanceof List) return "LIST";
        if (value instanceof Number) return "NUMBER";
        return "OTHER";
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> output, String hash) {
        try {
            boolean delete = tool.endsWith(".delete");
            Map<String, Object> row =
                    delete
                            ? output
                            : Boolean.FALSE.equals(output.get("partial"))
                                            && Boolean.TRUE.equals(output.get("redactionApplied"))
                                            && output.get("data") instanceof Map<?, ?> data
                                    ? (Map<String, Object>) data
                                    : null;
            if (!supports(tool)
                    || row == null
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(args).equals(hash)
                    || !(row.get("mutationReceipt") instanceof Map<?, ?> proof)
                    || !"alert-inhibit-write.v1".equals(proof.get("version"))
                    || !tool.equals(proof.get("toolName"))
                    || !Boolean.TRUE.equals(proof.get("verified"))
                    || !Boolean.FALSE.equals(proof.get("atomicVersionPrecondition"))
                    || !AgentAlertRuleWriteProof.argumentHash(args)
                            .equals(proof.get("boundArgumentsHash"))) return false;
            long id = AgentLabelMutationSemantics.id(proof.get("id"));
            if (!tool.endsWith(".create")
                    && id != AgentLabelMutationSemantics.id(args.get("inhibitId"))) return false;
            if (delete)
                return Boolean.TRUE.equals(proof.get("absent"))
                        && "absent".equals(proof.get("postReadHash"))
                        && id == AgentLabelMutationSemantics.id(row.get("deletedId"));
            return Boolean.FALSE.equals(proof.get("absent"))
                    && id == AgentLabelMutationSemantics.id(row.get("id"))
                    && AgentAlertInhibitWriteProof.contentHash(row)
                            .equals(proof.get("postReadHash"))
                    && AgentAlertInhibitWriteProof.contentHash(args.get("configuration"))
                            .equals(proof.get("postReadHash"));
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
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
                    || !args.get("sourceHash").equals(source.get("sourceHash"))
                    || !args.get("sourceHash").equals(AgentAlertInhibitWriteProof.sourceHash(row))
                    || AgentLabelMutationSemantics.id(row.get("id"))
                            != AgentLabelMutationSemantics.id(args.get("inhibitId"))) return false;
            if (tool.endsWith(".delete")) return true;
            var config = (Map<?, ?>) args.get("configuration");
            for (String field : FIELDS)
                if (!goal.expectedChanges().containsKey(field)
                        && !same(row.get(field), config.get(field))) return false;
            return true;
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return false;
        }
    }

    private static boolean same(Object a, Object b) {
        return AgentToolPayloadHasher.normalizedArgumentsHash(Collections.singletonMap("v", a))
                .equals(
                        AgentToolPayloadHasher.normalizedArgumentsHash(
                                Collections.singletonMap("v", b)));
    }
}
