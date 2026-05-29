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
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
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
    void countEntityRelationsReturnsIncomingAndOutgoingCount() {
        when(entityRelationDao.countBySourceEntityIdOrTargetEntityId(10L, 10L)).thenReturn(3L);

        assertEquals(3L, entityRelationQueryService.countEntityRelations(10L));
        verify(entityRelationDao).countBySourceEntityIdOrTargetEntityId(10L, 10L);
    }
}
