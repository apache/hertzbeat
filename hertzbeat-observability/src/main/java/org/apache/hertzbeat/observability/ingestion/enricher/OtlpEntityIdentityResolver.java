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
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
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

    private final List<ObservabilityWorkspaceQueryGateway> workspaceQueryGateways;

    public OtlpEntityIdentityResolver(List<ObservabilityWorkspaceQueryGateway> workspaceQueryGateways) {
        this.workspaceQueryGateways = workspaceQueryGateways == null ? List.of() : List.copyOf(workspaceQueryGateways);
    }

    public ExportMetricsServiceRequest enrichMetrics(ExportMetricsServiceRequest request, String workspaceId) {
        if (request == null || request.getResourceMetricsCount() == 0) {
            return request;
        }
        ExportMetricsServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceMetrics();
        for (ResourceMetrics resourceMetrics : request.getResourceMetricsList()) {
            requestBuilder.addResourceMetrics(resourceMetrics.toBuilder()
                    .setResource(enrichResource(resourceMetrics.getResource(), workspaceId))
                    .build());
        }
        return requestBuilder.build();
    }

    public ExportLogsServiceRequest enrichLogs(ExportLogsServiceRequest request, String workspaceId) {
        if (request == null || request.getResourceLogsCount() == 0) {
            return request;
        }
        ExportLogsServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceLogs();
        for (ResourceLogs resourceLogs : request.getResourceLogsList()) {
            requestBuilder.addResourceLogs(resourceLogs.toBuilder()
                    .setResource(enrichResource(resourceLogs.getResource(), workspaceId))
                    .build());
        }
        return requestBuilder.build();
    }

    public ExportTraceServiceRequest enrichTraces(ExportTraceServiceRequest request, String workspaceId) {
        if (request == null || request.getResourceSpansCount() == 0) {
            return request;
        }
        ExportTraceServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceSpans();
        for (ResourceSpans resourceSpans : request.getResourceSpansList()) {
            requestBuilder.addResourceSpans(resourceSpans.toBuilder()
                    .setResource(enrichResource(resourceSpans.getResource(), workspaceId))
                    .build());
        }
        return requestBuilder.build();
    }

    public Optional<String> resolveEntityId(Map<String, String> resourceAttributes, String workspaceId) {
        return resolveEntity(resourceAttributes, workspaceId).map(entity -> String.valueOf(entity.getId()));
    }

    private Optional<ObserveEntity> resolveEntity(Map<String, String> resourceAttributes, String workspaceId) {
        ObservabilityWorkspaceQueryGateway workspaceQueryGateway = workspaceQueryGateway();
        String safeWorkspaceId = StringUtils.trimToNull(workspaceId);
        if (workspaceQueryGateway == null || safeWorkspaceId == null || resourceAttributes == null
                || resourceAttributes.isEmpty()) {
            return Optional.empty();
        }
        Map<String, String> normalizedIdentities = normalizedCanonicalIdentities(resourceAttributes);
        if (normalizedIdentities.isEmpty()) {
            return Optional.empty();
        }
        try {
            List<EntityIdentity> matchedIdentities = nullToEmpty(
                    workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                            normalizedIdentities.keySet(), Set.copyOf(normalizedIdentities.values())));
            Map<Long, EntityIdentityMatch> scores = scoreMatchingIdentities(matchedIdentities, normalizedIdentities);
            if (scores.isEmpty()) {
                return Optional.empty();
            }
            Map<Long, ObserveEntity> entities =
                    Optional.ofNullable(workspaceQueryGateway.findEntitiesByIds(scores.keySet()))
                            .orElseGet(Collections::emptyMap);
            Map<Long, EntityIdentityMatch> workspaceScores = scores.entrySet().stream()
                    .filter(entry -> workspaceMatches(entities.get(entry.getKey()), safeWorkspaceId))
                    .collect(LinkedHashMap::new, (map, entry) -> map.put(entry.getKey(), entry.getValue()), Map::putAll);
            if (workspaceScores.isEmpty()) {
                return Optional.empty();
            }
            int topScore = workspaceScores.values().stream()
                    .mapToInt(EntityIdentityMatch::matchedIdentityCount)
                    .max()
                    .orElse(0);
            List<Long> topEntityIds = workspaceScores.entrySet().stream()
                    .filter(entry -> entry.getValue().matchedIdentityCount() == topScore)
                    .map(Map.Entry::getKey)
                    .sorted()
                    .toList();
            if (topEntityIds.size() != 1) {
                recordIdentityConflict(workspaceQueryGateway, safeWorkspaceId, normalizedIdentities,
                        topEntityIds, entities);
                return Optional.empty();
            }
            return Optional.ofNullable(entities.get(topEntityIds.getFirst()));
        } catch (RuntimeException ex) {
            log.warn("Failed to resolve OTLP resource entity identity for workspace {}: {}",
                    safeWorkspaceId, ex.toString());
            return Optional.empty();
        }
    }

    private Resource enrichResource(Resource resource, String workspaceId) {
        Map<String, String> resourceAttributes = stringAttributes(resource.getAttributesList());
        if (StringUtils.isNotBlank(resourceAttributes.get(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID))) {
            return resource;
        }
        Optional<ObserveEntity> entity = resolveEntity(resourceAttributes, workspaceId);
        if (entity.isEmpty() || entity.get().getId() == null) {
            return resource;
        }
        ObserveEntity resolvedEntity = entity.get();
        Resource.Builder resourceBuilder = resource.toBuilder()
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

    private Map<Long, EntityIdentityMatch> scoreMatchingIdentities(List<EntityIdentity> matchedIdentities,
                                                                  Map<String, String> normalizedIdentities) {
        Map<Long, EntityIdentityMatch> scores = new LinkedHashMap<>();
        for (EntityIdentity identity : matchedIdentities) {
            if (identity == null || identity.getEntityId() == null
                    || StringUtils.isBlank(identity.getIdentityKey())) {
                continue;
            }
            String expectedValue = normalizedIdentities.get(identity.getIdentityKey());
            if (expectedValue == null || !expectedValue.equals(normalizedIdentityValue(identity))) {
                continue;
            }
            scores.computeIfAbsent(identity.getEntityId(), ignored -> new EntityIdentityMatch())
                    .add(identity);
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

    private static final class EntityIdentityMatch {

        private final Set<String> matchedIdentityKeys = new java.util.LinkedHashSet<>();

        private void add(EntityIdentity identity) {
            matchedIdentityKeys.add(identity.getIdentityKey());
        }

        private int matchedIdentityCount() {
            return matchedIdentityKeys.size();
        }
    }
}
