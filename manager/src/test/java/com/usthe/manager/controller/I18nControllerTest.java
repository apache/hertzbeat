package com.usthe.manager.controller;

import com.usthe.common.util.CommonConstants;
import com.usthe.manager.service.TagService;
import com.usthe.manager.service.impl.AppServiceImpl;
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

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

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

        // The interface is called to return manufactured data｜ 调用接口返回制造的数据
        Mockito.when(appService.getI18nResources("zh-CN"))
                .thenReturn(new HashMap<>());
        // Request interface ｜ 请求接口
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/i18n/{lang}", "zh-CN"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}