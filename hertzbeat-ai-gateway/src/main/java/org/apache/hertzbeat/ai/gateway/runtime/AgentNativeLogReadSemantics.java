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

import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.JSON;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.decode;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.jsonText;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.keys;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.list;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.number;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.object;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.observation;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.require;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.same;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.text;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.window;

import org.apache.hertzbeat.ai.gateway.tool.log.AgentLogQuery;
import org.apache.hertzbeat.common.observability.dto.log.HistoricalLogRow;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogRepeatedErrors;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.observability.logs.query.LogComparisonParser;

import java.util.List;
import java.util.Map;

/** Observed log rows and aggregates retain their exact bounded request and producer identity. */
final class AgentNativeLogReadSemantics {
    AgentReadObservationClassifier.Observation classify(
            String tool, Map<String, Object> args, Map<String, Object> output) {
        var data = jsonText(output);
        if (tool.equals("logs.repeated_errors.records")) {
            return repeated(args, data);
        }
        if (tool.equals("logs.compare")) {
            return compare(args, data);
        }
        var q = decode(args.get("q"), AgentLogQuery.class);
        require(q != null);
        String operation = switch (tool) {
            case "logs.trace_coverage_stats" -> "traceCoverageStats";
            case "logs.trend_stats" -> "trendStats";
            default -> "list";
        };
        q.validateOperation(operation);
        return switch (tool) {
            case "logs.list", "logs.live.snapshot" -> rows(tool, q, output, data);
            case "logs.trace_coverage_stats" -> coverage(data);
            case "logs.trend_stats" -> trend(q, data);
            default -> null;
        };
    }

    private AgentReadObservationClassifier.Observation rows(
            String tool, AgentLogQuery q, Map<String, Object> output, Map<String, Object> data) {
        if (tool.equals("logs.live.snapshot")) {
            require(
                    Boolean.FALSE.equals(output.get("subscriptionOpened"))
                            && q.end() - q.start() <= 900_000);
        }
        keys(data, "content", "totalElements", "pageIndex", "pageSize");
        int index = q.pageIndex() == null ? 0 : q.pageIndex();
        int size = q.pageSize() == null ? 20 : q.pageSize();
        same((long) index, number(data.get("pageIndex")));
        same((long) size, number(data.get("pageSize")));
        var content = list(data.get("content"));
        long total = number(data.get("totalElements"));
        require(
                content.size() <= size
                        && total >= (content.isEmpty() ? 0 : (long) index * size + content.size()));
        var identities = new java.util.HashSet<String>();
        for (Object value : content) {
            HistoricalLogRow row = decode(value, HistoricalLogRow.class);
            long nano = Long.parseLong(text(row.timeUnixNano()));
            require(nano / 1_000_000 >= q.start() && nano / 1_000_000 <= q.end());
            if (row.logRecordUid() != null) {
                require(identities.add(row.logRecordUid()));
            }
            if (q.traceId() != null) {
                same(q.traceId(), row.traceId());
            }
            if (q.spanId() != null) {
                same(q.spanId(), row.spanId());
            }
            if (q.severityNumber() != null) {
                same(q.severityNumber(), row.severityNumber());
            }
        }
        return observation("log-page-records", content.size());
    }

    private AgentReadObservationClassifier.Observation repeated(
            Map<String, Object> args, Map<String, Object> data) {
        keys(data, "state", "scope", "selection", "records");
        var result = decode(data, LogRepeatedErrors.Records.class);
        require(List.of("ready", "missing").contains(result.state()));
        require(window(args, object(data.get("scope")), 900_000));
        same(args.get("groupKey"), result.selection().groupKey());
        same(args.get("representativeUid"), result.selection().representativeUid());
        for (String dimension : List.of("serviceName", "environment")) {
            same(
                    args.get(dimension) == null ? "" : args.get(dimension),
                    object(data.get("scope")).get(dimension));
        }
        require(
                result.records().stream().map(LogRepeatedErrors.Record::uid).distinct().count()
                        == result.records().size());
        return observation(
                result.state().equals("missing")
                        ? "repeated-error-selection-missing"
                        : "repeated-error-records",
                result.records().size());
    }

    private AgentReadObservationClassifier.Observation coverage(Map<String, Object> data) {
        var counts = object(data.get("traceCoverage"));
        long with = number(counts.get("withTrace"));
        long without = number(counts.get("withoutTrace"));
        long spans = number(counts.get("withSpan"));
        long both = number(counts.get("withBothTraceAndSpan"));
        long total = Math.addExact(with, without);
        require(spans <= total && both <= with && both <= spans && spans - both <= without);
        return observation("log-trace-coverage-aggregate", total == 0 ? 0 : 1);
    }

    private AgentReadObservationClassifier.Observation trend(
            AgentLogQuery q, Map<String, Object> data) {
        keys(data, "start", "end", "intervalMs", "buckets");
        var result = decode(data, LogTrend.class);
        require(result.start() == q.start() && result.end() == q.end());
        long count = 0;
        for (var bucket : result.buckets()) {
            count = Math.addExact(count, bucket.count());
        }
        return observation("log-trend-buckets", count == 0 ? 0 : result.buckets().size());
    }

    private AgentReadObservationClassifier.Observation compare(
            Map<String, Object> args, Map<String, Object> data) {
        var envelope = LogComparisonParser.parse(text(args.get("source")));
        var query = comparisonQuery(envelope.parameters());
        query.validateOperation("analysis");
        keys(data, "window", "analysis", "matchingA", "matchingB", "truncated", "groups");
        var result = decode(data, LogComparison.Result.class);
        require(
                window(
                        object(JSON.convertValue(query, Map.class)),
                        object(data.get("window")),
                        604_800_000));
        same(new AgentLogAnalysisReadSemantics().request(query), result.analysis());
        same(envelope.formula(), result.formula());
        Long shift = envelope.queries().getLast().timeShiftMs();
        same(shift, result.timeShiftMs());
        if (shift != null) {
            same(LogComparison.shiftedWindow(result.window(), shift), result.shiftedWindow());
        }
        if (result.analysis().field() == null && result.analysis().grouping() == null) {
            require(!result.truncated());
            require(
                    result.matchingA() < result.analysis().minCount()
                            ? result.groups().isEmpty()
                            : result.groups().size() == 1);
        }
        return observation("log-comparison-groups", result.groups().size());
    }

    private AgentLogQuery comparisonQuery(Map<String, String> parameters) {
        var values = new java.util.LinkedHashMap<String, Object>();
        for (var field : AgentLogQuery.class.getRecordComponents()) {
            String value = parameters.get(field.getName());
            if (value == null) {
                continue;
            }
            Object parsed = value;
            if (field.getType() == Long.class || field.getType() == long.class) {
                parsed = Long.valueOf(value);
            }
            if (field.getType() == Integer.class || field.getType() == int.class) {
                parsed = Integer.valueOf(value);
            }
            if (field.getType() == Boolean.class) {
                require(value.equals("true") || value.equals("false"));
                parsed = Boolean.valueOf(value);
            }
            values.put(field.getName(), parsed);
        }
        return decode(values, AgentLogQuery.class);
    }
}
