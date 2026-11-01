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
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class AgentRunWindowBindingTest {
    private static final AgentRequestedQueryWindow WINDOW = new AgentRequestedQueryWindow(1792266771302L, 1792267671302L);
    private static final String FLAT = "{\"type\":\"object\",\"properties\":{\"start\":{\"type\":\"integer\"},"
            + "\"end\":{\"type\":\"integer\"},\"entityId\":{\"type\":\"integer\"}},\"required\":[\"start\",\"end\",\"entityId\"]}";
    private static final String NESTED = "{\"type\":\"object\",\"properties\":{\"q\":" + FLAT + "},\"required\":[\"q\"]}";

    @Test
    void missingBoundsInheritOneExactMillisecondWindowWithoutMutatingModelInput() {
        for (String tool : List.of("logs.analysis", "metrics.otlp_inventory", "traces.query")) {
            var original = Map.<String, Object>of("q", Map.of("entityId", 42));
            var inherited = WINDOW.inherit(tool, original, NESTED);
            var query = (Map<?, ?>) inherited.get("q");
            assertEquals(WINDOW.start(), query.get("start"));
            assertEquals(WINDOW.end(), query.get("end"));
            assertEquals(Map.of("entityId", 42), original.get("q"));
            assertNull(WINDOW.denial(tool, inherited));
        }
        assertEquals(WINDOW.start(), WINDOW.inherit("metrics.history", Map.of("monitorId", 42), FLAT).get("start"));
    }

    @Test
    void explicitSelectionsAndConflictsNeverGetSilentlyClampedOrExpanded() {
        for (var query : List.of(Map.<String, Object>of("start", WINDOW.start() + 1, "end", WINDOW.end() - 1),
                Map.<String, Object>of("start", WINDOW.start() - 302, "end", WINDOW.end() - 302),
                Map.<String, Object>of("start", WINDOW.start() / 1000, "end", WINDOW.end() / 1000),
                Map.<String, Object>of("start", WINDOW.start()), Map.<String, Object>of("history", "15m"))) {
            var args = Map.<String, Object>of("q", query);
            assertEquals(args, WINDOW.inherit("traces.query", args, NESTED));
        }
        assertNull(WINDOW.denial("traces.query", Map.of("q", Map.of("start", WINDOW.start() + 1, "end", WINDOW.end() - 1))));
        assertTrue(WINDOW.denial("traces.query", Map.of("q", Map.of("start", WINDOW.start() - 302, "end", WINDOW.end() - 302)))
                .contains("REQUESTED_WINDOW"));
        assertEquals(Map.of("entityId", 42), WINDOW.inherit("entity.get", Map.of("entityId", 42), FLAT));
        assertEquals(Map.of("q", "invalid"), WINDOW.inherit("traces.query", Map.of("q", "invalid"), NESTED));
    }

    @Test
    void modelSchemaUsesServerBindingWhileTheExecutableSchemaStillAcceptsExplicitBounds() {
        var descriptor = AgentToolDescriptor.builder().name("traces.query").description("Query traces")
                .inputSchema(NESTED).risk(AgentToolRisk.READ).namespace("traces")
                .exposure(AgentToolExposure.MODEL_VISIBLE).build();
        var projected = WINDOW.modelDescriptor(descriptor);
        var schema = JsonUtil.fromJson(projected.getInputSchema());
        assertFalse(schema.path("properties").path("q").path("properties").has("start"));
        assertFalse(schema.path("properties").path("q").path("properties").has("end"));
        assertEquals("entityId", schema.path("properties").path("q").path("required").get(0).asText());
        assertTrue(descriptor.getInputSchema().contains("start"));
        assertTrue(projected.getDescription().contains("server"));
    }

    @Test
    void realNativeSchemasUseTheSameBindingForFlatAndNestedQueryArguments() {
        try (var context = new org.springframework.context.support.GenericApplicationContext()) {
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService(null, null, null));
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService(
                            (org.apache.hertzbeat.observability.logs.service.LogQueryService) null));
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolService(
                            org.mockito.Mockito.mock(org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.class)));
            context.refresh();
            var registry = new org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration()
                    .agentToolRegistry(context.getDefaultListableBeanFactory());
            for (String name : List.of("logs.analysis", "metrics.otlp_inventory", "traces.query")) {
                var descriptor = registry.find(name).orElseThrow().descriptor();
                var rawSchema = JsonUtil.fromJson(descriptor.getInputSchema());
                boolean nested = rawSchema.path("properties").path("q").isObject();
                Map<String, Object> args = nested ? Map.of("q", Map.of("entityId", 42)) : Map.of("entityId", 42);
                var actual = WINDOW.inherit(name, args, descriptor.getInputSchema());
                var query = nested ? (Map<?, ?>) actual.get("q") : actual;
                assertEquals(WINDOW.start(), query.get("start"), name);
                assertEquals(WINDOW.end(), query.get("end"), name);
                var projected = JsonUtil.fromJson(WINDOW.modelDescriptor(descriptor).getInputSchema());
                var modelQuery = nested ? projected.path("properties").path("q") : projected;
                assertFalse(modelQuery.path("properties").has("start"), name);
                assertFalse(modelQuery.path("properties").has("end"), name);
            }
        }
    }

    @Test
    void internalEffectiveArgumentsNeverLeakThroughResultSerialization() {
        var result = org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                .toolCallId("call").toolName("traces.query")
                .risk(AgentToolRisk.READ).status(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus.SUCCEEDED)
                .decision(org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                .approvalStatus(org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus.NOT_REQUIRED)
                .effectiveArguments(Map.of("private", "must-not-leave-runtime"))
                .inheritedQueryWindow(WINDOW).build();
        assertFalse(JsonUtil.toJson(result).contains("must-not-leave-runtime"));
        assertFalse(JsonUtil.toJson(result).contains("effectiveArguments"));
    }

}
