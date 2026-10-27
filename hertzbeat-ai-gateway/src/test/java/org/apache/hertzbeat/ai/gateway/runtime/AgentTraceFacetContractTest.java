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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.traces.controller.TraceQueryController;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.context.support.GenericApplicationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/** Actual trace tool and controller; isolated analytics provider, no live trace store. */
class AgentTraceFacetContractTest {
    private final EntityTraceQueryService backend = mock(EntityTraceQueryService.class);
    private AgentTraceToolService traceTool;
    private boolean empty;
    private boolean unavailable;
    private String mode = "window";

    @BeforeEach
    void setup() {
        var admission = mock(ObservabilityQueryAdmissionService.class);
        when(admission.execute(anyString(), any()))
                .thenAnswer(i -> ((Supplier<?>) i.getArgument(1)).get());
        traceTool =
                new AgentTraceToolService(
                        backend, new TraceQueryController(backend, admission, null), admission);
        when(backend.queryAnalytics(any(), any()))
                .thenAnswer(
                        i -> {
                            EntityTraceQueryService.AnalyticsQuery q = i.getArgument(0);
                            if (unavailable)
                                return TraceAnalytics.Evidence.unavailable(
                                        q.window(), q.population());
                            return new TraceAnalytics.Evidence<>(
                                    "ready",
                                    q.window(),
                                    q.population(),
                                    new TraceAnalytics.Coverage(
                                            mode,
                                            mode.equals("window") ? null : 1000,
                                            mode.equals("window") ? null : 3,
                                            false),
                                    new TraceAnalytics.Facets(
                                            "serviceName",
                                            empty ? 0 : 3,
                                            empty ? 0 : 1,
                                            q.population().equals("matched_traces")
                                                    ? "multiple"
                                                    : "single",
                                            empty
                                                    ? List.of()
                                                    : List.of(
                                                            new TraceAnalytics.Value(
                                                                    "checkout", 2, 1)),
                                            false));
                        });
    }

    private Map<String, Object> args(String population) {
        return Map.of(
                "selection",
                Map.of("start", 1000, "end", 2000, "serviceName", "checkout"),
                "field",
                "serviceName",
                "population",
                population);
    }

    private AgentReadObservationClassifier.Observation classify(
            Map<String, Object> args, Map<String, Object> output) {
        return new AgentReadObservationClassifier()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolName("traces.facet_values")
                                .toolCallId("facet")
                                .arguments(args)
                                .build(),
                        JsonUtil.toJson(output));
    }

    @ParameterizedTest
    @CsvSource({
        "matched_traces,window",
        "matched_traces,bounded",
        "matched_spans,window",
        "matched_spans,bounded"
    })
    void nativeScopeAndCoverageRemainTyped(String population, String coverage) {
        mode = coverage;
        var args = args(population);
        var result = classify(args, invoke("traces.facet_values", args));
        assertNotNull(result);
        assertEquals(1, result.count());
        verify(backend)
                .queryAnalytics(
                        argThat(
                                q ->
                                        "signal-test".equals(q.workspaceId())
                                                && q.window().start() == 1000
                                                && q.window().end() == 2000
                                                && "checkout".equals(q.serviceName())
                                                && population.equals(q.population())),
                        argThat(
                                o ->
                                        "facets".equals(o.shape())
                                                && "serviceName".equals(o.field())
                                                && o.limit() == 20));
        empty = true;
        assertEquals(0, classify(args, invoke("traces.facet_values", args)).count());
        unavailable = true;
        assertNull(classify(args, invoke("traces.facet_values", args)));
    }

    @Test
    void mismatchedPopulationFieldWindowProjectionAndImpossibleCountsAreRejected() {
        var args = args("matched_spans");
        var result = invoke("traces.facet_values", args);
        assertNotNull(classify(args, result));
        Map<String, Object> altered = new HashMap<>(result);
        altered.put("outputTruncated", true);
        assertNull(classify(args, altered));
        altered = new HashMap<>(result);
        altered.put("population", "matched_traces");
        assertNull(classify(args, altered));
        altered = JsonUtil.fromJson(JsonUtil.toJson(result), Map.class);
        ((Map<String, Object>) altered.get("data")).put("missingCount", 4);
        assertNull(classify(args, altered));
        var badArgs = new HashMap<>(args);
        badArgs.put("field", "environment");
        assertNull(classify(badArgs, result));
        badArgs = new HashMap<>(args);
        badArgs.put("selection", Map.of("start", 1100, "end", 2000));
        assertNull(classify(badArgs, result));
    }

    @Test
    void overlappingTraceMembershipsNeverBecomeUniqueTraceCount() {
        var args = args("matched_traces");
        var result = invoke("traces.facet_values", args);
        var data = (Map<String, Object>) result.get("data");
        data.put("missingCount", 0);
        data.put(
                "values",
                List.of(
                        Map.of("value", "one", "count", 3, "errorCount", 1),
                        Map.of("value", "two", "count", 2, "errorCount", 1)));
        var observation = classify(args, result);
        assertNotNull(observation);
        assertEquals(2, observation.count());
        ((Map<String, Object>) data).put("membership", "single");
        assertNull(classify(args, result));
    }

    @Test
    void persistedFacetProofDoesNotSurviveChangedPopulationOrRun() {
        var args = args("matched_traces");
        var call =
                AgentRuntimeToolCall.builder()
                        .toolName("traces.facet_values")
                        .toolCallId("proof")
                        .arguments(args)
                        .build();
        String output = JsonUtil.toJson(invoke("traces.facet_values", args));
        var result =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                        .toolName("traces.facet_values")
                        .toolCallId("proof")
                        .status(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus.SUCCEEDED)
                        .risk(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.READ)
                        .decision(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                        .approvalStatus(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus
                                        .NOT_REQUIRED)
                        .output(output)
                        .build();
        var evaluator = new AgentReadGroundingEvaluator();
        var proof = evaluator.evaluate("facet-run", call, result).orElseThrow();
        var message =
                TranscriptMessage.builder()
                        .role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
                        .toolName("traces.facet_values")
                        .toolCallId("proof")
                        .content(List.of(TranscriptContent.text(output)))
                        .groundingProof(proof)
                        .build();
        org.junit.jupiter.api.Assertions.assertTrue(evaluator.restores(message, "facet-run", args));
        org.junit.jupiter.api.Assertions.assertFalse(evaluator.restores(message, "foreign", args));
        org.junit.jupiter.api.Assertions.assertFalse(
                evaluator.restores(message, "facet-run", args("matched_spans")));
        org.junit.jupiter.api.Assertions.assertTrue(
                evaluator
                        .evaluate(
                                "facet-run",
                                call,
                                result.toBuilder()
                                        .status(
                                                org.apache.hertzbeat.ai.gateway.tool.core
                                                        .AgentToolStatus.FAILED)
                                        .build())
                        .isEmpty());
    }

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(AgentTraceToolService.class, () -> traceTool);
            spring.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(spring.getDefaultListableBeanFactory());
            var req =
                    AgentToolExecutionRequest.builder()
                            .workspaceId("signal-test")
                            .sessionUid("signal-test")
                            .runId(1L)
                            .runUid("run-label")
                            .runSessionId(1L)
                            .actor(
                                    org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                                            .type("user")
                                            .id("metadata-user")
                                            .roles(List.of("admin"))
                                            .build())
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                            .toolCallId("call-label")
                            .toolName(name)
                            .arguments(args)
                            .build();
            AuthTokenRequestContext.bindWorkspaceId("signal-test");
            AuthTokenRequestContext.bindAuthenticatedWorkspaceId("signal-test");
            try {
                return JsonUtil.fromJson(
                        registry.find(name)
                                .orElseThrow()
                                .execute(
                                        new AgentToolExecutionContext(
                                                req, AgentToolCall.builder().build()))
                                .getModelContent(),
                        Map.class);
            } finally {
                AuthTokenRequestContext.clear();
            }
        }
    }
}
