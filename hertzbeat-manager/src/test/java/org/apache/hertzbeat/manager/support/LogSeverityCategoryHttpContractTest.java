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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import org.apache.hertzbeat.observability.logs.controller.LogSseController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.logs.service.impl.LogSseServiceImpl;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogSeverityCategoryHttpContractTest {
    private final LogQueryService queryService = mock(LogQueryService.class);
    private final LogSseManager emitters = mock(LogSseManager.class);
    private final HistoryDataReader reader = mock(HistoryDataReader.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("default");
        AuthTokenRequestContext.bindWorkspaceId("default");
        var admission = new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100));
        var controller = new LogQueryController(queryService, admission, mock(LogInvestigationReadModelService.class));
        mockMvc = MockMvcBuilders.standaloneSetup(controller,
                        new LogSseController(new LogSseServiceImpl(emitters, List.of(reader), admission)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void invalidCategoriesUseTheProductionQueryBadRequestContract() throws Exception {
        for (String endpoint : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend", "stats/group-by")) {
            for (String category : List.of("SEVERE", "", "error", "17")) {
                mockMvc.perform(get("/api/logs/" + endpoint)
                                .param("severityCategory", category).param("groupBy", "severity"))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.msg").value(ObservabilityQueryRequestException.ERROR_CODE));
            }
        }
        verifyNoInteractions(queryService);
    }

    @Test
    void invalidLiveCategoriesStayBadRequestsWithProductionAdvice() throws Exception {
        for (String endpoint : List.of("validate", "subscribe")) {
            for (String category : List.of("SEVERE", "", "error", "17")) {
                var result = mockMvc.perform(get("/api/logs/sse/" + endpoint).param("severityCategory", category))
                        .andExpect(status().isBadRequest());
                String body = result.andReturn().getResponse().getContentAsString();
                // IllegalArgumentException currently maps to an HTTP 400 with no JSON error envelope.
                assertEquals("", body);
                if (!category.isEmpty()) {
                    assertFalse(body.contains(category));
                }
            }
        }
        verifyNoInteractions(reader, emitters, queryService);
    }

}
