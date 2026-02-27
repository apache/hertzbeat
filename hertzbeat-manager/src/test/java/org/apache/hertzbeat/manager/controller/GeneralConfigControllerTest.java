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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.impl.ConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Test case for {@link GeneralConfigController}
 */

@ExtendWith(MockitoExtension.class)
class GeneralConfigControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ConfigServiceImpl configService;

    @InjectMocks
    private GeneralConfigController generalConfigController;

    @BeforeEach
    public void setup() {

        mockMvc = standaloneSetup(generalConfigController).build();
    }

    @Test
    public void testSaveOrUpdateConfig() throws Exception {

        doNothing().when(configService).saveConfig(anyString(), any());

        mockMvc.perform(post("/api/config/email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"value\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Update config success"));
    }

    @Test
    public void testGetConfig() throws Exception {

        when(configService.getConfig(anyString())).thenReturn(any());

        mockMvc.perform(get("/api/config/email")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    public void testUpdateTemplateAppConfig() throws Exception {

        doNothing().when(configService).updateTemplateAppConfig(anyString(), any(TemplateConfig.AppTemplate.class));

        mockMvc.perform(put("/api/config/template/appName")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateKey\":\"templateValue\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

}
