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

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

import java.util.Arrays;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit test for {@link LogManagerController}
 */
@ExtendWith(MockitoExtension.class)
class LogManagerControllerTest {

    private MockMvc mockMvc;

    @Mock
    private HistoryDataWriter historyDataWriter;

    private LogManagerController logManagerController;

    @BeforeEach
    void setUp() {
        this.logManagerController = new LogManagerController(historyDataWriter);
        this.mockMvc = MockMvcBuilders.standaloneSetup(logManagerController).build();
    }

    @Test
    void testBatchDeleteLogsSuccess() throws Exception {
        when(historyDataWriter.batchDeleteLogs(anyList())).thenReturn(true);

        mockMvc.perform(
                MockMvcRequestBuilders
                        .delete("/api/logs")
                        .param("timeUnixNanos", "1734005477630000000", "1734005477640000000")
        )
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Logs deleted successfully"))
                .andReturn();
    }

    @Test
    void testBatchDeleteLogsFailure() throws Exception {
        when(historyDataWriter.batchDeleteLogs(anyList())).thenReturn(false);

        mockMvc.perform(
                MockMvcRequestBuilders
                        .delete("/api/logs")
                        .param("timeUnixNanos", "1734005477630000000", "1734005477640000000")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Failed to delete logs"));
    }

    @Test
    void testBatchDeleteLogsWithSingleTimestamp() throws Exception {
        when(historyDataWriter.batchDeleteLogs(Arrays.asList(1734005477630000000L))).thenReturn(true);

        mockMvc.perform(
                MockMvcRequestBuilders
                        .delete("/api/logs")
                        .param("timeUnixNanos", "1734005477630000000")
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Logs deleted successfully"));
    }
}
