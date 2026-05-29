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
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Persists entity definition and lifecycle activity rows behind the entity-domain write boundary.
 */
@Service
public class EntityActivityWriteModelService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String SOURCE_OTEL_RESOURCE = "otel_resource";
    private static final String SOURCE_DERIVED = "derived";
    private static final String FORMAT_JSON = "json";
    private static final String FORMAT_YAML = "yaml";
    private static final String FORMAT_CURL = "curl";
    private static final String ACTIVITY_SUCCESS = "success";
    private static final String ACTIVITY_ERROR = "error";
    private static final String ACTIVITY_TYPE_DEFINITION_UPDATE = "definition_update";
    private static final String ACTIVITY_TYPE_CATALOG_CREATE = "catalog_create";
    private static final String ACTIVITY_TYPE_CATALOG_UPDATE = "catalog_update";
    private static final String ACTIVITY_TYPE_DISCOVERY_GOVERNANCE = "discovery_governance";
    private static final String ACTIVITY_TYPE_SOURCE_UPDATE = "source_update";
    private static final String BIND_SOURCE_TELEMETRY_DISCOVERY = "telemetry_discovery";
    private static final String TYPE_DATABASE = "database";
    private static final String TYPE_API = "api";
    private static final String KIND_DATASTORE = "datastore";
    private static final String KIND_API = "api";

    private final EntityActivityRecordWriteModelService entityActivityRecordWriteModelService;
    private final EntityMonitorBindService entityMonitorBindService;

    public EntityActivityWriteModelService(
            EntityActivityRecordWriteModelService entityActivityRecordWriteModelService,
            EntityMonitorBindService entityMonitorBindService) {
        this.entityActivityRecordWriteModelService = entityActivityRecordWriteModelService;
        this.entityMonitorBindService = entityMonitorBindService;
    }

    public void recordDefinitionActivity(Long entityId, String activityType, String format, ObserveEntity entity) {
        if (entityId == null) {
            return;
        }
        entityActivityRecordWriteModelService.recordActivityForCurrentWorkspace(
                entityId,
                activityType,
                normalizeDefinitionActivityFormat(format),
                ACTIVITY_SUCCESS,
                buildDefinitionActivitySummary(activityType, ACTIVITY_SUCCESS),
                buildDefinitionActivityDetail(entity, null),
                entity);
    }

    public void recordDefinitionActivity(Long entityId, String activityType, String format,
                                         ObserveEntity entity, String requestWorkspaceId) {
        if (entityId == null) {
            return;
        }
        entityActivityRecordWriteModelService.recordActivity(
                entityId,
                activityType,
                normalizeDefinitionActivityFormat(format),
                ACTIVITY_SUCCESS,
                buildDefinitionActivitySummary(activityType, ACTIVITY_SUCCESS),
                buildDefinitionActivityDetail(entity, null),
                entity,
                requestWorkspaceId);
    }

    public void recordDefinitionActivityFailure(Long entityId, String activityType, String format,
                                                RuntimeException exception) {
        if (entityId == null) {
            return;
        }
        entityActivityRecordWriteModelService.recordActivityForCurrentWorkspace(
                entityId,
                activityType,
                normalizeDefinitionActivityFormat(format),
                ACTIVITY_ERROR,
                buildDefinitionActivitySummary(activityType, ACTIVITY_ERROR),
                buildDefinitionActivityDetail(null, exception),
                null);
    }

    public void recordDefinitionActivityFailure(Long entityId, String activityType, String format,
                                                RuntimeException exception, String requestWorkspaceId) {
        if (entityId == null) {
            return;
        }
        entityActivityRecordWriteModelService.recordActivity(
                entityId,
                activityType,
                normalizeDefinitionActivityFormat(format),
                ACTIVITY_ERROR,
                buildDefinitionActivitySummary(activityType, ACTIVITY_ERROR),
                buildDefinitionActivityDetail(null, exception),
                null,
                requestWorkspaceId);
    }

    public void recordEntityLifecycleActivity(Long entityId, String activityType, ObserveEntity entity) {
        if (entityId == null || !StringUtils.hasText(activityType)) {
            return;
        }
        entityActivityRecordWriteModelService.recordActivityForCurrentWorkspace(
                entityId,
                activityType,
                null,
                ACTIVITY_SUCCESS,
                buildEntityLifecycleActivitySummary(activityType),
                buildEntityLifecycleActivityDetail(entity, activityType),
                entity);
    }

    public void recordEntityLifecycleActivity(Long entityId, String activityType,
                                              ObserveEntity entity, String requestWorkspaceId) {
        if (entityId == null || !StringUtils.hasText(activityType)) {
            return;
        }
        entityActivityRecordWriteModelService.recordActivity(
                entityId,
                activityType,
                null,
                ACTIVITY_SUCCESS,
                buildEntityLifecycleActivitySummary(activityType),
                buildEntityLifecycleActivityDetail(entity, activityType),
                entity,
                requestWorkspaceId);
    }

    public String resolveCreateLifecycleActivityType(EntityDto entityDto) {
        ObserveEntity entity = entityDto == null ? null : entityDto.getEntity();
        if (isTelemetryLifecycleSource(entity == null ? null : entity.getSource())
                || hasTelemetryDiscoveryBind(Collections.emptyList(),
                        entityDto == null ? null : entityDto.getMonitorBinds())) {
            return ACTIVITY_TYPE_DISCOVERY_GOVERNANCE;
        }
        return ACTIVITY_TYPE_CATALOG_CREATE;
    }

    public String resolveModifyLifecycleActivityType(ObserveEntity currentEntity, ObserveEntity updateEntity,
                                                     List<EntityMonitorBind> existingBinds,
                                                     List<EntityMonitorBind> nextBinds) {
        String currentSource = defaultText(currentEntity == null ? null : currentEntity.getSource(), SOURCE_MANUAL);
        String nextSource = defaultText(updateEntity == null ? null : updateEntity.getSource(), currentSource, SOURCE_MANUAL);
        if (hasTelemetryDiscoveryBind(existingBinds, nextBinds)) {
            return ACTIVITY_TYPE_DISCOVERY_GOVERNANCE;
        }
        if (!Objects.equals(currentSource, nextSource)) {
            return ACTIVITY_TYPE_SOURCE_UPDATE;
        }
        return ACTIVITY_TYPE_CATALOG_UPDATE;
    }

    public String resolveModifyLifecycleActivityType(ObserveEntity currentEntity, ObserveEntity updateEntity,
                                                     List<EntityMonitorBind> nextBinds) {
        Long entityId = currentEntity == null ? null : currentEntity.getId();
        if (entityId == null && updateEntity != null) {
            entityId = updateEntity.getId();
        }
        List<EntityMonitorBind> existingBinds = entityId == null
                ? Collections.emptyList()
                : entityMonitorBindService.findMonitorBinds(entityId);
        return resolveModifyLifecycleActivityType(currentEntity, updateEntity, existingBinds, nextBinds);
    }

    private String buildEntityLifecycleActivitySummary(String activityType) {
        return switch (activityType) {
            case ACTIVITY_TYPE_DISCOVERY_GOVERNANCE -> "Telemetry discovery applied";
            case ACTIVITY_TYPE_SOURCE_UPDATE -> "Entity source updated";
            case ACTIVITY_TYPE_CATALOG_UPDATE -> "Catalog entity updated";
            default -> "Catalog entity created";
        };
    }

    private String buildEntityLifecycleActivityDetail(ObserveEntity entity, String activityType) {
        String entityKind = defaultText(entity == null ? null : toDefinitionKind(entity.getType()), "entity");
        String entityName = defaultText(
                entity == null ? null : entity.getDisplayName(),
                entity == null ? null : entity.getName(),
                entityKind
        );
        List<String> parts = new ArrayList<>();
        parts.add(entityKind + ": " + entityName);
        addLifecycleDetailPart(parts, "source", entity == null ? null : entity.getSource());
        addLifecycleDetailPart(parts, "owner", entity == null ? null : entity.getOwner());
        addLifecycleDetailPart(parts, "system", entity == null ? null : entity.getSystem());
        addLifecycleDetailPart(parts, "environment", entity == null ? null : entity.getEnvironment());
        if (ACTIVITY_TYPE_DISCOVERY_GOVERNANCE.equals(activityType)) {
            addLifecycleDetailPart(parts, "evidence",
                    entity == null ? null : entityMonitorBindService.countMonitorBinds(entity.getId()) + " monitor binds");
        }
        return String.join(" · ", parts);
    }

    private void addLifecycleDetailPart(List<String> parts, String label, String value) {
        String normalized = trimToNull(value);
        if (normalized != null) {
            parts.add(label + ": " + normalized);
        }
    }

    private String buildDefinitionActivitySummary(String activityType, String status) {
        if (ACTIVITY_TYPE_DEFINITION_UPDATE.equals(activityType)) {
            return ACTIVITY_ERROR.equals(status) ? "Definition update failed" : "Definition updated";
        }
        return ACTIVITY_ERROR.equals(status) ? "Definition import failed" : "Definition imported";
    }

    private String buildDefinitionActivityDetail(ObserveEntity entity, RuntimeException exception) {
        if (exception != null) {
            return defaultText(exception.getMessage(), exception.getClass().getSimpleName(), "Definition validation failed");
        }
        String entityKind = defaultText(entity == null ? null : toDefinitionKind(entity.getType()), "entity");
        String detail = defaultText(
                entity == null ? null : entity.getDisplayName(),
                entity == null ? null : entity.getName(),
                entityKind
        );
        return entityKind + ": " + detail;
    }

    private String normalizeDefinitionActivityFormat(String format) {
        if (!StringUtils.hasText(format)) {
            return null;
        }
        if (FORMAT_CURL.equalsIgnoreCase(defaultText(format, ""))) {
            return FORMAT_CURL;
        }
        if (FORMAT_JSON.equalsIgnoreCase(defaultText(format, ""))) {
            return FORMAT_JSON;
        }
        return FORMAT_YAML;
    }

    private boolean hasTelemetryDiscoveryBind(List<EntityMonitorBind> existingBinds, List<EntityMonitorBind> nextBinds) {
        if (CollectionUtils.isEmpty(nextBinds)) {
            return false;
        }
        Set<Long> existingTelemetryDiscoveryMonitors = CollectionUtils.isEmpty(existingBinds)
                ? Collections.emptySet()
                : existingBinds.stream()
                        .filter(bind -> BIND_SOURCE_TELEMETRY_DISCOVERY.equals(bind.getBindSource()))
                        .map(EntityMonitorBind::getMonitorId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
        return nextBinds.stream()
                .filter(bind -> BIND_SOURCE_TELEMETRY_DISCOVERY.equals(bind.getBindSource()))
                .map(EntityMonitorBind::getMonitorId)
                .filter(Objects::nonNull)
                .anyMatch(monitorId -> !existingTelemetryDiscoveryMonitors.contains(monitorId));
    }

    private boolean isTelemetryLifecycleSource(String source) {
        return SOURCE_OTEL_RESOURCE.equals(source) || SOURCE_DERIVED.equals(source);
    }

    private String toDefinitionKind(String entityType) {
        if (!StringUtils.hasText(entityType)) {
            return null;
        }
        return switch (entityType.trim().toLowerCase()) {
            case TYPE_DATABASE -> KIND_DATASTORE;
            case TYPE_API -> KIND_API;
            default -> entityType.trim().toLowerCase();
        };
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return "";
    }
}
