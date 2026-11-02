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

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.apache.hertzbeat.common.util.JsonUtil;
import tools.jackson.databind.JsonNode;

/** A bounded union of identical-scope monitor pages, shared by completion policy and ledger summaries. */
public final class AgentMonitorPageCoverage {
    private String scope;
    private Map<String, Object> firstQuery;
    private long total = -1;
    private int size;
    private boolean inconsistent;
    private final Set<Integer> pages = new HashSet<>();
    private final Set<String> ids = new HashSet<>();
    private final Set<String> calls = new HashSet<>();

    public void observe(String callId, Map<String, Object> arguments, String output) {
        try {
            JsonNode value = JsonUtil.fromJson(output, JsonNode.class);
            if (value == null || !value.path("content").isArray() || !value.path("totalElements").isIntegralNumber()) {
                return;
            }
            int page = value.path("pageIndex").asInt(integer(arguments.get("pageIndex"), 0));
            int pageSize = value.path("pageSize").asInt(integer(arguments.get("pageSize"), 20));
            long count = value.path("totalElements").asLong(-1);
            if (page < 0 || pageSize < 1 || pageSize > 100 || count < 0 || count > 10000 || pages.size() >= 100) {
                return;
            }
            Map<String, Object> query = new TreeMap<>(arguments);
            query.remove("pageIndex");
            query.values().removeIf(java.util.Objects::isNull);
            query.remove("includeStats");
            query.putIfAbsent("status", "all");
            query.putIfAbsent("sort", "gmtCreate");
            query.putIfAbsent("order", "desc");
            query.put("pageSize", pageSize);
            String identity = JsonUtil.toJson(query);
            if (scope == null) {
                if (page != 0) {
                    return;
                }
                scope = identity;
                firstQuery = new LinkedHashMap<>(query);
                total = count;
                size = pageSize;
            }
            if (!scope.equals(identity)) {
                return;
            }
            inconsistent |= total != count || size != pageSize || value.path("partial").asBoolean()
                    || value.path("truncated").asBoolean();
            long expected = Math.min(size, Math.max(0, total - (long) page * size));
            inconsistent |= value.path("content").size() != expected || page >= pageCount();
            if (!pages.add(page)) {
                return;
            }
            if (callId != null) {
                calls.add(callId);
            }
            for (JsonNode row : value.path("content")) {
                JsonNode id = row.has("monitorId") ? row.path("monitorId") : row.path("id");
                if (!id.isValueNode() || id.isNull() || id.asText().isBlank() || !ids.add(id.asText())) {
                    inconsistent = true;
                }
            }
        } catch (RuntimeException invalid) {
            inconsistent = true;
        }
    }

    public boolean complete() {
        if (scope == null || inconsistent || ids.size() != total) {
            return false;
        }
        int count = pageCount();
        for (int page = 0; page < count; page++) {
            if (!pages.contains(page)) {
                return false;
            }
        }
        return true;
    }

    public long total() {
        return total;
    }

    public Set<String> coveredCalls() {
        return complete() ? Set.copyOf(calls) : Set.of();
    }

    Map<String, Object> nextQuery() {
        if (scope == null || inconsistent || complete()) {
            return Map.of();
        }
        for (int page = 0; page < pageCount(); page++) {
            if (!pages.contains(page)) {
                Map<String, Object> next = new LinkedHashMap<>(firstQuery);
                next.put("pageIndex", page);
                return next;
            }
        }
        return Map.of();
    }

    String summary() {
        return "monitor.query pages: unique=" + ids.size() + " / " + (total < 0 ? "?" : total)
                + "; complete=" + complete() + "; consistent=" + !inconsistent
                + "; snapshot pages do not establish atomic or temporal coverage.";
    }

    private int pageCount() {
        return (int) Math.max(1, (total + size - 1) / size);
    }

    private static int integer(Object value, int fallback) {
        return value instanceof Number number ? number.intValue() : fallback;
    }
}
