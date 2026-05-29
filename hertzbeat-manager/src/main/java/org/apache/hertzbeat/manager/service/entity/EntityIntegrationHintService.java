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
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.springframework.stereotype.Service;

/**
 * Builds integration hints that connect traditional monitors to entity catalog candidates.
 */
@Service
public class EntityIntegrationHintService {

    private final EntityMonitorQueryService entityMonitorQueryService;
    private final EntityIdentityResolutionService entityIdentityResolutionService;

    public EntityIntegrationHintService(EntityMonitorQueryService entityMonitorQueryService,
                                        EntityIdentityResolutionService entityIdentityResolutionService) {
        this.entityMonitorQueryService = entityMonitorQueryService;
        this.entityIdentityResolutionService = entityIdentityResolutionService;
    }

    public List<EntityMonitorBindingCandidate> getMonitorBindingCandidates(long monitorId) {
        Monitor monitor = entityMonitorQueryService.findMonitor(monitorId).orElse(null);
        if (monitor == null) {
            return Collections.emptyList();
        }
        return entityIdentityResolutionService.resolveMonitorBindingCandidates(monitor);
    }
}
