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

package org.apache.hertzbeat.manager.service.impl;

import org.apache.hertzbeat.common.entity.manager.MetricsFavorite;
import org.apache.hertzbeat.manager.dao.MetricsFavoriteDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link MetricsFavoriteServiceImpl}
 */
@ExtendWith(MockitoExtension.class)
class MetricsFavoriteServiceImplTest {

    @Mock
    private MetricsFavoriteDao metricsFavoriteDao;

    @InjectMocks
    private MetricsFavoriteServiceImpl metricsFavoriteService;

    private MetricsFavorite testFavorite;
    private final String testCreator = "testUser";
    private final Long testMonitorId = 1L;
    private final String testMetricsName = "cpu";

    @BeforeEach
    void setUp() {
        testFavorite = MetricsFavorite.builder()
                .id(1L)
                .creator(testCreator)
                .monitorId(testMonitorId)
                .metricsName(testMetricsName)
                .createTime(LocalDateTime.now())
                .build();
    }

    @Test
    void testAddMetricsFavoriteSuccess() {
        when(metricsFavoriteDao.findByCreatorAndMonitorIdAndMetricsName(testCreator, testMonitorId, testMetricsName))
                .thenReturn(Optional.empty());
        when(metricsFavoriteDao.save(any(MetricsFavorite.class))).thenReturn(testFavorite);

        assertDoesNotThrow(() -> metricsFavoriteService.addMetricsFavorite(testCreator, testMonitorId, testMetricsName));

        verify(metricsFavoriteDao).findByCreatorAndMonitorIdAndMetricsName(testCreator, testMonitorId, testMetricsName);
        verify(metricsFavoriteDao).save(any(MetricsFavorite.class));
    }

    @Test
    void testAddMetricsFavoriteAlreadyExists() {
        when(metricsFavoriteDao.findByCreatorAndMonitorIdAndMetricsName(testCreator, testMonitorId, testMetricsName))
                .thenReturn(Optional.of(testFavorite));

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> metricsFavoriteService.addMetricsFavorite(testCreator, testMonitorId, testMetricsName));
        
        assertEquals("Metrics favorite already exists: " + testMetricsName, exception.getMessage());
        verify(metricsFavoriteDao).findByCreatorAndMonitorIdAndMetricsName(testCreator, testMonitorId, testMetricsName);
        verify(metricsFavoriteDao, never()).save(any(MetricsFavorite.class));
    }

    @Test
    void testRemoveMetricsFavorite() {
        metricsFavoriteService.removeMetricsFavorite(testCreator, testMonitorId, testMetricsName);
        verify(metricsFavoriteDao).deleteByUserIdAndMonitorIdAndMetricsName(testCreator, testMonitorId, testMetricsName);
    }

    @Test
    void testGetUserFavoritedMetricsWithData() {
        MetricsFavorite favorite1 = MetricsFavorite.builder()
                .creator(testCreator)
                .monitorId(testMonitorId)
                .metricsName("cpu")
                .build();
        MetricsFavorite favorite2 = MetricsFavorite.builder()
                .creator(testCreator)
                .monitorId(testMonitorId)
                .metricsName("memory")
                .build();
        List<MetricsFavorite> favorites = Arrays.asList(favorite1, favorite2);
        
        when(metricsFavoriteDao.findByCreatorAndMonitorId(testCreator, testMonitorId))
                .thenReturn(favorites);

        Set<String> result = metricsFavoriteService.getUserFavoritedMetrics(testCreator, testMonitorId);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertTrue(result.contains("cpu"));
        assertTrue(result.contains("memory"));
        verify(metricsFavoriteDao).findByCreatorAndMonitorId(testCreator, testMonitorId);
    }

    @Test
    void testGetUserFavoritedMetricsEmptyData() {
        when(metricsFavoriteDao.findByCreatorAndMonitorId(testCreator, testMonitorId))
                .thenReturn(List.of());

        Set<String> result = metricsFavoriteService.getUserFavoritedMetrics(testCreator, testMonitorId);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(metricsFavoriteDao).findByCreatorAndMonitorId(testCreator, testMonitorId);
    }

    @Test
    void testGetUserFavoritedMetricsNullData() {
        when(metricsFavoriteDao.findByCreatorAndMonitorId(testCreator, testMonitorId))
                .thenReturn(null);

        Set<String> result = metricsFavoriteService.getUserFavoritedMetrics(testCreator, testMonitorId);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(metricsFavoriteDao).findByCreatorAndMonitorId(testCreator, testMonitorId);
    }

    @Test
    void testGetUserFavoritedMetricsFilterBlankNames() {
        MetricsFavorite favorite1 = MetricsFavorite.builder()
                .creator(testCreator)
                .monitorId(testMonitorId)
                .metricsName("cpu")
                .build();
        MetricsFavorite favorite2 = MetricsFavorite.builder()
                .creator(testCreator)
                .monitorId(testMonitorId)
                .metricsName("")
                .build();
        MetricsFavorite favorite3 = MetricsFavorite.builder()
                .creator(testCreator)
                .monitorId(testMonitorId)
                .metricsName(null)
                .build();
        List<MetricsFavorite> favorites = Arrays.asList(favorite1, favorite2, favorite3);
        
        when(metricsFavoriteDao.findByCreatorAndMonitorId(testCreator, testMonitorId))
                .thenReturn(favorites);

        Set<String> result = metricsFavoriteService.getUserFavoritedMetrics(testCreator, testMonitorId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertTrue(result.contains("cpu"));
        verify(metricsFavoriteDao).findByCreatorAndMonitorId(testCreator, testMonitorId);
    }

    @Test
    void testDeleteFavoritesByMonitorIdIn() {
        Set<Long> monitorIds = Set.of(1L, 2L, 3L);

        metricsFavoriteService.deleteFavoritesByMonitorIdIn(monitorIds);

        verify(metricsFavoriteDao).deleteFavoritesByMonitorIdIn(monitorIds);
    }
}