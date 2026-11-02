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

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class AgentApprovalSummaryTest {
    private AgentToolCall row(String tool, Map<String, Object> args) {
        return AgentToolCall.builder()
                .toolName(tool)
                .inputJson(JsonUtil.toJson(args))
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(args))
                .build();
    }

    @Test
    void batchSummarizesEveryTargetAndBoundHashWithoutFreeTextOrRawKeys() {
        Map<String, Object> item =
                Map.of(
                        "name",
                        "PRIVATE_FREE_TEXT",
                        "idempotencyKey",
                        "PRIVATE_RAW_KEY",
                        "url",
                        "https://example.com/",
                        "intervals",
                        600,
                        "timeout",
                        1000);
        var row =
                row(
                        "monitor.create_batch",
                        Map.of("items", List.of(item), "retryPreflightFailures", false));
        var summary = AgentApprovalSummary.from(row);
        assertEquals("CREATE", summary.operation());
        assertEquals(1, summary.targetCount());
        assertEquals("https://example.com", summary.targets().getFirst().origin());
        assertEquals(600L, summary.targets().getFirst().intervals());
        assertEquals(1000L, summary.targets().getFirst().timeout());
        assertEquals(row.getInputHash(), summary.inputHash());
        assertTrue(summary.complete());
        String json = JsonUtil.toJson(summary);
        assertFalse(json.contains("PRIVATE_FREE_TEXT"));
        assertFalse(json.contains("PRIVATE_RAW_KEY"));
        assertTrue(row.getInputJson().contains("PRIVATE_FREE_TEXT"));
    }

    @Test
    void liveApprovalProjectionCarriesTheSavedSummaryAndOriginalHash() {
        var summary =
                AgentApprovalSummary.from(
                        row(
                                "monitor.create_batch",
                                Map.of(
                                        "items",
                                        List.of(
                                                Map.of(
                                                        "idempotencyKey",
                                                        "key",
                                                        "url",
                                                        "https://example.com/",
                                                        "intervals",
                                                        600)))));
        var result =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                        .toolName("monitor.create_batch")
                        .toolCallId("call")
                        .approvalId("approval")
                        .status(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus
                                        .WAITING_APPROVAL)
                        .decision(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision
                                        .REQUIRE_APPROVAL)
                        .risk(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.CHANGE)
                        .approvalStatus(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus
                                        .PENDING)
                        .canDecide(true)
                        .approvalSummary(summary)
                        .build();
        var projected =
                new org.apache.hertzbeat.ai.gateway.application.GatewayRuntimeEventProjector()
                        .project(
                                org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent
                                        .approvalRequested(
                                                "item", "trace", result, java.time.Instant.EPOCH),
                                "conversation",
                                "session",
                                "run");
        var payload =
                (org.apache.hertzbeat.ai.gateway.application.GatewayEvent.ApprovalRequestedPayload)
                        projected.payload();
        assertEquals(summary, payload.summary());
        assertTrue(Boolean.TRUE.equals(payload.canDecide()));
    }

    @Test
    void queryFragmentAndPathAreFingerprintedOrOmitted() {
        var summary =
                AgentApprovalSummary.from(
                        row(
                                "monitor.create_batch",
                                Map.of(
                                        "items",
                                        List.of(
                                                Map.of(
                                                        "name",
                                                        "private",
                                                        "idempotencyKey",
                                                        "key",
                                                        "url",
                                                        "https://example.com/PRIVATE_PATH?token=PRIVATE_TOKEN#PRIVATE_FRAGMENT",
                                                        "intervals",
                                                        600)))));
        String json = JsonUtil.toJson(summary);
        assertFalse(json.contains("PRIVATE_"));
        assertEquals("https://example.com", summary.targets().getFirst().origin());
        assertTrue(summary.maskedFields().containsAll(List.of("URL_PATH", "URL_QUERY")));
    }

    @Test
    void userInfoIsNotReturnedAsAnOrigin() {
        var summary =
                AgentApprovalSummary.from(
                        row(
                                "monitor.create_batch",
                                Map.of(
                                        "items",
                                        List.of(
                                                Map.of(
                                                        "idempotencyKey",
                                                        "key",
                                                        "url",
                                                        "https://PRIVATE_USER:PRIVATE_PASSWORD@example.com/",
                                                        "intervals",
                                                        600)))));
        assertFalse(summary.complete());
        assertFalse(JsonUtil.toJson(summary).contains("PRIVATE_"));
    }

    @Test
    void incompleteUnknownAndCorruptInputsCannotClaimCompleteReview() {
        var unknown =
                AgentApprovalSummary.from(
                        row(
                                "notice.template_create",
                                Map.of("content", "PRIVATE_BODY", "name", "PRIVATE_NAME")));
        assertFalse(unknown.complete());
        assertFalse(JsonUtil.toJson(unknown).contains("PRIVATE_"));
        var corrupt =
                AgentToolCall.builder()
                        .toolName("monitor.create_batch")
                        .inputJson("{broken")
                        .inputHash("a".repeat(64))
                        .build();
        assertFalse(AgentApprovalSummary.from(corrupt).complete());
        assertFalse(
                AgentApprovalSummary.from(row("monitor.create_batch", Map.of("items", List.of())))
                        .complete());
    }

    @Test
    void changedSavedInputDoesNotMatchTheApprovedHash() {
        var row = row("monitor.pause", Map.of("monitorIds", List.of(1L, 2L)));
        row.setInputJson("{\"monitorIds\":[3]}");
        assertFalse(AgentApprovalSummary.from(row).complete());
    }

    @Test
    void monitorChangesOnlyShowAllowedScalarsAndExactIds() {
        var summary =
                AgentApprovalSummary.from(
                        row(
                                "monitor.update",
                                Map.of(
                                        "monitorId",
                                        123L,
                                        "updates",
                                        Map.of(
                                                "intervals",
                                                600,
                                                "description",
                                                "PRIVATE_FREE_TEXT"))));
        assertEquals("123", summary.targets().getFirst().id());
        assertEquals(
                List.of(new AgentApprovalSummary.Change("INTERVALS", "600")), summary.changes());
        assertFalse(summary.complete());
        assertFalse(JsonUtil.toJson(summary).contains("PRIVATE_FREE_TEXT"));
    }

    @Test
    void projectionIsBoundedAndDoesNotInventMissingIds() {
        var summary =
                AgentApprovalSummary.from(
                        row(
                                "monitor.resume",
                                Map.of("monitorIds", java.util.Collections.nCopies(101, 1L))));
        assertEquals(101, summary.targetCount());
        assertEquals(100, summary.targets().size());
        assertFalse(summary.complete());
        assertFalse(
                AgentApprovalSummary.from(row("monitor.pause", Map.of("monitorIds", List.of(-1))))
                        .complete());
    }

    @Test
    void invalidOrUnrepresentedInputsCannotClaimCompleteSummary() {
        assertFalse(
                AgentApprovalSummary.from(
                                row(
                                        "monitor.pause",
                                        Map.of(
                                                "monitorIds",
                                                List.of(1L),
                                                "unrepresented",
                                                "hidden")))
                        .complete());
        assertFalse(
                AgentApprovalSummary.from(
                                row(
                                        "monitor.update",
                                        Map.of("monitorId", 1L, "updates", Map.of("intervals", 0))))
                        .complete());
        assertFalse(
                AgentApprovalSummary.from(
                                row(
                                        "monitor.create_batch",
                                        Map.of(
                                                "items",
                                                List.of(
                                                        Map.of(
                                                                "url",
                                                                "https://example.com/",
                                                                "idempotencyKey",
                                                                "key",
                                                                "intervals",
                                                                600,
                                                                "timeout",
                                                                10001)))))
                        .complete());
        assertFalse(
                AgentApprovalSummary.from(
                                row(
                                        "monitor.create_batch",
                                        Map.of(
                                                "items",
                                                List.of(
                                                        Map.of(
                                                                "url",
                                                                "https://example.com/",
                                                                "idempotencyKey",
                                                                "key",
                                                                "intervals",
                                                                600)),
                                                "retryPreflightFailures",
                                                "false")))
                        .complete());
    }
}
