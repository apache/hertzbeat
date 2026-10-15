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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for persisted entity monitor-bind writes.
 */
@ExtendWith(MockitoExtension.class)
class EntityMonitorBindWriteModelServiceTest {

    @InjectMocks
    private EntityMonitorBindWriteModelService entityMonitorBindWriteModelService;

    @Mock
    private EntityMonitorBindDao entityMonitorBindDao;

    @Test
    void deleteMonitorBindsRemovesRowsBeforeCallerRemovesEntity() {
        entityMonitorBindWriteModelService.deleteMonitorBinds(301L);

        InOrder inOrder = inOrder(entityMonitorBindDao);
        inOrder.verify(entityMonitorBindDao).deleteAllByEntityId(301L);
        inOrder.verify(entityMonitorBindDao).flush();
    }

    @Test
    void deleteMonitorBindsByMonitorIdsRemovesRowsForDeletedMonitors() {
        Set<Long> monitorIds = Set.of(501L, 502L);

        entityMonitorBindWriteModelService.deleteMonitorBindsByMonitorIds(monitorIds);

        verify(entityMonitorBindDao).deleteAllByMonitorIdIn(monitorIds);
    }

    @Test
    void deleteMonitorBindsByMonitorIdsSkipsEmptyMonitorSet() {
        entityMonitorBindWriteModelService.deleteMonitorBindsByMonitorIds(Set.of());

        verifyNoInteractions(entityMonitorBindDao);
    }

    @Test
    void replaceMonitorBindsDeletesExistingRowsBeforeSavingReplacementRows() {
        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(301L)
                .monitorId(501L)
                .bindSource("otel_resource")
                .build();

        entityMonitorBindWriteModelService.replaceMonitorBinds(301L, List.of(bind));

        InOrder inOrder = inOrder(entityMonitorBindDao);
        inOrder.verify(entityMonitorBindDao).deleteAllByEntityId(301L);
        inOrder.verify(entityMonitorBindDao).flush();
        inOrder.verify(entityMonitorBindDao).saveAll(List.of(bind));
    }

    @Test
    void replaceMonitorBindsSkipsSaveWhenReplacementRowsAreEmpty() {
        entityMonitorBindWriteModelService.replaceMonitorBinds(301L, List.of());

        InOrder inOrder = inOrder(entityMonitorBindDao);
        inOrder.verify(entityMonitorBindDao).deleteAllByEntityId(301L);
        inOrder.verify(entityMonitorBindDao).flush();
        verify(entityMonitorBindDao, never()).saveAll(any());
    }
}
