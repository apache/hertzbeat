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
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.springframework.stereotype.Service;

/**
 * Refreshes entity runtime status from current monitor bindings and alert evidence.
 */
@Service
public class EntityStatusRefreshService {

    private static final int ACTIVE_ALERT_LIMIT = 20;

    private final EntityMonitorBindService entityMonitorBindService;
    private final EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService;
    private final EntityRuntimeHealthService entityRuntimeHealthService;

    public EntityStatusRefreshService(EntityMonitorBindService entityMonitorBindService,
                                      EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService,
                                      EntityRuntimeHealthService entityRuntimeHealthService) {
        this.entityMonitorBindService = entityMonitorBindService;
        this.entityAlertEvidenceReadModelService = entityAlertEvidenceReadModelService;
        this.entityRuntimeHealthService = entityRuntimeHealthService;
    }

    public EntityStatusInfo refreshEntityStatus(ObserveEntity entity) {
        return refreshEntityStatusWithEvidence(entity).statusInfo();
    }

    public EntityStatusInfo refreshEntityStatus(ObserveEntity entity, String requestWorkspaceId) {
        return refreshEntityStatusWithEvidence(entity, requestWorkspaceId).statusInfo();
    }

    public EntityRuntimeStatusEvidence refreshEntityStatusWithEvidence(ObserveEntity entity) {
        List<Monitor> monitors = entityMonitorBindService.findEntityMonitors(entity.getId());
        List<SingleAlert> activeAlerts = entityAlertEvidenceReadModelService.queryActiveAlerts(
                monitors, ACTIVE_ALERT_LIMIT);
        EntityStatusInfo statusInfo = entityRuntimeHealthService.refreshEntityStatus(entity, monitors, activeAlerts);
        return new EntityRuntimeStatusEvidence(monitors, activeAlerts, statusInfo);
    }

    public EntityRuntimeStatusEvidence refreshEntityStatusWithEvidence(ObserveEntity entity, String requestWorkspaceId) {
        List<Monitor> monitors = entityMonitorBindService.findEntityMonitors(entity.getId());
        List<SingleAlert> activeAlerts = entityAlertEvidenceReadModelService.queryActiveAlerts(
                monitors, ACTIVE_ALERT_LIMIT, requestWorkspaceId);
        EntityStatusInfo statusInfo = entityRuntimeHealthService.refreshEntityStatus(entity, monitors, activeAlerts);
        return new EntityRuntimeStatusEvidence(monitors, activeAlerts, statusInfo);
    }

    /**
     * Runtime status evidence collected during a refresh operation.
     */
    public record EntityRuntimeStatusEvidence(
            List<Monitor> monitors,
            List<SingleAlert> activeAlerts,
            EntityStatusInfo statusInfo) {
    }
}
