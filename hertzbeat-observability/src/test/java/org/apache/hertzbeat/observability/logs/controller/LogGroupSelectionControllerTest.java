/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.logs.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.logs.service.impl.LogSseServiceImpl;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogGroupSelectionControllerTest {
    private static final String SELECTION = """
            {"version":1,"groups":[{"field":"attribute:proof.status","kind":"value","value":" 2.0 "}]}
            """;

    @AfterEach
    void clearWorkspace() { AuthTokenRequestContext.clear(); }

    @Test
    void everyHistoryEndpointCarriesSelectionAndTrustedWorkspace() throws Exception {
        var service = mock(LogQueryService.class);
        when(service.structuredList(any(), anyInt(), anyInt(), anyString())).thenReturn(Page.empty());
        var mvc = MockMvcBuilders.standaloneSetup(new LogQueryController(service,
                new org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService(8, 8, 8, 4, 8,
                        java.time.Duration.ofMillis(100)),
                mock(org.apache.hertzbeat.observability.investigation.service.LogInvestigationReadModelService.class))).build();
        AuthTokenRequestContext.bindWorkspaceId("default");
        for (String path : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend", "stats/group-by",
                "facets/fields", "facets/values", "analysis")) {
            mvc.perform(get("/api/logs/" + path).param("start", "1000").param("end", "5000")
                    .param("field", "attribute:proof.status").param("groupBy", "service.name")
                    .param("workspaceId", "untrusted").param("search", "a OR b")
                    .param("logGroupSelection", SELECTION)).andExpect(status().isOk());
        }
        var calls = mockingDetails(service).getInvocations();
        assertEquals(8, calls.size());
        for (var call : calls) {
            var query = (LogQueryService.FacetQuery) call.getArgument(0);
            assertEquals(SELECTION, query.logGroupSelection());
            assertEquals("default", query.workspaceId());
            assertEquals("a OR b", query.search());
        }
    }

    @Test
    void livePreflightAndSubscribeRejectSelectionWithSameSafeReason() throws Exception {
        var emitterManager = mock(LogSseManager.class);
        // Selection support is reader-dependent; validate through the real service.
        var service = new LogSseServiceImpl(emitterManager, List.of(),
                new org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService(8, 8, 8, 4, 8,
                        java.time.Duration.ofMillis(100)));
        var mvc = MockMvcBuilders.standaloneSetup(new LogSseController(service)).build();
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("default");
        for (String path : List.of("validate", "subscribe")) {
            for (String syntax : List.of("", "structured-v1")) {
                var request = get("/api/logs/sse/" + path).param("logGroupSelection", SELECTION)
                        .accept("subscribe".equals(path) ? MediaType.TEXT_EVENT_STREAM : MediaType.APPLICATION_JSON);
                if (!syntax.isEmpty()) { request.param("searchSyntax", syntax); }
                mvc.perform(request).andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.msg").value("observability_log_filter_invalid"))
                        .andExpect(jsonPath("$.data.reason").value("group_selection_unsupported"));
            }
            mvc.perform(get("/api/logs/sse/" + path).param("logGroupSelection", "{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value("observability_log_filter_invalid"));
        }
        verifyNoInteractions(emitterManager);
    }
}
