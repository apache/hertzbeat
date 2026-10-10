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

import org.springframework.stereotype.Service;

/**
 * Owns entity deletion side effects behind the workspace boundary.
 */
@Service
public class EntityDeletionWriteModelService {

    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final EntityIdentityWriteModelService entityIdentityWriteModelService;
    private final EntityMonitorBindService entityMonitorBindService;
    private final EntityRelationService entityRelationService;
    private final EntityCoreWriteModelService entityCoreWriteModelService;

    public EntityDeletionWriteModelService(EntityWorkspaceAccessService entityWorkspaceAccessService,
                                           EntityIdentityWriteModelService entityIdentityWriteModelService,
                                           EntityMonitorBindService entityMonitorBindService,
                                           EntityRelationService entityRelationService,
                                           EntityCoreWriteModelService entityCoreWriteModelService) {
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.entityIdentityWriteModelService = entityIdentityWriteModelService;
        this.entityMonitorBindService = entityMonitorBindService;
        this.entityRelationService = entityRelationService;
        this.entityCoreWriteModelService = entityCoreWriteModelService;
    }

    public boolean deleteEntity(long entityId) {
        if (entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(entityId).isEmpty()) {
            return false;
        }
        entityIdentityWriteModelService.deleteIdentities(entityId);
        entityMonitorBindService.deleteMonitorBinds(entityId);
        entityRelationService.deleteRelationsForEntity(entityId);
        entityCoreWriteModelService.deleteEntityById(entityId);
        return true;
    }
}
