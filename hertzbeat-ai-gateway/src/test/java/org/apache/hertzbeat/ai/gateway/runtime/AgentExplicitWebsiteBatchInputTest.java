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
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class AgentExplicitWebsiteBatchInputTest {
    @Test
    void structuredTargetDataCannotInventPermissionChangeCountOrOverrideConflictingConstraints() {
        var item =
                Map.of(
                        "idempotencyKey",
                        "ai-e2e-key",
                        "name",
                        "ai-e2e-name",
                        "url",
                        "https://example.test/",
                        "intervals",
                        600,
                        "timeout",
                        10000);
        String body =
                JsonUtil.toJson(Map.of("items", List.of(item), "retryPreflightFailures", false));
        var observation =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.OBSERVATION,
                        AgentTaskAssessment.Operation.QUERY,
                        "monitor",
                        1);
        assertSame(observation, AgentExplicitWebsiteBatchInput.bind(observation, body));
        var countMismatch =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "monitor",
                        2);
        assertThrows(
                IllegalArgumentException.class,
                () -> AgentExplicitWebsiteBatchInput.bind(countMismatch, body));
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "monitor",
                        1);
        var bound = AgentExplicitWebsiteBatchInput.bind(goal, body);
        assertEquals("ai-e2e-key", bound.createTargets().getFirst().idempotencyKey());
        assertEquals(10000, bound.createTargets().getFirst().timeout());
        var conflicting =
                new AgentTaskAssessment.Goal(
                        goal.type(),
                        goal.operation(),
                        goal.resourceType(),
                        1,
                        List.of(),
                        Map.of("intervals", 300));
        assertEquals(
                600,
                AgentExplicitWebsiteBatchInput.bind(conflicting, body)
                        .createTargets()
                        .getFirst()
                        .intervals());
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        AgentExplicitWebsiteBatchInput.bind(
                                goal,
                                JsonUtil.toJson(
                                        Map.of(
                                                "items",
                                                List.of(item),
                                                "retryPreflightFailures",
                                                true))));
    }
}
