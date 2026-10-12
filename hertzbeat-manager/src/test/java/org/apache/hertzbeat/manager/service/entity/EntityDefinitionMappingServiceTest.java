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
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogContact;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogLink;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityOwnerRef;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for entity definition/entity DTO mapping extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityDefinitionMappingServiceTest {

    @Mock
    private EntityRelationService entityRelationService;
    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    private EntityDefinitionMappingService mappingService;

    @BeforeEach
    void setUp() {
        mappingService = new EntityDefinitionMappingService(entityRelationService, entityWorkspaceAccessService);
    }

    @Test
    void toEntityDtoPreservesDefinitionMetadataTelemetryAndRelations() {
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(entityRelationService.resolveDirectEntityReference(9102L, "team-a")).thenReturn(9102L);
        when(entityRelationService.buildEntityReference(9102L)).thenReturn("datastore:commerce/orders-db");
        EntityDefinition definition = serviceDefinition();

        EntityDto entityDto = mappingService.toEntityDto(definition, 7001L);

        EntityInfo entity = entityDto.getEntityInfo();
        assertEquals(7001L, entity.getId());
        assertEquals("service", entity.getType());
        assertEquals("checkout-api", entity.getName());
        assertEquals("Checkout API", entity.getDisplayName());
        assertEquals("springboot", entity.getSubtype());
        assertEquals("commerce", entity.getNamespace());
        assertEquals("payments", entity.getOwner());
        assertEquals("prod", entity.getEnvironment());
        assertEquals("definition", entity.getSource());
        assertEquals("https://runbooks/checkout", entity.getRunbook());
        assertEquals(Map.of("env", "prod"), entity.getLabels());
        assertEquals(List.of("team:payments"), entity.getTags());
        assertEquals("platform", entity.getAdditionalOwners().getFirst().getName());
        assertEquals("service:base/platform", entity.getInheritFrom());
        assertEquals("https://dashboards/checkout", entity.getLinks().get(1).getUrl());
        assertEquals("#checkout-ops", entity.getContacts().getFirst().getContact());
        assertEquals(List.of("java", "kotlin"), entity.getLanguages());
        assertEquals("https://schema/checkout.yaml", JsonUtil.fromJson(entity.getApiInterface().toString(), EntityDefinition.ApiInterface.class).getFileRef());
        assertEquals("checkout", ((Map<?, ?>) JsonUtil.fromJson(entity.getIntegrations().toString(), Map.class).get("pagerduty")).get("service"));
        assertEquals("level:error", JsonUtil.fromJson(entity.getHertzbeat().toString(), EntityDefinition.Hertzbeat.class).getLogs().getFirst().getQuery());

        EntityIdentity identity = entityDto.getIdentities().getFirst();
        assertEquals("service.name", identity.getIdentityKey());
        assertEquals("checkout-api", identity.getIdentityValue());
        assertEquals("otel", identity.getIdentityType());
        assertEquals(100, identity.getPriority());
        assertFalse(entityDto.getMonitorBinds().isEmpty());
        EntityMonitorBind bind = entityDto.getMonitorBinds().getFirst();
        assertEquals(42L, bind.getMonitorId());
        assertEquals("rule", bind.getBindSource());
        assertEquals(Map.of("service.name", List.of("checkout-api")), bind.getMatchContext());
        EntityRelation relation = entityDto.getRelations().getFirst();
        assertEquals(7001L, relation.getSourceEntityId());
        assertEquals(9102L, relation.getTargetEntityId());
        assertEquals("datastore:commerce/orders-db", relation.getTargetRef());
        assertEquals("depends_on", relation.getRelationType());
        assertEquals("critical path", relation.getDescription());
    }

    @Test
    void toEntityDefinitionPreservesStoredEntityTelemetryAndExtensionBlocks() {
        when(entityRelationService.buildEntityReference(9201L)).thenReturn("service:commerce/orders-worker");
        EntityDto entityDto = storedEntityDto();

        EntityDefinition definition = mappingService.toEntityDefinition(entityDto);

        assertEquals("hertzbeat/v1", definition.getApiVersion());
        assertEquals("datastore", definition.getKind());
        assertEquals("orders-db", definition.getMetadata().getName());
        assertEquals("commerce", definition.getMetadata().getNamespace());
        assertEquals("payments", definition.getMetadata().getOwner());
        assertEquals(List.of("env:prod"), definition.getMetadata().getTags());
        assertEquals("platform", definition.getMetadata().getAdditionalOwners().getFirst().getName());
        assertEquals("https://runbooks/orders-db", definition.getMetadata().getLinks().getFirst().getUrl());
        assertEquals("definition", definition.getSpec().getSource());
        assertEquals("prod", definition.getSpec().getEnvironment());
        assertEquals("postgres", definition.getSpec().getType());
        assertEquals("commerce-platform", definition.getSpec().getPartOf());
        assertEquals("orders-db", definition.getSpec().getTelemetry().getIdentities().getFirst().getValue());
        assertEquals(101L, definition.getSpec().getTelemetry().getMonitors().getFirst().getMonitorId());
        assertEquals("service:commerce/orders-worker", definition.getSpec().getRelations().getFirst().getTargetRef());
        assertEquals(List.of("service:commerce/orders-worker"), definition.getSpec().getDependsOn());
        assertEquals("db", ((Map<?, ?>) definition.getIntegrations().get("pagerduty")).get("service"));
        assertEquals("level:error", definition.getHertzbeat().getLogs().getFirst().getQuery());
        assertEquals("schemas/orders-db.yaml", definition.getSpec().getApiInterface().getFileRef());
    }

    private EntityDefinition serviceDefinition() {
        EntityDefinition definition = new EntityDefinition();
        definition.setApiVersion("hertzbeat/v1");
        definition.setKind("service");

        EntityDefinition.Metadata metadata = new EntityDefinition.Metadata();
        metadata.setName("checkout-api");
        metadata.setDisplayName("Checkout API");
        metadata.setNamespace("commerce");
        metadata.setOwner("payments");
        metadata.setDescription("Handles checkout requests.");
        metadata.setLabels(Map.of("env", "prod"));
        metadata.setTags(List.of("team:payments"));
        EntityDefinition.OwnerRef ownerRef = new EntityDefinition.OwnerRef();
        ownerRef.setName("platform");
        ownerRef.setType("team");
        metadata.setAdditionalOwners(List.of(ownerRef));
        metadata.setInheritFrom("service:base/platform");
        EntityDefinition.Link dashboard = new EntityDefinition.Link();
        dashboard.setName("dashboard");
        dashboard.setType("dashboard");
        dashboard.setProvider("grafana");
        dashboard.setUrl("https://dashboards/checkout");
        metadata.setLinks(List.of(dashboard));
        EntityDefinition.Contact slack = new EntityDefinition.Contact();
        slack.setName("oncall");
        slack.setType("slack");
        slack.setValue("#checkout-ops");
        metadata.setContacts(List.of(slack));
        definition.setMetadata(metadata);

        EntityDefinition.Spec spec = new EntityDefinition.Spec();
        spec.setType("springboot");
        spec.setSource("definition");
        spec.setOwner("payments");
        spec.setNamespace("commerce");
        spec.setEnvironment("prod");
        spec.setCriticality("critical");
        spec.setRunbook("https://runbooks/checkout");
        spec.setLifecycle("production");
        spec.setTier("tier1");
        spec.setPartOf("commerce-platform");
        spec.setComponentOf(List.of("checkout"));
        spec.setComponents(List.of("checkout-worker"));
        spec.setImplementedBy(List.of("checkout-public-api"));
        EntityDefinition.ApiInterface apiInterface = new EntityDefinition.ApiInterface();
        apiInterface.setFileRef("https://schema/checkout.yaml");
        spec.setApiInterface(apiInterface);
        spec.setLanguages(List.of("java", "kotlin"));
        EntityDefinition.Telemetry telemetry = new EntityDefinition.Telemetry();
        EntityDefinition.Identity identity = new EntityDefinition.Identity();
        identity.setKey("service.name");
        identity.setValue("checkout-api");
        identity.setType("otel");
        identity.setPriority(100);
        identity.setPrimary(true);
        EntityDefinition.MonitorBind monitorBind = new EntityDefinition.MonitorBind();
        monitorBind.setMonitorId(42L);
        monitorBind.setBindType("manual");
        monitorBind.setBindSource("rule");
        monitorBind.setStatus("active");
        monitorBind.setScore(95);
        monitorBind.setMatchContext(Map.of("service.name", List.of("checkout-api")));
        telemetry.setIdentities(List.of(identity));
        telemetry.setMonitors(List.of(monitorBind));
        spec.setTelemetry(telemetry);
        EntityDefinition.Relation relation = new EntityDefinition.Relation();
        relation.setTargetEntityId(9102L);
        relation.setRelationType("depends_on");
        relation.setRelationSource("manual");
        relation.setStatus("confirmed");
        relation.setScore(100);
        relation.setDescription("critical path");
        relation.setAttributes(Map.of("protocol", "jdbc"));
        spec.setRelations(List.of(relation));
        definition.setSpec(spec);

        definition.setIntegrations(Map.of("pagerduty", Map.of("service", "checkout")));
        definition.setExtensions(Map.of("hertzbeat.apache.org/catalog", Map.of("risk", "high")));
        EntityDefinition.Hertzbeat hertzbeat = new EntityDefinition.Hertzbeat();
        EntityDefinition.SavedQuery logQuery = new EntityDefinition.SavedQuery();
        logQuery.setName("errors");
        logQuery.setQuery("level:error");
        hertzbeat.setLogs(List.of(logQuery));
        definition.setHertzbeat(hertzbeat);
        return definition;
    }

    private EntityDto storedEntityDto() {
        EntityInfo entity = new EntityInfo();
        entity.setId(7001L);
        entity.setType("database");
        entity.setName("orders-db");
        entity.setDisplayName("Orders DB");
        entity.setSubtype("postgres");
        entity.setNamespace("commerce");
        entity.setEnvironment("prod");
        entity.setCriticality("high");
        entity.setOwner("payments");
        entity.setAdditionalOwners(List.of(new EntityOwnerRef("platform", "team")));
        entity.setRunbook("https://runbooks/orders-db");
        entity.setLifecycle("production");
        entity.setTier("tier1");
        entity.setSystem("commerce-platform");
        entity.setComponentOf(List.of("checkout"));
        entity.setComponents(List.of("orders-writer"));
        entity.setImplementedBy(List.of("orders-worker"));
        entity.setApiInterface(JsonUtil.fromJson("""
                {"fileRef":"schemas/orders-db.yaml"}
                """));
        entity.setLanguages(List.of("sql"));
        entity.setLinks(List.of(new EntityCatalogLink("runbook", "runbook", "manual", "https://runbooks/orders-db")));
        entity.setContacts(List.of(new EntityCatalogContact("oncall", "slack", "#db-ops")));
        entity.setIntegrations(JsonUtil.fromJson("""
                {"pagerduty":{"service":"db"}}
                """));
        entity.setExtensions(JsonUtil.fromJson("""
                {"hertzbeat.apache.org/catalog":{"owner":"payments"}}
                """));
        entity.setHertzbeat(JsonUtil.fromJson("""
                {"logs":[{"name":"errors","query":"level:error"}]}
                """));
        entity.setSource("definition");
        entity.setDescription("Stores order state.");
        entity.setLabels(Map.of("env", "prod"));

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entity);
        entityDto.setIdentities(List.of(EntityIdentity.builder()
                .entityId(7001L)
                .identityKey("db.system")
                .identityValue("orders-db")
                .identityType("otel")
                .priority(100)
                .primaryIdentity(true)
                .build()));
        entityDto.setMonitorBinds(List.of(EntityMonitorBind.builder()
                .entityId(7001L)
                .monitorId(101L)
                .bindType("manual")
                .bindSource("definition")
                .status("active")
                .score(100)
                .matchContext(Map.of("db.system", List.of("postgres")))
                .build()));
        entityDto.setRelations(List.of(EntityRelation.builder()
                .sourceEntityId(7001L)
                .targetEntityId(9201L)
                .relationType("depends_on")
                .relationSource("manual")
                .status("confirmed")
                .score(100)
                .description("writes orders")
                .attributes(Map.of("operation", "write"))
                .build()));
        return entityDto;
    }
}
