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

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertGroupWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Exact original grouping policy intent; independent native readback and snapshot preservation. */
final class AgentAlertGroupMutationSemantics {
    private static final Set<String> FIELDS =
            Set.of("name", "groupLabels", "groupWait", "groupInterval", "repeatInterval", "enable");

    static boolean supports(String tool) {
        return Set.of("alert_group.create", "alert_group.update", "alert_group.delete")
                .contains(tool);
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.valid()
                    || !goal.changesResources()
                    || !"alert_group".equals(goal.resourceType())
                    || !Integer.valueOf(1).equals(goal.expectedCount())
                    || !FIELDS.containsAll(goal.expectedChanges().keySet())) return false;
            boolean create = tool.endsWith(".create");
            boolean delete = tool.endsWith(".delete");
            if (goal.operation()
                    != (create
                            ? AgentTaskAssessment.Operation.CREATE
                            : delete
                                    ? AgentTaskAssessment.Operation.DELETE
                                    : AgentTaskAssessment.Operation.UPDATE)) return false;
            if (create
                    ? !goal.resourceIds().isEmpty()
                    : !goal.resourceIds()
                            .equals(List.of(AgentLabelMutationSemantics.id(args.get("groupId")))))
                return false;
            if (!create
                    && (!(args.get("sourceHash") instanceof String hash)
                            || !hash.matches("[a-f0-9]{64}"))) return false;
            if (delete)
                return args.keySet().equals(Set.of("groupId", "reason", "sourceHash"))
                        && goal.expectedChanges().isEmpty()
                        && args.get("reason") instanceof String reason
                        && !reason.isBlank();
            if (!args.keySet()
                            .equals(
                                    create
                                            ? Set.of("configuration")
                                            : Set.of("groupId", "configuration", "sourceHash"))
                    || !(args.get("configuration") instanceof Map<?, ?> config)
                    || !config.keySet().equals(FIELDS)) return false;
            if (create
                    && (!(config.get("name") instanceof String name)
                            || !name.equals(goal.expectedChanges().get("name")))) return false;
            for (var e : goal.expectedChanges().entrySet())
                if (!same(e.getValue(), config.get(e.getKey()))) return false;
            return true;
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> output, String hash) {
        try {
            boolean delete = tool.endsWith(".delete");
            Map<String, Object> row =
                    delete
                            ? output
                            : Boolean.FALSE.equals(output.get("partial"))
                                            && Boolean.TRUE.equals(output.get("redactionApplied"))
                                            && output.get("data") instanceof Map<?, ?> data
                                    ? (Map<String, Object>) data
                                    : null;
            if (!supports(tool)
                    || row == null
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(args).equals(hash)
                    || !(row.get("mutationReceipt") instanceof Map<?, ?> proof)
                    || !"alert-group-write.v1".equals(proof.get("version"))
                    || !tool.equals(proof.get("toolName"))
                    || !Boolean.TRUE.equals(proof.get("verified"))
                    || !Boolean.FALSE.equals(proof.get("atomicVersionPrecondition"))
                    || !AgentAlertRuleWriteProof.argumentHash(args)
                            .equals(proof.get("boundArgumentsHash"))) return false;
            long id = AgentLabelMutationSemantics.id(proof.get("id"));
            if (!tool.endsWith(".create")
                    && id != AgentLabelMutationSemantics.id(args.get("groupId"))) return false;
            if (delete)
                return Boolean.TRUE.equals(proof.get("absent"))
                        && "absent".equals(proof.get("postReadHash"))
                        && id == AgentLabelMutationSemantics.id(row.get("deletedId"));
            return Boolean.FALSE.equals(proof.get("absent"))
                    && id == AgentLabelMutationSemantics.id(row.get("id"))
                    && AgentAlertGroupWriteProof.contentHash(row).equals(proof.get("postReadHash"));
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return false;
        }
    }

    static long identity(Map<String, Object> output) {
        Map<?, ?> row = output.get("data") instanceof Map<?, ?> data ? data : output;
        return AgentLabelMutationSemantics.id(((Map<?, ?>) row.get("mutationReceipt")).get("id"));
    }

    static boolean preserves(
            AgentTaskAssessment.Goal goal,
            String tool,
            Map<String, Object> args,
            Map<String, Object> source) {
        try {
            if (!Boolean.FALSE.equals(source.get("partial"))
                    || !Boolean.TRUE.equals(source.get("redactionApplied"))
                    || !(source.get("data") instanceof Map<?, ?> row)
                    || !args.get("sourceHash").equals(source.get("sourceHash"))
                    || !args.get("sourceHash").equals(AgentAlertGroupWriteProof.sourceHash(row))
                    || AgentLabelMutationSemantics.id(row.get("id"))
                            != AgentLabelMutationSemantics.id(args.get("groupId"))) return false;
            if (tool.endsWith(".delete")) return true;
            var config = (Map<?, ?>) args.get("configuration");
            for (String field : FIELDS)
                if (!goal.expectedChanges().containsKey(field)
                        && !same(row.get(field), config.get(field))) return false;
            return true;
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return false;
        }
    }

    private static boolean same(Object a, Object b) {
        return AgentToolPayloadHasher.normalizedArgumentsHash(Collections.singletonMap("v", a))
                .equals(
                        AgentToolPayloadHasher.normalizedArgumentsHash(
                                Collections.singletonMap("v", b)));
    }
}
