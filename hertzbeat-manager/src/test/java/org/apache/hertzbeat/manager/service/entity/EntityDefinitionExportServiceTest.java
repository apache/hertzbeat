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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for workspace-scoped entity definition export orchestration.
 */
@ExtendWith(MockitoExtension.class)
class EntityDefinitionExportServiceTest {

    @InjectMocks
    private EntityDefinitionExportService entityDefinitionExportService;

    @Mock
    private EntityDetailReadModelService entityDetailReadModelService;

    @Mock
    private EntityDefinitionMappingService entityDefinitionMappingService;

    @Mock
    private EntityDefinitionDocumentRendererService entityDefinitionDocumentRendererService;

    @Test
    void getEntityDefinitionReturnsNullWithoutMappingWhenEntityIsInaccessible() {
        when(entityDetailReadModelService.loadEntityDto(1001L)).thenReturn(null);

        String definition = entityDefinitionExportService.getEntityDefinition(1001L, "yaml");

        assertNull(definition);
        verify(entityDetailReadModelService).loadEntityDto(1001L);
        verifyNoInteractions(entityDefinitionMappingService, entityDefinitionDocumentRendererService);
    }

    @Test
    void getEntityDefinitionLoadsWorkspaceScopedDtoThenMapsAndRenders() {
        EntityDto entityDto = new EntityDto();
        entityDto.setEntity(ObserveEntity.builder()
                .id(1002L)
                .type("service")
                .name("checkout-api")
                .build());
        EntityDefinition mappedDefinition = new EntityDefinition();
        mappedDefinition.setKind("service");
        when(entityDetailReadModelService.loadEntityDto(1002L)).thenReturn(entityDto);
        when(entityDefinitionMappingService.toEntityDefinition(entityDto)).thenReturn(mappedDefinition);
        when(entityDefinitionDocumentRendererService.renderDefinition(mappedDefinition, "json"))
                .thenReturn("{\"kind\":\"service\"}");

        String definition = entityDefinitionExportService.getEntityDefinition(1002L, "json");

        assertEquals("{\"kind\":\"service\"}", definition);
        verify(entityDetailReadModelService).loadEntityDto(1002L);
        verify(entityDefinitionMappingService).toEntityDefinition(entityDto);
        verify(entityDefinitionDocumentRendererService).renderDefinition(mappedDefinition, "json");
    }
}
