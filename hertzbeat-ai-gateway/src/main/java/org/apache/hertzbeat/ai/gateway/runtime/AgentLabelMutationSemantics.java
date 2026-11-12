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

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Exact, single-label operations; native readback and durable callback provenance are mandatory.
 */
final class AgentLabelMutationSemantics {
    static boolean supports(String tool) {
        return Set.of("label.create", "label.update", "label.delete").contains(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.valid()
                    || !goal.changesResources()
                    || !"label".equals(goal.resourceType())
                    || !Integer.valueOf(1).equals(goal.expectedCount())) return false;
            boolean create = tool.endsWith(".create");
            boolean delete = tool.endsWith(".delete");
            if (goal.operation()
                    != (create
                            ? AgentTaskAssessment.Operation.CREATE
                            : delete
                                    ? AgentTaskAssessment.Operation.DELETE
                                    : AgentTaskAssessment.Operation.UPDATE)) return false;
            if (!Set.of("name", "value", "description")
                    .containsAll(goal.expectedChanges().keySet())) return false;
            if (create
                    ? !goal.resourceIds().isEmpty()
                    : !goal.resourceIds().equals(java.util.List.of(id(args.get("labelId")))))
                return false;
            if (delete)
                return goal.expectedChanges().isEmpty()
                        && Set.of("labelId", "reason").containsAll(args.keySet())
                        && args.get("reason") instanceof String reason
                        && !reason.isBlank();
            if (!(args.get("name") instanceof String name)
                    || name.isBlank()
                    || !(create
                                    ? Set.of("name", "value", "description")
                                    : Set.of("labelId", "name", "value", "description"))
                            .containsAll(args.keySet())
                    || create && !goal.expectedChanges().containsKey("name")) return false;
            return goal.expectedChanges().entrySet().stream()
                    .allMatch(e -> java.util.Objects.equals(e.getValue(), args.get(e.getKey())));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> output, String trustedHash) {
        try {
            if (!supports(tool)
                    || !"label-mutation.v1".equals(output.get("receiptVersion"))
                    || !tool.equals(output.get("toolName"))
                    || !Boolean.TRUE.equals(output.get("verified"))
                    || trustedHash == null
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(args).equals(trustedHash))
                return false;
            var canonical = new HashMap<String, Object>();
            args.forEach(
                    (key, value) -> {
                        if (value != null) canonical.put(key, value);
                    });
            if (!AgentToolPayloadHasher.normalizedArgumentsHash(canonical)
                    .equals(output.get("inputHash"))) return false;
            long identity = id(output.get("labelId"));
            if (!tool.endsWith(".create") && identity != id(args.get("labelId"))) return false;
            if (tool.endsWith(".delete"))
                return Boolean.TRUE.equals(output.get("deleted"))
                        && id(output.get("deletedId")) == identity;
            if (!Boolean.FALSE.equals(output.get("deleted"))
                    || !Boolean.FALSE.equals(output.get("partial"))
                    || !Boolean.TRUE.equals(output.get("redactionApplied"))
                    || !(output.get("data") instanceof Map<?, ?> row)
                    || id(row.get("id")) != identity
                    || !args.get("name").equals(row.get("name"))) return false;
            if (!(row.get("type") instanceof Number nativeType)) return false;
            long type = new java.math.BigDecimal(nativeType.toString()).longValueExact();
            return type >= 0
                    && type <= 127
                    && (!tool.endsWith(".create") || type == 1)
                    && (!args.containsKey("value")
                            || args.get("value") == null
                            || java.util.Objects.equals(args.get("value"), row.get("tagValue")))
                    && (!args.containsKey("description")
                            || args.get("description") == null
                            || java.util.Objects.equals(
                                    args.get("description"), row.get("description")));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static long id(Object value) {
        if (!(value instanceof Number)) throw new IllegalArgumentException();
        long n = new java.math.BigDecimal(value.toString()).longValueExact();
        if (n <= 0) throw new IllegalArgumentException();
        return n;
    }
}
