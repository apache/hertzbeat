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

import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Builds entity DTO drafts from submitted definition documents.
 */
@Service
public class EntityDefinitionDraftService {

    private final EntityDefinitionDocumentParserService entityDefinitionDocumentParserService;
    private final EntityDefinitionNormalizationService entityDefinitionNormalizationService;
    private final EntityDefinitionMappingService entityDefinitionMappingService;

    public EntityDefinitionDraftService(EntityDefinitionDocumentParserService entityDefinitionDocumentParserService,
                                        EntityDefinitionNormalizationService entityDefinitionNormalizationService,
                                        EntityDefinitionMappingService entityDefinitionMappingService) {
        this.entityDefinitionDocumentParserService = entityDefinitionDocumentParserService;
        this.entityDefinitionNormalizationService = entityDefinitionNormalizationService;
        this.entityDefinitionMappingService = entityDefinitionMappingService;
    }

    public EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest, Long entityId) {
        return parseEntityDefinition(definitionRequest, entityId, null, true);
    }

    public EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest,
                                           Long entityId,
                                           String requestWorkspaceId) {
        return parseEntityDefinition(definitionRequest, entityId, requestWorkspaceId, false);
    }

    private EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest,
                                            Long entityId,
                                            String requestWorkspaceId,
                                            boolean resolveRequestWorkspaceAtMappingBoundary) {
        List<EntityDto> entityDtos = parseEntityDefinitionBundle(
                definitionRequest, entityId, requestWorkspaceId, resolveRequestWorkspaceAtMappingBoundary);
        if (CollectionUtils.isEmpty(entityDtos)) {
            throw new IllegalArgumentException("Entity definition content can not be blank.");
        }
        if (entityDtos.size() > 1) {
            throw new IllegalArgumentException("Entity definition bundle contains multiple entities. Use the bundle API.");
        }
        return entityDtos.getFirst();
    }

    public List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest) {
        return parseEntityDefinitionBundle(definitionRequest, null, null, true);
    }

    public List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest,
                                                       String requestWorkspaceId) {
        return parseEntityDefinitionBundle(definitionRequest, null, requestWorkspaceId, false);
    }

    private List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest,
                                                       Long entityId,
                                                       String requestWorkspaceId,
                                                       boolean resolveRequestWorkspaceAtMappingBoundary) {
        return entityDefinitionDocumentParserService.parseDefinitionRecords(definitionRequest).stream()
                .map(entityDefinitionNormalizationService::normalizeDefinition)
                .map(definition -> resolveRequestWorkspaceAtMappingBoundary
                        ? entityDefinitionMappingService.toEntityDto(definition, entityId)
                        : entityDefinitionMappingService.toEntityDto(definition, entityId, requestWorkspaceId))
                .toList();
    }
}
