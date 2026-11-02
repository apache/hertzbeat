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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Typed editable-state hashes and independent native readback receipts; snapshot checks are not
 * atomic CAS.
 */
public final class AgentAlertInhibitWriteProof {
    private AgentAlertInhibitWriteProof() {}

    public static Map<String, Object> fields(Object value) {
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
        var result = new LinkedHashMap<String, Object>();
        for (String name : List.of("name", "sourceLabels", "targetLabels", "equalLabels", "enable"))
            result.put(name, row.get(name));
        return result;
    }

    public static String contentHash(Object value) {
        return AgentToolPayloadHasher.normalizedArgumentsHash(fields(value));
    }

    public static String sourceHash(Object value) {
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
        return AgentToolPayloadHasher.normalizedArgumentsHash(
                Map.of("id", row.get("id"), "configuration", fields(value)));
    }

    public static void requireSource(Object value, String source) {
        if (source == null || !source.matches("[a-f0-9]{64}") || !source.equals(sourceHash(value)))
            throw new IllegalStateException(
                    "ALERT_INHIBIT_SOURCE_CHANGED_OR_UNVERIFIED_BEFORE_WRITE");
    }

    public static Map<String, Object> receipt(
            String tool, long id, Map<String, Object> args, String postHash, boolean absent) {
        return Map.of(
                "version",
                "alert-inhibit-write.v1",
                "toolName",
                tool,
                "id",
                id,
                "boundArgumentsHash",
                AgentAlertRuleWriteProof.argumentHash(args),
                "postReadHash",
                postHash,
                "absent",
                absent,
                "verified",
                true,
                "atomicVersionPrecondition",
                false);
    }

    public static void guard(String tool, Map<String, Object> args) {
        var context =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport.invocation();
        var r = context.getRequest();
        var row = context.getLedgerCall();
        String h = AgentToolPayloadHasher.normalizedArgumentsHash(args);
        boolean approved =
                "APPROVED".equals(row.getApprovalStatus())
                        ? "APPROVED".equals(r.getApprovalStatus())
                                && r.getApprovalId() != null
                                && Objects.equals(r.getApprovalId(), row.getApprovalId())
                                && Objects.equals(
                                        r.getActor().getType(), row.getApprovalActorType())
                                && Objects.equals(r.getActor().getId(), row.getApprovalActorId())
                        : "NOT_REQUIRED".equals(row.getApprovalStatus())
                                && r.getApprovalId() == null
                                && (r.getApprovalStatus() == null
                                        || "NOT_REQUIRED".equals(r.getApprovalStatus()));
        if (!tool.equals(r.getToolName())
                || !tool.equals(row.getToolName())
                || !h.equals(row.getInputHash())
                || !h.equals(AgentToolPayloadHasher.normalizedArgumentsHash(r.getArguments()))
                || !"RUNNING".equals(row.getStatus())
                || !approved
                || !Objects.equals(r.getSessionUid(), row.getSessionUid())
                || !Objects.equals(r.getRunId(), row.getRunId())
                || !Objects.equals(r.getRunUid(), row.getRunUid())
                || !Objects.equals(r.getRunSessionId(), row.getSessionId())
                || !Objects.equals(r.getToolCallId(), row.getToolCallId())
                || !r.getExecutionGuard().getAsBoolean())
            throw new IllegalStateException(
                    "Exact admitted inhibition policy invocation is required");
    }
}
