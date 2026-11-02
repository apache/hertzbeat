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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Server-saved proposal/read-receipt linkage; no business service call or mutation. */
class AgentApprovalProposalViewTest {
    private Map<String, Object> config(boolean enabled) {
        return Map.of(
                "name",
                "isolated-policy",
                "sourceLabels",
                Map.of("severity", "critical"),
                "targetLabels",
                Map.of("severity", "warning"),
                "equalLabels",
                List.of("host"),
                "enable",
                enabled);
    }

    private Map<String, Object> original() {
        var r = new LinkedHashMap<String, Object>(config(true));
        r.put("id", 100L);
        return r;
    }

    private AgentToolCall proposal() {
        var args =
                Map.<String, Object>of(
                        "inhibitId",
                        100L,
                        "configuration",
                        config(false),
                        "sourceHash",
                        AgentAlertInhibitWriteProof.sourceHash(original()));
        return AgentToolCall.builder()
                .id(20L)
                .runId(10L)
                .runUid("run")
                .sessionId(5L)
                .sessionUid("session")
                .toolName("alert_inhibit.update")
                .inputJson(JsonUtil.toJson(args))
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(args))
                .build();
    }

    private AgentToolCall baseline() {
        var args = Map.<String, Object>of("inhibitId", 100L);
        var out = AgentManagementOutputSupport.view(original());
        out.put("readVersion", "alert-inhibit-read.v1");
        out.put("sourceHash", AgentAlertInhibitWriteProof.sourceHash(original()));
        return AgentToolCall.builder()
                .id(1L)
                .runId(10L)
                .runUid("run")
                .sessionId(5L)
                .sessionUid("session")
                .toolName("alert_inhibit.get")
                .risk("READ")
                .status("SUCCEEDED")
                .inputJson(JsonUtil.toJson(args))
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(args))
                .resultOutput(JsonUtil.toJson(out))
                .build();
    }

    @Test
    void boundedPriorNativeReadEnrichesWithoutChangingProposalOrHash() {
        var dao = mock(AgentToolCallDao.class);
        when(dao.findByRunIdAndIdLessThanOrderByIdDesc(eq(10L), eq(20L), any()))
                .thenReturn(List.of(baseline()));
        var proposal = proposal();
        String input = proposal.getInputJson();
        String hash = proposal.getInputHash();
        var out = new AgentApprovalProposalView(dao).summary(proposal);
        assertEquals(true, out.inhibition().before().enable());
        assertEquals(false, out.inhibition().configuration().enable());
        assertEquals(hash, out.inputHash());
        assertEquals(input, proposal.getInputJson());
        verify(dao)
                .findByRunIdAndIdLessThanOrderByIdDesc(
                        eq(10L), eq(20L), argThat(p -> p.getPageSize() == 64));
        verifyNoMoreInteractions(dao);
    }

    @Test
    void wrongOwnerRunStatusHashOrTargetCannotSupplyPriorState() {
        for (String field : List.of("session", "run", "tool", "status", "hash", "id", "future")) {
            var row = baseline();
            switch (field) {
                case "session" -> row.setSessionUid("foreign");
                case "run" -> row.setRunUid("foreign");
                case "tool" -> row.setToolName("fake.read");
                case "status" -> row.setStatus("FAILED");
                case "hash" -> row.setInputHash("b".repeat(64));
                case "id" -> row.setInputJson("{\"inhibitId\":101}");
                case "future" -> row.setId(21L);
                default -> throw new IllegalStateException();
            }
            var dao = mock(AgentToolCallDao.class);
            when(dao.findByRunIdAndIdLessThanOrderByIdDesc(any(), any(), any()))
                    .thenReturn(List.of(row));
            assertNull(
                    new AgentApprovalProposalView(dao).summary(proposal()).inhibition().before(),
                    field);
        }
    }

    @Test
    void alteredPartialOrOversizedReceiptNeverBecomesBeforeState() {
        for (String kind : List.of("partial", "different", "oversized")) {
            var row = baseline();
            Map<String, Object> out = JsonUtil.fromJson(row.getResultOutput(), Map.class);
            if (kind.equals("partial")) out.put("partial", true);
            if (kind.equals("different")) out.put("sourceHash", "b".repeat(64));
            row.setResultOutput(
                    kind.equals("oversized") ? "x".repeat(24001) : JsonUtil.toJson(out));
            var dao = mock(AgentToolCallDao.class);
            when(dao.findByRunIdAndIdLessThanOrderByIdDesc(any(), any(), any()))
                    .thenReturn(List.of(row));
            assertNull(
                    new AgentApprovalProposalView(dao).summary(proposal()).inhibition().before());
        }
    }

    @Test
    void unavailableBaselineDoesNotInventValuesOrBlockExistingSafeSummary() {
        var dao = mock(AgentToolCallDao.class);
        when(dao.findByRunIdAndIdLessThanOrderByIdDesc(any(), any(), any()))
                .thenThrow(new IllegalStateException("offline fixture"));
        var out = new AgentApprovalProposalView(dao).summary(proposal());
        assertTrue(out.complete());
        assertNull(out.inhibition().before());
        assertEquals(false, out.inhibition().configuration().enable());
    }

    @Test
    void unboundOrCreateProposalDoesNotReadOtherReceipts() {
        var dao = mock(AgentToolCallDao.class);
        var p = proposal();
        p.setInputHash("0".repeat(64));
        assertFalse(new AgentApprovalProposalView(dao).summary(p).complete());
        verifyNoInteractions(dao);
    }

    @Test
    void protectedPriorValuesNeverEnterTheApprovalViewEvenAtMatchingSourceHash() {
        var raw = new LinkedHashMap<String, Object>(original());
        raw.put("sourceLabels", Map.of("password", "SYNTHETIC_NOT_REAL"));
        String source = AgentAlertInhibitWriteProof.sourceHash(raw);
        var args =
                Map.<String, Object>of(
                        "inhibitId", 100L, "configuration", config(false), "sourceHash", source);
        var proposal = proposal();
        proposal.setInputJson(JsonUtil.toJson(args));
        proposal.setInputHash(AgentToolPayloadHasher.normalizedArgumentsHash(args));
        var row = baseline();
        row.setResultOutput(
                JsonUtil.toJson(
                        Map.of(
                                "readVersion",
                                "alert-inhibit-read.v1",
                                "partial",
                                false,
                                "redactionApplied",
                                true,
                                "data",
                                raw,
                                "sourceHash",
                                source)));
        var dao = mock(AgentToolCallDao.class);
        when(dao.findByRunIdAndIdLessThanOrderByIdDesc(any(), any(), any()))
                .thenReturn(List.of(row));
        var result = new AgentApprovalProposalView(dao).summary(proposal);
        assertNull(result.inhibition().before());
        assertFalse(JsonUtil.toJson(result).contains("SYNTHETIC_NOT_REAL"));
    }
}
