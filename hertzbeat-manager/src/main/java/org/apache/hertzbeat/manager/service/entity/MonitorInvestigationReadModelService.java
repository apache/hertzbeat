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

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.MonitorInvestigationBindingInfo;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Resolves the exact persisted Entity binding for a Monitor investigation.
 */
@Service
public class MonitorInvestigationReadModelService {

    private static final String ACTIVE_BIND = "active";
    private static final String SERVICE_ENTITY = "service";

    private final EntityMonitorBindQueryService entityMonitorBindQueryService;
    private final EntityDetailObservabilityReadModelService entityDetailObservabilityReadModelService;

    public MonitorInvestigationReadModelService(EntityMonitorBindQueryService entityMonitorBindQueryService,
                                                EntityDetailObservabilityReadModelService
                                                        entityDetailObservabilityReadModelService) {
        this.entityMonitorBindQueryService = entityMonitorBindQueryService;
        this.entityDetailObservabilityReadModelService = entityDetailObservabilityReadModelService;
    }

    public Optional<MonitorInvestigationBindingInfo> resolve(Long monitorId) {
        if (monitorId == null || monitorId <= 0) {
            return Optional.empty();
        }
        List<EntityMonitorBind> activeBinds = entityMonitorBindQueryService.findMonitorBindsByMonitorId(monitorId)
                .stream()
                .filter(bind -> isExactActiveBind(bind, monitorId))
                .toList();
        if (activeBinds.size() != 1) {
            return Optional.empty();
        }
        EntityMonitorBind bind = activeBinds.getFirst();
        EntityDetailDto detail = entityDetailObservabilityReadModelService.buildEntityDetail(bind.getEntityId());
        return toBinding(monitorId, bind.getEntityId(), detail);
    }

    private Optional<MonitorInvestigationBindingInfo> toBinding(Long monitorId,
                                                                Long entityId,
                                                                EntityDetailDto detail) {
        ObserveEntity entity = detail == null || detail.getEntity() == null ? null : detail.getEntity().getEntity();
        if (!validServiceEntity(entityId, entity) || !containsMonitor(detail, monitorId)) {
            return Optional.empty();
        }
        List<String> signals = new ArrayList<>();
        signals.add("metrics");
        if (!CollectionUtils.isEmpty(detail.getLogEvidence())) {
            signals.add("logs");
        }
        if (!CollectionUtils.isEmpty(detail.getTraceEvidence())) {
            signals.add("traces");
        }
        return Optional.of(new MonitorInvestigationBindingInfo(
                monitorId,
                entityId,
                SERVICE_ENTITY,
                entity.getName().trim(),
                normalize(entity.getNamespace()),
                normalize(entity.getEnvironment()),
                signals
        ));
    }

    private boolean isExactActiveBind(EntityMonitorBind bind, Long monitorId) {
        return bind != null
                && Objects.equals(monitorId, bind.getMonitorId())
                && bind.getEntityId() != null
                && bind.getEntityId() > 0
                && ACTIVE_BIND.equals(bind.getStatus());
    }

    private boolean validServiceEntity(Long entityId, ObserveEntity entity) {
        return entity != null
                && Objects.equals(entityId, entity.getId())
                && SERVICE_ENTITY.equalsIgnoreCase(entity.getType())
                && StringUtils.hasText(entity.getName());
    }

    private boolean containsMonitor(EntityDetailDto detail, Long monitorId) {
        return !CollectionUtils.isEmpty(detail.getBoundMonitors())
                && detail.getBoundMonitors().stream()
                .anyMatch(monitor -> monitor != null && Objects.equals(monitorId, monitor.getId()));
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
