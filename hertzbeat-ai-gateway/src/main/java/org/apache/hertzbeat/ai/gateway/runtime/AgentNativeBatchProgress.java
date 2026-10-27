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

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatch;
import org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatchService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Adds already-durable per-item completion to the owner-verified frozen batch projection. */
@Service
public class AgentNativeBatchProgress {
    private final WebsiteMonitorBatchService nativeBatches;

    public AgentNativeBatchProgress(WebsiteMonitorBatchService nativeBatches) {
        this.nativeBatches = nativeBatches;
    }

    AgentBatchProgress overlay(
            AgentBatchProgress base,
            AgentTaskAssessment.Goal goal,
            AgentMonitorBatch.Snapshot snapshot,
            GatewayEnvelope envelope) {
        if (goal == null
                || !goal.valid()
                || goal.operation() != AgentTaskAssessment.Operation.CREATE
                || !"monitor".equals(goal.resourceType())
                || snapshot == null
                || !"monitor-batch.v2".equals(snapshot.version())
                || !Set.of("RUNNING", "CREATED").contains(base.runStatus())
                || goal.createTargets().size() != snapshot.items().size()) return base;
        if (envelope.getActor() == null || !"user".equals(envelope.getActor().getType()))
            return base;
        try {
            List<WebsiteMonitorBatch.Item> items = new ArrayList<>();
            for (int i = 0; i < snapshot.items().size(); i++) {
                var item = snapshot.items().get(i);
                String key = goal.createTargets().get(i).idempotencyKey();
                var raw =
                        AgentMonitorBulkArguments.item(
                                key == null ? item.id() : key, item.arguments());
                items.add(
                        new WebsiteMonitorBatch.Item(
                                (String) raw.get("idempotencyKey"),
                                (String) raw.get("name"),
                                (String) raw.get("url"),
                                integer(raw.get("intervals")),
                                raw.containsKey("timeout") ? integer(raw.get("timeout")) : null));
            }
            var actor = envelope.getActor();
            var result =
                    nativeBatches.progress(
                            new WebsiteMonitorBatch.Caller(
                                    actor.getId(), envelope.getWorkspaceId(), actor.getRoles()),
                            new WebsiteMonitorBatch.Request(List.copyOf(items), false));
            List<AgentBatchProgress.ItemView> views = new ArrayList<>();
            for (int i = 0; i < base.items().size(); i++) {
                var receipt = result.items().get(i);
                if (!items.get(i).idempotencyKey().equals(receipt.idempotencyKey())) return base;
                views.add(item(base.items().get(i), receipt));
            }
            int verified =
                    (int) views.stream().filter(item -> "VERIFIED".equals(item.status())).count();
            int review =
                    (int)
                            views.stream()
                                    .filter(
                                            item ->
                                                    Set.of(
                                                                    "UNCERTAIN",
                                                                    "FAILED",
                                                                    "MATCHED_REVIEW",
                                                                    "UNRESOLVED_REVIEW")
                                                            .contains(item.status()))
                                    .count();
            return new AgentBatchProgress(
                    base.version(),
                    base.batchUid(),
                    base.planHash(),
                    base.runUid(),
                    base.segment(),
                    base.resumeFromRunUid(),
                    base.runStatus(),
                    views.stream()
                                    .anyMatch(
                                            item ->
                                                    "EXECUTING".equals(item.status())
                                                            || "VERIFIED".equals(item.status()))
                            ? "RUNNING"
                            : base.stage(),
                    base.operation(),
                    base.total(),
                    verified,
                    base.total() - verified - review,
                    review,
                    base.toolCalls(),
                    base.toolBudget(),
                    base.nextAction(),
                    base.actionReason(),
                    System.currentTimeMillis(),
                    List.copyOf(views));
        } catch (RuntimeException unavailable) {
            // A failed/changed native scope cannot advance progress or authorize continuation.
            return base;
        }
    }

    private int integer(Object value) {
        return new java.math.BigDecimal(String.valueOf(value)).intValueExact();
    }

    private AgentBatchProgress.ItemView item(
            AgentBatchProgress.ItemView old, WebsiteMonitorBatch.Receipt receipt) {
        String status =
                "PROBE_FAILED".equals(receipt.state())
                                && "EXECUTION_NO_LONGER_ACTIVE".equals(receipt.reason())
                        ? "UNCERTAIN"
                        : status(receipt.state());
        if (status == null) return old;
        if ("UNCERTAIN".equals(old.status()) && !"VERIFIED".equals(status)) status = "UNCERTAIN";
        return new AgentBatchProgress.ItemView(
                old.id(),
                old.name(),
                old.target(),
                old.arguments(),
                status,
                receipt.monitorId(),
                receipt.reason(),
                old.toolCallId(),
                old.approvalId(),
                old.approvalTool(),
                "VERIFIED".equals(status) ? "NATIVE_RECEIPT" : "NONE");
    }

    private String status(String state) {
        return switch (state) {
            case "VERIFIED" -> "VERIFIED";
            case "INVALID", "PROBE_FAILED", "CONFLICT" -> "FAILED";
            case "UNKNOWN" -> "UNCERTAIN";
            case "IN_PROGRESS" -> "EXECUTING";
            default -> null;
        };
    }
}
