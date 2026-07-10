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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for persisted entity relation lookup.
 */
@ExtendWith(MockitoExtension.class)
class EntityRelationQueryServiceTest {

    @InjectMocks
    private EntityRelationQueryService entityRelationQueryService;

    @Mock
    private EntityRelationDao entityRelationDao;

    @Test
    void findEntityRelationsReturnsIncomingAndOutgoingRows() {
        EntityRelation relation = EntityRelation.builder()
                .id(21L)
                .sourceEntityId(10L)
                .targetEntityId(20L)
                .relationType("depends_on")
                .build();
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(10L, 10L)).thenReturn(List.of(relation));

        List<EntityRelation> relations = entityRelationQueryService.findEntityRelations(10L);

        assertEquals(List.of(relation), relations);
    }

    @Test
    void findEntityRelationsWithLimitReturnsStablePreviewRows() {
        EntityRelation relation = EntityRelation.builder()
                .id(31L)
                .sourceEntityId(10L)
                .targetEntityId(30L)
                .relationType("calls")
                .build();
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(eq(10L), eq(10L), any(PageRequest.class)))
                .thenReturn(List.of(relation));

        List<EntityRelation> relations = entityRelationQueryService.findEntityRelations(10L, 50);

        assertEquals(List.of(relation), relations);
        verify(entityRelationDao).findBySourceEntityIdOrTargetEntityId(eq(10L), eq(10L), any(PageRequest.class));
    }

    @Test
    void findEntityRelationsWithNonPositiveLimitSkipsStorage() {
        assertEquals(List.of(), entityRelationQueryService.findEntityRelations(10L, 0));
    }

    @Test
    void countEntityRelationsReturnsIncomingAndOutgoingCount() {
        when(entityRelationDao.countBySourceEntityIdOrTargetEntityId(10L, 10L)).thenReturn(3L);

        assertEquals(3L, entityRelationQueryService.countEntityRelations(10L));
        verify(entityRelationDao).countBySourceEntityIdOrTargetEntityId(10L, 10L);
    }

    @Test
    void countEntityRelationsByEntityIdsMergesIncomingAndOutgoingCounts() {
        List<Long> entityIds = List.of(10L, 20L);
        when(entityRelationDao.countBySourceEntityIdInGroupBySourceEntityId(entityIds))
                .thenReturn(List.<Object[]>of(new Object[] {10L, 2L}));
        when(entityRelationDao.countByTargetEntityIdInGroupByTargetEntityId(entityIds))
                .thenReturn(List.<Object[]>of(new Object[] {10L, 1L}, new Object[] {20L, 4L}));

        assertEquals(Map.of(10L, 3L, 20L, 4L), entityRelationQueryService.countEntityRelationsByEntityIds(entityIds));
        verify(entityRelationDao).countBySourceEntityIdInGroupBySourceEntityId(entityIds);
        verify(entityRelationDao).countByTargetEntityIdInGroupByTargetEntityId(entityIds);
    }
}
