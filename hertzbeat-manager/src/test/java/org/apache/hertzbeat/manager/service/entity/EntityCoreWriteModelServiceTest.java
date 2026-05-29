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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogContact;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogLink;
import org.apache.hertzbeat.common.entity.manager.EntityOwnerRef;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for core catalog write-field application extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityCoreWriteModelServiceTest {

    private EntityCoreWriteModelService coreWriteModelService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Mock
    private ObserveEntityDao observeEntityDao;

    @BeforeEach
    void setUp() {
        coreWriteModelService = new EntityCoreWriteModelService(entityWorkspaceAccessService, observeEntityDao);
    }

    @Test
    void applyEntityCoreCopiesCatalogMetadataAndResolvesWorkspace() {
        ObserveEntity target = ObserveEntity.builder()
                .id(10L)
                .source("previous")
                .workspaceId("target-workspace")
                .build();
        ObserveEntity source = ObserveEntity.builder()
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .subtype("spring-service")
                .namespace("payments")
                .environment("prod")
                .status("degraded")
                .criticality("high")
                .owner("team-payments")
                .additionalOwners(List.of(new EntityOwnerRef("platform", "team")))
                .runbook("https://runbooks.local/checkout")
                .lifecycle("production")
                .tier("tier1")
                .system("commerce")
                .componentOf(List.of("system:commerce"))
                .components(List.of("service:cart", "service:payment"))
                .implementedBy(List.of("service:checkout-worker"))
                .apiInterface(JsonUtil.fromJson("{\"fileRef\":\"https://schema.local/checkout.yaml\"}"))
                .inheritFrom("service:base")
                .languages(List.of("java", "typescript"))
                .links(List.of(new EntityCatalogLink("repository", "repository", "github",
                        "https://git.local/checkout")))
                .contacts(List.of(new EntityCatalogContact("slack", "slack", "#checkout", "#checkout")))
                .integrations(JsonUtil.fromJson("{\"pagerduty\":{\"service\":\"checkout\"}}"))
                .extensions(JsonUtil.fromJson("{\"hertzbeat.apache.org/catalog\":{\"custom\":\"value\"}}"))
                .hertzbeat(JsonUtil.fromJson("{\"logs\":[{\"name\":\"errors\",\"query\":\"service:checkout\"}]}"))
                .source("definition")
                .description("Checkout service")
                .labels(Map.of("team", "payments"))
                .tags(List.of(" primary ", "primary", " ", "tier:gold"))
                .workspaceId("source-workspace")
                .build();
        when(entityWorkspaceAccessService.resolveWriteWorkspaceId("source-workspace", "target-workspace"))
                .thenReturn("team-a");

        coreWriteModelService.applyEntityCore(target, source, "manual");

        assertEquals("service", target.getType());
        assertEquals("checkout-api", target.getName());
        assertEquals("Checkout API", target.getDisplayName());
        assertEquals("spring-service", target.getSubtype());
        assertEquals("payments", target.getNamespace());
        assertEquals("prod", target.getEnvironment());
        assertEquals("degraded", target.getStatus());
        assertEquals("high", target.getCriticality());
        assertEquals("team-payments", target.getOwner());
        assertEquals(List.of(new EntityOwnerRef("platform", "team")), target.getAdditionalOwners());
        assertEquals("https://runbooks.local/checkout", target.getRunbook());
        assertEquals("production", target.getLifecycle());
        assertEquals("tier1", target.getTier());
        assertEquals("commerce", target.getSystem());
        assertEquals(List.of("system:commerce"), target.getComponentOf());
        assertEquals(List.of("service:cart", "service:payment"), target.getComponents());
        assertEquals(List.of("service:checkout-worker"), target.getImplementedBy());
        assertEquals("https://schema.local/checkout.yaml", target.getApiInterface().get("fileRef").asText());
        assertEquals("service:base", target.getInheritFrom());
        assertEquals(List.of("java", "typescript"), target.getLanguages());
        assertEquals("github", target.getLinks().getFirst().getProvider());
        assertEquals("#checkout", target.getContacts().getFirst().getContact());
        assertEquals("checkout", target.getIntegrations().get("pagerduty").get("service").asText());
        assertEquals("value", target.getExtensions().get("hertzbeat.apache.org/catalog").get("custom").asText());
        assertEquals("service:checkout", target.getHertzbeat().get("logs").get(0).get("query").asText());
        assertEquals("definition", target.getSource());
        assertEquals("Checkout service", target.getDescription());
        assertEquals(Map.of("team", "payments"), target.getLabels());
        assertEquals(List.of("primary", "tier:gold"), target.getTags());
        assertEquals("team-a", target.getWorkspaceId());
        verify(entityWorkspaceAccessService).resolveWriteWorkspaceId("source-workspace", "target-workspace");
    }

    @Test
    void applyEntityCoreUsesExistingDefaultsAndLabelDerivedTagsWhenInputOmitsThem() {
        ObserveEntity target = ObserveEntity.builder()
                .id(11L)
                .workspaceId("current-workspace")
                .build();
        Map<String, String> labels = new LinkedHashMap<>();
        labels.put(" tier ", " gold ");
        labels.put("owner", " ");
        ObserveEntity source = ObserveEntity.builder()
                .type("service")
                .name("billing-api")
                .status(" ")
                .source(" ")
                .labels(labels)
                .tags(List.of(" ", ""))
                .build();
        when(entityWorkspaceAccessService.resolveWriteWorkspaceId(AuthTokenScopes.DEFAULT_WORKSPACE_ID, "current-workspace"))
                .thenReturn("current-workspace");

        coreWriteModelService.applyEntityCore(target, source, " ");

        assertEquals("unknown", target.getStatus());
        assertEquals("manual", target.getSource());
        assertEquals(labels, target.getLabels());
        assertEquals(List.of("tier:gold", "owner"), target.getTags());
        assertEquals("current-workspace", target.getWorkspaceId());
        verify(entityWorkspaceAccessService).resolveWriteWorkspaceId(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, "current-workspace");
    }

    @Test
    void createEntityAppliesCoreAndPersistsCatalogRow() {
        ObserveEntity input = ObserveEntity.builder()
                .id(71L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .source("definition")
                .workspaceId("submitted-workspace")
                .labels(Map.of("team", "checkout"))
                .build();
        when(entityWorkspaceAccessService.resolveWriteWorkspaceId(
                "submitted-workspace", AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn("team-a");
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ObserveEntity saved = coreWriteModelService.createEntity(input, "manual");

        ArgumentCaptor<ObserveEntity> entityCaptor = ArgumentCaptor.forClass(ObserveEntity.class);
        verify(observeEntityDao).save(entityCaptor.capture());
        ObserveEntity persisted = entityCaptor.getValue();
        assertEquals(71L, persisted.getId());
        assertEquals("service", persisted.getType());
        assertEquals("checkout-api", persisted.getName());
        assertEquals("Checkout API", persisted.getDisplayName());
        assertEquals("definition", persisted.getSource());
        assertEquals("team-a", persisted.getWorkspaceId());
        assertEquals(List.of("team:checkout"), persisted.getTags());
        assertEquals(71L, saved.getId());
    }

    @Test
    void saveEntityCoreAppliesUpdateBeforePersistingExistingCatalogRow() {
        ObserveEntity target = ObserveEntity.builder()
                .id(72L)
                .type("service")
                .name("checkout-api")
                .source("manual")
                .workspaceId("current-workspace")
                .build();
        ObserveEntity update = ObserveEntity.builder()
                .id(72L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .source("definition")
                .workspaceId("submitted-workspace")
                .tags(List.of("tier:gold"))
                .build();
        when(entityWorkspaceAccessService.resolveWriteWorkspaceId("submitted-workspace", "current-workspace"))
                .thenReturn("team-a");
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ObserveEntity saved = coreWriteModelService.saveEntityCore(target, update, target.getSource());

        ArgumentCaptor<ObserveEntity> entityCaptor = ArgumentCaptor.forClass(ObserveEntity.class);
        verify(observeEntityDao).save(entityCaptor.capture());
        ObserveEntity persisted = entityCaptor.getValue();
        assertEquals(72L, persisted.getId());
        assertEquals("Checkout API", persisted.getDisplayName());
        assertEquals("definition", persisted.getSource());
        assertEquals(List.of("tier:gold"), persisted.getTags());
        assertEquals("team-a", persisted.getWorkspaceId());
        assertEquals(72L, saved.getId());
    }

    @Test
    void deleteEntityByIdRemovesCatalogRow() {
        coreWriteModelService.deleteEntityById(82L);

        verify(observeEntityDao).deleteById(82L);
    }

    @Test
    void persistStatusUpdatesEntityThenSavesCatalogRow() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(42L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .build();
        when(observeEntityDao.save(entity)).thenReturn(entity);

        ObserveEntity saved = coreWriteModelService.persistStatus(entity, "critical");

        assertEquals(entity, saved);
        assertEquals("critical", entity.getStatus());
        verify(observeEntityDao).save(entity);
    }

    @Test
    void createEntitiesAppliesCoreAndPersistsDefinitionBundleOrder() {
        ObserveEntity firstInput = ObserveEntity.builder()
                .id(81L)
                .type("service")
                .namespace("commerce")
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity secondInput = ObserveEntity.builder()
                .id(82L)
                .type("api")
                .namespace("commerce")
                .name("checkout-public")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceAccessService.resolveWriteWorkspaceId(
                "team-a", AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn("team-a");
        when(observeEntityDao.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<ObserveEntity> saved = coreWriteModelService.createEntities(
                List.of(firstInput, secondInput), "manual");

        @SuppressWarnings({"unchecked", "rawtypes"})
        ArgumentCaptor<List<ObserveEntity>> entitiesCaptor = ArgumentCaptor.forClass((Class) List.class);
        verify(observeEntityDao).saveAll(entitiesCaptor.capture());
        List<ObserveEntity> persisted = entitiesCaptor.getValue();
        assertEquals(List.of(81L, 82L), persisted.stream().map(ObserveEntity::getId).toList());
        assertEquals(List.of("checkout", "checkout-public"), persisted.stream().map(ObserveEntity::getName).toList());
        assertEquals(List.of("service", "api"), persisted.stream().map(ObserveEntity::getType).toList());
        assertEquals(Collections.emptyList(), persisted.getFirst().getTags());
        assertEquals(List.of(81L, 82L), saved.stream().map(ObserveEntity::getId).toList());
    }
}
