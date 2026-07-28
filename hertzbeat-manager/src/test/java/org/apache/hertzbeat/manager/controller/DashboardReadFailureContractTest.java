/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.apache.hertzbeat.alert.controller.AlertSummaryController;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.support.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataRetrievalFailureException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class DashboardReadFailureContractTest {

    private static final String PRIVATE_STORAGE_DETAIL = "jdbc private dashboard storage detail";
    private static final String PRIVATE_RUNTIME_DETAIL = "private alert runtime detail";

    @Mock
    private MonitorService monitorService;

    @Mock
    private AlertService alertService;

    @InjectMocks
    private SummaryController summaryController;

    @InjectMocks
    private AlertSummaryController alertSummaryController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(summaryController, alertSummaryController)
                .setControllerAdvice(new DashboardReadControllerAdvice(), new GlobalExceptionHandler())
                .build();
    }

    @Test
    void monitorSummaryKeepsStorageDetailsPrivate() throws Exception {
        Mockito.when(monitorService.getAllAppMonitorsCount())
                .thenThrow(new DataRetrievalFailureException(PRIVATE_STORAGE_DETAIL));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/summary"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Dashboard data is temporarily unavailable."))
                .andExpect(content().string(not(containsString(PRIVATE_STORAGE_DETAIL))));
    }

    @Test
    void alertSummaryKeepsUnexpectedDetailsPrivate() throws Exception {
        Mockito.when(alertService.getAlertsSummary()).thenThrow(new IllegalStateException(PRIVATE_RUNTIME_DETAIL));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/summary"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Dashboard data could not be loaded."))
                .andExpect(content().string(not(containsString(PRIVATE_RUNTIME_DETAIL))));
    }
}
