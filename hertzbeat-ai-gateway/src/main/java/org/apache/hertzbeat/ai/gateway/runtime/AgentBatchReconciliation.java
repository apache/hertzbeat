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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Bounded readback checks; a matching lookup alone never proves an uncertain create happened. */
final class AgentBatchReconciliation {
    private static final ObjectMapper JSON = new ObjectMapper();

    private AgentBatchReconciliation() {}

    static Map<String, Object> object(String text) {
        try {
            return text == null
                    ? null
                    : JSON.readValue(text, new TypeReference<Map<String, Object>>() {});
        } catch (Exception invalid) {
            return null;
        }
    }

    static Long positiveId(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }
        try {
            long id = new java.math.BigDecimal(number.toString()).longValueExact();
            return id > 0 ? id : null;
        } catch (ArithmeticException | NumberFormatException invalid) {
            return null;
        }
    }

    static Long uniqueCandidate(AgentMonitorBatch.Item item, Map<String, Object> output) {
        if (output == null
                || !AgentMonitorMutationSemantics.same(1, output.get("totalElements"))
                || !(output.get("content") instanceof List<?> rows)
                || rows.size() != 1
                || !(rows.getFirst() instanceof Map<?, ?> row)
                || !java.util.Objects.equals(item.arguments().get("name"), row.get("name"))
                || !"website".equals(row.get("app"))) {
            return null;
        }
        return positiveId(row.get("monitorId"));
    }

    static AgentMonitorMutationReceipt.Target expected(
            AgentMonitorBatch.Item item, AgentTaskAssessment.Operation operation, Long id) {
        if (id == null) {
            return null;
        }
        if (operation == AgentTaskAssessment.Operation.CREATE) {
            Map<String, String> parameters = new LinkedHashMap<>();
            ((Map<?, ?>) item.arguments().get("params"))
                    .forEach((k, v) -> parameters.put(k.toString(), v.toString()));
            return new AgentMonitorMutationReceipt.Target(
                    id,
                    Map.of(
                            "name",
                            item.arguments().get("name"),
                            "app",
                            "website",
                            "intervals",
                            item.arguments().get("intervals")),
                    parameters);
        }
        if (operation == AgentTaskAssessment.Operation.UPDATE) {
            Map<String, Object> fields = new LinkedHashMap<>();
            ((Map<?, ?>) item.arguments().get("updates"))
                    .forEach((k, v) -> fields.put(k.toString(), v));
            return new AgentMonitorMutationReceipt.Target(id, fields, Map.of());
        }
        return new AgentMonitorMutationReceipt.Target(
                id,
                Map.of(
                        "collectionState",
                        operation == AgentTaskAssessment.Operation.PAUSE ? "paused" : "enabled"),
                Map.of());
    }

    static boolean matches(AgentMonitorMutationReceipt.Target target, Map<String, Object> output) {
        return target != null
                && output != null
                && AgentMonitorMutationSemantics.matchesReadback(target, output);
    }
}
