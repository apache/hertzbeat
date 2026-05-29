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

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.Set;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor service-discovery bind cleanup persistence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorServiceDiscoveryBindWriteModelServiceTest {

    @InjectMocks
    private OldMonitorServiceDiscoveryBindWriteModelService oldMonitorServiceDiscoveryBindWriteModelService;

    @Mock
    private MonitorBindDao monitorBindDao;

    @Test
    void deleteBindsByParentMonitorIdsDeletesRowsForDeletedParents() {
        Set<Long> monitorIds = Set.of(1L, 2L);

        oldMonitorServiceDiscoveryBindWriteModelService.deleteBindsByParentMonitorIds(monitorIds);

        verify(monitorBindDao).deleteMonitorBindByBizIdIn(monitorIds);
    }

    @Test
    void deleteBindsByParentMonitorIdsSkipsEmptyScope() {
        oldMonitorServiceDiscoveryBindWriteModelService.deleteBindsByParentMonitorIds(Set.of());

        verifyNoInteractions(monitorBindDao);
    }

    @Test
    void deleteBindsByChildMonitorIdDeletesRowsForDeletedChild() {
        oldMonitorServiceDiscoveryBindWriteModelService.deleteBindsByChildMonitorId(3L);

        verify(monitorBindDao).deleteByMonitorId(3L);
    }

    @Test
    void deleteBindsByChildMonitorIdSkipsMissingId() {
        oldMonitorServiceDiscoveryBindWriteModelService.deleteBindsByChildMonitorId(null);

        verifyNoInteractions(monitorBindDao);
    }
}
