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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncident;
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;
import org.apache.hertzbeat.manager.pojo.dto.ComponentStatus;
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
 * test case for {@link StatusPagePublicController}
 */

@ExtendWith(MockitoExtension.class)
class StatusPagePublicControllerTest {

    private MockMvc mockMvc;

    @Mock
    private StatusPageService statusPageService;

    @InjectMocks
    private StatusPagePublicController statusPagePublicController;

    @BeforeEach
    public void setup() {

        mockMvc = standaloneSetup(statusPagePublicController).build();
    }

    @Test
    public void testQueryStatusPageOrg() throws Exception {

        StatusPageOrg statusPageOrg = StatusPageOrg.builder().build();
        when(statusPageService.queryStatusPageOrg()).thenReturn(statusPageOrg);

        mockMvc.perform(get("/api/status/page/public/org")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testQueryStatusPageOrgNotFound() throws Exception {

        when(statusPageService.queryStatusPageOrg()).thenReturn(null);

        mockMvc.perform(get("/api/status/page/public/org")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Status Page Organization Not Found"));
    }

    @Test
    public void testQueryStatusPageComponent() throws Exception {

        List<ComponentStatus> componentStatusList = Collections.singletonList(new ComponentStatus());
        when(statusPageService.queryComponentsStatus()).thenReturn(componentStatusList);

        mockMvc.perform(get("/api/status/page/public/component")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testQueryStatusPageComponentById() throws Exception {

        ComponentStatus componentStatus = new ComponentStatus();
        when(statusPageService.queryComponentStatus(1L)).thenReturn(componentStatus);

        mockMvc.perform(get("/api/status/page/public/component/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testQueryStatusPageIncident() throws Exception {

        List<StatusPageIncident> incidents = Collections.singletonList(new StatusPageIncident());
        when(statusPageService.queryStatusPageIncidents()).thenReturn(incidents);

        mockMvc.perform(get("/api/status/page/public/incident")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

}
