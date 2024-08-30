/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.push.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.push.PushMetrics;
import org.apache.hertzbeat.common.entity.push.PushMetricsDto;
import org.apache.hertzbeat.push.dao.PushMetricsDao;
import org.apache.hertzbeat.push.dao.PushMonitorDao;
import org.apache.hertzbeat.push.service.impl.PushServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * test case for {@link PushServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class PushServiceTest {

    @Mock
    private PushMonitorDao monitorDao;

    @Mock
    private PushMetricsDao metricsDao;

    @InjectMocks
    private PushServiceImpl pushService;

    @BeforeEach
    void setUp() {

        pushService = new PushServiceImpl();

        ReflectionTestUtils.setField(pushService, "monitorDao", monitorDao);
        ReflectionTestUtils.setField(pushService, "metricsDao", metricsDao);
    }

    @Test
    void testPushMetricsData() {

        PushMetricsDto pushMetricsDto = new PushMetricsDto();
        List<PushMetricsDto.Metrics> metricsList = new ArrayList<>();
        PushMetricsDto.Metrics metrics = new PushMetricsDto.Metrics();
        metrics.setMonitorId(1L);
        metricsList.add(metrics);
        pushMetricsDto.setMetricsList(metricsList);

        when(monitorDao.findById(anyLong())).thenReturn(Optional.of(new Monitor()));

        pushService.pushMetricsData(pushMetricsDto);

        verify(metricsDao, times(1)).saveAll(any());
    }

    @Test
    void testGetPushMetricData() {

        Long monitorId = 1L;
        Long time = System.currentTimeMillis();
        PushMetrics pushMetrics = PushMetrics.builder()
                .monitorId(monitorId)
                .time(time)
                .metrics("[{\"key\":\"value\"}]")
                .build();

        when(metricsDao.findFirstByMonitorIdOrderByTimeDesc(monitorId)).thenReturn(pushMetrics);

        PushMetricsDto result = pushService.getPushMetricData(monitorId, time);

        assertEquals(1, result.getMetricsList().size());
        assertEquals(monitorId, result.getMetricsList().get(0).getMonitorId());
    }

    @Test
    void testGetPushMetricDataTimeInvalid() {

        Long monitorId = 1L;
        Long time = System.currentTimeMillis() + 10000;
        PushMetrics pushMetrics = PushMetrics.builder()
                .monitorId(monitorId)
                .time(System.currentTimeMillis())
                .metrics("[{\"key\":\"value\"}]")
                .build();

        when(metricsDao.findFirstByMonitorIdOrderByTimeDesc(monitorId)).thenReturn(pushMetrics);

        PushMetricsDto result = pushService.getPushMetricData(monitorId, time);

        assertTrue(result.getMetricsList().isEmpty());
    }

    @Test
    void testDeletePeriodically() {

        pushService.deletePeriodically();
        verify(metricsDao, times(1)).deleteAllByTimeBefore(anyLong());
    }

}
