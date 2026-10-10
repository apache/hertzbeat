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

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for persisted entity relation writes.
 */
@ExtendWith(MockitoExtension.class)
class EntityRelationWriteModelServiceTest {

    @InjectMocks
    private EntityRelationWriteModelService entityRelationWriteModelService;

    @Mock
    private EntityRelationDao entityRelationDao;

    @Test
    void deleteIncomingAndOutgoingRelationsRemovesAllEntityEdges() {
        entityRelationWriteModelService.deleteIncomingAndOutgoingRelations(10L);

        verify(entityRelationDao).deleteAllBySourceEntityIdOrTargetEntityId(10L, 10L);
    }

    @Test
    void replaceSourceRelationsDeletesExistingRowsBeforeSavingReplacementRows() {
        EntityRelation relation = EntityRelation.builder()
                .sourceEntityId(10L)
                .targetEntityId(20L)
                .relationType("depends_on")
                .build();

        entityRelationWriteModelService.replaceSourceRelations(10L, List.of(relation));

        InOrder inOrder = inOrder(entityRelationDao);
        inOrder.verify(entityRelationDao).deleteAllBySourceEntityId(10L);
        inOrder.verify(entityRelationDao).flush();
        inOrder.verify(entityRelationDao).saveAll(List.of(relation));
    }
}
