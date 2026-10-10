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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the old monitor API query anti-corruption boundary used by entity services.
 */
@ExtendWith(MockitoExtension.class)
class EntityMonitorQueryServiceTest {

    private EntityMonitorQueryService monitorQueryService;

    @Mock
    private MonitorDao monitorDao;

    @BeforeEach
    void setUp() {
        monitorQueryService = new EntityMonitorQueryService(monitorDao);
    }

    @Test
    void findMonitorDelegatesToOldMonitorRepository() {
        Monitor monitor = Monitor.builder().id(501L).name("checkout-api").build();
        when(monitorDao.findById(501L)).thenReturn(Optional.of(monitor));

        Optional<Monitor> result = monitorQueryService.findMonitor(501L);

        assertTrue(result.isPresent());
        assertEquals("checkout-api", result.get().getName());
        verify(monitorDao).findById(501L);
    }

    @Test
    void monitorExistsSkipsNullIdsBeforeOldRepositoryLookup() {
        assertFalse(monitorQueryService.monitorExists(null));

        verifyNoInteractions(monitorDao);
    }

    @Test
    void findMonitorsByIdsDeduplicatesIdsBeforeOldRepositoryLookup() {
        Monitor apiMonitor = Monitor.builder().id(701L).name("api").build();
        Monitor dbMonitor = Monitor.builder().id(702L).name("db").build();
        when(monitorDao.findMonitorsByIdIn(Set.of(701L, 702L)))
                .thenReturn(List.of(dbMonitor, apiMonitor));

        List<Monitor> monitors = monitorQueryService.findMonitorsByIds(
                java.util.Arrays.asList(701L, 702L, 701L, null));

        assertEquals(List.of(702L, 701L), monitors.stream().map(Monitor::getId).toList());
        verify(monitorDao).findMonitorsByIdIn(Set.of(701L, 702L));
    }

    @Test
    void findMonitorsByIdsReturnsEmptyWithoutOldRepositoryLookupWhenIdsAreMissing() {
        assertTrue(monitorQueryService.findMonitorsByIds(List.of()).isEmpty());

        verifyNoInteractions(monitorDao);
    }
}
