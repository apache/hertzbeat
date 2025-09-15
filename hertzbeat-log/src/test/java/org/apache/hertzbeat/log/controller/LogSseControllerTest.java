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

package org.apache.hertzbeat.log.controller;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.apache.hertzbeat.log.notice.LogSseFilterCriteria;
import org.apache.hertzbeat.log.notice.LogSseManager;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit tests for the {@link LogSseController}.
 */
@ExtendWith(MockitoExtension.class)
class LogSseControllerTest {

    private MockMvc mockMvc;

    @Mock
    private LogSseManager emitterManager;

    @Captor
    private ArgumentCaptor<LogSseFilterCriteria> filterCriteriaCaptor;

    @BeforeEach
    void setUp() {
        // Initialize the controller and MockMvc instance before each test
        LogSseController logSseController = new LogSseController(emitterManager);
        this.mockMvc = MockMvcBuilders.standaloneSetup(logSseController).build();
    }

    @Test
    void testSubscribeWithoutFilters() throws Exception {
        // When: A request is made to the subscribe endpoint without any parameters
        mockMvc.perform(get("/api/logs/sse/subscribe")
                        .accept(MediaType.TEXT_EVENT_STREAM_VALUE))
                .andExpect(status().isOk());

        // Then: The emitter manager is called with an empty filter criteria
        verify(emitterManager).createEmitter(anyLong(), filterCriteriaCaptor.capture());
        LogSseFilterCriteria capturedCriteria = filterCriteriaCaptor.getValue();

        Assertions.assertNull(capturedCriteria.getSeverityText());
        Assertions.assertNull(capturedCriteria.getSeverityNumber());
        Assertions.assertNull(capturedCriteria.getTraceId());
        Assertions.assertNull(capturedCriteria.getSpanId());
    }

    @Test
    void testSubscribeWithMultipleFilters() throws Exception {
        // Given: Multiple filter parameters
        String severityText = "ERROR";
        String severityNumber = "17";
        String traceId = "abcdef1234567890abcdef1234567890";
        String spanId = "abcdef1234567890";

        // When: A request is made with all filter parameters
        mockMvc.perform(get("/api/logs/sse/subscribe")
                        .param("severityText", severityText)
                        .param("severityNumber", severityNumber)
                        .param("traceId", traceId)
                        .param("spanId", spanId)
                        .accept(MediaType.TEXT_EVENT_STREAM_VALUE))
                .andExpect(status().isOk());

        // Then: The emitter manager is called with a criteria object containing all filter values
        verify(emitterManager).createEmitter(anyLong(), filterCriteriaCaptor.capture());
        LogSseFilterCriteria capturedCriteria = filterCriteriaCaptor.getValue();

        Assertions.assertEquals(capturedCriteria.getSeverityText(), severityText);
        Assertions.assertEquals(capturedCriteria.getSeverityNumber(), Integer.parseInt(severityNumber));
        Assertions.assertEquals(capturedCriteria.getTraceId(), traceId);
        Assertions.assertEquals(capturedCriteria.getSpanId(), spanId);
    }

    @Test
    void testSubscribeWithInvalidSeverityNumber() throws Exception {
        // When: A request is made with a non-integer value for severityNumber
        mockMvc.perform(get("/api/logs/sse/subscribe")
                        .param("severityNumber", "not-a-number")
                        .accept(MediaType.TEXT_EVENT_STREAM_VALUE))
                .andExpect(status().is4xxClientError());
    }
}