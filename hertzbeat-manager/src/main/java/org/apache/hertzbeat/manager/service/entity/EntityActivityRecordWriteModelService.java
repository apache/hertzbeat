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

import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Persists entity activity rows and resolves their workspace scope at the final write boundary.
 */
@Service
public class EntityActivityRecordWriteModelService {

    private static final String FORMAT_YAML = "yaml";

    private final EntityDefinitionActivityDao entityDefinitionActivityDao;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityActivityRecordWriteModelService(EntityDefinitionActivityDao entityDefinitionActivityDao,
                                                 EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityDefinitionActivityDao = entityDefinitionActivityDao;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public void recordActivityForCurrentWorkspace(Long entityId, String activityType, String format, String status,
                                                  String summary, String detail, ObserveEntity entity) {
        recordActivity(entityId, activityType, format, status, summary, detail, entity,
                entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public void recordActivity(Long entityId, String activityType, String format, String status, String summary,
                               String detail, ObserveEntity entity, String requestWorkspaceId) {
        String normalizedFormat = StringUtils.hasText(format) ? format : FORMAT_YAML;
        entityDefinitionActivityDao.saveAndFlush(EntityDefinitionActivity.builder()
                .entityId(entityId)
                .workspaceId(resolveActivityWorkspaceId(entityId, entity, requestWorkspaceId))
                .activityType(activityType)
                .format(normalizedFormat)
                .status(status)
                .summary(summary)
                .detail(detail)
                .build());
    }

    private String resolveActivityWorkspaceId(Long entityId, ObserveEntity entity, String requestWorkspaceId) {
        if (StringUtils.hasText(requestWorkspaceId)) {
            return AuthTokenScopes.normalizeWorkspaceId(requestWorkspaceId);
        }
        if (entity != null && StringUtils.hasText(entity.getWorkspaceId())) {
            return AuthTokenScopes.normalizeWorkspaceId(entity.getWorkspaceId());
        }
        if (entityId != null) {
            return entityWorkspaceAccessService.findEntityById(entityId)
                    .map(ObserveEntity::getWorkspaceId)
                    .filter(StringUtils::hasText)
                    .map(AuthTokenScopes::normalizeWorkspaceId)
                    .orElse(AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        }
        return AuthTokenScopes.DEFAULT_WORKSPACE_ID;
    }
}
