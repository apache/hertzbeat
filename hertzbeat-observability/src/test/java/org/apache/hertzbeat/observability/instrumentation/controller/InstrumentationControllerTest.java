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

package org.apache.hertzbeat.observability.instrumentation.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationDetectionService;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationGuideRenderer;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapterRegistry;
import org.apache.hertzbeat.observability.instrumentation.store.UnavailableInstrumentationSignalDetectionStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class InstrumentationControllerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        InstrumentationCatalogService catalogService = new InstrumentationCatalogService();
        InstrumentationController controller = new InstrumentationController(
                catalogService,
                new InstrumentationGuideRenderer(catalogService, InstrumentationGuideAdapterRegistry.official()),
                new InstrumentationDetectionService(
                        catalogService, new UnavailableInstrumentationSignalDetectionStore()));
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void exposesVersionedCatalogWithLowercaseWireEnums() throws Exception {
        mockMvc.perform(get("/api/instrumentation/v1/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.languages[0].language").value("java"))
                .andExpect(jsonPath("$.data.languages[0].frameworks[0].framework").value("spring_boot"))
                .andExpect(jsonPath("$.data.languages[0].frameworks[0].methods[0].method").value("zero_code"))
                .andExpect(jsonPath("$.data.languages[0].frameworks[0].methods[0].signals.metrics")
                        .value("supported"))
                .andExpect(jsonPath("$.data.languages[0].frameworks[0].methods[0].signals.logs")
                        .value("supported"))
                .andExpect(jsonPath(
                        "$.data.languages[0].frameworks[0].methods[0].component.bundledWithHertzBeat")
                        .value(false));
    }

    @Test
    void rendersStructuredStepsWithoutReceivingSecretValue() throws Exception {
        mockMvc.perform(post("/api/instrumentation/v1/render")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "schemaVersion": 1,
                                  "language": "nodejs",
                                  "framework": "express",
                                  "method": "zero_code",
                                  "environment": "docker",
                                  "platform": "linux_amd64",
                                  "collector": {
                                    "collectorId": "collector-east",
                                    "otlpHttpEndpoint": "http://collector.internal:4318",
                                    "otlpGrpcEndpoint": "http://collector.internal:4317",
                                    "authorizationHeader": "Authorization"
                                  },
                                  "service": {
                                    "name": "checkout-api",
                                    "namespace": "commerce",
                                    "environment": "prod"
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.selection.language").value("nodejs"))
                .andExpect(jsonPath("$.data.secretPlaceholders.authorizationToken.marker")
                        .value("${HERTZBEAT_TOKEN}"))
                .andExpect(jsonPath("$.data.secretPlaceholders.authorizationToken.valueFormat")
                        .value("url_unreserved"))
                .andExpect(jsonPath("$.data.secretPlaceholders.authorizationToken.replacement")
                        .value("raw"))
                .andExpect(jsonPath("$.data.steps[0].type").value("install"))
                .andExpect(jsonPath("$.data.steps[1].type").value("configure"))
                .andExpect(jsonPath("$.data.steps[4].type").value("disable"));
    }

    @Test
    void detectsThroughBodyScopedContextAndReturnsHonestUnavailableState() throws Exception {
        mockMvc.perform(post("/api/instrumentation/v1/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "schemaVersion": 1,
                                  "language": "go",
                                  "framework": "go_generic",
                                  "method": "ebpf",
                                  "environment": "vm",
                                  "platform": "linux_amd64",
                                  "service": {
                                    "name": "checkout-api",
                                    "namespace": "commerce",
                                    "environment": "prod"
                                  },
                                  "collectorId": "collector-east",
                                  "startedAt": 1710000000000
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.context.service.name").value("checkout-api"))
                .andExpect(jsonPath("$.data.context.service.serviceInstanceId").doesNotExist())
                .andExpect(jsonPath("$.data.context.service.endpoint").doesNotExist())
                .andExpect(jsonPath("$.data.context.collectorId").value("collector-east"))
                .andExpect(jsonPath("$.data.signals.metrics.status").value("unsupported"))
                .andExpect(jsonPath("$.data.signals.logs.status").value("unsupported"))
                .andExpect(jsonPath("$.data.signals.traces.status").value("unavailable"))
                .andExpect(jsonPath("$.data.signals.traces.errorCode").value("storage_unavailable"))
                .andExpect(jsonPath("$.data.polling.decision").value("manual_retry"))
                .andExpect(jsonPath("$.data.polling.pollAfterMs").doesNotExist())
                .andExpect(jsonPath("$.data.queryJumpContext.startedAt").value(1710000000000L))
                .andExpect(jsonPath("$.data.queryJumpContext.serviceInstanceId").doesNotExist())
                .andExpect(jsonPath("$.data.queryJumpContext.endpoint").doesNotExist())
                .andExpect(jsonPath("$.data.queryJumps[2].signal").value("traces"))
                .andExpect(jsonPath("$.data.queryJumps[2].enabled").value(false));
    }

    @Test
    void normalizesAdditiveInstanceAndEndpointAcrossDetectionResponseAndJumps() throws Exception {
        mockMvc.perform(post("/api/instrumentation/v1/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "schemaVersion": 1,
                                  "language": "go",
                                  "framework": "go_generic",
                                  "method": "ebpf",
                                  "environment": "vm",
                                  "platform": "linux_amd64",
                                  "service": {
                                    "name": "checkout-api",
                                    "namespace": "commerce",
                                    "environment": "prod",
                                    "serviceInstanceId": " checkout-7d9 ",
                                    "endpoint": " /checkout/{id} "
                                  },
                                  "collectorId": "collector-east",
                                  "startedAt": 1710000000000
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.context.service.serviceInstanceId").value("checkout-7d9"))
                .andExpect(jsonPath("$.data.context.service.endpoint").value("/checkout/{id}"))
                .andExpect(jsonPath("$.data.queryJumpContext.serviceInstanceId").value("checkout-7d9"))
                .andExpect(jsonPath("$.data.queryJumpContext.endpoint").value("/checkout/{id}"))
                .andExpect(jsonPath("$.data.queryJumps[0].context.serviceInstanceId").value("checkout-7d9"))
                .andExpect(jsonPath("$.data.queryJumps[0].context.endpoint").value("/checkout/{id}"))
                .andExpect(jsonPath("$.data.queryJumps[2].context.serviceInstanceId").value("checkout-7d9"))
                .andExpect(jsonPath("$.data.queryJumps[2].context.endpoint").value("/checkout/{id}"));
    }

    @Test
    void rejectsHighCardinalityEndpointWithStableNonEchoingError() throws Exception {
        mockMvc.perform(post("/api/instrumentation/v1/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "schemaVersion": 1,
                                  "language": "go",
                                  "framework": "go_generic",
                                  "method": "ebpf",
                                  "environment": "vm",
                                  "platform": "linux_amd64",
                                  "service": {
                                    "name": "checkout-api",
                                    "namespace": "commerce",
                                    "environment": "prod",
                                    "endpoint": "/checkout?token=private"
                                  },
                                  "collectorId": "collector-east",
                                  "startedAt": 1710000000000
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(1))
                .andExpect(jsonPath("$.msg").value("instrumentation_selection_invalid"));
    }

    @Test
    void returnsStableMachineCodesForInvalidSchemaSelectionAndContext() throws Exception {
        String valid = """
                {
                  "schemaVersion": %d,
                  "language": "%s",
                  "framework": "express",
                  "method": "zero_code",
                  "environment": "docker",
                  "platform": "linux_amd64",
                  "collector": {
                    "collectorId": "collector-east",
                    "otlpHttpEndpoint": "%s",
                    "otlpGrpcEndpoint": "http://collector.internal:4317",
                    "authorizationHeader": "Authorization"
                  },
                  "service": {"name": "checkout-api", "namespace": "commerce", "environment": "prod"}
                }
                """;
        assertMachineCode(valid.formatted(2, "nodejs", "http://collector.internal:4318"),
                "instrumentation_schema_unsupported");
        assertMachineCode(valid.formatted(1, "java", "http://collector.internal:4318"),
                "instrumentation_selection_invalid");
        assertMachineCode(valid.formatted(1, "nodejs", "http://token@collector.internal:4318"),
                "instrumentation_context_invalid");
    }

    private void assertMachineCode(String request, String code) throws Exception {
        mockMvc.perform(post("/api/instrumentation/v1/render")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(1))
                .andExpect(jsonPath("$.msg").value(code));
    }
}
