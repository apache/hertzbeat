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
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Persists entity relation rows for the relation domain boundary.
 */
@Service
public class EntityRelationWriteModelService {

    private final EntityRelationDao entityRelationDao;

    public EntityRelationWriteModelService(EntityRelationDao entityRelationDao) {
        this.entityRelationDao = entityRelationDao;
    }

    public void deleteIncomingAndOutgoingRelations(Long entityId) {
        entityRelationDao.deleteAllBySourceEntityIdOrTargetEntityId(entityId, entityId);
    }

    public void replaceSourceRelations(Long entityId, List<EntityRelation> rows) {
        entityRelationDao.deleteAllBySourceEntityId(entityId);
        entityRelationDao.flush();
        if (!CollectionUtils.isEmpty(rows)) {
            entityRelationDao.saveAll(rows);
        }
    }
}
