package com.usthe.warehouse.controller;

import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.warehouse.store.AbstractHistoryDataStorage;
import com.usthe.warehouse.store.AbstractRealTimeDataStorage;
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
import org.springframework.web.util.NestedServletException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    @BeforeEach
    void setUp() {
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
        this.mockMvc.perform(MockMvcRequestBuilders.get(getUrl))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").isEmpty())
                .andExpect(jsonPath("$.data.id").value(monitorId))
                .andExpect(jsonPath("$.data.metric").value(metric))
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
                .andExpect(jsonPath("$.msg").value("Time series database not available"))
                .andExpect(jsonPath("$.data").isEmpty())
                .andReturn();

        when(historyDataStorage.isServerAvailable()).thenReturn(true);
        NestedServletException exception = assertThrows(NestedServletException.class, () -> {
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
                .andExpect(jsonPath("$.data.metric").value(metrics))
                .andExpect(jsonPath("$.data.field.name").value(metric))
                .andExpect(jsonPath("$.data.field.type").value(String.valueOf(CommonConstants.TYPE_NUMBER)))
                .andExpect(jsonPath("$.msg").isEmpty())
                .andReturn();
    }
}