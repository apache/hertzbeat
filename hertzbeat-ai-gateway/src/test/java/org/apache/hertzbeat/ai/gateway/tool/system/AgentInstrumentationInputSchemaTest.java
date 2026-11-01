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

package org.apache.hertzbeat.ai.gateway.tool.system;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.support.ToolDefinitions;

import tools.jackson.core.type.TypeReference;

import java.util.List;
import java.util.Map;

class AgentInstrumentationInputSchemaTest {
    @Test
    void schemaValuesRoundTripIntoTheRealNativeRequestAndOptionalScopeIsOmitted() {
        var method =
                java.util.Arrays.stream(AgentInstrumentationToolService.class.getMethods())
                        .filter(m -> m.getName().equals("render"))
                        .findFirst()
                        .orElseThrow();
        String schema =
                AgentInstrumentationInputSchema.enrich(
                        "telemetry.instrumentation_render",
                        ToolDefinitions.from(method).inputSchema());
        Map<String, Object> parsed = JsonUtil.fromJson(schema, new TypeReference<>() {});
        var req = (Map<?, ?>) ((Map<?, ?>) parsed.get("properties")).get("request");
        var props = (Map<?, ?>) req.get("properties");
        assertTrue(
                ((List<?>) ((Map<?, ?>) props.get("sourceKind")).get("enum"))
                        .contains("quick_start"));
        assertFalse(((List<?>) ((Map<?, ?>) props.get("environment")).get("enum")).contains("VM"));
        var service = (Map<?, ?>) props.get("service");
        assertEquals(List.of("name", "namespace", "environment"), service.get("required"));
        var request =
                JsonUtil.fromJson(
                        JsonUtil.toJson(
                                Map.of(
                                        "schemaVersion",
                                        2,
                                        "sourceKind",
                                        "quick_start",
                                        "recipeId",
                                        "quick_start_metrics",
                                        "environment",
                                        "vm",
                                        "platform",
                                        "linux_amd64",
                                        "intakeProfileId",
                                        "collector:test",
                                        "service",
                                        Map.of(
                                                "name",
                                                "ai-e2e-service",
                                                "namespace",
                                                "ai-e2e",
                                                "environment",
                                                "test"))),
                        RenderRequest.class);
        assertEquals("ai-e2e-service", request.service().name());
        assertEquals(null, request.service().endpoint());
        assertEquals(null, request.service().serviceInstanceId());
    }

    @Test
    void actualCallbackAcceptsNativeEnumsAndMissingOptionalScopeAndReturnsHonestBlocker() {
        var guides =
                org.mockito.Mockito.mock(
                        org.apache.hertzbeat.observability.instrumentation.v2.service
                                .InstrumentationGuideV2Renderer.class);
        org.mockito.Mockito.when(guides.render(org.mockito.ArgumentMatchers.any()))
                .thenThrow(
                        new org.apache.hertzbeat.observability.instrumentation.v2.api
                                .InstrumentationV2RequestException(
                                org.apache.hertzbeat.observability.instrumentation.v2.api
                                        .InstrumentationV2RequestException.ErrorCode
                                        .INTAKE_PROFILE_UNAVAILABLE));
        var service =
                new AgentInstrumentationToolService(
                        org.mockito.Mockito.mock(
                                org.apache.hertzbeat.observability.instrumentation.v2.service
                                        .InstrumentationCatalogV2Service.class),
                        org.mockito.Mockito.mock(
                                org.apache.hertzbeat.observability.instrumentation.v2.service
                                        .InstrumentationIntakeProfileV2Service.class),
                        guides,
                        org.mockito.Mockito.mock(
                                org.apache.hertzbeat.observability.instrumentation.v2.service
                                        .InstrumentationDetectionV2Service.class));
        try (var context = new org.springframework.context.support.GenericApplicationContext()) {
            context.registerBean(AgentInstrumentationToolService.class, () -> service);
            context.refresh();
            var registry =
                    new org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration()
                            .agentToolRegistry(context.getDefaultListableBeanFactory());
            var args =
                    Map.<String, Object>of(
                            "request",
                            Map.of(
                                    "schemaVersion",
                                    2,
                                    "sourceKind",
                                    "quick_start",
                                    "recipeId",
                                    "quick_start_metrics",
                                    "environment",
                                    "vm",
                                    "platform",
                                    "linux_amd64",
                                    "intakeProfileId",
                                    "collector:test",
                                    "service",
                                    Map.of(
                                            "name",
                                            "ai-e2e-service",
                                            "namespace",
                                            "ai-e2e",
                                            "environment",
                                            "test")));
            String hash =
                    org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                            .normalizedArgumentsHash(args);
            var request =
                    org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest.builder()
                            .sessionUid("session")
                            .runUid("run")
                            .runId(1L)
                            .runSessionId(1L)
                            .workspaceId("isolated")
                            .actor(
                                    org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                                            .type("user")
                                            .id("owner")
                                            .roles(List.of("user"))
                                            .build())
                            .entryType(
                                    org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType
                                            .USER_INPUT)
                            .approvalHandling(
                                    org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling
                                            .WAIT_FOR_DECISION)
                            .toolName("telemetry.instrumentation_render")
                            .toolCallId("render")
                            .arguments(args)
                            .build();
            var output =
                    registry.find("telemetry.instrumentation_render")
                            .orElseThrow()
                            .execute(
                                    new org.apache.hertzbeat.ai.gateway.tool.core
                                            .AgentToolExecutionContext(
                                            request,
                                            org.apache.hertzbeat.common.entity.agent.AgentToolCall
                                                    .builder()
                                                    .inputHash(hash)
                                                    .build()));
            Map<String, Object> data =
                    JsonUtil.fromJson(output.getModelContent(), new TypeReference<>() {});
            assertEquals("BLOCKED", data.get("executionStatus"));
            assertEquals("instrumentation_v2_intake_profile_unavailable", data.get("errorCode"));
            assertEquals(false, data.get("applied"));
            assertEquals(args.get("request"), data.get("request"));
            org.mockito.Mockito.verify(guides)
                    .render(
                            org.mockito.ArgumentMatchers.argThat(
                                    value ->
                                            value.service().endpoint() == null
                                                    && value.sourceKind()
                                                            == org.apache.hertzbeat.observability
                                                                    .instrumentation.v2.api
                                                                    .InstrumentationCatalogV2
                                                                    .SourceKind.QUICK_START));
        }
    }
}
