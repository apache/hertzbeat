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

package org.apache.hertzbeat.observability.logs.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.service.impl.LogQueryServiceImpl;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.AfterEach;
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

    @Mock
    private HistoryDataReader secondaryHistoryDataReader;

    private LogQueryController logQueryController;

    @BeforeEach
    void setUp() {
        this.logQueryController = new LogQueryController(new LogQueryServiceImpl(List.of(historyDataReader)));
        this.mockMvc = MockMvcBuilders.standaloneSetup(logQueryController).build();
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
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

        when(historyDataReader.countLogsByMultipleConditions(anyLong(), anyLong(), any(),
                any(), any(), any(), any())).thenReturn(2L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(anyLong(), anyLong(),
                any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(mockLogs);

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
                .andDo(print())
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

        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(1L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(),
                any(), any(), any(), any(), any(), eq(0), eq(20)))
                .thenReturn(mockLogs);

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
    void testListLogsHideInternalFiltersCollectorNoise() throws Exception {
        LogEntry internalLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityNumber(9)
                .severityText("INFO")
                .body("collector internal log")
                .resource(new HashMap<>(java.util.Map.of("service.name", "otelcol-contrib")))
                .build();
        LogEntry businessLog = LogEntry.builder()
                .timeUnixNano(1734005477640000000L)
                .severityNumber(17)
                .severityText("ERROR")
                .body("checkout log")
                .traceId("trace-checkout")
                .spanId("span-checkout")
                .resource(new HashMap<>(java.util.Map.of("service.name", "checkout")))
                .build();

        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any(), anySet(), eq(true))).thenReturn(2L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(), any(),
                any(), any(), any(), any(), eq(0), eq(20), anySet(), eq(true)))
                .thenReturn(Arrays.asList(internalLog, businessLog));

        mockMvc.perform(
                        MockMvcRequestBuilders
                                .get("/api/logs/list")
                                .param("hideInternal", "true")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].traceId").value("trace-checkout"))
                .andExpect(jsonPath("$.data.content[0].spanId").value("span-checkout"));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testListLogsHideNoiseFiltersInfrastructureServices() throws Exception {
        LogEntry collectorLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityNumber(9)
                .severityText("INFO")
                .body("collector internal log")
                .resource(new HashMap<>(java.util.Map.of("service.name", "otelcol-contrib")))
                .build();
        LogEntry kafkaLog = LogEntry.builder()
                .timeUnixNano(1734005477640000000L)
                .severityNumber(9)
                .severityText("INFO")
                .body("kafka broker log")
                .resource(new HashMap<>(java.util.Map.of("service.name", "kafka")))
                .build();
        LogEntry businessLog = LogEntry.builder()
                .timeUnixNano(1734005477650000000L)
                .severityNumber(17)
                .severityText("ERROR")
                .body("checkout log")
                .traceId("trace-checkout")
                .spanId("span-checkout")
                .resource(new HashMap<>(java.util.Map.of("service.name", "checkout")))
                .build();

        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any(), anySet(), eq(true))).thenReturn(3L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(), any(),
                any(), any(), any(), any(), eq(0), eq(20), anySet(), eq(true)))
                .thenReturn(Arrays.asList(collectorLog, kafkaLog, businessLog));

        mockMvc.perform(
                        MockMvcRequestBuilders
                                .get("/api/logs/list")
                                .param("hideNoise", "true")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].resource['service.name']").value("checkout"))
                .andExpect(jsonPath("$.data.content[0].traceId").value("trace-checkout"))
                .andExpect(jsonPath("$.data.content[0].spanId").value("span-checkout"));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testListLogsUsesRequestWorkspaceContext() throws Exception {
        LogEntry teamAlphaLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityText("INFO")
                .body("team-a checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "hertzbeat.workspace_id", "team-a")))
                .build();
        LogEntry teamBetaLog = LogEntry.builder()
                .timeUnixNano(1734005477640000000L)
                .severityText("ERROR")
                .body("team-b payment log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "payment",
                        "hertzbeat.workspace_id", "team-b")))
                .build();

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any()))
                .thenReturn(List.of(teamAlphaLog, teamBetaLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].body").value("team-a checkout log"));
        verify(historyDataReader, never()).countLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testListLogsPushesWorkspacePaginationIntoStorageWhenSupported() throws Exception {
        LogEntry teamAlphaLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityText("INFO")
                .body("team-a checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "hertzbeat.workspace_id", "team-a")))
                .build();

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"))).thenReturn(41L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(), any(), any(), any(), any(),
                any(), eq(40), eq(20), anySet(), eq(false), eq("team-a")))
                .thenReturn(List.of(teamAlphaLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("pageIndex", "2")
                        .param("pageSize", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(41))
                .andExpect(jsonPath("$.data.content[0].body").value("team-a checkout log"));

        verify(historyDataReader).countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"));
        verify(historyDataReader).queryLogsByMultipleConditionsWithPagination(any(), any(), any(), any(), any(), any(),
                any(), eq(40), eq(20), anySet(), eq(false), eq("team-a"));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testListLogsDoesNotLeakUnscopedTotalWhenWorkspacePageAlreadyMatches() throws Exception {
        LogEntry teamAlphaLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityText("INFO")
                .body("team-a checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "hertzbeat.workspace_id", "team-a")))
                .build();

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any()))
                .thenReturn(List.of(teamAlphaLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].body").value("team-a checkout log"));
        verify(historyDataReader, never()).countLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testOverviewStatsPushesWorkspaceAggregateIntoStorageWhenSupported() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.countLogsBySeverityBuckets(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"))).thenReturn(java.util.Map.of(
                        "totalCount", 3L,
                        "infoCount", 2L,
                        "errorCount", 1L,
                        "fatalCount", 0L,
                        "warnCount", 0L,
                        "debugCount", 0L,
                        "traceCount", 0L
                ));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.totalCount").value(3))
                .andExpect(jsonPath("$.data.infoCount").value(2))
                .andExpect(jsonPath("$.data.errorCount").value(1));

        verify(historyDataReader).countLogsBySeverityBuckets(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testOverviewStatsUsesRequestWorkspaceContext() throws Exception {
        List<LogEntry> mockLogs = Arrays.asList(
                LogEntry.builder()
                        .severityNumber(9)
                        .resource(new HashMap<>(java.util.Map.of("hertzbeat.workspace_id", "team-a")))
                        .build(),
                LogEntry.builder()
                        .severityNumber(17)
                        .resource(new HashMap<>(java.util.Map.of("hertzbeat.workspace_id", "team-b")))
                        .build()
        );

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(mockLogs);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.totalCount").value(1))
                .andExpect(jsonPath("$.data.infoCount").value(1))
                .andExpect(jsonPath("$.data.errorCount").value(0));

        verify(historyDataReader, never()).countLogsBySeverityBuckets(any(), any(), any(), any(),
                any(), any(), any(), anySet(), eq(false));
    }

    @Test
    void testOverviewStatsWithMixedSeverityLogs() throws Exception {
        // Create logs with different severity levels according to OpenTelemetry standard
        List<LogEntry> mockLogs = Arrays.asList(
                // TRACE (1-4)
                LogEntry.builder().severityNumber(2).build(),
                // DEBUG (5-8)
                LogEntry.builder().severityNumber(6).build(),
                // INFO (9-12)
                LogEntry.builder().severityNumber(9).build(),
                LogEntry.builder().severityNumber(10).build(),
                // WARN (13-16)
                LogEntry.builder().severityNumber(14).build(),
                // ERROR (17-20)
                LogEntry.builder().severityNumber(17).build(),
                LogEntry.builder().severityNumber(18).build(),
                // FATAL (21-24)
                LogEntry.builder().severityNumber(21).build()
        );

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(mockLogs);

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
        List<LogEntry> mockLogs = Arrays.asList(
                LogEntry.builder().severityNumber(9).build(),
                LogEntry.builder().severityNumber(17).build()
        );

        when(historyDataReader.queryLogsByMultipleConditions(eq(1734005477000L), eq(1734005478000L),
                any(), any(), any(), any(), any())).thenReturn(mockLogs);

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
    void testOverviewStatsUsesStorageAggregateWhenAvailable() throws Exception {
        when(historyDataReader.countLogsBySeverityBuckets(any(), any(), any(), any(),
                any(), any(), any(), anySet(), eq(false)))
                .thenReturn(java.util.Map.of(
                        "totalCount", 42L,
                        "fatalCount", 1L,
                        "errorCount", 2L,
                        "warnCount", 3L,
                        "infoCount", 36L,
                        "debugCount", 0L,
                        "traceCount", 0L
                ));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.totalCount").value(42))
                .andExpect(jsonPath("$.data.errorCount").value(2));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testListLogsFallsBackWhenPrimaryReaderHasNoData() throws Exception {
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityNumber(9)
                .severityText("INFO")
                .body("fallback log")
                .attributes(new HashMap<>())
                .build();
        MockMvc fallbackMockMvc = MockMvcBuilders
                .standaloneSetup(new LogQueryController(new LogQueryServiceImpl(List.of(historyDataReader, secondaryHistoryDataReader))))
                .build();

        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(0L);
        when(secondaryHistoryDataReader.countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1L);
        when(secondaryHistoryDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(), any(), any(), any(), any(), any(), eq(0), eq(20)))
                .thenReturn(List.of(logEntry));

        fallbackMockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(1));

        verify(secondaryHistoryDataReader).countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void testTraceCoverageStats() throws Exception {
        List<LogEntry> mockLogs = Arrays.asList(
                // With both trace and span
                LogEntry.builder().traceId("trace1").spanId("span1").build(),
                LogEntry.builder().traceId("trace2").spanId("span2").build(),
                // With trace only
                LogEntry.builder().traceId("trace3").spanId("").build(),
                // With span only
                LogEntry.builder().traceId("").spanId("span4").build(),
                // Without trace info
                LogEntry.builder().traceId("").spanId("").build(),
                LogEntry.builder().build() // null values
        );

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(mockLogs);

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
    void testTraceCoverageStatsHideInternalIgnoresCollectorLogs() throws Exception {
        List<LogEntry> mockLogs = Arrays.asList(
                LogEntry.builder()
                        .traceId("trace-internal")
                        .spanId("span-internal")
                        .resource(new HashMap<>(java.util.Map.of("service.name", "otelcol-contrib")))
                        .build(),
                LogEntry.builder()
                        .traceId("trace-business")
                        .spanId("span-business")
                        .resource(new HashMap<>(java.util.Map.of("service.name", "checkout")))
                        .build()
        );

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any(), anySet(), eq(true))).thenReturn(mockLogs);

        mockMvc.perform(
                        MockMvcRequestBuilders
                                .get("/api/logs/stats/trace-coverage")
                                .param("hideInternal", "true")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.traceCoverage.withTrace").value(1))
                .andExpect(jsonPath("$.data.traceCoverage.withSpan").value(1))
                .andExpect(jsonPath("$.data.traceCoverage.withBothTraceAndSpan").value(1));
    }

    @Test
    void testTraceCoverageStatsUsesStorageAggregateWhenAvailable() throws Exception {
        when(historyDataReader.countLogTraceCoverage(any(), any(), any(), any(),
                any(), any(), any(), anySet(), eq(false)))
                .thenReturn(java.util.Map.of(
                        "withTrace", 10L,
                        "withoutTrace", 90L,
                        "withSpan", 8L,
                        "withBothTraceAndSpan", 8L
                ));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/trace-coverage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.traceCoverage.withTrace").value(10))
                .andExpect(jsonPath("$.data.traceCoverage.withoutTrace").value(90));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testTraceCoverageStatsPushesWorkspaceAggregateIntoStorageWhenSupported() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.countLogTraceCoverage(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"))).thenReturn(java.util.Map.of(
                        "withTrace", 5L,
                        "withoutTrace", 2L,
                        "withSpan", 4L,
                        "withBothTraceAndSpan", 3L
                ));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/trace-coverage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.traceCoverage.withTrace").value(5))
                .andExpect(jsonPath("$.data.traceCoverage.withoutTrace").value(2))
                .andExpect(jsonPath("$.data.traceCoverage.withBothTraceAndSpan").value(3));

        verify(historyDataReader).countLogTraceCoverage(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testTrendStats() throws Exception {
        // Create logs with timestamps that fall into different hours
        List<LogEntry> mockLogs = Arrays.asList(
                // 2023-12-12 10:00 (1734005477630000000L nano = 1734005477630L ms)
                LogEntry.builder().timeUnixNano(1734005477630000000L).build(),
                // Same hour
                LogEntry.builder().timeUnixNano(1734005477640000000L).build(),
                // Next hour: 2023-12-12 11:00 (1734009077630000000L nano = 1734009077630L ms)
                LogEntry.builder().timeUnixNano(1734009077630000000L).build()
        );

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(mockLogs);

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
        List<LogEntry> mockLogs = Arrays.asList(
                LogEntry.builder().timeUnixNano(1734005477630000000L).build(),
                LogEntry.builder().timeUnixNano(null).build() // This should be filtered out
        );

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(mockLogs);

        mockMvc.perform(
                MockMvcRequestBuilders
                        .get("/api/logs/stats/trend")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.hourlyStats").isMap());
    }

    @Test
    void testTrendStatsUsesStorageAggregateWhenAvailable() throws Exception {
        when(historyDataReader.countLogsByHour(any(), any(), any(), any(),
                any(), any(), any(), anySet(), eq(false)))
                .thenReturn(java.util.Map.of("2026-04-29 21:00", 12L));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/trend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.hourlyStats['2026-04-29 21:00']").value(12));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

    @Test
    void testTrendStatsPushesWorkspaceAggregateIntoStorageWhenSupported() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.countLogsByHour(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a")))
                .thenReturn(java.util.Map.of("2026-04-29 21:00", 12L));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/trend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.hourlyStats['2026-04-29 21:00']").value(12));

        verify(historyDataReader).countLogsByHour(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

}
