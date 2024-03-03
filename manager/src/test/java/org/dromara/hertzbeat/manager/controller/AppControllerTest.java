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

package org.dromara.hertzbeat.manager.controller;

import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.manager.ParamDefine;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.manager.pojo.dto.Hierarchy;
import org.dromara.hertzbeat.manager.service.impl.AppServiceImpl;
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


import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/**
 * Test case for {@link AppController}
 */
@ExtendWith(MockitoExtension.class)
class AppControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AppServiceImpl appService;

    @InjectMocks
    private AppController appController;
    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(appController).build();
    }

    @Test
    void queryAppParamDefines() throws Exception {
        // Data to make ｜ 制造数据
        List<ParamDefine> paramDefines = new ArrayList<>();
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setId(1L);
        paramDefine.setApp("tanCloud");
        paramDefine.setName(new HashMap<>());
        paramDefine.setField("port");
        paramDefine.setType("number");
        paramDefine.setDefaultValue("12");
        paramDefine.setPlaceholder("请输出密码");
        paramDefine.setCreator("tom");
        paramDefine.setModifier("tom");
        paramDefines.add(paramDefine);

        // The interface is called to return manufactured data｜ 调用接口返回制造的数据
        Mockito.when(appService.getAppParamDefines("api"))
                .thenReturn(paramDefines);

        // Request interface ｜ 请求接口
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/apps/{app}/params", "api"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andReturn();
    }

    @Test
    void queryAppDefine() throws Exception {
        // Data to make ｜ 制造数据
        Job define = new Job();
        define.setId(1L);
        define.setMonitorId(1L);
        define.setCategory("os");
        define.setApp("linux");
        define.setName(new HashMap<>());
        define.setMetrics(new ArrayList<>());
        define.setConfigmap(new ArrayList<>());

        // The interface is called to return manufactured data｜ 调用接口返回制造的数据
        Mockito.when(appService.getAppDefine("api"))
                .thenReturn(define);

        // Request interface ｜ 请求接口
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/apps/{app}/define", "api"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.id").value(1))
                .andReturn();
    }

    @Test
    void queryAppsHierarchy() throws Exception {
        // Data to make ｜ 制造数据
        Hierarchy hierarchy = new Hierarchy();
        hierarchy.setLabel("Linux系统");
        hierarchy.setValue("linux");
        hierarchy.setCategory("os");
        List<Hierarchy> list = new ArrayList<>();
        list.add(hierarchy);

        // The interface is called to return manufactured data｜ 调用接口返回制造的数据
        Mockito.when(appService.getAllAppHierarchy("zh-CN"))
                .thenReturn(list);

        // Request interface ｜ 请求接口
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/apps/hierarchy", "zh-CN"))
                    .andExpect( jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.data[0].category").value("os"))
                    .andReturn();



    }
}