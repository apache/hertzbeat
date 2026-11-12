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

import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.list;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.management;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.number;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.object;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.observation;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.require;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.same;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.text;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.entity.AgentEntityReadScope;

import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Exact accessible entity pages and suggestions; not graph writes, health, or history completeness.
 */
final class AgentEntityEvidenceReadSemantics {
    static boolean supports(String tool) {
        return Set.of(
                        "entity.editable",
                        "entity.alerts",
                        "entity.monitors",
                        "entity.binding_candidates")
                .contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> output) {
        try {
            var data = object(management(output));
            var args = call.getArguments();
            String tool = call.getToolName();
            if (tool.equals("entity.binding_candidates")) return candidates(args, data);
            long id = number(args.get("entityId"));
            require(id > 0);
            if (tool.equals("entity.editable")) {
                same(id, number(data.get("entityId")));
                var metadata = object(data.get("metadata"));
                text(metadata.get("name"));
                text(metadata.get("type"));
                require(
                        Set.of(
                                        "type",
                                        "name",
                                        "displayName",
                                        "namespace",
                                        "environment",
                                        "owner",
                                        "lifecycle",
                                        "tier",
                                        "system",
                                        "description")
                                .containsAll(metadata.keySet()));
                for (Object value : metadata.values())
                    require(value == null || value instanceof String);
                return observation("entity-editable-metadata", 1);
            }
            var scope = AgentEntityReadScope.scope(tool, args);
            same(
                    AgentToolPayloadHasher.normalizedArgumentsHash(scope),
                    AgentToolPayloadHasher.normalizedArgumentsHash(object(output.get("scope"))));
            long page = number(scope.get("pageIndex"));
            long size = number(scope.get("pageSize"));
            same(page, number(data.get("pageIndex")));
            same(size, number(data.get("pageSize")));
            long total = number(data.get("totalElements"));
            require(total <= Integer.MAX_VALUE);
            same(total == 0 ? 0 : (total + size - 1) / size, number(data.get("totalPages")));
            var rows = list(data.get("content"));
            require(rows.size() == Math.min(size, Math.max(0, total - page * size)));
            var seen = new HashSet<Long>();
            for (Object value : rows) {
                var row = object(value);
                long rowId = number(row.get("id"));
                require(rowId > 0 && seen.add(rowId));
                if (tool.equals("entity.monitors")) {
                    text(row.get("name"));
                    String app = text(row.get("app"));
                    long status = number(row.get("status"));
                    require(status <= 4);
                    if (scope.get("status") != null) same(number(scope.get("status")), status);
                    if (scope.get("app") != null)
                        same(scope.get("app"), app.toLowerCase(Locale.ROOT));
                } else {
                    same(scope.get("status"), row.get("status"));
                    require(row.containsKey("labels") && row.containsKey("fingerprint"));
                    if (scope.get("severity") != null) same(scope.get("severity"), severity(row));
                }
            }
            return observation(
                    tool.equals("entity.alerts")
                            ? "entity-current-alert-page-only"
                            : "entity-bound-monitor-page-only",
                    rows.size());
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return null;
        }
    }

    private String severity(Map<String, Object> row) {
        var labels = row.get("labels") instanceof Map<?, ?> m ? m : Map.of();
        var annotations = row.get("annotations") instanceof Map<?, ?> m ? m : Map.of();
        for (Object value :
                java.util.Arrays.asList(
                        labels.get("severity"),
                        labels.get("priority"),
                        annotations.get("severity")))
            if (value instanceof String s && !s.isBlank()) return s.trim().toLowerCase(Locale.ROOT);
        return "unknown";
    }

    private AgentReadObservationClassifier.Observation candidates(
            Map<String, Object> args, Map<String, Object> data) {
        var ids = list(args.get("monitorIds"));
        require(!ids.isEmpty() && ids.size() <= 50);
        var requested = new java.util.ArrayList<Long>();
        var seen = new HashSet<Long>();
        for (Object value : ids) {
            long id = number(value);
            require(id > 0 && seen.add(id));
            requested.add(id);
        }
        same(
                requested,
                list(data.get("monitorIds")).stream()
                        .map(AgentNativeReadContract::number)
                        .toList());
        var rows = object(data.get("candidates"));
        same(
                seen.stream().map(Object::toString).collect(java.util.stream.Collectors.toSet()),
                rows.keySet());
        int count = 0;
        for (Object value : rows.values()) {
            var candidates = list(value);
            require(candidates.size() <= 100);
            var unique = new HashSet<Long>();
            for (Object item : candidates) {
                var candidate = object(item);
                require(
                        candidate
                                .keySet()
                                .equals(
                                        Set.of(
                                                "entityId",
                                                "entityName",
                                                "entityType",
                                                "score",
                                                "alreadyBound",
                                                "matchedKeys")));
                long id = number(candidate.get("entityId"));
                require(id > 0 && unique.add(id));
                text(candidate.get("entityName"));
                text(candidate.get("entityType"));
                require(candidate.get("alreadyBound") instanceof Boolean);
                if (candidate.get("score") != null) number(candidate.get("score"));
                var keys = list(candidate.get("matchedKeys"));
                var names = new HashSet<String>();
                for (Object key : keys) require(names.add(text(key)));
                count++;
            }
        }
        return observation("entity-binding-suggestions-not-applied", count);
    }
}
