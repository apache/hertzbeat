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

package org.apache.hertzbeat.manager.instrumentation.intake;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Capability;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Exact management API CRUD and unsafe-field rejection contracts. */
class CollectorIntakeAdvertisementControllerTest {

    private CollectorIntakeAdvertisementService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = mock(CollectorIntakeAdvertisementService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new CollectorIntakeAdvertisementController(service, new CollectorIntakeAdvertisementCodec()))
                .build();
    }

    @Test
    void putPersistsOnlyTheExactVersionedRequest() throws Exception {
        CollectorIntakeAdvertisementRequest request = request();
        CollectorInstrumentationIntake response = request.available("edge-west");
        when(service.update(eq("edge-west"), eq(request))).thenReturn(response);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/collector/edge-west/instrumentation-intake")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new CollectorIntakeAdvertisementCodec().encode(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state").value("available"))
                .andExpect(jsonPath("$.data.collectorId").value("edge-west"))
                .andExpect(jsonPath("$.data.authorizationHeader").value("Authorization"));
        verify(service).update("edge-west", request);
    }

    @Test
    void deleteClearsAndReturnsNotAdvertisedImmediately() throws Exception {
        CollectorInstrumentationIntake cleared = CollectorInstrumentationIntake.notAdvertised("edge-west");
        when(service.clear("edge-west")).thenReturn(cleared);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/collector/edge-west/instrumentation-intake"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state").value("unavailable"))
                .andExpect(jsonPath("$.data.errorCode").value("intake_not_advertised"));
        verify(service).clear("edge-west");
    }

    @Test
    void putRejectsTokenOrResponseFieldsWithoutEchoingTheirValues() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.put("/api/collector/edge-west/instrumentation-intake")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schemaVersion\":1,\"token\":\"do-not-echo\",\"state\":\"available\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("intake_advertisement_invalid"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("do-not-echo"))));
    }

    private CollectorIntakeAdvertisementRequest request() {
        return new CollectorIntakeAdvertisementRequest(
                1,
                Gateway.SERVER,
                List.of(Capability.OTLP_GRPC),
                null,
                "https://server.example.test:4317");
    }
}
