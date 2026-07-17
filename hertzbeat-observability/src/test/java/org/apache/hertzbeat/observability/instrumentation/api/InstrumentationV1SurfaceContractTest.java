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

package org.apache.hertzbeat.observability.instrumentation.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.CatalogResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionContext;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideSnippet;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideStep;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.InstrumentationSelection;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.PollingDecision;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.PollingInstruction;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.QueryJump;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.QueryJumpContext;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretPlaceholder;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretReplacement;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretValueFormat;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalCapabilities;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalDetection;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalDetections;
import org.junit.jupiter.api.Test;

/**
 * Guards the exact consumer-facing v1 surface. Any change here requires an explicit compatibility review.
 */
class InstrumentationV1SurfaceContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void freezesCatalogRenderAndDetectionRecordFields() {
        assertRecordComponents(CatalogResponse.class, "schemaVersion", "languages");
        assertRecordComponents(
                GuideRenderRequest.class,
                "schemaVersion",
                "language",
                "framework",
                "method",
                "environment",
                "platform",
                "collector",
                "service");
        assertRecordComponents(
                GuideRenderResponse.class,
                "schemaVersion",
                "selection",
                "signals",
                "component",
                "secretPlaceholders",
                "steps");
        assertRecordComponents(
                InstrumentationSelection.class, "language", "framework", "method", "environment", "platform");
        assertRecordComponents(
                GuideStep.class, "id", "type", "titleKey", "executionLocationKey", "snippets");
        assertRecordComponents(GuideSnippet.class, "id", "language", "content", "secretPlaceholders");
        assertRecordComponents(SecretPlaceholder.class, "marker", "valueFormat", "replacement");

        assertRecordComponents(
                DetectionRequest.class,
                "schemaVersion",
                "language",
                "framework",
                "method",
                "environment",
                "platform",
                "service",
                "collectorId",
                "startedAt");
        assertRecordComponents(
                DetectionResponse.class,
                "schemaVersion",
                "detectedAt",
                "context",
                "signals",
                "polling",
                "queryJumpContext",
                "queryJumps");
        assertRecordComponents(
                DetectionContext.class,
                "language",
                "framework",
                "method",
                "environment",
                "platform",
                "service",
                "collectorId",
                "startedAt");
        assertRecordComponents(SignalCapabilities.class, "metrics", "logs", "traces");
        assertRecordComponents(SignalDetections.class, "metrics", "logs", "traces");
        assertRecordComponents(SignalDetection.class, "status", "lastReceivedAt", "errorCode");
        assertRecordComponents(PollingInstruction.class, "decision", "pollAfterMs", "deadlineAt");
        assertRecordComponents(
                QueryJumpContext.class,
                "serviceName",
                "serviceNamespace",
                "environment",
                "collectorId",
                "startedAt",
                "detectedAt");
        assertRecordComponents(QueryJump.class, "signal", "enabled", "context");
    }

    @Test
    void freezesSelectionCapabilityAndDetectionEnums() {
        assertWireValues(Language.values(), "java", "dotnet", "nodejs", "python", "php", "go", "generic");
        assertWireValues(
                Framework.values(),
                "spring_boot",
                "java_jar",
                "aspnet_core",
                "nodejs",
                "express",
                "django",
                "flask",
                "php_generic",
                "laravel",
                "go_generic",
                "generic");
        assertWireValues(Method.values(), "zero_code", "sdk", "ebpf");
        assertWireValues(Environment.values(), "vm", "docker", "kubernetes", "windows_service");
        assertWireValues(
                Platform.values(),
                "linux_amd64",
                "linux_arm64",
                "macos_amd64",
                "macos_arm64",
                "windows_amd64",
                "any");
        assertWireValues(Capability.values(), "supported", "preview", "unsupported");
        assertWireValues(Signal.values(), "metrics", "logs", "traces");
        assertWireValues(SecretValueFormat.values(), "url_unreserved");
        assertWireValues(SecretReplacement.values(), "raw");
        assertWireValues(
                DetectionStatus.values(), "waiting", "received", "unsupported", "unavailable", "error");
        assertWireValues(PollingDecision.values(), "continue_polling", "complete", "manual_retry");
        assertWireValues(
                DetectionErrorCode.values(),
                "signal_not_received",
                "signal_not_supported",
                "storage_unavailable",
                "storage_query_failed",
                "collector_unavailable",
                "authentication_failed",
                "invalid_context");
    }

    private void assertRecordComponents(Class<? extends Record> recordType, String... expectedNames) {
        List<String> actualNames = Arrays.stream(recordType.getRecordComponents())
                .map(RecordComponent::getName)
                .toList();
        assertEquals(List.of(expectedNames), actualNames, recordType.getSimpleName());
    }

    private void assertWireValues(Enum<?>[] values, String... expectedValues) {
        List<String> actualValues = Arrays.stream(values)
                .map(this::serializeEnum)
                .toList();
        assertEquals(List.of(expectedValues), actualValues);
    }

    private String serializeEnum(Enum<?> value) {
        try {
            return objectMapper.writeValueAsString(value).replace("\"", "");
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
