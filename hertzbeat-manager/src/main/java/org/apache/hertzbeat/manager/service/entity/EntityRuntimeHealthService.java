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

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Evaluates and persists runtime health for observed entities from real monitor and alert evidence.
 */
@Service
public class EntityRuntimeHealthService {

    private static final String STATUS_UNKNOWN = "unknown";
    private static final String STATUS_HEALTHY = "healthy";
    private static final String STATUS_DEGRADED = "degraded";
    private static final String STATUS_CRITICAL = "critical";
    private static final String STATUS_PAUSED = "paused";

    private final EntityRuntimeHealthWriteModelService entityRuntimeHealthWriteModelService;

    public EntityRuntimeHealthService(EntityRuntimeHealthWriteModelService entityRuntimeHealthWriteModelService) {
        this.entityRuntimeHealthWriteModelService = entityRuntimeHealthWriteModelService;
    }

    public EntityStatusInfo refreshEntityStatus(ObserveEntity entity, List<Monitor> monitors,
                                                List<SingleAlert> activeAlerts) {
        List<Monitor> safeMonitors = CollectionUtils.isEmpty(monitors) ? Collections.emptyList() : monitors;
        int monitorTotal = safeMonitors.size();
        int monitorUpCount = (int) safeMonitors.stream()
                .filter(monitor -> monitor.getStatus() == CommonConstants.MONITOR_UP_CODE)
                .count();
        int monitorDownCount = (int) safeMonitors.stream()
                .filter(monitor -> monitor.getStatus() == CommonConstants.MONITOR_DOWN_CODE)
                .count();
        int monitorPausedCount = (int) safeMonitors.stream()
                .filter(monitor -> monitor.getStatus() == CommonConstants.MONITOR_PAUSED_CODE)
                .count();
        int activeAlertCount = CollectionUtils.isEmpty(activeAlerts) ? 0 : activeAlerts.size();
        String status;
        String reason;
        if (activeAlertCount > 0) {
            status = STATUS_CRITICAL;
            reason = activeAlertCount + " firing alerts";
        } else if (monitorDownCount > 0) {
            status = STATUS_DEGRADED;
            reason = monitorDownCount + " monitors down";
        } else if (monitorUpCount > 0) {
            status = STATUS_HEALTHY;
            reason = monitorUpCount + " monitors healthy";
        } else if (monitorTotal > 0 && monitorPausedCount == monitorTotal) {
            status = STATUS_PAUSED;
            reason = "all bound monitors paused";
        } else {
            status = STATUS_UNKNOWN;
            reason = "no live evidence bound yet";
        }
        if (entity != null && !Objects.equals(entity.getStatus(), status)) {
            entityRuntimeHealthWriteModelService.persistStatus(entity, status);
        }
        return new EntityStatusInfo(
                status,
                reason,
                monitorTotal,
                monitorUpCount,
                monitorDownCount,
                monitorPausedCount,
                activeAlertCount,
                LocalDateTime.now()
        );
    }
}
