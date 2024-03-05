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

package org.dromara.hertzbeat.alert.controller;

import org.dromara.hertzbeat.alert.dto.GeneralCloudAlertReport;
import org.dromara.hertzbeat.alert.dto.TenCloudAlertReport;
import org.dromara.hertzbeat.alert.service.AlertService;
import org.dromara.hertzbeat.common.constants.CommonConstants;
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
        TenCloudAlertReport.Dimensions dimensions = new TenCloudAlertReport.Dimensions();
        dimensions.setUnInstanceId("3333");

        TenCloudAlertReport.AlarmObjInfo alarmObjInfo = new TenCloudAlertReport.AlarmObjInfo();
        alarmObjInfo.setRegion("广东");
        alarmObjInfo.setNamespace("广州节点1");
        alarmObjInfo.setAppId("1111");
        alarmObjInfo.setUin("2222");
        alarmObjInfo.setDimensions(dimensions);

        TenCloudAlertReport.Conditions conditions = new TenCloudAlertReport.Conditions();
        conditions.setMetricName("xx");
        conditions.setMetricShowName("xxx");
        conditions.setCalcType("a");
        conditions.setCalcValue("aa");
        conditions.setCalcUnit("aaa");
        conditions.setCurrentValue("b");
        conditions.setCalcUnit("bb");
        conditions.setProductName("guangzhou");
        conditions.setProductShowName("广州");
        conditions.setEventName("CVS");
        conditions.setEventShowName("内核异常");

        TenCloudAlertReport.AlarmPolicyInfo alarmPolicyInfo = new TenCloudAlertReport.AlarmPolicyInfo();
        alarmPolicyInfo.setPolicyTypeCname("x");
        alarmPolicyInfo.setPolicyName("测试1");
        alarmPolicyInfo.setConditions(conditions);

        TenCloudAlertReport report = TenCloudAlertReport.builder()
                                             .sessionId("123")
                                             .alarmStatus("1")
                                             .alarmType("event")
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
        GeneralCloudAlertReport generalCloudAlertReport = new GeneralCloudAlertReport();
        generalCloudAlertReport.setAlertDateTime("2023-02-22T07:27:15.404000000Z");

        mockMvc.perform(MockMvcRequestBuilders
                                .post("/api/alerts/report")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(JsonUtil.toJson(generalCloudAlertReport))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":\"Add report success\",\"code\":0}"))
                .andReturn();
    }
}
