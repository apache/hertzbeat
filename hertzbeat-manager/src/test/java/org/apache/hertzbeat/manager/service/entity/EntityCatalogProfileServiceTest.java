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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogLink;
import org.apache.hertzbeat.common.entity.manager.EntityOwnerRef;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityCatalogSuggestionsInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

/**
 * Contract for the catalog profile read-model component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityCatalogProfileServiceTest {

    @InjectMocks
    private EntityCatalogProfileService catalogProfileService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void getCatalogSuggestionsUsesRequestWorkspaceBoundaryForDefaultRead() {
        ObserveEntity teamAlphaService = ObserveEntity.builder()
                .id(311L)
                .type("service")
                .name("checkout-api")
                .namespace("commerce")
                .owner("team-a-owner")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(any(Sort.class)))
                .thenReturn(List.of(teamAlphaService));

        EntityCatalogSuggestionsInfo suggestions = catalogProfileService.getCatalogSuggestions(8);

        assertEquals(List.of("team-a-owner"), suggestions.getOwners());
        assertEquals(List.of("commerce"), suggestions.getNamespaces());
        assertEquals(List.of("service:commerce/checkout-api"), suggestions.getEntityRefs());
        verify(entityWorkspaceAccessService).findAccessibleEntitiesForRequestWorkspace(any(Sort.class));
        verify(entityWorkspaceAccessService, never()).currentRequestWorkspaceId();
    }

    @Test
    void getCatalogSuggestionsUsesWorkspaceBoundaryAndBuildsProfileReadModel() {
        ObserveEntity teamAlphaService = ObserveEntity.builder()
                .id(301L)
                .type("service")
                .name("checkout-api")
                .namespace("commerce")
                .environment("prod")
                .owner("team-a-owner")
                .additionalOwners(List.of(new EntityOwnerRef("team-a-oncall", "team")))
                .system("team-a-system")
                .lifecycle("production")
                .tier("tier1")
                .inheritFrom("service:commerce/base-service")
                .languages(List.of("java", "kotlin"))
                .links(List.of(new EntityCatalogLink("Repository", "repository", "github", "https://github.com/acme/checkout")))
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntities(eq("team-a"), any(Sort.class)))
                .thenReturn(List.of(teamAlphaService));

        EntityCatalogSuggestionsInfo suggestions = catalogProfileService.getCatalogSuggestions(8, "team-a");

        assertEquals(List.of("team-a-owner", "team-a-oncall"), suggestions.getOwners());
        assertEquals(List.of("commerce"), suggestions.getNamespaces());
        assertEquals(List.of("prod"), suggestions.getEnvironments());
        assertEquals(List.of("team-a-system"), suggestions.getSystems());
        assertEquals(List.of("production"), suggestions.getLifecycles());
        assertEquals(List.of("tier1"), suggestions.getTiers());
        assertEquals(List.of("service:commerce/base-service"), suggestions.getInheritFromRefs());
        assertEquals(List.of("service:commerce/checkout-api"), suggestions.getEntityRefs());
        assertEquals(List.of("java", "kotlin"), suggestions.getLanguages());
        assertEquals(List.of("github"), suggestions.getLinkProviders());
        verify(entityWorkspaceAccessService).findAccessibleEntities(eq("team-a"), any(Sort.class));
    }
}
