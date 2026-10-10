/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityApmRedView;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository.ApmRedPoint;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository.ApmRedQuery;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository.ApmRedQueryResult;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository.ApmRedSummary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class EntityApmRedReadModelServiceTest {

    private static final long START = 1_777_000_000_000L;
    private static final long END = START + 3_600_000L;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Mock
    private EntityIdentityQueryService entityIdentityQueryService;

    @Mock
    private ObjectProvider<ApmRedQueryRepository> repositoryProvider;

    @Mock
    private ApmRedQueryRepository repository;

    private EntityApmRedReadModelService service;

    @BeforeEach
    void setUp() {
        service = new EntityApmRedReadModelService(
                entityWorkspaceAccessService, entityIdentityQueryService, repositoryProvider);
    }

    @Test
    void resolvesWorkspaceOwnedCanonicalServiceIdentityBeforeQueryingFlow() {
        ObserveEntity entity = entity();
        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(901L))
                .thenReturn(Optional.of(entity));
        when(entityIdentityQueryService.findIdentities("workspace-a", 901L)).thenReturn(List.of(
                identity("service.name", "stale-checkout", false, 10),
                identity("service.name", "checkout-api", true, 100),
                identity("service.namespace", "commerce", false, 30),
                identity("deployment.environment.name", "prod", false, 20)));
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.query(org.mockito.ArgumentMatchers.any(ApmRedQuery.class)))
                .thenReturn(ApmRedQueryResult.available(
                        List.of(new ApmRedPoint(START, 120L, 6L, 2D, 0.05D, 100D, 240D)),
                        new ApmRedSummary(120L, 6L, 120D / 3600D, 0.05D, 100D, 240D)));

        EntityApmRedView view = service.query(901L, START, END);

        assertEquals(EntityApmRedView.State.READY, view.state());
        assertEquals("greptime_flow", view.source());
        assertEquals("checkout-api", view.identity().serviceName());
        assertEquals(1, view.series().size());
        assertEquals(120L, view.summary().requestCount());

        ArgumentCaptor<ApmRedQuery> queryCaptor = ArgumentCaptor.forClass(ApmRedQuery.class);
        verify(repository).query(queryCaptor.capture());
        ApmRedQuery query = queryCaptor.getValue();
        assertEquals("workspace-a", query.workspaceId());
        assertEquals("901", query.entityId());
        assertEquals("service", query.entityType());
        assertEquals("checkout-api", query.serviceName());
        assertEquals("commerce", query.serviceNamespace());
        assertEquals("prod", query.deploymentEnvironment());
        assertEquals(START, query.start());
        assertEquals(END, query.end());
    }

    @Test
    void keepsValidEmptyAndUnavailableStatesDistinctWithoutSyntheticSummary() {
        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(901L))
                .thenReturn(Optional.of(entity()));
        when(entityIdentityQueryService.findIdentities("workspace-a", 901L))
                .thenReturn(List.of(identity("service.name", "checkout-api", true, 100)));
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.query(org.mockito.ArgumentMatchers.any(ApmRedQuery.class)))
                .thenReturn(ApmRedQueryResult.available(List.of(), null))
                .thenReturn(ApmRedQueryResult.unavailable());

        EntityApmRedView empty = service.query(901L, START, END);
        EntityApmRedView unavailable = service.query(901L, START, END);

        assertEquals(EntityApmRedView.State.EMPTY, empty.state());
        assertNull(empty.summary());
        assertEquals(List.of(), empty.series());
        assertEquals(EntityApmRedView.State.UNAVAILABLE, unavailable.state());
        assertNull(unavailable.summary());
        assertEquals(List.of(), unavailable.series());
    }

    @Test
    void inaccessibleEntityLooksMissingAndNeverTouchesTelemetry() {
        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(902L))
                .thenReturn(Optional.empty());

        assertNull(service.query(902L, START, END));

        verify(entityIdentityQueryService, never()).findIdentities(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyLong());
        verify(repositoryProvider, never()).getIfAvailable();
    }

    @Test
    void missingCanonicalServiceIdentityIsUnavailableWithoutBroadQuery() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(903L)
                .workspaceId("workspace-a")
                .type("host")
                .name("node-a")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(903L))
                .thenReturn(Optional.of(entity));
        when(entityIdentityQueryService.findIdentities("workspace-a", 903L))
                .thenReturn(List.of(identity("host.name", "node-a", true, 100)));

        EntityApmRedView view = service.query(903L, START, END);

        assertEquals(EntityApmRedView.State.UNAVAILABLE, view.state());
        verify(repositoryProvider, never()).getIfAvailable();
    }

    @Test
    void rejectsUnboundedOrReversedWindowsBeforeEntityLookup() {
        assertThrows(IllegalArgumentException.class, () -> service.query(901L, END, START));
        assertThrows(IllegalArgumentException.class,
                () -> service.query(901L, START, START + ApmRedQueryRepository.MAX_WINDOW_MILLIS + 1L));

        verify(entityWorkspaceAccessService, never())
                .findAccessibleEntityForRequestWorkspace(org.mockito.ArgumentMatchers.anyLong());
    }

    private ObserveEntity entity() {
        return ObserveEntity.builder()
                .id(901L)
                .workspaceId("workspace-a")
                .type("service")
                .name("checkout-api")
                .namespace("commerce")
                .environment("prod")
                .build();
    }

    private EntityIdentity identity(String key, String value, boolean primary, int priority) {
        return EntityIdentity.builder()
                .identityKey(key)
                .identityValue(value)
                .normalizedValue(value)
                .primaryIdentity(primary)
                .priority(priority)
                .build();
    }
}
