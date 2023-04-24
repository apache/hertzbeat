package org.dromara.hertzbeat.manager.controller;

import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.manager.pojo.dto.AppCount;
import org.dromara.hertzbeat.manager.service.impl.MonitorServiceImpl;
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
import java.util.List;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link SummaryController}
 */
@ExtendWith(MockitoExtension.class)
class SummaryControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MonitorServiceImpl monitorService;

    @InjectMocks
    private SummaryController summaryController;


    @BeforeEach
    void setUp()  {
        this.mockMvc = MockMvcBuilders.standaloneSetup(summaryController).build();
    }

    @Test
    void appMonitors() throws Exception {
        List<AppCount> appsCounts = new ArrayList<>();

        AppCount appCount = new AppCount();
        appCount.setApp("os");
        appCount.setCategory("mysql");
        appCount.setStatus((byte) 1);
        appsCounts.add(appCount);

        Mockito.when(monitorService.getAllAppMonitorsCount())
                .thenReturn(appsCounts);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.apps[0].app").value("os"))
                .andReturn();
    }
}