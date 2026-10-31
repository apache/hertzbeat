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
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AgentInlineCollectionSemanticsTest {
    Map<String, Object> args =
            Map.of(
                    "monitorId",
                    7L,
                    "planId",
                    "11111111-1111-1111-1111-111111111111",
                    "planHash",
                    "a".repeat(64));
    AgentTaskAssessment.Goal goal =
            new AgentTaskAssessment.Goal(
                    AgentTaskAssessment.Type.CHANGE,
                    AgentTaskAssessment.Operation.EXECUTE,
                    "monitor",
                    1,
                    List.of(7L),
                    Map.of());

    Map<String, Object> receipt() {
        var r = new LinkedHashMap<>(args);
        r.put("receiptVersion", "inline-collection.v1");
        r.put("inputHash", AgentToolPayloadHasher.normalizedArgumentsHash(args));
        r.put("started", true);
        r.put("verified", true);
        r.put("oneShot", true);
        return r;
    }

    @Test
    void exactSingleExecuteGoalAndNativeReceiptCompleteWithoutPretendingToCreateOrEnableMonitor() {
        assertTrue(AgentInlineCollectionSemantics.permits(goal, args));
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "call",
                "monitor.collection_detect",
                AgentToolRisk.DANGEROUS,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(receipt()),
                true);
        assertTrue(evidence.completes(goal));
        assertEquals(1, evidence.receiptCount());
        assertEquals(1, evidence.verifiedCount());
        assertTrue(evidence.alreadyReceipted("monitor.collection_detect", args));
    }

    @Test
    void wrongGoalTargetPlanHashPartialOutputMissingDurabilityOrStartNeverComplete() {
        var foreign =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.EXECUTE,
                        "monitor",
                        1,
                        List.of(8L),
                        Map.of());
        assertFalse(AgentInlineCollectionSemantics.permits(foreign, args));
        for (String field :
                List.of(
                        "monitorId",
                        "planHash",
                        "planId",
                        "started",
                        "verified",
                        "inputHash",
                        "receiptVersion",
                        "oneShot")) {
            var bad = receipt();
            bad.remove(field);
            assertFalse(
                    AgentInlineCollectionSemantics.receipt(
                            args, bad, AgentToolPayloadHasher.normalizedArgumentsHash(args)));
        }
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "call",
                "monitor.collection_detect",
                AgentToolRisk.DANGEROUS,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(receipt()),
                false);
        assertFalse(evidence.completes(goal));
        var preview = new AgentTaskEvidence();
        preview.observe(
                "preview",
                "monitor.collection_preview",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(receipt()),
                true);
        assertFalse(preview.completes(goal));
    }
}
