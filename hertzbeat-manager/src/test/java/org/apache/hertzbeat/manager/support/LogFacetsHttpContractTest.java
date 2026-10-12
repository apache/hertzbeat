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

package org.apache.hertzbeat.manager.support;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.investigation.service.LogInvestigationReadModelService;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogFacetsHttpContractTest {
    private final LogQueryService queryService = mock(LogQueryService.class, invocation -> {
        if (org.springframework.data.domain.Page.class.isAssignableFrom(invocation.getMethod().getReturnType())) {
            return org.springframework.data.domain.Page.empty();
        }
        return null;
    });
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("default");
        AuthTokenRequestContext.bindWorkspaceId("default");
        var admission = new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100));
        var controller = new LogQueryController(queryService, admission, mock(LogInvestigationReadModelService.class));
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void invalidFacetParametersUseProductionBadRequestMapping() throws Exception {
        for (String endpoint : List.of("fields", "values")) {
            for (var invalid : List.of(java.util.Map.of("start", "no"), java.util.Map.of("start", ""),
                    java.util.Map.of("end", "999"), java.util.Map.of("end", "86402001"),
                    java.util.Map.of("hideNoise", "maybe"), java.util.Map.of("entityId", "-1"),
                    java.util.Map.of("severityCategory", "SEVERE"))) {
                var request = get("/api/logs/facets/" + endpoint).param("start", "1000").param("end", "2000")
                        .param("field", "builtin:serviceName");
                // Replace, rather than append, invalid values to exercise the actual request.
                invalid.forEach((key, value) -> request.with(servlet -> {
                    servlet.setParameter(key, value);
                    return servlet;
                }));
                mockMvc.perform(request).andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.msg").value(ObservabilityQueryRequestException.ERROR_CODE));
            }
            mockMvc.perform(get("/api/logs/facets/" + endpoint).param("field", "builtin:serviceName"))
                    .andExpect(status().isBadRequest());
        }
        for (var invalid : List.of(java.util.Map.of("field", "resource:a['b']"),
                java.util.Map.of("field", "builtin:sql"), java.util.Map.of("limit", "101"),
                java.util.Map.of("limit", "no"), java.util.Map.of("limit", "0"))) {
            var request = get("/api/logs/facets/values").param("start", "1000").param("end", "2000")
                    .param("field", "builtin:serviceName");
            invalid.forEach((key, value) -> request.with(servlet -> {
                servlet.setParameter(key, value);
                return servlet;
            }));
            mockMvc.perform(request).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(queryService);
    }

    @Test
    void missingWorkspaceCannotBecomeUnscopedDiscovery() throws Exception {
        AuthTokenRequestContext.clear();
        for (String endpoint : List.of("fields", "values")) {
            mockMvc.perform(get("/api/logs/facets/" + endpoint).param("start", "1000").param("end", "2000")
                            .param("field", "builtin:serviceName"))
                    .andExpect(status().isServiceUnavailable());
        }
        verifyNoInteractions(queryService);
    }

    @Test
    void listSortIsValidatedAndPassedWithoutChangingDefault() throws Exception {
        mockMvc.perform(get("/api/logs/list").param("sort", "latency"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value(ObservabilityQueryRequestException.ERROR_CODE));
        verifyNoInteractions(queryService);
        mockMvc.perform(get("/api/logs/list")).andExpect(status().isOk());
        mockMvc.perform(get("/api/logs/list").param("sort", "oldest")).andExpect(status().isOk());
        var calls = org.mockito.Mockito.mockingDetails(queryService).getInvocations().stream().toList();
        org.junit.jupiter.api.Assertions.assertEquals("newest", calls.getFirst().getArguments()[19]);
        org.junit.jupiter.api.Assertions.assertEquals("oldest", calls.getLast().getArguments()[19]);
    }
}
