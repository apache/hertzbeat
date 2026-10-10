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
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * Coordinates entity evidence reads that require entity access and bound monitor context.
 */
@Service
public class EntityEvidenceReadModelService {

    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final EntityMonitorBindService entityMonitorBindService;
    private final EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService;
    private final EntityMonitorEvidenceReadModelService entityMonitorEvidenceReadModelService;

    public EntityEvidenceReadModelService(EntityWorkspaceAccessService entityWorkspaceAccessService,
                                          EntityMonitorBindService entityMonitorBindService,
                                          EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService,
                                          EntityMonitorEvidenceReadModelService entityMonitorEvidenceReadModelService) {
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.entityMonitorBindService = entityMonitorBindService;
        this.entityAlertEvidenceReadModelService = entityAlertEvidenceReadModelService;
        this.entityMonitorEvidenceReadModelService = entityMonitorEvidenceReadModelService;
    }

    public Page<SingleAlert> getEntityAlerts(long entityId, String status, String severity,
                                             int pageIndex, int pageSize) {
        PageRequest pageRequest = normalizePageRequest(
                pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "gmtUpdate"));
        if (!entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(entityId)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        List<Monitor> monitors = entityMonitorBindService.findEntityMonitors(entityId);
        return entityAlertEvidenceReadModelService.buildEntityAlertPage(
                monitors, status, severity, pageIndex, pageSize);
    }

    public Page<MonitorInfo> getEntityMonitors(long entityId, Byte status, String app, int pageIndex, int pageSize) {
        PageRequest pageRequest = normalizePageRequest(pageIndex, pageSize, Sort.unsorted());
        if (!entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(entityId)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        return entityMonitorEvidenceReadModelService.buildEntityMonitorPage(
                entityMonitorBindService.findEntityMonitors(entityId), status, app, pageIndex, pageSize);
    }

    private PageRequest normalizePageRequest(int pageIndex, int pageSize, Sort sort) {
        int safePageIndex = Math.max(pageIndex, 0);
        int safePageSize = pageSize <= 0 ? 10 : Math.min(pageSize, 100);
        return PageRequest.of(safePageIndex, safePageSize, sort);
    }
}
