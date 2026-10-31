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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Native receiver configuration only: no secret input, credential mutation or notification
 * delivery.
 */
final class AgentReceiverMutationSemantics {
    private static final Set<String> TOOLS =
            Set.of(
                    "notice.receiver_create",
                    "notice.receiver_update_metadata",
                    "notice.receiver_delete");
    private static final Set<String> METADATA =
            Set.of(
                    "phone",
                    "email",
                    "tgUserId",
                    "tgMessageThreadId",
                    "userId",
                    "chatId",
                    "partyId",
                    "tagId",
                    "discordChannelId",
                    "hookAuthType",
                    "appId",
                    "corpId",
                    "agentId",
                    "larkReceiveType",
                    "smnProjectId",
                    "smnRegion",
                    "smnTopicUrn",
                    "ntfyTopic",
                    "wpushChannel",
                    "wpushTopicCode");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.valid()
                    || !goal.changesResources()
                    || !"notice_receiver".equals(goal.resourceType())
                    || !Integer.valueOf(1).equals(goal.expectedCount())) return false;
            boolean create = tool.endsWith("_create");
            boolean delete = tool.endsWith("_delete");
            if (goal.operation()
                            != (create
                                    ? AgentTaskAssessment.Operation.CREATE
                                    : delete
                                            ? AgentTaskAssessment.Operation.DELETE
                                            : AgentTaskAssessment.Operation.UPDATE)
                    || (create
                            ? !goal.resourceIds().isEmpty()
                            : !goal.resourceIds()
                                    .equals(
                                            List.of(
                                                    AgentLabelMutationSemantics.id(
                                                            args.get("id")))))) return false;
            var changes = goal.expectedChanges();
            if (delete) return args.keySet().equals(Set.of("id")) && changes.isEmpty();
            if (create)
                return args.keySet().equals(Set.of("name", "type", "destination"))
                        && changes.keySet().equals(Set.of("name", "type", "destination"))
                        && byteValue(args.get("type")) == byteValue(changes.get("type"))
                        && byteValue(args.get("type")) <= 1
                        && same(args.get("name"), changes.get("name"))
                        && same(args.get("destination"), changes.get("destination"));
            if (!Set.of("id", "name", "fields").containsAll(args.keySet())
                    || !(args.get("fields") instanceof Map<?, ?> fields)
                    || !METADATA.containsAll(fields.keySet())) return false;
            Map<String, Object> expected = new LinkedHashMap<>();
            fields.forEach((key, value) -> expected.put(String.valueOf(key), value));
            if (args.get("name") != null) expected.put("name", args.get("name"));
            return !expected.isEmpty() && same(expected, changes);
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> output, String trustedHash) {
        try {
            if (!supports(tool)
                    || trustedHash == null
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(args).equals(trustedHash))
                return false;
            long id = AgentLabelMutationSemantics.id(output.get("id"));
            if (!tool.endsWith("_create") && id != AgentLabelMutationSemantics.id(args.get("id")))
                return false;
            if (tool.endsWith("_delete"))
                return "deleted".equals(output.get("status")) && output.get("receiver") == null;
            if (!(output.get("receiver") instanceof Map<?, ?> receiver)
                    || id != AgentLabelMutationSemantics.id(receiver.get("id"))
                    || !AgentSharedConfigurationReadSemantics.receiver(receiver)) return false;
            if (tool.endsWith("_create"))
                return "created".equals(output.get("status"))
                        && byteValue(args.get("type")) <= 1
                        && byteValue(args.get("type")) == byteValue(receiver.get("type"))
                        && same(args.get("name"), receiver.get("name"))
                        && receiver.get("options") instanceof Map<?, ?> options
                        && same(
                                args.get("destination"),
                                options.get(byteValue(args.get("type")) == 0 ? "phone" : "email"));
            if (!"updated".equals(output.get("status"))
                    || !(args.get("fields") instanceof Map<?, ?> fields)
                    || !METADATA.containsAll(fields.keySet())
                    || !(receiver.get("options") instanceof Map<?, ?> options)
                    || args.get("name") != null && !same(args.get("name"), receiver.get("name")))
                return false;
            for (var e : fields.entrySet()) {
                Object actual = options.get(e.getKey());
                if (Set.of("agentId", "larkReceiveType").contains(e.getKey())) {
                    if (new java.math.BigDecimal(e.getValue().toString()).longValueExact()
                            != new java.math.BigDecimal(String.valueOf(actual)).longValueExact())
                        return false;
                } else if (!same(e.getValue(), actual)) return false;
            }
            return true;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    private static int byteValue(Object value) {
        if (!(value instanceof Number)
                && !(value instanceof String s && s.matches("0|[1-9][0-9]?")))
            throw new IllegalArgumentException();
        int n = new java.math.BigDecimal(value.toString()).intValueExact();
        if (n < 0 || n > 16) throw new IllegalArgumentException();
        return n;
    }

    private static boolean same(Object a, Object b) {
        return AgentToolPayloadHasher.canonicalArgumentsJson(
                        java.util.Collections.singletonMap("v", a))
                .equals(
                        AgentToolPayloadHasher.canonicalArgumentsJson(
                                java.util.Collections.singletonMap("v", b)));
    }
}
