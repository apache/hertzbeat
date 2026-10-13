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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.springframework.boot.DefaultApplicationArguments;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the local demo topology relation seed that prevents node-only demo graphs.
 */
@ExtendWith(MockitoExtension.class)
class LocalTopologyDemoRelationSeederTest {

    @Mock
    private ObserveEntityDao observeEntityDao;
    @Mock
    private EntityRelationDao entityRelationDao;
    @Mock
    private EntityIdentityDao entityIdentityDao;

    @Test
    void seedsCheckoutPaymentAndOrdersRelationsWhenDemoEntitiesExistWithoutEdges() {
        LocalTopologyDemoRelationSeeder seeder = new LocalTopologyDemoRelationSeeder(
                observeEntityDao, entityRelationDao, entityIdentityDao);
        ObserveEntity checkout = entity(10L, "service", "Checkout API");
        ObserveEntity payment = entity(20L, "service", "Payment API");
        ObserveEntity orders = entity(30L, "database", "Orders DB");
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, "service", "commerce", "Checkout API"))
                .thenReturn(Optional.of(checkout));
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, "service", "commerce", "Payment API"))
                .thenReturn(Optional.of(payment));
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, "database", "commerce", "Orders DB"))
                .thenReturn(Optional.of(orders));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(10L, 10L)).thenReturn(List.of());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(20L, 20L)).thenReturn(List.of());

        seeder.seedDemoRelations();

        ArgumentCaptor<List<EntityRelation>> rowsCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityRelationDao).saveAll(rowsCaptor.capture());
        List<EntityRelation> rows = rowsCaptor.getValue();
        assertEquals(2, rows.size());
        EntityRelation checkoutToPayment = rows.get(0);
        assertEquals(10L, checkoutToPayment.getSourceEntityId());
        assertEquals(20L, checkoutToPayment.getTargetEntityId());
        assertEquals("service:commerce/Payment API", checkoutToPayment.getTargetRef());
        assertEquals("trace-call", checkoutToPayment.getRelationType());
        assertEquals("otlp-trace-call", checkoutToPayment.getRelationSource());
        assertEquals("local-topology-demo-seed", checkoutToPayment.getAttributes().get("seed"));
        EntityRelation paymentToOrders = rows.get(1);
        assertEquals(20L, paymentToOrders.getSourceEntityId());
        assertEquals(30L, paymentToOrders.getTargetEntityId());
        assertEquals("database:commerce/Orders DB", paymentToOrders.getTargetRef());
        assertEquals("depends_on", paymentToOrders.getRelationType());
        assertEquals("cmdb-manual-label", paymentToOrders.getRelationSource());
    }

    @Test
    void doesNotSeedWhenRelationsAlreadyExist() {
        LocalTopologyDemoRelationSeeder seeder = new LocalTopologyDemoRelationSeeder(
                observeEntityDao, entityRelationDao, entityIdentityDao);
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, "service", "commerce", "Checkout API"))
                .thenReturn(Optional.of(entity(10L, "service", "Checkout API")));
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, "service", "commerce", "Payment API"))
                .thenReturn(Optional.of(entity(20L, "service", "Payment API")));
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, "database", "commerce", "Orders DB"))
                .thenReturn(Optional.of(entity(30L, "database", "Orders DB")));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(10L, 10L)).thenReturn(List.of(
                EntityRelation.builder().sourceEntityId(10L).targetEntityId(20L).relationType("trace-call").build()));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(20L, 20L)).thenReturn(List.of(
                EntityRelation.builder().sourceEntityId(20L).targetEntityId(30L).relationType("depends_on").build()));

        seeder.seedDemoRelations();

        verify(entityRelationDao, never()).saveAll(eq(List.of()));
        verify(entityRelationDao, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void startupDoesNotSeedLargeMixedScaleProofByDefault() {
        LocalTopologyDemoRelationSeeder seeder = new LocalTopologyDemoRelationSeeder(
                observeEntityDao, entityRelationDao, entityIdentityDao);

        seeder.run(new DefaultApplicationArguments());

        verify(observeEntityDao, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(entityIdentityDao, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void startupSeedsLargeMixedScaleProofOnlyWhenExplicitlyEnabled() {
        LocalTopologyDemoRelationSeeder seeder = new LocalTopologyDemoRelationSeeder(
                observeEntityDao, entityRelationDao, entityIdentityDao);
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Optional.empty());

        seeder.run(new DefaultApplicationArguments("--hertzbeat.topology.local-scale-proof-seed=true"));

        ArgumentCaptor<List<ObserveEntity>> entitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(observeEntityDao).saveAll(entitiesCaptor.capture());
        assertEquals(1993, entitiesCaptor.getValue().size());
        ArgumentCaptor<List<EntityRelation>> relationsCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityRelationDao).saveAll(relationsCaptor.capture());
        assertEquals(1992, relationsCaptor.getValue().size());
    }

    @Test
    void seedsMixedScaleProofEntitiesAndServiceNameIdentitiesForEveryGreptimeService() {
        LocalTopologyDemoRelationSeeder seeder = new LocalTopologyDemoRelationSeeder(
                observeEntityDao, entityRelationDao, entityIdentityDao);
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                eq(AuthTokenScopes.DEFAULT_WORKSPACE_ID), eq("service"), eq("scale-mix"), anyString()))
                .thenReturn(Optional.empty());

        seeder.seedMixedScaleProofEntities();

        ArgumentCaptor<List<ObserveEntity>> entitiesCaptor = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<List<EntityRelation>> relationsCaptor = ArgumentCaptor.forClass(List.class);
        verify(observeEntityDao).saveAll(entitiesCaptor.capture());
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        verify(entityRelationDao).saveAll(relationsCaptor.capture());
        List<ObserveEntity> entities = entitiesCaptor.getValue();
        List<EntityIdentity> identities = identitiesCaptor.getValue();
        List<EntityRelation> relations = relationsCaptor.getValue();
        assertEquals(1993, entities.size());
        assertEquals(1993, identities.size());
        assertEquals(1992, relations.size());
        assertEquals("hb-mix-1780329856-edge-gateway", entities.getFirst().getName());
        assertEquals("scale-mix", entities.getFirst().getNamespace());
        assertEquals("prod", entities.getFirst().getEnvironment());
        assertEquals("local-scale-proof", entities.getFirst().getSource());
        assertEquals("service", entities.getFirst().getType());
        assertEquals("hb-mix-1780329856-edge-gateway", identities.getFirst().getIdentityValue());
        assertEquals("service.name", identities.getFirst().getIdentityKey());
        assertEquals("otel_resource", identities.getFirst().getIdentityType());
        assertEquals("hb-mix-1780329856-svc-11-164", entities.getLast().getName());
        assertEquals("local-scale-proof", entities.getLast().getSource());
        assertEquals("hb-mix-1780329856-svc-11-164", identities.getLast().getIdentityValue());
        EntityRelation gatewayToDomain = relations.getFirst();
        assertEquals(646566130000000L, gatewayToDomain.getSourceEntityId());
        assertEquals(646566130000001L, gatewayToDomain.getTargetEntityId());
        assertEquals("trace-call", gatewayToDomain.getRelationType());
        assertEquals("otlp-trace-call", gatewayToDomain.getRelationSource());
        assertEquals("local-topology-demo-seed", gatewayToDomain.getAttributes().get("seed"));
        EntityRelation lastDomainToService = relations.getLast();
        assertEquals(646566130000012L, lastDomainToService.getSourceEntityId());
        assertEquals(646566130001992L, lastDomainToService.getTargetEntityId());
        assertEquals("trace-call", lastDomainToService.getRelationType());
    }

    @Test
    void backfillsMixedScaleProofServiceNameIdentityWhenEntityAlreadyExists() {
        LocalTopologyDemoRelationSeeder seeder = new LocalTopologyDemoRelationSeeder(
                observeEntityDao, entityRelationDao, entityIdentityDao);
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                eq(AuthTokenScopes.DEFAULT_WORKSPACE_ID), eq("service"), eq("scale-mix"), anyString()))
                .thenAnswer(invocation -> {
                    String serviceName = invocation.getArgument(3, String.class);
                    return Optional.of(ObserveEntity.builder()
                            .id(646566130000000L + Math.abs(serviceName.hashCode()))
                            .workspaceId(AuthTokenScopes.DEFAULT_WORKSPACE_ID)
                            .type("service")
                            .namespace("scale-mix")
                            .name(serviceName)
                            .environment("prod")
                            .build());
                });
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(anyLong()))
                .thenReturn(List.of());

        seeder.seedMixedScaleProofEntities();

        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(observeEntityDao, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> identities = identitiesCaptor.getValue();
        EntityIdentity gatewayIdentity = identities.stream()
                .filter(identity -> "hb-mix-1780329856-edge-gateway".equals(identity.getIdentityValue()))
                .findFirst()
                .orElseThrow();
        assertEquals("service.name", gatewayIdentity.getIdentityKey());
        assertEquals("hb-mix-1780329856-edge-gateway", gatewayIdentity.getIdentityValue());
        assertEquals("hb-mix-1780329856-edge-gateway", gatewayIdentity.getNormalizedValue());
        assertEquals(1993, identities.size());
        ArgumentCaptor<List<EntityRelation>> relationsCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityRelationDao).saveAll(relationsCaptor.capture());
        assertEquals(1992, relationsCaptor.getValue().size());
    }

    private ObserveEntity entity(Long id, String type, String name) {
        return ObserveEntity.builder()
                .id(id)
                .workspaceId(AuthTokenScopes.DEFAULT_WORKSPACE_ID)
                .type(type)
                .namespace("commerce")
                .name(name)
                .environment("prod")
                .build();
    }
}
