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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

class AgentGrafanaReadTest {
    private AgentReadObservationClassifier.Observation classify(Map<String, Object> output) {
        return new AgentReadObservationClassifier()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("source")
                                .toolName("grafana.dashboard_source")
                                .arguments(
                                        Map.of(
                                                "monitorId",
                                                7L,
                                                "expectedUid",
                                                "bound-uid",
                                                "expectedVersion",
                                                3L))
                                .build(),
                        JsonUtil.toJson(output));
    }

    private Map<String, Object> source() {
        String json = "{\"title\":\"AI fixture\",\"panels\":[]}";
        return new HashMap<>(
                Map.of(
                        "monitorId",
                        7L,
                        "uid",
                        "bound-uid",
                        "version",
                        3L,
                        "available",
                        true,
                        "dashboardJson",
                        json,
                        "definitionHash",
                        GatewayText.sha256(json)));
    }

    @Test
    void sourceRequiresTheExactRequestedBindingVersionAndContentHash() {
        var source = source();
        assertNotNull(classify(source));
        source.put("monitorId", 8L);
        assertNull(classify(source));
        source = source();
        source.put("version", 4L);
        assertNull(classify(source));
        source = source();
        source.put("definitionHash", "forged");
        assertNull(classify(source));
    }

    @Test
    void blockedOrCredentialBearingSourceCannotBecomeAnObservation() {
        assertNull(
                classify(Map.of("available", false, "reasonCode", "GRAFANA_INTEGRATION_DISABLED")));
        var source = source();
        String unsafe = "{\"title\":\"AI fixture\",\"panels\":[],\"token\":\"private-sentinel\"}";
        source.put("dashboardJson", unsafe);
        source.put("definitionHash", GatewayText.sha256(unsafe));
        assertNull(classify(source));
    }
}
