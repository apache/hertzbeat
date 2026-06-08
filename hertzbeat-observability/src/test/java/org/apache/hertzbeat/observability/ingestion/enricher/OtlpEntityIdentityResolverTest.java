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
import static org.mockito.Mockito.when;

import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(anySet(), anySet()))
                .thenReturn(List.of(identity(42L, "service.name", "Checkout", "checkout", 90, true)));
        when(workspaceQueryGateway.findEntitiesByIds(Set.of(42L)))
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
    void doesNotResolveEntityWhenBestMatchIsAmbiguous() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(anySet(), anySet()))
                .thenReturn(List.of(
                        identity(42L, "service.name", "checkout", "checkout", 90, true),
                        identity(43L, "service.name", "checkout", "checkout", 90, true)));
        when(workspaceQueryGateway.findEntitiesByIds(Set.of(42L, 43L)))
                .thenReturn(Map.of(42L, entity(42L, "prod-west"), 43L, entity(43L, "prod-west")));

        Optional<String> resolved = resolver.resolveEntityId(Map.of("service.name", "checkout"), "prod-west");

        assertTrue(resolved.isEmpty());
    }

    @Test
    void doesNotResolveEntityOutsideAuthenticatedWorkspace() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(anySet(), anySet()))
                .thenReturn(List.of(identity(42L, "service.name", "checkout", "checkout", 90, true)));
        when(workspaceQueryGateway.findEntitiesByIds(Set.of(42L)))
                .thenReturn(Map.of(42L, entity(42L, "other-workspace")));

        Optional<String> resolved = resolver.resolveEntityId(Map.of("service.name", "checkout"), "prod-west");

        assertTrue(resolved.isEmpty());
    }

    @Test
    void keepsMetricsUnchangedWhenWorkspaceIdentityLookupFails() {
        when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(anySet(), anySet()))
                .thenThrow(new IllegalStateException("workspace query down"));

        ExportMetricsServiceRequest enriched = assertDoesNotThrow(() -> resolver.enrichMetrics(metricsRequest(
                stringAttribute("service.name", "checkout")), "prod-west"));

        assertTrue(metricResourceAttributes(enriched).containsKey("service.name"));
        assertTrue(!metricResourceAttributes(enriched).containsKey("hertzbeat.entity_id"));
    }

    private ExportMetricsServiceRequest metricsRequest(KeyValue... resourceAttributes) {
        return ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder().addAllAttributes(List.of(resourceAttributes)).build())
                        .build())
                .build();
    }

    private KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value).build())
                .build();
    }

    private Map<String, String> metricResourceAttributes(ExportMetricsServiceRequest request) {
        return request.getResourceMetrics(0)
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
        return ObserveEntity.builder()
                .id(entityId)
                .workspaceId(workspaceId)
                .type("service")
                .name("checkout")
                .displayName("Checkout API")
                .status("unknown")
                .build();
    }
}
