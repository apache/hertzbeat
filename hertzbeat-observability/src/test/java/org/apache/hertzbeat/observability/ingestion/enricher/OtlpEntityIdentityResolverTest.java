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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OtlpEntityIdentityResolverTest {

    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    private OtlpEntityIdentityResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new OtlpEntityIdentityResolver(List.of(workspaceQueryGateway));
    }

    @Test
    void enrichesMetricsWithUniqueEntityIdFromCanonicalResourceIdentityInWorkspace() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(eq("prod-west"), anySet(), anySet()))
                .thenReturn(List.of(identity(42L, "service.name", "Checkout", "checkout", 90, true)));
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(42L)))
                .thenReturn(Map.of(42L, entity(42L, "prod-west")));

        ExportMetricsServiceRequest enriched = resolver.enrichMetrics(metricsRequest(
                stringAttribute("service.name", " Checkout "),
                stringAttribute("service.namespace", "Commerce")), "prod-west");

        Map<String, String> attributes = metricResourceAttributes(enriched);
        assertEquals("42", attributes.get("hertzbeat.entity_id"));
        assertEquals("service", attributes.get("hertzbeat.entity_type"));
        assertEquals("Checkout API", attributes.get("hertzbeat.entity_name"));
        assertEquals(" Checkout ", attributes.get("service.name"));
    }

    @Test
    void prefersEntityWithMostCanonicalEvidenceOverBroadPrimaryIdentity() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(eq("prod-west"), anySet(), anySet()))
                .thenReturn(List.of(
                        identity(41L, "service.name", "checkout", "checkout", 150, true),
                        identity(42L, "service.name", "checkout", "checkout", 90, true),
                        identity(42L, "service.namespace", "commerce", "commerce", 30, false),
                        identity(42L, "deployment.environment.name", "prod", "prod", 20, false)));
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(41L, 42L)))
                .thenReturn(Map.of(
                        41L, entity(41L, "prod-west", "service", "checkout", "Checkout Broad"),
                        42L, entity(42L, "prod-west", "service", "checkout", "Checkout API")));

        Optional<String> resolved = resolver.resolveEntityId(Map.of(
                "service.name", "checkout",
                "service.namespace", "commerce",
                "deployment.environment.name", "prod"), "prod-west");

        assertEquals(Optional.of("42"), resolved);
    }

    @Test
    void doesNotResolveEntityWhenCanonicalEvidenceIsSplitAcrossEntities() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(eq("prod-west"), anySet(), anySet()))
                .thenReturn(List.of(
                        identity(41L, "service.name", "checkout", "checkout", 90, true),
                        identity(41L, "deployment.environment.name", "prod", "prod", 20, false),
                        identity(42L, "service.name", "checkout", "checkout", 90, true),
                        identity(42L, "service.namespace", "commerce", "commerce", 30, false)));
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(41L, 42L)))
                .thenReturn(Map.of(41L, entity(41L, "prod-west"), 42L, entity(42L, "prod-west")));

        Optional<String> resolved = resolver.resolveEntityId(Map.of(
                "service.name", "checkout",
                "service.namespace", "commerce",
                "deployment.environment.name", "prod"), "prod-west");

        assertTrue(resolved.isEmpty());
        ArgumentCaptor<Map<Long, String>> entityRefsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(workspaceQueryGateway).recordEntityDiscoveryGovernanceActivity(
                eq("prod-west"),
                eq("identity_conflict"),
                eq("needs_governance"),
                eq("OTLP resource identity matched multiple entities"),
                org.mockito.ArgumentMatchers.contains("service.name=checkout"),
                entityRefsCaptor.capture());
        assertEquals(Map.of(41L, "Checkout API", 42L, "Checkout API"), entityRefsCaptor.getValue());
    }

    @Test
    void keepsResourceUnattributedWhenCanonicalIdentityIsMissing() {
        Optional<String> resolved = resolver.resolveEntityId(Map.of("http.route", "/checkout"), "prod-west");

        assertTrue(resolved.isEmpty());
        verifyNoInteractions(workspaceQueryGateway);
    }

    @Test
    void doesNotResolveEntityWhenBestMatchIsAmbiguous() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(eq("prod-west"), anySet(), anySet()))
                .thenReturn(List.of(
                        identity(42L, "service.name", "checkout", "checkout", 90, true),
                        identity(43L, "service.name", "checkout", "checkout", 90, true)));
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(42L, 43L)))
                .thenReturn(Map.of(42L, entity(42L, "prod-west"), 43L, entity(43L, "prod-west")));

        Optional<String> resolved = resolver.resolveEntityId(Map.of("service.name", "checkout"), "prod-west");

        assertTrue(resolved.isEmpty());
    }

    @Test
    void doesNotResolveEntityOutsideAuthenticatedWorkspace() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(eq("prod-west"), anySet(), anySet()))
                .thenReturn(List.of(identity(42L, "service.name", "checkout", "checkout", 90, true)));
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(42L)))
                .thenReturn(Map.of(42L, entity(42L, "other-workspace")));

        Optional<String> resolved = resolver.resolveEntityId(Map.of("service.name", "checkout"), "prod-west");

        assertTrue(resolved.isEmpty());
    }

    @Test
    void keepsMetricsUnchangedWhenWorkspaceIdentityLookupFails() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(eq("prod-west"), anySet(), anySet()))
                .thenThrow(new IllegalStateException("workspace query down"));

        ExportMetricsServiceRequest enriched = assertDoesNotThrow(() -> resolver.enrichMetrics(metricsRequest(
                stringAttribute("service.name", "checkout")), "prod-west"));

        assertTrue(metricResourceAttributes(enriched).containsKey("service.name"));
        assertTrue(!metricResourceAttributes(enriched).containsKey("hertzbeat.entity_id"));
    }

    @Test
    void batchesCanonicalIdentityResolutionAcrossTheMetricsRequest() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                "prod-west", Set.of("service.name"), Set.of("checkout", "payments")))
                .thenReturn(List.of(
                        identity(42L, "service.name", "checkout", "checkout", 90, true),
                        identity(43L, "service.name", "payments", "payments", 90, true)));
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(42L, 43L)))
                .thenReturn(Map.of(
                        42L, entity(42L, "prod-west", "service", "checkout", "Checkout API"),
                        43L, entity(43L, "prod-west", "service", "payments", "Payments API")));

        ExportMetricsServiceRequest enriched = resolver.enrichMetrics(metricsRequest(List.of(
                resource(stringAttribute("service.name", "checkout")),
                resource(stringAttribute("service.name", "checkout")),
                resource(stringAttribute("service.name", "payments")))), "prod-west");

        assertEquals("42", metricResourceAttributes(enriched, 0).get("hertzbeat.entity_id"));
        assertEquals("42", metricResourceAttributes(enriched, 1).get("hertzbeat.entity_id"));
        assertEquals("43", metricResourceAttributes(enriched, 2).get("hertzbeat.entity_id"));
        verify(workspaceQueryGateway, times(1)).findIdentitiesByKeysAndNormalizedValues(
                "prod-west", Set.of("service.name"), Set.of("checkout", "payments"));
        verify(workspaceQueryGateway, times(1)).findEntitiesByIds("prod-west", Set.of(42L, 43L));
    }

    @Test
    void chunksLargeRequestsIntoBoundedIdentityAndEntityLookups() {
        List<Resource> resources = IntStream.range(0, 1_200)
                .mapToObj(index -> resource(stringAttribute("service.name", "service-" + index)))
                .toList();
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                eq("prod-west"), eq(Set.of("service.name")), anySet()))
                .thenAnswer(invocation -> {
                    Set<String> values = invocation.getArgument(2);
                    return values.stream()
                            .map(value -> {
                                long entityId = Long.parseLong(value.substring("service-".length())) + 1;
                                return identity(entityId, "service.name", value, value, 90, true);
                            })
                            .toList();
                });
        when(workspaceQueryGateway.findEntitiesByIds(eq("prod-west"), anySet()))
                .thenAnswer(invocation -> {
                    Set<Long> entityIds = invocation.getArgument(1);
                    Map<Long, ObserveEntity> entities = new LinkedHashMap<>();
                    entityIds.forEach(entityId -> entities.put(entityId,
                            entity(entityId, "prod-west", "service", "service-" + (entityId - 1),
                                    "Service " + (entityId - 1))));
                    return entities;
                });

        ExportMetricsServiceRequest enriched = resolver.enrichMetrics(metricsRequest(resources), "prod-west");

        assertEquals("1", metricResourceAttributes(enriched, 0).get("hertzbeat.entity_id"));
        assertEquals("1200", metricResourceAttributes(enriched, 1_199).get("hertzbeat.entity_id"));
        ArgumentCaptor<Set<String>> identityValues = ArgumentCaptor.forClass(Set.class);
        verify(workspaceQueryGateway, times(3)).findIdentitiesByKeysAndNormalizedValues(
                eq("prod-west"), eq(Set.of("service.name")), identityValues.capture());
        assertTrue(identityValues.getAllValues().stream().allMatch(values -> values.size() <= 512));
        assertEquals(1_200, identityValues.getAllValues().stream()
                .flatMap(Set::stream)
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .size());
        ArgumentCaptor<Set<Long>> entityIds = ArgumentCaptor.forClass(Set.class);
        verify(workspaceQueryGateway, times(3)).findEntitiesByIds(eq("prod-west"), entityIds.capture());
        assertTrue(entityIds.getAllValues().stream().allMatch(ids -> ids.size() <= 512));
        assertEquals(1_200, entityIds.getAllValues().stream()
                .flatMap(Set::stream)
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .size());
    }

    @Test
    void rejectsUnknownClientEntityIdAndUsesCanonicalResolution() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(
                "prod-west", Set.of("service.name"), Set.of("checkout")))
                .thenReturn(List.of(identity(42L, "service.name", "checkout", "checkout", 90, true)));
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(42L, 999L)))
                .thenReturn(Map.of(42L, entity(42L, "prod-west")));

        ExportMetricsServiceRequest enriched = resolver.enrichMetrics(metricsRequest(
                stringAttribute("hertzbeat.entity_id", "999"),
                stringAttribute("hertzbeat.entity_type", "forged"),
                stringAttribute("hertzbeat.entity_name", "Forged Entity"),
                stringAttribute("service.name", "checkout")), "prod-west");

        Map<String, String> attributes = metricResourceAttributes(enriched);
        assertEquals("42", attributes.get("hertzbeat.entity_id"));
        assertEquals("service", attributes.get("hertzbeat.entity_type"));
        assertEquals("Checkout API", attributes.get("hertzbeat.entity_name"));
    }

    @Test
    void acceptsClientEntityIdOnlyAfterWorkspaceScopedValidation() {
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(42L)))
                .thenReturn(Map.of(42L, entity(42L, "prod-west")));

        ExportMetricsServiceRequest enriched = resolver.enrichMetrics(metricsRequest(
                stringAttribute("hertzbeat.entity_id", "42")), "prod-west");

        Map<String, String> attributes = metricResourceAttributes(enriched);
        assertEquals("42", attributes.get("hertzbeat.entity_id"));
        assertEquals("service", attributes.get("hertzbeat.entity_type"));
        assertEquals("Checkout API", attributes.get("hertzbeat.entity_name"));
        verify(workspaceQueryGateway).findEntitiesByIds("prod-west", Set.of(42L));
    }

    @Test
    void removesUnknownClientEntityIdWhenNoCanonicalIdentityCanResolveIt() {
        when(workspaceQueryGateway.findEntitiesByIds("prod-west", Set.of(999L)))
                .thenReturn(Map.of());

        ExportMetricsServiceRequest enriched = resolver.enrichMetrics(metricsRequest(
                stringAttribute("hertzbeat.entity_id", "999"),
                stringAttribute("hertzbeat.entity_type", "forged"),
                stringAttribute("hertzbeat.entity_name", "Forged Entity")), "prod-west");

        Map<String, String> attributes = metricResourceAttributes(enriched);
        assertTrue(!attributes.containsKey("hertzbeat.entity_id"));
        assertTrue(!attributes.containsKey("hertzbeat.entity_type"));
        assertTrue(!attributes.containsKey("hertzbeat.entity_name"));
    }

    private ExportMetricsServiceRequest metricsRequest(KeyValue... resourceAttributes) {
        return metricsRequest(List.of(resource(resourceAttributes)));
    }

    private ExportMetricsServiceRequest metricsRequest(List<Resource> resources) {
        ExportMetricsServiceRequest.Builder request = ExportMetricsServiceRequest.newBuilder();
        resources.forEach(resource -> request.addResourceMetrics(ResourceMetrics.newBuilder()
                .setResource(resource)
                .build()));
        return request.build();
    }

    private Resource resource(KeyValue... resourceAttributes) {
        return Resource.newBuilder().addAllAttributes(List.of(resourceAttributes)).build();
    }

    private KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value).build())
                .build();
    }

    private Map<String, String> metricResourceAttributes(ExportMetricsServiceRequest request) {
        return metricResourceAttributes(request, 0);
    }

    private Map<String, String> metricResourceAttributes(ExportMetricsServiceRequest request, int index) {
        return request.getResourceMetrics(index)
                .getResource()
                .getAttributesList()
                .stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }

    private EntityIdentity identity(Long entityId, String key, String value, String normalizedValue,
                                    int priority, boolean primary) {
        return EntityIdentity.builder()
                .entityId(entityId)
                .identityKey(key)
                .identityValue(value)
                .normalizedValue(normalizedValue)
                .priority(priority)
                .primaryIdentity(primary)
                .build();
    }

    private ObserveEntity entity(Long entityId, String workspaceId) {
        return entity(entityId, workspaceId, "service", "checkout", "Checkout API");
    }

    private ObserveEntity entity(Long entityId, String workspaceId, String type, String name, String displayName) {
        return ObserveEntity.builder()
                .id(entityId)
                .workspaceId(workspaceId)
                .type(type)
                .name(name)
                .displayName(displayName)
                .status("unknown")
                .build();
    }
}
