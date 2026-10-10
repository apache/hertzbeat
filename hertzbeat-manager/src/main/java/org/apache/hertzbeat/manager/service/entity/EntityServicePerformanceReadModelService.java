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

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityApmRedView;
import org.apache.hertzbeat.manager.pojo.dto.EntityServicePerformancePage;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Resolves a bounded authorized catalog population before ranking RED summaries and paging. */
@Service
@RequiredArgsConstructor
public class EntityServicePerformanceReadModelService {
    private static final int CANDIDATE_LIMIT = 500;
    private static final Set<String> SORTS = Set.of("requestCount", "errorCount", "errorRate", "latencyP95Ms", "name");
    private final EntityCatalogQueryService catalog;
    private final EntityWorkspaceAccessService access;
    private final EntityIdentityQueryService identities;
    private final EntityListReadModelService summaries;
    private final ObjectProvider<ApmRedQueryRepository> repositories;

    public EntityServicePerformancePage query(String search, String environment, long start, long end,
                                              String sort, String order, int pageIndex, int pageSize) {
        String workspace = access.currentRequestWorkspaceId();
        if (!StringUtils.hasText(workspace) || start < 0 || end <= start
                || end - start > ApmRedQueryRepository.MAX_WINDOW_MILLIS || sort == null || !SORTS.contains(sort)
                || !("asc".equals(order) || "desc".equals(order)) || pageIndex < 0
                || !Set.of(10, 20, 50).contains(pageSize)) {
            throw new ObservabilityQueryRequestException();
        }
        try {
            var candidates = catalog.findEntityPage(null, "service", null, trim(search), null, null,
                    trim(environment), null, null, null, "id", "asc", 0, CANDIDATE_LIMIT + 1, workspace);
            if (candidates.getTotalElements() > CANDIDATE_LIMIT || candidates.getNumberOfElements() > CANDIDATE_LIMIT) {
                return page("scope_too_large", candidates.getTotalElements(), start, end, sort, order, pageIndex, pageSize, List.of());
            }
            List<ObserveEntity> entities = candidates.getContent();
            if (candidates.getTotalElements() != entities.size()) {
                return page("unavailable", null, start, end, sort, order, pageIndex, pageSize, List.of());
            }
            if (entities.stream().anyMatch(entity -> !workspace.equals(entity.getWorkspaceId()) || !"service".equals(entity.getType()))) {
                return page("unavailable", null, start, end, sort, order, pageIndex, pageSize, List.of());
            }
            if (entities.isEmpty()) {
                return page("ready", 0L, start, end, sort, order, pageIndex, pageSize, List.of());
            }
            List<Ranked> ranked = rank(entities, workspace, start, end);
            if (ranked == null) {
                return page("unavailable", null, start, end, sort, order, pageIndex, pageSize, List.of());
            }
            List<Ranked> selected = ranked.stream().sorted(comparator(sort, order))
                    .skip((long) pageIndex * pageSize).limit(pageSize).toList();
            Map<Long, EntitySummaryInfo> metadata = selected.isEmpty() ? Map.of() : summaries.summarizeEntities(
                    selected.stream().map(Ranked::entity).toList(), workspace).stream()
                    .collect(Collectors.toMap(item -> item.getEntity().getId(), Function.identity()));
            List<EntityServicePerformancePage.Row> rows = selected.stream().map(item -> {
                EntitySummaryInfo entity = metadata.get(item.entity().getId());
                if (entity == null) {
                    throw new IllegalStateException("Ranked entity summary is missing");
                }
                String state = item.identity() == null ? "unresolved" : item.summary() == null ? "empty" : "ready";
                return new EntityServicePerformancePage.Row(entity, item.identity(), state, item.summary());
            }).toList();
            return page("ready", (long) entities.size(), start, end, sort, order, pageIndex, pageSize, rows);
        } catch (RuntimeException exception) {
            return page("unavailable", null, start, end, sort, order, pageIndex, pageSize, List.of());
        }
    }

    private List<Ranked> rank(List<ObserveEntity> entities, String workspace, long start, long end) {
        Set<Long> ids = entities.stream().map(ObserveEntity::getId).collect(Collectors.toSet());
        Map<Long, List<EntityIdentity>> owned = identities.findIdentities(workspace, ids).stream()
                .collect(Collectors.groupingBy(EntityIdentity::getEntityId));
        Map<Long, EntityApmRedView.Identity> resolved = new java.util.LinkedHashMap<>();
        for (ObserveEntity entity : entities) {
            var identity = EntityApmRedReadModelService.resolveIdentity(entity, owned.getOrDefault(entity.getId(), List.of()));
            if (StringUtils.hasText(identity.serviceName())) {
                resolved.put(entity.getId(), identity);
            }
        }
        var scopes = resolved.values().stream().map(identity -> new ApmRedQueryRepository.ApmRedQuery(
                start, end, workspace, identity.entityId(), identity.entityType(), identity.serviceName(),
                identity.serviceNamespace(), identity.deploymentEnvironment())).toList();
        Map<String, ApmRedQueryRepository.ApmRedSummary> values = Map.of();
        if (!scopes.isEmpty()) {
            ApmRedQueryRepository repository = repositories.getIfAvailable();
            if (repository == null) {
                return null;
            }
            var result = repository.querySummaries(scopes);
            if (result == null || !result.available()) {
                return null;
            }
            values = result.summaries();
            if (values.values().stream().anyMatch(summary -> !validSummary(summary))) {
                return null;
            }
            if (values.keySet().stream().anyMatch(id -> scopes.stream().noneMatch(scope -> scope.entityId().equals(id)))) {
                return null;
            }
        }
        Map<String, ApmRedQueryRepository.ApmRedSummary> results = values;
        return entities.stream().map(entity -> new Ranked(entity, resolved.get(entity.getId()),
                results.containsKey(entity.getId().toString())
                        ? EntityApmRedReadModelService.toSummary(results.get(entity.getId().toString())) : null)).toList();
    }

    private boolean validSummary(ApmRedQueryRepository.ApmRedSummary summary) {
        return summary.requestCount() > 0 && summary.errorCount() >= 0
                && summary.errorCount() <= summary.requestCount()
                && Double.isFinite(summary.requestRatePerSecond()) && summary.requestRatePerSecond() >= 0
                && Double.isFinite(summary.errorRate()) && summary.errorRate() >= 0 && summary.errorRate() <= 1
                && validLatency(summary.latencyAverageMs()) && validLatency(summary.latencyP95Ms());
    }

    private boolean validLatency(Double value) {
        return value == null || Double.isFinite(value) && value >= 0;
    }

    private Comparator<Ranked> comparator(String sort, String order) {
        Comparator<Ranked> comparison;
        if ("name".equals(sort)) {
            Comparator<String> direction = "desc".equals(order) ? Comparator.reverseOrder() : Comparator.naturalOrder();
            comparison = Comparator.comparing(row -> {
                String name = row.identity() == null ? row.entity().getName() : row.identity().serviceName();
                return name == null ? null : name.toLowerCase(Locale.ROOT);
            }, Comparator.nullsLast(direction));
        } else {
            Comparator<BigDecimal> direction = "desc".equals(order) ? Comparator.reverseOrder() : Comparator.naturalOrder();
            comparison = Comparator.comparing(row -> value(row.summary(), sort), Comparator.nullsLast(direction));
        }
        return comparison.thenComparing(row -> row.entity().getId());
    }

    private BigDecimal value(EntityApmRedView.RedSummary summary, String sort) {
        if (summary == null) {
            return null;
        }
        return switch (sort) {
            case "requestCount" -> BigDecimal.valueOf(summary.requestCount());
            case "errorCount" -> BigDecimal.valueOf(summary.errorCount());
            case "errorRate" -> BigDecimal.valueOf(summary.errorRate());
            case "latencyP95Ms" -> summary.latencyP95Ms() == null ? null : BigDecimal.valueOf(summary.latencyP95Ms());
            default -> throw new ObservabilityQueryRequestException();
        };
    }

    private EntityServicePerformancePage page(String state, Long total, long start, long end,
                                               String sort, String order, int index, int size,
                                               List<EntityServicePerformancePage.Row> content) {
        return new EntityServicePerformancePage(state, CANDIDATE_LIMIT, total, index, size, sort, order,
                new EntityApmRedView.Window(start, end), "observed_server_spans", "greptime_flow", 60, content);
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private record Ranked(ObserveEntity entity, EntityApmRedView.Identity identity, EntityApmRedView.RedSummary summary) {
    }
}
