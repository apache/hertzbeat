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
import java.util.Map;

/**
 * Exact execution intent and native one-shot receipt; never treats a preview or success flag as
 * proof.
 */
final class AgentInlineCollectionSemantics {
    private AgentInlineCollectionSemantics() {}

    static boolean supports(String tool) {
        return "monitor.collection_detect".equals(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, Map<String, Object> args) {
        return goal != null
                && goal.valid()
                && goal.type() == AgentTaskAssessment.Type.CHANGE
                && goal.operation() == AgentTaskAssessment.Operation.EXECUTE
                && "monitor".equals(goal.resourceType())
                && Integer.valueOf(1).equals(goal.expectedCount())
                && goal.resourceIds().size() == 1
                && goal.expectedChanges().isEmpty()
                && validArguments(args)
                && goal.resourceIds().getFirst().equals(id(args.get("monitorId")))
                && args.get("planId") instanceof String plan
                && plan.matches("[a-f0-9-]{36}")
                && args.get("planHash") instanceof String hash
                && hash.matches("[a-f0-9]{64}");
    }

    static boolean receipt(Map<String, Object> args, Map<String, Object> data, String trustedHash) {
        return validArguments(args)
                && data != null
                && "inline-collection.v1".equals(data.get("receiptVersion"))
                && trustedHash != null
                && trustedHash.equals(AgentToolPayloadHasher.normalizedArgumentsHash(args))
                && trustedHash.equals(data.get("inputHash"))
                && Boolean.TRUE.equals(data.get("oneShot"))
                && Boolean.TRUE.equals(data.get("started"))
                && Boolean.TRUE.equals(data.get("verified"))
                && id(args.get("monitorId")) != null
                && id(args.get("monitorId")).equals(id(data.get("monitorId")))
                && java.util.Objects.equals(args.get("planId"), data.get("planId"))
                && java.util.Objects.equals(args.get("planHash"), data.get("planHash"));
    }

    private static boolean validArguments(Map<String, Object> args) {
        return args != null
                && args.size() == 3
                && id(args.get("monitorId")) != null
                && id(args.get("monitorId")) > 0
                && args.get("planId") instanceof String plan
                && plan.matches("[a-f0-9-]{36}")
                && args.get("planHash") instanceof String hash
                && hash.matches("[a-f0-9]{64}");
    }

    private static Long id(Object value) {
        try {
            return value instanceof Number number
                    ? new BigDecimal(number.toString()).longValueExact()
                    : null;
        } catch (ArithmeticException invalid) {
            return null;
        }
    }
}
