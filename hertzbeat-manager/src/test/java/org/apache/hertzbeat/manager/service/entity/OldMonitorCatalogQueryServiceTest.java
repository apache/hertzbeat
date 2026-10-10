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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor catalog and app status query evidence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorCatalogQueryServiceTest {

    @InjectMocks
    private OldMonitorCatalogQueryService oldMonitorCatalogQueryService;

    @Mock
    private MonitorDao monitorDao;

    @Test
    void findMonitorByIdReturnsPersistedMonitor() {
        Monitor monitor = Monitor.builder().id(42L).name("api").build();
        when(monitorDao.findById(42L)).thenReturn(Optional.of(monitor));

        Optional<Monitor> actual = oldMonitorCatalogQueryService.findMonitorById(42L);

        assertEquals(Optional.of(monitor), actual);
        verify(monitorDao).findById(42L);
    }

    @Test
    void findMonitorByIdSkipsMissingId() {
        assertTrue(oldMonitorCatalogQueryService.findMonitorById(null).isEmpty());

        verifyNoInteractions(monitorDao);
    }

    @Test
    void findMonitorByNameReturnsPersistedMonitor() {
        Monitor monitor = Monitor.builder().id(42L).name("api").build();
        when(monitorDao.findMonitorByNameEquals("api")).thenReturn(Optional.of(monitor));

        Optional<Monitor> actual = oldMonitorCatalogQueryService.findMonitorByName("api");

        assertEquals(Optional.of(monitor), actual);
        verify(monitorDao).findMonitorByNameEquals("api");
    }

    @Test
    void findMonitorsByAppReturnsPersistedRows() {
        List<Monitor> monitors = List.of(Monitor.builder().id(1L).app("jvm").build());
        when(monitorDao.findMonitorsByAppEquals("jvm")).thenReturn(monitors);

        List<Monitor> actual = oldMonitorCatalogQueryService.findMonitorsByApp("jvm");

        assertEquals(monitors, actual);
        verify(monitorDao).findMonitorsByAppEquals("jvm");
    }

    @Test
    void findAllMonitorIdsReturnsPersistedIds() {
        List<Monitor> monitors = List.of(
                Monitor.builder().id(1L).name("api").build(),
                Monitor.builder().id(2L).name("db").build());
        when(monitorDao.findAll()).thenReturn(monitors);

        List<Long> actual = oldMonitorCatalogQueryService.findAllMonitorIds();

        assertEquals(List.of(1L, 2L), actual);
        verify(monitorDao).findAll();
    }

    @Test
    void findAppStatusCountsReturnsPersistedCounts() {
        List<AppCount> counts = List.of(new AppCount());
        when(monitorDao.findAppsStatusCount()).thenReturn(counts);

        List<AppCount> actual = oldMonitorCatalogQueryService.findAppStatusCounts();

        assertEquals(counts, actual);
        verify(monitorDao).findAppsStatusCount();
    }
}
