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

package org.apache.hertzbeat.push.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.push.PushMetrics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link PushMetricsDao}
 */

@ExtendWith(MockitoExtension.class)
public class PushMetricsDaoTest {
    @Mock
    private PushMetricsDao pushMetricsDao;

    @InjectMocks
    private PushMetricsDaoTest pushMetricsDaoTest;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shallFindFirstByMonitorIdOrderByTimeDesc() {

        PushMetrics expectedMetrics = new PushMetrics();
        expectedMetrics.setMonitorId(1L);
        expectedMetrics.setTime(System.currentTimeMillis());

        when(pushMetricsDao.findFirstByMonitorIdOrderByTimeDesc(1L)).thenReturn(expectedMetrics);

        PushMetrics actualMetrics = pushMetricsDao.findFirstByMonitorIdOrderByTimeDesc(1L);

        assertEquals(expectedMetrics, actualMetrics);
        verify(pushMetricsDao, times(1)).findFirstByMonitorIdOrderByTimeDesc(1L);
    }

    @Test
    void shallDeleteAllByTimeBefore() {

        doNothing().when(pushMetricsDao).deleteAllByTimeBefore(anyLong());

        pushMetricsDao.deleteAllByTimeBefore(1000L);

        verify(pushMetricsDao, times(1)).deleteAllByTimeBefore(1000L);
    }
}
