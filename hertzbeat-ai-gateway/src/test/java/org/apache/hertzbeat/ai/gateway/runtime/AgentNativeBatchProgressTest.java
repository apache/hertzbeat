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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.AgentApprovalSummary;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatch;
import org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatchService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

class AgentNativeBatchProgressTest {
    private AgentTaskAssessment.Goal goal() {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "monitor",
                50,
                List.of(),
                Map.of("app", "website", "intervals", 600),
                IntStream.range(0, 50)
                        .mapToObj(
                                i ->
                                        new AgentTaskAssessment.CreateTarget(
                                                "fixture-" + i,
                                                "http://127.0.0.1:8080/site/" + i,
                                                600,
                                                "key-" + i,
                                                1000))
                        .toList());
    }

    private AgentMonitorBatch batch() {
        var batch = new AgentMonitorBatch("run");
        batch.enableNativeBulk();
        batch.initialize(goal());
        return batch;
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .actor(ControlledMonitorTools.USER)
                .workspaceId("isolated")
                .channelId("web-ui")
                .receivedAt(1L)
                .build();
    }

    private AgentBatchProgress base(AgentMonitorBatch batch, String status) {
        return AgentBatchProgress.from(
                "run", "run", "run", 0, status, goal(), batch, 1, 64, "NONE", "ACTIVE");
    }

    @Test
    void oneFullFiftyItemToolProposalHasCompleteHashBoundApproval() {
        var batch = batch();
        var call = batch.next(64);
        assertEquals("monitor.create_batch", call.getToolName());
        assertEquals(50, AgentMonitorBulkArguments.items(call.getArguments()).size());
        assertTrue(AgentMonitorBulkArguments.permits(goal(), call.getArguments()));
        var summary =
                AgentApprovalSummary.from(
                        AgentToolCall.builder()
                                .toolName(call.getToolName())
                                .inputHash(
                                        AgentToolPayloadHasher.normalizedArgumentsHash(
                                                call.getArguments()))
                                .inputJson(JsonUtil.toJson(call.getArguments()))
                                .build());
        assertTrue(summary.complete());
        assertEquals(50, summary.targetCount());
        assertEquals(50, summary.targets().size());
        assertEquals(
                AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()),
                summary.inputHash());
    }

    @Test
    void durableProgressAppearsBeforeToolCompletionWithoutChangingApprovalOrContinuation() {
        var nativeService = mock(WebsiteMonitorBatchService.class);
        when(nativeService.progress(any(), any()))
                .thenAnswer(
                        inv -> {
                            WebsiteMonitorBatch.Request request = inv.getArgument(1);
                            var receipts =
                                    IntStream.range(0, 50)
                                            .mapToObj(
                                                    i ->
                                                            new WebsiteMonitorBatch.Receipt(
                                                                    request.items()
                                                                            .get(i)
                                                                            .idempotencyKey(),
                                                                    i < 10
                                                                            ? "VERIFIED"
                                                                            : "IN_PROGRESS",
                                                                    i < 10
                                                                            ? String.valueOf(i + 1)
                                                                            : null,
                                                                    "DURABLE_NATIVE_READBACK",
                                                                    Map.of(),
                                                                    Map.of()))
                                            .toList();
                            return new WebsiteMonitorBatch.Result(1, receipts, 10, 0, 40, 0);
                        });
        var batch = batch();
        batch.noteApproval(batch.next(64), "pending-approval");
        var original = base(batch, "RUNNING");
        assertEquals("WAITING_APPROVAL", original.stage());
        var progress =
                new AgentNativeBatchProgress(nativeService)
                        .overlay(original, goal(), batch.snapshot(), envelope());
        assertEquals(10, progress.verified());
        assertEquals(40, progress.pending());
        assertEquals(0, progress.reviewRequired());
        assertEquals("RUNNING", progress.stage());
        assertEquals("EXECUTING", progress.items().getLast().status());
        assertEquals("NONE", progress.nextAction());
        assertEquals(0, original.verified());
        assertEquals(0, batch.verifiedCount());
        assertEquals("NATIVE_RECEIPT", progress.items().getFirst().receiptKind());
        verify(nativeService)
                .progress(
                        org.mockito.ArgumentMatchers.argThat(
                                caller ->
                                        "owner".equals(caller.actor())
                                                && "isolated".equals(caller.workspace())),
                        any());
    }

    @Test
    void cancelledNativeUnknownCannotBecomePreflightFailureDuringReadback() {
        var batch = batch();
        var create = batch.next(64);
        var hash = AgentToolPayloadHasher.normalizedArgumentsHash(create.getArguments());
        var values =
                AgentMonitorBulkArguments.items(create.getArguments()).stream()
                        .map(
                                item ->
                                        Map.of(
                                                "idempotencyKey",
                                                item.get("idempotencyKey"),
                                                "state",
                                                "UNKNOWN",
                                                "reason",
                                                "BATCH_TIME_BUDGET_RECONCILE"))
                        .toList();
        batch.observe(
                create,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.CHANGE,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus.SUCCEEDED,
                JsonUtil.toJson(
                        Map.of(
                                "batchVersion",
                                "monitor-bulk.v1",
                                "batch",
                                Map.of("items", values))),
                hash,
                true);
        assertEquals(
                50,
                batch.snapshot().items().stream()
                        .filter(item -> item.status() == AgentMonitorBatch.Status.UNCERTAIN)
                        .count());
        var status =
                AgentRuntimeToolCall.builder()
                        .toolCallId("status")
                        .toolName("monitor.batch_status")
                        .arguments(create.getArguments())
                        .build();
        var legacyFailures =
                AgentMonitorBulkArguments.items(create.getArguments()).stream()
                        .map(
                                item ->
                                        Map.of(
                                                "idempotencyKey",
                                                item.get("idempotencyKey"),
                                                "state",
                                                "PROBE_FAILED",
                                                "reason",
                                                "NATIVE_AVAILABILITY_FAILED"))
                        .toList();
        batch.observe(
                status,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.READ,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus.SUCCEEDED,
                JsonUtil.toJson(
                        Map.of(
                                "batchVersion",
                                "monitor-bulk.v1",
                                "batch",
                                Map.of("items", legacyFailures))),
                hash,
                true);
        assertTrue(batch.reviewRequired());
        assertEquals(0, batch.preflightFailureCount());
        assertEquals(false, batch.onlyPreflightFailuresRemain());
        assertEquals(
                50,
                batch.snapshot().items().stream()
                        .filter(item -> item.status() == AgentMonitorBatch.Status.UNCERTAIN)
                        .count());
    }

    @Test
    void terminalAndUnauthorizedSourcesCannotReadOrReviveNativeWork() {
        var nativeService = mock(WebsiteMonitorBatchService.class);
        var projection = new AgentNativeBatchProgress(nativeService);
        var batch = batch();
        var cancelled = base(batch, "CANCELLED");
        assertSame(cancelled, projection.overlay(cancelled, goal(), batch.snapshot(), envelope()));
        var serviceActor =
                envelope().toBuilder()
                        .actor(
                                org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                                        .type("service")
                                        .id("owner")
                                        .roles(List.of("user"))
                                        .build())
                        .build();
        var active = base(batch, "RUNNING");
        assertSame(active, projection.overlay(active, goal(), batch.snapshot(), serviceActor));
        verifyNoInteractions(nativeService);
    }

    @Test
    void missingOrConflictingNativeStateCannotAdvanceProgress() {
        var nativeService = mock(WebsiteMonitorBatchService.class);
        when(nativeService.progress(any(), any()))
                .thenThrow(new IllegalArgumentException("scope mismatch"));
        var batch = batch();
        var base = base(batch, "RUNNING");
        assertSame(
                base,
                new AgentNativeBatchProgress(nativeService)
                        .overlay(base, goal(), batch.snapshot(), envelope()));
    }
}
