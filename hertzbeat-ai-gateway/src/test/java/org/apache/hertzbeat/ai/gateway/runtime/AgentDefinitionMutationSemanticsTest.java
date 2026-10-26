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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorDefinitionDraft;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AgentDefinitionMutationSemanticsTest {
    @Test
    void exactNamedReceiptCompletesOnlyBoundAppRevisionAndDefinition() {
        String definition = "app: ai-e2e-template\nname: {en-US: Test}\n";
        String revision = "a".repeat(64);
        var args =
                Map.<String, Object>of(
                        "app",
                        "ai-e2e-template",
                        "definition",
                        definition,
                        "previewHash",
                        AgentMonitorDefinitionDraft.previewHash(
                                "create", "ai-e2e-template", null, definition));
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "monitor_definition",
                        1,
                        List.of(),
                        Map.of("app", "ai-e2e-template"));
        assertTrue(goal.valid());
        assertTrue(
                AgentDefinitionMutationSemantics.permits(goal, "monitor.definition_create", args));
        var out =
                Map.<String, Object>of(
                        "receiptVersion",
                        "monitor-definition-mutation.v1",
                        "toolName",
                        "monitor.definition_create",
                        "app",
                        "ai-e2e-template",
                        "operation",
                        "CREATE",
                        "revision",
                        revision,
                        "definitionHash",
                        AgentMonitorDefinitionDraft.inspect(definition).definitionHash(),
                        "verified",
                        true,
                        "inputHash",
                        AgentToolPayloadHasher.normalizedArgumentsHash(args));
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "create",
                "monitor.definition_create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(out),
                true);
        assertTrue(evidence.completes(goal));
        var tampered = new LinkedHashMap<>(out);
        tampered.put("app", "other-template");
        var bad = new AgentTaskEvidence();
        bad.observe(
                "wrong",
                "monitor.definition_create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(tampered),
                true);
        assertFalse(bad.completes(goal));
        assertTrue(bad.uncertain());
        var outside =
                new AgentTaskAssessment.Goal(
                        goal.type(),
                        goal.operation(),
                        goal.resourceType(),
                        1,
                        List.of(),
                        Map.of("app", "different"));
        assertFalse(
                AgentDefinitionMutationSemantics.permits(
                        outside, "monitor.definition_create", args));
        var update =
                new AgentTaskAssessment.Goal(
                        goal.type(),
                        AgentTaskAssessment.Operation.UPDATE,
                        goal.resourceType(),
                        1,
                        List.of(),
                        Map.of("app", "ai-e2e-template", "revision", revision));
        assertTrue(update.valid());
        assertFalse(
                AgentDefinitionMutationSemantics.permits(
                        update,
                        "monitor.definition_update",
                        Map.of(
                                "app",
                                "ai-e2e-template",
                                "revision",
                                "b".repeat(64),
                                "definition",
                                definition)));
    }

    @Test
    void statusObservationCanCompleteWithEarlierPartialCountsWithoutBecomingMutation() {
        var evidence = new AgentTaskEvidence();
        var proof =
                AgentGroundingProof.builder()
                        .observationKind("website-batch-status-items")
                        .observationCount(3)
                        .build();
        evidence.observeVerifiedRead("status", "monitor.batch_status", "{}", proof);
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.OBSERVATION,
                        AgentTaskAssessment.Operation.QUERY,
                        "monitor_batch",
                        null);
        var decision =
                new AgentTaskCompletionPolicy()
                        .assess(
                                new AgentTaskAssessment(
                                        goal, AgentTaskOutcome.Stage.COMPLETE, true, List.of()),
                                evidence,
                                true,
                                true);
        assertTrue(decision.publishCandidate());
        assertFalse(evidence.mutationAttempted());
        assertTrue(decision.outcome().stage() == AgentTaskOutcome.Stage.COMPLETE);
    }
}
