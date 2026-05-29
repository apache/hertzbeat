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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Query boundary for raw entity definition activity rows.
 */
@Service
public class EntityActivityQueryService {

    private static final String ACTIVITY_TYPE_DEFINITION_IMPORT = "definition_import";
    private static final String ACTIVITY_TYPE_DEFINITION_UPDATE = "definition_update";

    private final EntityDefinitionActivityDao entityDefinitionActivityDao;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityActivityQueryService(EntityDefinitionActivityDao entityDefinitionActivityDao,
                                      EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityDefinitionActivityDao = entityDefinitionActivityDao;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public List<EntityDefinitionActivity> findDefinitionActivities(Long entityId, Pageable pageRequest) {
        return findDefinitionActivities(entityId, pageRequest, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public List<EntityDefinitionActivity> findDefinitionActivities(Long entityId, Pageable pageRequest,
                                                                    String requestWorkspaceId) {
        String workspaceId = normalizeWorkspaceId(requestWorkspaceId);
        if (entityId != null) {
            if (!entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(entityId, workspaceId)) {
                return Collections.emptyList();
            }
            return entityDefinitionActivityDao.findAllByEntityId(entityId, pageRequest).stream()
                    .filter(activity -> matchesActivityWorkspace(activity, workspaceId))
                    .toList();
        }
        if (StringUtils.hasText(workspaceId)) {
            return entityDefinitionActivityDao.findAllByWorkspaceId(workspaceId, pageRequest).stream()
                    .filter(activity -> matchesActivityWorkspace(activity, workspaceId))
                    .toList();
        }
        return entityDefinitionActivityDao.findAll(pageRequest).stream()
                .toList();
    }

    public Map<Long, EntityDefinitionActivity> findLatestDefinitionActivities(List<Long> entityIds) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return Collections.emptyMap();
        }
        List<Long> acceptedEntityIds = entityIds.stream()
                .filter(id -> id != null)
                .toList();
        if (CollectionUtils.isEmpty(acceptedEntityIds)) {
            return Collections.emptyMap();
        }
        List<EntityDefinitionActivity> activities = entityDefinitionActivityDao.findAllByEntityIdIn(
                acceptedEntityIds, Sort.by(Sort.Order.desc("gmtCreate"), Sort.Order.desc("id"))
        );
        Map<Long, EntityDefinitionActivity> latestActivityMap = new LinkedHashMap<>();
        for (EntityDefinitionActivity activity : activities) {
            if (activity != null
                    && activity.getEntityId() != null
                    && isDefinitionActivityType(activity.getActivityType())
                    && !latestActivityMap.containsKey(activity.getEntityId())) {
                latestActivityMap.put(activity.getEntityId(), activity);
            }
        }
        return latestActivityMap;
    }

    private boolean matchesActivityWorkspace(EntityDefinitionActivity activity, String requestWorkspaceId) {
        if (!StringUtils.hasText(requestWorkspaceId)) {
            return true;
        }
        String activityWorkspaceId = activity == null ? null : activity.getWorkspaceId();
        if (!StringUtils.hasText(activityWorkspaceId)) {
            return AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(requestWorkspaceId);
        }
        return requestWorkspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(activityWorkspaceId));
    }

    private boolean isDefinitionActivityType(String activityType) {
        return ACTIVITY_TYPE_DEFINITION_IMPORT.equals(activityType)
                || ACTIVITY_TYPE_DEFINITION_UPDATE.equals(activityType);
    }

    private String normalizeWorkspaceId(String requestWorkspaceId) {
        return StringUtils.hasText(requestWorkspaceId) ? AuthTokenScopes.normalizeWorkspaceId(requestWorkspaceId) : null;
    }
}
