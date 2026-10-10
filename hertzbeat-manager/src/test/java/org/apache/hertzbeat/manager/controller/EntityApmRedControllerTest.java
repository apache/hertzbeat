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

import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.SUCCESS_CODE;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.EntityApmRedView;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.service.entity.EntityApmRedReadModelService;
import org.apache.hertzbeat.manager.support.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class EntityApmRedControllerTest {

    @Mock
    private ObserveEntityService observeEntityService;

    @Mock
    private EntityApmRedReadModelService entityApmRedReadModelService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        EntityController controller = new EntityController();
        ReflectionTestUtils.setField(controller, "observeEntityService", observeEntityService);
        ReflectionTestUtils.setField(controller, "entityApmRedReadModelService", entityApmRedReadModelService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void exposesStrictEntityApmRedEnvelope() throws Exception {
        long start = 1_777_000_000_000L;
        long end = start + 3_600_000L;
        EntityApmRedView view = EntityApmRedView.ready(
                start,
                end,
                new EntityApmRedView.Identity(
                        "workspace-a", "901", "service", "checkout-api", "commerce", "prod"),
                new EntityApmRedView.RedSummary(120L, 6L, 120D / 3600D, 0.05D, 100D, 240D),
                List.of(new EntityApmRedView.RedPoint(start, 120L, 6L, 2D, 0.05D, 100D, 240D)));
        when(entityApmRedReadModelService.query(901L, start, end)).thenReturn(view);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/901/signals/red")
                        .param("start", Long.toString(start))
                        .param("end", Long.toString(end)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                .andExpect(jsonPath("$.data.state").value("ready"))
                .andExpect(jsonPath("$.data.source").value("greptime_flow"))
                .andExpect(jsonPath("$.data.resolutionSeconds").value(60))
                .andExpect(jsonPath("$.data.window.start").value(start))
                .andExpect(jsonPath("$.data.window.end").value(end))
                .andExpect(jsonPath("$.data.identity.workspaceId").value("workspace-a"))
                .andExpect(jsonPath("$.data.identity.entityId").value("901"))
                .andExpect(jsonPath("$.data.identity.serviceName").value("checkout-api"))
                .andExpect(jsonPath("$.data.summary.requestCount").value(120))
                .andExpect(jsonPath("$.data.series.length()").value(1))
                .andExpect(jsonPath("$.data.series[0].timestamp").value(start));
        verify(entityApmRedReadModelService).query(901L, start, end);
    }

    @Test
    void inaccessibleEntityUsesExistingNotFoundEnvelope() throws Exception {
        long start = 1_777_000_000_000L;
        long end = start + 3_600_000L;
        when(entityApmRedReadModelService.query(902L, start, end)).thenReturn(null);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/902/signals/red")
                        .param("start", Long.toString(start))
                        .param("end", Long.toString(end)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) MONITOR_NOT_EXIST_CODE))
                .andExpect(jsonPath("$.msg").value("Entity not exist."));
    }

    @Test
    void keepsEmptyAndUnavailableStatesDistinctWithoutMetricFields() throws Exception {
        long start = 1_777_000_000_000L;
        long end = start + 3_600_000L;
        EntityApmRedView.Identity identity = new EntityApmRedView.Identity(
                "workspace-a", "903", "service", "checkout-api", null, null);
        when(entityApmRedReadModelService.query(903L, start, end))
                .thenReturn(EntityApmRedView.empty(start, end, identity));
        when(entityApmRedReadModelService.query(904L, start, end))
                .thenReturn(EntityApmRedView.unavailable(start, end,
                        new EntityApmRedView.Identity(
                                "workspace-a", "904", "service", "payment-api", null, null)));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/903/signals/red")
                        .param("start", Long.toString(start))
                        .param("end", Long.toString(end)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state").value("empty"))
                .andExpect(jsonPath("$.data.identity.serviceNamespace").value(nullValue()))
                .andExpect(jsonPath("$.data.identity.deploymentEnvironment").value(nullValue()))
                .andExpect(jsonPath("$.data.summary").value(nullValue()))
                .andExpect(jsonPath("$.data.series.length()").value(0));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/entities/904/signals/red")
                        .param("start", Long.toString(start))
                        .param("end", Long.toString(end)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state").value("unavailable"))
                .andExpect(jsonPath("$.data.summary").value(nullValue()))
                .andExpect(jsonPath("$.data.series.length()").value(0));
    }
}
