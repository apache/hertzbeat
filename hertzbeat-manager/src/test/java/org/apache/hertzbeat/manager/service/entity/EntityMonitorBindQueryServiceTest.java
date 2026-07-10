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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for persisted entity monitor-bind lookup.
 */
@ExtendWith(MockitoExtension.class)
class EntityMonitorBindQueryServiceTest {

    @InjectMocks
    private EntityMonitorBindQueryService entityMonitorBindQueryService;

    @Mock
    private EntityMonitorBindDao entityMonitorBindDao;

    @Test
    void findMonitorBindsReturnsPersistedBindsInDaoOrder() {
        EntityMonitorBind monitorBind = EntityMonitorBind.builder()
                .id(401L)
                .entityId(301L)
                .monitorId(501L)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(301L)).thenReturn(List.of(monitorBind));

        List<EntityMonitorBind> binds = entityMonitorBindQueryService.findMonitorBinds(301L);

        assertEquals(List.of(monitorBind), binds);
    }

    @Test
    void findMonitorBindsByEntityIdsBatchesCurrentPageRows() {
        List<Long> entityIds = List.of(301L, 302L);
        EntityMonitorBind firstBind = EntityMonitorBind.builder()
                .id(401L)
                .entityId(301L)
                .monitorId(501L)
                .build();
        EntityMonitorBind secondBind = EntityMonitorBind.builder()
                .id(402L)
                .entityId(302L)
                .monitorId(502L)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdInOrderByEntityIdAscIdAsc(entityIds))
                .thenReturn(List.of(firstBind, secondBind));

        Map<Long, List<EntityMonitorBind>> bindsByEntityId =
                entityMonitorBindQueryService.findMonitorBindsByEntityIds(entityIds);

        assertEquals(List.of(firstBind), bindsByEntityId.get(301L));
        assertEquals(List.of(secondBind), bindsByEntityId.get(302L));
        verify(entityMonitorBindDao).findAllByEntityIdInOrderByEntityIdAscIdAsc(entityIds);
    }

    @Test
    void findMonitorBindsByMonitorIdReturnsPersistedBinds() {
        EntityMonitorBind monitorBind = EntityMonitorBind.builder()
                .id(402L)
                .entityId(302L)
                .monitorId(501L)
                .build();
        when(entityMonitorBindDao.findAllByMonitorId(501L)).thenReturn(List.of(monitorBind));

        List<EntityMonitorBind> binds = entityMonitorBindQueryService.findMonitorBindsByMonitorId(501L);

        assertEquals(List.of(monitorBind), binds);
    }

    @Test
    void findMonitorBindsByMonitorIdReturnsEmptyWithoutDaoLookupWhenMonitorIdMissing() {
        assertEquals(List.of(), entityMonitorBindQueryService.findMonitorBindsByMonitorId(null));
        verifyNoInteractions(entityMonitorBindDao);
    }

    @Test
    void countMonitorBindsReturnsPersistedBindCount() {
        when(entityMonitorBindDao.countByEntityId(301L)).thenReturn(2L);

        assertEquals(2L, entityMonitorBindQueryService.countMonitorBinds(301L));
        verify(entityMonitorBindDao).countByEntityId(301L);
    }

    @Test
    void countMonitorBindsByEntityIdsBatchesCurrentPageRows() {
        List<Long> entityIds = List.of(301L, 302L);
        when(entityMonitorBindDao.countByEntityIdInGroupByEntityId(entityIds))
                .thenReturn(List.<Object[]>of(new Object[] {301L, 2L}, new Object[] {302L, 1L}));

        assertEquals(Map.of(301L, 2L, 302L, 1L), entityMonitorBindQueryService.countMonitorBindsByEntityIds(entityIds));
        verify(entityMonitorBindDao).countByEntityIdInGroupByEntityId(entityIds);
    }
}
