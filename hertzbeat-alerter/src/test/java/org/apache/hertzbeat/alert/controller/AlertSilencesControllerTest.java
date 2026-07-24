/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.alert.dto.AlertSilenceDeleteResponse;
import org.apache.hertzbeat.alert.dto.AlertSilencePageResponse;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;

@ExtendWith(MockitoExtension.class)
class AlertSilencesControllerTest {

    private MockMvc mockMvc;
    @Mock
    private AlertSilenceService service;
    @InjectMocks
    private AlertSilencesController controller;

    @BeforeEach
    void setUp() {
        mockMvc = standaloneSetup(controller).setControllerAdvice(new AlertSilenceControllerAdvice()).build();
    }

    @Test
    void listAndDeleteReturnExplicitContracts() throws Exception {
        when(service.list(null, null, "id", "desc", 0, 8))
                .thenReturn(new AlertSilencePageResponse(List.of(), 0, 0, 0, 8));
        when(service.delete(Set.of(7L, 8L)))
                .thenReturn(new AlertSilenceDeleteResponse("partial", Set.of(7L), Set.of(8L)));

        mockMvc.perform(get("/api/alert/silences"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(0));
        mockMvc.perform(delete("/api/alert/silences?ids=7&ids=8"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("partial"));
    }
}
