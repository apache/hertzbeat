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

package org.apache.hertzbeat.ai.gateway.tool.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.service.entity.EntityDiscoveryReadModelService;
import org.junit.jupiter.api.Test;

class AgentEntityManagementToolServiceTest {
    private final ObserveEntityService entities = mock(ObserveEntityService.class);
    private final EntityDiscoveryReadModelService discovery = mock(EntityDiscoveryReadModelService.class);
    private final AgentEntityManagementToolService service = new AgentEntityManagementToolService(entities, discovery);

    @Test
    void delegatesBoundedEntitySubresourcesWithAllFilters() {
        service.alerts(10L, "firing", "critical", 2, 20);
        verify(entities).getEntityAlerts(10L, "firing", "critical", 2, 20);
        service.monitors(10L, (byte) 2, "springboot3", null, null);
        verify(entities).getEntityMonitors(10L, (byte) 2, "springboot3", 0, 10);
        service.discovery("  checkout  ", 1, 8);
        verify(discovery).getDiscovery("checkout", 1, 8);
        service.candidates(List.of(17L, 18L));
        verify(entities).getMonitorBindingCandidates(List.of(17L, 18L));
    }

    @Test
    void invalidInputsNeverReachManager() {
        assertThrows(IllegalArgumentException.class, () -> service.delete(0));
        assertThrows(IllegalArgumentException.class, () -> service.alerts(1L, null, null, -1, 10));
        assertThrows(IllegalArgumentException.class, () -> service.monitors(1L, null, null, 0, 51));
        assertThrows(IllegalArgumentException.class, () -> service.discovery("a".repeat(201), 0, 10));
        assertThrows(IllegalArgumentException.class, () -> service.candidates(List.of(-1L)));
        verifyNoInteractions(entities, discovery);
    }

    @Test
    void missingOrInaccessibleEntityIsNotDeleted() {
        when(entities.getEntityDto(10L)).thenReturn(null);
        assertThrows(IllegalArgumentException.class, () -> service.delete(10L));
        verify(entities, never()).deleteEntity(10L);
    }

    @Test
    void reportsDeletionOnlyAfterVerifyingAbsence() {
        when(entities.getEntityDto(10L)).thenReturn(new EntityDto(), null);
        assertEquals(true, service.delete(10L).get("deleted"));
        verify(entities).deleteEntity(10L);
    }

    @Test
    void doesNotReportSuccessWhenEntityRemains() {
        when(entities.getEntityDto(10L)).thenReturn(new EntityDto());
        assertThrows(IllegalStateException.class, () -> service.delete(10L));
        verify(entities).deleteEntity(10L);
    }
}
