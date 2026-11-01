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
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.api.Test;

class AgentReadFailureBudgetTest {
    @Test
    void successResetsReadFailureStreakEvenForAnEmptyResult() {
        AgentRuntimeLoopState state = new AgentRuntimeLoopState(List.of());
        assertEquals(1, state.recordReadResult(result(AgentToolStatus.FAILED, "invalid")));
        assertEquals(2, state.recordReadResult(result(AgentToolStatus.FAILED, "invalid")));
        assertEquals(0, state.recordReadResult(result(AgentToolStatus.SUCCEEDED, null)));
        assertEquals(1, state.recordReadResult(result(AgentToolStatus.FAILED, "invalid")));
        assertEquals(1, state.recordReadResult(result(AgentToolStatus.FAILED, "different failure")));
    }

    @Test
    void failureBudgetMustBePositive() {
        AgentRuntimeProperties config = new AgentRuntimeProperties();
        assertEquals(3, config.getMaxConsecutiveReadFailures());
        assertThrows(IllegalArgumentException.class, () -> config.setMaxConsecutiveReadFailures(0));
    }

    private AgentToolExecutionResult result(AgentToolStatus status, String error) {
        return AgentToolExecutionResult.builder()
                .toolCallId("call-1").toolName("metrics.history").status(status)
                .risk(AgentToolRisk.READ).decision(AgentPolicyDecision.ALLOW)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output("{\"values\":{}}")
                .errorMessage(error).elapsedMs(1).build();
    }
}
