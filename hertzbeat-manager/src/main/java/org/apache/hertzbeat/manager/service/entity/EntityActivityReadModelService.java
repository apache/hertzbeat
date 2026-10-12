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

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionActivityInfo;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Builds entity activity timeline read models behind a workspace boundary.
 */
@Service
public class EntityActivityReadModelService {

    private final EntityActivityQueryService entityActivityQueryService;

    public EntityActivityReadModelService(EntityActivityQueryService entityActivityQueryService) {
        this.entityActivityQueryService = entityActivityQueryService;
    }

    public List<EntityDefinitionActivityInfo> getDefinitionActivities(Long entityId, int limit) {
        PageRequest pageRequest = pageRequest(limit);
        return entityActivityQueryService.findDefinitionActivities(entityId, pageRequest).stream()
                .map(this::toDefinitionActivityInfo)
                .toList();
    }

    public List<EntityDefinitionActivityInfo> getDefinitionActivities(Long entityId, int limit,
                                                                       String requestWorkspaceId) {
        PageRequest pageRequest = pageRequest(limit);
        return entityActivityQueryService.findDefinitionActivities(entityId, pageRequest, requestWorkspaceId).stream()
                .map(this::toDefinitionActivityInfo)
                .toList();
    }

    public Map<Long, EntityDefinitionActivity> findLatestDefinitionActivities(List<Long> entityIds) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return Collections.emptyMap();
        }
        return entityActivityQueryService.findLatestDefinitionActivities(entityIds);
    }

    private PageRequest pageRequest(int limit) {
        int pageSize = limit <= 0 ? 12 : Math.min(limit, 50);
        return PageRequest.of(
                0, pageSize, Sort.by(Sort.Order.desc("gmtCreate"), Sort.Order.desc("id")));
    }

    private EntityDefinitionActivityInfo toDefinitionActivityInfo(EntityDefinitionActivity activity) {
        return new EntityDefinitionActivityInfo(
                activity.getId(),
                activity.getEntityId(),
                activity.getActivityType(),
                activity.getFormat(),
                activity.getStatus(),
                activity.getSummary(),
                activity.getDetail(),
                activity.getCreator(),
                activity.getGmtCreate()
        );
    }

}
