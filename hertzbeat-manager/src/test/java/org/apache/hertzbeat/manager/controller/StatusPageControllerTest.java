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

package org.apache.hertzbeat.manager.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import java.util.Collections;
import java.util.List;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageComponentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageOrgInfo;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * test case for {@link StatusPageController}
 */

@ExtendWith(MockitoExtension.class)
class StatusPageControllerTest {

    private MockMvc mockMvc;

    @Mock
    private StatusPageService statusPageService;

    @InjectMocks
    private StatusPageController statusPageController;

    @BeforeEach
    public void setup() {

        mockMvc = standaloneSetup(statusPageController).build();
    }

    @Test
    public void testQueryStatusPageOrg() throws Exception {

        StatusPageOrgInfo statusPageOrg = new StatusPageOrgInfo();
        when(statusPageService.queryStatusPageOrg()).thenReturn(statusPageOrg);

        mockMvc.perform(get("/api/status/page/org")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testQueryStatusPageOrg_NotFound() throws Exception {

        when(statusPageService.queryStatusPageOrg()).thenReturn(null);

        mockMvc.perform(get("/api/status/page/org")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Status Page Organization Not Found"));
    }

    @Test
    public void testSaveStatusPageOrg() throws Exception {

        StatusPageOrgInfo statusPageOrg = new StatusPageOrgInfo();
        statusPageOrg.setName("Test name");
        statusPageOrg.setHome("Test home");
        statusPageOrg.setDescription("Test description");
        statusPageOrg.setLogo("Test logo");
        when(statusPageService.saveStatusPageOrg(statusPageOrg)).thenReturn(statusPageOrg);

        mockMvc.perform(post("/api/status/page/org")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(statusPageOrg))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testQueryStatusPageComponent() throws Exception {

        List<StatusPageComponentInfo> components = Collections.singletonList(new StatusPageComponentInfo());
        components.get(0).setId(1L);
        components.get(0).setName("Gateway");
        when(statusPageService.queryStatusPageComponents()).thenReturn(components);

        mockMvc.perform(get("/api/status/page/component")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data[0].name").value("Gateway"));
    }

    @Test
    public void testNewStatusPageComponent() throws Exception {

        mockMvc.perform(post("/api/status/page/component")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Component\",\"method\":0,\"configState\":0,\"state\":0}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"));
    }

    @Test
    public void testUpdateStatusPageComponent() throws Exception {

        mockMvc.perform(put("/api/status/page/component")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated Component\",\"method\":0,\"configState\":0,\"state\":0}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Update success"));
    }

    @Test
    public void testDeleteStatusPageComponent() throws Exception {

        mockMvc.perform(delete("/api/status/page/component/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"));
    }

    @Test
    public void testQueryStatusPageComponentById() throws Exception {

        StatusPageComponentInfo component = new StatusPageComponentInfo();
        component.setId(1L);
        component.setName("API Gateway");
        when(statusPageService.queryStatusPageComponent(1L)).thenReturn(component);

        mockMvc.perform(get("/api/status/page/component/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.name").value("API Gateway"));
    }

    @Test
    public void testNewStatusPageIncident() throws Exception {

        StatusPageIncidentInfo statusPageIncident = new StatusPageIncidentInfo();
        statusPageIncident.setName("New Incident");

        mockMvc.perform(post("/api/status/page/incident")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(statusPageIncident))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"));
    }

    @Test
    public void testUpdateStatusPageIncident() throws Exception {

        StatusPageIncidentInfo statusPageIncident = new StatusPageIncidentInfo();
        statusPageIncident.setName("Update Incident");

        mockMvc.perform(put("/api/status/page/incident")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(statusPageIncident))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testDeleteStatusPageIncident() throws Exception {

        mockMvc.perform(delete("/api/status/page/incident/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"));
    }

    @Test
    public void testQueryStatusPageIncidentById() throws Exception {

        StatusPageIncidentInfo incident = new StatusPageIncidentInfo();
        when(statusPageService.queryStatusPageIncident(1L)).thenReturn(incident);

        mockMvc.perform(get("/api/status/page/incident/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testQueryStatusPageIncident() throws Exception {
        mockMvc.perform(get("/api/status/page/incident?pageIndex=0&pageSize=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

}
