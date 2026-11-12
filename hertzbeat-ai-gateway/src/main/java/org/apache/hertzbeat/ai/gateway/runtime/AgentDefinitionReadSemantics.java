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

/** Definition metadata proves identity/revision only, never a write or runtime health. */
final class AgentDefinitionReadSemantics {
    static boolean supports(String tool) {
        return "monitor.definition_get".equals(tool)
                || "monitor.definition_catalog".equals(tool)
                || "monitor.definition_source".equals(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        if ("monitor.definition_source".equals(call.getToolName())) {
            return source(call, data);
        }
        if ("monitor.definition_get".equals(call.getToolName())) {
            return data.get("app") instanceof String app
                            && call.getArguments().get("app") instanceof String requested
                            && app.equalsIgnoreCase(requested)
                            && metadata(data)
                    ? new AgentReadObservationClassifier.Observation(
                            "monitor-definition-metadata", 1)
                    : null;
        }
        try {
            var args = call.getArguments();
            int offset = integer(args.getOrDefault("offset", 0));
            int limit = integer(args.getOrDefault("limit", 20));
            int total = integer(data.get("total"));
            if (offset < 0
                    || offset > 10000
                    || limit < 1
                    || limit > 100
                    || total < 0
                    || total > 10000
                    || integer(data.get("schemaVersion")) != 1
                    || integer(data.get("offset")) != offset
                    || integer(data.get("limit")) != limit
                    || !(data.get("items") instanceof List<?> rows)
                    || rows.size() != Math.min(limit, Math.max(0, total - offset))
                    || !java.util.Objects.equals(
                            offset + rows.size() < total, data.get("hasMore"))) {
                return null;
            }
            var apps = new java.util.HashSet<Object>();
            for (Object row : rows) {
                if (!(row instanceof Map<?, ?> value)
                        || !metadata(value)
                        || !apps.add(value.get("app"))) {
                    return null;
                }
            }
            return new AgentReadObservationClassifier.Observation(
                    "monitor-definition-catalog-items", rows.size());
        } catch (RuntimeException invalid) {
            return null;
        }
    }

    private AgentReadObservationClassifier.Observation source(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        if (!Boolean.TRUE.equals(data.get("available"))
                || !(data.get("definition") instanceof String definition)
                || !(data.get("app") instanceof String app)
                || !(call.getArguments().get("app") instanceof String requested)
                || !app.equalsIgnoreCase(requested)) return null;
        var metadata = new java.util.LinkedHashMap<>(data);
        metadata.remove("definition");
        if (!metadata(metadata)) return null;
        try {
            var draft =
                    org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorDefinitionDraft
                            .inspect(definition);
            return app.equals(draft.app())
                            && draft.definitionHash().equals(data.get("definitionHash"))
                    ? new AgentReadObservationClassifier.Observation(
                            "non-secret-monitor-definition-source", 1)
                    : null;
        } catch (IllegalArgumentException invalid) {
            return null;
        }
    }

    private boolean metadata(Map<?, ?> row) {
        return row.get("app") instanceof String app
                && app.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,127}")
                && row.get("revision") instanceof String revision
                && revision.matches("[a-f0-9]{64}")
                && row.get("origin") instanceof String origin
                && Set.of("builtin", "custom", "override").contains(origin)
                && row.get("editable") instanceof Boolean
                && row.get("deletable") instanceof Boolean
                && row.get("hidden") instanceof Boolean
                && (!"builtin".equals(origin) || Boolean.FALSE.equals(row.get("deletable")))
                && !row.containsKey("definition");
    }

    private int integer(Object value) {
        return new java.math.BigDecimal(String.valueOf(value)).intValueExact();
    }
}
