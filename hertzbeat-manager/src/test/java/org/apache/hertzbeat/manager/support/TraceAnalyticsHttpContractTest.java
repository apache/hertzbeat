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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.traces.controller.TraceQueryController;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.investigation.service.TraceInvestigationReadModelService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class TraceAnalyticsHttpContractTest {
    private final EntityTraceQueryService entityTraceQueryService = mock(EntityTraceQueryService.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var controller = new TraceQueryController(entityTraceQueryService,
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)),
                mock(TraceInvestigationReadModelService.class));
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void clear() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void analyticsRejectInvalidWindowsPopulationsFieldsAndLimitsBeforeStorage() throws Exception {
        for (String[] parameter : List.of(new String[]{"end", "1000"}, new String[]{"start", "invalid"},
                new String[]{"endExclusive", "yes"}, new String[]{"population", "roots"},
                new String[]{"bucketCount", "61"}, new String[]{"minDurationMs", "-1"},
                new String[]{"spanScope", "anything"}, new String[]{"traceId", "invalid"}, new String[]{"entityId", "-1"})) {
            var request = get("/api/traces/stats/histogram");
            var params = new java.util.HashMap<>(Map.of("start", "1000", "end", "2000"));
            params.put(parameter[0], parameter[1]);
            params.forEach(request::param);
            mockMvc.perform(request).andExpect(status().isBadRequest());
        }
        mockMvc.perform(get("/api/traces/facets/values").param("start", "1000").param("end", "2000")
                .param("field", "arbitrary.sql")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/traces/spans").param("start", "1000").param("end", "2000")
                .param("population", "matched_traces")).andExpect(status().isBadRequest());
        verifyNoInteractions(entityTraceQueryService);
    }

}
