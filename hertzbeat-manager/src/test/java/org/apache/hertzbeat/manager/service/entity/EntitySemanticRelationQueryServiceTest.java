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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository.EntityKey;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository.Relationship;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository.RelationshipQueryResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

@ExtendWith(MockitoExtension.class)
class EntitySemanticRelationQueryServiceTest {

    private static final long NOW = 1_770_000_000_000L;

    @Mock
    private ObjectProvider<SemanticGraphQueryRepository> repositoryProvider;

    @Mock
    private SemanticGraphQueryRepository repository;

    @Mock
    private EntityIdentityQueryService entityIdentityQueryService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    private EntitySemanticRelationQueryService service;

    @BeforeEach
    void setUp() {
        service = new EntitySemanticRelationQueryService(
                repositoryProvider,
                entityIdentityQueryService,
                entityWorkspaceAccessService,
                Clock.fixed(Instant.ofEpochMilli(NOW), ZoneOffset.UTC));
    }

    @Test
    void resolvesObservedEndpointsToAuthoritativeAccessibleEntities() {
        ObserveEntity checkout = entity(10L, "checkout");
        ObserveEntity payment = entity(20L, "payment");
        EntityIdentity checkoutIdentity = identity(10L, "checkout");
        EntityIdentity paymentIdentity = identity(20L, "payment");
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(entityIdentityQueryService.findIdentities(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, Set.of(10L))).thenReturn(List.of(checkoutIdentity));
        when(repository.queryRelationships(any())).thenReturn(RelationshipQueryResult.available(List.of(
                new Relationship(
                        Instant.ofEpochMilli(NOW - 60_000L),
                        new EntityKey("service", "checkout"),
                        new EntityKey("service", "payment"),
                        "calls", "trace", 1.0D, 12L, 1L, 3.5D, 12L))));
        when(entityIdentityQueryService.findMatchingIdentities(
                eq(AuthTokenScopes.DEFAULT_WORKSPACE_ID), eq(Set.of("job", "service.name")), eq(Set.of("payment")),
                eq(1_025)))
                .thenReturn(List.of(paymentIdentity));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIds(
                Set.of(20L), AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(List.of(payment));

        SemanticRelationReadModel result = service.findRelations(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, List.of(checkout), null, null);

        assertEquals(Set.of(10L, 20L), result.entityById().keySet());
        assertEquals(1, result.relations().size());
        assertEquals(10L, result.relations().getFirst().getSourceEntityId());
        assertEquals(20L, result.relations().getFirst().getTargetEntityId());
        assertEquals("greptime-semantic", result.relations().getFirst().getRelationSource());
        assertEquals("trace", result.relations().getFirst().getAttributes().get("provenance"));
    }

    @Test
    void skipsSemanticQueryWhenRequestedWindowExceedsOneHour() {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);

        SemanticRelationReadModel result = service.findRelations(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID,
                List.of(entity(10L, "checkout")),
                NOW - 3_600_001L,
                NOW);

        assertTrue(result.relations().isEmpty());
        verify(repository, never()).queryRelationships(any());
    }

    @Test
    void neverMapsAmbiguousSemanticIdentityToAnEntity() {
        ObserveEntity checkoutA = entity(10L, "checkout");
        ObserveEntity checkoutB = entity(11L, "checkout");
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(entityIdentityQueryService.findIdentities(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, Set.of(10L, 11L)))
                .thenReturn(List.of(identity(10L, "checkout"), identity(11L, "checkout")));

        SemanticRelationReadModel result = service.findRelations(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, List.of(checkoutA, checkoutB), null, null);

        assertTrue(result.relations().isEmpty());
        verify(repository, never()).queryRelationships(any());
    }

    @Test
    void excludesAmbiguousDiscoveredEntitiesFromOtherwiseValidGraph() {
        ObserveEntity checkout = entity(10L, "checkout");
        ObserveEntity payment = entity(20L, "payment");
        ObserveEntity sharedA = entity(30L, "shared-a");
        ObserveEntity sharedB = entity(40L, "shared-b");
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(entityIdentityQueryService.findIdentities(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, Set.of(10L)))
                .thenReturn(List.of(identity(10L, "checkout")));
        when(repository.queryRelationships(any())).thenReturn(RelationshipQueryResult.available(List.of(
                relationship("checkout", "payment"),
                relationship("checkout", "shared"))));
        when(entityIdentityQueryService.findMatchingIdentities(
                eq(AuthTokenScopes.DEFAULT_WORKSPACE_ID),
                eq(Set.of("job", "service.name")),
                eq(Set.of("payment", "shared")),
                eq(1_025)))
                .thenReturn(List.of(
                        identity(20L, "payment"),
                        identity(30L, "shared"),
                        identity(40L, "shared")));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIds(
                Set.of(20L, 30L, 40L), AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn(List.of(payment, sharedA, sharedB));

        SemanticRelationReadModel result = service.findRelations(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, List.of(checkout), null, null);

        assertEquals(Set.of(10L, 20L), result.entityById().keySet());
        assertEquals(1, result.relations().size());
        assertEquals(20L, result.relations().getFirst().getTargetEntityId());
    }

    @Test
    void rejectsSaturatedIdentityCandidateLookupInsteadOfAssumingUniqueness() {
        ObserveEntity checkout = entity(10L, "checkout");
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(entityIdentityQueryService.findIdentities(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, Set.of(10L)))
                .thenReturn(List.of(identity(10L, "checkout")));
        when(repository.queryRelationships(any())).thenReturn(RelationshipQueryResult.available(List.of(
                relationship("checkout", "shared"))));
        when(entityIdentityQueryService.findMatchingIdentities(
                eq(AuthTokenScopes.DEFAULT_WORKSPACE_ID),
                eq(Set.of("job", "service.name")),
                eq(Set.of("shared")),
                eq(1_025)))
                .thenReturn(IntStream.rangeClosed(1, 1_025)
                        .mapToObj(index -> identity(1_000L + index, "shared"))
                        .toList());

        SemanticRelationReadModel result = service.findRelations(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, List.of(checkout), null, null);

        assertTrue(result.relations().isEmpty());
        assertTrue(result.entityById().isEmpty());
        verify(entityWorkspaceAccessService, never()).findAccessibleEntitiesByIds(any(), any());
    }

    @Test
    void springContextWiresTheProductionConstructor() {
        new ApplicationContextRunner()
                .withBean(SemanticGraphQueryRepository.class, () -> repository)
                .withBean(EntityIdentityQueryService.class, () -> entityIdentityQueryService)
                .withBean(EntityWorkspaceAccessService.class, () -> entityWorkspaceAccessService)
                .withBean(EntitySemanticRelationQueryService.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(EntitySemanticRelationQueryService.class);
                });
    }

    private ObserveEntity entity(long id, String name) {
        return ObserveEntity.builder()
                .id(id)
                .type("service")
                .name(name)
                .status("healthy")
                .workspaceId(AuthTokenScopes.DEFAULT_WORKSPACE_ID)
                .build();
    }

    private EntityIdentity identity(long entityId, String value) {
        return EntityIdentity.builder()
                .entityId(entityId)
                .identityType("otel_resource")
                .identityKey("service.name")
                .identityValue(value)
                .normalizedValue(value)
                .priority(100)
                .primaryIdentity(true)
                .build();
    }

    private Relationship relationship(String source, String target) {
        return new Relationship(
                Instant.ofEpochMilli(NOW - 60_000L),
                new EntityKey("service", source),
                new EntityKey("service", target),
                "calls", "trace", 1.0D, 12L, 1L, 3.5D, 12L);
    }
}
