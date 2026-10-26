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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Read-only claim status is valid evidence, but is never a new write or global health assertion.
 */
final class AgentMonitorBulkReadSemantics {
    static boolean supports(String tool) {
        return "monitor.batch_status".equals(tool) || "monitor.batch_plan".equals(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        if ("monitor.batch_plan".equals(call.getToolName())) {
            return classifyPlan(call, data);
        }
        var submitted = AgentMonitorBulkArguments.items(call.getArguments());
        if (submitted.isEmpty()
                || !"monitor-bulk.v1".equals(data.get("batchVersion"))
                || !(data.get("batch") instanceof Map<?, ?> batch)
                || !AgentMonitorMutationSemantics.same(1, batch.get("schemaVersion"))
                || !(batch.get("items") instanceof List<?> results)
                || results.size() != submitted.size()
                || !(data.get("mutation") instanceof Map<?, ?> mutation)
                || !"monitor-mutation.v1".equals(mutation.get("version"))
                || !"monitor.create_batch".equals(mutation.get("toolName"))
                || !AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments())
                        .equals(mutation.get("inputHash"))) {
            return null;
        }
        var receipt =
                AgentMonitorMutationSemantics.parse(
                        "monitor.create_batch",
                        data,
                        AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()));
        var seen = new java.util.HashSet<Object>();
        var counts = new HashMap<String, Integer>();
        for (Object value : results) {
            if (!(value instanceof Map<?, ?> row) || !seen.add(row.get("idempotencyKey"))) {
                return null;
            }
            var input =
                    submitted.stream()
                            .filter(
                                    i ->
                                            Objects.equals(
                                                    i.get("idempotencyKey"),
                                                    row.get("idempotencyKey")))
                            .findFirst()
                            .orElse(null);
            if (input == null || !(row.get("state") instanceof String state)) {
                return null;
            }
            String counter =
                    Map.ofEntries(
                                    Map.entry("VERIFIED", "verified"),
                                    Map.entry("PROBE_FAILED", "failed"),
                                    Map.entry("INVALID", "failed"),
                                    Map.entry("CONFLICT", "failed"),
                                    Map.entry("NOT_STARTED", "pending"),
                                    Map.entry("IN_PROGRESS", "pending"),
                                    Map.entry("UNKNOWN", "unknown"),
                                    Map.entry("CREATED", "unknown"),
                                    Map.entry("WRITING", "unknown"),
                                    Map.entry("CLAIMED", "unknown"))
                            .get(state);
            if (counter == null) {
                return null;
            }
            counts.merge(counter, 1, Integer::sum);
            if ("VERIFIED".equals(state)) {
                Long id = AgentMonitorBulkArguments.monitorId(row.get("monitorId"));
                var target =
                        receipt == null || id == null
                                ? null
                                : receipt.targets().stream()
                                        .filter(t -> id.equals(t.monitorId()))
                                        .findFirst()
                                        .orElse(null);
                if (target == null
                        || !AgentMonitorBulkArguments.targetMatchesItem(target, input)
                        || !AgentMonitorMutationSemantics.same(target.fields(), row.get("fields"))
                        || !AgentMonitorMutationSemantics.same(
                                target.parameters(), row.get("parameters"))) {
                    return null;
                }
            }
        }
        for (String counter : List.of("verified", "failed", "pending", "unknown")) {
            if (!AgentMonitorMutationSemantics.same(
                    counts.getOrDefault(counter, 0), batch.get(counter))) {
                return null;
            }
        }
        return new AgentReadObservationClassifier.Observation(
                "website-batch-status-items", results.size());
    }

    private AgentReadObservationClassifier.Observation classifyPlan(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        var args = call.getArguments();
        if (!java.util.Set.of("runUid", "offset", "limit").containsAll(args.keySet())
                || !"monitor-batch-plan.v1".equals(data.get("planVersion"))
                || !Boolean.TRUE.equals(data.get("readOnly"))
                || !AgentToolPayloadHasher.normalizedArgumentsHash(args)
                        .equals(data.get("inputHash"))
                || !(data.get("rootRunUid") instanceof String root)
                || !root.matches("[A-Za-z0-9_.:-]{1,128}")
                || !(data.get("selectedRunUid") instanceof String selected)
                || !selected.matches("[A-Za-z0-9_.:-]{1,128}")
                || args.get("runUid") != null && !args.get("runUid").equals(selected)
                || !(data.get("planHash") instanceof String hash)
                || !hash.matches("[a-f0-9]{64}")
                || !(data.get("items") instanceof List<?> items)) {
            return null;
        }
        try {
            int offset = integer(args.getOrDefault("offset", 0));
            int limit = integer(args.getOrDefault("limit", 10));
            int total = integer(data.get("total"));
            int expected = integer(data.get("expectedCount"));
            if (offset < 0
                    || offset > 50
                    || limit < 1
                    || limit > 20
                    || total < 1
                    || total > 50
                    || expected != total
                    || !AgentMonitorMutationSemantics.same(offset, data.get("offset"))
                    || !AgentMonitorMutationSemantics.same(limit, data.get("limit"))
                    || items.size() != Math.min(limit, Math.max(0, total - offset))
                    || !Objects.equals(offset + items.size() < total, data.get("hasMore"))) {
                return null;
            }
            if (!items.isEmpty()) {
                var parsed = AgentMonitorBulkArguments.items(Map.of("items", items));
                if (parsed.size() != items.size()) {
                    return null;
                }
                var targets = new java.util.ArrayList<AgentTaskAssessment.CreateTarget>();
                for (var item : parsed) {
                    targets.add(
                            new AgentTaskAssessment.CreateTarget(
                                    (String) item.get("name"),
                                    (String) item.get("url"),
                                    integer(item.get("intervals")),
                                    (String) item.get("idempotencyKey"),
                                    item.containsKey("timeout")
                                            ? integer(item.get("timeout"))
                                            : null));
                }
                var goal =
                        new AgentTaskAssessment.Goal(
                                AgentTaskAssessment.Type.CHANGE,
                                AgentTaskAssessment.Operation.CREATE,
                                "monitor",
                                targets.size(),
                                List.of(),
                                Map.of(),
                                targets);
                if (!AgentMonitorBulkArguments.permits(goal, Map.of("items", items))) {
                    return null;
                }
            }
            return new AgentReadObservationClassifier.Observation(
                    "website-batch-frozen-plan-items", items.size());
        } catch (RuntimeException invalid) {
            return null;
        }
    }

    private static int integer(Object value) {
        return new java.math.BigDecimal(String.valueOf(value)).intValueExact();
    }
}
