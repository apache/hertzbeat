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

package org.apache.hertzbeat.log.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit test for {@link LogQueryController}
 */
@ExtendWith(MockitoExtension.class)
class LogQueryControllerTest {

    private MockMvc mockMvc;

    @Mock
    private HistoryDataReader historyDataReader;

    private LogQueryController logQueryController;

    @BeforeEach
    void setUp() {
        lenient().when(historyDataReader.supportsLogQuery()).thenReturn(true);
        this.logQueryController = new LogQueryController(historyDataReader, new SignalWorkloadGuard());
        this.mockMvc = MockMvcBuilders.standaloneSetup(logQueryController)
                .setControllerAdvice(new SignalWorkloadExceptionHandler())
                .build();
    }

    @Test
    void shouldReturnFriendlyFailureWhenLogQueryUnsupported() throws Exception {
        when(historyDataReader.supportsLogQuery()).thenReturn(false);

        for (String path : List.of("/api/logs/list", "/api/logs/stats/overview",
                "/api/logs/stats/trace-coverage", "/api/logs/stats/trend")) {
            mockMvc.perform(MockMvcRequestBuilders.get(path))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").isNotEmpty());
        }
    }

    @Test
    void testListLogsWithAllFilters() throws Exception {
        // Mock data
        LogEntry logEntry1 = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityNumber(9)
                .severityText("INFO")
                .body("Test log message 1")
                .traceId("trace123")
                .spanId("span456")
                .attributes(new HashMap<>())
                .build();

        LogEntry logEntry2 = LogEntry.builder()
                .timeUnixNano(1734005477640000000L)
                .severityNumber(17)
                .severityText("ERROR")
                .body("Test log message 2")
                .traceId("trace123")
                .spanId("span789")
                .attributes(new HashMap<>())
                .build();

        List<LogEntry> mockLogs = Arrays.asList(logEntry1, logEntry2);

        when(historyDataReader.countObservabilityLogs(any())).thenReturn(2L);
        when(historyDataReader.queryObservabilityLogs(any(), any(), any())).thenReturn(mockLogs);

        mockMvc.perform(
                MockMvcRequestBuilders
                        .get("/api/logs/list")
                        .param("start", "1734005477000")
                        .param("end", "1734005478000")
                        .param("traceId", "trace123")
                        .param("spanId", "span456")
                        .param("severityNumber", "9")
                        .param("severityText", "INFO")
                        .param("pageIndex", "0")
                        .param("pageSize", "20")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.number").value(0));
    }

    @Test
    void testListLogsWithoutFilters() throws Exception {
        List<LogEntry> mockLogs = Arrays.asList(
                LogEntry.builder()
                        .timeUnixNano(1734005477630000000L)
                        .severityNumber(9)
                        .severityText("INFO")
                        .body("Test log message")
                        .attributes(new HashMap<>())
                        .build()
        );

        when(historyDataReader.countObservabilityLogs(any())).thenReturn(1L);
        when(historyDataReader.queryObservabilityLogs(any(), any(), any())).thenReturn(mockLogs);

        mockMvc.perform(
                MockMvcRequestBuilders
                        .get("/api/logs/list")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content.length()").value(1));
    }

    @Test
    void shouldBoundLogPaginationBeforeReadingStorage() throws Exception {
        when(historyDataReader.countObservabilityLogs(any())).thenReturn(0L);
        when(historyDataReader.queryObservabilityLogs(any(), any(), any())).thenReturn(List.of());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("pageIndex", "-1")
                        .param("pageSize", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.number").value(0))
                .andExpect(jsonPath("$.data.size").value(200));

        verify(historyDataReader).queryObservabilityLogs(any(), eq(0), eq(200));
    }

    @Test
    void shouldReturnBadRequestForInvalidResourceExpression() throws Exception {
        when(historyDataReader.countObservabilityLogs(any()))
                .thenThrow(new IllegalArgumentException("Invalid resource filter expression"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("resource", "bad-expression"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));
    }

    @Test
    void testOverviewStatsWithMixedSeverityLogs() throws Exception {
        when(historyDataReader.queryLogOverviewAggregate(any())).thenReturn(Map.of(
                "totalCount", 8L, "traceCount", 1L, "debugCount", 1L, "infoCount", 2L,
                "warnCount", 1L, "errorCount", 2L, "fatalCount", 1L));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .get("/api/logs/stats/overview")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.totalCount").value(8))
                .andExpect(jsonPath("$.data.traceCount").value(1))
                .andExpect(jsonPath("$.data.debugCount").value(1))
                .andExpect(jsonPath("$.data.infoCount").value(2))
                .andExpect(jsonPath("$.data.warnCount").value(1))
                .andExpect(jsonPath("$.data.errorCount").value(2))
                .andExpect(jsonPath("$.data.fatalCount").value(1));
    }

    @Test
    void testOverviewStatsWithTimeRange() throws Exception {
        when(historyDataReader.queryLogOverviewAggregate(any())).thenReturn(Map.of("totalCount", 2L));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .get("/api/logs/stats/overview")
                        .param("start", "1734005477000")
                        .param("end", "1734005478000")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.totalCount").value(2));
    }

    @Test
    void testTraceCoverageStats() throws Exception {
        when(historyDataReader.queryLogOverviewAggregate(any())).thenReturn(Map.of("traceCoverage", Map.of(
                "withTrace", 3L, "withoutTrace", 3L, "withSpan", 3L, "withBothTraceAndSpan", 2L)));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .get("/api/logs/stats/trace-coverage")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.traceCoverage.withTrace").value(3))
                .andExpect(jsonPath("$.data.traceCoverage.withoutTrace").value(3))
                .andExpect(jsonPath("$.data.traceCoverage.withSpan").value(3))
                .andExpect(jsonPath("$.data.traceCoverage.withBothTraceAndSpan").value(2));
    }

    @Test
    void testTrendStats() throws Exception {
        when(historyDataReader.queryLogTrendAggregate(any())).thenReturn(Map.of(
                "2023-12-12 10:00", 2L, "2023-12-12 11:00", 1L));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .get("/api/logs/stats/trend")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.hourlyStats").isMap());
    }

    @Test
    void testTrendStatsWithNullTimestamp() throws Exception {
        when(historyDataReader.queryLogTrendAggregate(any())).thenReturn(Map.of("2023-12-12 10:00", 1L));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .get("/api/logs/stats/trend")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.hourlyStats").isMap());
    }

}
