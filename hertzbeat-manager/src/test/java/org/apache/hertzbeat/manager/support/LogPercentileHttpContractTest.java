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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogPercentileHttpContractTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void sixFixedEstimatesPassAndInvalidFunctionsNeverReachService() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = new LogQueryController(service,
                new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO), null);
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        for (String measure : List.of("{\"function\":\"p96\",\"field\":\"attribute:duration\"}",
                "{\"function\":\"p95\",\"field\":\"builtin:serviceName\"}",
                "{\"function\":\"p95\",\"field\":\"attribute:duration\",\"quantile\":0.95}")) {
            mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000").param("measure", measure))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
        var functions = List.of("p50", "p75", "p90", "p95", "p98", "p99");
        for (String function : functions) {
            mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000")
                            .param("measure", "{\"function\":\"" + function + "\",\"field\":\"attribute:duration\"}"))
                    .andExpect(status().isOk());
        }
        var requests = ArgumentCaptor.forClass(LogAnalysis.Request.class);
        verify(service, org.mockito.Mockito.times(6)).analysis(any(), requests.capture());
        assertEquals(functions, requests.getAllValues().stream().map(request -> request.measure().function()).toList());
        for (var request : requests.getAllValues()) { assertEquals("measure-desc", request.order()); }
    }
}
