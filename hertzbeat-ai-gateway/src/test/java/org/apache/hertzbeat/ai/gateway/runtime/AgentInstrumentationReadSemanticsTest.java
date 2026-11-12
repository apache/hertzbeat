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

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AgentInstrumentationReadSemanticsTest {
    @Test
    void catalogCountsArePageScopedAndUnavailableIsNotAnEmptyObservation() {
        var classifier = new AgentReadObservationClassifier();
        var args = Map.<String, Object>of("section", "recipes", "offset", 0, "limit", 1);
        var page =
                Map.<String, Object>of(
                        "schemaVersion",
                        2,
                        "section",
                        "recipes",
                        "items",
                        List.of(Map.of("id", "fixture")),
                        "offset",
                        0,
                        "limit",
                        1,
                        "returnedCount",
                        1,
                        "total",
                        3,
                        "hasMore",
                        true);
        assertEquals(
                1,
                classifier
                        .classify(
                                call("telemetry.instrumentation_catalog", args),
                                JsonUtil.toJson(page))
                        .count());
        var failed = new LinkedHashMap<String, Object>(page);
        failed.put("returnedCount", 3);
        assertNull(
                classifier.classify(
                        call("telemetry.instrumentation_catalog", args), JsonUtil.toJson(failed)));
        var unavailable =
                Map.<String, Object>of(
                        "schemaVersion",
                        2,
                        "status",
                        "unavailable",
                        "items",
                        List.of(),
                        "offset",
                        0,
                        "limit",
                        5,
                        "returnedCount",
                        0,
                        "total",
                        0,
                        "hasMore",
                        false);
        assertNull(
                classifier.classify(
                        call("telemetry.intake_profiles", Map.of()), JsonUtil.toJson(unavailable)));
    }

    @Test
    void receptionProofRejectsStorageErrorsWrongScopeAndOutOfWindowTimestamps() {
        var service =
                Map.of(
                        "name",
                        "ai-e2e-service",
                        "namespace",
                        "ai-e2e",
                        "environment",
                        "test",
                        "serviceInstanceId",
                        "fixture",
                        "endpoint",
                        "/fixture");
        var request =
                Map.<String, Object>of(
                        "schemaVersion",
                        2,
                        "sourceKind",
                        "quick_start",
                        "recipeId",
                        "opentelemetry_telemetrygen",
                        "intakeProfileId",
                        "server-test",
                        "service",
                        service,
                        "startedAt",
                        1000);
        var context = new LinkedHashMap<String, Object>(request);
        context.put("windowEndAt", 121000);
        context.remove("schemaVersion");
        var signals = new LinkedHashMap<String, Object>();
        signals.put("metrics", Map.of("status", "received", "lastReceivedAt", 1200));
        signals.put("logs", Map.of("status", "waiting", "errorCode", "signal_not_received"));
        signals.put("traces", Map.of("status", "waiting", "errorCode", "signal_not_received"));
        var detection =
                Map.<String, Object>of(
                        "schemaVersion",
                        2,
                        "detectedAt",
                        1500,
                        "context",
                        context,
                        "signals",
                        signals);
        var result =
                Map.<String, Object>of(
                        "schemaVersion", 2, "receivedSignalCount", 1, "detection", detection);
        var classifier = new AgentReadObservationClassifier();
        var call = call("telemetry.instrumentation_detect", Map.of("request", request));
        assertEquals(1, classifier.classify(call, JsonUtil.toJson(result)).count());
        signals.put("traces", Map.of("status", "unavailable", "errorCode", "storage_unavailable"));
        assertNull(classifier.classify(call, JsonUtil.toJson(result)));
        signals.put("traces", Map.of("status", "waiting", "errorCode", "signal_not_received"));
        signals.put("metrics", Map.of("status", "received", "lastReceivedAt", 999));
        assertNull(classifier.classify(call, JsonUtil.toJson(result)));
        signals.put("metrics", Map.of("status", "received", "lastReceivedAt", 1200));
        context.put("intakeProfileId", "another-profile");
        assertNull(classifier.classify(call, JsonUtil.toJson(result)));
    }

    @Test
    void renderedGuideNeverProvidesAppliedConfigurationEvidence() {
        var identity = Map.of("name", "ai-e2e", "namespace", "ai-e2e", "environment", "test");
        var request =
                Map.<String, Object>of(
                        "schemaVersion",
                        2,
                        "service",
                        identity,
                        "sourceKind",
                        "existing_opentelemetry",
                        "recipeId",
                        "existing_otlp",
                        "intakeProfileId",
                        "server-test");
        var output =
                new LinkedHashMap<String, Object>(
                        Map.of(
                                "schemaVersion",
                                2,
                                "service",
                                identity,
                                "sourceKind",
                                "existing_opentelemetry",
                                "recipeId",
                                "existing_otlp",
                                "intakeProfile",
                                Map.of("id", "server-test"),
                                "executionStatus",
                                "GUIDE_RENDERED",
                                "applied",
                                false));
        output.putAll(
                Map.of(
                        "items",
                        List.of(Map.of("id", "guide-block")),
                        "offset",
                        0,
                        "limit",
                        1,
                        "returnedCount",
                        1,
                        "total",
                        1,
                        "hasMore",
                        false));
        var classifier = new AgentReadObservationClassifier();
        var call = call("telemetry.instrumentation_render", Map.of("request", request));
        assertNotNull(classifier.classify(call, JsonUtil.toJson(output)));
        output.put("applied", true);
        assertNull(classifier.classify(call, JsonUtil.toJson(output)));
    }

    private AgentRuntimeToolCall call(String name, Map<String, Object> args) {
        return AgentRuntimeToolCall.builder()
                .toolName(name)
                .toolCallId("fixture")
                .arguments(args)
                .build();
    }
}
