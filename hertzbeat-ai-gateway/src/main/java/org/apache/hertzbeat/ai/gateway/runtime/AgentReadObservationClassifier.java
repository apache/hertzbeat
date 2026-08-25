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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Classifies only production-shaped, semantically non-empty READ outputs. */
final class AgentReadObservationClassifier {

    private static final ObjectMapper QUIET_JSON = JsonMapper.builder().build();

    Observation classify(AgentRuntimeToolCall call, String outputJson) {
        return classify(call, object(outputJson));
    }

    private Observation classify(AgentRuntimeToolCall call, Map<String, Object> output) {
        String toolName = call == null ? null : call.getToolName();
        if (toolName == null || output == null) {
            return null;
        }
        return switch (toolName) {
            case "monitor.get" -> matchingId(call, output, "monitorId", "monitorId", "monitor");
            case "monitor.query" -> page(output, "monitor-list", RowShape.MONITOR);
            case "metrics.realtime" -> realtime(call, output);
            case "metrics.history" -> metricHistory(call, output);
            case "logs.query" -> page(output, "log-records", RowShape.LOG);
            case "traces.query" -> page(output, "trace-records", RowShape.TRACE);
            case "traces.get" -> traceDetail(call, output);
            case "entity.get" -> matchingNestedId(call, output, "entityId", "entity", "id", "entity");
            case "entity.query" -> page(output, "entity-list", RowShape.ENTITY);
            case "topology.query" -> topology(output);
            case "alert.get" -> alertGet(call, output);
            case "alert.query" -> alertQuery(output);
            case "alert.similar" -> exactListCount(
                    output, "content", "returnedCount", "similar-alerts", RowShape.ALERT);
            case "alert.summary" -> positiveNumber(output, "total", "alert-summary");
            case "collector.list" -> page(output, "collector-list", RowShape.COLLECTOR);
            case "collector.collect_once" -> collectorResult(call, output);
            case "collector.detect" -> collectorDetect(call, output);
            case "metrics.warehouse_status" -> booleanObservation(output, "online", "warehouse-status");
            case "dns.query", "http.get" -> protocolRows(output);
            case "database.mysql_slow_queries", "database.mysql_process_list", "database.mysql_lock_waits",
                    "database.mysql_global_status", "database.explain_query" -> databaseRows(output);
            default -> null;
        };
    }

    private Observation realtime(AgentRuntimeToolCall call, Map<String, Object> output) {
        if (!matchesOptionalLong(call, output, "monitorId")
                || !matchesOptionalText(call, output, "metrics")) {
            return null;
        }
        return exactListCount(output, "valueRows", "rowCount", "metric-rows", RowShape.VALUE_ROW);
    }

    private Observation metricHistory(AgentRuntimeToolCall call, Map<String, Object> output) {
        if (!matchesOptionalLong(call, output, "monitorId")
                || !matchesOptionalText(call, output, "metricKey")
                || !matchesOptionalLong(call, output, "start")
                || !matchesOptionalLong(call, output, "end")) {
            return null;
        }
        Map<?, ?> values = map(output.get("values"));
        int visible = 0;
        if (values != null) {
            for (Object value : values.values()) {
                List<?> points = list(value);
                if (points == null || points.stream().anyMatch(point -> !RowShape.HISTORY_POINT.valid(point))) {
                    return null;
                }
                visible = add(visible, points.size());
                if (visible < 0) {
                    return null;
                }
            }
        }
        Integer returned = positiveInteger(output.get("returnedPoints"));
        Long total = nonNegativeLong(output.get("totalPoints"));
        return returned != null && returned == visible && total != null && total >= visible
                ? new Observation("metric-points", visible) : null;
    }

    private Observation page(Map<String, Object> output, String kind, RowShape rowShape) {
        List<?> content = list(output.get("content"));
        Long total = nonNegativeLong(output.get("totalElements"));
        return content != null && !content.isEmpty() && content.stream().allMatch(rowShape::valid)
                && total != null && total >= content.size()
                ? new Observation(kind, content.size()) : null;
    }

    private Observation alertQuery(Map<String, Object> output) {
        Map<?, ?> result = map(output.get("result"));
        if (result != null) {
            return page(cast(result), "alert-records", RowShape.ALERT);
        }
        Observation single = page(cast(map(output.get("single"))), "alert-records", RowShape.ALERT);
        Observation group = page(cast(map(output.get("group"))), "alert-records", RowShape.ALERT);
        int count = (single == null ? 0 : single.count()) + (group == null ? 0 : group.count());
        return count > 0 ? new Observation("alert-records", count) : null;
    }

    private Observation alertGet(AgentRuntimeToolCall call, Map<String, Object> output) {
        Long alertId = positiveLong(arguments(call).get("alertId"));
        if (alertId == null || !Objects.equals(alertId, positiveLong(output.get("alertId")))) {
            return null;
        }
        Map<?, ?> single = map(output.get("single"));
        Map<?, ?> group = map(output.get("group"));
        boolean singleMatches = single != null && Objects.equals(alertId, positiveLong(single.get("id")));
        boolean groupMatches = group != null && Objects.equals(alertId, positiveLong(group.get("id")));
        return singleMatches ^ groupMatches ? new Observation("alert", 1) : null;
    }

    private Observation topology(Map<String, Object> output) {
        List<?> nodes = list(output.get("nodes"));
        return Boolean.TRUE.equals(output.get("apiBacked")) && nodes != null && !nodes.isEmpty()
                && nodes.stream().allMatch(RowShape.TOPOLOGY_NODE::valid)
                ? new Observation("topology-nodes", nodes.size()) : null;
    }

    private Observation traceDetail(AgentRuntimeToolCall call, Map<String, Object> output) {
        if (!matchesRequiredText(call, output, "traceId")) {
            return null;
        }
        return boundedListCount(output, "spans", "spanCount", "partial", "trace-spans", RowShape.SPAN);
    }

    private Observation collectorResult(AgentRuntimeToolCall call, Map<String, Object> output) {
        if (!"SUCCESS".equals(output.get("status"))
                || !matchesOptionalLong(call, output, "monitorId")) {
            return null;
        }
        List<?> metrics = list(output.get("metrics"));
        Integer metricsCount = positiveInteger(output.get("metricsCount"));
        if (metrics == null || metricsCount == null || metricsCount != metrics.size()
                || metrics.stream().anyMatch(metric -> !RowShape.COLLECTED_METRIC.valid(metric))) {
            return null;
        }
        int rows = 0;
        for (Object metric : metrics) {
            Map<?, ?> row = map(metric);
            rows = add(rows, positiveInteger(row.get("rowCount")));
            if (rows < 0) {
                return null;
            }
        }
        return rows > 0 ? new Observation("collector-results", rows) : null;
    }

    private Observation collectorDetect(AgentRuntimeToolCall call, Map<String, Object> output) {
        Map<?, ?> collect = map(output.get("collect"));
        return "SUCCESS".equals(output.get("status")) && collect != null
                ? collectorResult(call, cast(collect)) : null;
    }

    private Observation protocolRows(Map<String, Object> output) {
        List<?> metrics = list(output.get("metrics"));
        if (metrics == null || metrics.isEmpty()) {
            return null;
        }
        int count = 0;
        for (Object item : metrics) {
            Map<?, ?> metric = map(item);
            List<?> rows = metric == null ? null : list(metric.get("rows"));
            Long rowCount = metric == null ? null : nonNegativeLong(metric.get("rowCount"));
            boolean truncated = metric != null && Boolean.TRUE.equals(metric.get("truncated"));
            if (rows == null || rows.stream().anyMatch(row -> !RowShape.OBJECT.valid(row)) || rowCount == null
                    || truncated && rowCount < rows.size()
                    || !truncated && rowCount != rows.size()) {
                return null;
            }
            count = add(count, rows.size());
            if (count < 0) {
                return null;
            }
        }
        return count > 0 ? new Observation("protocol-metric-rows", count) : null;
    }

    private Observation databaseRows(Map<String, Object> output) {
        return exactListCount(output, "rows", "rowCount", "database-rows", RowShape.OBJECT);
    }

    private Observation exactListCount(Map<String, Object> output, String listKey,
                                       String countKey, String kind, RowShape rowShape) {
        List<?> values = list(output.get(listKey));
        Integer count = positiveInteger(output.get(countKey));
        return values != null && count != null && count == values.size()
                && values.stream().allMatch(rowShape::valid) ? new Observation(kind, count) : null;
    }

    private Observation boundedListCount(Map<String, Object> output, String listKey, String countKey,
                                         String partialKey, String kind, RowShape rowShape) {
        List<?> values = list(output.get(listKey));
        Integer total = positiveInteger(output.get(countKey));
        boolean partial = Boolean.TRUE.equals(output.get(partialKey));
        if (values == null || values.isEmpty() || total == null
                || values.stream().anyMatch(value -> !rowShape.valid(value))
                || partial && total < values.size()
                || !partial && total != values.size()) {
            return null;
        }
        return new Observation(kind, values.size());
    }

    private Observation matchingId(AgentRuntimeToolCall call, Map<String, Object> output,
                                   String argumentKey, String outputKey, String kind) {
        return matchesRequiredLong(call, output, argumentKey, outputKey) ? new Observation(kind, 1) : null;
    }

    private Observation matchingNestedId(AgentRuntimeToolCall call, Map<String, Object> output, String argumentKey,
                                         String objectKey, String idKey, String kind) {
        Map<?, ?> nested = map(output.get(objectKey));
        Long argument = positiveLong(arguments(call).get(argumentKey));
        return nested != null && argument != null && Objects.equals(argument, positiveLong(nested.get(idKey)))
                ? new Observation(kind, 1) : null;
    }

    private boolean matchesRequiredLong(AgentRuntimeToolCall call, Map<String, Object> output,
                                        String argumentKey, String outputKey) {
        Long argument = positiveLong(arguments(call).get(argumentKey));
        return argument != null && Objects.equals(argument, positiveLong(output.get(outputKey)));
    }

    private boolean matchesOptionalLong(AgentRuntimeToolCall call, Map<String, Object> output, String key) {
        Object argument = arguments(call).get(key);
        return argument == null || Objects.equals(nonNegativeLong(argument), nonNegativeLong(output.get(key)));
    }

    private boolean matchesRequiredText(AgentRuntimeToolCall call, Map<String, Object> output, String key) {
        String argument = text(arguments(call).get(key));
        return argument != null && Objects.equals(argument, text(output.get(key)));
    }

    private boolean matchesOptionalText(AgentRuntimeToolCall call, Map<String, Object> output, String key) {
        Object argument = arguments(call).get(key);
        return argument == null || Objects.equals(text(argument), text(output.get(key)));
    }

    private Map<String, Object> arguments(AgentRuntimeToolCall call) {
        return call == null || call.getArguments() == null ? Map.of() : call.getArguments();
    }

    private String text(Object value) {
        return value instanceof String text && !text.isBlank() ? text : null;
    }

    private Observation positiveNumber(Map<String, Object> output, String key, String kind) {
        Long count = positiveLong(output.get(key));
        return count != null && count <= Integer.MAX_VALUE ? new Observation(kind, count.intValue()) : null;
    }

    private Observation booleanObservation(Map<String, Object> output, String key, String kind) {
        return output.get(key) instanceof Boolean ? new Observation(kind, 1) : null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> object(String json) {
        try {
            Object value = QUIET_JSON.readValue(json, Object.class);
            return value instanceof Map<?, ?> map ? (Map<String, Object>) map : null;
        } catch (IOException | RuntimeException ignored) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> cast(Map<?, ?> value) {
        return value == null ? null : (Map<String, Object>) value;
    }

    private Map<?, ?> map(Object value) {
        return value instanceof Map<?, ?> mapped ? mapped : null;
    }

    private List<?> list(Object value) {
        return value instanceof List<?> values ? values : null;
    }

    private Integer positiveInteger(Object value) {
        Long converted = positiveLong(value);
        return converted != null && converted <= Integer.MAX_VALUE ? converted.intValue() : null;
    }

    private Long positiveLong(Object value) {
        Long converted = nonNegativeLong(value);
        return converted != null && converted > 0 ? converted : null;
    }

    private Long nonNegativeLong(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }
        long converted = number.longValue();
        return converted >= 0 && number.doubleValue() == converted ? converted : null;
    }

    private int add(int left, Integer right) {
        return right == null || right > Integer.MAX_VALUE - left ? -1 : left + right;
    }

    record Observation(String kind, Integer count) {
    }

    private enum RowShape {
        MONITOR {
            @Override
            boolean valid(Object value) {
                return mapRow(value) != null && positive(mapRow(value).get("monitorId"));
            }
        },
        TRACE {
            @Override
            boolean valid(Object value) {
                return mapRow(value) != null && nonBlank(mapRow(value).get("traceId"));
            }
        },
        ENTITY {
            @Override
            boolean valid(Object value) {
                Map<?, ?> row = mapRow(value);
                Map<?, ?> entity = row == null ? null : mapRow(row.get("entity"));
                return entity != null && positive(entity.get("id"));
            }
        },
        LOG {
            @Override
            boolean valid(Object value) {
                Map<?, ?> row = mapRow(value);
                return row != null && positive(row.get("timeUnixNano")) && row.containsKey("body");
            }
        },
        COLLECTOR {
            @Override
            boolean valid(Object value) {
                return mapRow(value) != null && nonBlank(mapRow(value).get("name"));
            }
        },
        ALERT {
            @Override
            boolean valid(Object value) {
                return mapRow(value) != null && positive(mapRow(value).get("id"));
            }
        },
        TOPOLOGY_NODE {
            @Override
            boolean valid(Object value) {
                Map<?, ?> row = mapRow(value);
                return row != null && (positive(row.get("entityId")) || nonBlank(row.get("id")));
            }
        },
        SPAN {
            @Override
            boolean valid(Object value) {
                return mapRow(value) != null && nonBlank(mapRow(value).get("spanId"));
            }
        },
        COLLECTED_METRIC {
            @Override
            boolean valid(Object value) {
                Map<?, ?> row = mapRow(value);
                Integer rowCount = row == null ? null : positiveIntegerValue(row.get("rowCount"));
                Long valueRows = row == null ? null : nonNegativeLongValue(row.get("valueRows"));
                return row != null && nonBlank(row.get("metrics")) && rowCount != null
                        && valueRows != null && valueRows == rowCount.longValue();
            }
        },
        VALUE_ROW {
            @Override
            boolean valid(Object value) {
                Map<?, ?> row = mapRow(value);
                List<?> values = row == null ? null : value instanceof Map<?, ?>
                        && row.get("values") instanceof List<?> list ? list : null;
                return values != null && !values.isEmpty() && values.stream().allMatch(VALUE::valid);
            }
        },
        VALUE {
            @Override
            boolean valid(Object value) {
                Map<?, ?> row = mapRow(value);
                return row != null && row.values().stream().anyMatch(RowShape::nonBlank);
            }
        },
        HISTORY_POINT {
            @Override
            boolean valid(Object value) {
                Map<?, ?> row = mapRow(value);
                return row != null && positive(row.get("time"))
                        && List.of("origin", "mean", "median", "min", "max").stream()
                        .anyMatch(key -> nonBlank(row.get(key)));
            }
        },
        OBJECT {
            @Override
            boolean valid(Object value) {
                Map<?, ?> row = mapRow(value);
                return row != null && !row.isEmpty();
            }
        };

        abstract boolean valid(Object value);

        private static Map<?, ?> mapRow(Object value) {
            return value instanceof Map<?, ?> mapped ? mapped : null;
        }

        private static boolean positive(Object value) {
            return value instanceof Number number && number.longValue() > 0
                    && number.doubleValue() == number.longValue();
        }

        private static boolean nonBlank(Object value) {
            return value instanceof String text && !text.isBlank();
        }

        private static Long nonNegativeLongValue(Object value) {
            if (!(value instanceof Number number)) {
                return null;
            }
            long converted = number.longValue();
            return converted >= 0 && number.doubleValue() == converted ? converted : null;
        }

        private static Integer positiveIntegerValue(Object value) {
            Long converted = nonNegativeLongValue(value);
            return converted != null && converted > 0 && converted <= Integer.MAX_VALUE
                    ? converted.intValue() : null;
        }
    }
}
