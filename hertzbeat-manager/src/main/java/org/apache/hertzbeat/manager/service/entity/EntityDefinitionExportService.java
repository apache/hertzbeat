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

import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;

/**
 * Renders workspace-scoped entity definition exports.
 */
@Service
public class EntityDefinitionExportService {

    private final EntityDetailReadModelService entityDetailReadModelService;
    private final EntityDefinitionMappingService entityDefinitionMappingService;
    private final EntityDefinitionDocumentRendererService entityDefinitionDocumentRendererService;

    public EntityDefinitionExportService(EntityDetailReadModelService entityDetailReadModelService,
                                         EntityDefinitionMappingService entityDefinitionMappingService,
                                         EntityDefinitionDocumentRendererService entityDefinitionDocumentRendererService) {
        this.entityDetailReadModelService = entityDetailReadModelService;
        this.entityDefinitionMappingService = entityDefinitionMappingService;
        this.entityDefinitionDocumentRendererService = entityDefinitionDocumentRendererService;
    }

    public String getEntityDefinition(long entityId, String format) {
        EntityDto entityDto = entityDetailReadModelService.loadEntityDto(entityId);
        if (entityDto == null) {
            return null;
        }
        return entityDefinitionDocumentRendererService.renderDefinition(
                entityDefinitionMappingService.toEntityDefinition(entityDto), format);
    }
}
