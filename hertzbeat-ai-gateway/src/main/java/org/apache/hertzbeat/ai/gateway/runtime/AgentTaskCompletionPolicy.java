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

import java.util.Objects;

/**
 * Pure completion gate. Only the existing runtime loop may act on its bounded continuation
 * decision.
 */
final class AgentTaskCompletionPolicy {
    record Decision(AgentTaskOutcome outcome, boolean continuePlanning, boolean publishCandidate) {}

    private AgentTaskAssessment.Goal goal;
    private boolean correctionUsed;
    private AgentTaskOutcome outcome;
    private boolean checkpointDurable;
    private String actionFeedback;

    boolean checkpointDurable() {
        return checkpointDurable;
    }

    void checkpointDurable(boolean durable) {
        checkpointDurable = durable;
    }

    String actionFeedback() {
        return actionFeedback;
    }

    void actionFeedback(String feedback) {
        actionFeedback = feedback;
    }

    AgentTaskAssessment.Goal goal() {
        return goal;
    }

    AgentTaskOutcome outcome() {
        return outcome;
    }

    boolean bindGoal(AgentTaskAssessment.Goal candidate) {
        if (candidate == null
                || !candidate.valid()
                || goal != null && !Objects.equals(goal, candidate)) {
            return false;
        }
        goal = candidate;
        return true;
    }

    Decision assess(
            AgentTaskAssessment assessment,
            AgentTaskEvidence evidence,
            boolean coverageComplete,
            boolean budgetAvailable) {
        if (evidence.uncertain()) {
            return decision(evidence, AgentTaskOutcome.Stage.RECOVERY_REQUIRED, false, false);
        }
        if (assessment == null
                || !assessment.valid()
                || goal != null && !Objects.equals(goal, assessment.goal())) {
            return decision(evidence, AgentTaskOutcome.Stage.UNKNOWN, false, false);
        }
        if (goal == null) {
            goal = assessment.goal();
        }
        boolean supported =
                Boolean.TRUE.equals(assessment.answerSupported())
                        && evidence.claimsMatch(assessment.claims());
        if (evidence.waiting()) {
            return decision(
                    evidence,
                    AgentTaskOutcome.Stage.WAITING_APPROVAL,
                    false,
                    supported && assessment.stage() == AgentTaskOutcome.Stage.WAITING_APPROVAL);
        }
        if (evidence.denied() || evidence.failed()) {
            return decision(
                    evidence,
                    evidence.receiptCount() > 0
                            ? AgentTaskOutcome.Stage.PARTIAL
                            : AgentTaskOutcome.Stage.FAILED,
                    false,
                    supported
                            && assessment.stage()
                                    == (evidence.receiptCount() > 0
                                            ? AgentTaskOutcome.Stage.PARTIAL
                                            : AgentTaskOutcome.Stage.FAILED));
        }
        if (!goal.changesResources()) {
            if (evidence.mutationAttempted()) {
                return decision(evidence, AgentTaskOutcome.Stage.UNKNOWN, false, false);
            }
            boolean complete =
                    supported
                            && assessment.stage() == AgentTaskOutcome.Stage.COMPLETE
                            && (goal.type() == AgentTaskAssessment.Type.GENERAL
                                    || coverageComplete && evidence.hasObservation());
            return decision(
                    evidence,
                    complete
                            ? AgentTaskOutcome.Stage.COMPLETE
                            : assessment.stage() == AgentTaskOutcome.Stage.COMPLETE
                                    ? AgentTaskOutcome.Stage.NOT_EXECUTED
                                    : assessment.stage(),
                    false,
                    complete || supported && assessment.stage() != AgentTaskOutcome.Stage.COMPLETE);
        }
        boolean complete =
                supported
                        && assessment.stage() == AgentTaskOutcome.Stage.COMPLETE
                        && (goal.type() == AgentTaskAssessment.Type.CHANGE || coverageComplete)
                        && evidence.completes(goal);
        if (complete) {
            return decision(evidence, AgentTaskOutcome.Stage.COMPLETE, false, true);
        }
        AgentTaskOutcome.Stage stage =
                evidence.receiptCount() > 0
                        ? AgentTaskOutcome.Stage.PARTIAL
                        : supported && assessment.stage() == AgentTaskOutcome.Stage.PLANNED
                                ? AgentTaskOutcome.Stage.PLANNED
                                : AgentTaskOutcome.Stage.NOT_EXECUTED;
        if (supported
                && (assessment.stage() == AgentTaskOutcome.Stage.NEEDS_INPUT
                        || assessment.stage() == AgentTaskOutcome.Stage.FAILED)) {
            return decision(evidence, assessment.stage(), false, true);
        }
        boolean retry = !evidence.mutationAttempted() && !correctionUsed && budgetAvailable;
        correctionUsed |= retry;
        return decision(evidence, stage, retry, supported && assessment.stage() == stage);
    }

    /** An invalid review is never authority; one extra planning turn may repair an unexecuted proposal. */
    boolean requestInvalidReviewProposalCorrection(
            AgentTaskAssessment assessment, AgentTaskEvidence evidence,
            boolean successfulRead, boolean budgetAvailable) {
        boolean changeHint = goal != null ? goal.changesResources()
                : assessment != null && assessment.goal() != null && assessment.goal().changesResources();
        if (assessment == null || assessment.valid() || !changeHint || !successfulRead
                || correctionUsed || !budgetAvailable || evidence.mutationAttempted()
                || evidence.waiting() || evidence.uncertain() || evidence.failed() || evidence.denied()) {
            return false;
        }
        // Do not bind or repair any field of the invalid assessment. A subsequent mutation must
        // still obtain the original-goal checkpoint and pass ordinary target/parameter/approval gates.
        correctionUsed = true;
        return true;
    }

    boolean requestUnexecutedProposalCorrection(AgentTaskEvidence evidence, boolean budgetAvailable) {
        if (goal == null || !goal.changesResources() || correctionUsed || !budgetAvailable
                || evidence.mutationAttempted() || evidence.waiting() || evidence.uncertain()) {
            return false;
        }
        correctionUsed = true;
        return true;
    }

    boolean completeVerifiedMutation(AgentTaskEvidence evidence) {
        if (goal == null
                || goal.type() != AgentTaskAssessment.Type.CHANGE
                || !evidence.completes(goal)
                || evidence.uncertain()
                || evidence.waiting()
                || evidence.failed()
                || evidence.denied()) {
            return false;
        }
        outcome =
                new AgentTaskOutcome(
                        goal,
                        AgentTaskOutcome.Stage.COMPLETE,
                        evidence.receiptCount(),
                        evidence.verifiedCount());
        return true;
    }

    void finishBatch(AgentTaskOutcome.Stage stage, int receipts, int verified) {
        if (goal == null || !goal.valid() || verified < 0 || verified > goal.expectedCount()) {
            throw new IllegalStateException("Frozen batch completion evidence is invalid");
        }
        outcome = new AgentTaskOutcome(goal, stage, receipts, verified);
    }

    AgentTaskOutcome stopForMutation(AgentTaskEvidence evidence) {
        return decision(
                        evidence,
                        evidence.uncertain()
                                ? AgentTaskOutcome.Stage.RECOVERY_REQUIRED
                                : evidence.receiptCount() > 0
                                        ? AgentTaskOutcome.Stage.PARTIAL
                                        : AgentTaskOutcome.Stage.FAILED,
                        false,
                        false)
                .outcome();
    }

    private Decision decision(
            AgentTaskEvidence evidence,
            AgentTaskOutcome.Stage stage,
            boolean retry,
            boolean candidate) {
        outcome =
                new AgentTaskOutcome(
                        goal, stage, evidence.receiptCount(), evidence.verifiedCount());
        return new Decision(outcome, retry, candidate);
    }
}
