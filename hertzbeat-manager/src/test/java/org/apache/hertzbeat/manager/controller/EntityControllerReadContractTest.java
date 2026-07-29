/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.support.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class EntityControllerReadContractTest {

    @Mock
    private ObserveEntityService observeEntityService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        EntityController controller = new EntityController();
        ReflectionTestUtils.setField(controller, "observeEntityService", observeEntityService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void detailEnvelopeExposesBoundMonitorsAsPreviewAndSummaryAsCompleteCount() throws Exception {
        EntityDetailDto detail = new EntityDetailDto();
        detail.setBoundMonitors(java.util.stream.LongStream.rangeClosed(1, 50)
                .mapToObj(id -> MonitorInfo.fromEntity(Monitor.builder()
                        .id(id)
                        .name("monitor-" + id)
                        .status(CommonConstants.MONITOR_UP_CODE)
                        .build()))
                .toList());
        detail.setMonitorSummary(new EntityMonitorSummaryInfo(
                73, Map.of("http", 73L), Map.of("up", 73L), List.of(), 123L));
        when(observeEntityService.getEntityDetail(901L)).thenReturn(detail);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/901/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.boundMonitors.length()").value(50))
                .andExpect(jsonPath("$.data.boundMonitors[0].id").value(1))
                .andExpect(jsonPath("$.data.boundMonitors[49].id").value(50))
                .andExpect(jsonPath("$.data.monitorSummary.totalBoundMonitors").value(73));
    }

    @Test
    void monitorEnvelopePreservesFiltersNormalizedPageAndCompleteTotal() throws Exception {
        List<MonitorInfo> monitors = java.util.stream.LongStream.rangeClosed(801, 805)
                .mapToObj(id -> MonitorInfo.fromEntity(Monitor.builder()
                        .id(id)
                        .name("order-db-" + id)
                        .app("mysql")
                        .status(CommonConstants.MONITOR_DOWN_CODE)
                        .build()))
                .toList();
        when(observeEntityService.getEntityMonitors(
                902L, CommonConstants.MONITOR_DOWN_CODE, "mysql", 2, 1000))
                .thenReturn(new PageImpl<>(monitors, PageRequest.of(2, 100), 205));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/902/monitors")
                        .param("status", Byte.toString(CommonConstants.MONITOR_DOWN_CODE))
                        .param("app", "mysql")
                        .param("pageIndex", "2")
                        .param("pageSize", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content[0].id").value(801))
                .andExpect(jsonPath("$.data.content[0].app").value("mysql"))
                .andExpect(jsonPath("$.data.number").value(2))
                .andExpect(jsonPath("$.data.size").value(100))
                .andExpect(jsonPath("$.data.totalElements").value(205));
        verify(observeEntityService).getEntityMonitors(
                902L, CommonConstants.MONITOR_DOWN_CODE, "mysql", 2, 1000);
    }

    @Test
    void missingEntityUsesStableFailureEnvelopeWithoutEvidenceText() throws Exception {
        when(observeEntityService.getEntityDetail(903L)).thenReturn(null);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/903/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_NOT_EXIST_CODE))
                .andExpect(jsonPath("$.msg").value("Entity not exist."))
                .andExpect(jsonPath("$.msg").value(not(containsString("telemetry"))));
    }

    @Test
    void unexpectedReadFailureDoesNotExposeExceptionOrTelemetryContent() throws Exception {
        when(observeEntityService.getEntityDetail(904L))
                .thenThrow(new IllegalStateException(
                        "collector token=secret; telemetry body={traceId:private-trace}"));
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        Level previousLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.ERROR);
        try {
            mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/904/detail"))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_CONFLICT_CODE))
                    .andExpect(jsonPath("$.msg").value("unknown error happen"))
                    .andExpect(jsonPath("$.msg").value(not(containsString("secret"))))
                    .andExpect(jsonPath("$.msg").value(not(containsString("private-trace"))));

            String renderedLogs = appender.list.stream()
                    .map(event -> event.getFormattedMessage() + " "
                            + (event.getThrowableProxy() == null ? "" : event.getThrowableProxy().getMessage()))
                    .reduce("", (left, right) -> left + "\n" + right);
            assertTrue(renderedLogs.contains(IllegalStateException.class.getName()));
            assertFalse(renderedLogs.contains("secret"));
            assertFalse(renderedLogs.contains("private-trace"));
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(previousLevel);
            appender.stop();
        }
    }

    @Test
    void knownBusinessFailureRetainsItsExistingStableMapping() throws Exception {
        when(observeEntityService.getEntityDetail(905L))
                .thenThrow(new CommonException("entity_detail_unavailable"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/905/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("entity_detail_unavailable"));
    }

    @Test
    void knownValidationFailureRetainsItsExistingStableMapping() throws Exception {
        when(observeEntityService.getEntityDetail(906L))
                .thenThrow(new IllegalArgumentException("entity_detail_id_invalid"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/906/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.PARAM_INVALID_CODE))
                .andExpect(jsonPath("$.msg").value("entity_detail_id_invalid"));
    }

    @Test
    void databaseReadFailureDoesNotExposeSqlOrTelemetryContent() throws Exception {
        when(observeEntityService.getEntityDetail(907L))
                .thenThrow(new DataAccessResourceFailureException(
                        "select secret_token from telemetry_payload where trace_id='private-trace'"));
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        Level previousLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.WARN);
        try {
            mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/907/detail"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_CONFLICT_CODE))
                    .andExpect(jsonPath("$.msg").value("database error happen"))
                    .andExpect(jsonPath("$.msg").value(not(containsString("secret_token"))))
                    .andExpect(jsonPath("$.msg").value(not(containsString("private-trace"))));

            String renderedLogs = appender.list.stream()
                    .map(event -> event.getFormattedMessage() + " "
                            + (event.getThrowableProxy() == null ? "" : event.getThrowableProxy().getMessage()))
                    .reduce("", (left, right) -> left + "\n" + right);
            assertTrue(renderedLogs.contains(DataAccessResourceFailureException.class.getName()));
            assertFalse(renderedLogs.contains("secret_token"));
            assertFalse(renderedLogs.contains("private-trace"));
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(previousLevel);
            appender.stop();
        }
    }
}
