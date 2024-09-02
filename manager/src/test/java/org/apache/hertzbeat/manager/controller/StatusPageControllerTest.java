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
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncident;
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;
import org.apache.hertzbeat.common.util.JsonUtil;
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

        StatusPageOrg statusPageOrg = StatusPageOrg.builder().build();
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

        StatusPageOrg statusPageOrg = StatusPageOrg.builder()
                .name("Test name")
                .home("Test home")
                .description("Test description")
                .logo("Test logo")
                .build();
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

        List<StatusPageComponent> components = Collections.singletonList(new StatusPageComponent());
        when(statusPageService.queryStatusPageComponents()).thenReturn(components);

        mockMvc.perform(get("/api/status/page/component")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testNewStatusPageComponent() throws Exception {

        mockMvc.perform(post("/api/status/page/component")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Component\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"));
    }

    @Test
    public void testUpdateStatusPageComponent() throws Exception {

        mockMvc.perform(put("/api/status/page/component")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated Component\"}")
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

        StatusPageComponent component = new StatusPageComponent();
        when(statusPageService.queryStatusPageComponent(1L)).thenReturn(component);

        mockMvc.perform(get("/api/status/page/component/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testNewStatusPageIncident() throws Exception {

        StatusPageIncident statusPageIncident = StatusPageIncident.builder()
                .name("New Incident")
                .build();

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

        StatusPageIncident statusPageIncident = StatusPageIncident.builder()
                .name("Update Incident")
                .build();

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

        StatusPageIncident incident = new StatusPageIncident();
        when(statusPageService.queryStatusPageIncident(1L)).thenReturn(incident);

        mockMvc.perform(get("/api/status/page/incident/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testQueryStatusPageIncident() throws Exception {

        List<StatusPageIncident> incidents = Collections.singletonList(new StatusPageIncident());
        when(statusPageService.queryStatusPageIncidents()).thenReturn(incidents);

        mockMvc.perform(get("/api/status/page/incident")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

}
