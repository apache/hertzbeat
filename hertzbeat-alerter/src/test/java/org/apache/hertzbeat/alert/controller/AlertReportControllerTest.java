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

package org.apache.hertzbeat.alert.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.HashMap;
import org.apache.hertzbeat.alert.dto.TencentCloudExternAlert;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;


/**
 * unit test for {@link AlertReportController }
 */
@Disabled
@ExtendWith(MockitoExtension.class)
class AlertReportControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ExternAlertService externAlertService;

    @InjectMocks
    private AlertReportController alertReportController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertReportController).build();
    }

    @Test
    void addNewAlertReportTencent() throws Exception {
        TencentCloudExternAlert.Dimensions dimensions = new TencentCloudExternAlert.Dimensions();
        dimensions.setUnInstanceId("3333");

        TencentCloudExternAlert.AlarmObjInfo alarmObjInfo = new TencentCloudExternAlert.AlarmObjInfo();
        alarmObjInfo.setRegion("Guangzhou");
        alarmObjInfo.setNamespace("Guangzhou1");
        alarmObjInfo.setAppId("1111");
        alarmObjInfo.setUin("2222");
        alarmObjInfo.setDimensions(dimensions);

        TencentCloudExternAlert.Conditions conditions = new TencentCloudExternAlert.Conditions();
        conditions.setMetricName("xx");
        conditions.setMetricShowName("xxx");
        conditions.setCalcType("a");
        conditions.setCalcValue("aa");
        conditions.setCalcUnit("aaa");
        conditions.setCurrentValue("b");
        conditions.setCalcUnit("bb");
        conditions.setProductName("guangzhou");
        conditions.setProductShowName("Guangzhou1");
        conditions.setEventName("CVS");
        conditions.setEventShowName("Core error");

        TencentCloudExternAlert.AlarmPolicyInfo alarmPolicyInfo = new TencentCloudExternAlert.AlarmPolicyInfo();
        alarmPolicyInfo.setPolicyTypeCname("x");
        alarmPolicyInfo.setPolicyName("Test1");
        alarmPolicyInfo.setConditions(conditions);

        TencentCloudExternAlert report = TencentCloudExternAlert.builder()
                .sessionId("123")
                .alarmStatus("1")
                .alarmType("event")
                .durationTime(2)
                .firstOccurTime("2023-08-14 11:11:11")
                .alarmObjInfo(alarmObjInfo)
                .alarmPolicyInfo(alarmPolicyInfo)
                .build();
        when(externAlertService.supportSource()).thenReturn("tencent");
        doNothing().when(externAlertService).addExternAlert(anyString());
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .post("/api/alerts/report/tencent")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(JsonUtil.toJson(report))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void addNewAlertReport() throws Exception {
        SingleAlert singleAlert = SingleAlert.builder()
                .fingerprint("fingerprint")
                .labels(new HashMap<>())
                .annotations(new HashMap<>())
                .content("content")
                .status("firing")
                .triggerTimes(1)
                .startAt(1734005477630L)
                .activeAt(1734005477630L)
                .build();
        when(externAlertService.supportSource()).thenReturn("default");
        doNothing().when(externAlertService).addExternAlert(anyString());
        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/alerts/report")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(singleAlert))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}
