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
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor collector-bind query evidence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorCollectorBindQueryServiceTest {

    @InjectMocks
    private OldMonitorCollectorBindQueryService oldMonitorCollectorBindQueryService;

    @Mock
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Test
    void findCollectorByMonitorIdReturnsPersistedCollector() {
        CollectorMonitorBind bind = CollectorMonitorBind.builder()
                .monitorId(42L)
                .collector("collector-a")
                .build();
        when(collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(42L)).thenReturn(Optional.of(bind));

        Optional<String> collector = oldMonitorCollectorBindQueryService.findCollectorByMonitorId(42L);

        assertEquals(Optional.of("collector-a"), collector);
        verify(collectorMonitorBindDao).findCollectorMonitorBindByMonitorId(42L);
    }

    @Test
    void findCollectorByMonitorIdSkipsMissingId() {
        assertTrue(oldMonitorCollectorBindQueryService.findCollectorByMonitorId(null).isEmpty());

        verifyNoInteractions(collectorMonitorBindDao);
    }

    @Test
    void findCollectorByMonitorIdsReturnsPersistedCollectorMap() {
        CollectorMonitorBind firstBind = CollectorMonitorBind.builder()
                .monitorId(42L)
                .collector("collector-a")
                .build();
        CollectorMonitorBind secondBind = CollectorMonitorBind.builder()
                .monitorId(43L)
                .collector("collector-b")
                .build();
        Set<Long> monitorIds = Set.of(42L, 43L);
        when(collectorMonitorBindDao.findCollectorMonitorBindsByMonitorIdIn(monitorIds))
                .thenReturn(List.of(firstBind, secondBind));

        Map<Long, String> collectors = oldMonitorCollectorBindQueryService.findCollectorByMonitorIds(monitorIds);

        assertEquals(Map.of(42L, "collector-a", 43L, "collector-b"), collectors);
        verify(collectorMonitorBindDao).findCollectorMonitorBindsByMonitorIdIn(monitorIds);
    }

    @Test
    void findCollectorByMonitorIdsSkipsEmptyIds() {
        assertTrue(oldMonitorCollectorBindQueryService.findCollectorByMonitorIds(Set.of()).isEmpty());

        verifyNoInteractions(collectorMonitorBindDao);
    }
}
