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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * User JSON binds target data only after independent semantic authorization; it cannot invent an
 * intent.
 */
final class AgentExplicitWebsiteBatchInput {
    private static final com.fasterxml.jackson.databind.ObjectMapper JSON =
            com.fasterxml.jackson.databind.json.JsonMapper.builder()
                    .enable(
                            com.fasterxml.jackson.core.JsonParser.Feature
                                    .STRICT_DUPLICATE_DETECTION)
                    .enable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .build();

    private AgentExplicitWebsiteBatchInput() {}

    static AgentTaskAssessment.Goal bind(AgentTaskAssessment.Goal goal, String originalUserText) {
        if (goal == null
                || !goal.changesResources()
                || goal.operation() != AgentTaskAssessment.Operation.CREATE
                || !"monitor".equals(goal.resourceType())
                || originalUserText == null
                || !originalUserText.contains("\"items\"")) {
            return goal;
        }
        try {
            int start = originalUserText.indexOf('{');
            int end = originalUserText.lastIndexOf('}');
            if (start < 0 || end < start || end - start > 16000) {
                throw new IllegalArgumentException();
            }
            Object parsed =
                    JSON.readValue(originalUserText.substring(start, end + 1), Object.class);
            if (!(parsed instanceof Map<?, ?> body)) {
                throw new InputException("BODY_NOT_OBJECT");
            }
            if (!Set.of("items", "retryPreflightFailures").containsAll(body.keySet())) {
                throw new InputException("UNSUPPORTED_ROOT_FIELDS");
            }
            if (!(body.get("items") instanceof List<?> items)
                    || items.isEmpty()
                    || items.size() > 50) {
                throw new InputException("ITEM_COUNT_INVALID");
            }
            if (goal.expectedCount() == null || goal.expectedCount() != items.size()) {
                throw new InputException("SEMANTIC_COUNT_MISMATCH");
            }
            if (body.containsKey("retryPreflightFailures")
                    && !Boolean.FALSE.equals(body.get("retryPreflightFailures"))) {
                throw new InputException("RETRY_REQUIRES_FROZEN_CONTINUATION");
            }
            List<AgentTaskAssessment.CreateTarget> targets = new ArrayList<>();
            for (Object value : items) {
                if (!(value instanceof Map<?, ?> item)
                        || !Set.of("idempotencyKey", "name", "url", "intervals", "timeout")
                                .containsAll(item.keySet())
                        || !(item.get("name") instanceof String name)
                        || !(item.get("url") instanceof String url)
                        || item.containsKey("idempotencyKey")
                                && !(item.get("idempotencyKey") instanceof String)) {
                    throw new InputException("ITEM_FIELD_CONTRACT");
                }
                Integer interval = integer(item.get("intervals"));
                Integer timeout = item.get("timeout") == null ? null : integer(item.get("timeout"));
                targets.add(
                        new AgentTaskAssessment.CreateTarget(
                                name, url, interval, (String) item.get("idempotencyKey"), timeout));
            }
            var bound =
                    new AgentTaskAssessment.Goal(
                            goal.type(),
                            goal.operation(),
                            goal.resourceType(),
                            goal.expectedCount(),
                            goal.resourceIds(),
                            explicitSharedChanges(goal.expectedChanges(), items),
                            targets);
            var validation = new AgentMonitorBatch("explicit-native-input");
            validation.enableNativeBulk();
            if (bound.expectedCount() > 1) {
                validation.initialize(bound);
            } else {
                var target = targets.getFirst();
                if (!bound.valid()
                        || target.idempotencyKey() != null
                                && !target.idempotencyKey().matches("[A-Za-z0-9_.:-]{1,128}")) {
                    throw new IllegalArgumentException();
                }
                AgentMonitorBatch.createArguments(bound, target);
            }
            return bound;
        } catch (InputException invalid) {
            throw invalid;
        } catch (AgentMonitorBatch.PlanException invalid) {
            throw new InputException(invalid.rule());
        } catch (java.io.IOException invalid) {
            throw new InputException("MALFORMED_JSON");
        } catch (RuntimeException invalid) {
            throw new InputException("CANONICAL_PLAN_INVALID");
        }
    }

    static final class InputException extends IllegalArgumentException {
        private final String rule;

        InputException(String rule) {
            super("Explicit website batch input rejected: " + rule);
            this.rule = rule;
        }

        String rule() {
            return rule;
        }
    }

    /**
     * Full native items JSON is the parameter authority, not a lossy shared projection from a
     * model.
     */
    private static Map<String, Object> explicitSharedChanges(
            Map<String, Object> semantic, List<?> items) {
        var shared = new java.util.LinkedHashMap<>(semantic);
        // Every item explicitly declares intervals. URL declares its host/port/ssl/path completely.
        shared.remove("intervals");
        if (shared.get("params") instanceof Map<?, ?> supplied) {
            var remaining = new java.util.LinkedHashMap<String, Object>();
            boolean explicitTimeout =
                    items.stream()
                            .allMatch(
                                    v ->
                                            v instanceof Map<?, ?> item
                                                    && item.containsKey("timeout"));
            for (var entry : supplied.entrySet()) {
                String key = String.valueOf(entry.getKey());
                if (Set.of("host", "port", "ssl", "uri").contains(key)
                        || "timeout".equals(key) && explicitTimeout) {
                    continue;
                }
                remaining.put(key, entry.getValue());
            }
            if (remaining.isEmpty()) {
                shared.remove("params");
            } else {
                shared.put("params", remaining);
            }
        }
        return Map.copyOf(shared);
    }

    private static Integer integer(Object value) {
        if (!(value instanceof Number number)) {
            throw new IllegalArgumentException();
        }
        return new java.math.BigDecimal(number.toString()).intValueExact();
    }
}
