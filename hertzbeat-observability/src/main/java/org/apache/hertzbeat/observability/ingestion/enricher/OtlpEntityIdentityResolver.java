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

package org.apache.hertzbeat.observability.ingestion.enricher;

import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.model.EntityCanonicalIdentityRegistry;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.springframework.stereotype.Service;

/**
 * Resolves OTLP resource identities to existing HertzBeat entities when there is one clear workspace match.
 */
@Slf4j
@Service
public class OtlpEntityIdentityResolver {

    private static final String GOVERNANCE_ACTION_IDENTITY_CONFLICT = "identity_conflict";
    private static final String GOVERNANCE_STATUS_NEEDS_GOVERNANCE = "needs_governance";
    private static final String GOVERNANCE_SUMMARY_IDENTITY_CONFLICT =
            "OTLP resource identity matched multiple entities";
    private static final int LOOKUP_BATCH_SIZE = 512;
    private static final Set<String> SERVER_OWNED_ENTITY_ATTRIBUTES = Set.of(
            OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID,
            OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE,
            OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_NAME);

    private final List<ObservabilityWorkspaceQueryGateway> workspaceQueryGateways;

    public OtlpEntityIdentityResolver(List<ObservabilityWorkspaceQueryGateway> workspaceQueryGateways) {
        this.workspaceQueryGateways = workspaceQueryGateways == null ? List.of() : List.copyOf(workspaceQueryGateways);
    }

    public ExportMetricsServiceRequest enrichMetrics(ExportMetricsServiceRequest request, String workspaceId) {
        if (request == null || request.getResourceMetricsCount() == 0) {
            return request;
        }
        List<Resource> enrichedResources = enrichResources(request.getResourceMetricsList().stream()
                .map(ResourceMetrics::getResource)
                .toList(), workspaceId);
        ExportMetricsServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceMetrics();
        for (int index = 0; index < request.getResourceMetricsCount(); index++) {
            ResourceMetrics resourceMetrics = request.getResourceMetrics(index);
            requestBuilder.addResourceMetrics(resourceMetrics.toBuilder()
                    .setResource(enrichedResources.get(index))
                    .build());
        }
        return requestBuilder.build();
    }

    public ExportLogsServiceRequest enrichLogs(ExportLogsServiceRequest request, String workspaceId) {
        if (request == null || request.getResourceLogsCount() == 0) {
            return request;
        }
        List<Resource> enrichedResources = enrichResources(request.getResourceLogsList().stream()
                .map(ResourceLogs::getResource)
                .toList(), workspaceId);
        ExportLogsServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceLogs();
        for (int index = 0; index < request.getResourceLogsCount(); index++) {
            ResourceLogs resourceLogs = request.getResourceLogs(index);
            requestBuilder.addResourceLogs(resourceLogs.toBuilder()
                    .setResource(enrichedResources.get(index))
                    .build());
        }
        return requestBuilder.build();
    }

    public ExportTraceServiceRequest enrichTraces(ExportTraceServiceRequest request, String workspaceId) {
        if (request == null || request.getResourceSpansCount() == 0) {
            return request;
        }
        List<Resource> enrichedResources = enrichResources(request.getResourceSpansList().stream()
                .map(ResourceSpans::getResource)
                .toList(), workspaceId);
        ExportTraceServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceSpans();
        for (int index = 0; index < request.getResourceSpansCount(); index++) {
            ResourceSpans resourceSpans = request.getResourceSpans(index);
            requestBuilder.addResourceSpans(resourceSpans.toBuilder()
                    .setResource(enrichedResources.get(index))
                    .build());
        }
        return requestBuilder.build();
    }

    public Optional<String> resolveEntityId(Map<String, String> resourceAttributes, String workspaceId) {
        ObservabilityWorkspaceQueryGateway workspaceQueryGateway = workspaceQueryGateway();
        String safeWorkspaceId = StringUtils.trimToNull(workspaceId);
        if (workspaceQueryGateway == null || safeWorkspaceId == null || resourceAttributes == null
                || resourceAttributes.isEmpty()) {
            return Optional.empty();
        }
        Map<String, String> normalizedIdentities = normalizedCanonicalIdentities(resourceAttributes);
        ResourceCandidate candidate = ResourceCandidate.fromAttributes(resourceAttributes,
                normalizedIdentities, submittedEntityId(resourceAttributes));
        if (!candidate.requiresResolution()) {
            return Optional.empty();
        }
        try {
            return resolveCandidates(List.of(candidate), workspaceQueryGateway, safeWorkspaceId)
                    .getFirst()
                    .entity()
                    .map(entity -> String.valueOf(entity.getId()));
        } catch (RuntimeException ex) {
            log.warn("Failed to resolve OTLP resource entity identity for workspace {}: {}",
                    safeWorkspaceId, ex.toString());
            return Optional.empty();
        }
    }

    private List<Resource> enrichResources(List<Resource> resources, String workspaceId) {
        if (resources == null || resources.isEmpty()) {
            return List.of();
        }
        List<ResourceCandidate> candidates = resources.stream()
                .map(this::resourceCandidate)
                .toList();
        ObservabilityWorkspaceQueryGateway workspaceQueryGateway = workspaceQueryGateway();
        String safeWorkspaceId = StringUtils.trimToNull(workspaceId);
        if (workspaceQueryGateway == null || safeWorkspaceId == null) {
            return candidates.stream().map(this::withoutUntrustedEntityAttributes).toList();
        }
        try {
            List<EntityResolution> resolutions = resolveCandidates(candidates, workspaceQueryGateway, safeWorkspaceId);
            List<Resource> enrichedResources = new ArrayList<>(candidates.size());
            for (int index = 0; index < candidates.size(); index++) {
                enrichedResources.add(applyResolution(candidates.get(index), resolutions.get(index)));
            }
            return List.copyOf(enrichedResources);
        } catch (RuntimeException ex) {
            log.warn("Failed to resolve OTLP resource entity identities for workspace {}: {}",
                    safeWorkspaceId, ex.toString());
            return candidates.stream().map(this::withoutUntrustedEntityAttributes).toList();
        }
    }

    private List<EntityResolution> resolveCandidates(List<ResourceCandidate> candidates,
                                                     ObservabilityWorkspaceQueryGateway workspaceQueryGateway,
                                                     String workspaceId) {
        Map<String, Set<String>> valuesByIdentityKey = canonicalValuesByIdentityKey(candidates);
        Map<IdentityPair, Set<Long>> entityIdsByIdentityPair = new LinkedHashMap<>();
        for (String identityKey : EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS) {
            Set<String> normalizedValues = valuesByIdentityKey.get(identityKey);
            if (normalizedValues == null || normalizedValues.isEmpty()) {
                continue;
            }
            forEachBatch(normalizedValues, valueBatch ->
                indexIdentityEntityIds(
                        nullToEmpty(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                                workspaceId, Set.of(identityKey), valueBatch)),
                        entityIdsByIdentityPair));
        }

        Map<Map<String, String>, Map<Long, EntityIdentityMatch>> scoresByFingerprint = new LinkedHashMap<>();
        Set<Long> entityIds = new LinkedHashSet<>();
        for (ResourceCandidate candidate : candidates) {
            if (!candidate.normalizedIdentities().isEmpty()) {
                scoresByFingerprint.computeIfAbsent(candidate.normalizedIdentities(), ignored -> {
                    Map<Long, EntityIdentityMatch> scores = scoreMatchingIdentities(
                            entityIdsByIdentityPair, candidate.normalizedIdentities());
                    entityIds.addAll(scores.keySet());
                    return scores;
                });
            }
            if (candidate.submittedEntityId() != null) {
                entityIds.add(candidate.submittedEntityId());
            }
        }

        Map<Long, ObserveEntity> entities = findWorkspaceEntities(
                workspaceQueryGateway, workspaceId, entityIds);
        Map<Map<String, String>, EntityResolution> canonicalResolutions = new LinkedHashMap<>();
        List<EntityResolution> resolutions = new ArrayList<>(candidates.size());
        for (ResourceCandidate candidate : candidates) {
            EntityResolution canonicalResolution = canonicalResolutions.computeIfAbsent(
                    candidate.normalizedIdentities(),
                    ignored -> resolveCanonicalCandidate(
                            candidate.normalizedIdentities(),
                            scoresByFingerprint.getOrDefault(candidate.normalizedIdentities(), Map.of()),
                            entities,
                            workspaceQueryGateway,
                            workspaceId));
            resolutions.add(mergeSubmittedEntityHint(candidate, canonicalResolution, entities));
        }
        return List.copyOf(resolutions);
    }

    private Map<String, Set<String>> canonicalValuesByIdentityKey(List<ResourceCandidate> candidates) {
        Map<String, Set<String>> valuesByIdentityKey = new LinkedHashMap<>();
        for (ResourceCandidate candidate : candidates) {
            candidate.normalizedIdentities().forEach((key, value) ->
                    valuesByIdentityKey.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(value));
        }
        return valuesByIdentityKey;
    }

    private void indexIdentityEntityIds(List<EntityIdentity> identities,
                                        Map<IdentityPair, Set<Long>> entityIdsByIdentityPair) {
        for (EntityIdentity identity : identities) {
            if (identity == null || identity.getEntityId() == null
                    || StringUtils.isBlank(identity.getIdentityKey())) {
                continue;
            }
            String normalizedValue = normalizedIdentityValue(identity);
            if (normalizedValue == null) {
                continue;
            }
            IdentityPair pair = new IdentityPair(identity.getIdentityKey(), normalizedValue);
            entityIdsByIdentityPair.computeIfAbsent(pair, ignored -> new LinkedHashSet<>())
                    .add(identity.getEntityId());
        }
    }

    private Map<Long, ObserveEntity> findWorkspaceEntities(
            ObservabilityWorkspaceQueryGateway workspaceQueryGateway,
            String workspaceId,
            Set<Long> entityIds) {
        if (entityIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, ObserveEntity> found = new LinkedHashMap<>();
        forEachBatch(entityIds, entityIdBatch ->
            found.putAll(Optional.ofNullable(
                            workspaceQueryGateway.findEntitiesByIds(workspaceId, entityIdBatch))
                    .orElseGet(Map::of)));
        Map<Long, ObserveEntity> workspaceEntities = new LinkedHashMap<>();
        for (Long entityId : entityIds) {
            ObserveEntity entity = found.get(entityId);
            if (workspaceMatches(entity, workspaceId)) {
                workspaceEntities.put(entityId, entity);
            }
        }
        return workspaceEntities;
    }

    private <T> void forEachBatch(Set<T> values, Consumer<Set<T>> consumer) {
        if (values.size() <= LOOKUP_BATCH_SIZE) {
            consumer.accept(Set.copyOf(values));
            return;
        }
        Set<T> batch = new LinkedHashSet<>(LOOKUP_BATCH_SIZE);
        for (T value : values) {
            batch.add(value);
            if (batch.size() == LOOKUP_BATCH_SIZE) {
                consumer.accept(Set.copyOf(batch));
                batch.clear();
            }
        }
        if (!batch.isEmpty()) {
            consumer.accept(Set.copyOf(batch));
        }
    }

    private EntityResolution resolveCanonicalCandidate(
            Map<String, String> normalizedIdentities,
            Map<Long, EntityIdentityMatch> scores,
            Map<Long, ObserveEntity> entities,
            ObservabilityWorkspaceQueryGateway workspaceQueryGateway,
            String workspaceId) {
        if (normalizedIdentities.isEmpty() || scores.isEmpty()) {
            return EntityResolution.unresolved();
        }
        int topScore = 0;
        List<Long> topEntityIds = new ArrayList<>();
        for (Map.Entry<Long, EntityIdentityMatch> entry : scores.entrySet()) {
            if (!entities.containsKey(entry.getKey())) {
                continue;
            }
            int score = entry.getValue().matchedIdentityCount();
            if (score > topScore) {
                topScore = score;
                topEntityIds.clear();
            }
            if (score == topScore) {
                topEntityIds.add(entry.getKey());
            }
        }
        if (topEntityIds.isEmpty()) {
            return EntityResolution.unresolved();
        }
        topEntityIds.sort(Long::compareTo);
        if (topEntityIds.size() != 1) {
            recordIdentityConflict(workspaceQueryGateway, workspaceId, normalizedIdentities,
                    topEntityIds, entities);
            return EntityResolution.ambiguous();
        }
        return EntityResolution.resolved(entities.get(topEntityIds.getFirst()));
    }

    private EntityResolution mergeSubmittedEntityHint(ResourceCandidate candidate,
                                                       EntityResolution canonicalResolution,
                                                       Map<Long, ObserveEntity> entities) {
        if (canonicalResolution.status() != ResolutionStatus.UNRESOLVED) {
            return canonicalResolution;
        }
        ObserveEntity submittedEntity = candidate.submittedEntityId() == null
                ? null
                : entities.get(candidate.submittedEntityId());
        return submittedEntity == null
                ? EntityResolution.unresolved()
                : EntityResolution.resolved(submittedEntity);
    }

    private ResourceCandidate resourceCandidate(Resource resource) {
        Map<String, String> attributes = stringAttributes(resource.getAttributesList());
        Map<String, String> normalizedIdentities = normalizedCanonicalIdentities(attributes);
        return new ResourceCandidate(
                resource,
                normalizedIdentities,
                submittedEntityId(attributes),
                hasServerOwnedEntityAttributes(resource));
    }

    private Resource applyResolution(ResourceCandidate candidate, EntityResolution resolution) {
        if (resolution.entity().isEmpty()) {
            return withoutUntrustedEntityAttributes(candidate);
        }
        ObserveEntity resolvedEntity = resolution.entity().get();
        Resource.Builder resourceBuilder = withoutServerOwnedEntityAttributes(candidate.resource()).toBuilder()
                .addAttributes(stringAttribute(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID,
                        String.valueOf(resolvedEntity.getId())));
        String entityType = StringUtils.trimToNull(resolvedEntity.getType());
        if (entityType != null) {
            resourceBuilder.addAttributes(stringAttribute(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE,
                    entityType));
        }
        String entityName = StringUtils.trimToNull(
                StringUtils.defaultIfBlank(resolvedEntity.getDisplayName(), resolvedEntity.getName()));
        if (entityName != null) {
            resourceBuilder.addAttributes(stringAttribute(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_NAME,
                    entityName));
        }
        return resourceBuilder.build();
    }

    private Resource withoutUntrustedEntityAttributes(ResourceCandidate candidate) {
        return candidate.hasServerOwnedEntityAttributes()
                ? withoutServerOwnedEntityAttributes(candidate.resource())
                : candidate.resource();
    }

    private Resource withoutServerOwnedEntityAttributes(Resource resource) {
        Resource.Builder resourceBuilder = resource.toBuilder().clearAttributes();
        resource.getAttributesList().stream()
                .filter(attribute -> !SERVER_OWNED_ENTITY_ATTRIBUTES.contains(attribute.getKey()))
                .forEach(resourceBuilder::addAttributes);
        return resourceBuilder.build();
    }

    private boolean hasServerOwnedEntityAttributes(Resource resource) {
        return resource.getAttributesList().stream()
                .anyMatch(attribute -> SERVER_OWNED_ENTITY_ATTRIBUTES.contains(attribute.getKey()));
    }

    private Long submittedEntityId(Map<String, String> resourceAttributes) {
        String rawEntityId = StringUtils.trimToNull(
                resourceAttributes.get(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID));
        if (rawEntityId == null) {
            return null;
        }
        try {
            long entityId = Long.parseLong(rawEntityId);
            return entityId > 0 ? entityId : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway() {
        return workspaceQueryGateways.stream().filter(Objects::nonNull).findFirst().orElse(null);
    }

    private Map<String, String> normalizedCanonicalIdentities(Map<String, String> resourceAttributes) {
        Map<String, String> normalized = new LinkedHashMap<>();
        for (String identityKey : EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS) {
            String value = StringUtils.trimToNull(resourceAttributes.get(identityKey));
            if (value != null) {
                normalized.put(identityKey, normalizeIdentityValue(value));
            }
        }
        return normalized;
    }

    private Map<Long, EntityIdentityMatch> scoreMatchingIdentities(
            Map<IdentityPair, Set<Long>> entityIdsByIdentityPair,
            Map<String, String> normalizedIdentities) {
        Map<Long, EntityIdentityMatch> scores = new LinkedHashMap<>();
        for (Map.Entry<String, String> identityEntry : normalizedIdentities.entrySet()) {
            IdentityPair pair = new IdentityPair(identityEntry.getKey(), identityEntry.getValue());
            for (Long entityId : entityIdsByIdentityPair.getOrDefault(pair, Set.of())) {
                scores.computeIfAbsent(entityId, ignored -> new EntityIdentityMatch())
                        .add(identityEntry.getKey());
            }
        }
        return scores;
    }

    private String normalizedIdentityValue(EntityIdentity identity) {
        return StringUtils.defaultIfBlank(identity.getNormalizedValue(),
                normalizeIdentityValue(identity.getIdentityValue()));
    }

    private String normalizeIdentityValue(String value) {
        return value == null ? null : value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private boolean workspaceMatches(ObserveEntity entity, String workspaceId) {
        if (entity == null || StringUtils.isBlank(workspaceId)) {
            return false;
        }
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId)
                .equals(AuthTokenScopes.normalizeWorkspaceId(entity.getWorkspaceId()));
    }

    private void recordIdentityConflict(ObservabilityWorkspaceQueryGateway workspaceQueryGateway,
                                        String workspaceId,
                                        Map<String, String> normalizedIdentities,
                                        List<Long> candidateEntityIds,
                                        Map<Long, ObserveEntity> entities) {
        if (candidateEntityIds == null || candidateEntityIds.size() <= 1) {
            return;
        }
        Map<Long, String> entityRefs = new LinkedHashMap<>();
        for (Long entityId : candidateEntityIds) {
            ObserveEntity entity = entities.get(entityId);
            if (entity == null) {
                continue;
            }
            entityRefs.put(entityId, StringUtils.defaultIfBlank(entity.getDisplayName(), entity.getName()));
        }
        workspaceQueryGateway.recordEntityDiscoveryGovernanceActivity(
                workspaceId,
                GOVERNANCE_ACTION_IDENTITY_CONFLICT,
                GOVERNANCE_STATUS_NEEDS_GOVERNANCE,
                GOVERNANCE_SUMMARY_IDENTITY_CONFLICT,
                "canonicalIdentities=" + normalizedIdentities + "; candidateEntityIds=" + candidateEntityIds,
                entityRefs);
    }

    private List<EntityIdentity> nullToEmpty(List<EntityIdentity> identities) {
        return identities == null ? List.of() : identities;
    }

    private Map<String, String> stringAttributes(List<KeyValue> attributes) {
        if (attributes == null || attributes.isEmpty()) {
            return Map.of();
        }
        return attributes.stream()
                .filter(attribute -> attribute != null && attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right,
                        LinkedHashMap::new));
    }

    private KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value).build())
                .build();
    }

    private enum ResolutionStatus {
        RESOLVED,
        UNRESOLVED,
        AMBIGUOUS
    }

    private record EntityResolution(ResolutionStatus status, Optional<ObserveEntity> entity) {

        private static EntityResolution resolved(ObserveEntity entity) {
            return new EntityResolution(ResolutionStatus.RESOLVED, Optional.of(Objects.requireNonNull(entity)));
        }

        private static EntityResolution unresolved() {
            return new EntityResolution(ResolutionStatus.UNRESOLVED, Optional.empty());
        }

        private static EntityResolution ambiguous() {
            return new EntityResolution(ResolutionStatus.AMBIGUOUS, Optional.empty());
        }
    }

    private record IdentityPair(String identityKey, String normalizedValue) {
    }

    private record ResourceCandidate(Resource resource,
                                     Map<String, String> normalizedIdentities,
                                     Long submittedEntityId,
                                     boolean hasServerOwnedEntityAttributes) {

        private ResourceCandidate {
            normalizedIdentities = Map.copyOf(normalizedIdentities);
        }

        private static ResourceCandidate fromAttributes(Map<String, String> resourceAttributes,
                                                        Map<String, String> normalizedIdentities,
                                                        Long submittedEntityId) {
            boolean hasServerOwnedAttributes = resourceAttributes.keySet().stream()
                    .anyMatch(SERVER_OWNED_ENTITY_ATTRIBUTES::contains);
            return new ResourceCandidate(Resource.getDefaultInstance(), normalizedIdentities,
                    submittedEntityId, hasServerOwnedAttributes);
        }

        private boolean requiresResolution() {
            return submittedEntityId != null || !normalizedIdentities.isEmpty();
        }
    }

    private static final class EntityIdentityMatch {

        private final Set<String> matchedIdentityKeys = new LinkedHashSet<>();

        private void add(String identityKey) {
            matchedIdentityKeys.add(identityKey);
        }

        private int matchedIdentityCount() {
            return matchedIdentityKeys.size();
        }
    }
}
