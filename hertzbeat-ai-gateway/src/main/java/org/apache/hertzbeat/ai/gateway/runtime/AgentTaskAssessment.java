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

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import java.util.List;

/** Structured semantic assessment; it grants neither tool authority nor execution evidence. */
public record AgentTaskAssessment(
        Goal goal, AgentTaskOutcome.Stage stage, Boolean answerSupported, List<Claim> claims) {
    /** Original request category, never inferred from the last tool. */
    public enum Type {
        GENERAL,
        OBSERVATION,
        CHANGE,
        MIXED,
        UNKNOWN
    }

    /** Requested business operation. */
    public enum Operation {
        EXPLAIN,
        QUERY,
        CREATE,
        UPDATE,
        DELETE,
        EXECUTE,
        PAUSE,
        RESUME,
        UNKNOWN
    }

    /** Immutable semantic goal carried across corrective planning. */
    public record Goal(
            Type type,
            Operation operation,
            @JsonPropertyDescription(
                            "Business resource kind. Use monitor for website creation; website is"
                                    + " an app type, not a resource kind.")
                    String resourceType,
            @JsonProperty(required = false)
                    @JsonPropertyDescription(
                            "Positive original requested count, required for CHANGE or MIXED. Never"
                                + " substitute returned/completed rows. May be omitted for ordinary"
                                + " questions.")
                    Integer expectedCount,
            @JsonProperty(required = false)
                    @JsonPropertyDescription(
                            "Only exact user-supplied resource ids for UPDATE, PAUSE, RESUME or EXECUTE."
                                    + " CREATE needs no existing ids. Omitted means an empty list,"
                                    + " never invent ids.")
                    List<Long> resourceIds,
            @JsonProperty(required = false)
                    @JsonPropertyDescription(
                            "Requested native metadata changes. UPDATE requires at least one field."
                                    + " Omitted means an empty map; never include credentials.")
                    java.util.Map<String, Object> expectedChanges,
            @JsonProperty(required = false)
                    @JsonPropertyDescription(
                            "For CREATE monitor: empty when unresolved, otherwise a COMPLETE list"
                                + " of exactly expectedCount targets, at most 50. Never return a"
                                + " partial sample. Omitted means an empty list.")
                    List<CreateTarget> createTargets) {
        public Goal(Type type, Operation operation, String resourceType, Integer expectedCount) {
            this(
                    type,
                    operation,
                    resourceType,
                    expectedCount,
                    List.of(),
                    java.util.Map.of(),
                    List.of());
        }

        public Goal(
                Type type,
                Operation operation,
                String resourceType,
                Integer expectedCount,
                List<Long> resourceIds,
                java.util.Map<String, Object> expectedChanges) {
            this(
                    type,
                    operation,
                    resourceType,
                    expectedCount,
                    resourceIds,
                    expectedChanges,
                    List.of());
        }

        public Goal {
            createTargets = createTargets == null ? List.of() : List.copyOf(createTargets);
            resourceIds = resourceIds == null ? List.of() : List.copyOf(resourceIds);
            expectedChanges =
                    expectedChanges == null
                            ? java.util.Map.of()
                            : java.util.Map.copyOf(expectedChanges);
        }

        boolean valid() {
            return validationFailure() == null;
        }

        GoalValidationRule validationFailure() {
            if (type == null || type == Type.UNKNOWN) return GoalValidationRule.TYPE_REQUIRED;
            if (operation == null || operation == Operation.UNKNOWN)
                return GoalValidationRule.OPERATION_REQUIRED;
            if (type == Type.GENERAL
                    ? operation != Operation.EXPLAIN
                    : type == Type.OBSERVATION
                            ? operation != Operation.QUERY
                            : operation == Operation.EXPLAIN || operation == Operation.QUERY) {
                return GoalValidationRule.TYPE_OPERATION_MISMATCH;
            }
            if (resourceType == null || resourceType.isBlank())
                return GoalValidationRule.RESOURCE_TYPE_REQUIRED;
            if (resourceType.length() > 80) return GoalValidationRule.RESOURCE_TYPE_TOO_LONG;
            if (expectedCount != null && expectedCount <= 0)
                return GoalValidationRule.EXPECTED_COUNT_POSITIVE;
            if (changesResources() && expectedCount == null)
                return GoalValidationRule.EXPECTED_COUNT_REQUIRED;
            if (createTargets.size() > 50) return GoalValidationRule.CREATE_TARGET_LIMIT;
            if (!createTargets.isEmpty()) {
                if (operation != Operation.CREATE)
                    return GoalValidationRule.CREATE_TARGET_OPERATION;
                if (!"monitor".equals(resourceType))
                    return GoalValidationRule.CREATE_TARGET_RESOURCE;
                if (createTargets.size() != expectedCount)
                    return GoalValidationRule.CREATE_TARGET_COUNT;
            }
            if ("monitor_definition".equals(resourceType) && changesResources()) {
                if (!Integer.valueOf(1).equals(expectedCount)
                        || !resourceIds.isEmpty()
                        || !(expectedChanges.get("app") instanceof String app)
                        || !app.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,127}")
                        || !java.util.Set.of("app", "revision", "definitionHash")
                                .containsAll(expectedChanges.keySet())
                        || operation != Operation.CREATE && operation != Operation.UPDATE
                        || operation == Operation.UPDATE
                                && expectedChanges.containsKey("revision")
                                && (!(expectedChanges.get("revision") instanceof String revision)
                                        || !revision.matches("[a-f0-9]{64}"))) {
                    return GoalValidationRule.EXPECTED_CHANGES_REQUIRED;
                }
            }
            if ("grafana_dashboard".equals(resourceType)
                    && changesResources()
                    && (!Integer.valueOf(1).equals(expectedCount)
                            || resourceIds.size() != 1
                            || !java.util.Set.of(
                                            Operation.CREATE, Operation.UPDATE, Operation.DELETE)
                                    .contains(operation)
                            || !AgentGrafanaMutationSemantics.goalFields()
                                    .containsAll(expectedChanges.keySet())
                            || !org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft
                                    .safeExpectation(expectedChanges)))
                return GoalValidationRule.EXPECTED_CHANGES_REQUIRED;
            if (changesResources()
                    && AgentSharedAssetMutationSemantics.resource(resourceType)
                    && !AgentSharedAssetMutationSemantics.validGoal(this))
                return GoalValidationRule.EXPECTED_CHANGES_REQUIRED;
            if (changesResources() && AgentPersonalWorkspaceMutationSemantics.resource(resourceType)
                    && !AgentPersonalWorkspaceMutationSemantics.validGoal(this)) return GoalValidationRule.EXPECTED_CHANGES_REQUIRED;
            if (resourceIds.size() > 100) return GoalValidationRule.RESOURCE_ID_LIMIT;
            if (resourceIds.stream().anyMatch(id -> id == null || id <= 0))
                return GoalValidationRule.RESOURCE_ID_POSITIVE;
            if (resourceIds.stream().distinct().count() != resourceIds.size())
                return GoalValidationRule.RESOURCE_ID_DUPLICATE;
            if (changesResources()
                    && (operation == Operation.UPDATE
                            || operation == Operation.PAUSE
                            || operation == Operation.RESUME)
                    && !"monitor_definition".equals(resourceType)
                    && !AgentSharedAssetMutationSemantics.resource(resourceType)
                    && !AgentPersonalWorkspaceMutationSemantics.namedResource(resourceType)
                    && resourceIds.size() != expectedCount)
                return GoalValidationRule.RESOURCE_ID_COUNT;
            if (operation == Operation.UPDATE && expectedChanges.isEmpty())
                return GoalValidationRule.EXPECTED_CHANGES_REQUIRED;
            return null;
        }

        java.util.Map<String, Object> structure() {
            return java.util.Map.of(
                    "typePresent",
                    type != null,
                    "operationPresent",
                    operation != null,
                    "resourceTypePresent",
                    resourceType != null && !resourceType.isBlank(),
                    "expectedCountPresent",
                    expectedCount != null,
                    "resourceIdCount",
                    resourceIds.size(),
                    "expectedChangeFieldCount",
                    expectedChanges.size(),
                    "createTargetCount",
                    createTargets.size());
        }

        boolean changesResources() {
            return type == Type.CHANGE || type == Type.MIXED;
        }
    }

    /** Fixed validator branches; never constructed from untrusted model text. */
    enum GoalValidationRule {
        TYPE_REQUIRED("type"),
        OPERATION_REQUIRED("operation"),
        TYPE_OPERATION_MISMATCH("type/operation"),
        RESOURCE_TYPE_REQUIRED("resourceType"),
        RESOURCE_TYPE_TOO_LONG("resourceType"),
        EXPECTED_COUNT_POSITIVE("expectedCount"),
        EXPECTED_COUNT_REQUIRED("expectedCount"),
        CREATE_TARGET_LIMIT("createTargets"),
        CREATE_TARGET_OPERATION("createTargets/operation"),
        CREATE_TARGET_RESOURCE("createTargets/resourceType"),
        CREATE_TARGET_COUNT("createTargets/expectedCount"),
        RESOURCE_ID_LIMIT("resourceIds"),
        RESOURCE_ID_POSITIVE("resourceIds"),
        RESOURCE_ID_DUPLICATE("resourceIds"),
        RESOURCE_ID_COUNT("resourceIds/expectedCount"),
        EXPECTED_CHANGES_REQUIRED("expectedChanges");

        private final String field;

        GoalValidationRule(String field) {
            this.field = field;
        }

        String field() {
            return field;
        }
    }

    /** Non-secret website target planned once from the original request. */
    public record CreateTarget(
            String name,
            String url,
            Integer intervals,
            @JsonProperty(required = false)
                    @JsonPropertyDescription(
                            "Preserve an explicitly supplied idempotency key exactly; omit only if"
                                    + " the user supplied none.")
                    String idempotencyKey,
            @JsonProperty(required = false)
                    @JsonPropertyDescription(
                            "Explicit per-target HTTP timeout in milliseconds; omit if not"
                                    + " specified.")
                    Integer timeout) {
        public CreateTarget(String name, String url, Integer intervals) {
            this(name, url, intervals, null, null);
        }
    }

    /** Exact reference to a server-owned quantitative fact. */
    public record Claim(String factId, String value) {}

    boolean valid() {
        return goal != null
                && goal.valid()
                && stage != null
                && stage != AgentTaskOutcome.Stage.UNKNOWN
                && answerSupported != null
                && claims != null
                && claims.size() <= 128
                && claims.stream()
                        .allMatch(c -> c != null && c.factId() != null && c.value() != null);
    }
}
