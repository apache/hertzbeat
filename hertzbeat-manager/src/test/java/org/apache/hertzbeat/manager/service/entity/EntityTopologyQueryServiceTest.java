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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityTopologyGraphInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Contract for API-backed topology read-model assembly.
 */
@ExtendWith(MockitoExtension.class)
class EntityTopologyQueryServiceTest {

    @InjectMocks
    private EntityTopologyQueryService entityTopologyQueryService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Mock
    private EntityRelationQueryService entityRelationQueryService;

    @Mock
    private EntityMonitorBindQueryService entityMonitorBindQueryService;

    @Mock
    private EntityMonitorQueryService entityMonitorQueryService;

    @Mock
    private TraceCallTopologyQueryService traceCallTopologyQueryService;

    @Mock
    private EntityActivityReadModelService entityActivityReadModelService;

    @Test
    void filtersFocusedTopologyToExplicitMonitorOwnershipSourceKind() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");
        EntityMonitorBind monitorBind = EntityMonitorBind.builder()
                .id(501L)
                .entityId(10L)
                .monitorId(701L)
                .bindSource("service.name")
                .status("active")
                .score(97)
                .build();
        Monitor monitor = Monitor.builder()
                .id(701L)
                .name("checkout-http")
                .app("website")
                .status((byte) 1)
                .build();

        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(10L))
                .thenReturn(Optional.of(checkout));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.contains(10L) && !ids.contains(20L)))).thenReturn(List.of(checkout));
        when(entityMonitorBindQueryService.findMonitorBinds(10L)).thenReturn(List.of(monitorBind));
        when(entityMonitorQueryService.findMonitorsByIds(Set.of(701L))).thenReturn(List.of(monitor));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                10L, 1, "prod", "monitor-ownership");

        assertTrue(graph.getSourceKinds().containsAll(List.of("monitor-ownership", "monitor-bind")));
        assertFalse(graph.getEdges().stream().anyMatch(edge -> Long.valueOf(101L).equals(edge.getRelationId())));
        assertTrue(graph.getEdges().stream().anyMatch(edge ->
                Long.valueOf(501L).equals(edge.getRelationId())
                        && "10".equals(edge.getSourceNodeId())
                        && "monitor:701".equals(edge.getTargetNodeId())
                        && "monitor-bind".equals(edge.getRelationSource())));
        verify(entityRelationQueryService, never()).findEntityRelations(10L);
        verify(traceCallTopologyQueryService, never()).findTraceCallEdges(any(), any(), any(), any(), any());
    }

    @Test
    void includesImpactTimelineFromRelationMonitorBindAndEntityActivities() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");
        ObserveEntity payment = entity(20L, "service", "payment-api", "commerce", "prod", "healthy");
        EntityRelation relation = relation(101L, 10L, 20L, "depends_on", "manual", 92);
        relation.setGmtUpdate(LocalDateTime.of(2026, 5, 19, 11, 10));
        EntityMonitorBind monitorBind = EntityMonitorBind.builder()
                .id(501L)
                .entityId(10L)
                .monitorId(701L)
                .bindSource("service.name")
                .status("active")
                .score(97)
                .gmtUpdate(LocalDateTime.of(2026, 5, 19, 11, 5))
                .build();
        Monitor monitor = Monitor.builder()
                .id(701L)
                .name("checkout-http")
                .app("website")
                .status((byte) 1)
                .build();
        EntityDefinitionActivity activity = EntityDefinitionActivity.builder()
                .id(901L)
                .entityId(10L)
                .activityType("definition_update")
                .summary("Definition updated")
                .detail("owner changed")
                .creator("alice")
                .gmtCreate(LocalDateTime.of(2026, 5, 19, 11, 12))
                .build();

        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(10L))
                .thenReturn(Optional.of(checkout));
        when(entityRelationQueryService.findEntityRelations(10L)).thenReturn(List.of(relation));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(List.of(10L, 20L))))).thenReturn(List.of(checkout, payment));
        when(entityMonitorBindQueryService.findMonitorBinds(10L)).thenReturn(List.of(monitorBind));
        when(entityMonitorBindQueryService.findMonitorBinds(20L)).thenReturn(List.of());
        when(entityMonitorQueryService.findMonitorsByIds(Set.of(701L))).thenReturn(List.of(monitor));
        when(entityActivityReadModelService.findLatestDefinitionActivities(List.of(10L, 20L)))
                .thenReturn(Map.of(10L, activity));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                10L, 1, "prod", null);

        assertEquals(List.of("entity-definition", "relation-updated", "monitor-bind-updated"),
                graph.getImpactTimeline().stream().map(EntityTopologyGraphInfo.TimelineEvent::getEventType).toList());
        assertEquals("Definition updated", graph.getImpactTimeline().getFirst().getTitle());
        assertEquals("owner changed", graph.getImpactTimeline().getFirst().getDetail());
        assertEquals("alice", graph.getImpactTimeline().getFirst().getActor());
        assertEquals("cmdb-manual-label", graph.getImpactTimeline().getFirst().getSourceKind());
        assertEquals("101", graph.getImpactTimeline().get(1).getEdgeId());
        assertEquals("monitor-bind:501", graph.getImpactTimeline().get(2).getEdgeId());
    }

    @Test
    void buildsDefaultTopologyFromAccessibleEntityCatalogWhenNoFocusEntityIsProvided() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");
        ObserveEntity payment = entity(20L, "service", "payment-api", "commerce", "prod", "healthy");
        EntityRelation relation = relation(101L, 10L, 20L, "calls", "trace", 88);
        EntityMonitorBind monitorBind = EntityMonitorBind.builder()
                .id(501L)
                .entityId(10L)
                .monitorId(701L)
                .bindSource("service.name")
                .status("active")
                .score(97)
                .build();
        Monitor monitor = Monitor.builder()
                .id(701L)
                .name("checkout-http")
                .app("website")
                .status((byte) 1)
                .build();

        lenient().when(entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(any(Pageable.class)))
                .thenReturn(List.of(checkout, payment));
        lenient().when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(List.of(10L, 20L))))).thenReturn(List.of(checkout, payment));
        lenient().when(entityRelationQueryService.findEntityRelations(10L)).thenReturn(List.of(relation));
        lenient().when(entityRelationQueryService.findEntityRelations(20L)).thenReturn(List.of());
        lenient().when(entityMonitorBindQueryService.findMonitorBinds(10L)).thenReturn(List.of(monitorBind));
        lenient().when(entityMonitorBindQueryService.findMonitorBinds(20L)).thenReturn(List.of());
        lenient().when(entityMonitorQueryService.findMonitorsByIds(Set.of(701L))).thenReturn(List.of(monitor));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                null, 1, "prod", null);

        assertTrue(graph.isApiBacked());
        assertNull(graph.getFocusEntityId());
        assertEquals(List.of("entity-relation", "monitor-bind"), graph.getSourceKinds());
        assertTrue(graph.getNodes().stream().anyMatch(node ->
                "10".equals(node.getId()) && "checkout-api".equals(node.getEntityName()) && !node.isFocus()));
        assertTrue(graph.getNodes().stream().anyMatch(node ->
                "monitor:701".equals(node.getId()) && node.getEvidenceBadges().contains("monitor-bind")));
        assertTrue(graph.getEdges().stream().anyMatch(edge ->
                Long.valueOf(101L).equals(edge.getRelationId())
                        && "10".equals(edge.getSourceNodeId())
                        && "20".equals(edge.getTargetNodeId())
                        && "calls".equals(edge.getRelationType())));
        assertTrue(graph.getEdges().stream().anyMatch(edge ->
                Long.valueOf(501L).equals(edge.getRelationId())
                        && "10".equals(edge.getSourceNodeId())
                        && "monitor:701".equals(edge.getTargetNodeId())));
        verify(entityWorkspaceAccessService).findAccessibleEntitiesForRequestWorkspace(argThat((Pageable pageable) ->
                pageable != null
                        && pageable.isPaged()
                        && pageable.getPageSize() == 64
                        && pageable.getSort().getOrderFor("gmtUpdate") != null
                        && pageable.getSort().getOrderFor("id") != null));
        verify(entityWorkspaceAccessService, never()).findAccessibleEntitiesForRequestWorkspace(any(Sort.class));
    }

    @Test
    void queriesDefaultTraceOverviewWithoutSeedScopeSoLargeGraphsAreNotTruncated() {
        List<ObserveEntity> seeds = new java.util.ArrayList<>();
        seeds.add(entity(1L, "service", "hb-mix-1780329856-edge-gateway", "scale-mix", "prod", "unknown"));
        for (int index = 0; index < 12; index++) {
            seeds.add(entity(100L + index, "service",
                    "hb-mix-1780329856-domain-%02d".formatted(index), "scale-mix", "prod", "unknown"));
        }
        TraceCallTopologyEdgeInfo traceEdge = new TraceCallTopologyEdgeInfo(
                "trace-call:100:200:trace-domain-00",
                100L,
                200L,
                "trace-domain-00",
                "span-domain-00",
                "CALL hb-mix-1780329856-svc-00-000",
                "2026-05-20T03:01:00Z",
                "2026-05-20T03:08:00Z",
                "ok",
                100,
                new TraceCallTopologyEdgeInfo.RedMetrics(1D / 3600D, 1L, 0D, 0L, 42D, 21D)
        );
        ObserveEntity leaf = entity(200L, "service", "hb-mix-1780329856-svc-00-000",
                "scale-mix", "prod", "healthy");

        when(entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(any(Pageable.class)))
                .thenReturn(seeds);
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.contains(1L) && ids.contains(100L) && ids.contains(111L))))
                .thenReturn(seeds);
        when(traceCallTopologyQueryService.findTraceCallEdgesForOverview(
                eq("prod"), eq(1710000000000L), eq(1710003600000L), eq(true))).thenReturn(
                        new TraceCallTopologyReadModel(Map.of(200L, leaf), List.of(traceEdge)));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                null, 2, "prod", "otlp-trace-call", 1710000000000L, 1710003600000L);

        assertEquals(1, graph.getEdges().size());
        assertTrue(graph.getSourceKinds().contains("otlp-trace-call"));
        assertTrue(graph.getNodes().stream().anyMatch(node ->
                "hb-mix-1780329856-svc-00-000".equals(node.getEntityName())));
        verify(entityWorkspaceAccessService).findAccessibleEntitiesForRequestWorkspace(argThat((Pageable pageable) ->
                pageable != null
                        && pageable.isPaged()
                        && pageable.getPageSize() == 64
                        && pageable.getSort().getOrderFor("gmtUpdate") != null
                        && pageable.getSort().getOrderFor("id") != null));
        verify(traceCallTopologyQueryService, never()).findTraceCallEdges(any(), any(), any(), any(), any());
    }

    @Test
    void leavesSourceKindsEmptyWhenDefaultTopologyHasOnlyIsolatedNodes() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");
        ObserveEntity payment = entity(20L, "service", "payment-api", "commerce", "prod", "healthy");

        when(entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(any(Pageable.class)))
                .thenReturn(List.of(checkout, payment));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(List.of(10L, 20L))))).thenReturn(List.of(checkout, payment));
        when(entityRelationQueryService.findEntityRelations(10L)).thenReturn(List.of());
        when(entityRelationQueryService.findEntityRelations(20L)).thenReturn(List.of());

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                null, 1, "prod", "entity-relation");

        assertEquals(List.of(), graph.getSourceKinds());
        assertEquals(List.of(10L, 20L),
                graph.getNodes().stream().map(EntityTopologyGraphInfo.Node::getEntityId).toList());
        assertEquals(List.of(), graph.getEdges());
    }

    @Test
    void buildsFocusedEntityTopologyFromPersistedRelations() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");
        ObserveEntity orders = entity(20L, "database", "orders-db", "commerce", "prod", "healthy");
        ObserveEntity cache = entity(30L, "middleware", "redis", "commerce", "prod", "critical");
        EntityRelation ordersRelation = relation(101L, 10L, 20L, "depends_on", "manual", 92);
        EntityRelation cacheRelation = relation(102L, 30L, 10L, "monitors", "monitor_bind", 84);

        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(10L))
                .thenReturn(Optional.of(checkout));
        when(entityRelationQueryService.findEntityRelations(10L)).thenReturn(List.of(ordersRelation, cacheRelation));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(List.of(10L, 20L, 30L))))).thenReturn(List.of(checkout, orders, cache));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                10L, 1, "prod", null);

        assertTrue(graph.isApiBacked());
        assertEquals(10L, graph.getFocusEntityId());
        assertEquals(1, graph.getDepth());
        assertEquals(List.of("entity-relation"), graph.getSourceKinds());
        assertEquals(List.of(10L, 20L, 30L),
                graph.getNodes().stream().map(EntityTopologyGraphInfo.Node::getEntityId).toList());
        assertEquals(2, graph.getEdges().size());
        assertTrue(graph.getNodes().stream().filter(EntityTopologyGraphInfo.Node::isFocus).anyMatch(node ->
                Long.valueOf(10L).equals(node.getEntityId())
                        && "checkout-api".equals(node.getEntityName())
                        && "warning".equals(node.getHealth())));
        assertTrue(graph.getEdges().stream().anyMatch(edge ->
                Long.valueOf(101L).equals(edge.getRelationId())
                        && Long.valueOf(10L).equals(edge.getSourceEntityId())
                        && Long.valueOf(20L).equals(edge.getTargetEntityId())
                        && "depends_on".equals(edge.getRelationType())
                        && edge.getEvidenceBadges().contains("manual")));
        verify(entityRelationQueryService).findEntityRelations(10L);
    }

    @Test
    void appliesRelationTypeAndEdgePaginationToFocusedTopology() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");
        ObserveEntity orders = entity(20L, "database", "orders-db", "commerce", "prod", "healthy");
        ObserveEntity payment = entity(30L, "service", "payment-api", "commerce", "prod", "healthy");
        EntityRelation ordersRelation = relation(101L, 10L, 20L, "depends_on", "manual", 92);
        EntityRelation paymentRelation = relation(102L, 10L, 30L, "depends_on", "manual", 91);
        EntityRelation monitorRelation = relation(103L, 30L, 10L, "monitors", "monitor_bind", 84);

        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(10L))
                .thenReturn(Optional.of(checkout));
        when(entityRelationQueryService.findEntityRelations(10L))
                .thenReturn(List.of(ordersRelation, paymentRelation, monitorRelation));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.containsAll(List.of(10L, 20L, 30L)))))
                .thenReturn(List.of(checkout, orders, payment));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                10L, 1, "prod", "entity-relation", null, null,
                "depends_on", true, 0, 1);

        assertEquals(1, graph.getEdges().size());
        assertEquals(101L, graph.getEdges().getFirst().getRelationId());
        assertEquals("depends_on", graph.getEdges().getFirst().getRelationType());
        assertEquals(List.of(10L, 20L),
                graph.getNodes().stream().map(EntityTopologyGraphInfo.Node::getEntityId).toList());
    }

    @Test
    void includesBoundMonitorEvidenceInFocusedTopology() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");
        EntityMonitorBind monitorBind = EntityMonitorBind.builder()
                .id(501L)
                .entityId(10L)
                .monitorId(701L)
                .bindType("manual")
                .bindSource("service.name")
                .status("active")
                .score(97)
                .build();
        Monitor monitor = Monitor.builder()
                .id(701L)
                .name("checkout-http")
                .app("website")
                .instance("https://checkout.example")
                .status((byte) 1)
                .build();

        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(10L))
                .thenReturn(Optional.of(checkout));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.contains(10L)))).thenReturn(List.of(checkout));
        when(entityMonitorBindQueryService.findMonitorBinds(10L)).thenReturn(List.of(monitorBind));
        when(entityMonitorQueryService.findMonitorsByIds(argThat(ids ->
                ids != null && ids.contains(701L)))).thenReturn(List.of(monitor));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                10L, 1, "prod", null);

        assertTrue(graph.getSourceKinds().containsAll(List.of("entity-relation", "monitor-bind")));
        assertTrue(graph.getNodes().stream().anyMatch(node ->
                "monitor:701".equals(node.getId())
                        && Long.valueOf(701L).equals(node.getEntityId())
                        && "checkout-http".equals(node.getEntityName())
                        && "monitor".equals(node.getEntityType())
                        && "prod".equals(node.getEnvironment())
                        && "healthy".equals(node.getHealth())
                        && node.getEvidenceBadges().contains("monitor-bind")));
        assertTrue(graph.getEdges().stream().anyMatch(edge ->
                Long.valueOf(501L).equals(edge.getRelationId())
                        && "10".equals(edge.getSourceNodeId())
                        && "monitor:701".equals(edge.getTargetNodeId())
                        && Long.valueOf(10L).equals(edge.getSourceEntityId())
                        && edge.getTargetEntityId() == null
                        && "monitor:701".equals(edge.getTargetRef())
                        && "monitors".equals(edge.getRelationType())
                        && "monitor-bind".equals(edge.getRelationSource())
                        && "active".equals(edge.getStatus())
                        && Integer.valueOf(97).equals(edge.getScore())
                        && edge.getEvidenceBadges().contains("service.name")));
        verify(entityMonitorBindQueryService).findMonitorBinds(10L);
        verify(entityMonitorQueryService).findMonitorsByIds(Set.of(701L));
    }

    @Test
    void includesTraceCallEvidenceInFocusedTopology() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");
        ObserveEntity payment = entity(20L, "service", "payment-api", "commerce", "prod", "healthy");
        TraceCallTopologyEdgeInfo traceEdge = new TraceCallTopologyEdgeInfo(
                "trace-call:10:20:trace-1",
                10L,
                20L,
                "trace-1",
                "span-1",
                "POST /pay",
                "2026-05-20T03:01:00Z",
                "2026-05-20T03:08:00Z",
                "error",
                60,
                new TraceCallTopologyEdgeInfo.RedMetrics(2D / 3600D, 2L, 0.5D, 1L, 300D, 200D)
        );

        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(10L))
                .thenReturn(Optional.of(checkout));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.contains(10L)))).thenReturn(List.of(checkout));
        when(traceCallTopologyQueryService.findTraceCallEdges(argThat(entities ->
                entities != null && entities.stream().anyMatch(entity -> Long.valueOf(10L).equals(entity.getId()))),
                eq("prod"), eq(1710000000000L), eq(1710003600000L), eq(false))).thenReturn(
                        new TraceCallTopologyReadModel(Map.of(20L, payment), List.of(traceEdge)));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                10L, 1, "prod", "otlp-trace-call", 1710000000000L, 1710003600000L,
                null, false, null, null);

        assertTrue(graph.getSourceKinds().contains("otlp-trace-call"));
        EntityTopologyGraphInfo.Node paymentNode = graph.getNodes().stream()
                .filter(node -> Long.valueOf(20L).equals(node.getEntityId()))
                .findFirst()
                .orElseThrow();
        assertEquals("payment-api", paymentNode.getEntityName());
        assertEquals("service", paymentNode.getEntityType());
        assertEquals(2L, paymentNode.getRedMetrics().getRequestCount());
        assertEquals(1L, paymentNode.getRedMetrics().getErrorCount());
        assertEquals(300D, paymentNode.getRedMetrics().getLatencyP95Ms(), 0.000001D);

        EntityTopologyGraphInfo.Edge graphEdge = graph.getEdges().stream()
                .filter(edge -> "trace-call".equals(edge.getRelationType()))
                .findFirst()
                .orElseThrow();
        assertNull(graphEdge.getRelationId());
        assertEquals("10", graphEdge.getSourceNodeId());
        assertEquals("20", graphEdge.getTargetNodeId());
        assertEquals(10L, graphEdge.getSourceEntityId());
        assertEquals(20L, graphEdge.getTargetEntityId());
        assertEquals("trace:trace-1", graphEdge.getTargetRef());
        assertEquals("trace-1", graphEdge.getSampleTraceId());
        assertEquals("span-1", graphEdge.getSampleSpanId());
        assertEquals("2026-05-20T03:01:00Z", graphEdge.getFirstSeen());
        assertEquals("2026-05-20T03:08:00Z", graphEdge.getLastSeen());
        assertEquals("otlp-trace-call", graphEdge.getRelationSource());
        assertEquals("error", graphEdge.getStatus());
        assertEquals(60, graphEdge.getScore());
        assertTrue(graphEdge.getEvidenceBadges().contains("POST /pay"));
        assertEquals(2L, graphEdge.getRedMetrics().getRequestCount());
        assertEquals(1L, graphEdge.getRedMetrics().getErrorCount());
        assertEquals(0.5D, graphEdge.getRedMetrics().getErrorRate(), 0.000001D);
        assertEquals(2D / 3600D, graphEdge.getRedMetrics().getRequestRatePerSecond(), 0.000001D);
        assertEquals(300D, graphEdge.getRedMetrics().getLatencyP95Ms(), 0.000001D);
        verify(traceCallTopologyQueryService).findTraceCallEdges(argThat(entities ->
                entities != null && entities.stream().anyMatch(entity -> Long.valueOf(10L).equals(entity.getId()))),
                eq("prod"), eq(1710000000000L), eq(1710003600000L), eq(false));
    }

    @Test
    void skipsTraceDiscoveryWhenSourceKindExcludesTraceCalls() {
        ObserveEntity checkout = entity(10L, "service", "checkout-api", "commerce", "prod", "warning");

        when(entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(10L))
                .thenReturn(Optional.of(checkout));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(argThat(ids ->
                ids != null && ids.contains(10L)))).thenReturn(List.of(checkout));

        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                10L, 1, "prod", "monitor-bind", 1710000000000L, 1710003600000L);

        assertEquals(List.of(), graph.getSourceKinds());
        assertEquals(List.of(), graph.getEdges());
        verify(traceCallTopologyQueryService, never()).findTraceCallEdges(any(), any(), any(), any(), any());
    }

    private static ObserveEntity entity(Long id,
                                        String type,
                                        String name,
                                        String namespace,
                                        String environment,
                                        String status) {
        return ObserveEntity.builder()
                .id(id)
                .type(type)
                .name(name)
                .namespace(namespace)
                .environment(environment)
                .status(status)
                .build();
    }

    private static EntityRelation relation(Long id,
                                           Long sourceEntityId,
                                           Long targetEntityId,
                                           String relationType,
                                           String relationSource,
                                           Integer score) {
        return EntityRelation.builder()
                .id(id)
                .sourceEntityId(sourceEntityId)
                .targetEntityId(targetEntityId)
                .relationType(relationType)
                .relationSource(relationSource)
                .status("confirmed")
                .score(score)
                .build();
    }
}
