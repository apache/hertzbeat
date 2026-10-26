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

import java.util.List;
import java.util.Map;

/** Owner-scoped, non-secret batch projection shared by live events and durable reload. */
public record AgentBatchProgress(
        String version,
        String batchUid,
        String planHash,
        String runUid,
        int segment,
        String resumeFromRunUid,
        String runStatus,
        String stage,
        String operation,
        int total,
        int verified,
        int pending,
        int reviewRequired,
        int toolCalls,
        int toolBudget,
        String nextAction,
        String actionReason,
        long observedAt,
        List<ItemView> items) {
    /** Frozen request and per-item evidence reference; never editable continuation input. */
    public record ItemView(
            String id,
            String name,
            String target,
            Map<String, Object> arguments,
            String status,
            String monitorId,
            String reason,
            String toolCallId,
            String approvalId,
            String approvalTool,
            String receiptKind) {}

    static AgentBatchProgress from(
            String rootRunUid,
            String runUid,
            String resumeFromRunUid,
            int segment,
            String status,
            AgentTaskAssessment.Goal goal,
            AgentMonitorBatch batch,
            int calls,
            int budget,
            String action,
            String reason) {
        boolean active = "CREATED".equals(status) || "RUNNING".equals(status);
        String stage =
                active
                        ? batch.waitingApproval() ? "WAITING_APPROVAL" : "RUNNING"
                        : batch.finished()
                                ? "COMPLETE"
                                : batch.reviewRequired() ? "REVIEW_REQUIRED" : "PAUSED";
        var items =
                batch.snapshot().items().stream()
                        .map(
                                item ->
                                        new ItemView(
                                                item.id(),
                                                item.arguments().get("name") instanceof String name
                                                        ? name
                                                        : null,
                                                target(item.arguments()),
                                                viewArguments(item.arguments()),
                                                batch.displayStatus(item),
                                                item.resourceId() == null
                                                        ? null
                                                        : item.resourceId().toString(),
                                                item.reason(),
                                                batch.writeCallId(item.id()),
                                                batch.approvalId(item.id()),
                                                batch.approvalTool(item.id()),
                                                "STATE_RECONCILED".equals(item.reason())
                                                        ? "STATE_READBACK"
                                                        : batch.hasReceipt(item.id())
                                                                ? "NATIVE_RECEIPT"
                                                                : item.status()
                                                                                == AgentMonitorBatch
                                                                                        .Status
                                                                                        .MATCHED_REVIEW
                                                                        ? "MATCH_ONLY"
                                                                        : "NONE"))
                        .toList();
        int review =
                (int)
                        items.stream()
                                .filter(
                                        item ->
                                                List.of(
                                                                "UNCERTAIN",
                                                                "FAILED",
                                                                "MATCHED_REVIEW",
                                                                "UNRESOLVED_REVIEW")
                                                        .contains(item.status()))
                                .count();
        return new AgentBatchProgress(
                "monitor-batch-progress.v1",
                rootRunUid,
                batch.snapshot().planHash(),
                runUid,
                segment,
                resumeFromRunUid,
                status,
                stage,
                goal.operation().name(),
                items.size(),
                batch.verifiedCount(),
                items.size() - batch.verifiedCount() - review,
                review,
                calls,
                budget,
                action,
                reason,
                System.currentTimeMillis(),
                items);
    }

    private static Map<String, Object> viewArguments(Map<String, Object> arguments) {
        Map<String, Object> view = new java.util.LinkedHashMap<>();
        arguments.forEach((key, value) -> view.put(key, viewValue(value)));
        return view;
    }

    private static Object viewValue(Object value) {
        if (value instanceof Long id) {
            return id.toString();
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> view = new java.util.LinkedHashMap<>();
            map.forEach((key, item) -> view.put(String.valueOf(key), viewValue(item)));
            return view;
        }
        if (value instanceof List<?> list) {
            return list.stream().map(AgentBatchProgress::viewValue).toList();
        }
        return value;
    }

    private static String target(Map<String, Object> arguments) {
        if (!(arguments.get("params") instanceof Map<?, ?> params)) {
            return null;
        }
        String host = String.valueOf(params.get("host"));
        if (host.contains(":") && !host.startsWith("[")) {
            host = "[" + host + "]";
        }
        return (Boolean.parseBoolean(String.valueOf(params.get("ssl"))) ? "https://" : "http://")
                + host
                + ":"
                + params.get("port")
                + (params.get("uri") == null ? "/" : params.get("uri"));
    }
}
