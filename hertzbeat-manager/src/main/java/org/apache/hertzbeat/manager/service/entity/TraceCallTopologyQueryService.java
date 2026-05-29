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

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Discovers service-call topology evidence from Greptime trace rows.
 */
@Service
public class TraceCallTopologyQueryService {

    private static final ObjectMapper JSON_MAPPER = JsonMapper.builder().build();
    private static final int TRACE_ROW_LIMIT = 1500;
    private static final Duration SERVICE_GRAPH_QUERY_TIMEOUT = Duration.ofSeconds(3);
    private static final String SERVICE_NAME_KEY = "service.name";
    private static final Set<String> SERVICE_IDENTITY_KEYS = Set.of(SERVICE_NAME_KEY);

    private final TraceQueryRepository traceQueryRepository;
    private final EntityIdentityQueryService entityIdentityQueryService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final Duration serviceGraphQueryTimeout;

    @Autowired
    public TraceCallTopologyQueryService(TraceQueryRepository traceQueryRepository,
                                         EntityIdentityQueryService entityIdentityQueryService,
                                         EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this(traceQueryRepository, entityIdentityQueryService, entityWorkspaceAccessService,
                SERVICE_GRAPH_QUERY_TIMEOUT);
    }

    TraceCallTopologyQueryService(TraceQueryRepository traceQueryRepository,
                                  EntityIdentityQueryService entityIdentityQueryService,
                                  EntityWorkspaceAccessService entityWorkspaceAccessService,
                                  Duration serviceGraphQueryTimeout) {
        this.traceQueryRepository = traceQueryRepository;
        this.entityIdentityQueryService = entityIdentityQueryService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.serviceGraphQueryTimeout = serviceGraphQueryTimeout == null || serviceGraphQueryTimeout.isZero()
                || serviceGraphQueryTimeout.isNegative()
                ? SERVICE_GRAPH_QUERY_TIMEOUT
                : serviceGraphQueryTimeout;
    }

    public TraceCallTopologyReadModel findTraceCallEdges(Collection<ObserveEntity> seedEntities,
                                                         String environment) {
        return findTraceCallEdges(seedEntities, environment, null, null);
    }

    public TraceCallTopologyReadModel findTraceCallEdges(Collection<ObserveEntity> seedEntities,
                                                         String environment,
                                                         Long start,
                                                         Long end) {
        return findTraceCallEdges(seedEntities, environment, start, end, true);
    }

    public TraceCallTopologyReadModel findTraceCallEdges(Collection<ObserveEntity> seedEntities,
                                                         String environment,
                                                         Long start,
                                                         Long end,
                                                         Boolean hideInternal) {
        if (CollectionUtils.isEmpty(seedEntities)) {
            return TraceCallTopologyReadModel.empty();
        }
        boolean shouldHideInternal = hideInternal == null || hideInternal;
        TraceCallTopologyReadModel serviceGraphReadModel =
                findServiceGraphReadModel(seedEntities, environment, start, end, shouldHideInternal);
        if (!serviceGraphReadModel.edges().isEmpty()) {
            return serviceGraphReadModel;
        }
        List<TraceSpanRow> spans = safeList(traceQueryRepository.queryRecentTraceRows(
                        TRACE_ROW_LIMIT, start, end, null, environment, shouldHideInternal))
                .stream()
                .map(this::toTraceSpanRow)
                .filter(Objects::nonNull)
                .toList();
        if (spans.isEmpty()) {
            return TraceCallTopologyReadModel.empty();
        }

        Set<String> observedServices = spans.stream()
                .map(TraceSpanRow::serviceName)
                .map(this::normalize)
                .filter(StringUtils::hasText)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        Map<String, ObserveEntity> entityByService = resolveEntityByService(seedEntities, observedServices,
                environment);
        Map<Long, ObserveEntity> entityById = new LinkedHashMap<>();
        entityByService.values().forEach(entity -> entityById.putIfAbsent(entity.getId(), entity));
        List<TraceCallTopologyEdgeInfo> edges = buildTraceCallEdgesFromSpans(
                spans, entityByService, seedEntities, start, end);
        return new TraceCallTopologyReadModel(entityById, edges);
    }

    private TraceCallTopologyReadModel findServiceGraphReadModel(Collection<ObserveEntity> seedEntities,
                                                                 String environment,
                                                                 Long start,
                                                                 Long end,
                                                                 Boolean hideInternal) {
        Set<String> seedServiceNames = seedServiceNames(seedEntities);
        List<TraceServiceGraphRow> serviceGraphRows = queryServiceGraphRows(
                start, end, environment, seedServiceNames, hideInternal);
        if (serviceGraphRows.isEmpty()) {
            return TraceCallTopologyReadModel.empty();
        }
        Set<String> observedServices = serviceGraphRows.stream()
                .flatMap(row -> java.util.stream.Stream.of(row.sourceServiceName(), row.targetServiceName()))
                .map(this::normalize)
                .filter(StringUtils::hasText)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        Map<String, ObserveEntity> entityByService = resolveEntityByService(seedEntities, observedServices,
                environment);
        List<TraceCallTopologyEdgeInfo> edges = buildTraceCallEdgesFromServiceGraphRows(
                serviceGraphRows, entityByService, seedEntities, start, end);
        Map<Long, ObserveEntity> entityById = new LinkedHashMap<>();
        for (TraceCallTopologyEdgeInfo edge : edges) {
            ObserveEntity source = findEntityById(entityByService.values(), edge.sourceEntityId());
            ObserveEntity target = findEntityById(entityByService.values(), edge.targetEntityId());
            if (source != null) {
                entityById.putIfAbsent(source.getId(), source);
            }
            if (target != null) {
                entityById.putIfAbsent(target.getId(), target);
            }
        }
        return new TraceCallTopologyReadModel(entityById, edges);
    }

    private List<TraceServiceGraphRow> queryServiceGraphRows(Long start,
                                                             Long end,
                                                             String environment,
                                                             Set<String> seedServiceNames,
                                                             Boolean hideInternal) {
        try {
            return CompletableFuture.supplyAsync(() -> safeList(traceQueryRepository.queryTraceServiceGraphRows(
                            TRACE_ROW_LIMIT, start, end, environment, seedServiceNames, hideInternal)))
                    .get(serviceGraphQueryTimeout.toMillis(), TimeUnit.MILLISECONDS)
                    .stream()
                    .map(this::toTraceServiceGraphRow)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return Collections.emptyList();
        } catch (ExecutionException | TimeoutException | RuntimeException ex) {
            return Collections.emptyList();
        }
    }

    private Set<String> seedServiceNames(Collection<ObserveEntity> seedEntities) {
        Set<String> serviceNames = new LinkedHashSet<>();
        for (ObserveEntity entity : safeList(seedEntities)) {
            if (entity == null) {
                continue;
            }
            addServiceName(serviceNames, entity.getName());
            for (EntityIdentity identity : safeList(findIdentities(entity.getId()))) {
                if (SERVICE_NAME_KEY.equals(identity.getIdentityKey())) {
                    addServiceName(serviceNames, identity.getIdentityValue());
                    addServiceName(serviceNames, identity.getNormalizedValue());
                }
            }
        }
        return serviceNames;
    }

    private void addServiceName(Set<String> serviceNames, String serviceName) {
        if (StringUtils.hasText(serviceName)) {
            serviceNames.add(serviceName.trim());
        }
    }

    private Map<String, ObserveEntity> resolveEntityByService(Collection<ObserveEntity> seedEntities,
                                                              Set<String> observedServices,
                                                              String environment) {
        Map<String, ObserveEntity> entityByService = new LinkedHashMap<>();
        for (ObserveEntity entity : seedEntities) {
            if (entity == null || entity.getId() == null || !matchesEnvironment(entity, environment)) {
                continue;
            }
            addEntityServiceAliases(entityByService, entity, findIdentities(entity.getId()));
            addServiceAlias(entityByService, entity, entity.getName());
        }
        if (observedServices.isEmpty()) {
            return entityByService;
        }
        List<EntityIdentity> matchingIdentities = safeList(entityIdentityQueryService.findMatchingIdentities(
                SERVICE_IDENTITY_KEYS, observedServices));
        Set<Long> matchingEntityIds = matchingIdentities.stream()
                .map(EntityIdentity::getEntityId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        Map<Long, ObserveEntity> accessibleEntityById = new LinkedHashMap<>();
        List<ObserveEntity> rawAccessibleEntities =
                entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(matchingEntityIds);
        List<ObserveEntity> accessibleEntities = safeList(rawAccessibleEntities);
        accessibleEntities.stream()
                .filter(entity -> entity.getId() != null)
                .filter(entity -> matchesEnvironment(entity, environment))
                .forEach(entity -> accessibleEntityById.put(entity.getId(), entity));
        for (EntityIdentity identity : matchingIdentities) {
            ObserveEntity entity = accessibleEntityById.get(identity.getEntityId());
            if (entity == null) {
                continue;
            }
            addServiceAlias(entityByService, entity, identity.getNormalizedValue());
            addServiceAlias(entityByService, entity, identity.getIdentityValue());
        }
        addAccessibleEntityNameFallbacks(entityByService, seedEntities, observedServices, environment);
        return entityByService;
    }

    private void addAccessibleEntityNameFallbacks(Map<String, ObserveEntity> entityByService,
                                                  Collection<ObserveEntity> seedEntities,
                                                  Set<String> observedServices,
                                                  String environment) {
        Set<String> unresolvedServices = observedServices.stream()
                .filter(StringUtils::hasText)
                .filter(serviceName -> !entityByService.containsKey(serviceName))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (unresolvedServices.isEmpty()) {
            return;
        }
        Set<String> preferredNamespaces = seedEntities.stream()
                .filter(Objects::nonNull)
                .map(ObserveEntity::getNamespace)
                .map(this::normalize)
                .filter(StringUtils::hasText)
                .filter(namespace -> !"unknown".equals(namespace))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        Sort sort = Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id"));
        List<ObserveEntity> nameMatchedEntities = safeList(
                        entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(sort))
                .stream()
                .filter(entity -> entity != null && entity.getId() != null)
                .filter(entity -> matchesEnvironment(entity, environment))
                .filter(entity -> unresolvedServices.contains(normalize(entity.getName())))
                .toList();
        nameMatchedEntities.stream()
                .filter(entity -> preferredNamespaces.isEmpty()
                        || preferredNamespaces.contains(normalize(entity.getNamespace())))
                .forEach(entity -> addServiceAlias(entityByService, entity, entity.getName()));
        nameMatchedEntities.forEach(entity -> addServiceAlias(entityByService, entity, entity.getName()));
    }

    private void addEntityServiceAliases(Map<String, ObserveEntity> entityByService,
                                         ObserveEntity entity,
                                         Collection<EntityIdentity> identities) {
        for (EntityIdentity identity : safeList(identities)) {
            if (SERVICE_NAME_KEY.equals(identity.getIdentityKey())) {
                addServiceAlias(entityByService, entity, identity.getNormalizedValue());
                addServiceAlias(entityByService, entity, identity.getIdentityValue());
            }
        }
    }

    private List<EntityIdentity> findIdentities(Long entityId) {
        if (entityId == null) {
            return Collections.emptyList();
        }
        return safeList(entityIdentityQueryService.findIdentities(entityId));
    }

    private List<TraceCallTopologyEdgeInfo> buildTraceCallEdgesFromSpans(List<TraceSpanRow> spans,
                                                                         Map<String, ObserveEntity> entityByService,
                                                                         Collection<ObserveEntity> seedEntities,
                                                                         Long start,
                                                                         Long end) {
        Map<String, TraceSpanRow> spanByTraceAndSpan = new LinkedHashMap<>();
        for (TraceSpanRow span : spans) {
            spanByTraceAndSpan.put(spanKey(span.traceId(), span.spanId()), span);
        }
        Set<Long> seedEntityIds = seedEntities.stream()
                .filter(Objects::nonNull)
                .map(ObserveEntity::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        Map<String, TraceCallEdgeAccumulator> edgeByKey = new LinkedHashMap<>();
        for (TraceSpanRow span : spans) {
            if (!StringUtils.hasText(span.parentSpanId())) {
                continue;
            }
            TraceSpanRow parent = spanByTraceAndSpan.get(spanKey(span.traceId(), span.parentSpanId()));
            if (parent == null || sameService(parent.serviceName(), span.serviceName())) {
                continue;
            }
            ObserveEntity source = entityByService.get(normalize(parent.serviceName()));
            ObserveEntity target = entityByService.get(normalize(span.serviceName()));
            if (source == null || target == null || Objects.equals(source.getId(), target.getId())) {
                continue;
            }
            if (!seedEntityIds.contains(source.getId()) && !seedEntityIds.contains(target.getId())) {
                continue;
            }
            String edgeKey = source.getId() + ":" + target.getId();
            edgeByKey.computeIfAbsent(edgeKey, key -> new TraceCallEdgeAccumulator(source.getId(), target.getId()))
                    .add(span);
        }
        return edgeByKey.values().stream()
                .map(accumulator -> accumulator.toEdge(start, end))
                .toList();
    }

    private List<TraceCallTopologyEdgeInfo> buildTraceCallEdgesFromServiceGraphRows(
            List<TraceServiceGraphRow> rows,
            Map<String, ObserveEntity> entityByService,
            Collection<ObserveEntity> seedEntities,
            Long start,
            Long end) {
        Set<Long> seedEntityIds = seedEntities.stream()
                .filter(Objects::nonNull)
                .map(ObserveEntity::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        List<TraceCallTopologyEdgeInfo> edges = new ArrayList<>();
        for (TraceServiceGraphRow row : rows) {
            ObserveEntity source = entityByService.get(normalize(row.sourceServiceName()));
            ObserveEntity target = entityByService.get(normalize(row.targetServiceName()));
            if (source == null || target == null || Objects.equals(source.getId(), target.getId())) {
                continue;
            }
            if (!seedEntityIds.contains(source.getId()) && !seedEntityIds.contains(target.getId())) {
                continue;
            }
            edges.add(toServiceGraphEdge(row, source.getId(), target.getId(), start, end));
        }
        return edges;
    }

    private TraceCallTopologyEdgeInfo toServiceGraphEdge(TraceServiceGraphRow row,
                                                         Long sourceEntityId,
                                                         Long targetEntityId,
                                                         Long start,
                                                         Long end) {
        long requestCount = Math.max(0L, defaultLong(row.requestCount(), 0L));
        long errorCount = Math.max(0L, defaultLong(row.errorCount(), 0L));
        Double errorRate = requestCount == 0L ? null : (double) errorCount / requestCount;
        String status = errorCount > 0L ? "error" : normalizeTraceStatus(row.status());
        TraceCallTopologyEdgeInfo.RedMetrics redMetrics = new TraceCallTopologyEdgeInfo.RedMetrics(
                requestRatePerSecond(requestCount, start, end),
                requestCount,
                errorRate,
                errorCount,
                row.latencyP95Ms(),
                row.latencyAvgMs());
        String traceId = defaultText(row.traceId(), "aggregate");
        return new TraceCallTopologyEdgeInfo(
                "trace-call:" + sourceEntityId + ":" + targetEntityId + ":" + traceId,
                sourceEntityId,
                targetEntityId,
                traceId,
                row.sampleSpanId(),
                row.spanName(),
                row.firstSeen(),
                row.lastSeen(),
                status,
                scoreForStatus(status),
                redMetrics);
    }

    private TraceSpanRow toTraceSpanRow(Map<String, Object> row) {
        if (CollectionUtils.isEmpty(row)) {
            return null;
        }
        Map<String, Object> resourceAttributes = parseObjectMap(row.get("resource_attributes"));
        String traceId = readText(row, "trace_id");
        String spanId = readText(row, "span_id");
        String serviceName = defaultText(readText(row, "service_name"),
                readObjectText(resourceAttributes, SERVICE_NAME_KEY));
        if (!StringUtils.hasText(traceId) || !StringUtils.hasText(spanId) || !StringUtils.hasText(serviceName)) {
            return null;
        }
        return new TraceSpanRow(
                traceId,
                spanId,
                readText(row, "parent_span_id"),
                defaultText(readText(row, "span_name"), readText(row, "name")),
                serviceName,
                normalizeTraceStatus(readText(row, "span_status_code")),
                readDurationMs(row),
                readText(row, "timestamp")
        );
    }

    private TraceServiceGraphRow toTraceServiceGraphRow(Map<String, Object> row) {
        if (CollectionUtils.isEmpty(row)) {
            return null;
        }
        String sourceService = readText(row, "source_service_name");
        String targetService = readText(row, "target_service_name");
        if (!StringUtils.hasText(sourceService) || !StringUtils.hasText(targetService)
                || sameService(sourceService, targetService)) {
            return null;
        }
        Long requestCount = readLong(row, "request_count");
        Long errorCount = readLong(row, "error_count");
        if (requestCount == null || requestCount <= 0L) {
            return null;
        }
        return new TraceServiceGraphRow(
                sourceService,
                targetService,
                requestCount,
                defaultLong(errorCount, 0L),
                readNumber(row, "latency_p95_ms"),
                readNumber(row, "latency_avg_ms"),
                defaultText(readText(row, "sample_trace_id"), readText(row, "trace_id")),
                defaultText(readText(row, "sample_span_id"), readText(row, "span_id")),
                defaultText(readText(row, "sample_span_name"), readText(row, "span_name")),
                readText(row, "first_seen"),
                readText(row, "last_seen"),
                defaultText(readText(row, "sample_status_code"), readText(row, "span_status_code")));
    }

    private Double readDurationMs(Map<String, Object> row) {
        Double durationMs = firstNumber(row, List.of("duration_ms", "duration_millis", "latency_ms"));
        if (durationMs != null) {
            return durationMs;
        }
        Double durationNanos = firstNumber(row, List.of("duration_nano", "duration_nanos", "duration_ns"));
        return durationNanos == null ? null : durationNanos / 1_000_000D;
    }

    private Double firstNumber(Map<String, Object> row, List<String> keys) {
        for (String key : keys) {
            Double value = readNumber(row, key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private Double readNumber(Map<String, Object> row, String key) {
        if (row == null || !row.containsKey(key)) {
            return null;
        }
        Object value = row.get(key);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            String text = Objects.toString(value, "").trim();
            return StringUtils.hasText(text) ? Double.parseDouble(text) : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long readLong(Map<String, Object> row, String key) {
        Double number = readNumber(row, key);
        return number == null ? null : number.longValue();
    }

    private Map<String, Object> parseObjectMap(Object rawValue) {
        if (rawValue == null) {
            return Collections.emptyMap();
        }
        if (rawValue instanceof Map<?, ?> rawMap) {
            Map<String, Object> result = new LinkedHashMap<>();
            rawMap.forEach((key, value) -> result.put(Objects.toString(key, ""), value));
            return result;
        }
        try {
            String rawText = Objects.toString(rawValue, "").trim();
            if (!StringUtils.hasText(rawText)) {
                return Collections.emptyMap();
            }
            return JSON_MAPPER.readValue(rawText, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    private void addServiceAlias(Map<String, ObserveEntity> entityByService,
                                 ObserveEntity entity,
                                 String serviceName) {
        String normalized = normalize(serviceName);
        if (StringUtils.hasText(normalized)) {
            entityByService.putIfAbsent(normalized, entity);
        }
    }

    private boolean matchesEnvironment(ObserveEntity entity, String environment) {
        if (!StringUtils.hasText(environment) || "all".equalsIgnoreCase(environment.trim())) {
            return true;
        }
        return entity != null && environment.trim().equalsIgnoreCase(entity.getEnvironment());
    }

    private boolean sameService(String left, String right) {
        return Objects.equals(normalize(left), normalize(right));
    }

    private String spanKey(String traceId, String spanId) {
        return traceId + ":" + spanId;
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[\\s._-]+", " ")
                .trim();
        return StringUtils.hasText(normalized) ? normalized : null;
    }

    private String readText(Map<String, Object> row, String key) {
        if (row == null || !row.containsKey(key)) {
            return null;
        }
        String value = Objects.toString(row.get(key), "").trim();
        return StringUtils.hasText(value) ? value : null;
    }

    private String readObjectText(Map<String, Object> row, String key) {
        if (row == null || !row.containsKey(key)) {
            return null;
        }
        String value = Objects.toString(row.get(key), "").trim();
        return StringUtils.hasText(value) ? value : null;
    }

    private String defaultText(String primary, String fallback) {
        return StringUtils.hasText(primary) ? primary : fallback;
    }

    private String normalizeTraceStatus(String status) {
        String normalized = normalize(status);
        return normalized != null && normalized.contains("error") ? "error" : "active";
    }

    private Integer scoreForStatus(String status) {
        return "error".equals(status) ? 60 : 95;
    }

    private Double requestRatePerSecond(long requestCount, Long start, Long end) {
        if (requestCount <= 0L || start == null || end == null || end <= start) {
            return null;
        }
        double windowSeconds = Math.max(1D, (end - start) / 1000D);
        return requestCount / windowSeconds;
    }

    private Double percentile95(List<Double> values) {
        if (values.isEmpty()) {
            return null;
        }
        List<Double> sortedValues = values.stream().sorted().toList();
        int index = Math.max(0, (int) Math.ceil(sortedValues.size() * 0.95D) - 1);
        return sortedValues.get(Math.min(index, sortedValues.size() - 1));
    }

    private Double average(List<Double> values) {
        if (values.isEmpty()) {
            return null;
        }
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0D);
    }

    private ObserveEntity findEntityById(Collection<ObserveEntity> entities, Long entityId) {
        if (entityId == null) {
            return null;
        }
        return entities.stream()
                .filter(Objects::nonNull)
                .filter(entity -> Objects.equals(entityId, entity.getId()))
                .findFirst()
                .orElse(null);
    }

    private Long defaultLong(Long value, Long fallback) {
        return value == null ? fallback : value;
    }

    private class TraceCallEdgeAccumulator {

        private final Long sourceEntityId;
        private final Long targetEntityId;
        private final List<Double> durationMs = new ArrayList<>();
        private long requestCount;
        private long errorCount;
        private String traceId;
        private String sampleSpanId;
        private String spanName;
        private String firstSeen;
        private String lastSeen;
        private String status;
        private Integer score;

        private TraceCallEdgeAccumulator(Long sourceEntityId, Long targetEntityId) {
            this.sourceEntityId = sourceEntityId;
            this.targetEntityId = targetEntityId;
        }

        private void add(TraceSpanRow span) {
            requestCount++;
            if ("error".equals(span.status())) {
                errorCount++;
            }
            if (span.durationMs() != null) {
                durationMs.add(span.durationMs());
            }
            if (span.timestamp() != null && (firstSeen == null || span.timestamp().compareTo(firstSeen) < 0)) {
                firstSeen = span.timestamp();
            }
            if (span.timestamp() != null && (lastSeen == null || span.timestamp().compareTo(lastSeen) > 0)) {
                lastSeen = span.timestamp();
            }
            if (traceId == null || ("error".equals(span.status()) && !"error".equals(status))) {
                traceId = span.traceId();
                sampleSpanId = span.spanId();
                spanName = span.spanName();
                status = span.status();
                score = scoreForStatus(span.status());
            }
        }

        private TraceCallTopologyEdgeInfo toEdge(Long start, Long end) {
            String edgeKey = sourceEntityId + ":" + targetEntityId;
            Long metricErrorCount = errorCount;
            Long metricRequestCount = requestCount;
            Double errorRate = metricRequestCount == 0L ? null : (double) metricErrorCount / metricRequestCount;
            TraceCallTopologyEdgeInfo.RedMetrics redMetrics = new TraceCallTopologyEdgeInfo.RedMetrics(
                    requestRatePerSecond(metricRequestCount, start, end),
                    metricRequestCount,
                    errorRate,
                    metricErrorCount,
                    percentile95(durationMs),
                    average(durationMs));
            return new TraceCallTopologyEdgeInfo(
                    "trace-call:" + edgeKey + ":" + traceId,
                    sourceEntityId,
                    targetEntityId,
                    traceId,
                    sampleSpanId,
                    spanName,
                    firstSeen,
                    lastSeen,
                    status,
                    score,
                    redMetrics);
        }
    }

    private <T> List<T> safeList(Collection<T> values) {
        if (values == null) {
            return Collections.emptyList();
        }
        if (values instanceof List<T> list) {
            return list;
        }
        return new ArrayList<>(values);
    }

    private record TraceSpanRow(String traceId,
                                String spanId,
                                String parentSpanId,
                                String spanName,
                                String serviceName,
                                String status,
                                Double durationMs,
                                String timestamp) {
    }

    private record TraceServiceGraphRow(String sourceServiceName,
                                        String targetServiceName,
                                        Long requestCount,
                                        Long errorCount,
                                        Double latencyP95Ms,
                                        Double latencyAvgMs,
                                        String traceId,
                                        String sampleSpanId,
                                        String spanName,
                                        String firstSeen,
                                        String lastSeen,
                                        String status) {
    }
}
