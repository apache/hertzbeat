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

package org.apache.hertzbeat.observability.logs.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.time.Duration;
import static org.mockito.Mockito.mockingDetails;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.Invocation;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

class LogQueryWorkspaceControllerContractTest {

    private LogQueryService logQueryService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        logQueryService = mock(LogQueryService.class, invocation -> {
            if (Page.class.isAssignableFrom(invocation.getMethod().getReturnType())) {
                return Page.empty();
            }
            if (Map.class.isAssignableFrom(invocation.getMethod().getReturnType())) {
                return Map.of();
            }
            return null;
        });
        mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new LogQueryController(logQueryService,
                        new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)),
                        org.mockito.Mockito.mock(org.apache.hertzbeat.observability.investigation.service
                                .LogInvestigationReadModelService.class)))
                .setControllerAdvice(new UnavailableAdvice())
                .build();
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void allExternalReadsPassOneNormalizedTrustedWorkspaceToTheService() throws Exception {
        for (MockHttpServletRequestBuilder request : allExternalReads()) {
            AuthTokenRequestContext.bindWorkspaceId(" team-a ");
            int before = serviceInvocations().size();

            mockMvc.perform(request).andExpect(status().isOk());

            List<Invocation> after = serviceInvocations();
            assertThat(after).hasSize(before + 1);
            Object[] arguments = after.get(before).getArguments();
            assertThat(arguments).as("workspace must be the first immutable service argument").isNotEmpty();
            assertThat(arguments[0]).isEqualTo("team-a");
        }
    }

    @Test
    void missingTrustedWorkspaceIsUnavailableBeforeTheService() throws Exception {
        AuthTokenRequestContext.clear();

        for (MockHttpServletRequestBuilder request : allExternalReads()) {
            mockMvc.perform(request).andExpect(status().isServiceUnavailable());
        }

        assertThat(serviceInvocations()).isEmpty();
    }

    private List<Invocation> serviceInvocations() {
        return List.copyOf(mockingDetails(logQueryService).getInvocations());
    }

    private List<MockHttpServletRequestBuilder> allExternalReads() {
        String complexResourceFilter = "service.version IN ('1.2.3', '1.2.4')";
        String complexAttributeFilter = "http.route CONTAINS '/checkout'";
        return List.of(
                MockMvcRequestBuilders.get("/api/logs/list")
                        .param("resourceFilter", complexResourceFilter)
                        .param("attributeFilter", complexAttributeFilter),
                MockMvcRequestBuilders.get("/api/logs/stats/overview")
                        .param("resourceFilter", complexResourceFilter)
                        .param("attributeFilter", complexAttributeFilter),
                MockMvcRequestBuilders.get("/api/logs/stats/trace-coverage")
                        .param("resourceFilter", complexResourceFilter)
                        .param("attributeFilter", complexAttributeFilter),
                MockMvcRequestBuilders.get("/api/logs/stats/trend")
                        .param("resourceFilter", complexResourceFilter)
                        .param("attributeFilter", complexAttributeFilter),
                MockMvcRequestBuilders.get("/api/logs/stats/group-by")
                        .param("groupBy", "service.name")
                        .param("resourceFilter", complexResourceFilter)
                        .param("attributeFilter", complexAttributeFilter));
    }

    @RestControllerAdvice(assignableTypes = LogQueryController.class)
    static class UnavailableAdvice {

        @ExceptionHandler(TelemetryStorageUnavailableException.class)
        ResponseEntity<Void> unavailable() {
            return ResponseEntity.status(503).build();
        }
    }
}
