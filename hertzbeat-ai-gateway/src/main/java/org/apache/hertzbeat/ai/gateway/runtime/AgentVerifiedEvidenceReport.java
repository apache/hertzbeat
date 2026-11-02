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

import tools.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;
import org.apache.hertzbeat.common.util.JsonUtil;

/**
 * Bounded factual renderer for sampled/unknown/cross-signal investigations. Model prose is not evidence.
 * Only a small allowlist of scalar fields is projected; no raw attributes, bodies or credentials are retained.
 */
final class AgentVerifiedEvidenceReport {
    private final Map<String, String> coverage = new LinkedHashMap<>();
    private final List<String> facts = new ArrayList<>();
    private final ResourceBundle copy;
    private boolean active;
    private final boolean logCoverageRequired;
    private boolean successfulLogRead;
    private boolean coverageRetryUsed;
    private final java.util.Set<String> correctedCoverageStates = new java.util.HashSet<>();
    private boolean freshReadRetryUsed;
    private boolean freshReadSatisfied;
    private boolean requireMonitorAlert;
    private boolean successfulMonitorRead;
    private boolean successfulAlertRead;
    private boolean requireMetrics;
    private boolean requireTraces;
    private boolean successfulMetricRead;
    private boolean successfulTraceRead;
    private boolean completeMonitors;
    private String monitorPurpose;
    private String requestedMonitorPurpose;
    private Long matchingMonitorTotal;
    private boolean monitorFiltersPresent;
    private boolean requestedStatusCounts;
    private boolean unsupportedMonitorWindow;
    private boolean emptyMonitorResult;
    private final java.util.Set<String> observedSignals = new java.util.HashSet<>();
    private boolean verifiedStatusCounts;
    private Map<String, Long> monitorStatusCounts = Map.of();
    private final AgentMonitorPageCoverage monitorPages = new AgentMonitorPageCoverage();

    AgentVerifiedEvidenceReport(boolean crossSignal, Locale locale) {
        this(crossSignal, locale, false);
    }

    AgentVerifiedEvidenceReport(boolean crossSignal, Locale locale, boolean requestedLogs) {
        active = crossSignal;
        logCoverageRequired = crossSignal && requestedLogs;
        copy = ResourceBundle.getBundle("agent_evidence", locale,
                ResourceBundle.Control.getNoFallbackControl(ResourceBundle.Control.FORMAT_PROPERTIES));
        for (String signal : List.of("monitor", "alert", "metrics", "logs", "traces", "topology", "entity")) {
            coverage.put(signal, "NOT_QUERIED");
        }
    }

    static AgentVerifiedEvidenceReport forRequest(String message, Locale locale) {
        var report = new AgentVerifiedEvidenceReport(crossSignal(message), locale, requestsLogs(message));
        report.requireMonitorAlert = crossSignal(message) && requested("request.platformMonitorAlert", message);
        report.requireMetrics = crossSignal(message) && requested("request.metrics", message);
        report.requireTraces = crossSignal(message) && requested("request.traces", message);
        String withoutPageCaps = java.util.regex.Pattern.compile(
                ResourceBundle.getBundle("agent_evidence", Locale.ROOT).getString("request.monitorPageCap"),
                java.util.regex.Pattern.CASE_INSENSITIVE).matcher(message).replaceAll("");
        report.completeMonitors = requested("request.monitorFull", message) && !requested("request.monitorCap", withoutPageCaps);
        report.active |= report.completeMonitors;
        return report;
    }

    private static boolean requested(String key, String message) {
        return java.util.regex.Pattern.compile(ResourceBundle.getBundle("agent_evidence", Locale.ROOT).getString(key),
                java.util.regex.Pattern.CASE_INSENSITIVE).matcher(message).find();
    }

    boolean requestFreshReadRetry() {
        if (freshReadRetryUsed) {
            return false;
        }
        freshReadRetryUsed = true;
        return true;
    }

    void recordReadObservation() {
        freshReadSatisfied = true;
    }

    boolean requiresReadCorrection() {
        return freshReadRetryUsed && !freshReadSatisfied || coverageRetryUsed && needsCoverage();
    }

    boolean needsCoverage() {
        return requireMonitorAlert && (!successfulMonitorRead || !successfulAlertRead)
                || needsLogCoverage() || requireMetrics && !successfulMetricRead
                || requireTraces && !successfulTraceRead || completeMonitors && !monitorPages.complete()
                || requestedStatusCounts && !verifiedStatusCounts
                || "COUNT".equals(requestedMonitorPurpose) && matchingMonitorTotal == null;
    }

    private List<String> missing() {
        List<String> gaps = new ArrayList<>();
        if (requireMonitorAlert && !successfulMonitorRead) {
            gaps.add("monitor");
        }
        if (requireMonitorAlert && !successfulAlertRead) {
            gaps.add("alert");
        }
        if (needsLogCoverage()) {
            gaps.add("logs");
        }
        if (requireMetrics && !successfulMetricRead) {
            gaps.add("metrics");
        }
        if (requireTraces && !successfulTraceRead) {
            gaps.add("traces");
        }
        if (completeMonitors && !monitorPages.complete()) {
            gaps.add("monitor pages");
        }
        if (requestedStatusCounts && !verifiedStatusCounts) {
            gaps.add("monitor status counts");
        }
        if ("COUNT".equals(requestedMonitorPurpose) && matchingMonitorTotal == null) {
            gaps.add("monitor count");
        }
        return gaps;
    }

    static boolean crossSignal(String message) {
        return PatternHolder.CROSS.matcher(message).find()
                || requested("request.metrics", message) && requestsLogs(message) && requested("request.traces", message);
    }

    static boolean requestsLogs(String message) {
        return java.util.regex.Pattern.compile(ResourceBundle.getBundle("agent_evidence", Locale.ROOT)
                .getString("request.logs"), java.util.regex.Pattern.CASE_INSENSITIVE).matcher(message).find();
    }

    boolean needsLogCoverage() {
        return logCoverageRequired && !successfulLogRead;
    }

    boolean requestCoverageRetry() {
        String state = String.join(",", missing()) + monitorPages.summary();
        if (!needsCoverage() || !correctedCoverageStates.add(state)) {
            return false;
        }
        coverageRetryUsed = true;
        return true;
    }

    List<String> requiredReadTools() {
        List<String> names = new ArrayList<>();
        if (requireMonitorAlert) {
            names.add("monitor.query");
            names.add("alert.query");
        }
        if (requireMetrics) {
            names.add("metrics.otlp_inventory");
            names.add("metrics.otlp_console");
        }
        if (logCoverageRequired) {
            names.add("logs.analysis");
        }
        if (requireTraces) {
            names.add("traces.query");
        }
        return List.copyOf(names);
    }

    String readCorrectionFeedback() {
        String feedback = "RUNTIME_READ_CORRECTION: The previous final answer was rejected. "
                + "Execute necessary permitted READ calls in the original question's scope before answering; "
                + "current-run evidence is missing or incomplete. Historical observations are context only. "
                + "Do not expand scope, use write tools, or repeat the rejected final answer. ";
        if (requireMonitorAlert && (!successfulMonitorRead || !successfulAlertRead)) {
            feedback += "Missing requested monitor/alert coverage: query monitor.query and alert.query only in the original "
                    + "authorized object scope. Do not substitute old-run snapshots. If a binding or query is unavailable, "
                    + "retain its precise reason and remain incomplete rather than broaden the scope. ";
        }
        if (requireMetrics && !successfulMetricRead) {
            feedback += "Missing metrics: call metrics.otlp_inventory for the already verified entity/service and exact window; "
                    + "if names are returned, read metrics.otlp_console using a returned name. "
                    + "If its schema is absent, call tool.search namespace=metrics query=metrics.otlp_inventory. ";
        }
        if (needsLogCoverage()) {
            feedback += "Missing logs: call logs.analysis in that same entity/service and exact window; "
                    + "if needed, call tool.search namespace=logs query=logs.analysis. ";
        }
        if (requireTraces && !successfulTraceRead) {
            feedback += "Missing traces: call traces.query in that same entity/service and exact window; "
                    + "if needed, call tool.search namespace=traces query=traces.query. ";
        }
        if (needsCoverage()) {
            feedback += "Missing coverage: " + String.join(", ", missing()) + ". Preserve exact query failures or budget limits. ";
        }
        return feedback;
    }

    String coverageFailure() {
        return text("answer.incomplete") + " " + String.join(", ", missing().stream()
                .map(gap -> text("signal." + gap.replace(' ', '_'))).toList());
    }

    RuntimePrompt constrain(RuntimePrompt prompt) {
        String instruction = freshReadRetryUsed && !freshReadSatisfied ? "\nFRESH_READ_REQUIRED: The previous final was rejected because this run has no new data observation. "
                + "Call a necessary READ tool now in the original requested scope. Prior-run results are historical only. "
                + "Do not repeat the final answer, ask the user to rephrase, or bypass permissions. " : "";
        if (needsCoverage()) {
            instruction += "\nSIGNAL_COVERAGE_REQUIRED: missing only the CURRENT request's requirements: "
                    + String.join(", ", missing()) + ". Do not query or report unrelated domains. "
                    + "Keep the same authorized object filters. If unavailable, retain the reason and say briefly what remains unknown. ";
            if ("COUNT".equals(requestedMonitorPurpose) && matchingMonitorTotal == null) {
                instruction += "Read monitor.query with purpose COUNT and the same filters; an exact matching total is sufficient. ";
            }
            if (requestedStatusCounts && !verifiedStatusCounts) {
                instruction += "Read monitor.query with purpose STATUS_COUNTS and the same filters; sample rows cannot prove population attributes. ";
            }
            if (needsLogCoverage()) {
                instruction += "LOG_COVERAGE_REQUIRED: query the requested logs for the verified identity and exact requested window. ";
            }
            if (requireMetrics && !successfulMetricRead) {
                instruction += "Use metrics.otlp_inventory in the requested scope/window, then a supported data read for a returned metric name; "
                        + "a complete scoped empty inventory can explain no available series, not health. ";
            }
            if (requireTraces && !successfulTraceRead) {
                instruction += "Query the requested traces for the verified identity and exact requested window. ";
            }
            if (completeMonitors && !monitorPages.complete()) {
                instruction += "For this complete monitor overview, use stable sort=id, order=asc and pageSize<=5. "
                        + "Continue identical filters/sort/pageSize, changing only pageIndex. Next exact monitor.query arguments: "
                        + JsonUtil.toJson(monitorPages.nextQuery()) + ". " + monitorPages.summary() + " ";
            }
            if (coverageRetryUsed) {
                instruction += "The previous final was rejected. An unchanged gap receives only one correction; new coverage progress may permit another within budgets. Call missing tools now "
                        + "within remaining budgets or preserve a precise incomplete reason.";
            }
        }
        if (instruction.isEmpty()) {
            return prompt;
        }
        return RuntimePrompt.builder().instructions(prompt.getInstructions() + instruction).blocks(prompt.getBlocks()).build();
    }

    void inheritedWindow(String tool, AgentRequestedQueryWindow window) {
        active = true;
        add(tool + ": windowSource=SERVER_RUN_WINDOW; UTC " + java.time.Instant.ofEpochMilli(window.start())
                + " / " + java.time.Instant.ofEpochMilli(window.end()));
    }

    void prepare(String tool) {
        active |= tool.equals("monitor.query") || tool.startsWith("traces.");
    }

    boolean active() {
        return active;
    }

    void observe(String tool, Map<String, Object> arguments, boolean success, String output) {
        observe(tool, arguments, success, output, null);
    }

    void observe(String tool, Map<String, Object> arguments, boolean success, String output, String error) {
        String signal = tool.contains(".") ? tool.substring(0, tool.indexOf('.')) : tool;
        prepare(tool);
        if (tool.equals("monitor.query")) {
            matchingMonitorTotal = null;
            emptyMonitorResult = false;
            monitorPurpose = null;
            verifiedStatusCounts = false;
            if (requestedMonitorPurpose == null && arguments.get("purpose") instanceof String purpose) {
                requestedMonitorPurpose = purpose;
                completeMonitors = purpose.equals("ALL_ROWS");
                requestedStatusCounts = purpose.equals("STATUS_COUNTS");
            }
        }
        if (!coverage.containsKey(signal)) {
            return;
        }
        observedSignals.add(signal);
        if (!success) {
            update(signal, "FAILED");
            add(tool + ": FAILED" + (error == null ? "" : "; " + safe(error)));
            return;
        }
        JsonNode node;
        try {
            node = JsonUtil.fromJson(output, JsonNode.class);
        } catch (RuntimeException malformed) {
            node = null;
        }
        if (node == null || !node.isObject()) {
            update(signal, "UNKNOWN");
            add(tool + ": UNKNOWN");
            return;
        }
        boolean projectedPartial = node.path("partial").asBoolean(false);
        if ("json_text".equals(node.path("format").asText()) && node.path("data").isTextual()) {
            if (node.path("projectionTruncated").asBoolean()) {
                update(signal, "UNKNOWN_TRUNCATED");
                add(tool + ": " + text("truncated"));
                return;
            }
            node = JsonUtil.fromJson(node.path("data").asText(), JsonNode.class);
        }
        if (node != null && node.has("code")) {
            if (node.path("code").asInt(-1) != 0) {
                update(signal, "FAILED");
                return;
            }
            node = node.path("data");
        }
        if (node == null || !node.isObject()) {
            update(signal, "UNKNOWN");
            return;
        }
        if (tool.equals("monitor.query") && "unsupported_time_range".equals(node.path("state").asText())) {
            unsupportedMonitorWindow = true;
        }
        if (node.has("state") && !"ready".equals(node.path("state").asText())) {
            update(signal, "UNAVAILABLE");
            add(tool + ": " + text("unavailable") + " " + safe(node.path("state").asText()));
            return;
        }
        if (!node.path("errorMessage").asText("").isBlank()) {
            update(signal, "FAILED");
            add(tool + ": FAILED; " + safe(node.path("errorMessage").asText()));
            return;
        }
        if (tool.equals("alert.query")) {
            String alertType = node.path("alertType").asText("");
            if (List.of("single", "group", "both").contains(alertType)) {
                add(tool + " scope: alertType=" + alertType);
            }
            node = AgentAlertQueryPage.page(node);
            if (node == null) {
                update(signal, "UNKNOWN");
                add(tool + ": UNKNOWN");
                return;
            }
        }
        successfulMonitorRead |= tool.equals("monitor.query") && node.path("content").isArray();
        successfulAlertRead |= tool.equals("alert.query") && (node.path("content").isArray()
                || node.path("result").path("content").isArray() || node.path("single").path("content").isArray()
                || node.path("group").path("content").isArray());
        successfulLogRead |= java.util.Set.of("logs.analysis", "logs.calculated", "logs.compare", "logs.context",
                "logs.group_by_stats", "logs.list", "logs.live.snapshot", "logs.overview_stats", "logs.query",
                "logs.query_set", "logs.repeated_errors.records", "logs.repeated_errors.summary", "logs.subquery",
                "logs.trace_coverage_stats", "logs.transaction_detail", "logs.transactions", "logs.trend_stats").contains(tool);
        successfulTraceRead |= tool.equals("traces.query");
        boolean metricInventoryEmpty = tool.equals("metrics.otlp_inventory") && node.path("items").isArray()
                && node.path("items").isEmpty() && !projectedPartial && !node.path("partial").asBoolean()
                && !node.path("truncated").asBoolean()
                && scopedWindow(arguments);
        successfulMetricRead |= tool.equals("metrics.history") || tool.equals("metrics.realtime")
                || tool.equals("metrics.otlp_console") && node.path("errorMessage").asText("").isBlank()
                || metricInventoryEmpty;
        if (metricInventoryEmpty) {
            add(tool + ": " + text("noMetricSeries"));
        }
        if (tool.equals("monitor.query")) {
            emptyMonitorResult = node.path("content").isArray() && node.path("content").isEmpty()
                    && node.path("totalElements").isIntegralNumber() && node.path("totalElements").asLong(-1) == 0
                    && !projectedPartial && !node.path("partial").asBoolean() && !node.path("truncated").asBoolean();
            observeMonitorPurpose(arguments, node);
            monitorPages.observe(null, arguments, output);
        }
        JsonNode rows = node.path("content");
        active |= tool.equals("monitor.query") && !rows.isArray();
        if ((tool.equals("monitor.query") || tool.equals("traces.query") || tool.equals("alert.query")) && rows.isArray()) {
            int returned = rows.size();
            long total = node.path("totalElements").isIntegralNumber()
                    ? node.path("totalElements").asLong() : -1;
            boolean partial = projectedPartial || node.path("partial").asBoolean() || node.path("truncated").asBoolean()
                    || node.path("pageIndex").asLong(0) > 0 || total < 0 || returned < total;
            active |= partial;
            update(signal, partial ? "PARTIAL" : returned == 0 ? "EMPTY" : "OBSERVED");
            add(tool + ": " + returned + " / " + (total < 0 ? "?" : total) + ". " + text("scope"));
            int count = 0;
            for (JsonNode row : rows) {
                if (count++ >= 5) {
                    break;
                }
                StringBuilder fact = new StringBuilder(tool).append(" row: ");
                for (String field : tool.equals("monitor.query") ? List.of("id", "monitorId", "name", "status")
                        : tool.equals("alert.query") ? List.of("id", "status", "priority")
                        : List.of("traceId", "serviceName", "durationNanos", "status", "errorSpanCount")) {
                    if (row.has(field) && row.path(field).isValueNode()) {
                        fact.append(field).append('=').append(safe(row.path(field).asText())).append("; ");
                    }
                }
                if (tool.equals("traces.query")) {
                    String status = row.path("status").asText("").toLowerCase(Locale.ROOT);
                    if (!List.of("ok", "error").contains(status)) {
                        active = true;
                        fact.append("UNVERIFIED: ").append(text("unknownStatus"));
                    }
                }
                add(fact.toString());
            }
        } else {
            Long count = tool.equals("monitor.query") || tool.equals("traces.query") ? null : count(node);
            String state = tool.equals("metrics.otlp_inventory") && !metricInventoryEmpty ? "CATALOG_ONLY"
                    : projectedPartial || node.path("partial").asBoolean() || node.path("truncated").asBoolean() ? "PARTIAL"
                    : count == null ? "UNKNOWN" : count == 0 ? "EMPTY" : "OBSERVED";
            update(signal, state);
            add(tool + ": " + state + (count == null ? "" : "; count=" + count));
        }
        Map<?, ?> query = arguments.get("q") instanceof Map<?, ?> nested ? nested : arguments;
        for (String field : List.of("entityId", "monitorId", "serviceName", "traceId", "metricKey")) {
            Object value = query.get(field);
            if (value instanceof String || value instanceof Number) {
                add(tool + " scope: " + field + "=" + safe(value.toString()));
            }
        }
        Object start = query.get("start");
        Object end = query.get("end");
        if (start instanceof Number && end instanceof Number) {
            add(tool + " UTC: " + java.time.Instant.ofEpochMilli(((Number) start).longValue()) + " / "
                    + java.time.Instant.ofEpochMilli(((Number) end).longValue()));
        } else {
            add(tool + ": " + text("snapshot"));
        }
    }

    private void observeMonitorPurpose(Map<String, Object> arguments, JsonNode data) {
        JsonNode metadata = data.path("queryMetadata");
        String purpose = metadata.path("purpose").asText();
        if (!"monitor-query.v1".equals(metadata.path("version").asText())
                || !List.of("COUNT", "PAGE", "ALL_ROWS", "STATUS_COUNTS").contains(purpose)
                || !"MATCHING_FILTERS".equals(metadata.path("totalScope").asText())
                || !metadata.path("totalIsExact").asBoolean()
                || !data.path("totalElements").isIntegralNumber()
                || data.path("totalElements").asLong(-1) < data.path("content").size()
                || data.path("totalElements").asLong(-1) < 0) {
            return;
        }
        Map<String, Object> filters = new LinkedHashMap<>();
        for (String key : List.of("ids", "app", "status", "search", "labels")) {
            Object value = arguments.get(key);
            if (value == null || value instanceof List<?> list && list.isEmpty()
                    || value instanceof String text && (text.isBlank() || key.equals("status") && text.equalsIgnoreCase("all"))) {
                continue;
            }
            filters.put(key, value);
        }
        if (!JsonUtil.fromJson(JsonUtil.toJson(filters), JsonNode.class).equals(metadata.path("filters"))) {
            return;
        }
        if (requestedMonitorPurpose != null && !requestedMonitorPurpose.equals(purpose)) {
            return;
        }
        monitorPurpose = purpose;
        matchingMonitorTotal = data.path("totalElements").asLong();
        monitorFiltersPresent = metadata.path("filters").isObject() && !metadata.path("filters").isEmpty();
        if (requestedStatusCounts && "MATCHING_FILTERS".equals(metadata.path("statusCountsScope").asText())) {
            Map<String, Long> counts = new LinkedHashMap<>();
            long sum = 0;
            for (String status : List.of("up", "down", "paused", "unreachable")) {
                JsonNode value = data.path("status").path(status);
                if (!value.isIntegralNumber() || value.asLong(-1) < 0 || value.asLong() > matchingMonitorTotal - sum) {
                    return;
                }
                counts.put(status, value.asLong());
                sum += value.asLong();
            }
            if (sum != matchingMonitorTotal) {
                return;
            }
            monitorStatusCounts = Map.copyOf(counts);
            verifiedStatusCounts = true;
        }
    }

    String failureAnswer() {
        return unsupportedMonitorWindow ? text("answer.unsupportedWindow") : null;
    }

    String conciseAnswer() {
        if (needsCoverage() || requireMonitorAlert || requireMetrics || logCoverageRequired || requireTraces
                || !observedSignals.equals(java.util.Set.of("monitor"))) {
            return null;
        }
        if (emptyMonitorResult && !"COUNT".equals(monitorPurpose) && !"STATUS_COUNTS".equals(monitorPurpose)) {
            return text("answer.emptyMonitors");
        }
        if (matchingMonitorTotal == null) {
            return null;
        }
        if ("COUNT".equals(monitorPurpose)) {
            return java.text.MessageFormat.format(text(monitorFiltersPresent ? "answer.filteredCount" : "answer.count"),
                    matchingMonitorTotal);
        }
        if ("STATUS_COUNTS".equals(monitorPurpose) && verifiedStatusCounts) {
            return java.text.MessageFormat.format(text("answer.statusCounts"), matchingMonitorTotal,
                    monitorStatusCounts.get("up"), monitorStatusCounts.get("down"), monitorStatusCounts.get("paused"),
                    monitorStatusCounts.get("unreachable"));
        }
        return null;
    }

    String render() {
        if (completeMonitors && monitorPages.complete()) {
            coverage.put("monitor", "OBSERVED_PAGES");
        }
        StringBuilder report = new StringBuilder(text("title")).append("\n\n");
        for (String fact : facts) {
            report.append("- ").append(fact).append('\n');
        }
        report.append('\n').append(text("coverage")).append('\n');
        if (completeMonitors) {
            report.append("- ").append(monitorPages.summary()).append('\n');
        }
        coverage.forEach((signal, state) -> report.append("- ").append(signal).append(": ").append(state).append('\n'));
        report.append('\n').append(text("limits")).append('\n');
        if (coverage.get("logs").equals("NOT_QUERIED")) {
            report.append(text("logsNotQueried")).append('\n');
        }
        if (!coverage.get("traces").equals("NOT_QUERIED")) {
            report.append(text("unknownStatus")).append('\n');
        }
        report.append(text("next"));
        return report.toString();
    }

    private void update(String signal, String state) {
        String previous = coverage.get(signal);
        if (!previous.equals("NOT_QUERIED") && !previous.equals(state)) {
            coverage.put(signal, "MIXED(" + previous + "," + state + ")");
        } else {
            coverage.put(signal, state);
        }
    }

    private void add(String fact) {
        if (facts.size() < 64) {
            facts.add(fact);
        }
    }

    private static boolean scopedWindow(Map<String, Object> arguments) {
        Map<?, ?> query = arguments.get("q") instanceof Map<?, ?> nested ? nested : arguments;
        return query.get("start") instanceof Number && query.get("end") instanceof Number
                && (query.get("entityId") != null || query.get("serviceName") != null);
    }

    private static Long count(JsonNode node) {
        if (node.path("items").isArray()) {
            return (long) node.path("items").size();
        }
        if (node.path("stats").path("totalSeries").isIntegralNumber()) {
            return node.path("stats").path("totalSeries").asLong();
        }
        for (String field : List.of("totalElements", "totalPoints", "rowCount", "returnedRows", "total", "matchingTotal")) {
            if (node.path(field).isIntegralNumber() && node.path(field).asLong() >= 0) {
                return node.path(field).asLong();
            }
        }
        return null;
    }

    private static String safe(String value) {
        return "`" + AgentRuntimeTextSanitizer.sanitizeAndLimit(value, 160)
                .replace('`', '\'').replace('\n', ' ').replace('\r', ' ').replace('<', '[').replace('>', ']') + "`";
    }

    private String text(String key) {
        return copy.getString(key);
    }

    private static final class PatternHolder {
        private static final java.util.regex.Pattern CROSS = java.util.regex.Pattern.compile(
                ResourceBundle.getBundle("agent_evidence", Locale.ROOT).getString("request.cross"),
                java.util.regex.Pattern.CASE_INSENSITIVE);
    }
}
