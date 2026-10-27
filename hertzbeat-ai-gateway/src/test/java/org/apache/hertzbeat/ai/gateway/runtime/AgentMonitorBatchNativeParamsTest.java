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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

class AgentMonitorBatchNativeParamsTest {
    private AgentTaskAssessment.Goal goal(Map<String, Object> params) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "monitor",
                50,
                List.of(),
                Map.of("app", "website", "intervals", 600, "params", params),
                IntStream.rangeClosed(1, 50)
                        .mapToObj(
                                i ->
                                        new AgentTaskAssessment.CreateTarget(
                                                "public-site-" + i,
                                                "https://site-" + i + ".example/",
                                                600))
                        .toList());
    }

    @Test
    void completeHttpsPlanCarriesSharedTimeoutWithoutLosingPerTargetHosts() {
        var goal = goal(Map.of("ssl", true, "port", 443, "uri", "/", "timeout", 10000));
        var plan = new AgentMonitorBatch("native-params-fifty");
        plan.initialize(goal);
        assertEquals(50, plan.snapshot().items().size());
        for (int i = 0; i < 50; i++) {
            var args = plan.snapshot().items().get(i).arguments();
            var params = (Map<?, ?>) args.get("params");
            assertEquals("site-" + (i + 1) + ".example", params.get("host"));
            assertEquals(10000, params.get("timeout"));
            assertEquals(true, params.get("ssl"));
            assertEquals(443, params.get("port"));
            assertTrue(AgentMonitorMutationSemantics.permits(goal, "monitor.create", args));
            var changed = new LinkedHashMap<String, Object>(args);
            var wrong = new LinkedHashMap<String, Object>();
            params.forEach((k, v) -> wrong.put(k.toString(), v));
            wrong.put("host", "other.example");
            changed.put("params", wrong);
            assertFalse(AgentMonitorMutationSemantics.permits(goal, "monitor.create", changed));
            wrong.put("host", params.get("host"));
            wrong.put("timeout", 20000);
            assertFalse(AgentMonitorMutationSemantics.permits(goal, "monitor.create", changed));
        }
    }

    @Test
    void sixFlatHttpFieldsPreserveAllFiftyExactTargets() {
        var source = goal(Map.of());
        var flat =
                new AgentTaskAssessment.Goal(
                        source.type(),
                        source.operation(),
                        source.resourceType(),
                        source.expectedCount(),
                        source.resourceIds(),
                        Map.of(
                                "app",
                                "website",
                                "intervals",
                                600,
                                "protocol",
                                "HTTPS",
                                "port",
                                443,
                                "path",
                                "/",
                                "timeout",
                                10000),
                        source.createTargets());
        var plan = new AgentMonitorBatch("native-params-fifty");
        plan.initialize(flat);
        assertEquals(50, plan.snapshot().items().size());
        for (var item : plan.snapshot().items()) {
            var params = (Map<?, ?>) item.arguments().get("params");
            assertEquals(10000, params.get("timeout"));
            assertEquals(443, params.get("port"));
            assertEquals(true, params.get("ssl"));
            assertTrue(
                    AgentMonitorMutationSemantics.permits(
                            flat, "monitor.create", item.arguments()));
        }
        var conflicts =
                new AgentTaskAssessment.Goal(
                        source.type(),
                        source.operation(),
                        source.resourceType(),
                        source.expectedCount(),
                        source.resourceIds(),
                        Map.of("timeout", 10000, "params", Map.of("timeout", 20000)),
                        source.createTargets());
        assertThrows(
                IllegalArgumentException.class,
                () -> new AgentMonitorBatch("native-params-fifty").initialize(conflicts));
        var protocol =
                new AgentTaskAssessment.Goal(
                        source.type(),
                        source.operation(),
                        source.resourceType(),
                        source.expectedCount(),
                        source.resourceIds(),
                        Map.of("protocol", "HTTP"),
                        source.createTargets());
        assertThrows(
                IllegalArgumentException.class,
                () -> new AgentMonitorBatch("native-params-fifty").initialize(protocol));
    }

    @Test
    void conflictingAndSecretCommonParametersStillFailBeforeFreeze() {
        for (var params :
                List.<Map<String, Object>>of(
                        Map.of("host", "other.example"),
                        Map.of("ssl", false),
                        Map.of("port", 80),
                        Map.of("uri", "/other"),
                        Map.of("timeout", 0),
                        Map.of("timeout", "not-a-number"),
                        Map.of("authorization", "secret-fixture"))) {
            assertThrows(
                    IllegalArgumentException.class,
                    () -> new AgentMonitorBatch("native-params-fifty").initialize(goal(params)));
        }
    }
}
