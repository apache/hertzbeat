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

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import java.util.HashMap;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.service.impl.AppServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for {@link I18nController}
 */
@ExtendWith(MockitoExtension.class)
class I18nControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AppServiceImpl appService;

    @InjectMocks
    private I18nController i18nController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(i18nController).build();
    }

    @Test
    void queryI18n() throws Exception {

        // The interface is called to return manufactured data
        Mockito.when(appService.getI18nResources("zh-CN"))
                .thenReturn(new HashMap<>());
        // Request interface
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/i18n/{lang}", "zh-CN"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}
