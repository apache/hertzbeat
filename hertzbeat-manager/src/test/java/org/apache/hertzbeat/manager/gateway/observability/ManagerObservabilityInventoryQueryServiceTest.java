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

package org.apache.hertzbeat.manager.gateway.observability;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ManagerObservabilityInventoryQueryServiceTest {

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private CollectorDao collectorDao;

    private ManagerObservabilityInventoryQueryService queryService;

    @BeforeEach
    void setUp() {
        queryService = new ManagerObservabilityInventoryQueryService(monitorDao, collectorDao);
    }

    @Test
    void delegatesInventoryReadsToManagerDaos() {
        Monitor latestMonitor = Monitor.builder().id(1L).name("checkout").gmtUpdate(LocalDateTime.now()).build();
        when(monitorDao.count()).thenReturn(3L);
        when(collectorDao.count()).thenReturn(4L);
        when(collectorDao.countByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE)).thenReturn(2L);
        when(monitorDao.findFirstByOrderByGmtUpdateDesc()).thenReturn(Optional.of(latestMonitor));

        assertEquals(3L, queryService.countMonitors());
        assertEquals(4L, queryService.countCollectors());
        assertEquals(2L, queryService.countCollectorsByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE));
        assertEquals(Optional.of(latestMonitor), queryService.findLatestMonitor());

        verify(monitorDao).count();
        verify(collectorDao).count();
        verify(collectorDao).countByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE);
        verify(monitorDao).findFirstByOrderByGmtUpdateDesc();
    }
}
