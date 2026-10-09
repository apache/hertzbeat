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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogComparisonSourceHttpContractTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void comparedErrorsIdentifyOnlySourceAndPreserveExistingEndpointShapes() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = new LogQueryController(service,
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)), null);
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        for (String id : new String[] {"a", "b"}) {
            for (String expression : new String[] {"status:ERROR OR", "*:private-marker"}) {
                String a = "a".equals(id) ? expression : "*";
                String b = "b".equals(id) ? expression : "*";
                var result = mvc.perform(post("/api/logs/analysis/compare").contentType(MediaType.APPLICATION_JSON).content(
                        "{\"version\":1,\"parameters\":{\"start\":\"1000\",\"end\":\"5000\"},\"queries\":["
                                + "{\"id\":\"a\",\"searchSyntax\":\"structured-v1\",\"search\":\"" + a + "\"},"
                                + "{\"id\":\"b\",\"searchSyntax\":\"structured-v1\",\"search\":\"" + b + "\"}]}"))
                        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.msg").value("observability_log_filter_invalid"))
                        .andExpect(jsonPath("$.data.source").value(id));
                if (expression.startsWith("*:")) { result.andExpect(jsonPath("$.data.reason").value("full_text_unsupported")); }
                else { result.andExpect(jsonPath("$.data.reason").doesNotExist()); }
                org.junit.jupiter.api.Assertions.assertFalse(result.andReturn().getResponse().getContentAsString().contains(expression));
            }
        }
        mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000")
                        .param("searchSyntax", "structured-v1").param("search", "status:ERROR OR"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data").doesNotExist());
        mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000")
                        .param("searchSyntax", "structured-v1").param("search", "*:private-marker"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.reason").value("full_text_unsupported"))
                .andExpect(jsonPath("$.data.source").doesNotExist());
        verifyNoInteractions(service);
    }
}
