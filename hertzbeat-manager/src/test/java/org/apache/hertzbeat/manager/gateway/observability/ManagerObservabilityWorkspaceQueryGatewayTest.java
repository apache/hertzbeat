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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ManagerObservabilityWorkspaceQueryGatewayTest {

    @Mock
    private EntityIdentityDao entityIdentityDao;

    @Mock
    private ObserveEntityDao observeEntityDao;

    @Mock
    private EntityMonitorBindDao entityMonitorBindDao;

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private CollectorDao collectorDao;

    private ManagerObservabilityWorkspaceQueryGateway gateway;

    @BeforeEach
    void setUp() {
        gateway = new ManagerObservabilityWorkspaceQueryGateway(
                entityIdentityDao,
                observeEntityDao,
                entityMonitorBindDao,
                monitorDao,
                collectorDao
        );
    }

    @Test
    void delegatesWorkspaceQueriesToDaos() {
        Monitor latestMonitor = Monitor.builder().id(1L).name("checkout").gmtUpdate(LocalDateTime.now()).build();
        EntityIdentity identity = EntityIdentity.builder().id(11L).entityId(7L).identityKey("service.name").identityValue("checkout").build();
        ObserveEntity entity = ObserveEntity.builder().id(7L).name("checkout").build();
        Set<String> identityKeys = Set.of("service.name", "service.namespace");
        Set<String> normalizedValues = Set.of("checkout");

        when(monitorDao.count()).thenReturn(3L);
        when(collectorDao.count()).thenReturn(4L);
        when(collectorDao.countByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE)).thenReturn(2L);
        when(monitorDao.findFirstByOrderByGmtUpdateDesc()).thenReturn(Optional.of(latestMonitor));
        when(entityIdentityDao.countDistinctEntityIdsByIdentityKeyIn(identityKeys)).thenReturn(2L);
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(identityKeys, normalizedValues)).thenReturn(List.of(identity));
        when(observeEntityDao.findAllById(anyCollection())).thenReturn(List.of(entity));
        when(entityMonitorBindDao.countByEntityId(7L)).thenReturn(5L);
        when(observeEntityDao.findById(7L)).thenReturn(Optional.of(entity));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(7L)).thenReturn(List.of(identity));

        assertEquals(3L, gateway.countMonitors());
        assertEquals(4L, gateway.countCollectors());
        assertEquals(2L, gateway.countCollectorsByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE));
        assertEquals(Optional.of(latestMonitor), gateway.findLatestMonitor());
        assertEquals(2L, gateway.countDistinctBoundEntityIdsByIdentityKeys(identityKeys));
        assertEquals(List.of(identity), gateway.findIdentitiesByKeysAndNormalizedValues(identityKeys, normalizedValues));
        assertEquals(Map.of(7L, entity), gateway.findEntitiesByIds(Set.of(7L)));
        assertEquals(5L, gateway.countMonitorBindsByEntityId(7L));
        assertEquals(Optional.of(entity), gateway.findEntityById(7L));
        assertEquals(List.of(identity), gateway.findIdentitiesByEntityId(7L));

        verify(monitorDao).count();
        verify(collectorDao).count();
        verify(collectorDao).countByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE);
        verify(monitorDao).findFirstByOrderByGmtUpdateDesc();
        verify(entityIdentityDao).countDistinctEntityIdsByIdentityKeyIn(identityKeys);
        verify(entityIdentityDao).findAllByIdentityKeyInAndNormalizedValueIn(identityKeys, normalizedValues);
        verify(observeEntityDao).findAllById(anyCollection());
        verify(entityMonitorBindDao).countByEntityId(7L);
        verify(observeEntityDao).findById(7L);
        verify(entityIdentityDao).findAllByEntityIdOrderByPriorityDescIdAsc(7L);
    }

    @Test
    void returnsEmptyEntityMapWhenIdsAreEmpty() {
        assertTrue(gateway.findEntitiesByIds(Set.of()).isEmpty());
        verify(observeEntityDao, org.mockito.Mockito.never()).findAllById(anyCollection());
    }
}
