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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogRollupHttpContractTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void incompatibleIntervalRejectsBothPathsBeforeAdmissionEvenWithUnknownEntity() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new LogQueryController(service, admission, null))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        var parameters = Map.of("start", "1000", "end", "61000", "view", "timeseries", "intervalMs", "1000", "entityId", "123456");
        mvc.perform(get("/api/logs/analysis").params(new org.springframework.util.LinkedMultiValueMap<>(
                        parameters.entrySet().stream().collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> List.of(e.getValue()))))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value("observability_log_analysis_interval_too_small"));
        mvc.perform(post("/api/logs/analysis/compare").contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(Map.of("version", 1, "parameters", parameters,
                                "queries", List.of(Map.of("id", "a"), Map.of("id", "b"))))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value("observability_log_analysis_interval_too_small"));
        verifyNoInteractions(service, admission);
    }

    @Test
    void malformedIntervalsAndGroupsNeverReachAdmission() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new LogQueryController(service, admission, null))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        for (String value : List.of("", "0", "-1000", "1000.0", "01000", "+1000", " 1000", "2000")) {
            mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "2000")
                            .param("view", "timeseries").param("intervalMs", value)).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "2000")
                        .param("view", "groups").param("intervalMs", "1000")).andExpect(status().isBadRequest());
        verifyNoInteractions(service, admission);
    }
}
