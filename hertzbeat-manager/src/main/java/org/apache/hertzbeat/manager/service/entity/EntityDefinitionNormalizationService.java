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

import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.springframework.stereotype.Service;

/**
 * Normalizes raw entity definition documents into the canonical HertzBeat definition model.
 */
@Service
public class EntityDefinitionNormalizationService {

    private final EntityDefinitionDocumentFieldNormalizationService entityDefinitionDocumentFieldNormalizationService;
    private final EntityDefinitionMetadataNormalizationService entityDefinitionMetadataNormalizationService;
    private final EntityDefinitionSpecNormalizationService entityDefinitionSpecNormalizationService;
    private final EntityDefinitionExtensionNormalizationService entityDefinitionExtensionNormalizationService;
    private final EntityDefinitionTypeResolverService entityDefinitionTypeResolverService;
    private final EntityDefinitionTelemetryNormalizationService entityDefinitionTelemetryNormalizationService;
    private final EntityDefinitionRelationNormalizationService entityDefinitionRelationNormalizationService;
    private final EntityDefinitionHertzbeatNormalizationService entityDefinitionHertzbeatNormalizationService;

    public EntityDefinitionNormalizationService(EntityDefinitionDocumentFieldNormalizationService entityDefinitionDocumentFieldNormalizationService,
                                                EntityDefinitionMetadataNormalizationService entityDefinitionMetadataNormalizationService,
                                                EntityDefinitionSpecNormalizationService entityDefinitionSpecNormalizationService,
                                                EntityDefinitionExtensionNormalizationService entityDefinitionExtensionNormalizationService,
                                                EntityDefinitionTypeResolverService entityDefinitionTypeResolverService,
                                                EntityDefinitionTelemetryNormalizationService entityDefinitionTelemetryNormalizationService,
                                                EntityDefinitionRelationNormalizationService entityDefinitionRelationNormalizationService,
                                                EntityDefinitionHertzbeatNormalizationService entityDefinitionHertzbeatNormalizationService) {
        this.entityDefinitionDocumentFieldNormalizationService = entityDefinitionDocumentFieldNormalizationService;
        this.entityDefinitionMetadataNormalizationService = entityDefinitionMetadataNormalizationService;
        this.entityDefinitionSpecNormalizationService = entityDefinitionSpecNormalizationService;
        this.entityDefinitionExtensionNormalizationService = entityDefinitionExtensionNormalizationService;
        this.entityDefinitionTypeResolverService = entityDefinitionTypeResolverService;
        this.entityDefinitionTelemetryNormalizationService = entityDefinitionTelemetryNormalizationService;
        this.entityDefinitionRelationNormalizationService = entityDefinitionRelationNormalizationService;
        this.entityDefinitionHertzbeatNormalizationService = entityDefinitionHertzbeatNormalizationService;
    }

    public EntityDefinition normalizeDefinition(Map<String, Object> root) {
        Map<String, Object> specMap = entityDefinitionDocumentFieldNormalizationService.resolveDefinitionSpecMap(root);
        Map<String, Object> telemetryMap =
                entityDefinitionDocumentFieldNormalizationService.resolveDefinitionTelemetryMap(specMap);

        EntityDefinition definition = new EntityDefinition();
        String normalizedKind = entityDefinitionTypeResolverService.resolveDefinitionEntityType(root, specMap);
        definition.setApiVersion(entityDefinitionDocumentFieldNormalizationService.resolveDefinitionApiVersion(
                root, entityDefinitionTypeResolverService.defaultApiVersion()));
        definition.setKind(normalizedKind);

        EntityDefinition.Metadata metadata = entityDefinitionMetadataNormalizationService.extractDefinitionMetadata(root, specMap);
        definition.setMetadata(metadata);

        EntityDefinition.Spec spec = entityDefinitionSpecNormalizationService.extractDefinitionSpec(
                root,
                specMap,
                metadata,
                entityDefinitionTypeResolverService.resolveDefinitionSubtype(root, specMap, normalizedKind),
                entityDefinitionMetadataNormalizationService.extractDefinitionRunbook(root, specMap));

        spec.setTelemetry(entityDefinitionTelemetryNormalizationService.extractDefinitionTelemetry(telemetryMap));
        entityDefinitionRelationNormalizationService.attachDefinitionRelations(spec, specMap);

        entityDefinitionExtensionNormalizationService.attachDefinitionAddOns(definition, root, specMap);
        entityDefinitionHertzbeatNormalizationService.attachDefinitionHertzbeat(definition, root, specMap);
        definition.setSpec(spec);
        return definition;
    }

}
