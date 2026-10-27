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

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitWriteProof;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Native policy metadata only, never runtime suppression or notification evidence. */
final class AgentAlertInhibitReadSemantics {
    static boolean supports(String tool) {
        return Set.of("alert_inhibit.get", "alert_inhibit.list").contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> out) {
        try {
            if (!supports(call.getToolName())
                    || !"alert-inhibit-read.v1".equals(out.get("readVersion"))
                    || !Boolean.FALSE.equals(out.get("partial"))
                    || !Boolean.TRUE.equals(out.get("redactionApplied"))
                    || !(out.get("data") instanceof Map<?, ?> data)) return null;
            var args = call.getArguments();
            if (call.getToolName().endsWith(".get"))
                return args.keySet().equals(Set.of("inhibitId"))
                                && row(data)
                                && id(data.get("id")) == id(args.get("inhibitId"))
                                && AgentAlertInhibitWriteProof.sourceHash(data)
                                        .equals(out.get("sourceHash"))
                        ? observation(1)
                        : null;
            if (!Set.of("ids", "search", "pageIndex", "pageSize").containsAll(args.keySet()))
                return null;
            long page = number(args.get("pageIndex") == null ? 0 : args.get("pageIndex"));
            long size = number(args.get("pageSize") == null ? 20 : args.get("pageSize"));
            long total = number(data.get("totalElements"));
            if (page < 0
                    || page > Integer.MAX_VALUE
                    || size < 1
                    || size > 100
                    || total < 0
                    || total > Integer.MAX_VALUE
                    || number(data.get("number")) != page
                    || number(data.get("size")) != size
                    || number(data.get("totalPages"))
                            != (total == 0 ? 0 : (total + size - 1) / size)
                    || !(data.get("content") instanceof List<?> content)
                    || content.size() != Math.min(size, Math.max(0, total - page * size)))
                return null;
            Set<Long> filter = new HashSet<>();
            if (args.get("ids") != null) {
                if (!(args.get("ids") instanceof List<?> ids) || ids.isEmpty() || ids.size() > 100)
                    return null;
                for (Object value : ids) if (!filter.add(id(value))) return null;
                if (total > filter.size()) return null;
            }
            String search = "";
            if (args.get("search") != null) {
                if (!(args.get("search") instanceof String text) || text.trim().length() > 100)
                    return null;
                search = text.trim().toLowerCase(Locale.ROOT);
            }
            Set<Long> seen = new HashSet<>();
            for (Object v : content) {
                if (!(v instanceof Map<?, ?> item)
                        || !row(item)
                        || !seen.add(id(item.get("id")))
                        || !filter.isEmpty() && !filter.contains(id(item.get("id")))
                        || !((String) item.get("name")).toLowerCase(Locale.ROOT).contains(search))
                    return null;
            }
            return observation(content.size());
        } catch (RuntimeException invalid) {
            return null;
        }
    }

    private boolean row(Map<?, ?> data) {
        id(data.get("id"));
        return data.get("name") instanceof String name
                && !name.isBlank()
                && name.length() <= 256
                && !data.containsKey("error")
                && !Boolean.TRUE.equals(data.get("partial"))
                && data.get("enable") instanceof Boolean
                && labels(data.get("sourceLabels"))
                && labels(data.get("targetLabels"))
                && data.get("equalLabels") instanceof List<?> equal
                && equal.size() <= 100
                && equal.stream()
                        .allMatch(
                                v ->
                                        v instanceof String text
                                                && !text.isBlank()
                                                && text.length() <= 256);
    }

    // Legacy persisted metadata can have empty matchers; it is readable, not a valid write plan.
    private boolean labels(Object value) {
        return value instanceof Map<?, ?> map
                && map.size() <= 100
                && map.entrySet().stream()
                        .allMatch(
                                e ->
                                        e.getKey() instanceof String key
                                                && !key.isBlank()
                                                && e.getValue() instanceof String);
    }

    private long number(Object value) {
        if (!(value instanceof Number))
            throw new IllegalArgumentException("Numeric native value required");
        return new BigDecimal(value.toString()).longValueExact();
    }

    private long id(Object value) {
        long id = number(value);
        if (id <= 0) throw new IllegalArgumentException("Positive identity required");
        return id;
    }

    private AgentReadObservationClassifier.Observation observation(int count) {
        return new AgentReadObservationClassifier.Observation(
                "alert-inhibition-policy-metadata-rows", count);
    }
}
