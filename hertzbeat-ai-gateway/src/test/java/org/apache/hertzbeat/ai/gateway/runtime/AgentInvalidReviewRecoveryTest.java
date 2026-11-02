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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.api.Test;

class AgentInvalidReviewRecoveryTest {
    private AgentTaskAssessment invalid() {
        return new AgentTaskAssessment(new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE, AgentTaskAssessment.Operation.UPDATE,
                "alert_inhibit", null, List.of(100L), Map.of("name", "synthetic")),
                AgentTaskOutcome.Stage.WAITING_APPROVAL, true, List.of());
    }

    @Test
    void invalidReviewCannotBindOrAuthorizeAnythingAndRecoveryIsSingleUse() {
        var policy = new AgentTaskCompletionPolicy();
        var evidence = new AgentTaskEvidence();
        assertFalse(policy.assess(invalid(), evidence, true, true).publishCandidate());
        assertTrue(policy.requestInvalidReviewProposalCorrection(invalid(), evidence, true, true));
        assertNull(policy.goal());
        assertFalse(policy.requestInvalidReviewProposalCorrection(invalid(), evidence, true, true));
        assertFalse(policy.bindGoal(invalid().goal()));
        assertEquals(AgentTaskOutcome.Stage.UNKNOWN, policy.outcome().stage());
    }

    @Test
    void noObservationNoBudgetNullOrValidAssessmentCannotEnterRecovery() {
        var policy = new AgentTaskCompletionPolicy();
        var evidence = new AgentTaskEvidence();
        assertFalse(policy.requestInvalidReviewProposalCorrection(invalid(), evidence, false, true));
        assertFalse(policy.requestInvalidReviewProposalCorrection(invalid(), evidence, true, false));
        assertFalse(policy.requestInvalidReviewProposalCorrection(null, evidence, true, true));
        assertFalse(policy.requestInvalidReviewProposalCorrection(AgentTaskCompletionPolicyTest.create(1), evidence, true, true));
        assertTrue(policy.requestInvalidReviewProposalCorrection(invalid(), evidence, true, true));
    }

    @Test
    void pendingDeniedFailedAndUnknownMutationNeverReceiveAutomaticRetry() {
        for (var status : List.of(AgentToolStatus.WAITING_APPROVAL, AgentToolStatus.DENIED,
                AgentToolStatus.FAILED, AgentToolStatus.SUCCEEDED)) {
            var evidence = new AgentTaskEvidence();
            evidence.observe("write", "alert_inhibit.update", AgentToolRisk.CHANGE,
                    status, Map.of("inhibitId", 100), "{}", true);
            assertFalse(new AgentTaskCompletionPolicy().requestInvalidReviewProposalCorrection(
                    invalid(), evidence, true, true), status.name());
        }
    }
}
