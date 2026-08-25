/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.tool.metrics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Tests for exact target-bound metric history reads. */
@ExtendWith(MockitoExtension.class)
class AgentMetricsToolServiceTest {

    @Mock
    private AppService appService;

    @Mock
    private MonitorService monitorService;

    @Mock
    private MetricsDataService metricsDataService;

    private AgentMetricsToolService service;

    @BeforeEach
    void setUp() {
        service = new AgentMetricsToolService(appService, monitorService, metricsDataService);
    }

    @Test
    void exactHistoryShouldResolveTheMonitorAndEchoTheObservedScope() {
        stubMonitor();
        when(metricsDataService.getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "1s", true, 1_000L, 2_000L, "4ms"))
                .thenReturn(MetricsHistoryData.builder()
                        .values(Map.of("", List.of(new Value("151", 1_500L))))
                        .build());

        Map<String, Object> result = service.metricsHistory(null, null, null, null, null, true, 300,
                42L, "basic.max_connections", 1_000L, 2_000L, null);

        assertEquals(42L, result.get("monitorId"));
        assertEquals("basic.max_connections", result.get("metricKey"));
        assertEquals(1_000L, result.get("start"));
        assertEquals(2_000L, result.get("end"));
        assertEquals(1, result.get("returnedPoints"));
        verify(metricsDataService).getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "1s", true, 1_000L, 2_000L, "4ms");
    }

    @Test
    void blankScrapeShouldUseTheStaticMonitorApplication() {
        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(Monitor.builder().id(42L).name("mysql-a").app("mysql").scrape("")
                .instance("127.0.0.1:3306").build());
        when(monitorService.getMonitorDto(42L)).thenReturn(monitorDto);
        when(metricsDataService.getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "1s", true, 1_000L, 2_000L, "4ms"))
                .thenReturn(MetricsHistoryData.builder().values(Map.of()).build());

        service.metricsHistory(null, null, null, null, null, true, 300,
                42L, "basic.max_connections", 1_000L, 2_000L, null);

        verify(metricsDataService).getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "1s", true, 1_000L, 2_000L, "4ms");
    }

    @Test
    void prometheusServiceDiscoveryShouldUseThePrometheusStorageApplication() {
        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(Monitor.builder().id(42L).name("prom-a").app("prometheus").scrape("http_sd")
                .instance("127.0.0.1:9090").build());
        when(monitorService.getMonitorDto(42L)).thenReturn(monitorDto);
        when(metricsDataService.getMetricHistoryData("127.0.0.1:9090", "_prometheus_prom-a", "process",
                "cpu", "1s", true, 1_000L, 2_000L, "4ms"))
                .thenReturn(MetricsHistoryData.builder().values(Map.of()).build());

        service.metricsHistory(null, null, null, null, null, true, 300,
                42L, "process.cpu", 1_000L, 2_000L, null);

        verify(metricsDataService).getMetricHistoryData("127.0.0.1:9090", "_prometheus_prom-a", "process",
                "cpu", "1s", true, 1_000L, 2_000L, "4ms");
    }

    @Test
    void partialOrInvalidExactHistoryShouldFailBeforeReadingData() {
        assertThrows(IllegalArgumentException.class, () -> service.metricsHistory(
                null, null, null, null, null, true, null,
                42L, "basic.max_connections", 2_000L, 2_000L, null));
        assertThrows(IllegalArgumentException.class, () -> service.metricsHistory(
                null, null, null, null, null, true, null,
                42L, null, 1_000L, 2_000L, null));
    }

    @Test
    void missingMonitorShouldFailBeforeReadingMetrics() {
        when(monitorService.getMonitorDto(42L)).thenReturn(null);

        assertThrows(IllegalArgumentException.class, () -> service.metricsHistory(
                null, null, null, null, null, true, null,
                42L, "basic.max_connections", 1_000L, 2_000L, null));
        verifyNoInteractions(metricsDataService);
    }

    @Test
    void longExactWindowShouldForceIntervalAndRejectAnythingBeyondTwelveWeeks() {
        stubMonitor();
        long twelveWeeks = 12L * 7 * 24 * 60 * 60 * 1_000;
        long end = 1_000L + twelveWeeks;
        when(metricsDataService.getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "7257600s", true, 1_000L, end, "24192s"))
                .thenReturn(MetricsHistoryData.builder().values(Map.of()).build());

        service.metricsHistory(null, null, null, null, null, false, 300,
                42L, "basic.max_connections", 1_000L, end, "1ms");
        verify(metricsDataService).getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "7257600s", true, 1_000L, end, "24192s");
        assertThrows(IllegalArgumentException.class, () -> service.metricsHistory(
                null, null, null, null, null, true, 300,
                42L, "basic.max_connections", 1_000L, end + 1, null));
        verifyNoMoreInteractions(metricsDataService);
    }

    @Test
    void shouldPermitRequestedRawReadForSixHourWindowAndRejectInvalidStep() {
        stubMonitor();
        long end = 1_000L + 6L * 60 * 60 * 1_000;
        when(metricsDataService.getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "21600s", false, 1_000L, end, null))
                .thenReturn(MetricsHistoryData.builder().values(Map.of()).build());

        service.metricsHistory(null, null, null, null, null, false, 300,
                42L, "basic.max_connections", 1_000L, end, "1ms");
        verify(metricsDataService).getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "21600s", false, 1_000L, end, null);
        assertThrows(IllegalArgumentException.class, () -> service.metricsHistory(
                null, null, null, null, null, false, 300,
                42L, "basic.max_connections", 1_000L, end, "invalid"));
        verifyNoMoreInteractions(metricsDataService);
    }

    @Test
    void exactHistoryShouldExcludeEverySampleOutsideTheRequestedWindow() {
        stubMonitor();
        when(metricsDataService.getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "1s", true, 1_000L, 2_000L, "4ms"))
                .thenReturn(MetricsHistoryData.builder()
                        .values(Map.of("", List.of(new Value("150", 999L), new Value("152", 2_000L))))
                        .build());

        Map<String, Object> result = service.metricsHistory(null, null, null, null, null, true, 300,
                42L, "basic.max_connections", 1_000L, 2_000L, null);

        assertEquals(0, result.get("returnedPoints"));
    }

    @Test
    void exactHistoryShouldExposeAndCountOnlySamplesInsideTheRequestedWindow() {
        stubMonitor();
        when(metricsDataService.getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "1s", true, 1_000L, 2_000L, "4ms"))
                .thenReturn(MetricsHistoryData.builder()
                        .values(Map.of("", List.of(new Value("150", 999L), new Value("151", 1_500L),
                                new Value("152", 2_000L))))
                        .build());

        Map<String, Object> result = service.metricsHistory(null, null, null, null, null, true, 300,
                42L, "basic.max_connections", 1_000L, 2_000L, null);
        Map<?, ?> values = (Map<?, ?>) result.get("values");
        List<?> rows = (List<?>) values.get("");

        assertEquals(1, result.get("returnedPoints"));
        assertEquals(1, rows.size());
        assertEquals(1_500L, ((Map<?, ?>) rows.getFirst()).get("time"));
    }

    @Test
    void shouldUsePositiveDerivedStepWithOnePointBudget() {
        stubMonitor();
        when(metricsDataService.getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "1s", true, 1_000L, 1_001L, "1ms"))
                .thenReturn(MetricsHistoryData.builder().values(Map.of()).build());

        service.metricsHistory(null, null, null, null, null, true, 1,
                42L, "basic.max_connections", 1_000L, 1_001L, "1ms");

        verify(metricsDataService).getMetricHistoryData("127.0.0.1:3306", "mysql", "basic",
                "max_connections", "1s", true, 1_000L, 1_001L, "1ms");
    }

    private void stubMonitor() {
        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(Monitor.builder().id(42L).name("mysql-a").app("mysql").scrape("static")
                .instance("127.0.0.1:3306").build());
        when(monitorService.getMonitorDto(42L)).thenReturn(monitorDto);
    }
}
