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
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Owns raw persisted governance-state lookup and workspace-scoped read routing.
 */
@Service
public class EntityGovernanceStateQueryService {

    private final EntityGovernanceStateDao entityGovernanceStateDao;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityGovernanceStateQueryService(EntityGovernanceStateDao entityGovernanceStateDao,
                                             EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityGovernanceStateDao = entityGovernanceStateDao;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public List<EntityGovernanceState> findGovernanceStates(
            String stateScope, String stateKind, Pageable pageable) {
        return findGovernanceStates(
                stateScope, stateKind, pageable, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public List<EntityGovernanceState> findGovernanceStates(
            String stateScope, String stateKind, Pageable pageable, String requestWorkspaceId) {
        if (StringUtils.hasText(requestWorkspaceId)) {
            return entityGovernanceStateDao.findAllByStateScopeAndStateKindAndWorkspaceIdOrderByGmtUpdateDescIdDesc(
                    stateScope, stateKind, requestWorkspaceId, pageable);
        }
        return entityGovernanceStateDao.findAllByStateScopeAndStateKindOrderByGmtUpdateDescIdDesc(
                stateScope, stateKind, pageable);
    }

    public Optional<EntityGovernanceState> findGovernanceState(
            String stateScope, String stateKind, String stateKey) {
        return findGovernanceState(
                stateScope, stateKind, stateKey, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public Optional<EntityGovernanceState> findGovernanceState(
            String stateScope, String stateKind, String stateKey, String requestWorkspaceId) {
        if (StringUtils.hasText(requestWorkspaceId)) {
            return entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                    stateScope, stateKind, stateKey, requestWorkspaceId);
        }
        return entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKey(stateScope, stateKind, stateKey);
    }
}
