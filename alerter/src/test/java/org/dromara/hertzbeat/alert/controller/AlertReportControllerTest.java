package org.dromara.hertzbeat.alert.controller;

import org.dromara.hertzbeat.alert.dto.TenCloudAlertReport;
import org.dromara.hertzbeat.alert.service.AlertService;
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
 *
 */
@ExtendWith(MockitoExtension.class)
class AlertReportControllerTest {
    
    private MockMvc mockMvc;

    @Mock
    private AlertService alertService;
    
    @InjectMocks
    private AlertReportController alertReportController;
    
    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertReportController).build();
    }
    
    @Test
    void addNewAlertReportTencent() throws Exception {
        TenCloudAlertReport.AlarmObjInfo alarmObjInfo = new TenCloudAlertReport.AlarmObjInfo();
        alarmObjInfo.setRegion("广东");
        alarmObjInfo.setNamespace("广州节点1");

        TenCloudAlertReport.Conditions conditions = new TenCloudAlertReport.Conditions();
        conditions.setMetricName("xx");
        conditions.setMetricShowName("xxx");
        conditions.setCalcType("a");
        conditions.setCalcValue("aa");
        conditions.setCalcUnit("aaa");
        conditions.setCurrentValue("b");
        conditions.setCalcUnit("bb");

        TenCloudAlertReport.AlarmPolicyInfo alarmPolicyInfo = new TenCloudAlertReport.AlarmPolicyInfo();
        alarmPolicyInfo.setPolicyTypeCname("x");
        alarmPolicyInfo.setConditions(conditions);

        TenCloudAlertReport report = TenCloudAlertReport.builder()
                                             .sessionId("123")
                                             .alarmStatus("1")
                                             .alarmType("metric")
                                             .durationTime(2)
                                             .firstOccurTime("2023-08-14 11:11:11")
                                             .alarmObjInfo(alarmObjInfo)
                                             .alarmPolicyInfo(alarmPolicyInfo)
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
