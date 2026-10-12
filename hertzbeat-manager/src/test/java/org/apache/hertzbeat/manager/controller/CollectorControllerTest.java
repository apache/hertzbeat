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

package org.apache.hertzbeat.manager.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInfo;
import org.apache.hertzbeat.manager.pojo.dto.CollectorSummary;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeConfigService;
import org.apache.hertzbeat.manager.service.impl.CollectorServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for {@link CollectorController}
 */
@ExtendWith(MockitoExtension.class)
@Slf4j
public class CollectorControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private CollectorController collectorController;

    @Mock
    private CollectorServiceImpl collectorService;

    @Mock
    private ManageServer manageServer;

    @Mock
    private CollectorRuntimeConfigService runtimeConfigService;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(collectorController).build();
    }

    @Test
    public void getCollectors() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get(
                        "/api/collector?name={name}&pageIndex={pageIndex}&pageSize={pageSize}",
                        "tom", 0, 10))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getCollectorsExposesCompleteRuntimeStatusWithoutSensitiveMaterial() throws Exception {
        CollectorSummary summary = CollectorSummary.builder()
                .collector(CollectorInfo.builder().name("edge-west").build())
                .runtimeStatus(runtimeStatus())
                .runtimeStatusReportedAt(Instant.parse("2026-07-15T06:00:05Z"))
                .build();
        when(collectorService.getCollectors("edge", 0, 1))
                .thenReturn(new PageImpl<>(
                        new ArrayList<>(List.of(summary)), PageRequest.of(0, 1), 1));

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/collector")
                        .param("name", "edge")
                        .param("pageIndex", "0")
                        .param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].runtimeStatus.pid").value(4242))
                .andExpect(jsonPath("$.data.content[0].runtimeStatus.failureCode").value("BACKEND_UNAVAILABLE"))
                .andExpect(jsonPath("$.data.content[0].runtimeStatus.telemetry.queueSize.state")
                        .value("AVAILABLE"))
                .andExpect(jsonPath("$.data.content[0].runtimeStatus.telemetry.queueSize.value").value(7))
                .andExpect(jsonPath("$.data.content[0].runtimeStatus.telemetry.accepted.metrics.value").value(11))
                .andExpect(content().string(not(containsString("collector-secret-token"))))
                .andExpect(content().string(not(containsString("Authorization"))))
                .andExpect(content().string(not(containsString("BEGIN CERTIFICATE"))))
                .andExpect(content().string(not(containsString("user log body"))));
    }

    @Test
    public void onlineCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.put(
                                "/api/collector/online")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void offlineCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.put(
                                "/api/collector/offline")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }


    @Test
    public void deleteCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.delete(
                                "/api/collector")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void generateCollectorDeployInfo() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.post(
                        "/api/collector/generate/{collector}",
                        "demo-collector"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void updateRuntimeConfig() throws Exception {
        ManagedOtelRuntimeConfig config = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION, 2, true, Duration.ofSeconds(30));
        when(runtimeConfigService.update("demo-collector", config)).thenReturn(config);

        this.mockMvc.perform(MockMvcRequestBuilders.put(
                                "/api/collector/{collector}/runtime-config", "demo-collector")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(config)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revision").value(2));
    }

    private ManagedOtelRuntimeStatus runtimeStatus() {
        ManagedOtelRuntimeStatus.SignalCounters accepted = new ManagedOtelRuntimeStatus.SignalCounters(
                ManagedOtelRuntimeStatus.ObservedLong.available(11),
                ManagedOtelRuntimeStatus.ObservedLong.available(7),
                ManagedOtelRuntimeStatus.ObservedLong.available(5));
        return new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                3,
                3,
                4242,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                0,
                Instant.parse("2026-07-15T06:00:00Z"),
                "exporter unavailable",
                ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE,
                new ManagedOtelRuntimeStatus.RuntimeTelemetry(
                        accepted,
                        ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                        ManagedOtelRuntimeStatus.SignalCounters.unavailable(),
                        accepted,
                        ManagedOtelRuntimeStatus.ObservedLong.available(7),
                        ManagedOtelRuntimeStatus.ObservedLong.available(6144),
                        ManagedOtelRuntimeStatus.FileConsumerStatus.notApplicable()),
                List.of());
    }


}
