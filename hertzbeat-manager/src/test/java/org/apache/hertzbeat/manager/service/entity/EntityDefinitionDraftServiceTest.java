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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for assembling parsed entity definition documents into entity DTO drafts.
 */
@ExtendWith(MockitoExtension.class)
class EntityDefinitionDraftServiceTest {

    @InjectMocks
    private EntityDefinitionDraftService definitionDraftService;

    @Mock
    private EntityDefinitionDocumentParserService entityDefinitionDocumentParserService;

    @Mock
    private EntityDefinitionNormalizationService entityDefinitionNormalizationService;

    @Mock
    private EntityDefinitionMappingService entityDefinitionMappingService;

    @Mock
    private EntityIdentityDao entityIdentityDao;

    @Mock
    private EntityIdentityResolutionService entityIdentityResolutionService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Mock
    private EntityMonitorBindQueryService entityMonitorBindQueryService;

    @Test
    void parseEntityDefinitionMapsSingleNormalizedDraftWithEntityAndWorkspaceContext() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("kind: service");
        Map<String, Object> rawRecord = Map.of("kind", "service");
        EntityDefinition normalizedDefinition = new EntityDefinition();
        EntityDto expectedDto = new EntityDto();
        when(entityDefinitionDocumentParserService.parseDefinitionRecords(request)).thenReturn(List.of(rawRecord));
        when(entityDefinitionNormalizationService.normalizeDefinition(rawRecord)).thenReturn(normalizedDefinition);
        when(entityDefinitionMappingService.toEntityDto(normalizedDefinition, 42L, "team-a")).thenReturn(expectedDto);

        EntityDto actualDto = definitionDraftService.parseEntityDefinition(request, 42L, "team-a");

        assertSame(expectedDto, actualDto);
        InOrder inOrder = inOrder(
                entityDefinitionDocumentParserService,
                entityDefinitionNormalizationService,
                entityDefinitionMappingService);
        inOrder.verify(entityDefinitionDocumentParserService).parseDefinitionRecords(request);
        inOrder.verify(entityDefinitionNormalizationService).normalizeDefinition(rawRecord);
        inOrder.verify(entityDefinitionMappingService).toEntityDto(normalizedDefinition, 42L, "team-a");
    }

    @Test
    void parseEntityDefinitionRejectsEmptyDraftsAndBundlesForSingleApi() {
        EntityDefinitionRequest emptyRequest = new EntityDefinitionRequest();
        emptyRequest.setContent("[]");
        when(entityDefinitionDocumentParserService.parseDefinitionRecords(emptyRequest)).thenReturn(Collections.emptyList());

        IllegalArgumentException emptyException = assertThrows(IllegalArgumentException.class,
                () -> definitionDraftService.parseEntityDefinition(emptyRequest, null, "team-a"));
        assertEquals("Entity definition content can not be blank.", emptyException.getMessage());

        EntityDefinitionRequest bundleRequest = new EntityDefinitionRequest();
        bundleRequest.setContent("---\nkind: service\n---\nkind: host");
        Map<String, Object> firstRecord = Map.of("kind", "service");
        Map<String, Object> secondRecord = Map.of("kind", "host");
        EntityDefinition firstDefinition = new EntityDefinition();
        firstDefinition.setKind("service");
        EntityDefinition secondDefinition = new EntityDefinition();
        secondDefinition.setKind("host");
        when(entityDefinitionDocumentParserService.parseDefinitionRecords(bundleRequest))
                .thenReturn(List.of(firstRecord, secondRecord));
        when(entityDefinitionNormalizationService.normalizeDefinition(firstRecord)).thenReturn(firstDefinition);
        when(entityDefinitionNormalizationService.normalizeDefinition(secondRecord)).thenReturn(secondDefinition);
        when(entityDefinitionMappingService.toEntityDto(firstDefinition, null, "team-a")).thenReturn(new EntityDto());
        when(entityDefinitionMappingService.toEntityDto(secondDefinition, null, "team-a")).thenReturn(new EntityDto());

        IllegalArgumentException bundleException = assertThrows(IllegalArgumentException.class,
                () -> definitionDraftService.parseEntityDefinition(bundleRequest, null, "team-a"));
        assertEquals("Entity definition bundle contains multiple entities. Use the bundle API.", bundleException.getMessage());
    }

    @Test
    void parseEntityDefinitionBundlePreservesDocumentOrderAndWorkspaceContext() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setContent("---\nkind: service\n---\nkind: host");
        Map<String, Object> firstRecord = Map.of("kind", "service");
        Map<String, Object> secondRecord = Map.of("kind", "host");
        EntityDefinition firstDefinition = new EntityDefinition();
        firstDefinition.setKind("service");
        EntityDefinition secondDefinition = new EntityDefinition();
        secondDefinition.setKind("host");
        EntityDto firstDto = new EntityDto();
        EntityDto secondDto = new EntityDto();
        when(entityDefinitionDocumentParserService.parseDefinitionRecords(request))
                .thenReturn(List.of(firstRecord, secondRecord));
        when(entityDefinitionNormalizationService.normalizeDefinition(firstRecord)).thenReturn(firstDefinition);
        when(entityDefinitionNormalizationService.normalizeDefinition(secondRecord)).thenReturn(secondDefinition);
        when(entityDefinitionMappingService.toEntityDto(firstDefinition, null, "team-b")).thenReturn(firstDto);
        when(entityDefinitionMappingService.toEntityDto(secondDefinition, null, "team-b")).thenReturn(secondDto);

        List<EntityDto> entityDtos = definitionDraftService.parseEntityDefinitionBundle(request, "team-b");

        assertEquals(List.of(firstDto, secondDto), entityDtos);
    }

    @Test
    void parseEntityDefinitionBundleRejectsAccessiblePrimaryIdentityCollisionsBeforeWrite() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setContent("kind: service");
        Map<String, Object> rawRecord = Map.of("kind", "service");
        EntityDefinition normalizedDefinition = new EntityDefinition();
        EntityDto dto = new EntityDto();
        dto.setIdentities(List.of(EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout-api")
                .primaryIdentity(true)
                .build()));
        EntityIdentity persistedIdentity = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .primaryIdentity(true)
                .build();
        ObserveEntity visibleEntity = ObserveEntity.builder()
                .id(42L)
                .name("checkout-api")
                .type("service")
                .build();
        when(entityDefinitionDocumentParserService.parseDefinitionRecords(request)).thenReturn(List.of(rawRecord));
        when(entityDefinitionNormalizationService.normalizeDefinition(rawRecord)).thenReturn(normalizedDefinition);
        when(entityDefinitionMappingService.toEntityDto(normalizedDefinition, null, "team-a")).thenReturn(dto);
        when(entityIdentityResolutionService.normalizeIdentityValue("service.name", "checkout-api"))
                .thenReturn("checkout-api");
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(
                Set.of("service.name"), Set.of("checkout-api"))).thenReturn(List.of(persistedIdentity));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(Set.of(42L)))
                .thenReturn(List.of(visibleEntity));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> definitionDraftService.parseEntityDefinitionBundle(request, "team-a"));

        assertEquals("Entity primary identity already exists: service.name=checkout-api.", exception.getMessage());
    }

    @Test
    void parseEntityDefinitionAllowsCurrentEntityPrimaryIdentityWhenEditingDefinition() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setContent("kind: service");
        Map<String, Object> rawRecord = Map.of("kind", "service");
        EntityDefinition normalizedDefinition = new EntityDefinition();
        EntityDto dto = new EntityDto();
        dto.setIdentities(List.of(EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout-api")
                .primaryIdentity(true)
                .build()));
        EntityIdentity currentIdentity = EntityIdentity.builder()
                .entityId(42L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .primaryIdentity(true)
                .build();
        when(entityDefinitionDocumentParserService.parseDefinitionRecords(request)).thenReturn(List.of(rawRecord));
        when(entityDefinitionNormalizationService.normalizeDefinition(rawRecord)).thenReturn(normalizedDefinition);
        when(entityDefinitionMappingService.toEntityDto(normalizedDefinition, 42L, "team-a")).thenReturn(dto);
        when(entityIdentityResolutionService.normalizeIdentityValue("service.name", "checkout-api"))
                .thenReturn("checkout-api");
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(
                Set.of("service.name"), Set.of("checkout-api"))).thenReturn(List.of(currentIdentity));

        EntityDto actualDto = definitionDraftService.parseEntityDefinition(request, 42L, "team-a");

        assertSame(dto, actualDto);
    }

    @Test
    void parseEntityDefinitionBundleRejectsMonitorBindAlreadyAssignedBeforeWrite() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setContent("kind: service");
        Map<String, Object> rawRecord = Map.of("kind", "service");
        EntityDefinition normalizedDefinition = new EntityDefinition();
        EntityDto dto = new EntityDto();
        dto.setMonitorBinds(List.of(EntityMonitorBind.builder()
                .monitorId(501L)
                .build()));
        when(entityDefinitionDocumentParserService.parseDefinitionRecords(request)).thenReturn(List.of(rawRecord));
        when(entityDefinitionNormalizationService.normalizeDefinition(rawRecord)).thenReturn(normalizedDefinition);
        when(entityDefinitionMappingService.toEntityDto(normalizedDefinition, null, "team-a")).thenReturn(dto);
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(501L)).thenReturn(List.of(EntityMonitorBind.builder()
                .entityId(302L)
                .monitorId(501L)
                .build()));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> definitionDraftService.parseEntityDefinitionBundle(request, "team-a"));

        assertEquals("Monitor already bound to another entity: 501.", exception.getMessage());
    }
}
