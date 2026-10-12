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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogAdditionalMeasuresHttpContractTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void invalidExtrasRejectBothPathsBeforeAdmission() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var mvc = mvc(service, admission);
        String primary = "{\"function\":\"avg\",\"field\":\"attribute:duration\"}";
        for (String extras : List.of("[]", "null", "{}", " ".repeat(2049), "[" + primary + "]",
                "[{\"function\":\"count\"}]", "[{\"function\":\"p96\",\"field\":\"attribute:x\"}]",
                "[{\"function\":\"avg\",\"field\":\"builtin:serviceName\"}]")) {
            checkRejected(mvc, Map.of("start", "1000", "end", "5000", "measure", primary, "additionalMeasures", extras));
        }
        checkRejected(mvc, Map.of("start", "1000", "end", "5000", "view", "timeseries", "additionalMeasures", "[" + primary + "]"));
        verifyNoInteractions(service, admission);
    }

    @Test
    void orderedExtrasReachSingleAndPairedRequestWithoutChangingRank() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var mvc = mvc(service, new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO));
        String primary = "{\"function\":\"p95\",\"field\":\"attribute:duration\"}";
        String extras = "[{\"function\":\"avg\",\"field\":\"attribute:duration\"},{\"function\":\"unique\",\"field\":\"builtin:serviceName\"}]";
        var params = Map.of("start", "1000", "end", "5000", "measure", primary, "additionalMeasures", extras);
        var request = get("/api/logs/analysis");
        params.forEach(request::param);
        mvc.perform(request).andExpect(status().isOk());
        mvc.perform(post("/api/logs/analysis/compare").contentType(MediaType.APPLICATION_JSON).content(envelope(params)))
                .andExpect(status().isOk());
        var single = ArgumentCaptor.forClass(LogAnalysis.Request.class);
        var paired = ArgumentCaptor.forClass(LogAnalysis.Request.class);
        verify(service).analysis(any(), single.capture());
        verify(service).compare(any(), paired.capture(), any(), any());
        assertEquals(single.getValue(), paired.getValue());
        assertEquals("p95", single.getValue().measure().function());
        assertEquals("measure-desc", single.getValue().order());
        assertEquals(List.of("avg", "unique"), single.getValue().additionalMeasures().stream().map(LogAnalysis.Measure::function).toList());
    }

    private static void checkRejected(MockMvc mvc, Map<String, String> parameters) throws Exception {
        var request = get("/api/logs/analysis");
        parameters.forEach(request::param);
        mvc.perform(request).andExpect(status().isBadRequest());
        mvc.perform(post("/api/logs/analysis/compare").contentType(MediaType.APPLICATION_JSON).content(envelope(parameters)))
                .andExpect(status().isBadRequest());
    }

    private static String envelope(Map<String, String> parameters) {
        return JsonUtil.toJson(Map.of("version", 1, "parameters", parameters, "queries", List.of(Map.of("id", "a"), Map.of("id", "b"))));
    }

    private static MockMvc mvc(LogQueryService service, ObservabilityQueryAdmissionService admission) {
        return MockMvcBuilders.standaloneSetup(new LogQueryController(service, admission, null))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }
}
