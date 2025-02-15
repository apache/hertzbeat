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

package org.apache.hertzbeat.warehouse.controller;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import jakarta.servlet.ServletException;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Field;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Test case for {@link MetricsDataController}
 */
@ExtendWith(MockitoExtension.class)
class MetricsDataControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    MetricsDataController metricsDataController;

    @Mock
    MetricsDataService metricsDataService;

    @BeforeEach
    void setUp() {
        metricsDataController = new MetricsDataController(metricsDataService);
        this.mockMvc = MockMvcBuilders.standaloneSetup(metricsDataController).build();
    }

    @Test
    void getWarehouseStorageServerStatus() throws Exception {
        when(metricsDataService.getWarehouseStorageServerStatus()).thenReturn(true);
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/warehouse/storage/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.msg").isEmpty())
                .andReturn();
        when(metricsDataService.getWarehouseStorageServerStatus()).thenReturn(false);
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/warehouse/storage/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.data").isEmpty())
                .andReturn();
    }

    @Test
    void getMetricsData() throws Exception {
        final long monitorId = 343254354;
        final String metric = "cpu";
        final String app = "testapp";
        final long time = System.currentTimeMillis();
        final String getUrl = "/api/monitor/" + monitorId + "/metrics/" + metric;

        when(metricsDataService.getMetricsData(eq(monitorId), eq(metric))).thenReturn(null);
        this.mockMvc.perform(MockMvcRequestBuilders.get(getUrl))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("query metrics data is empty"))
                .andExpect(jsonPath("$.data").isEmpty())
                .andReturn();

        MetricsData metricsData = MetricsData.builder()
                .id(monitorId)
                .app(app)
                .metrics(metric)
                .time(time)
                .build();

        when(metricsDataService.getMetricsData(eq(monitorId), eq(metric))).thenReturn(metricsData);
        this.mockMvc.perform(MockMvcRequestBuilders.get(getUrl))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").isEmpty())
                .andExpect(jsonPath("$.data.id").value(monitorId))
                .andExpect(jsonPath("$.data.metrics").value(metric))
                .andExpect(jsonPath("$.data.app").value(app))
                .andExpect(jsonPath("$.data.time").value(time))
                .andReturn();
    }

    @Test
    void getMetricHistoryData() throws Exception {
        final long monitorId = 343254354;
        final String app = "linux";
        final String metrics = "cpu";
        final String metric = "usage";
        final String metricFull = "linux.cpu.usage";
        final String metricFullFail = "linux.usage";
        final String label = "disk2";
        final String history = "6h";
        final Boolean interval = false;
        final String getUrl = "/api/monitor/" + monitorId + "/metric/" + metricFull;
        final String getUrlFail = "/api/monitor/" + monitorId + "/metric/" + metricFullFail;

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("monitorId", String.valueOf(monitorId));
        params.add("label", label);
        params.add("history", history);
        params.add("interval", String.valueOf(interval));

        when(metricsDataService.getWarehouseStorageServerStatus()).thenReturn(false);
        this.mockMvc.perform(MockMvcRequestBuilders.get(getUrl).params(params))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("time series database not available"))
                .andExpect(jsonPath("$.data").isEmpty())
                .andReturn();

        when(metricsDataService.getWarehouseStorageServerStatus()).thenReturn(true);
        ServletException exception = assertThrows(ServletException.class, () -> this.mockMvc.perform(MockMvcRequestBuilders.get(getUrlFail).params(params))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.data").isEmpty())
                .andReturn());
        assertTrue(exception.getMessage().contains("IllegalArgumentException"));

        MetricsHistoryData metricsHistoryData = MetricsHistoryData.builder()
                .id(monitorId)
                .metrics(metrics)
                .field(Field.builder().name(metric).type(CommonConstants.TYPE_NUMBER).build())
                .build();
        when(metricsDataService.getWarehouseStorageServerStatus()).thenReturn(true);
        lenient().when(metricsDataService.getMetricHistoryData(eq(monitorId), eq(app), eq(metrics), eq(metric), eq(label), eq(history), eq(interval)))
                .thenReturn(metricsHistoryData);
        this.mockMvc.perform(MockMvcRequestBuilders.get(getUrl).params(params))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.id").value(monitorId))
                .andExpect(jsonPath("$.data.metrics").value(metrics))
                .andExpect(jsonPath("$.data.field.name").value(metric))
                .andExpect(jsonPath("$.data.field.type").value(String.valueOf(CommonConstants.TYPE_NUMBER)))
                .andExpect(jsonPath("$.msg").isEmpty())
                .andReturn();
    }
}
