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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor status persistence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorStatusWriteModelServiceTest {

    @InjectMocks
    private OldMonitorStatusWriteModelService oldMonitorStatusWriteModelService;

    @Mock
    private MonitorDao monitorDao;

    @Test
    void updateMonitorStatusDelegatesPersistedStatusMutation() {
        oldMonitorStatusWriteModelService.updateMonitorStatus(42L, CommonConstants.MONITOR_UP_CODE);

        verify(monitorDao).updateMonitorStatus(42L, CommonConstants.MONITOR_UP_CODE);
    }

    @Test
    void findAndMarkManagedMonitorsPausedFiltersAlreadyPausedRows() {
        Set<Long> monitorIds = Set.of(1L, 2L, 3L);
        Monitor upMonitor = Monitor.builder().id(1L).status(CommonConstants.MONITOR_UP_CODE).build();
        Monitor pausedMonitor = Monitor.builder().id(2L).status(CommonConstants.MONITOR_PAUSED_CODE).build();
        Monitor downMonitor = Monitor.builder().id(3L).status(CommonConstants.MONITOR_DOWN_CODE).build();
        when(monitorDao.findMonitorsByIdIn(monitorIds)).thenReturn(List.of(upMonitor, pausedMonitor, downMonitor));

        List<Monitor> monitors = oldMonitorStatusWriteModelService.findAndMarkManagedMonitorsPaused(monitorIds);

        assertEquals(List.of(upMonitor, downMonitor), monitors);
        assertEquals(CommonConstants.MONITOR_PAUSED_CODE, upMonitor.getStatus());
        assertEquals(CommonConstants.MONITOR_PAUSED_CODE, downMonitor.getStatus());
        assertEquals(CommonConstants.MONITOR_PAUSED_CODE, pausedMonitor.getStatus());
    }

    @Test
    void findAndMarkPausedMonitorsUpFiltersActiveRows() {
        Set<Long> monitorIds = Set.of(1L, 2L, 3L);
        Monitor upMonitor = Monitor.builder().id(1L).status(CommonConstants.MONITOR_UP_CODE).build();
        Monitor pausedMonitor = Monitor.builder().id(2L).status(CommonConstants.MONITOR_PAUSED_CODE).build();
        Monitor downMonitor = Monitor.builder().id(3L).status(CommonConstants.MONITOR_DOWN_CODE).build();
        when(monitorDao.findMonitorsByIdIn(monitorIds)).thenReturn(List.of(upMonitor, pausedMonitor, downMonitor));

        List<Monitor> monitors = oldMonitorStatusWriteModelService.findAndMarkPausedMonitorsUp(monitorIds);

        assertEquals(List.of(pausedMonitor), monitors);
        assertEquals(CommonConstants.MONITOR_UP_CODE, pausedMonitor.getStatus());
        assertEquals(CommonConstants.MONITOR_UP_CODE, upMonitor.getStatus());
        assertEquals(CommonConstants.MONITOR_DOWN_CODE, downMonitor.getStatus());
    }

    @Test
    void saveMonitorStatusChangesPersistsSubmittedRows() {
        List<Monitor> monitors = List.of(Monitor.builder().id(1L).build());

        oldMonitorStatusWriteModelService.saveMonitorStatusChanges(monitors);

        verify(monitorDao).saveAll(monitors);
    }

    @Test
    void saveMonitorStatusChangesSkipsEmptyRows() {
        oldMonitorStatusWriteModelService.saveMonitorStatusChanges(List.of());

        verify(monitorDao, never()).saveAll(List.of());
    }

    @Test
    void saveMonitorJobIdPersistsSchedulerReturnedJobId() {
        Monitor monitor = Monitor.builder().id(1L).jobId(11L).build();

        oldMonitorStatusWriteModelService.saveMonitorJobId(monitor, 22L);

        assertEquals(22L, monitor.getJobId());
        verify(monitorDao).save(monitor);
    }
}
