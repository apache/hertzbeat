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

package org.apache.hertzbeat.manager.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryReadModel;
import org.apache.hertzbeat.manager.service.entity.EntityDiscoveryReadModelService;
import org.apache.hertzbeat.manager.support.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class EntityDiscoveryControllerTest {

    @Mock
    private EntityDiscoveryReadModelService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new EntityDiscoveryController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void returnsTheExactVersionedEnvelopeAndTrimsSearch() throws Exception {
        EntityDiscoveryReadModel response = new EntityDiscoveryReadModel(
                1,
                2,
                10,
                24,
                3,
                List.of(new EntityDiscoveryReadModel.DiscoveryRow(
                        new EntityDiscoveryReadModel.MonitorSummary(
                                41L, "checkout", "springboot3", "checkout:8080", (byte) 1),
                        List.of(new EntityDiscoveryReadModel.Candidate(
                                101L, "Checkout", "service", "direct", List.of("service.name"))))));
        when(service.getDiscovery("checkout", 2, 10)).thenReturn(response);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/discovery")
                        .param("search", "  checkout  ")
                        .param("pageIndex", "2")
                        .param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.pageIndex").value(2))
                .andExpect(jsonPath("$.data.pageSize").value(10))
                .andExpect(jsonPath("$.data.totalElements").value(24))
                .andExpect(jsonPath("$.data.totalPages").value(3))
                .andExpect(jsonPath("$.data.content[0].monitor.id").value(41))
                .andExpect(jsonPath("$.data.content[0].monitor.name").value("checkout"))
                .andExpect(jsonPath("$.data.content[0].monitor.app").value("springboot3"))
                .andExpect(jsonPath("$.data.content[0].monitor.instance").value("checkout:8080"))
                .andExpect(jsonPath("$.data.content[0].monitor.status").value(1))
                .andExpect(jsonPath("$.data.content[0].candidates[0].resourceId").value(101))
                .andExpect(jsonPath("$.data.content[0].candidates[0].resourceName").value("Checkout"))
                .andExpect(jsonPath("$.data.content[0].candidates[0].resourceType").value("service"))
                .andExpect(jsonPath("$.data.content[0].candidates[0].match").value("direct"))
                .andExpect(jsonPath("$.data.content[0].candidates[0].matchedKeys[0]").value("service.name"))
                .andExpect(jsonPath("$.data.content[0].monitor.params").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].monitor.labels").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].monitor.annotations").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].candidates[0].matchedIdentities").doesNotExist());
        verify(service).getDiscovery("checkout", 2, 10);
    }

    @Test
    void rejectsSearchAndPageBoundsBeforeCallingTheService() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/discovery")
                        .param("search", "x".repeat(201)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.PARAM_INVALID_CODE));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/discovery").param("pageIndex", "-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.PARAM_INVALID_CODE));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/discovery").param("pageSize", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.PARAM_INVALID_CODE));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/discovery").param("pageSize", "51"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.PARAM_INVALID_CODE));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/discovery")
                        .param("pageIndex", "secret-page-value"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.PARAM_INVALID_CODE))
                .andExpect(jsonPath("$.msg").value("entity_discovery_page_index_invalid"))
                .andExpect(jsonPath("$.msg").value(not(containsString("secret-page-value"))));
        verifyNoInteractions(service);
    }

    @Test
    void serviceFailuresUseTheExistingSafeMessageLayer() throws Exception {
        when(service.getDiscovery(null, 0, 8))
                .thenThrow(new CommonException("entity_discovery_unavailable"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/discovery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("entity_discovery_unavailable"))
                .andExpect(jsonPath("$.msg").value(not(containsString("secret"))));
    }
}
