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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity identity write-model component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityIdentityWriteModelServiceTest {

    private EntityIdentityWriteModelService identityWriteModelService;

    @Mock
    private EntityIdentityDao entityIdentityDao;

    @Mock
    private EntityIdentityResolutionService entityIdentityResolutionService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @BeforeEach
    void setUp() {
        identityWriteModelService =
                new EntityIdentityWriteModelService(entityIdentityDao, entityIdentityResolutionService,
                        entityWorkspaceAccessService);
        when(entityIdentityResolutionService.normalizeIdentityValue(anyString(), anyString()))
                .thenAnswer(invocation -> invocation.getArgument(1, String.class).trim().toLowerCase(Locale.ROOT));
        when(entityIdentityResolutionService.defaultIdentityPriority(anyString())).thenReturn(40);
        lenient().when(entityIdentityResolutionService.defaultIdentityPriority("service.name")).thenReturn(90);
        lenient().when(entityIdentityResolutionService.defaultIdentityPriority("service.namespace")).thenReturn(30);
        lenient().when(entityIdentityResolutionService.defaultIdentityPriority("deployment.environment.name")).thenReturn(20);
        lenient().when(entityIdentityResolutionService.defaultIdentityPriority("messaging.destination.name")).thenReturn(120);
        lenient().when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(anySet(), anySet()))
                .thenReturn(Collections.emptyList());
    }

    @Test
    void replaceIdentitiesDeletesFlushesDedupesAndCanonicalizesDerivedRows() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(7L)
                .type("service")
                .name("checkout-api")
                .namespace("payments")
                .environment("prod")
                .build();
        EntityIdentity derivedServiceName = EntityIdentity.builder()
                .identityType("otel_resource")
                .identityKey("service.name")
                .identityValue("shadow-name")
                .primaryIdentity(true)
                .build();
        EntityIdentity duplicateServiceName = EntityIdentity.builder()
                .identityType("manual")
                .identityKey("service.name")
                .identityValue(" checkout-api ")
                .priority(10)
                .primaryIdentity(false)
                .build();
        EntityIdentity namespace = EntityIdentity.builder()
                .identityKey("service.namespace")
                .identityValue("payments")
                .build();
        EntityIdentity invalid = EntityIdentity.builder()
                .identityKey(" ")
                .identityValue("ignored")
                .build();

        identityWriteModelService.replaceIdentities(
                entity, List.of(derivedServiceName, duplicateServiceName, namespace, invalid));

        InOrder inOrder = inOrder(entityIdentityDao);
        inOrder.verify(entityIdentityDao).deleteAllByEntityId(7L);
        inOrder.verify(entityIdentityDao).flush();
        inOrder.verify(entityIdentityDao).findAllByIdentityKeyInAndNormalizedValueIn(
                Set.of("service.name"), Set.of("checkout-api"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        inOrder.verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> rows = identitiesCaptor.getValue();
        assertEquals(2, rows.size());

        EntityIdentity serviceName = rows.getFirst();
        assertEquals(7L, serviceName.getEntityId());
        assertEquals("otel_resource", serviceName.getIdentityType());
        assertEquals("service.name", serviceName.getIdentityKey());
        assertEquals("checkout-api", serviceName.getIdentityValue());
        assertEquals("checkout-api", serviceName.getNormalizedValue());
        assertEquals(90, serviceName.getPriority());
        assertTrue(serviceName.isPrimaryIdentity());

        EntityIdentity namespaceRow = rows.get(1);
        assertEquals("manual", namespaceRow.getIdentityType());
        assertEquals("service.namespace", namespaceRow.getIdentityKey());
        assertEquals("payments", namespaceRow.getIdentityValue());
        assertEquals(30, namespaceRow.getPriority());
    }

    @Test
    void replaceIdentitiesKeepsOtelServiceNameAlignedWithEntityNameNotDisplayName() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(4200L)
                .type("service")
                .name("checkout")
                .displayName("Checkout API")
                .namespace("hertzbeat-demo")
                .environment("demo")
                .build();
        EntityIdentity serviceName = EntityIdentity.builder()
                .identityType("otel_resource")
                .identityKey("service.name")
                .identityValue("checkout")
                .primaryIdentity(true)
                .build();
        EntityIdentity namespace = EntityIdentity.builder()
                .identityType("otel_resource")
                .identityKey("service.namespace")
                .identityValue("hertzbeat-demo")
                .build();
        EntityIdentity environment = EntityIdentity.builder()
                .identityType("otel_resource")
                .identityKey("deployment.environment.name")
                .identityValue("demo")
                .build();

        identityWriteModelService.replaceIdentities(entity, List.of(serviceName, namespace, environment));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> rows = identitiesCaptor.getValue();
        assertEquals(3, rows.size());

        EntityIdentity serviceNameRow = rows.getFirst();
        assertEquals(4200L, serviceNameRow.getEntityId());
        assertEquals("service.name", serviceNameRow.getIdentityKey());
        assertEquals("checkout", serviceNameRow.getIdentityValue());
        assertEquals("checkout", serviceNameRow.getNormalizedValue());
        assertTrue(serviceNameRow.isPrimaryIdentity());
    }

    @Test
    void replaceIdentitiesBuildsDefaultIdentityRowsWhenInputIsEmpty() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(8L)
                .type("queue")
                .name("orders-events")
                .displayName("Orders Events")
                .environment("prod")
                .build();

        identityWriteModelService.replaceIdentities(entity, Collections.emptyList());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> rows = identitiesCaptor.getValue();
        assertEquals(2, rows.size());

        EntityIdentity primaryIdentity = rows.getFirst();
        assertEquals("messaging.destination.name", primaryIdentity.getIdentityKey());
        assertEquals("orders-events", primaryIdentity.getIdentityValue());
        assertEquals("orders-events", primaryIdentity.getNormalizedValue());
        assertEquals(120, primaryIdentity.getPriority());
        assertTrue(primaryIdentity.isPrimaryIdentity());

        EntityIdentity environmentIdentity = rows.get(1);
        assertEquals("deployment.environment.name", environmentIdentity.getIdentityKey());
        assertEquals("prod", environmentIdentity.getIdentityValue());
        assertEquals(20, environmentIdentity.getPriority());
    }

    @Test
    void replaceIdentitiesRejectsAccessiblePrimaryIdentityCollision() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(9L)
                .type("service")
                .name("catalog-b")
                .workspaceId("team-a")
                .build();
        EntityIdentity sharedPrimary = EntityIdentity.builder()
                .identityType("manual")
                .identityKey("service.name")
                .identityValue("shared-checkout")
                .primaryIdentity(true)
                .build();
        EntityIdentity existing = EntityIdentity.builder()
                .entityId(8L)
                .identityKey("service.name")
                .identityValue("shared-checkout")
                .normalizedValue("shared-checkout")
                .primaryIdentity(true)
                .build();
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(
                Set.of("service.name"), Set.of("shared-checkout")))
                .thenReturn(List.of(existing));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(Set.of(8L)))
                .thenReturn(List.of(ObserveEntity.builder().id(8L).name("catalog-a").build()));

        IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class,
                () -> identityWriteModelService.replaceIdentities(entity, List.of(sharedPrimary)));

        assertEquals("Entity primary identity already exists: service.name=shared-checkout.", thrown.getMessage());
    }

    @Test
    void replaceIdentitiesAllowsSharedNonPrimaryContextIdentities() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(10L)
                .type("service")
                .name("catalog-c")
                .workspaceId("team-a")
                .build();
        EntityIdentity primary = EntityIdentity.builder()
                .identityType("manual")
                .identityKey("service.name")
                .identityValue("catalog-c")
                .primaryIdentity(true)
                .build();
        EntityIdentity sharedNamespace = EntityIdentity.builder()
                .identityType("manual")
                .identityKey("service.namespace")
                .identityValue("shared-namespace")
                .primaryIdentity(false)
                .build();
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(
                Set.of("service.name"), Set.of("catalog-c")))
                .thenReturn(Collections.emptyList());

        identityWriteModelService.replaceIdentities(entity, List.of(primary, sharedNamespace));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> rows = identitiesCaptor.getValue();
        assertEquals(2, rows.size());
        assertEquals("service.namespace", rows.get(1).getIdentityKey());
        assertEquals("shared-namespace", rows.get(1).getIdentityValue());
    }
}
