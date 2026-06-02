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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityTopologyGraphInfo;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Builds topology graph read models from persisted entity relation evidence.
 */
@Service
public class EntityTopologyQueryService {

    private static final int DEFAULT_DEPTH = 1;
    private static final int MAX_DEPTH = 2;
    private static final int DEFAULT_TOPOLOGY_ENTITY_LIMIT = 64;
    private static final int MAX_TOPOLOGY_EDGE_PAGE_SIZE = 200;
    private static final int IMPACT_TIMELINE_LIMIT = 12;
    private static final String SOURCE_KIND_ENTITY_RELATION = "entity-relation";
    private static final String SOURCE_KIND_MONITOR_BIND = "monitor-bind";
    private static final String SOURCE_KIND_OTLP_TRACE_CALL = "otlp-trace-call";
    private static final String RELATION_TYPE_MONITORS = "monitors";
    private static final String RELATION_TYPE_TRACE_CALL = "trace-call";
    private static final String UNKNOWN_STATUS = "unknown";

    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final EntityRelationQueryService entityRelationQueryService;
    private final EntityMonitorBindQueryService entityMonitorBindQueryService;
    private final EntityMonitorQueryService entityMonitorQueryService;
    private final TraceCallTopologyQueryService traceCallTopologyQueryService;
    private final EntityActivityReadModelService entityActivityReadModelService;

    public EntityTopologyQueryService(EntityWorkspaceAccessService entityWorkspaceAccessService,
                                      EntityRelationQueryService entityRelationQueryService,
                                      EntityMonitorBindQueryService entityMonitorBindQueryService,
                                      EntityMonitorQueryService entityMonitorQueryService,
                                      TraceCallTopologyQueryService traceCallTopologyQueryService,
                                      EntityActivityReadModelService entityActivityReadModelService) {
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.entityRelationQueryService = entityRelationQueryService;
        this.entityMonitorBindQueryService = entityMonitorBindQueryService;
        this.entityMonitorQueryService = entityMonitorQueryService;
        this.traceCallTopologyQueryService = traceCallTopologyQueryService;
        this.entityActivityReadModelService = entityActivityReadModelService;
    }

    public EntityTopologyGraphInfo buildFocusedTopology(Long focusEntityId,
                                                        int requestedDepth,
                                                        String environment,
                                                        String sourceKind) {
        return buildFocusedTopology(focusEntityId, requestedDepth, environment, sourceKind, null, null);
    }

    public EntityTopologyGraphInfo buildFocusedTopology(Long focusEntityId,
                                                        int requestedDepth,
                                                        String environment,
                                                        String sourceKind,
                                                        Long start,
                                                        Long end) {
        return buildFocusedTopology(focusEntityId, requestedDepth, environment, sourceKind, start, end,
                null, null, null, null);
    }

    public EntityTopologyGraphInfo buildFocusedTopology(Long focusEntityId,
                                                        int requestedDepth,
                                                        String environment,
                                                        String sourceKind,
                                                        Long start,
                                                        Long end,
                                                        String relationType,
                                                        Boolean hideInternal,
                                                        Integer pageIndex,
                                                        Integer pageSize) {
        int depth = normalizeDepth(requestedDepth);
        EntityTopologyGraphInfo graph = new EntityTopologyGraphInfo();
        String normalizedSourceKind = normalizeSourceKind(sourceKind);
        String normalizedRelationType = normalizeOptionalText(relationType);
        TopologySourceSelection sourceSelection = sourceSelection(sourceKind);
        graph.setApiBacked(true);
        graph.setFocusEntityId(focusEntityId);
        graph.setDepth(depth);
        graph.setSourceKinds(List.of());
        if (focusEntityId == null) {
            return buildDefaultTopologyGraph(graph, depth, environment, normalizedSourceKind,
                    sourceSelection, start, end, normalizedRelationType, hideInternal, pageIndex, pageSize);
        }
        var focusEntity = entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(focusEntityId);
        if (focusEntity.isEmpty() || !matchesEnvironment(focusEntity.get(), environment)) {
            return graph;
        }

        List<EntityRelation> relations = sourceSelection.includeEntityRelations()
                ? collectRelations(focusEntityId, depth)
                : List.of();
        Set<Long> entityIds = collectEntityIds(focusEntityId, relations);
        Map<Long, ObserveEntity> entityById = accessibleEntityMap(entityIds, environment);
        if (!entityById.containsKey(focusEntityId)) {
            return graph;
        }

        TraceCallTopologyReadModel traceCallReadModel = sourceSelection.includeTraceCalls()
                ? traceCallTopologyReadModel(entityById.values(), environment, start, end, hideInternal)
                : TraceCallTopologyReadModel.empty();
        Map<Long, ObserveEntity> traceEntityById = traceCallReadModel.entityById();
        List<TraceCallTopologyEdgeInfo> traceCallEdges = traceCallReadModel.edges();
        if (traceEntityById != null) {
            traceEntityById.forEach(entityById::putIfAbsent);
        }
        if (traceCallEdges == null) {
            traceCallEdges = List.of();
        }
        List<EntityMonitorBind> monitorBinds = sourceSelection.includeMonitorBinds()
                ? collectMonitorBinds(entityById.keySet())
                : List.of();
        Map<Long, Monitor> monitorById = monitorMap(monitorBinds);
        List<EntityTopologyGraphInfo.Edge> visibleEdges = filterAndPageEdges(
                buildEdges(relations, entityById.keySet(), monitorBinds, monitorById, traceCallEdges),
                normalizedRelationType, hideInternal, pageIndex, pageSize);
        graph.setSourceKinds(buildSourceKinds(normalizedSourceKind, visibleEdges));
        graph.setNodes(filterNodesByVisibleEdges(
                buildNodes(entityById, monitorBinds, monitorById, focusEntityId, traceCallEdges),
                visibleEdges, focusEntityId, normalizedRelationType, pageSize));
        graph.setEdges(visibleEdges);
        graph.setImpactTimeline(buildImpactTimeline(entityById, relations, monitorBinds));
        return graph;
    }

    private EntityTopologyGraphInfo buildDefaultTopologyGraph(EntityTopologyGraphInfo graph,
                                                              int depth,
                                                              String environment,
                                                              String sourceKind,
                                                              TopologySourceSelection sourceSelection,
                                                              Long start,
                                                              Long end,
                                                              String relationType,
                                                              Boolean hideInternal,
                                                              Integer pageIndex,
                                                              Integer pageSize) {
        List<ObserveEntity> seedEntities = defaultSeedEntities(environment);
        if (seedEntities.isEmpty()) {
            return graph;
        }
        Set<Long> seedEntityIds = seedEntities.stream()
                .map(ObserveEntity::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        List<EntityRelation> relations = sourceSelection.includeEntityRelations()
                ? collectDefaultRelations(seedEntityIds, depth)
                : List.of();
        Set<Long> entityIds = collectEntityIds(seedEntityIds, relations);
        Map<Long, ObserveEntity> entityById = accessibleEntityMap(entityIds, environment);
        if (entityById.isEmpty()) {
            return graph;
        }

        TraceCallTopologyReadModel traceCallReadModel = sourceSelection.includeTraceCalls()
                ? traceCallTopologyOverviewReadModel(environment, start, end, hideInternal)
                : TraceCallTopologyReadModel.empty();
        Map<Long, ObserveEntity> traceEntityById = traceCallReadModel.entityById();
        List<TraceCallTopologyEdgeInfo> traceCallEdges = traceCallReadModel.edges();
        if (traceEntityById != null) {
            traceEntityById.forEach(entityById::putIfAbsent);
        }
        if (traceCallEdges == null) {
            traceCallEdges = List.of();
        }
        List<EntityMonitorBind> monitorBinds = sourceSelection.includeMonitorBinds()
                ? collectMonitorBinds(entityById.keySet())
                : List.of();
        Map<Long, Monitor> monitorById = monitorMap(monitorBinds);
        List<EntityTopologyGraphInfo.Edge> visibleEdges = filterAndPageEdges(
                buildEdges(relations, entityById.keySet(), monitorBinds, monitorById, traceCallEdges),
                relationType, hideInternal, pageIndex, pageSize);
        graph.setSourceKinds(buildSourceKinds(sourceKind, visibleEdges));
        graph.setNodes(filterNodesByVisibleEdges(
                buildNodes(entityById, monitorBinds, monitorById, null, traceCallEdges),
                visibleEdges, null, relationType, pageSize));
        graph.setEdges(visibleEdges);
        graph.setImpactTimeline(buildImpactTimeline(entityById, relations, monitorBinds));
        return graph;
    }

    private List<ObserveEntity> defaultSeedEntities(String environment) {
        Sort sort = Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id"));
        List<ObserveEntity> entities = entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(
                PageRequest.of(0, DEFAULT_TOPOLOGY_ENTITY_LIMIT, sort));
        if (entities == null) {
            return List.of();
        }
        return entities.stream()
                .filter(entity -> entity.getId() != null)
                .filter(entity -> matchesEnvironment(entity, environment))
                .toList();
    }

    private TraceCallTopologyReadModel traceCallTopologyReadModel(Collection<ObserveEntity> seedEntities,
                                                                  String environment,
                                                                  Long start,
                                                                  Long end,
                                                                  Boolean hideInternal) {
        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdges(
                seedEntities, environment, start, end, hideInternal == null || hideInternal);
        return readModel == null ? TraceCallTopologyReadModel.empty() : readModel;
    }

    private TraceCallTopologyReadModel traceCallTopologyOverviewReadModel(String environment,
                                                                          Long start,
                                                                          Long end,
                                                                          Boolean hideInternal) {
        TraceCallTopologyReadModel readModel = traceCallTopologyQueryService.findTraceCallEdgesForOverview(
                environment, start, end, hideInternal == null || hideInternal);
        return readModel == null ? TraceCallTopologyReadModel.empty() : readModel;
    }

    private TopologySourceSelection sourceSelection(String sourceKind) {
        if (!StringUtils.hasText(sourceKind)) {
            return TopologySourceSelection.all();
        }
        String normalized = sourceKind.trim().toLowerCase();
        return switch (normalized) {
            case SOURCE_KIND_MONITOR_BIND, "monitor-ownership" -> new TopologySourceSelection(false, true, false);
            case SOURCE_KIND_OTLP_TRACE_CALL -> new TopologySourceSelection(false, false, true);
            case SOURCE_KIND_ENTITY_RELATION,
                    "cmdb-manual-label",
                    "database-middleware-connection",
                    "template-dependency",
                    "k8s-workload" -> new TopologySourceSelection(true, false, false);
            case "alert-impact" -> TopologySourceSelection.all();
            default -> TopologySourceSelection.all();
        };
    }

    private record TopologySourceSelection(boolean includeEntityRelations,
                                           boolean includeMonitorBinds,
                                           boolean includeTraceCalls) {

        private static TopologySourceSelection all() {
            return new TopologySourceSelection(true, true, true);
        }
    }

    private List<EntityRelation> collectRelations(Long focusEntityId, int depth) {
        Map<String, EntityRelation> relationByKey = new LinkedHashMap<>();
        List<EntityRelation> firstHopRelations = addRelations(relationByKey, focusEntityId);
        if (depth <= 1) {
            return new ArrayList<>(relationByKey.values());
        }
        collectEntityIds(focusEntityId, firstHopRelations).stream()
                .filter(entityId -> !Objects.equals(entityId, focusEntityId))
                .forEach(entityId -> addRelations(relationByKey, entityId));
        return new ArrayList<>(relationByKey.values());
    }

    private List<EntityRelation> collectDefaultRelations(Collection<Long> seedEntityIds, int depth) {
        Map<String, EntityRelation> relationByKey = new LinkedHashMap<>();
        seedEntityIds.forEach(entityId -> addRelations(relationByKey, entityId));
        if (depth <= 1) {
            return new ArrayList<>(relationByKey.values());
        }
        Set<Long> seedIds = new LinkedHashSet<>(seedEntityIds);
        collectEntityIds(seedEntityIds, relationByKey.values()).stream()
                .filter(entityId -> !seedIds.contains(entityId))
                .forEach(entityId -> addRelations(relationByKey, entityId));
        return new ArrayList<>(relationByKey.values());
    }

    private List<EntityRelation> addRelations(Map<String, EntityRelation> relationByKey, Long entityId) {
        if (entityId == null) {
            return List.of();
        }
        List<EntityRelation> relations = entityRelationQueryService.findEntityRelations(entityId);
        if (relations == null) {
            return List.of();
        }
        relations.forEach(relation -> relationByKey.putIfAbsent(relationKey(relation), relation));
        return relations;
    }

    private List<EntityMonitorBind> collectMonitorBinds(Collection<Long> entityIds) {
        List<EntityMonitorBind> binds = new ArrayList<>();
        for (Long entityId : entityIds) {
            List<EntityMonitorBind> found = entityMonitorBindQueryService.findMonitorBinds(entityId);
            if (found != null) {
                binds.addAll(found);
            }
        }
        binds.sort(Comparator.comparing(bind -> bind.getId() == null ? Long.MAX_VALUE : bind.getId()));
        return binds;
    }

    private Map<Long, Monitor> monitorMap(Collection<EntityMonitorBind> binds) {
        Set<Long> monitorIds = new LinkedHashSet<>();
        for (EntityMonitorBind bind : binds) {
            if (bind.getMonitorId() != null) {
                monitorIds.add(bind.getMonitorId());
            }
        }
        Map<Long, Monitor> monitorById = new LinkedHashMap<>();
        if (monitorIds.isEmpty()) {
            return monitorById;
        }
        entityMonitorQueryService.findMonitorsByIds(monitorIds).stream()
                .filter(monitor -> monitor.getId() != null)
                .forEach(monitor -> monitorById.put(monitor.getId(), monitor));
        return monitorById;
    }

    private List<String> buildSourceKinds(String requestedSourceKind,
                                          Collection<EntityTopologyGraphInfo.Edge> visibleEdges) {
        if (visibleEdges == null || visibleEdges.isEmpty()) {
            return List.of();
        }
        Set<String> sourceKinds = new LinkedHashSet<>();
        sourceKinds.add(requestedSourceKind);
        for (EntityTopologyGraphInfo.Edge edge : visibleEdges) {
            if (edge == null) {
                continue;
            }
            addSourceKindsFromEdgeEvidence(sourceKinds, edge.getEvidenceBadges());
            addSourceKindFromEdgeSource(sourceKinds, edge.getRelationSource());
        }
        return new ArrayList<>(sourceKinds);
    }

    private void addSourceKindsFromEdgeEvidence(Set<String> sourceKinds, Collection<String> evidenceBadges) {
        if (evidenceBadges == null) {
            return;
        }
        evidenceBadges.forEach(source -> addSourceKindFromEdgeSource(sourceKinds, source));
    }

    private void addSourceKindFromEdgeSource(Set<String> sourceKinds, String source) {
        if (!StringUtils.hasText(source)) {
            return;
        }
        String normalized = source.trim().toLowerCase();
        if (SOURCE_KIND_ENTITY_RELATION.equals(normalized)
                || SOURCE_KIND_MONITOR_BIND.equals(normalized)
                || SOURCE_KIND_OTLP_TRACE_CALL.equals(normalized)) {
            sourceKinds.add(normalized);
        }
    }

    private Set<Long> collectEntityIds(Long focusEntityId, Collection<EntityRelation> relations) {
        return collectEntityIds(List.of(focusEntityId), relations);
    }

    private Set<Long> collectEntityIds(Collection<Long> seedEntityIds, Collection<EntityRelation> relations) {
        Set<Long> ids = new LinkedHashSet<>();
        seedEntityIds.stream().filter(Objects::nonNull).forEach(ids::add);
        for (EntityRelation relation : relations) {
            if (relation.getSourceEntityId() != null) {
                ids.add(relation.getSourceEntityId());
            }
            if (relation.getTargetEntityId() != null) {
                ids.add(relation.getTargetEntityId());
            }
        }
        return ids;
    }

    private Map<Long, ObserveEntity> accessibleEntityMap(Collection<Long> entityIds, String environment) {
        Map<Long, ObserveEntity> entityById = new LinkedHashMap<>();
        entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(entityIds).stream()
                .filter(entity -> matchesEnvironment(entity, environment))
                .sorted(Comparator.comparing(ObserveEntity::getId))
                .forEach(entity -> entityById.put(entity.getId(), entity));
        return entityById;
    }

    private List<EntityTopologyGraphInfo.Node> buildNodes(Map<Long, ObserveEntity> entityById,
                                                          List<EntityMonitorBind> monitorBinds,
                                                          Map<Long, Monitor> monitorById,
                                                          Long focusEntityId,
                                                          List<TraceCallTopologyEdgeInfo> traceCallEdges) {
        Map<Long, EntityTopologyGraphInfo.RedMetrics> redMetricsByEntityId =
                buildNodeRedMetrics(traceCallEdges);
        List<EntityTopologyGraphInfo.Node> nodes = new ArrayList<>(entityById.values().stream()
                .sorted(Comparator.comparing(entity -> Objects.equals(entity.getId(), focusEntityId) ? 0 : 1))
                .map(entity -> new EntityTopologyGraphInfo.Node(
                        String.valueOf(entity.getId()),
                        entity.getId(),
                        displayName(entity),
                        valueOrUnknown(entity.getType()),
                        valueOrUnknown(entity.getNamespace()),
                        valueOrUnknown(entity.getEnvironment()),
                        valueOrUnknown(entity.getStatus()),
                        Objects.equals(entity.getId(), focusEntityId),
                        List.of(SOURCE_KIND_ENTITY_RELATION, valueOrUnknown(entity.getSource())),
                        redMetricsByEntityId.getOrDefault(entity.getId(), emptyRedMetrics())))
                .toList());
        nodes.addAll(buildMonitorNodes(monitorBinds, monitorById, entityById));
        return nodes;
    }

    private List<EntityTopologyGraphInfo.Node> buildMonitorNodes(List<EntityMonitorBind> monitorBinds,
                                                                 Map<Long, Monitor> monitorById,
                                                                 Map<Long, ObserveEntity> entityById) {
        List<EntityTopologyGraphInfo.Node> nodes = new ArrayList<>();
        for (EntityMonitorBind bind : monitorBinds) {
            Monitor monitor = monitorById.get(bind.getMonitorId());
            if (monitor == null) {
                continue;
            }
            ObserveEntity entity = entityById.get(bind.getEntityId());
            nodes.add(new EntityTopologyGraphInfo.Node(
                    monitorNodeId(bind.getMonitorId()),
                    monitor.getId(),
                    monitorDisplayName(monitor),
                    "monitor",
                    valueOrUnknown(monitor.getApp()),
                    monitorEnvironment(monitor, entity),
                    monitorHealth(monitor),
                    false,
                    List.of(SOURCE_KIND_MONITOR_BIND, valueOrUnknown(bind.getBindSource())),
                    emptyRedMetrics()));
        }
        return nodes;
    }

    private List<EntityTopologyGraphInfo.Edge> buildEdges(List<EntityRelation> relations,
                                                          Set<Long> visibleEntityIds,
                                                          List<EntityMonitorBind> monitorBinds,
                                                          Map<Long, Monitor> monitorById,
                                                          List<TraceCallTopologyEdgeInfo> traceCallEdges) {
        List<EntityTopologyGraphInfo.Edge> edges = new ArrayList<>(relations.stream()
                .filter(relation -> relation.getSourceEntityId() != null)
                .filter(relation -> visibleEntityIds.contains(relation.getSourceEntityId()))
                .filter(relation -> relation.getTargetEntityId() == null
                        || visibleEntityIds.contains(relation.getTargetEntityId()))
                .map(relation -> new EntityTopologyGraphInfo.Edge(
                        relationKey(relation),
                        relation.getId(),
                        String.valueOf(relation.getSourceEntityId()),
                        relation.getTargetEntityId() == null ? null : String.valueOf(relation.getTargetEntityId()),
                        relation.getSourceEntityId(),
                        relation.getTargetEntityId(),
                        relation.getTargetRef(),
                        null,
                        null,
                        null,
                        null,
                        valueOrUnknown(relation.getRelationType()),
                        valueOrUnknown(relation.getRelationSource()),
                        valueOrUnknown(relation.getStatus()),
                        relation.getScore(),
                        List.of(SOURCE_KIND_ENTITY_RELATION, valueOrUnknown(relation.getRelationSource())),
                        emptyRedMetrics()))
                .toList());
        edges.addAll(buildMonitorBindEdges(monitorBinds, visibleEntityIds, monitorById));
        edges.addAll(buildTraceCallEdges(traceCallEdges, visibleEntityIds));
        return edges;
    }

    private List<EntityTopologyGraphInfo.Edge> filterAndPageEdges(List<EntityTopologyGraphInfo.Edge> edges,
                                                                  String relationType,
                                                                  Boolean hideInternal,
                                                                  Integer pageIndex,
                                                                  Integer pageSize) {
        List<EntityTopologyGraphInfo.Edge> filtered = edges.stream()
                .filter(edge -> matchesRelationType(edge, relationType))
                .filter(edge -> !isInternalEdge(edge, hideInternal))
                .toList();
        int normalizedPageSize = normalizePageSize(pageSize);
        if (normalizedPageSize <= 0) {
            return filtered;
        }
        int offset = normalizePageIndex(pageIndex) * normalizedPageSize;
        if (offset >= filtered.size()) {
            return List.of();
        }
        return filtered.stream()
                .skip(offset)
                .limit(normalizedPageSize)
                .toList();
    }

    private List<EntityTopologyGraphInfo.Node> filterNodesByVisibleEdges(
            List<EntityTopologyGraphInfo.Node> nodes,
            List<EntityTopologyGraphInfo.Edge> edges,
            Long focusEntityId,
            String relationType,
            Integer pageSize) {
        if (!StringUtils.hasText(relationType) && normalizePageSize(pageSize) <= 0) {
            return nodes;
        }
        Set<String> visibleNodeIds = new LinkedHashSet<>();
        if (focusEntityId != null) {
            visibleNodeIds.add(String.valueOf(focusEntityId));
        }
        for (EntityTopologyGraphInfo.Edge edge : edges) {
            if (StringUtils.hasText(edge.getSourceNodeId())) {
                visibleNodeIds.add(edge.getSourceNodeId());
            }
            if (StringUtils.hasText(edge.getTargetNodeId())) {
                visibleNodeIds.add(edge.getTargetNodeId());
            }
        }
        return nodes.stream()
                .filter(node -> visibleNodeIds.contains(node.getId()))
                .toList();
    }

    private boolean matchesRelationType(EntityTopologyGraphInfo.Edge edge, String relationType) {
        return !StringUtils.hasText(relationType)
                || relationType.equalsIgnoreCase(valueOrUnknown(edge.getRelationType()));
    }

    private boolean isInternalEdge(EntityTopologyGraphInfo.Edge edge, Boolean hideInternal) {
        if (!Boolean.TRUE.equals(hideInternal)) {
            return false;
        }
        return containsHertzBeatInternalRef(edge.getRelationSource())
                || containsHertzBeatInternalRef(edge.getSourceNodeId())
                || containsHertzBeatInternalRef(edge.getTargetNodeId())
                || containsHertzBeatInternalRef(edge.getTargetRef());
    }

    private boolean containsHertzBeatInternalRef(String value) {
        return StringUtils.hasText(value) && value.toLowerCase().contains("hertzbeat");
    }

    private List<EntityTopologyGraphInfo.Edge> buildMonitorBindEdges(List<EntityMonitorBind> monitorBinds,
                                                                     Set<Long> visibleEntityIds,
                                                                     Map<Long, Monitor> monitorById) {
        List<EntityTopologyGraphInfo.Edge> edges = new ArrayList<>();
        for (EntityMonitorBind bind : monitorBinds) {
            if (bind.getEntityId() == null
                    || bind.getMonitorId() == null
                    || !visibleEntityIds.contains(bind.getEntityId())
                    || !monitorById.containsKey(bind.getMonitorId())) {
                continue;
            }
            edges.add(new EntityTopologyGraphInfo.Edge(
                    monitorBindEdgeId(bind),
                    bind.getId(),
                    String.valueOf(bind.getEntityId()),
                    monitorNodeId(bind.getMonitorId()),
                    bind.getEntityId(),
                    null,
                    monitorNodeId(bind.getMonitorId()),
                    null,
                    null,
                    null,
                    null,
                    RELATION_TYPE_MONITORS,
                    SOURCE_KIND_MONITOR_BIND,
                    valueOrUnknown(bind.getStatus()),
                    bind.getScore(),
                    List.of(SOURCE_KIND_MONITOR_BIND, valueOrUnknown(bind.getBindSource())),
                    emptyRedMetrics()));
        }
        return edges;
    }

    private List<EntityTopologyGraphInfo.Edge> buildTraceCallEdges(List<TraceCallTopologyEdgeInfo> traceCallEdges,
                                                                   Set<Long> visibleEntityIds) {
        List<EntityTopologyGraphInfo.Edge> edges = new ArrayList<>();
        for (TraceCallTopologyEdgeInfo traceEdge : traceCallEdges) {
            if (traceEdge.sourceEntityId() == null
                    || traceEdge.targetEntityId() == null
                    || !visibleEntityIds.contains(traceEdge.sourceEntityId())
                    || !visibleEntityIds.contains(traceEdge.targetEntityId())) {
                continue;
            }
            edges.add(new EntityTopologyGraphInfo.Edge(
                    traceEdge.id(),
                    null,
                    String.valueOf(traceEdge.sourceEntityId()),
                    String.valueOf(traceEdge.targetEntityId()),
                    traceEdge.sourceEntityId(),
                    traceEdge.targetEntityId(),
                    "trace:" + valueOrUnknown(traceEdge.traceId()),
                    traceEdge.traceId(),
                    traceEdge.sampleSpanId(),
                    traceEdge.firstSeen(),
                    traceEdge.lastSeen(),
                    RELATION_TYPE_TRACE_CALL,
                    SOURCE_KIND_OTLP_TRACE_CALL,
                    valueOrUnknown(traceEdge.status()),
                    traceEdge.score(),
                    traceEvidenceBadges(traceEdge),
                    toGraphRedMetrics(traceEdge.redMetrics())));
        }
        return edges;
    }

    private Map<Long, EntityTopologyGraphInfo.RedMetrics> buildNodeRedMetrics(
            Collection<TraceCallTopologyEdgeInfo> traceCallEdges) {
        Map<Long, RedMetricAccumulator> metricsByEntityId = new LinkedHashMap<>();
        for (TraceCallTopologyEdgeInfo edge : traceCallEdges) {
            addNodeRedMetrics(metricsByEntityId, edge.sourceEntityId(), edge.redMetrics());
            addNodeRedMetrics(metricsByEntityId, edge.targetEntityId(), edge.redMetrics());
        }
        Map<Long, EntityTopologyGraphInfo.RedMetrics> redMetricsByEntityId = new LinkedHashMap<>();
        metricsByEntityId.forEach((entityId, accumulator) ->
                redMetricsByEntityId.put(entityId, accumulator.toGraphRedMetrics()));
        return redMetricsByEntityId;
    }

    private void addNodeRedMetrics(Map<Long, RedMetricAccumulator> metricsByEntityId,
                                   Long entityId,
                                   TraceCallTopologyEdgeInfo.RedMetrics metrics) {
        if (entityId == null || metrics == null) {
            return;
        }
        metricsByEntityId.computeIfAbsent(entityId, key -> new RedMetricAccumulator()).add(metrics);
    }

    private EntityTopologyGraphInfo.RedMetrics toGraphRedMetrics(TraceCallTopologyEdgeInfo.RedMetrics metrics) {
        if (metrics == null) {
            return emptyRedMetrics();
        }
        return new EntityTopologyGraphInfo.RedMetrics(
                metrics.requestRatePerSecond(),
                metrics.requestCount(),
                metrics.errorRate(),
                metrics.errorCount(),
                metrics.latencyP95Ms(),
                metrics.latencyAvgMs());
    }

    private EntityTopologyGraphInfo.RedMetrics emptyRedMetrics() {
        return new EntityTopologyGraphInfo.RedMetrics();
    }

    private List<String> traceEvidenceBadges(TraceCallTopologyEdgeInfo edge) {
        List<String> badges = new ArrayList<>();
        badges.add(SOURCE_KIND_OTLP_TRACE_CALL);
        if (StringUtils.hasText(edge.traceId())) {
            badges.add(edge.traceId());
        }
        if (StringUtils.hasText(edge.spanName())) {
            badges.add(edge.spanName());
        }
        return badges;
    }

    private static class RedMetricAccumulator {

        private double requestRatePerSecond;
        private long requestCount;
        private long errorCount;
        private double weightedLatencyAvgMs;
        private long latencyAvgWeight;
        private Double latencyP95Ms;

        private void add(TraceCallTopologyEdgeInfo.RedMetrics metrics) {
            if (metrics.requestRatePerSecond() != null) {
                requestRatePerSecond += metrics.requestRatePerSecond();
            }
            long metricRequestCount = metrics.requestCount() == null ? 0L : metrics.requestCount();
            requestCount += metricRequestCount;
            if (metrics.errorCount() != null) {
                errorCount += metrics.errorCount();
            }
            if (metrics.latencyP95Ms() != null) {
                latencyP95Ms = latencyP95Ms == null
                        ? metrics.latencyP95Ms()
                        : Math.max(latencyP95Ms, metrics.latencyP95Ms());
            }
            if (metrics.latencyAvgMs() != null && metricRequestCount > 0L) {
                weightedLatencyAvgMs += metrics.latencyAvgMs() * metricRequestCount;
                latencyAvgWeight += metricRequestCount;
            }
        }

        private EntityTopologyGraphInfo.RedMetrics toGraphRedMetrics() {
            Double errorRate = requestCount == 0L ? null : (double) errorCount / requestCount;
            Double latencyAvgMs = latencyAvgWeight == 0L ? null : weightedLatencyAvgMs / latencyAvgWeight;
            return new EntityTopologyGraphInfo.RedMetrics(
                    requestRatePerSecond,
                    requestCount,
                    errorRate,
                    errorCount,
                    latencyP95Ms,
                    latencyAvgMs);
        }
    }

    private List<EntityTopologyGraphInfo.TimelineEvent> buildImpactTimeline(
            Map<Long, ObserveEntity> entityById,
            List<EntityRelation> relations,
            List<EntityMonitorBind> monitorBinds) {
        List<EntityTopologyGraphInfo.TimelineEvent> events = new ArrayList<>();
        events.addAll(buildEntityActivityTimelineEvents(entityById));
        events.addAll(buildRelationTimelineEvents(relations));
        events.addAll(buildMonitorBindTimelineEvents(monitorBinds));
        events.sort(Comparator
                .comparing(EntityTopologyGraphInfo.TimelineEvent::getOccurredAt,
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(EntityTopologyGraphInfo.TimelineEvent::getId));
        return events.stream()
                .limit(IMPACT_TIMELINE_LIMIT)
                .toList();
    }

    private List<EntityTopologyGraphInfo.TimelineEvent> buildEntityActivityTimelineEvents(
            Map<Long, ObserveEntity> entityById) {
        if (entityById.isEmpty() || entityActivityReadModelService == null) {
            return List.of();
        }
        List<Long> entityIds = new ArrayList<>(entityById.keySet());
        Map<Long, EntityDefinitionActivity> activityByEntityId =
                entityActivityReadModelService.findLatestDefinitionActivities(entityIds);
        if (activityByEntityId == null || activityByEntityId.isEmpty()) {
            return List.of();
        }
        return activityByEntityId.values().stream()
                .filter(activity -> activity != null && entityById.containsKey(activity.getEntityId()))
                .filter(activity -> activity.getGmtCreate() != null)
                .map(activity -> new EntityTopologyGraphInfo.TimelineEvent(
                        "activity:" + activity.getId(),
                        null,
                        activity.getEntityId(),
                        "cmdb-manual-label",
                        "entity-definition",
                        valueOrUnknown(activity.getSummary()),
                        valueOrUnknown(activity.getDetail()),
                        actor(activity.getCreator(), null),
                        activity.getGmtCreate()))
                .toList();
    }

    private List<EntityTopologyGraphInfo.TimelineEvent> buildRelationTimelineEvents(List<EntityRelation> relations) {
        return relations.stream()
                .filter(relation -> relation != null && relationEventTime(relation) != null)
                .map(relation -> new EntityTopologyGraphInfo.TimelineEvent(
                        "relation:" + relationKey(relation),
                        relationKey(relation),
                        relation.getSourceEntityId(),
                        relationTimelineSourceKind(relation),
                        "relation-updated",
                        valueOrUnknown(relation.getRelationType()),
                        timelineDetail(relation.getRelationSource(), relation.getStatus()),
                        actor(relation.getCreator(), relation.getModifier()),
                        relationEventTime(relation)))
                .toList();
    }

    private List<EntityTopologyGraphInfo.TimelineEvent> buildMonitorBindTimelineEvents(
            List<EntityMonitorBind> monitorBinds) {
        return monitorBinds.stream()
                .filter(bind -> bind != null && bindEventTime(bind) != null)
                .map(bind -> new EntityTopologyGraphInfo.TimelineEvent(
                        "monitor-bind:" + valueOrUnknown(String.valueOf(bind.getId())),
                        monitorBindEdgeId(bind),
                        bind.getEntityId(),
                        SOURCE_KIND_MONITOR_BIND,
                        "monitor-bind-updated",
                        valueOrUnknown(bind.getBindSource()),
                        timelineDetail(bind.getBindType(), bind.getStatus()),
                        actor(bind.getCreator(), bind.getModifier()),
                        bindEventTime(bind)))
                .toList();
    }

    private String relationTimelineSourceKind(EntityRelation relation) {
        String source = valueOrUnknown(relation.getRelationSource()).toLowerCase();
        String type = valueOrUnknown(relation.getRelationType()).toLowerCase();
        if (source.contains("trace") || type.contains("trace") || type.contains("call")) {
            return SOURCE_KIND_OTLP_TRACE_CALL;
        }
        if (source.contains("monitor") || type.contains("monitor")) {
            return SOURCE_KIND_MONITOR_BIND;
        }
        if (source.contains("template") || type.contains("template")) {
            return "template-dependency";
        }
        if (source.contains("k8s") || type.contains("k8s") || type.contains("workload")) {
            return "k8s-workload";
        }
        if (source.contains("database") || source.contains("middleware") || type.contains("database")) {
            return "database-middleware-connection";
        }
        return "cmdb-manual-label";
    }

    private LocalDateTime relationEventTime(EntityRelation relation) {
        return relation.getGmtUpdate() == null ? relation.getGmtCreate() : relation.getGmtUpdate();
    }

    private LocalDateTime bindEventTime(EntityMonitorBind bind) {
        return bind.getGmtUpdate() == null ? bind.getGmtCreate() : bind.getGmtUpdate();
    }

    private String actor(String creator, String modifier) {
        if (StringUtils.hasText(modifier)) {
            return modifier;
        }
        return StringUtils.hasText(creator) ? creator : "system";
    }

    private String timelineDetail(String left, String right) {
        String first = valueOrUnknown(left);
        String second = valueOrUnknown(right);
        if (UNKNOWN_STATUS.equals(first)) {
            return second;
        }
        if (UNKNOWN_STATUS.equals(second)) {
            return first;
        }
        return first + " / " + second;
    }

    private int normalizeDepth(int requestedDepth) {
        if (requestedDepth <= 0) {
            return DEFAULT_DEPTH;
        }
        return Math.min(requestedDepth, MAX_DEPTH);
    }

    private String normalizeSourceKind(String sourceKind) {
        return StringUtils.hasText(sourceKind) ? sourceKind.trim() : SOURCE_KIND_ENTITY_RELATION;
    }

    private String normalizeOptionalText(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private int normalizePageIndex(Integer pageIndex) {
        return pageIndex == null || pageIndex < 0 ? 0 : pageIndex;
    }

    private int normalizePageSize(Integer pageSize) {
        if (pageSize == null || pageSize <= 0) {
            return 0;
        }
        return Math.min(pageSize, MAX_TOPOLOGY_EDGE_PAGE_SIZE);
    }

    private boolean matchesEnvironment(ObserveEntity entity, String environment) {
        if (!StringUtils.hasText(environment) || "all".equalsIgnoreCase(environment.trim())) {
            return true;
        }
        return environment.trim().equalsIgnoreCase(entity.getEnvironment());
    }

    private String displayName(ObserveEntity entity) {
        if (StringUtils.hasText(entity.getDisplayName())) {
            return entity.getDisplayName();
        }
        return valueOrUnknown(entity.getName());
    }

    private String monitorNodeId(Long monitorId) {
        return "monitor:" + monitorId;
    }

    private String monitorBindEdgeId(EntityMonitorBind bind) {
        if (bind.getId() != null) {
            return SOURCE_KIND_MONITOR_BIND + ":" + bind.getId();
        }
        return SOURCE_KIND_MONITOR_BIND + ":" + bind.getEntityId() + ":" + bind.getMonitorId();
    }

    private String monitorDisplayName(Monitor monitor) {
        if (StringUtils.hasText(monitor.getName())) {
            return monitor.getName();
        }
        if (StringUtils.hasText(monitor.getInstance())) {
            return monitor.getInstance();
        }
        return monitorNodeId(monitor.getId());
    }

    private String monitorEnvironment(Monitor monitor, ObserveEntity entity) {
        if (entity != null && StringUtils.hasText(entity.getEnvironment())) {
            return entity.getEnvironment();
        }
        if (monitor.getLabels() != null && StringUtils.hasText(monitor.getLabels().get("env"))) {
            return monitor.getLabels().get("env");
        }
        return UNKNOWN_STATUS;
    }

    private String monitorHealth(Monitor monitor) {
        return switch (monitor.getStatus()) {
            case 1 -> "healthy";
            case 2 -> "critical";
            case 0 -> "warning";
            default -> UNKNOWN_STATUS;
        };
    }

    private String valueOrUnknown(String value) {
        return StringUtils.hasText(value) ? value : UNKNOWN_STATUS;
    }

    private String relationKey(EntityRelation relation) {
        if (relation.getId() != null) {
            return String.valueOf(relation.getId());
        }
        return relation.getSourceEntityId()
                + ":" + relation.getTargetEntityId()
                + ":" + valueOrUnknown(relation.getTargetRef())
                + ":" + valueOrUnknown(relation.getRelationType());
    }
}
