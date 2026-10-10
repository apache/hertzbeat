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

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository.EntityKey;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository.Relationship;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository.RelationshipQuery;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Resolves optional telemetry-derived semantic edges back to authoritative HertzBeat entities.
 */
@Slf4j
@Service
public class EntitySemanticRelationQueryService {

    public static final String RELATION_SOURCE = "greptime-semantic";
    private static final long DEFAULT_WINDOW_MILLIS = 900_000L;
    private static final long MAX_WINDOW_MILLIS = SemanticGraphQueryRepository.MAX_WINDOW_MILLIS;
    private static final int MAX_ALIASES_PER_ENTITY = 4;
    private static final int MAX_IDENTITY_CANDIDATES = 1_024;

    private static final Map<String, Set<String>> IDENTITY_KEYS_BY_TYPE = Map.of(
            "service", Set.of("job", "service.name"),
            "service.instance", Set.of("instance", "service.instance.id"),
            "host", Set.of("host.id", "host.name"),
            "k8s.pod", Set.of("k8s.pod.name", "k8s.pod.uid", "pod"),
            "k8s.node", Set.of("k8s.node.name", "k8s.node.uid", "node"),
            "process", Set.of("process.executable.name", "process.pid"));

    private final ObjectProvider<SemanticGraphQueryRepository> repositoryProvider;
    private final EntityIdentityQueryService entityIdentityQueryService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final Clock clock;

    @Autowired
    public EntitySemanticRelationQueryService(
            ObjectProvider<SemanticGraphQueryRepository> repositoryProvider,
            EntityIdentityQueryService entityIdentityQueryService,
            EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this(repositoryProvider, entityIdentityQueryService, entityWorkspaceAccessService, Clock.systemUTC());
    }

    EntitySemanticRelationQueryService(
            ObjectProvider<SemanticGraphQueryRepository> repositoryProvider,
            EntityIdentityQueryService entityIdentityQueryService,
            EntityWorkspaceAccessService entityWorkspaceAccessService,
            Clock clock) {
        this.repositoryProvider = repositoryProvider;
        this.entityIdentityQueryService = entityIdentityQueryService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.clock = clock;
    }

    public SemanticRelationReadModel findRelations(String workspaceId,
                                                   Collection<ObserveEntity> seedEntities,
                                                   Long start,
                                                   Long end) {
        SemanticGraphQueryRepository repository = repositoryProvider.getIfAvailable();
        TimeWindow window = timeWindow(start, end);
        List<ObserveEntity> seeds = safeEntities(seedEntities);
        if (repository == null || window == null || seeds.isEmpty() || !StringUtils.hasText(workspaceId)) {
            return SemanticRelationReadModel.empty();
        }

        Set<Long> seedIds = seeds.stream()
                .map(ObserveEntity::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        List<EntityIdentity> seedIdentities = entityIdentityQueryService.findIdentities(workspaceId, seedIds);
        AliasIndex aliases = new AliasIndex();
        Map<Long, List<EntityIdentity>> identitiesByEntity = identitiesByEntity(seedIdentities);
        Map<Long, ObserveEntity> entityById = new LinkedHashMap<>();
        for (ObserveEntity entity : seeds) {
            entityById.put(entity.getId(), entity);
            registerEntityAliases(aliases, entity, identitiesByEntity.getOrDefault(entity.getId(), List.of()));
        }
        Set<EntityKey> queryKeys = preferredQueryKeys(seeds, identitiesByEntity, aliases);
        if (queryKeys.isEmpty()) {
            return SemanticRelationReadModel.empty();
        }

        try {
            var queryResult = repository.queryRelationships(new RelationshipQuery(
                    queryKeys, window.start(), window.end(), SemanticGraphQueryRepository.MAX_RELATIONSHIPS));
            if (!queryResult.available() || queryResult.relationships().isEmpty()) {
                return SemanticRelationReadModel.empty();
            }
            resolveUnknownEndpoints(workspaceId, queryResult.relationships(), aliases, entityById);
            List<EntityRelation> relations = toEntityRelations(queryResult.relationships(), aliases);
            return relations.isEmpty()
                    ? SemanticRelationReadModel.empty()
                    : new SemanticRelationReadModel(entityById, relations);
        } catch (RuntimeException exception) {
            log.debug("Optional semantic relationship evidence is unavailable: {}", exception.getMessage());
            return SemanticRelationReadModel.empty();
        }
    }

    private TimeWindow timeWindow(Long requestedStart, Long requestedEnd) {
        long now = clock.millis();
        long end = requestedEnd == null ? now : Math.min(requestedEnd, now);
        long start = requestedStart == null ? Math.max(0L, end - DEFAULT_WINDOW_MILLIS) : requestedStart;
        if (start < 0 || end <= start || end - start > MAX_WINDOW_MILLIS) {
            return null;
        }
        return new TimeWindow(start, end);
    }

    private List<ObserveEntity> safeEntities(Collection<ObserveEntity> entities) {
        if (CollectionUtils.isEmpty(entities)) {
            return List.of();
        }
        return entities.stream()
                .filter(Objects::nonNull)
                .filter(entity -> entity.getId() != null)
                .filter(entity -> StringUtils.hasText(entity.getType()))
                .filter(entity -> StringUtils.hasText(entity.getName()))
                .limit(SemanticGraphQueryRepository.MAX_QUERY_ENTITIES)
                .toList();
    }

    private Map<Long, List<EntityIdentity>> identitiesByEntity(Collection<EntityIdentity> identities) {
        Map<Long, List<EntityIdentity>> grouped = new LinkedHashMap<>();
        if (identities == null) {
            return grouped;
        }
        for (EntityIdentity identity : identities) {
            if (identity != null && identity.getEntityId() != null) {
                grouped.computeIfAbsent(identity.getEntityId(), ignored -> new ArrayList<>()).add(identity);
            }
        }
        grouped.values().forEach(values -> values.sort(Comparator
                .comparing(EntityIdentity::isPrimaryIdentity).reversed()
                .thenComparing(EntityIdentity::getPriority, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(EntityIdentity::getId, Comparator.nullsLast(Comparator.naturalOrder()))));
        return grouped;
    }

    private void registerEntityAliases(AliasIndex aliases,
                                       ObserveEntity entity,
                                       Collection<EntityIdentity> identities) {
        String type = canonicalType(entity.getType());
        aliases.register(type, entity.getName(), entity);
        int accepted = 1;
        for (EntityIdentity identity : identities) {
            if (accepted >= MAX_ALIASES_PER_ENTITY) {
                break;
            }
            if (identity == null || !isIdentityCompatible(type, identity.getIdentityKey())) {
                continue;
            }
            accepted += aliases.register(type, identity.getNormalizedValue(), entity) ? 1 : 0;
            if (accepted < MAX_ALIASES_PER_ENTITY) {
                accepted += aliases.register(type, identity.getIdentityValue(), entity) ? 1 : 0;
            }
        }
    }

    private Set<EntityKey> preferredQueryKeys(List<ObserveEntity> entities,
                                              Map<Long, List<EntityIdentity>> identitiesByEntity,
                                              AliasIndex aliases) {
        Set<EntityKey> queryKeys = new LinkedHashSet<>();
        for (ObserveEntity entity : entities) {
            String type = canonicalType(entity.getType());
            List<EntityIdentity> identities = identitiesByEntity.getOrDefault(entity.getId(), List.of());
            for (EntityIdentity identity : identities) {
                if (identity != null && identity.isPrimaryIdentity()
                        && isIdentityCompatible(type, identity.getIdentityKey())) {
                    EntityKey key = key(type, identity.getNormalizedValue());
                    if (key != null && aliases.resolvesTo(key, entity.getId())) {
                        queryKeys.add(key);
                        break;
                    }
                }
            }
            if (queryKeys.stream().noneMatch(key -> aliases.resolvesTo(key, entity.getId()))) {
                EntityKey nameKey = key(type, entity.getName());
                if (nameKey != null && aliases.resolvesTo(nameKey, entity.getId())) {
                    queryKeys.add(nameKey);
                }
            }
        }
        return queryKeys.stream().limit(SemanticGraphQueryRepository.MAX_QUERY_ENTITIES)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private void resolveUnknownEndpoints(String workspaceId,
                                         Collection<Relationship> relationships,
                                         AliasIndex aliases,
                                         Map<Long, ObserveEntity> entityById) {
        Set<EntityKey> unresolved = relationships.stream()
                .flatMap(relationship -> java.util.stream.Stream.of(
                        relationship.source(), relationship.target()))
                .filter(key -> aliases.resolve(key) == null)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (unresolved.isEmpty()) {
            return;
        }
        Set<String> values = unresolved.stream().map(EntityKey::id)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        Set<String> identityKeys = unresolved.stream()
                .flatMap(key -> identityKeys(key.type()).stream())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (identityKeys.isEmpty()) {
            return;
        }
        List<EntityIdentity> matching = entityIdentityQueryService.findMatchingIdentities(
                workspaceId, identityKeys, values, MAX_IDENTITY_CANDIDATES + 1);
        if (matching.size() > MAX_IDENTITY_CANDIDATES) {
            log.debug("Skip semantic endpoint resolution because identity candidates exceeded {}",
                    MAX_IDENTITY_CANDIDATES);
            return;
        }
        Set<Long> entityIds = matching.stream()
                .map(EntityIdentity::getEntityId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        List<ObserveEntity> accessible = entityWorkspaceAccessService.findAccessibleEntitiesByIds(
                entityIds, workspaceId);
        Map<Long, List<EntityIdentity>> identitiesByEntity = identitiesByEntity(matching);
        for (ObserveEntity entity : accessible) {
            if (entity != null && entity.getId() != null) {
                registerEntityAliases(aliases, entity,
                        identitiesByEntity.getOrDefault(entity.getId(), List.of()));
            }
        }
        unresolved.stream()
                .map(aliases::resolve)
                .filter(Objects::nonNull)
                .forEach(entity -> entityById.putIfAbsent(entity.getId(), entity));
    }

    private List<EntityRelation> toEntityRelations(Collection<Relationship> relationships, AliasIndex aliases) {
        Map<String, EntityRelation> relationByKey = new LinkedHashMap<>();
        for (Relationship relationship : relationships) {
            ObserveEntity source = aliases.resolve(relationship.source());
            ObserveEntity target = aliases.resolve(relationship.target());
            if (source == null || target == null || Objects.equals(source.getId(), target.getId())) {
                continue;
            }
            String relationType = bounded(relationship.relationType(), 32);
            if (!StringUtils.hasText(relationType)) {
                continue;
            }
            String key = source.getId() + ":" + target.getId() + ":" + relationType;
            relationByKey.putIfAbsent(key, EntityRelation.builder()
                    .sourceEntityId(source.getId())
                    .targetEntityId(target.getId())
                    .relationType(relationType)
                    .relationSource(RELATION_SOURCE)
                    .status("observed")
                    .score((int) Math.round(relationship.confidence() * 100D))
                    .attributes(relationshipAttributes(relationship))
                    .gmtUpdate(LocalDateTime.ofInstant(relationship.observedAt(), ZoneOffset.UTC))
                    .build());
        }
        return new ArrayList<>(relationByKey.values());
    }

    private Map<String, String> relationshipAttributes(Relationship relationship) {
        Map<String, String> attributes = new LinkedHashMap<>();
        attributes.put("provenance", bounded(relationship.provenance(), 64));
        attributes.put("observedAt", relationship.observedAt().toString());
        attributes.put("requestCount", String.valueOf(relationship.requestCount()));
        attributes.put("errorCount", String.valueOf(relationship.errorCount()));
        if (relationship.durationCount() > 0) {
            attributes.put("durationAverageSeconds",
                    String.valueOf(relationship.durationSum() / relationship.durationCount()));
        }
        return attributes;
    }

    private boolean isIdentityCompatible(String entityType, String identityKey) {
        return StringUtils.hasText(identityKey) && identityKeys(entityType).contains(identityKey.trim());
    }

    private Set<String> identityKeys(String entityType) {
        return IDENTITY_KEYS_BY_TYPE.getOrDefault(canonicalType(entityType), Set.of());
    }

    private String canonicalType(String type) {
        if (!StringUtils.hasText(type)) {
            return "";
        }
        String normalized = type.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "pod", "k8s-pod", "k8s_pod" -> "k8s.pod";
            case "node", "k8s-node", "k8s_node" -> "k8s.node";
            case "instance", "service-instance", "service_instance" -> "service.instance";
            default -> normalized;
        };
    }

    private EntityKey key(String type, String value) {
        if (!StringUtils.hasText(type) || !StringUtils.hasText(value)) {
            return null;
        }
        try {
            return new EntityKey(type, value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private String bounded(String value, int maximumLength) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String normalized = value.trim();
        return normalized.length() <= maximumLength ? normalized : normalized.substring(0, maximumLength);
    }

    private record TimeWindow(long start, long end) {
    }

    private final class AliasIndex {

        private final Map<EntityKey, ObserveEntity> resolved = new HashMap<>();
        private final Set<EntityKey> ambiguous = new LinkedHashSet<>();

        private boolean register(String type, String value, ObserveEntity entity) {
            EntityKey key = key(type, value);
            if (key == null || ambiguous.contains(key)) {
                return false;
            }
            ObserveEntity previous = resolved.putIfAbsent(key, entity);
            if (previous != null && !Objects.equals(previous.getId(), entity.getId())) {
                resolved.remove(key);
                ambiguous.add(key);
                return false;
            }
            return previous == null;
        }

        private ObserveEntity resolve(EntityKey key) {
            return ambiguous.contains(key) ? null : resolved.get(key);
        }

        private boolean resolvesTo(EntityKey key, Long entityId) {
            ObserveEntity entity = resolve(key);
            return entity != null && Objects.equals(entity.getId(), entityId);
        }
    }
}
