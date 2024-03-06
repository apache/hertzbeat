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

import org.dromara.hertzbeat.alert.dto.AlertSummary;
import org.dromara.hertzbeat.alert.service.AlertService;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.dto.AlertReport;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.LongStream;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test case for {@link AlertsController}
 */
@ExtendWith(MockitoExtension.class)
class AlertsControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private AlertsController alertsController;

    @Mock
    private AlertService alertService;

    private List<Long> ids;


    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertsController).build();
        ids = LongStream.rangeClosed(1, 10).boxed().collect(Collectors.toList());
    }

//    @Test
    // todo: fix this test
    void getAlerts() throws Exception {

        //定义要用到的测试值
        String sortField = "id";
        String orderType = "asc";
        int pageIndex = 0;
        int pageSize = 10;
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, Sort.by(new Sort.Order(Sort.Direction.fromString(orderType), sortField)));
        Page<Alert> alertPage = new PageImpl<>(Collections.singletonList(Alert.builder().build()));


        //打桩
        Mockito.when(
                        alertService.getAlerts(
                                Mockito.any(Specification.class)
                                , Mockito.argThat(
                                        argument ->
                                                argument.getPageNumber() == pageRequest.getPageNumber()
                                                        && argument.getPageSize() == pageRequest.getPageSize()
                                                        && argument.getSort().equals(pageRequest.getSort())
                                )
                        )
                )
                .thenReturn(alertPage);

        mockMvc.perform(
                        MockMvcRequestBuilders
                                .get("/api/alerts")
                                .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                                .param("monitorId", "1")
                                .param("priority", "1")
                                .param("status", "1")
                                .param("content", "test")
                                .param("sort", sortField)
                                .param("order", orderType)
                                .param("pageIndex", String.valueOf(pageIndex))
                                .param("pageSize", String.valueOf(pageSize))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andReturn();
    }

    @Test
    void deleteAlerts() throws Exception {
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .delete("/api/alerts")
                                .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":null,\"code\":0}"))
                .andReturn();
    }

    @Test
    void clearAllAlerts() throws Exception {
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .delete("/api/alerts/clear")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":null,\"code\":0}"))
                .andReturn();
    }

    @Test
    void applyAlertDefinesStatus() throws Exception {
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .put("/api/alerts/status/1")
                                .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":null,\"code\":0}"))
                .andReturn();
    }

    @Test
    void getAlertsSummary() throws Exception {
        //打桩
        Mockito.when(alertService.getAlertsSummary()).thenReturn(new AlertSummary());

        mockMvc.perform(
                        MockMvcRequestBuilders
                                .get("/api/alerts/summary")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":{\"total\":0,\"dealNum\":0,\"rate\":0.0,\"priorityWarningNum\":0,\"priorityCriticalNum\":0,\"priorityEmergencyNum\":0},\"msg\":null,\"code\":0}"))
                .andReturn();
    }
}
