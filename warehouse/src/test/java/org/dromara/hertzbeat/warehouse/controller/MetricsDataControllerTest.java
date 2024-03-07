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

package org.dromara.hertzbeat.warehouse.controller;

import jakarta.servlet.ServletException;
import org.dromara.hertzbeat.common.entity.dto.Value;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.warehouse.store.AbstractHistoryDataStorage;
import org.dromara.hertzbeat.warehouse.store.AbstractRealTimeDataStorage;
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

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link MetricsDataController}
 */
@ExtendWith(MockitoExtension.class)
class MetricsDataControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    MetricsDataController metricsDataController;

    @Mock
    AbstractHistoryDataStorage historyDataStorage;

    @Mock
    AbstractRealTimeDataStorage realTimeDataStorage;

    private List<AbstractHistoryDataStorage> historyDataStorages = new LinkedList<>();

    private List<AbstractRealTimeDataStorage> realTimeDataStorages = new LinkedList<>();

    @BeforeEach
    void setUp() {
        historyDataStorages.add(historyDataStorage);
        realTimeDataStorages.add(realTimeDataStorage);
        metricsDataController = new MetricsDataController(realTimeDataStorages, historyDataStorages);
        this.mockMvc = MockMvcBuilders.standaloneSetup(metricsDataController).build();
    }

    @Test
    void getWarehouseStorageServerStatus() throws Exception {
        when(historyDataStorage.isServerAvailable()).thenReturn(true);
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/warehouse/storage/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.msg").isEmpty())
                .andReturn();
        when(historyDataStorage.isServerAvailable()).thenReturn(false);
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

        when(realTimeDataStorage.getCurrentMetricsData(eq(monitorId), eq(metric))).thenReturn(null);
        when(realTimeDataStorage.isServerAvailable()).thenReturn(true);
        this.mockMvc.perform(MockMvcRequestBuilders.get(getUrl))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("query metrics data is empty"))
                .andExpect(jsonPath("$.data").isEmpty())
                .andReturn();

        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setId(monitorId)
                .setApp(app)
                .setMetrics(metric)
                .setTime(time)
                .build();
        when(realTimeDataStorage.getCurrentMetricsData(eq(monitorId), eq(metric))).thenReturn(metricsData);
        when(realTimeDataStorage.isServerAvailable()).thenReturn(true);
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
        final String metrics = "cpu";
        final String metric = "usage";
        final String app = "testapp";
        final String metricFull = "linux.cpu.usage";
        final String metricFullFail = "linux.usage";
        final String instance = "disk2";
        final String history = "6h";
        final String interval = "false";
        final String getUrl = "/api/monitor/" + monitorId + "/metric/" + metricFull;
        final String getUrlFail = "/api/monitor/" + monitorId + "/metric/" + metricFullFail;

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("monitorId", String.valueOf(monitorId));
        params.add("metricFull", metricFull);
        params.add("instance", instance);
        params.add("history", history);
        params.add("interval", interval);

        when(historyDataStorage.isServerAvailable()).thenReturn(false);
        this.mockMvc.perform(MockMvcRequestBuilders.get(getUrl).params(params))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("time series database not available"))
                .andExpect(jsonPath("$.data").isEmpty())
                .andReturn();

        when(historyDataStorage.isServerAvailable()).thenReturn(true);
        ServletException exception = assertThrows(ServletException.class, () -> {
            this.mockMvc.perform(MockMvcRequestBuilders.get(getUrlFail).params(params))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.data").isEmpty())
                    .andReturn();
        });
        assertTrue(exception.getMessage().contains("IllegalArgumentException"));

        final Map<String, List<Value>> instanceValuesMap = new HashMap<>();
        List<Value> list = new ArrayList<>();
        instanceValuesMap.put(metric, list);
        when(historyDataStorage.isServerAvailable()).thenReturn(true);
        lenient().when(historyDataStorage.getHistoryMetricData(eq(monitorId), eq(app), eq(metrics), eq(metric),
                        eq(instance), eq(history)))
                .thenReturn(instanceValuesMap);
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
