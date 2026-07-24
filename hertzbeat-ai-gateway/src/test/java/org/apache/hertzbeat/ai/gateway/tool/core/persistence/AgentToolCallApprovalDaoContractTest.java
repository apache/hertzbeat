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

package org.apache.hertzbeat.ai.gateway.tool.core.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;

/**
 * Contract tests for single-table approval persistence on {@link AgentToolCall}.
 */
class AgentToolCallApprovalDaoContractTest {

    @Test
    void toolCallEntityShouldCarryApprovalStateAndFullResultOutput() {
        LocalDateTime expiresAt = LocalDateTime.parse("2026-04-25T20:00:00");
        AgentToolCall toolCall = AgentToolCall.builder()
            .approvalId("agp_1")
            .toolCallId("agc_1")
            .runId(10L)
            .runUid("run_1")
            .sessionId(20L)
            .sessionUid("ags_1")
            .toolName("ops.service_restart")
            .risk(AgentToolRisk.CHANGE.name())
            .policyDecision(AgentPolicyDecision.REQUIRE_APPROVAL.name())
            .status(AgentToolStatus.WAITING_APPROVAL.name())
            .inputJson("{\"service\":\"nginx\"}")
            .inputHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
            .approvalStatus(AgentApprovalStatus.APPROVED.name())
            .approvalExpiresAt(expiresAt)
            .approvalDecidedAt(expiresAt.minusMinutes(5))
            .approvalActorType("user")
            .approvalActorId("approver")
            .approvalReason("approved for maintenance window")
            .resultOutput("{\"full\":\"result\"}")
            .build();

        assertEquals("agp_1", toolCall.getApprovalId());
        assertEquals("agc_1", toolCall.getToolCallId());
        assertEquals("run_1", toolCall.getRunUid());
        assertEquals("ags_1", toolCall.getSessionUid());
        assertEquals(AgentApprovalStatus.APPROVED.name(), toolCall.getApprovalStatus());
        assertEquals(expiresAt, toolCall.getApprovalExpiresAt());
        assertEquals("approver", toolCall.getApprovalActorId());
        assertEquals("{\"full\":\"result\"}", toolCall.getResultOutput());
        List<String> fieldNames = Arrays.stream(AgentToolCall.class.getDeclaredFields())
            .map(java.lang.reflect.Field::getName)
            .toList();
        assertTrue(fieldNames.contains("approval" + "Id"));
        assertFalse(fieldNames.contains("resultSummary"));
        assertFalse(fieldNames.contains("targetMonitorId"));
        assertTrue(fieldNames.contains("inputHash"));
    }

    @Test
    void toolCallDaoShouldExposeScopedToolCallAndApprovalLookupMethods() throws NoSuchMethodException {
        assertEquals(Optional.class, AgentToolCallDao.class
            .getMethod("findByRunIdAndToolCallId", Long.class, String.class)
            .getReturnType());
        assertEquals(Optional.class, AgentToolCallDao.class.getMethod("findByApprovalId", String.class)
            .getReturnType());
    }
}
