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
import java.util.Map;
import java.util.Optional;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
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
    void testListLogsCapsOversizedPageSize() throws Exception {
        List<LogEntry> mockLogs = List.of(
                LogEntry.builder()
                        .timeUnixNano(1734005477630000000L)
                        .severityNumber(9)
                        .severityText("INFO")
                        .body("bounded export page")
                        .attributes(new HashMap<>())
                        .build()
        );

        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(50_000L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(),
                any(), any(), any(), any(), any(), eq(0), eq(1000)))
                .thenReturn(mockLogs);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("pageIndex", "0")
                        .param("pageSize", "50000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.size").value(1000))
                .andExpect(jsonPath("$.data.totalElements").value(50000));

        verify(historyDataReader).queryLogsByMultipleConditionsWithPagination(any(), any(),
                any(), any(), any(), any(), any(), eq(0), eq(1000));
    }

    @Test
    void testListLogsNormalizesInvalidPagination() throws Exception {
        List<LogEntry> mockLogs = List.of(
                LogEntry.builder()
                        .timeUnixNano(1734005477630000000L)
                        .severityNumber(9)
                        .severityText("INFO")
                        .body("normalized page")
                        .attributes(new HashMap<>())
                        .build()
        );

        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(1L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(),
                any(), any(), any(), any(), any(), eq(0), eq(20)))
                .thenReturn(mockLogs);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("pageIndex", "-3")
                        .param("pageSize", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.number").value(0))
                .andExpect(jsonPath("$.data.size").value(20));

        verify(historyDataReader).queryLogsByMultipleConditionsWithPagination(any(), any(),
                any(), any(), any(), any(), any(), eq(0), eq(20));
    }

    @Test
    void testListLogsFiltersByServiceAndEnvironment() throws Exception {
        LogEntry checkoutProdLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityText("INFO")
                .body("checkout prod log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.namespace", "payments",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry paymentStagingLog = LogEntry.builder()
                .timeUnixNano(1734005477640000000L)
                .severityText("INFO")
                .body("payment staging log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "payment",
                        "service.namespace", "payments",
                        "deployment.environment.name", "staging")))
                .build();

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any()))
                .thenReturn(List.of(checkoutProdLog, paymentStagingLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "payments")
                        .param("environment", "prod"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].body").value("checkout prod log"));
    }

    @Test
    void testListLogsPrefersEntityIdentityOverConflictingRouteContext() throws Exception {
        ObservabilityWorkspaceQueryGateway workspaceQueryGateway = org.mockito.Mockito.mock(ObservabilityWorkspaceQueryGateway.class);
        this.logQueryController = new LogQueryController(
                new LogQueryServiceImpl(List.of(historyDataReader), Optional.of(workspaceQueryGateway)));
        this.mockMvc = MockMvcBuilders.standaloneSetup(logQueryController).build();
        EntityIdentity serviceName = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("service.name")
                .identityValue("checkout")
                .primaryIdentity(true)
                .priority(90)
                .build();
        EntityIdentity serviceNamespace = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("service.namespace")
                .identityValue("payments")
                .priority(30)
                .build();
        EntityIdentity environment = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("deployment.environment.name")
                .identityValue("prod")
                .priority(20)
                .build();
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(Optional.of(ObserveEntity.builder()
                .id(42L)
                .type("service")
                .name("checkout")
                .namespace("payments")
                .environment("prod")
                .build()));
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L))
                .thenReturn(List.of(serviceName, serviceNamespace, environment));
        LogEntry checkoutProdLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityText("INFO")
                .body("checkout prod log")
                .resource(new HashMap<>(Map.of(
                        "service.name", "checkout",
                        "service.namespace", "payments",
                        "deployment.environment.name", "prod",
                        "hertzbeat.entity_id", "42")))
                .build();
        LogEntry billingStagingLog = LogEntry.builder()
                .timeUnixNano(1734005477640000000L)
                .severityText("INFO")
                .body("billing staging log")
                .resource(new HashMap<>(Map.of(
                        "service.name", "billing",
                        "service.namespace", "wrong-namespace",
                        "deployment.environment.name", "staging")))
                .build();
        Map<String, String> expectedResourceFilters = Map.of("hertzbeat.entity_id", "42");
        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq(null), eq("checkout"), eq("payments"), eq("prod"),
                eq(expectedResourceFilters), eq(Map.of())))
                .thenReturn(2L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(), any(), any(), any(), any(),
                any(), eq(0), eq(20), anySet(), eq(false), eq(null), eq("checkout"), eq("payments"), eq("prod"),
                eq(expectedResourceFilters), eq(Map.of())))
                .thenReturn(List.of(checkoutProdLog, billingStagingLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("entityId", "42")
                        .param("serviceName", "billing")
                        .param("serviceNamespace", "wrong-namespace")
                        .param("environment", "staging"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].body").value("checkout prod log"));
    }

    @Test
    void testLogStatsPreferEntityIdentityOverConflictingRouteContext() throws Exception {
        ObservabilityWorkspaceQueryGateway workspaceQueryGateway = org.mockito.Mockito.mock(ObservabilityWorkspaceQueryGateway.class);
        this.logQueryController = new LogQueryController(
                new LogQueryServiceImpl(List.of(historyDataReader), Optional.of(workspaceQueryGateway)));
        this.mockMvc = MockMvcBuilders.standaloneSetup(logQueryController).build();
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(Optional.of(ObserveEntity.builder()
                .id(42L)
                .type("service")
                .name("checkout")
                .namespace("payments")
                .environment("prod")
                .build()));
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of(
                EntityIdentity.builder()
                        .entityId(42L)
                        .identityKey("service.name")
                        .identityValue("checkout")
                        .primaryIdentity(true)
                        .priority(90)
                        .build(),
                EntityIdentity.builder()
                        .entityId(42L)
                        .identityKey("service.namespace")
                        .identityValue("payments")
                        .priority(30)
                        .build(),
                EntityIdentity.builder()
                        .entityId(42L)
                        .identityKey("deployment.environment.name")
                        .identityValue("prod")
                        .priority(20)
                        .build()
        ));
        Map<String, String> expectedResourceFilters = Map.of(
                "service.version", "1.2.3",
                "hertzbeat.entity_id", "42");
        Map<String, String> expectedAttributeFilters = Map.of("http.route", "/checkout");
        when(historyDataReader.countLogsBySeverityBuckets(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), org.mockito.ArgumentMatchers.isNull(), eq("checkout"), eq("payments"), eq("prod"),
                eq(expectedResourceFilters), eq(expectedAttributeFilters)))
                .thenReturn(Map.of(
                        "totalCount", 3L,
                        "infoCount", 2L,
                        "errorCount", 1L,
                        "fatalCount", 0L,
                        "warnCount", 0L,
                        "debugCount", 0L,
                        "traceCount", 0L
                ));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/overview")
                        .param("entityId", "42")
                        .param("serviceName", "billing")
                        .param("serviceNamespace", "wrong-namespace")
                        .param("environment", "staging")
                        .param("resourceFilter", "service.name=billing,deployment.environment.name=staging,service.version=1.2.3")
                        .param("attributeFilter", "http.route:/checkout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.totalCount").value(3))
                .andExpect(jsonPath("$.data.infoCount").value(2))
                .andExpect(jsonPath("$.data.errorCount").value(1));

        verify(historyDataReader).countLogsBySeverityBuckets(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), org.mockito.ArgumentMatchers.isNull(), eq("checkout"), eq("payments"), eq("prod"),
                eq(expectedResourceFilters), eq(expectedAttributeFilters));
    }

    @Test
    void testLogContextPrefersEntityIdentityOverConflictingRouteContext() throws Exception {
        ObservabilityWorkspaceQueryGateway workspaceQueryGateway = org.mockito.Mockito.mock(ObservabilityWorkspaceQueryGateway.class);
        this.logQueryController = new LogQueryController(
                new LogQueryServiceImpl(List.of(historyDataReader), Optional.of(workspaceQueryGateway)));
        this.mockMvc = MockMvcBuilders.standaloneSetup(logQueryController).build();
        when(workspaceQueryGateway.findEntityById(42L)).thenReturn(Optional.of(ObserveEntity.builder()
                .id(42L)
                .type("service")
                .name("checkout")
                .namespace("payments")
                .environment("prod")
                .build()));
        when(workspaceQueryGateway.findIdentitiesByEntityId(42L)).thenReturn(List.of(
                EntityIdentity.builder()
                        .entityId(42L)
                        .identityKey("service.name")
                        .identityValue("checkout")
                        .primaryIdentity(true)
                        .priority(90)
                        .build(),
                EntityIdentity.builder()
                        .entityId(42L)
                        .identityKey("service.namespace")
                        .identityValue("payments")
                        .priority(30)
                        .build(),
                EntityIdentity.builder()
                        .entityId(42L)
                        .identityKey("deployment.environment.name")
                        .identityValue("prod")
                        .priority(20)
                        .build()
        ));
        long selectedTime = 1734005477630000000L;
        LogEntry selectedLog = LogEntry.builder()
                .timeUnixNano(selectedTime)
                .severityText("INFO")
                .body("checkout selected")
                .resource(new HashMap<>(Map.of(
                        "service.name", "checkout",
                        "service.namespace", "payments",
                        "deployment.environment.name", "prod",
                        "service.version", "1.2.3",
                        "hertzbeat.entity_id", "42")))
                .attributes(new HashMap<>(Map.of("http.route", "/checkout")))
                .build();
        Map<String, String> expectedResourceFilters = Map.of(
                "service.version", "1.2.3",
                "hertzbeat.entity_id", "42");
        Map<String, String> expectedAttributeFilters = Map.of("http.route", "/checkout");
        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), org.mockito.ArgumentMatchers.isNull(), eq("checkout"), eq("payments"), eq("prod"),
                eq(expectedResourceFilters), eq(expectedAttributeFilters)))
                .thenReturn(List.of(selectedLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/context")
                        .param("entityId", "42")
                        .param("logTimeUnixNano", String.valueOf(selectedTime))
                        .param("serviceName", "billing")
                        .param("serviceNamespace", "wrong-namespace")
                        .param("environment", "staging")
                        .param("resourceFilter", "service.name=billing,deployment.environment.name=staging,service.version=1.2.3")
                        .param("attributeFilter", "http.route:/checkout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.selected.body").value("checkout selected"));

        verify(historyDataReader).queryLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), org.mockito.ArgumentMatchers.isNull(), eq("checkout"), eq("payments"), eq("prod"),
                eq(expectedResourceFilters), eq(expectedAttributeFilters));
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
    void testListLogsPushesResourceAndAttributeFiltersIntoStorageWhenSupported() throws Exception {
        LogEntry filteredLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityText("INFO")
                .body("team-a checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.3",
                        "hertzbeat.entity_id", "42",
                        "hertzbeat.entity_type", "service",
                        "hertzbeat.workspace_id", "team-a")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/checkout")))
                .build();

        Map<String, String> expectedResourceFilters = Map.of(
                "service.version", "1.2.3",
                "hertzbeat.entity_id", "42",
                "hertzbeat.entity_type", "service"
        );
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, String>>any(),
                org.mockito.ArgumentMatchers.<Map<String, String>>any())).thenReturn(1L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(), any(), any(), any(), any(),
                any(), eq(0), eq(20), anySet(), eq(false), eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, String>>any(),
                org.mockito.ArgumentMatchers.<Map<String, String>>any()))
                .thenReturn(List.of(filteredLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("entityId", "42")
                        .param("entityType", "service")
                        .param("resourceFilter", "service.version=1.2.3")
                        .param("attributeFilter", "http.route:/checkout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].body").value("team-a checkout log"));

        verify(historyDataReader).countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"), eq(expectedResourceFilters),
                eq(Map.of("http.route", "/checkout")));
        verify(historyDataReader).queryLogsByMultipleConditionsWithPagination(any(), any(), any(), any(), any(), any(),
                any(), eq(0), eq(20), anySet(), eq(false), eq("team-a"),
                eq(expectedResourceFilters), eq(Map.of("http.route", "/checkout")));
    }

    @Test
    void testListLogsPushesResourceAndAttributeExcludeFiltersIntoStorageWhenSupported() throws Exception {
        LogEntry filteredLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityText("INFO")
                .body("team-a checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.4",
                        "hertzbeat.workspace_id", "team-a")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/cart")))
                .build();

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"), org.mockito.ArgumentMatchers.<Map<String, String>>any(),
                org.mockito.ArgumentMatchers.<Map<String, String>>any())).thenReturn(1L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(any(), any(), any(), any(), any(), any(),
                any(), eq(0), eq(20), anySet(), eq(false), eq("team-a"),
                org.mockito.ArgumentMatchers.<Map<String, String>>any(),
                org.mockito.ArgumentMatchers.<Map<String, String>>any()))
                .thenReturn(List.of(filteredLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("resourceFilter", "service.version!=1.2.3")
                        .param("attributeFilter", "http.route!=/checkout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].body").value("team-a checkout log"));

        verify(historyDataReader).countLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"), eq(Map.of("service.version", "!1.2.3")),
                eq(Map.of("http.route", "!/checkout")));
        verify(historyDataReader).queryLogsByMultipleConditionsWithPagination(any(), any(), any(), any(), any(), any(),
                any(), eq(0), eq(20), anySet(), eq(false), eq("team-a"),
                eq(Map.of("service.version", "!1.2.3")), eq(Map.of("http.route", "!/checkout")));
    }

    @Test
    void testListLogsAppliesInAndNotInFiltersWithRowFallback() throws Exception {
        LogEntry stableLog = LogEntry.builder()
                .timeUnixNano(1734005477630000000L)
                .severityText("INFO")
                .body("stable checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.3",
                        "host.name", "checkout-1")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/checkout")))
                .build();
        LogEntry canaryLog = LogEntry.builder()
                .timeUnixNano(1734005477640000000L)
                .severityText("INFO")
                .body("canary checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.3",
                        "host.name", "checkout-canary")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/checkout")))
                .build();
        LogEntry cartLog = LogEntry.builder()
                .timeUnixNano(1734005477650000000L)
                .severityText("INFO")
                .body("cart checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.4",
                        "host.name", "checkout-2")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/cart")))
                .build();
        LogEntry otherVersionLog = LogEntry.builder()
                .timeUnixNano(1734005477660000000L)
                .severityText("INFO")
                .body("other checkout log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "2.0.0",
                        "host.name", "checkout-3")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/checkout")))
                .build();
        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(List.of(stableLog, canaryLog, cartLog, otherVersionLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/list")
                        .param("resourceFilter", "service.version IN (\"1.2.3\", '1.2.4') "
                                + "and host.name NOT IN ('checkout-canary')")
                        .param("attributeFilter", "http.route IN ('/checkout')"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].body").value("stable checkout log"))
                .andExpect(jsonPath("$.data.totalElements").value(1));

        verify(historyDataReader).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
        verify(historyDataReader, never()).countLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
        verify(historyDataReader, never()).queryLogsByMultipleConditionsWithPagination(any(), any(),
                any(), any(), any(), any(), any(), anyInt(), anyInt());
    }

    @Test
    void testContextLogsReturnsSelectedLogWithBoundedBeforeAndAfterRows() throws Exception {
        long selectedTime = 1734005477630000000L;
        LogEntry olderClosestLog = LogEntry.builder()
                .timeUnixNano(selectedTime - 1_000_000L)
                .severityText("INFO")
                .body("checkout older closest")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry olderFarLog = LogEntry.builder()
                .timeUnixNano(selectedTime - 2_000_000L)
                .severityText("INFO")
                .body("checkout older far")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry selectedLog = LogEntry.builder()
                .timeUnixNano(selectedTime)
                .severityText("ERROR")
                .body("checkout selected")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry newerClosestLog = LogEntry.builder()
                .timeUnixNano(selectedTime + 1_000_000L)
                .severityText("WARN")
                .body("checkout newer closest")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry newerFarLog = LogEntry.builder()
                .timeUnixNano(selectedTime + 2_000_000L)
                .severityText("INFO")
                .body("checkout newer far")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry otherServiceLog = LogEntry.builder()
                .timeUnixNano(selectedTime + 500_000L)
                .severityText("INFO")
                .body("payment neighboring log")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "payment",
                        "deployment.environment.name", "prod")))
                .build();

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), any(), eq("checkout"), any(), eq("prod")))
                .thenReturn(List.of(newerFarLog, newerClosestLog, otherServiceLog, selectedLog, olderClosestLog, olderFarLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/context")
                        .param("logTimeUnixNano", String.valueOf(selectedTime))
                        .param("serviceName", "checkout")
                        .param("environment", "prod")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.targetTimeUnixNano").value(selectedTime))
                .andExpect(jsonPath("$.data.limit").value(1))
                .andExpect(jsonPath("$.data.before.length()").value(1))
                .andExpect(jsonPath("$.data.before[0].body").value("checkout older closest"))
                .andExpect(jsonPath("$.data.selected.body").value("checkout selected"))
                .andExpect(jsonPath("$.data.after.length()").value(1))
                .andExpect(jsonPath("$.data.after[0].body").value("checkout newer closest"))
                .andExpect(jsonPath("$.data.hasMoreBefore").value(true))
                .andExpect(jsonPath("$.data.hasMoreAfter").value(true));
    }

    @Test
    void testContextLogsAppliesInAndNotInFiltersWithRowFallback() throws Exception {
        long selectedTime = 1734005477630000000L;
        LogEntry selectedLog = LogEntry.builder()
                .timeUnixNano(selectedTime)
                .severityText("ERROR")
                .body("stable checkout selected")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.3",
                        "host.name", "checkout-1")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/checkout")))
                .build();
        LogEntry beforeLog = LogEntry.builder()
                .timeUnixNano(selectedTime - 1_000_000L)
                .severityText("INFO")
                .body("stable checkout before")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.4",
                        "host.name", "checkout-2")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/checkout")))
                .build();
        LogEntry canaryLog = LogEntry.builder()
                .timeUnixNano(selectedTime + 1_000_000L)
                .severityText("INFO")
                .body("canary checkout after")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.3",
                        "host.name", "checkout-canary")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/checkout")))
                .build();
        LogEntry cartLog = LogEntry.builder()
                .timeUnixNano(selectedTime + 2_000_000L)
                .severityText("INFO")
                .body("cart checkout after")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "service.version", "1.2.4",
                        "host.name", "checkout-3")))
                .attributes(new HashMap<>(java.util.Map.of("http.route", "/cart")))
                .build();
        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any())).thenReturn(List.of(cartLog, canaryLog, selectedLog, beforeLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/context")
                        .param("logTimeUnixNano", String.valueOf(selectedTime))
                        .param("resourceFilter", "service.version IN ('1.2.3', '1.2.4') "
                                + "and host.name NOT IN ('checkout-canary')")
                        .param("attributeFilter", "http.route IN ('/checkout')")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.before.length()").value(1))
                .andExpect(jsonPath("$.data.before[0].body").value("stable checkout before"))
                .andExpect(jsonPath("$.data.selected.body").value("stable checkout selected"))
                .andExpect(jsonPath("$.data.after.length()").value(0));

        verify(historyDataReader).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), any(), any(), any(), any(),
                org.mockito.ArgumentMatchers.<Map<String, String>>any(),
                org.mockito.ArgumentMatchers.<Map<String, String>>any());
    }

    @Test
    void testContextLogsReturnsDirectionalRowsAfterCursor() throws Exception {
        long selectedTime = 1734005477630000000L;
        long cursorTime = selectedTime + 1_000_000L;
        LogEntry selectedLog = LogEntry.builder()
                .timeUnixNano(selectedTime)
                .severityText("ERROR")
                .body("checkout selected")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry newerCursorLog = LogEntry.builder()
                .timeUnixNano(cursorTime)
                .severityText("WARN")
                .body("checkout newer cursor")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry newerNextLog = LogEntry.builder()
                .timeUnixNano(selectedTime + 2_000_000L)
                .severityText("INFO")
                .body("checkout newer next")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry newerFarLog = LogEntry.builder()
                .timeUnixNano(selectedTime + 3_000_000L)
                .severityText("INFO")
                .body("checkout newer far")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), any(), eq("checkout"), any(), eq("prod")))
                .thenReturn(List.of(newerFarLog, newerNextLog, newerCursorLog, selectedLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/context")
                        .param("logTimeUnixNano", String.valueOf(selectedTime))
                        .param("direction", "after")
                        .param("cursorLogTimeUnixNano", String.valueOf(cursorTime))
                        .param("serviceName", "checkout")
                        .param("environment", "prod")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.direction").value("after"))
                .andExpect(jsonPath("$.data.cursorLogTimeUnixNano").value(cursorTime))
                .andExpect(jsonPath("$.data.before.length()").value(0))
                .andExpect(jsonPath("$.data.selected").doesNotExist())
                .andExpect(jsonPath("$.data.after.length()").value(1))
                .andExpect(jsonPath("$.data.after[0].body").value("checkout newer next"))
                .andExpect(jsonPath("$.data.hasMoreBefore").value(false))
                .andExpect(jsonPath("$.data.hasMoreAfter").value(true));
    }

    @Test
    void testContextLogsReturnsDirectionalRowsBeforeCursor() throws Exception {
        long selectedTime = 1734005477630000000L;
        long cursorTime = selectedTime - 1_000_000L;
        LogEntry selectedLog = LogEntry.builder()
                .timeUnixNano(selectedTime)
                .severityText("ERROR")
                .body("checkout selected")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry olderFarLog = LogEntry.builder()
                .timeUnixNano(selectedTime - 3_000_000L)
                .severityText("INFO")
                .body("checkout older far")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry olderNextLog = LogEntry.builder()
                .timeUnixNano(selectedTime - 2_000_000L)
                .severityText("INFO")
                .body("checkout older next")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();
        LogEntry olderCursorLog = LogEntry.builder()
                .timeUnixNano(cursorTime)
                .severityText("WARN")
                .body("checkout older cursor")
                .resource(new HashMap<>(java.util.Map.of(
                        "service.name", "checkout",
                        "deployment.environment.name", "prod")))
                .build();

        when(historyDataReader.queryLogsByMultipleConditions(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), any(), eq("checkout"), any(), eq("prod")))
                .thenReturn(List.of(selectedLog, olderCursorLog, olderNextLog, olderFarLog));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/context")
                        .param("logTimeUnixNano", String.valueOf(selectedTime))
                        .param("direction", "before")
                        .param("cursorLogTimeUnixNano", String.valueOf(cursorTime))
                        .param("serviceName", "checkout")
                        .param("environment", "prod")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.direction").value("before"))
                .andExpect(jsonPath("$.data.cursorLogTimeUnixNano").value(cursorTime))
                .andExpect(jsonPath("$.data.before.length()").value(1))
                .andExpect(jsonPath("$.data.before[0].body").value("checkout older next"))
                .andExpect(jsonPath("$.data.selected").doesNotExist())
                .andExpect(jsonPath("$.data.after.length()").value(0))
                .andExpect(jsonPath("$.data.hasMoreBefore").value(true))
                .andExpect(jsonPath("$.data.hasMoreAfter").value(false));
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

    @Test
    void testGroupByStatsPushesWorkspaceAndAttributeFiltersIntoStorageWhenSupported() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(historyDataReader.countLogsByGroup(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"), eq("checkout"), any(), any(),
                org.mockito.ArgumentMatchers.<Map<String, String>>any(),
                org.mockito.ArgumentMatchers.<Map<String, String>>any(), eq("resource:service.version")))
                .thenReturn(java.util.Map.of("1.2.3", 7L, "2.0.0", 4L));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logs/stats/group-by")
                        .param("serviceName", "checkout")
                        .param("resourceFilter", "service.version=1.2.3")
                        .param("attributeFilter", "http.route:/checkout")
                        .param("groupBy", "resource:service.version")
                        .param("limit", "1")
                        .param("orderBy", "count-asc")
                        .param("minCount", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.groupBy").value("resource:service.version"))
                .andExpect(jsonPath("$.data.groups[0].value").value("1.2.3"))
                .andExpect(jsonPath("$.data.groups[0].count").value(7))
                .andExpect(jsonPath("$.data.groups.length()").value(1));

        verify(historyDataReader).countLogsByGroup(any(), any(), any(), any(), any(), any(), any(),
                anySet(), eq(false), eq("team-a"), eq("checkout"), any(), any(),
                eq(Map.of("service.version", "1.2.3")), eq(Map.of("http.route", "/checkout")),
                eq("resource:service.version"));
        verify(historyDataReader, never()).queryLogsByMultipleConditions(any(), any(), any(),
                any(), any(), any(), any());
    }

}
