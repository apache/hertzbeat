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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.junit.jupiter.api.Test;

/**
 * Contract for entity definition document rendering extracted from the large entity service.
 */
class EntityDefinitionDocumentRendererServiceTest {

    private final EntityDefinitionDocumentRendererService rendererService =
            new EntityDefinitionDocumentRendererService();

    @Test
    void renderDefinitionPreservesCanonicalYamlShapeWithoutEmptyBlocks() {
        EntityDefinition definition = serviceDefinition();

        String rendered = rendererService.renderDefinition(definition, "yaml");

        assertTrue(rendered.contains("apiVersion: hertzbeat/v1"));
        assertTrue(rendered.contains("kind: service"));
        assertTrue(rendered.contains("metadata:"));
        assertTrue(rendered.contains("name: checkout-api"));
        assertTrue(rendered.contains("labels:"));
        assertTrue(rendered.contains("team: payments"));
        assertTrue(rendered.contains("spec:"));
        assertTrue(rendered.contains("type: web-service"));
        assertTrue(rendered.contains("partOf: commerce"));
        assertTrue(rendered.contains("telemetry:"));
        assertTrue(rendered.contains("key: service.name"));
        assertTrue(rendered.contains("monitorId: 101"));
        assertTrue(rendered.contains("relations:"));
        assertTrue(rendered.contains("targetRef: database:commerce/orders-db"));
        assertFalse(rendered.contains("integrations: {}"));
        assertFalse(rendered.contains("extensions: {}"));
        assertFalse(rendered.contains("hertzbeat: {}"));
    }

    @Test
    void renderDefinitionPreservesCanonicalJsonShapeAndHertzbeatBlocks() {
        EntityDefinition definition = serviceDefinition();

        String rendered = rendererService.renderDefinition(definition, "json");

        assertTrue(rendered.contains("\"apiVersion\" : \"hertzbeat/v1\""));
        assertTrue(rendered.contains("\"kind\" : \"service\""));
        assertTrue(rendered.contains("\"metadata\""));
        assertTrue(rendered.contains("\"name\" : \"checkout-api\""));
        assertTrue(rendered.contains("\"telemetry\""));
        assertTrue(rendered.contains("\"monitorId\" : 101"));
        assertTrue(rendered.contains("\"hertzbeat\""));
        assertTrue(rendered.contains("\"codeLocations\""));
        assertTrue(rendered.contains("\"repositoryURL\" : \"https://github.com/acme/checkout.git\""));
        assertFalse(rendered.contains("\"empty\""));
    }

    @Test
    void renderDefinitionDefaultsUnknownFormatToYaml() {
        String rendered = rendererService.renderDefinition(serviceDefinition(), "toml");

        assertTrue(rendered.contains("apiVersion: hertzbeat/v1"));
        assertFalse(rendered.contains("\"apiVersion\""));
    }

    private EntityDefinition serviceDefinition() {
        EntityDefinition definition = new EntityDefinition();
        definition.setApiVersion("hertzbeat/v1");
        definition.setKind("service");

        EntityDefinition.Metadata metadata = new EntityDefinition.Metadata();
        metadata.setName("checkout-api");
        metadata.setNamespace("commerce");
        metadata.setOwner("payments-oncall");
        metadata.setLabels(Map.of("team", "payments"));
        metadata.setTags(List.of("team:payments"));
        definition.setMetadata(metadata);

        EntityDefinition.Spec spec = new EntityDefinition.Spec();
        spec.setType("web-service");
        spec.setSource("manual");
        spec.setOwnedBy("payments-oncall");
        spec.setEnvironment("prod");
        spec.setPartOf("commerce");
        EntityDefinition.Telemetry telemetry = new EntityDefinition.Telemetry();
        EntityDefinition.Identity identity = new EntityDefinition.Identity();
        identity.setKey("service.name");
        identity.setValue("checkout-api");
        identity.setType("otel_resource");
        identity.setPrimary(true);
        telemetry.setIdentities(List.of(identity));
        EntityDefinition.MonitorBind monitorBind = new EntityDefinition.MonitorBind();
        monitorBind.setMonitorId(101L);
        monitorBind.setBindType("manual");
        monitorBind.setStatus("active");
        telemetry.setMonitors(List.of(monitorBind));
        spec.setTelemetry(telemetry);
        spec.setDependsOn(List.of("database:commerce/orders-db"));
        EntityDefinition.Relation relation = new EntityDefinition.Relation();
        relation.setTargetRef("database:commerce/orders-db");
        relation.setRelationType("depends_on");
        relation.setStatus("confirmed");
        spec.setRelations(List.of(relation));
        definition.setSpec(spec);

        EntityDefinition.Hertzbeat hertzbeat = new EntityDefinition.Hertzbeat();
        EntityDefinition.CodeLocation codeLocation = new EntityDefinition.CodeLocation();
        codeLocation.setRepositoryURL("https://github.com/acme/checkout.git");
        codeLocation.setPaths(List.of("services/checkout/**"));
        hertzbeat.setCodeLocations(List.of(codeLocation));
        definition.setHertzbeat(hertzbeat);
        return definition;
    }
}
