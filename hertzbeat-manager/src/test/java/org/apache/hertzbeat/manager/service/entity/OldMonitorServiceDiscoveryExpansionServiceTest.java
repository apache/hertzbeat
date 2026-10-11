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

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor service-discovery child expansion lookup.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorServiceDiscoveryExpansionServiceTest {

    @InjectMocks
    private OldMonitorServiceDiscoveryExpansionService oldMonitorServiceDiscoveryExpansionService;

    @Mock
    private MonitorBindDao monitorBindDao;

    @Test
    void resolveMonitorIdsWithServiceDiscoveryChildrenSanitizesParentsAndChildBinds() {
        Set<Long> submittedIds = new HashSet<>();
        submittedIds.add(null);
        submittedIds.add(1L);
        submittedIds.add(2L);
        Set<Long> parentIds = Set.of(1L, 2L);
        when(monitorBindDao.findMonitorBindsByBizIdIn(parentIds)).thenReturn(List.of(
                MonitorBind.builder()
                        .bizId(1L)
                        .monitorId(null)
                        .build(),
                MonitorBind.builder()
                        .bizId(2L)
                        .monitorId(3L)
                        .build()));

        Set<Long> expandedIds = oldMonitorServiceDiscoveryExpansionService
                .resolveMonitorIdsWithServiceDiscoveryChildren(submittedIds);

        assertEquals(Set.of(1L, 2L, 3L), expandedIds);
        verify(monitorBindDao).findMonitorBindsByBizIdIn(parentIds);
    }

    @Test
    void resolveMonitorIdsWithServiceDiscoveryChildrenSkipsEmptyParents() {
        Set<Long> expandedIds = oldMonitorServiceDiscoveryExpansionService
                .resolveMonitorIdsWithServiceDiscoveryChildren(Set.of());

        assertEquals(Set.of(), expandedIds);
        verifyNoInteractions(monitorBindDao);
    }
}
