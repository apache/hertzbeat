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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.log.service.ThreeSignalQueryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit test for {@link ObservabilityCapabilityController}
 */
@ExtendWith(MockitoExtension.class)
class ObservabilityCapabilityControllerTest {

    private MockMvc mockMvc;

    @Mock
    private HistoryDataReader historyDataReader;

    @Mock
    private ObjectProvider<ThreeSignalQueryService> threeSignalQueryService;

    @Mock
    private ThreeSignalQueryService queryService;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(
                new ObservabilityCapabilityController(historyDataReader, threeSignalQueryService)).build();
    }

    @Test
    void shouldReportAllUnsupportedWithoutCapableStorage() throws Exception {
        when(historyDataReader.supportsLogQuery()).thenReturn(false);
        when(threeSignalQueryService.getIfAvailable()).thenReturn(null);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/observability/capability"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.log").value(false))
                .andExpect(jsonPath("$.data.trace").value(false))
                .andExpect(jsonPath("$.data.metric").value(false));
    }

    @Test
    void shouldReportAllSupportedWithCapableStorage() throws Exception {
        when(historyDataReader.supportsLogQuery()).thenReturn(true);
        when(threeSignalQueryService.getIfAvailable()).thenReturn(queryService);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/observability/capability"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.log").value(true))
                .andExpect(jsonPath("$.data.trace").value(true))
                .andExpect(jsonPath("$.data.metric").value(true));
    }
}
