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

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.service.MetricsFavoriteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Set;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link MetricsFavoriteController}
 */
@ExtendWith(MockitoExtension.class)
class MetricsFavoriteControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MetricsFavoriteService metricsFavoriteService;

    @InjectMocks
    private MetricsFavoriteController metricsFavoriteController;

    private final Long testMonitorId = 1L;
    private final String testMetricsName = "cpu";
    private final String testUserId = "testUser";

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(metricsFavoriteController)
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }

    @Test
    void testAddMetricsFavoriteSuccess() throws Exception {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(testUserId);
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        
            doNothing().when(metricsFavoriteService).addMetricsFavorite(testUserId, testMonitorId, testMetricsName);

            mockMvc.perform(post("/api/metrics/favorite/{monitorId}/{metricsName}", testMonitorId, testMetricsName)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.msg").value("Metrics added to favorites successfully"));

            verify(metricsFavoriteService).addMetricsFavorite(testUserId, testMonitorId, testMetricsName);
        }
    }

    @Test
    void testAddMetricsFavoriteAlreadyExists() throws Exception {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(testUserId);
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        
            doThrow(new RuntimeException("Metrics favorite already exists: " + testMetricsName))
                    .when(metricsFavoriteService).addMetricsFavorite(testUserId, testMonitorId, testMetricsName);

            mockMvc.perform(post("/api/metrics/favorite/{monitorId}/{metricsName}", testMonitorId, testMetricsName)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("Add failed! Metrics favorite already exists: " + testMetricsName));

            verify(metricsFavoriteService).addMetricsFavorite(testUserId, testMonitorId, testMetricsName);
        }
    }

    @Test
    void testAddMetricsFavoriteMissingParameters() throws Exception {
        mockMvc.perform(post("/api/metrics/favorite")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        verify(metricsFavoriteService, never()).addMetricsFavorite(anyString(), anyLong(), anyString());
    }

    @Test
    void testRemoveMetricsFavoriteSuccess() throws Exception {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(testUserId);
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        
            // Given
            doNothing().when(metricsFavoriteService).removeMetricsFavorite(testUserId, testMonitorId, testMetricsName);

            // When & Then
            mockMvc.perform(delete("/api/metrics/favorite/{monitorId}/{metricsName}", testMonitorId, testMetricsName)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.msg").value("Metrics removed from favorites successfully"));

            verify(metricsFavoriteService).removeMetricsFavorite(testUserId, testMonitorId, testMetricsName);
        }
    }

    @Test
    void testRemoveMetricsFavoriteException() throws Exception {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(testUserId);
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        
            doThrow(new RuntimeException("Database error"))
                    .when(metricsFavoriteService).removeMetricsFavorite(testUserId, testMonitorId, testMetricsName);

            mockMvc.perform(delete("/api/metrics/favorite/{monitorId}/{metricsName}", testMonitorId, testMetricsName)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("Remove failed! Database error"));

            verify(metricsFavoriteService).removeMetricsFavorite(testUserId, testMonitorId, testMetricsName);
        }
    }

    @Test
    void testGetUserFavoritedMetricsSuccess() throws Exception {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(testUserId);
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        
            Set<String> favoriteMetrics = Set.of("cpu", "memory", "disk");
            when(metricsFavoriteService.getUserFavoritedMetrics(testUserId, testMonitorId))
                    .thenReturn(favoriteMetrics);

            mockMvc.perform(get("/api/metrics/favorite/{monitorId}", testMonitorId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data.length()").value(3));

            verify(metricsFavoriteService).getUserFavoritedMetrics(testUserId, testMonitorId);
        }
    }

    @Test
    void testGetUserFavoritedMetricsEmptyResult() throws Exception {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(testUserId);
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        
            Set<String> favoriteMetrics = Set.of();
            when(metricsFavoriteService.getUserFavoritedMetrics(testUserId, testMonitorId))
                    .thenReturn(favoriteMetrics);

            mockMvc.perform(get("/api/metrics/favorite/{monitorId}", testMonitorId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data.length()").value(0));

            verify(metricsFavoriteService).getUserFavoritedMetrics(testUserId, testMonitorId);
        }
    }

    @Test
    void testGetUserFavoritedMetricsException() throws Exception {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(testUserId);
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        
            when(metricsFavoriteService.getUserFavoritedMetrics(testUserId, testMonitorId))
                    .thenThrow(new RuntimeException("Service error"));

            mockMvc.perform(get("/api/metrics/favorite/{monitorId}", testMonitorId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("Failed to get favorited metrics!"));

            verify(metricsFavoriteService).getUserFavoritedMetrics(testUserId, testMonitorId);
        }
    }

    @Test
    void testGetUserFavoritedMetricsMissingMonitorId() throws Exception {
        mockMvc.perform(get("/api/metrics/favorite")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        verify(metricsFavoriteService, never()).getUserFavoritedMetrics(anyString(), anyLong());
    }

    @Test
    void testUnauthenticatedAccess() throws Exception {
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(null);
            mockMvc.perform(post("/api/metrics/favorite/{monitorId}/{metricsName}", testMonitorId, testMetricsName)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.LOGIN_FAILED_CODE))
                    .andExpect(jsonPath("$.msg").value("User not authenticated"));

            verify(metricsFavoriteService, never()).addMetricsFavorite(anyString(), anyLong(), anyString());
        }
    }
}