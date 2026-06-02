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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/**
 * Contract for raw persisted entity catalog lookup.
 */
@ExtendWith(MockitoExtension.class)
class EntityWorkspaceQueryServiceTest {

    @InjectMocks
    private EntityWorkspaceQueryService entityWorkspaceQueryService;

    @Mock
    private ObserveEntityDao observeEntityDao;

    @Test
    void findEntitiesByIdsUsesPersistedCatalogRows() {
        ObserveEntity checkout = ObserveEntity.builder()
                .id(301L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        when(observeEntityDao.findAllById(List.of(301L))).thenReturn(List.of(checkout));

        List<ObserveEntity> entities = entityWorkspaceQueryService.findEntitiesByIds(List.of(301L));

        assertEquals(List.of(checkout), entities);
        verify(observeEntityDao).findAllById(List.of(301L));
    }

    @Test
    void findEntitiesRoutesWorkspaceAndUnscopedSortedLookup() {
        Sort sort = Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id"));
        ObserveEntity checkout = ObserveEntity.builder()
                .id(401L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity billing = ObserveEntity.builder()
                .id(402L)
                .name("billing")
                .workspaceId("team-b")
                .build();
        when(observeEntityDao.findAllByWorkspaceId("team-a", sort)).thenReturn(List.of(checkout));
        when(observeEntityDao.findAll(sort)).thenReturn(List.of(checkout, billing));

        List<ObserveEntity> teamEntities = entityWorkspaceQueryService.findEntities("team-a", sort);
        List<ObserveEntity> allEntities = entityWorkspaceQueryService.findEntities(null, sort);

        assertEquals(List.of(checkout), teamEntities);
        assertEquals(List.of(checkout, billing), allEntities);
        verify(observeEntityDao).findAllByWorkspaceId("team-a", sort);
        verify(observeEntityDao).findAll(sort);
    }

    @Test
    void findEntitiesRoutesWorkspaceAndUnscopedPagedLookup() {
        PageRequest pageable = PageRequest.of(0, 12, Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id")));
        ObserveEntity checkout = ObserveEntity.builder()
                .id(411L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        ObserveEntity billing = ObserveEntity.builder()
                .id(412L)
                .name("billing")
                .workspaceId("team-b")
                .build();
        Page<ObserveEntity> persistedPage = new PageImpl<>(List.of(checkout, billing), pageable, 2);
        when(observeEntityDao.findAllByWorkspaceId("team-a", pageable)).thenReturn(List.of(checkout));
        when(observeEntityDao.findAll(pageable)).thenReturn(persistedPage);

        List<ObserveEntity> teamEntities = entityWorkspaceQueryService.findEntities("team-a", pageable);
        List<ObserveEntity> allEntities = entityWorkspaceQueryService.findEntities(null, pageable);

        assertEquals(List.of(checkout), teamEntities);
        assertEquals(List.of(checkout, billing), allEntities);
        verify(observeEntityDao).findAllByWorkspaceId("team-a", pageable);
        verify(observeEntityDao).findAll(pageable);
    }

    @Test
    void findEntityPageUsesPersistedCatalogRows() {
        PageRequest pageable = PageRequest.of(0, 8, Sort.by(Sort.Order.desc("gmtUpdate")));
        Specification<ObserveEntity> specification = (root, query, criteriaBuilder) -> query.where().getRestriction();
        ObserveEntity checkout = ObserveEntity.builder()
                .id(451L)
                .name("checkout")
                .workspaceId("team-a")
                .build();
        Page<ObserveEntity> persistedPage = new PageImpl<>(List.of(checkout), pageable, 1);
        when(observeEntityDao.findAll(specification, pageable)).thenReturn(persistedPage);

        Page<ObserveEntity> page = entityWorkspaceQueryService.findEntityPage(specification, pageable);

        assertEquals(persistedPage, page);
        verify(observeEntityDao).findAll(specification, pageable);
    }

    @Test
    void findEntityByIdUsesPersistedCatalogRow() {
        ObserveEntity checkout = ObserveEntity.builder()
                .id(501L)
                .name("checkout")
                .build();
        when(observeEntityDao.findById(501L)).thenReturn(Optional.of(checkout));

        Optional<ObserveEntity> entity = entityWorkspaceQueryService.findEntityById(501L);

        assertEquals(Optional.of(checkout), entity);
        verify(observeEntityDao).findById(501L);
    }

    @Test
    void findEntityByReferenceRoutesWorkspaceAndUnscopedLookup() {
        ObserveEntity checkout = ObserveEntity.builder()
                .id(601L)
                .type("service")
                .namespace("payments")
                .name("checkout")
                .workspaceId("team-a")
                .build();
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                "team-a", "service", "payments", "checkout"))
                .thenReturn(Optional.of(checkout));
        when(observeEntityDao.findFirstByTypeAndNamespaceAndName("service", "payments", "checkout"))
                .thenReturn(Optional.of(checkout));
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndName("team-a", "service", "checkout"))
                .thenReturn(Optional.of(checkout));
        when(observeEntityDao.findFirstByTypeAndName("service", "checkout"))
                .thenReturn(Optional.of(checkout));

        Optional<ObserveEntity> scopedNamespaceReference = entityWorkspaceQueryService.findEntityByReference(
                "team-a", "service", "payments", "checkout");
        Optional<ObserveEntity> unscopedNamespaceReference = entityWorkspaceQueryService.findEntityByReference(
                null, "service", "payments", "checkout");
        Optional<ObserveEntity> scopedNameReference = entityWorkspaceQueryService.findEntityByReference(
                "team-a", "service", "checkout");
        Optional<ObserveEntity> unscopedNameReference = entityWorkspaceQueryService.findEntityByReference(
                null, "service", "checkout");

        assertEquals(Optional.of(checkout), scopedNamespaceReference);
        assertEquals(Optional.of(checkout), unscopedNamespaceReference);
        assertEquals(Optional.of(checkout), scopedNameReference);
        assertEquals(Optional.of(checkout), unscopedNameReference);
        verify(observeEntityDao).findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                "team-a", "service", "payments", "checkout");
        verify(observeEntityDao).findFirstByTypeAndNamespaceAndName("service", "payments", "checkout");
        verify(observeEntityDao).findFirstByWorkspaceIdAndTypeAndName("team-a", "service", "checkout");
        verify(observeEntityDao).findFirstByTypeAndName("service", "checkout");
    }
}
