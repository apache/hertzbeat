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

import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Owns raw persisted governance-state upsert, delete, and workspace routing.
 */
@Service
public class EntityGovernanceStateWriteModelService {

    private final EntityGovernanceStateDao entityGovernanceStateDao;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityGovernanceStateWriteModelService(EntityGovernanceStateDao entityGovernanceStateDao,
                                                  EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityGovernanceStateDao = entityGovernanceStateDao;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public EntityGovernanceState findGovernanceStateForWrite(
            String stateScope, String stateKind, String stateKey) {
        return findGovernanceStateForWrite(
                stateScope, stateKind, stateKey, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public EntityGovernanceState findGovernanceStateForWrite(
            String stateScope, String stateKind, String stateKey, String requestWorkspaceId) {
        EntityGovernanceState state = findExistingGovernanceState(
                stateScope, stateKind, stateKey, requestWorkspaceId).orElseGet(EntityGovernanceState::new);
        state.setWorkspaceId(resolveGovernanceWorkspaceId(state.getWorkspaceId(), requestWorkspaceId));
        return state;
    }

    public EntityGovernanceState saveGovernanceState(EntityGovernanceState state) {
        return entityGovernanceStateDao.saveAndFlush(state);
    }

    public void deleteGovernanceState(
            String stateScope, String stateKind, String stateKey) {
        deleteGovernanceState(
                stateScope, stateKind, stateKey, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public void deleteGovernanceState(
            String stateScope, String stateKind, String stateKey, String requestWorkspaceId) {
        if (StringUtils.hasText(requestWorkspaceId)) {
            entityGovernanceStateDao.deleteByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                    stateScope, stateKind, stateKey, requestWorkspaceId);
            return;
        }
        entityGovernanceStateDao.deleteByStateScopeAndStateKindAndStateKey(stateScope, stateKind, stateKey);
    }

    private Optional<EntityGovernanceState> findExistingGovernanceState(
            String stateScope, String stateKind, String stateKey, String requestWorkspaceId) {
        if (StringUtils.hasText(requestWorkspaceId)) {
            return entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                    stateScope, stateKind, stateKey, requestWorkspaceId);
        }
        return entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKey(stateScope, stateKind, stateKey);
    }

    private String resolveGovernanceWorkspaceId(String currentWorkspaceId, String requestWorkspaceId) {
        if (StringUtils.hasText(requestWorkspaceId)) {
            return requestWorkspaceId;
        }
        if (StringUtils.hasText(currentWorkspaceId)) {
            return AuthTokenScopes.normalizeWorkspaceId(currentWorkspaceId);
        }
        return AuthTokenScopes.DEFAULT_WORKSPACE_ID;
    }
}
