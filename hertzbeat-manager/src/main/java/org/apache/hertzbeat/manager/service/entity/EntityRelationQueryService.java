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
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Owns persisted relation evidence lookup for entity read-model boundaries.
 */
@Service
public class EntityRelationQueryService {

    private final EntityRelationDao entityRelationDao;

    public EntityRelationQueryService(EntityRelationDao entityRelationDao) {
        this.entityRelationDao = entityRelationDao;
    }

    public List<EntityRelation> findEntityRelations(Long entityId) {
        return entityRelationDao.findBySourceEntityIdOrTargetEntityId(entityId, entityId);
    }

    public List<EntityRelation> findEntityRelations(Long entityId, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        return entityRelationDao.findBySourceEntityIdOrTargetEntityId(
                entityId, entityId, PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "id")));
    }

    public long countEntityRelations(Long entityId) {
        return entityRelationDao.countBySourceEntityIdOrTargetEntityId(entityId, entityId);
    }

    public Map<Long, Long> countEntityRelationsByEntityIds(List<Long> entityIds) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return Map.of();
        }
        Map<Long, Long> counts = new LinkedHashMap<>();
        mergeCounts(counts, entityRelationDao.countBySourceEntityIdInGroupBySourceEntityId(entityIds));
        mergeCounts(counts, entityRelationDao.countByTargetEntityIdInGroupByTargetEntityId(entityIds));
        return counts;
    }

    private void mergeCounts(Map<Long, Long> counts, List<Object[]> rows) {
        if (CollectionUtils.isEmpty(rows)) {
            return;
        }
        for (Object[] row : rows) {
            Long entityId = (Long) row[0];
            long count = ((Number) row[1]).longValue();
            counts.merge(entityId, count, Long::sum);
        }
    }
}
