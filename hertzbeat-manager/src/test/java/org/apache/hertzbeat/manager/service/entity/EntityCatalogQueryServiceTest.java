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

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/**
 * Contract for the catalog query boundary behind entity list pages.
 */
@ExtendWith(MockitoExtension.class)
class EntityCatalogQueryServiceTest {

    @InjectMocks
    private EntityCatalogQueryService entityCatalogQueryService;

    @Mock
    private EntityWorkspaceQueryService entityWorkspaceQueryService;
    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void findEntityPageOwnsPagingSortAndCatalogSpecification() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(31L)
                .type("service")
                .name("checkout")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceQueryService.findEntityPage(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));
        when(entityWorkspaceAccessService.filterEntitiesByRequestWorkspace(List.of(entity), "team-a"))
                .thenReturn(List.of(entity));

        Page<ObserveEntity> page = entityCatalogQueryService.findEntityPage(
                List.of(31L), "api", "critical", "31", "team-a-owner", "otel_resource",
                "prod", "production", "tier1", "checkout-system", "gmtUpdate", "desc", 0, 8, "team-a");

        assertEquals(List.of(entity), page.getContent());
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(entityWorkspaceQueryService).findEntityPage(any(Specification.class), pageableCaptor.capture());
        assertEquals(0, pageableCaptor.getValue().getPageNumber());
        assertEquals(8, pageableCaptor.getValue().getPageSize());
        assertEquals(Sort.Direction.DESC, pageableCaptor.getValue().getSort().getOrderFor("gmtUpdate").getDirection());
    }

    @Test
    void findEntityPageDefaultsSortWhenRequestDoesNotSpecifyIt() {
        when(entityWorkspaceQueryService.findEntityPage(any(Specification.class), any(Pageable.class)))
                .thenReturn(Page.empty());

        entityCatalogQueryService.findEntityPage(
                null, null, null, null, null, null, null, null, null, null,
                null, null, 2, 20, null);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(entityWorkspaceQueryService).findEntityPage(any(Specification.class), pageableCaptor.capture());
        assertEquals(2, pageableCaptor.getValue().getPageNumber());
        assertEquals(20, pageableCaptor.getValue().getPageSize());
        assertEquals(Sort.Direction.DESC, pageableCaptor.getValue().getSort().getOrderFor("gmtUpdate").getDirection());
    }
}
