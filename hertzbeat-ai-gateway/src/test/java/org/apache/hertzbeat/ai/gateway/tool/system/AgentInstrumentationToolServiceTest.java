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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapterRegistry;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionSnapshot;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.SignalObservation;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeEndpoint;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.TransportSecurity;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationApplicationGuideV2Adapter;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationCatalogV2Service;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationDetectionV2Service;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationGuideV2Renderer;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationIntakeProfileV2Service;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Real native catalog/renderer/detector with controlled storage; no ingestion, installation or
 * remote call.
 */
class AgentInstrumentationToolServiceTest {
    @Test
    void nativeCatalogCanBePagedCompletelyAndGuideDoesNotPretendItWasApplied() {
        var profiles = profiles();
        var service = tool(profiles, scope -> new DetectionSnapshot(Map.of()));
        var first = service.catalog("recipes", 0, 5);
        int total = ((Number) first.get("total")).intValue();
        int returned = 0;
        for (int offset = 0; offset < total; offset += 5) {
            returned += ((List<?>) service.catalog("recipes", offset, 5).get("items")).size();
        }
        assertEquals(total, returned);
        assertTrue(total > 5);
        assertThrows(IllegalArgumentException.class, () -> service.catalog(null, 0, 5));
        assertThrows(IllegalArgumentException.class, () -> service.catalog("recipes", 0, 11));
        var render =
                new RenderRequest(
                        2,
                        SourceKind.EXISTING_OPENTELEMETRY,
                        "existing_otlp",
                        null,
                        null,
                        null,
                        null,
                        null,
                        "server-test",
                        identity());
        var guide = service.render(render, 0, 1);
        assertEquals(false, guide.get("applied"));
        assertEquals("GUIDE_RENDERED", guide.get("executionStatus"));
        assertEquals(1, ((List<?>) guide.get("items")).size());
        String json = JsonUtil.toJson(guide);
        assertTrue(json.contains("HERTZBEAT_TOKEN"));
        assertFalse(json.contains("real-token-fixture"));
        assertThrows(IllegalArgumentException.class, () -> service.render(render, 0, 4));
    }

    @Test
    void receptionUsesEveryIdentityAndTimeCriterionRatherThanGlobalCounts() {
        long now = System.currentTimeMillis();
        var observed = new AtomicReference<InstrumentationSignalDetectionStore.DetectionCriteria>();
        var service =
                tool(
                        profiles(),
                        scope -> {
                            observed.set(scope);
                            return new DetectionSnapshot(
                                    Map.of(
                                            Signal.METRICS,
                                            SignalObservation.received(now - 500),
                                            Signal.LOGS,
                                            SignalObservation.waiting(),
                                            Signal.TRACES,
                                            SignalObservation.waiting()));
                        });
        var request =
                new DetectionRequest(
                        2,
                        SourceKind.QUICK_START,
                        "opentelemetry_telemetrygen",
                        null,
                        null,
                        null,
                        Environment.VM,
                        Platform.LINUX_AMD64,
                        identity(),
                        "server-test",
                        now - 1000);
        var result = service.detect(request);
        assertEquals(1L, result.get("receivedSignalCount"));
        assertEquals("ai-e2e-instrumentation", observed.get().serviceName());
        assertEquals("ai-e2e", observed.get().serviceNamespace());
        assertEquals("test", observed.get().environment());
        assertEquals("instance-test", observed.get().serviceInstanceId());
        assertEquals("/fixture", observed.get().endpoint());
        assertEquals(now - 1000, observed.get().startedAt());
    }

    @Test
    void unconfiguredAndUnavailableProfilesRemainDistinctWithoutInventingEndpoints() {
        var empty = new InstrumentationIntakeProfileV2Service(() -> List.of());
        assertEquals(
                InstrumentationIntakeProfileV2.DiscoveryStatus.UNCONFIGURED,
                tool(empty, scope -> new DetectionSnapshot(Map.of())).profiles(0, 5).get("status"));
        var failed =
                new InstrumentationIntakeProfileV2Service(
                        () -> {
                            throw new IllegalStateException("unavailable");
                        });
        var result = tool(failed, scope -> new DetectionSnapshot(Map.of())).profiles(0, 5);
        assertEquals(
                InstrumentationIntakeProfileV2.DiscoveryStatus.UNAVAILABLE, result.get("status"));
        assertEquals(0, result.get("total"));
    }

    private AgentInstrumentationToolService tool(
            InstrumentationIntakeProfileV2Service profiles,
            InstrumentationSignalDetectionStore store) {
        var registry = InstrumentationGuideAdapterRegistry.official();
        var catalog =
                new InstrumentationCatalogV2Service(new InstrumentationCatalogService());
        return new AgentInstrumentationToolService(
                catalog,
                profiles,
                new InstrumentationGuideV2Renderer(
                        catalog,
                        profiles,
                        new InstrumentationApplicationGuideV2Adapter(catalog, registry)),
                new InstrumentationDetectionV2Service(
                        catalog,
                        profiles,
                        store,
                        ignored ->
                                org.apache.hertzbeat.observability.instrumentation.store
                                        .InstrumentationCollectorReadinessStore.CollectorReadiness
                                        .unknown()));
    }

    private InstrumentationIntakeProfileV2Service profiles() {
        return new InstrumentationIntakeProfileV2Service(
                () ->
                        List.of(
                                new IntakeProfile(
                                        "server-test",
                                        IntakeKind.SERVER,
                                        Availability.AVAILABLE,
                                        Gateway.SERVER,
                                        List.of(OtlpTransport.HTTP_PROTOBUF),
                                        Map.of(
                                                OtlpTransport.HTTP_PROTOBUF,
                                                new IntakeEndpoint(
                                                        "https://otel.example.test/v1",
                                                        TransportSecurity.TLS)),
                                        "Authorization",
                                        null,
                                        null)));
    }

    private ServiceIdentity identity() {
        return new ServiceIdentity(
                "ai-e2e-instrumentation", "ai-e2e", "test", "instance-test", "/fixture");
    }
}
