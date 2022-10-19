package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.manager.ParamDefine;
import com.usthe.common.util.CommonConstants;
import com.usthe.manager.pojo.dto.Hierarchy;
import com.usthe.manager.service.impl.AppServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;


import java.util.ArrayList;
import java.util.Arrays;
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