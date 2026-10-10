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

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor catalog row persistence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorCatalogWriteModelServiceTest {

    @InjectMocks
    private OldMonitorCatalogWriteModelService oldMonitorCatalogWriteModelService;

    @Mock
    private MonitorDao monitorDao;

    @Test
    void saveMonitorPersistsSubmittedMonitorRow() {
        Monitor monitor = Monitor.builder().id(1L).name("api").build();

        oldMonitorCatalogWriteModelService.saveMonitor(monitor);

        verify(monitorDao).save(monitor);
    }

    @Test
    void saveMonitorSkipsNullMonitorRow() {
        oldMonitorCatalogWriteModelService.saveMonitor(null);

        verify(monitorDao, never()).save(null);
    }

    @Test
    void deleteMonitorsByIdsReturnsDeletedMonitorRows() {
        Set<Long> monitorIds = Set.of(1L, 2L);
        List<Monitor> monitors = List.of(
                Monitor.builder().id(1L).name("api").build(),
                Monitor.builder().id(2L).name("database").build());
        when(monitorDao.findMonitorsByIdIn(monitorIds)).thenReturn(monitors);

        List<Monitor> deletedMonitors = oldMonitorCatalogWriteModelService.deleteMonitorsByIds(monitorIds);

        Assertions.assertSame(monitors, deletedMonitors);
        verify(monitorDao).findMonitorsByIdIn(monitorIds);
        verify(monitorDao).deleteAll(monitors);
    }

    @Test
    void deleteMonitorsByIdsSkipsEmptyInput() {
        Assertions.assertEquals(Collections.emptyList(),
                oldMonitorCatalogWriteModelService.deleteMonitorsByIds(Collections.emptySet()));

        verify(monitorDao, never()).findMonitorsByIdIn(Collections.emptySet());
        verify(monitorDao, never()).deleteAll(Collections.emptyList());
    }

    @Test
    void deleteMonitorsByIdsSkipsNullInput() {
        Assertions.assertEquals(Collections.emptyList(), oldMonitorCatalogWriteModelService.deleteMonitorsByIds(null));

        verify(monitorDao, never()).findMonitorsByIdIn(null);
        verify(monitorDao, never()).deleteAll(Collections.emptyList());
    }
}
