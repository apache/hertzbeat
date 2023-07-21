package org.dromara.hertzbeat.alert.controller;

import org.dromara.hertzbeat.alert.dto.TenCloudAlertReport;
import org.dromara.hertzbeat.alert.service.AlertService;
import org.dromara.hertzbeat.alert.service.impl.AlertConvertTenCloudServiceImpl;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.AlertReport;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * unit test for {@link AlertReportController }
 * @author tom
 */
@ExtendWith(MockitoExtension.class)
class AlertReportControllerTest {
    
    private MockMvc mockMvc;
    
    @InjectMocks
    private AlertReportController alertReportController;
    
    @Mock
    private AlertService alertService;
    
    @Mock
    AlertConvertTenCloudServiceImpl alertConvertTenCloudService;
    
    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertReportController).build();
    }
    
    @Test
    void addNewAlertReportTencent() throws Exception {
        TenCloudAlertReport report = TenCloudAlertReport.builder()
                                             .sessionId("xxxxxxxx")
                                             .alarmStatus("1")
                                             .alarmType("metric")
                                             .build();
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .post("/api/alerts/report/tencloud")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(JsonUtil.toJson(report))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":\"Add report success\",\"code\":0}"))
                .andReturn();
    }
    
    @Test
    void addNewAlertReport() throws Exception {
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .post("/api/alerts/report")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(JsonUtil.toJson(AlertReport.builder().build()))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":\"Add report success\",\"code\":0}"))
                .andReturn();
    }
}
