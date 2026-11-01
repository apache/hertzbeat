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

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Readiness and sampled metadata cannot prove setup, complete signal totals, or successful writes.
 */
final class AgentTelemetryIntakeReadSemantics {
    private static final Set<String> SIGNALS = Set.of("metrics", "logs", "traces");

    static boolean supports(String name) {
        return Set.of(
                        "telemetry.overview",
                        "telemetry.bindings",
                        "telemetry.intake_red_summary",
                        "telemetry.sources")
                .contains(name);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> out) {
        try {
            if (call == null
                    || !supports(call.getToolName())
                    || out == null
                    || !"telemetry-intake-read.v1".equals(out.get("telemetryReadVersion"))
                    || !call.getToolName().equals(out.get("toolName"))
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments())
                            .equals(out.get("inputHash"))
                    || !Boolean.FALSE.equals(out.get("partial"))) return null;
            String workspace = text(out.get("workspaceId"), 128, false);
            boolean red = call.getToolName().equals("telemetry.intake_red_summary");
            if (!red && !call.getArguments().isEmpty()) return null;
            Map<String, Object> data =
                    call.getToolName().equals("telemetry.sources")
                            ? AgentNativeReadContract.object(
                                    AgentNativeReadContract.management(out))
                            : AgentNativeReadContract.jsonText(out);
            return switch (call.getToolName()) {
                case "telemetry.sources" -> sources(workspace, out, data);
                case "telemetry.overview" -> sampled(out) ? overview(data) : null;
                case "telemetry.bindings" -> sampled(out) ? bindings(data) : null;
                case "telemetry.intake_red_summary" ->
                        red(call.getArguments(), workspace, out, data);
                default -> null;
            };
        } catch (RuntimeException invalid) {
            return null;
        }
    }

    private boolean sampled(Map<String, Object> out) {
        return "NATIVE_LAST_24H_SAMPLED".equals(out.get("coverageKind"))
                && number(out.get("lookbackMillis")) == 86400000L;
    }

    private AgentReadObservationClassifier.Observation overview(Map<String, Object> data) {
        long active = 0;
        Long latest = null;
        for (String signal : SIGNALS) {
            var row = map(data.get(signal));
            if (!signal.equals(row.get("signal"))
                    || !(row.get("active") instanceof Boolean enabled)) return null;
            number(row.get("totalCount"));
            Long time = optionalTime(row.get("latestObservedAt"));
            if (time != null) latest = latest == null ? time : Math.max(time, latest);
            if (enabled) active++;
            text(row.get("intakeMode"), 64, false);
            text(row.get("summary"), 2048, true);
        }
        if (number(data.get("activeSignalCount")) != active
                || !java.util.Objects.equals(latest, optionalTime(data.get("latestObservedAt"))))
            return null;
        number(data.get("recentServiceCount"));
        number(data.get("boundEntityCount"));
        for (Object v : list(data.get("recentEvents"), 3)) {
            var row = map(v);
            if (!SIGNALS.contains(row.get("signal"))) return null;
            text(row.get("title"), 2048, true);
            text(row.get("detail"), 4096, true);
            optionalTime(row.get("observedAt"));
        }
        var seen = new HashSet<String>();
        for (Object v : list(data.get("readinessChecks"), 32)) {
            var row = map(v);
            if (!seen.add(text(row.get("key"), 128, false))) return null;
            text(row.get("title"), 2048, true);
            text(row.get("status"), 64, false);
            text(row.get("summary"), 2048, true);
            text(row.get("detail"), 4096, true);
            optionalTime(row.get("checkedAt"));
        }
        return observation("otlp-intake-sampled-signal-summaries", 3);
    }

    private AgentReadObservationClassifier.Observation bindings(Map<String, Object> data) {
        var keys = strings(data.get("canonicalIdentityKeys"), 50, 256, false);
        strings(data.get("recentServices"), 100, 1024, false);
        var samples = new HashSet<String>();
        for (Object v : list(data.get("recentIdentitySamples"), 12)) {
            var row = map(v);
            String key = text(row.get("key"), 256, false);
            String value = text(row.get("value"), 2048, false);
            if (!keys.contains(key)
                    || !SIGNALS.contains(row.get("signal"))
                    || !samples.add(row.get("signal") + "|" + key + "|" + value)) return null;
        }
        var entities = list(data.get("recentBoundEntities"), 100);
        var seen = new HashSet<Long>();
        for (Object v : entities) {
            var row = map(v);
            long id = number(row.get("entityId"));
            if (id <= 0 || !seen.add(id)) return null;
            number(row.get("monitorBindCount"));
            text(row.get("type"), 128, false);
            text(row.get("name"), 2048, false);
            for (String key :
                    List.of(
                            "displayName",
                            "namespace",
                            "primaryIdentityKey",
                            "primaryIdentityValue")) optionalText(row.get(key), 2048);
        }
        var candidates = new HashSet<String>();
        for (Object v : list(data.get("recentUnboundCandidates"), 100)) {
            var row = map(v);
            String key = text(row.get("primaryIdentityKey"), 256, false);
            String value = text(row.get("primaryIdentityValue"), 2048, false);
            if (!candidates.add(
                    org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                            .normalizedArgumentsHash(
                                    Map.of(
                                            "key",
                                            key,
                                            "value",
                                            value,
                                            "namespace",
                                            java.util.Objects.toString(row.get("namespace"), ""),
                                            "environment",
                                            java.util.Objects.toString(
                                                    row.get("environment"), ""))))) return null;
            for (String name :
                    List.of("suggestedName", "suggestedType", "namespace", "environment"))
                optionalText(row.get(name), 2048);
            var signals = strings(row.get("signals"), 3, 16, false);
            if (!SIGNALS.containsAll(signals)) return null;
            var canonical = map(row.get("canonicalIdentities"));
            if (canonical.size() > 50) return null;
            for (var e : canonical.entrySet()) {
                text(e.getKey(), 256, false);
                text(e.getValue(), 2048, false);
            }
            optionalTime(row.get("latestObservedAt"));
        }
        return observation("otlp-binding-sampled-bound-entities", entities.size());
    }

    private AgentReadObservationClassifier.Observation red(
            Map<String, Object> args,
            String workspace,
            Map<String, Object> out,
            Map<String, Object> data) {
        if (!args.keySet().equals(Set.of("start", "end"))
                || !AgentNativeReadContract.window(args, out, 604800000L)
                || !"NATIVE_AUDIT_SAMPLE_MAX_256".equals(out.get("coverageKind"))
                || number(out.get("sampleLimit")) != 256
                || !workspace.equals(data.get("workspaceId"))) return null;
        long start = number(args.get("start"));
        long end = number(args.get("end"));
        long total = number(data.get("requestCount"));
        if (total > 256 || !redRow(data, start, end)) return null;
        long requests = 0;
        long errors = 0;
        long bytes = 0;
        long items = 0;
        var seen = new HashSet<String>();
        for (Object v : list(data.get("signals"), 6)) {
            var row = map(v);
            if (!SIGNALS.contains(row.get("signal"))
                    || !Set.of("http", "grpc").contains(row.get("protocol"))
                    || !seen.add(row.get("signal") + "|" + row.get("protocol"))
                    || !redRow(row, start, end)) return null;
            requests = Math.addExact(requests, number(row.get("requestCount")));
            errors = Math.addExact(errors, number(row.get("errorCount")));
            bytes = Math.addExact(bytes, number(row.get("requestBytes")));
            items = Math.addExact(items, number(row.get("signalItems")));
            optionalText(row.get("latestStatusCode"), 128);
            optionalText(row.get("latestReason"), 2048);
        }
        if (requests != total
                || errors != number(data.get("errorCount"))
                || bytes != number(data.get("requestBytes"))
                || items != number(data.get("signalItems"))) return null;
        return observation("otlp-intake-bounded-audit-requests", Math.toIntExact(total));
    }

    private boolean redRow(Map<String, Object> row, long start, long end) {
        long count = number(row.get("requestCount"));
        long errors = number(row.get("errorCount"));
        if (errors > count) return false;
        double rate = finite(row.get("requestRatePerMinute"));
        double errorRate = finite(row.get("errorRate"));
        if (rate < 0
                || Math.abs(rate - (double) count * 60000L / (end - start)) > 0.000000001D
                || errorRate < 0
                || errorRate > 1
                || Math.abs(errorRate - (count == 0 ? 0D : (double) errors / count)) > 0.000000001D)
            return false;
        number(row.get("requestBytes"));
        number(row.get("signalItems"));
        for (String prefix : List.of("SignalItems", "DurationMillis")) {
            Object average = row.get("average" + prefix);
            Object max = row.get("max" + prefix);
            if ((average == null) != (max == null)) return false;
            if (average != null && number(average) > number(max)) return false;
        }
        Long latest = optionalTime(row.get("latestObservedAt"));
        return count == 0 ? latest == null : latest != null && latest >= start && latest <= end;
    }

    private AgentReadObservationClassifier.Observation sources(
            String workspace, Map<String, Object> out, Map<String, Object> data) {
        if (!"NATIVE_READINESS_CONFIGURATION".equals(out.get("coverageKind"))) return null;
        for (String name : List.of("external", "self")) {
            var row = map(data.get(name));
            if (!(row.get("enabled") instanceof Boolean)
                    || !(row.get("ready") instanceof Boolean)
                    || !(row.get("accessible") instanceof Boolean)) return null;
            if (name.equals("self")) {
                if (Boolean.TRUE.equals(row.get("accessible"))
                        && !workspace.equals(row.get("workspaceId"))) return null;
                for (String key : List.of("workspaceId", "reason", "statusReason", "metricsStatus"))
                    text(row.get(key), 2048, true);
            }
        }
        return observation("telemetry-source-readiness-not-signal-reception", 2);
    }

    private Map<String, Object> map(Object value) {
        return AgentNativeReadContract.object(value);
    }

    private List<?> list(Object value, int max) {
        var result = AgentNativeReadContract.list(value);
        if (result.size() > max) throw new IllegalArgumentException("Bounded native list required");
        return result;
    }

    private Set<String> strings(Object value, int max, int textMax, boolean blank) {
        var result = new HashSet<String>();
        for (Object item : list(value, max))
            if (!result.add(text(item, textMax, blank)))
                throw new IllegalArgumentException("Distinct native text values required");
        return result;
    }

    private long number(Object value) {
        return AgentNativeReadContract.number(value);
    }

    private Long optionalTime(Object value) {
        return value == null ? null : number(value);
    }

    private void optionalText(Object value, int max) {
        if (value != null) text(value, max, true);
    }

    private String text(Object value, int max, boolean blank) {
        if (!(value instanceof String s) || s.length() > max || !blank && s.isBlank())
            throw new IllegalArgumentException("Bounded native text required");
        return s;
    }

    private double finite(Object value) {
        if (!(value instanceof Number))
            throw new IllegalArgumentException("Native number required");
        double n = new BigDecimal(value.toString()).doubleValue();
        if (!Double.isFinite(n)) throw new IllegalArgumentException("Finite value required");
        return n;
    }

    private AgentReadObservationClassifier.Observation observation(String unit, int count) {
        return new AgentReadObservationClassifier.Observation(unit, count);
    }
}
