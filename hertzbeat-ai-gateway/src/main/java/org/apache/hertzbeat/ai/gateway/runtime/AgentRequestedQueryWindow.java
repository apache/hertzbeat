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

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import java.util.ResourceBundle;
import java.util.regex.Pattern;

/** Immutable, durable-run-anchored query constraint for explicit recent-window requests. */
public record AgentRequestedQueryWindow(long start, long end) {
    private static final Pattern RECENT = Pattern.compile(ResourceBundle.getBundle(
            "agent_evidence", Locale.ROOT).getString("request.last15"), Pattern.CASE_INSENSITIVE);

    public AgentRequestedQueryWindow {
        if (start < 0 || end <= start) {
            throw new IllegalArgumentException("Query window must have ordered nonnegative bounds");
        }
    }

    public static AgentRequestedQueryWindow from(String message, Long anchor) {
        if (message == null || !RECENT.matcher(message).find()) {
            return null;
        }
        if (anchor == null || anchor < 900000L) {
            throw new IllegalArgumentException("Explicit recent window requires a durable run creation timestamp");
        }
        return new AgentRequestedQueryWindow(anchor - 900000L, anchor);
    }

    /** Bind only omitted bounds of a schema-declared time query. Explicit selections are never rewritten. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> inherit(String tool, Map<String, Object> arguments, String inputSchema) {
        if (!temporal(tool)) {
            return arguments;
        }
        Map<String, Object> schema = JsonUtil.fromJson(inputSchema, Map.class);
        Map<String, Object> querySchema = querySchema(schema);
        if (querySchema == null) {
            return arguments;
        }
        boolean nested = querySchema != schema;
        if (nested && (!(arguments.get("q") instanceof Map<?, ?>)
                || arguments.containsKey("start") || arguments.containsKey("end"))
                || !nested && arguments.containsKey("q")) {
            return arguments;
        }
        Map<String, Object> query = nested ? (Map<String, Object>) arguments.get("q") : arguments;
        if (query.get("start") != null || query.get("end") != null || query.get("history") != null
                || query.get("querySet") != null || query.get("source") != null) {
            return arguments;
        }
        Map<String, Object> effective = new LinkedHashMap<>(query);
        effective.put("start", start);
        effective.put("end", end);
        if (!nested) {
            return Collections.unmodifiableMap(effective);
        }
        Map<String, Object> outer = new LinkedHashMap<>(arguments);
        outer.put("q", Collections.unmodifiableMap(effective));
        return Collections.unmodifiableMap(outer);
    }

    /** Model schemas reference the run-owned window instead of inviting stale-history timestamp copying. */
    @SuppressWarnings("unchecked")
    public AgentToolDescriptor modelDescriptor(AgentToolDescriptor descriptor) {
        if (descriptor.getRisk() != AgentToolRisk.READ || !temporal(descriptor.getName())) {
            return descriptor;
        }
        Map<String, Object> schema = JsonUtil.fromJson(descriptor.getInputSchema(), Map.class);
        Map<String, Object> query = querySchema(schema);
        if (query == null) {
            return descriptor;
        }
        Map<String, Object> properties = (Map<String, Object>) query.get("properties");
        properties.remove("start");
        properties.remove("end");
        if (query.get("required") instanceof List<?> required) {
            query.put("required", required.stream().filter(key -> !"start".equals(key) && !"end".equals(key)).toList());
        }
        query.put("additionalProperties", false);
        query.put("description", "Server-bound run window: " + JsonUtil.toJson(Map.of("start", start, "end", end,
                "mode", "SERVER_RUN_WINDOW")) + ". Omitted start/end inherit this exact window; explicit conflicts are rejected.");
        return AgentToolDescriptor.builder().name(descriptor.getName()).namespace(descriptor.getNamespace())
                .risk(descriptor.getRisk()).access(descriptor.getAccess()).exposure(descriptor.getExposure())
                .description(descriptor.getDescription() + " Query window is supplied by the server for this run; omit time bounds.")
                .inputSchema(JsonUtil.toJson(schema)).build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> querySchema(Map<String, Object> schema) {
        if (schema == null || !(schema.get("properties") instanceof Map<?, ?> properties)) {
            return null;
        }
        if (properties.containsKey("start") && properties.containsKey("end")) {
            return schema;
        }
        if (properties.get("q") instanceof Map<?, ?> query && query.get("properties") instanceof Map<?, ?> nested
                && nested.containsKey("start") && nested.containsKey("end")) {
            return (Map<String, Object>) query;
        }
        return null;
    }

    private boolean temporal(String tool) {
        return tool.startsWith("logs.") && !tool.equals("logs.live.validate")
                || tool.startsWith("traces.") || tool.startsWith("metrics.")
                    && !java.util.Set.of("metrics.realtime", "metrics.related", "metrics.warehouse_status").contains(tool)
                || tool.equals("topology.query") || tool.equals("telemetry.intake_red_summary");
    }

    public String denial(String tool, Map<String, Object> arguments) {
        if (!temporal(tool)) {
            return null;
        }
        Map<?, ?> query = arguments;
        if (arguments.containsKey("q")) {
            if (!(arguments.get("q") instanceof Map<?, ?> nested)
                    || arguments.containsKey("start") || arguments.containsKey("end")) {
                return reason() + " " + describeArguments(arguments);
            }
            query = nested;
        }
        Long actualStart = integer(query.get("start"));
        Long actualEnd = integer(query.get("end"));
        if (actualStart == null || actualEnd == null || actualStart < start || actualEnd > end
                || actualStart >= actualEnd || query.get("history") != null || query.get("querySet") != null
                || query.get("source") != null) {
            return reason() + " " + describeArguments(arguments);
        }
        return null;
    }

    /** Safe time-only projection for both current denials and historical execution summaries. */
    public static String describeArguments(Map<String, Object> arguments) {
        if (arguments == null) {
            return "timeArguments=unavailable";
        }
        Map<?, ?> query = arguments.get("q") instanceof Map<?, ?> nested ? nested : arguments;
        return "timeArguments: start=" + describeTime(query.get("start")) + "; end=" + describeTime(query.get("end"))
                + "; nested=" + arguments.containsKey("q") + "; relativeHistory=" + query.containsKey("history")
                + "; querySet=" + query.containsKey("querySet") + "; source=" + query.containsKey("source");
    }

    private static String describeTime(Object value) {
        if (value == null) {
            return "omitted";
        }
        Long epoch = integer(value);
        if (epoch != null) {
            return epoch.toString();
        }
        if (value instanceof String text && text.length() <= 40) {
            try {
                return "ISO8601(epochMillis=" + java.time.Instant.parse(text).toEpochMilli() + ")";
            } catch (RuntimeException invalid) {
                // Never echo unrecognized strings or other request fields.
            }
        }
        return "invalid-integer-time";
    }

    private String reason() {
        return "REQUESTED_WINDOW: use explicit absolute start/end within [" + start + ", " + end
                + "]; missing, relative, opaque or wider query bounds cannot prove the requested scope.";
    }

    private static Long integer(Object value) {
        if (!(value instanceof Number) && !(value instanceof String)) {
            return null;
        }
        try {
            return new BigDecimal(value.toString()).longValueExact();
        } catch (NumberFormatException | ArithmeticException invalid) {
            return null;
        }
    }
}
