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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleReadToolService;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class AgentAlertDatasourceCapabilitiesTest {
    private AgentRuntimeToolCall call(Map<String, Object> args) {
        return AgentRuntimeToolCall.builder()
                .toolCallId("capabilities")
                .toolName("alert_rule.datasource_status")
                .arguments(args)
                .build();
    }

    private AgentReadObservationClassifier.Observation classify(
            Map<String, Object> args, Object data) {
        return new AgentReadObservationClassifier().classify(call(args), JsonUtil.toJson(data));
    }

    private Map<String, Object> value(boolean promql, boolean sql, List<String> executors) {
        return AgentManagementOutputSupport.view(
                Map.of(
                        "hasPromqlExecutor",
                        promql,
                        "hasSqlExecutor",
                        sql,
                        "availableExecutors",
                        executors));
    }

    @Test
    void nativeSpringCallbackReportsCapabilitiesWithoutExecutingAnyQuery() throws Exception {
        var source = mock(DataSourceService.class);
        var rules = mock(AlertDefineService.class);
        when(source.getAvailableExecutors())
                .thenReturn(
                        Map.of(
                                "hasPromqlExecutor",
                                true,
                                "hasSqlExecutor",
                                false,
                                "availableExecutors",
                                List.of("greptime")));
        var service = new AgentAlertRuleReadToolService(rules, source);
        var method = AgentAlertRuleReadToolService.class.getMethod("datasourceStatus");
        var definition = org.springframework.ai.tool.support.ToolDefinitions.from(method);
        var callback =
                org.springframework.ai.tool.method.MethodToolCallback.builder()
                        .toolObject(service)
                        .toolMethod(method)
                        .toolDefinition(definition)
                        .build();
        var result =
                new AgentReadObservationClassifier().classify(call(Map.of()), callback.call("{}"));
        assertNotNull(result);
        assertEquals(1, result.count());
        verify(source).getAvailableExecutors();
        verifyNoMoreInteractions(source);
        verifyNoInteractions(rules);
    }

    @Test
    void explicitEmptyCapabilityInventoryDoesNotProveHealthOrQueryResults() {
        var observation = classify(Map.of(), value(false, false, List.of()));
        assertNotNull(observation);
        assertEquals(0, observation.count());
        assertEquals("alert-datasource-capabilities-not-health", observation.kind());
    }

    @Test
    void malformedPartialWrongArgumentsAndContradictoryOutputsAreNotEvidence() {
        assertNull(classify(Map.of("query", "SELECT 1"), value(false, false, List.of())));
        assertNull(classify(Map.of(), value(true, false, List.of())));
        assertNull(classify(Map.of(), value(false, false, List.of("greptime", "greptime"))));
        assertNull(classify(Map.of(), value(false, false, List.of("https://invalid.example"))));
        var partial = new java.util.HashMap<>(value(false, false, List.of()));
        partial.put("partial", true);
        assertNull(classify(Map.of(), partial));
        var failed = new java.util.HashMap<>(value(false, false, List.of()));
        failed.put("success", false);
        assertNull(classify(Map.of(), failed));
        failed.remove("success");
        failed.put("error", "synthetic failure");
        assertNull(classify(Map.of(), failed));
        assertNull(classify(Map.of(), Map.of("success", true)));
    }
}
