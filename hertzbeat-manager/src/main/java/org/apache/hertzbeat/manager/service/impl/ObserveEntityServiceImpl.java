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

package org.apache.hertzbeat.manager.service.impl;

import com.google.common.primitives.Longs;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogContact;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogLink;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityOwnerRef;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao;
import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.apache.hertzbeat.manager.pojo.dto.EntityCatalogSuggestionsInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceEntityRefInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernancePresetInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.common.observability.dto.entity.EntityAlertSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityObservabilityDetailBundle;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusPageSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsRequest;
import org.apache.hertzbeat.common.observability.model.EntityCanonicalIdentityRegistry;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.entity.EntityTriageRecommendation;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * ObserveEntity service implementation.
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class ObserveEntityServiceImpl implements ObserveEntityService {
    private static final String ALERT_STATUS_ACKNOWLEDGED = "acknowledged";


    private static final String STATUS_UNKNOWN = "unknown";
    private static final String STATUS_HEALTHY = "healthy";
    private static final String STATUS_DEGRADED = "degraded";
    private static final String STATUS_CRITICAL = "critical";
    private static final String STATUS_PAUSED = "paused";
    private static final String SOURCE_MANUAL = "manual";
    private static final int NOISE_CONTROL_PREVIEW_LIMIT = 3;
    private static final String SOURCE_RULE = "rule";
    private static final String SOURCE_OTEL_RESOURCE = "otel_resource";
    private static final String SOURCE_DERIVED = "derived";
    private static final String BIND_ACTIVE = "active";
    private static final String RELATION_CONFIRMED = "confirmed";
    private static final String RELATION_SUGGESTED = "suggested";
    private static final String RECOMMEND_DIRECT = "direct";
    private static final String RECOMMEND_SUGGESTED = "suggested";
    private static final String ENTITY_DEFINITION_API_VERSION = "hertzbeat/v1";
    private static final String LEGACY_ENTITY_DEFINITION_KIND = "Entity";
    private static final String FORMAT_JSON = "json";
    private static final String FORMAT_YAML = "yaml";
    private static final String FORMAT_CURL = "curl";
    private static final String ACTIVITY_SUCCESS = "success";
    private static final String ACTIVITY_ERROR = "error";
    private static final String ACTIVITY_TYPE_DEFINITION_IMPORT = "definition_import";
    private static final String ACTIVITY_TYPE_DEFINITION_UPDATE = "definition_update";
    private static final String ACTIVITY_TYPE_CATALOG_CREATE = "catalog_create";
    private static final String ACTIVITY_TYPE_CATALOG_UPDATE = "catalog_update";
    private static final String ACTIVITY_TYPE_DISCOVERY_GOVERNANCE = "discovery_governance";
    private static final String ACTIVITY_TYPE_SOURCE_UPDATE = "source_update";
    private static final String GOVERNANCE_SCOPE_DISCOVERY = "discovery";
    private static final String GOVERNANCE_SCOPE_DEFINITION = "definition";
    private static final String GOVERNANCE_STATE_KIND_PRESET = "preset";
    private static final String GOVERNANCE_STATE_KIND_ACTIVITY = "activity";
    private static final String GOVERNANCE_STATE_KIND_TEMPLATE = "template";
    private static final String GOVERNANCE_STATE_KIND_RESUME = "resume";
    private static final String TYPE_SYSTEM = "system";
    private static final String TYPE_DATABASE = "database";
    private static final String TYPE_QUEUE = "queue";
    private static final String TYPE_API = "api";
    private static final String TYPE_ENDPOINT = "endpoint";
    private static final String KIND_DATASTORE = "datastore";
    private static final String KIND_API = "api";

    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "service", "host", TYPE_SYSTEM, TYPE_DATABASE, TYPE_QUEUE, "middleware", "device", TYPE_API, TYPE_ENDPOINT, "k8s_workload"
    );
    private static final Set<String> SUPPORTED_STATUS = Set.of(
            STATUS_UNKNOWN, STATUS_HEALTHY, STATUS_DEGRADED, STATUS_CRITICAL, STATUS_PAUSED
    );
    private static final Set<String> SUPPORTED_CRITICALITY = Set.of("low", "medium", "high", "critical");
    private static final Set<String> HOST_LIKE_APPS = Set.of(
            "linux", "windows", "macos", "darwin", "centos", "debian", "ubuntu", "almalinux",
            "redhat", "rockylinux", "opensuse", "euleros", "coreos", "freebsd"
    );
    private static final Set<String> SERVICE_LIKE_APPS = Set.of(
            "springboot2", "springboot3", "jvm", "jetty", "tomcat", "nginx", "hertzbeat", "api",
            "api_code", "fullsite", "website", "prometheus", "registry"
    );
    private static final Set<String> DATABASE_LIKE_APPS = Set.of(
            "mysql", "postgresql", "postgres", "oracle", "sqlserver", "mongodb", "opengauss",
            "tidb", "db2", "dm", "clickhouse", "elasticsearch"
    );
    private static final Set<String> MIDDLEWARE_LIKE_APPS = Set.of(
            "redis", "kafka", "rabbitmq", "rocketmq", "zookeeper", "consul", "nacos",
            "etcd", "memcached", "emq", "activemq"
    );
    private static final Set<String> QUEUE_LIKE_APPS = Set.of(
            "kafka", "rabbitmq", "rocketmq", "emq", "activemq"
    );
    private static final Set<String> ENDPOINT_LIKE_APPS = Set.of(
            "api", "api_code", "dns", "website", "fullsite", "port", "udp_port", "ping", "ssl_cert", "websocket"
    );
    private static final Set<String> SYNTHETIC_IDENTITY_KEYS = Set.of(
            "monitor.instance", "monitor.name", "monitor.app", "endpoint.url", "k8s.workload.name", "messaging.destination.name"
    );
    private static final Map<String, Integer> IDENTITY_SCORES = Map.ofEntries(
            Map.entry("endpoint.url", 120),
            Map.entry("messaging.destination.name", 120),
            Map.entry("monitor.instance", 80),
            Map.entry("monitor.name", 50),
            Map.entry("monitor.app", 20),
            Map.entry("k8s.workload.name", 90)
    );
    private static final ObjectMapper PRETTY_JSON_MAPPER = JsonMapper.builder().build();

    @Autowired
    private ObserveEntityDao observeEntityDao;
    @Autowired
    private EntityDefinitionActivityDao entityDefinitionActivityDao;
    @Autowired
    private EntityGovernanceStateDao entityGovernanceStateDao;

    @Autowired
    private EntityIdentityDao entityIdentityDao;
    @Autowired
    private EntityMonitorBindDao entityMonitorBindDao;
    @Autowired
    private EntityRelationDao entityRelationDao;
    @Autowired
    private MonitorDao monitorDao;
    @Autowired
    private SingleAlertDao singleAlertDao;

    @Autowired
    private AlertSilenceDao alertSilenceDao;

    @Autowired
    private AlertInhibitDao alertInhibitDao;

    @Autowired
    private EntityObservabilityGateway entityObservabilityGateway;

    @Override
    public void validate(EntityDto entityDto, boolean isModify) {
        if (entityDto == null || entityDto.getEntity() == null) {
            throw new IllegalArgumentException("Entity can not be null.");
        }
        ObserveEntity entity = entityDto.getEntity();
        if (isModify && entity.getId() == null) {
            throw new IllegalArgumentException("Entity ID can not be null when modify.");
        }
        if (!StringUtils.hasText(entity.getType()) || !SUPPORTED_TYPES.contains(entity.getType())) {
            throw new IllegalArgumentException("Unsupported entity type.");
        }
        if (!StringUtils.hasText(entity.getName())) {
            throw new IllegalArgumentException("Entity name can not be blank.");
        }
        if (StringUtils.hasText(entity.getStatus()) && !SUPPORTED_STATUS.contains(entity.getStatus())) {
            throw new IllegalArgumentException("Unsupported entity status.");
        }
        if (StringUtils.hasText(entity.getCriticality()) && !SUPPORTED_CRITICALITY.contains(entity.getCriticality())) {
            throw new IllegalArgumentException("Unsupported entity criticality.");
        }
        if (!CollectionUtils.isEmpty(entityDto.getIdentities())) {
            for (EntityIdentity identity : entityDto.getIdentities()) {
                if (!StringUtils.hasText(identity.getIdentityKey()) || !StringUtils.hasText(identity.getIdentityValue())) {
                    throw new IllegalArgumentException("Entity identity key and value can not be blank.");
                }
            }
        }
        if (!CollectionUtils.isEmpty(entityDto.getMonitorBinds())) {
            for (EntityMonitorBind bind : entityDto.getMonitorBinds()) {
                if (bind.getMonitorId() == null) {
                    throw new IllegalArgumentException("Monitor bind monitorId can not be null.");
                }
            }
        }
    }

    @Override
    public long addEntity(EntityDto entityDto) {
        return addEntity(entityDto, true);
    }

    private long addEntity(EntityDto entityDto, boolean recordLifecycleActivity) {
        ObserveEntity input = entityDto.getEntity();
        ObserveEntity entity = new ObserveEntity();
        entity.setId(input.getId() == null ? SnowFlakeIdGenerator.generateId() : input.getId());
        applyEntityCore(entity, input, SOURCE_MANUAL);
        observeEntityDao.save(entity);
        replaceIdentities(entity, entityDto.getIdentities());
        replaceMonitorBinds(entity.getId(), entityDto.getMonitorBinds());
        replaceRelations(entity.getId(), entityDto.getRelations());
        refreshEntityStatus(entity);
        if (recordLifecycleActivity) {
            recordEntityLifecycleActivity(entity.getId(), resolveCreateLifecycleActivityType(entityDto), entity);
        }
        return entity.getId();
    }

    @Override
    public void modifyEntity(EntityDto entityDto) {
        modifyEntity(entityDto, true);
    }

    private void modifyEntity(EntityDto entityDto, boolean recordLifecycleActivity) {
        ObserveEntity update = entityDto.getEntity();
        ObserveEntity entity = observeEntityDao.findById(update.getId())
                .orElseThrow(() -> new IllegalArgumentException("Entity not exist."));
        List<EntityMonitorBind> currentMonitorBinds = entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(update.getId());
        String lifecycleActivityType = recordLifecycleActivity
                ? resolveModifyLifecycleActivityType(entity, update, currentMonitorBinds, entityDto.getMonitorBinds())
                : null;
        applyEntityCore(entity, update, entity.getSource());
        observeEntityDao.save(entity);
        replaceIdentities(entity, entityDto.getIdentities());
        replaceMonitorBinds(entity.getId(), entityDto.getMonitorBinds());
        replaceRelations(entity.getId(), entityDto.getRelations());
        refreshEntityStatus(entity);
        if (recordLifecycleActivity && lifecycleActivityType != null) {
            recordEntityLifecycleActivity(entity.getId(), lifecycleActivityType, entity);
        }
    }

    @Override
    public void deleteEntity(long entityId) {
        if (!observeEntityDao.existsById(entityId)) {
            return;
        }
        entityIdentityDao.deleteAllByEntityId(entityId);
        entityMonitorBindDao.deleteAllByEntityId(entityId);
        entityRelationDao.deleteAllBySourceEntityIdOrTargetEntityId(entityId, entityId);
        observeEntityDao.deleteById(entityId);
    }

    @Override
    @Transactional(readOnly = true)
    public EntityDto getEntityDto(long entityId) {
        Optional<ObserveEntity> optional = observeEntityDao.findById(entityId);
        if (optional.isEmpty()) {
            return null;
        }
        EntityDto dto = new EntityDto();
        dto.setEntity(optional.get());
        dto.setIdentities(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(entityId));
        dto.setMonitorBinds(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(entityId));
        dto.setRelations(entityRelationDao.findBySourceEntityIdOrTargetEntityId(entityId, entityId));
        return dto;
    }

    @Override
    public EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest, Long entityId) {
        List<EntityDto> entityDtos = parseEntityDefinitionDtos(definitionRequest, entityId);
        if (CollectionUtils.isEmpty(entityDtos)) {
            throw new IllegalArgumentException("Entity definition content can not be blank.");
        }
        if (entityDtos.size() > 1) {
            throw new IllegalArgumentException("Entity definition bundle contains multiple entities. Use the bundle API.");
        }
        return entityDtos.getFirst();
    }

    @Override
    public List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest) {
        return parseEntityDefinitionDtos(definitionRequest, null);
    }

    @Override
    public long addEntityByDefinition(EntityDefinitionRequest definitionRequest) {
        EntityDto entityDto = parseEntityDefinition(definitionRequest, null);
        validate(entityDto, false);
        long entityId = addEntity(entityDto, false);
        recordDefinitionActivity(entityId, ACTIVITY_TYPE_DEFINITION_IMPORT, definitionRequest, entityDto.getEntity());
        return entityId;
    }

    @Override
    public List<Long> addEntitiesByDefinitionBundle(EntityDefinitionRequest definitionRequest) {
        List<EntityDto> entityDtos = parseEntityDefinitionDtos(definitionRequest, null);
        if (CollectionUtils.isEmpty(entityDtos)) {
            return Collections.emptyList();
        }
        if (entityDtos.size() == 1) {
            EntityDto entityDto = entityDtos.getFirst();
            validate(entityDto, false);
            return List.of(addEntity(entityDto));
        }
        List<ObserveEntity> entities = new ArrayList<>();
        for (EntityDto entityDto : entityDtos) {
            validate(entityDto, false);
            ObserveEntity input = entityDto.getEntity();
            ObserveEntity entity = new ObserveEntity();
            entity.setId(input.getId() == null ? SnowFlakeIdGenerator.generateId() : input.getId());
            applyEntityCore(entity, input, SOURCE_MANUAL);
            entities.add(entity);
        }
        observeEntityDao.saveAll(entities);
        for (int index = 0; index < entities.size(); index++) {
            ObserveEntity entity = entities.get(index);
            EntityDto entityDto = entityDtos.get(index);
            replaceIdentities(entity, entityDto.getIdentities());
            replaceMonitorBinds(entity.getId(), entityDto.getMonitorBinds());
        }
        for (int index = 0; index < entities.size(); index++) {
            ObserveEntity entity = entities.get(index);
            EntityDto entityDto = entityDtos.get(index);
            replaceRelations(entity.getId(), entityDto.getRelations());
            refreshEntityStatus(entity);
            recordDefinitionActivity(entity.getId(), ACTIVITY_TYPE_DEFINITION_IMPORT, definitionRequest, entity);
        }
        return entities.stream().map(ObserveEntity::getId).toList();
    }

    @Override
    public void modifyEntityByDefinition(long entityId, EntityDefinitionRequest definitionRequest) {
        try {
            EntityDto entityDto = parseEntityDefinition(definitionRequest, entityId);
            validate(entityDto, true);
            modifyEntity(entityDto, false);
            recordDefinitionActivity(entityId, ACTIVITY_TYPE_DEFINITION_UPDATE, definitionRequest, entityDto.getEntity());
        } catch (RuntimeException ex) {
            recordDefinitionActivityFailure(entityId, ACTIVITY_TYPE_DEFINITION_UPDATE, definitionRequest, ex);
            throw ex;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public String getEntityDefinition(long entityId, String format) {
        EntityDto entityDto = getEntityDto(entityId);
        if (entityDto == null) {
            return null;
        }
        return renderDefinition(toEntityDefinition(entityDto), format);
    }

    @Override
    public EntityDetailDto getEntityDetail(long entityId) {
        EntityDto entityDto = getEntityDto(entityId);
        if (entityDto == null) {
            return null;
        }
        ObserveEntity entity = observeEntityDao.findById(entityId).orElse(null);
        if (entity == null) {
            return null;
        }
        List<Monitor> monitors = findEntityMonitors(entityId);
        List<SingleAlert> activeAlerts = queryActiveAlerts(monitors, 20);
        EntityStatusInfo statusInfo = refreshEntityStatus(entity, monitors, activeAlerts);
        entityDto.setEntity(entity);
        ObservedEntityContext entityContext = ObservedEntityContext.from(
                entityDto.getEntity(), entityDto.getIdentities(),
                entityDto.getEntityInfo() == null ? null : entityDto.getEntityInfo().getHertzbeat()
        );
        List<MonitorInfo> boundMonitors = monitors.stream().map(MonitorInfo::fromEntity).toList();
        List<EntityLogQueryHint> logQueryHints = entityObservabilityGateway.buildEntityLogQueryHints(entityDto.getIdentities(), monitors);
        EntityEvidenceSummaryInfo evidenceSummary = entityObservabilityGateway.buildEntityEvidenceSummary(
                entityDto.getEntity(),
                statusInfo,
                entityDto == null || CollectionUtils.isEmpty(entityDto.getIdentities()) ? 0 : entityDto.getIdentities().size(),
                logQueryHints == null ? 0 : logQueryHints.size(),
                monitors,
                activeAlerts
        );
        EntityAlertSummaryInfo alertSummary = entityObservabilityGateway.buildEntityAlertSummary(activeAlerts);
        EntityMonitorSummaryInfo monitorSummary = entityObservabilityGateway.buildEntityMonitorSummary(monitors);
        EntityLogSummaryInfo logSummary = entityObservabilityGateway.buildEntityLogSummary(logQueryHints);
        EntityObservabilityDetailBundle observabilityDetail = entityObservabilityGateway.resolveEntityDetailBundle(
                entityContext, statusInfo, evidenceSummary, monitorSummary, logSummary, monitors, logQueryHints);
        logSummary = observabilityDetail.getLogSummary();
        logQueryHints = observabilityDetail.getLogQueryHints();
        EntityTraceSummaryDto traceSummary = observabilityDetail.getTraceSummary();
        List<EntityTraceQueryHintDto> traceQueryHints = observabilityDetail.getTraceQueryHints();
        List<MetricEvidence> metricEvidence = observabilityDetail.getMetricEvidence();
        List<LogEvidence> logEvidence = observabilityDetail.getLogEvidence();
        List<TraceEvidence> traceEvidence = observabilityDetail.getTraceEvidence();
        EntityUnifiedEvidenceSummary unifiedEvidenceSummary = observabilityDetail.getUnifiedEvidenceSummary();
        EntityTriageRecommendation triageRecommendation = observabilityDetail.getTriageRecommendation();
        long relationCount = entityDto == null || CollectionUtils.isEmpty(entityDto.getRelations()) ? 0 : entityDto.getRelations().size();
        EntityOpsSummaryInfo opsSummary = entityObservabilityGateway.buildEntityOpsSummary(entityDto.getEntity(), relationCount, evidenceSummary);
        List<EntityNextActionInfo> nextActions =
                entityObservabilityGateway.buildEntityNextActions(entityDto.getEntity(), evidenceSummary, logSummary, opsSummary);
        EntityStatusPageSummaryInfo statusPageSummary = entityObservabilityGateway.buildEntityStatusPageSummary(entity, opsSummary);
        EntityResponseHandoffsInfo responseHandoffs =
                buildResponseHandoffs(entityId, entityContext, activeAlerts, monitors, logSummary, traceSummary,
                        metricEvidence, logEvidence, traceEvidence, traceQueryHints, opsSummary);
        EntityDetailDto.EntityNoiseControlSummaryInfo noiseControlSummary =
                buildNoiseControlSummary(entityDto, monitors, activeAlerts);
        List<EntityDefinitionActivityInfo> definitionActivities = getDefinitionActivities(entityId, 12);
        return new EntityDetailDto(entityDto, statusInfo, evidenceSummary, alertSummary, monitorSummary, logSummary, traceSummary,
                metricEvidence, logEvidence, traceEvidence, unifiedEvidenceSummary, triageRecommendation, opsSummary,
                nextActions, statusPageSummary, responseHandoffs, noiseControlSummary, boundMonitors, activeAlerts,
                logQueryHints, traceQueryHints, definitionActivities);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SingleAlert> getEntityAlerts(long entityId, String status, String severity, int pageIndex, int pageSize) {
        List<Monitor> monitors = findEntityMonitors(entityId);
        PageRequest pageRequest = normalizePageRequest(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "gmtUpdate"));
        if (CollectionUtils.isEmpty(monitors)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        String statusFilter = normalizeAlertStatusFilter(status);
        List<SingleAlert> activeAlerts = singleAlertDao.findAll(
                buildAlertSpecification(monitors, statusFilter),
                Sort.by(Sort.Direction.DESC, "gmtUpdate"));
        String severityFilter = normalizeAlertSeverityFilter(severity);
        List<SingleAlert> filteredAlerts = activeAlerts.stream()
                .filter(alert -> severityFilter == null || severityFilter.equals(resolveAlertSeverity(alert)))
                .sorted(Comparator
                        .comparingInt((SingleAlert alert) -> severityPriority(resolveAlertSeverity(alert))).reversed()
                        .thenComparing(SingleAlert::getGmtUpdate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(SingleAlert::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        return slicePage(filteredAlerts, pageRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MonitorInfo> getEntityMonitors(long entityId, Byte status, String app, int pageIndex, int pageSize) {
        List<MonitorInfo> monitors = findEntityMonitors(entityId).stream()
                .filter(monitor -> status == null || monitor.getStatus() == status)
                .filter(monitor -> !StringUtils.hasText(app) || app.trim().equalsIgnoreCase(monitor.getApp()))
                .sorted(Comparator
                        .comparingInt((Monitor monitor) -> monitorStatusPriority(monitor.getStatus())).reversed()
                        .thenComparing(Monitor::getGmtUpdate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Monitor::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(MonitorInfo::fromEntity)
                .toList();
        PageRequest pageRequest = normalizePageRequest(pageIndex, pageSize);
        if (monitors.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        int start = Math.min((int) pageRequest.getOffset(), monitors.size());
        int end = Math.min(start + pageRequest.getPageSize(), monitors.size());
        return new PageImpl<>(monitors.subList(start, end), pageRequest, monitors.size());
    }

    @Override
    public List<EntityDefinitionActivityInfo> getDefinitionActivities(Long entityId, int limit) {
        int pageSize = limit <= 0 ? 12 : Math.min(limit, 50);
        PageRequest pageRequest = PageRequest.of(0, pageSize, Sort.by(Sort.Order.desc("gmtCreate"), Sort.Order.desc("id")));
        if (entityId != null) {
            return entityDefinitionActivityDao.findAllByEntityId(entityId, pageRequest).stream()
                    .map(this::toDefinitionActivityInfo)
                    .toList();
        }
        return entityDefinitionActivityDao.findAll(pageRequest).stream()
                .map(this::toDefinitionActivityInfo)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityDefinitionWorkspaceTemplateInfo> getDefinitionWorkspaceTemplates(String templateId, int limit) {
        if (StringUtils.hasText(templateId)) {
            return entityGovernanceStateDao
                    .findByStateScopeAndStateKindAndStateKey(
                            GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, templateId.trim())
                    .map(this::toDefinitionWorkspaceTemplateInfo)
                    .map(List::of)
                    .orElseGet(List::of);
        }
        int pageSize = limit <= 0 ? 8 : Math.min(limit, 50);
        PageRequest pageRequest = PageRequest.of(0, pageSize);
        return entityGovernanceStateDao.findAllByStateScopeAndStateKindOrderByGmtUpdateDescIdDesc(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, pageRequest)
                .stream()
                .map(this::toDefinitionWorkspaceTemplateInfo)
                .toList();
    }

    @Override
    public EntityDefinitionWorkspaceTemplateInfo saveDefinitionWorkspaceTemplate(EntityDefinitionWorkspaceTemplateInfo templateInfo) {
        if (templateInfo == null || !StringUtils.hasText(templateInfo.getName())) {
            throw new IllegalArgumentException("Definition workspace template name can not be blank.");
        }
        if (!StringUtils.hasText(templateInfo.getContent())) {
            throw new IllegalArgumentException("Definition workspace template content can not be blank.");
        }
        String format = normalizeDefinitionActivityFormat(templateInfo.getFormat());
        String templateId = defaultText(trimToNull(templateInfo.getId()), "definition-template-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = entityGovernanceStateDao
                .findByStateScopeAndStateKindAndStateKey(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, templateId)
                .orElseGet(EntityGovernanceState::new);
        state.setStateScope(GOVERNANCE_SCOPE_DEFINITION);
        state.setStateKind(GOVERNANCE_STATE_KIND_TEMPLATE);
        state.setStateKey(templateId);
        state.setStateName(limitLength(trimToNull(templateInfo.getName()), 128));
        state.setStatus(limitLength(trimToNull(templateInfo.getSource()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "format", format);
        putIfPresent(content, "content", trimToNull(templateInfo.getContent()));
        putIfPresent(content, "summary", trimToNull(templateInfo.getSummary()));
        putIfPresent(content, "source", trimToNull(templateInfo.getSource()));
        putIfPresent(content, "kind", trimToNull(templateInfo.getKind()));
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDefinitionWorkspaceTemplateInfo(entityGovernanceStateDao.saveAndFlush(state));
    }

    @Override
    public void deleteDefinitionWorkspaceTemplate(String templateId) {
        if (!StringUtils.hasText(templateId)) {
            return;
        }
        entityGovernanceStateDao.deleteByStateScopeAndStateKindAndStateKey(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_TEMPLATE, templateId.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityDefinitionWorkspaceActivityInfo> getDefinitionWorkspaceActivities(String activityId, int limit) {
        if (StringUtils.hasText(activityId)) {
            return entityGovernanceStateDao
                    .findByStateScopeAndStateKindAndStateKey(
                            GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_ACTIVITY, activityId.trim())
                    .map(this::toDefinitionWorkspaceActivityInfo)
                    .map(List::of)
                    .orElseGet(List::of);
        }
        int pageSize = limit <= 0 ? 8 : Math.min(limit, 50);
        PageRequest pageRequest = PageRequest.of(0, pageSize);
        return entityGovernanceStateDao.findAllByStateScopeAndStateKindOrderByGmtUpdateDescIdDesc(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_ACTIVITY, pageRequest)
                .stream()
                .map(this::toDefinitionWorkspaceActivityInfo)
                .toList();
    }

    @Override
    public EntityDefinitionWorkspaceActivityInfo saveDefinitionWorkspaceActivity(EntityDefinitionWorkspaceActivityInfo activityInfo) {
        if (activityInfo == null || !StringUtils.hasText(activityInfo.getSummary())) {
            throw new IllegalArgumentException("Definition workspace activity summary can not be blank.");
        }
        String activityId = defaultText(trimToNull(activityInfo.getId()), "definition-workspace-activity-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = entityGovernanceStateDao
                .findByStateScopeAndStateKindAndStateKey(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_ACTIVITY, activityId)
                .orElseGet(EntityGovernanceState::new);
        state.setStateScope(GOVERNANCE_SCOPE_DEFINITION);
        state.setStateKind(GOVERNANCE_STATE_KIND_ACTIVITY);
        state.setStateKey(activityId);
        state.setStateName(limitLength(trimToNull(activityInfo.getSummary()), 128));
        state.setStatus(limitLength(trimToNull(activityInfo.getStatus()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "format", normalizeDefinitionActivityFormat(activityInfo.getFormat()));
        putIfPresent(content, "summary", trimToNull(activityInfo.getSummary()));
        putIfPresent(content, "detail", trimToNull(activityInfo.getDetail()));
        putIfPresent(content, "entityId", activityInfo.getEntityId());
        putIfPresent(content, "entityName", trimToNull(activityInfo.getEntityName()));
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDefinitionWorkspaceActivityInfo(entityGovernanceStateDao.saveAndFlush(state));
    }

    @Override
    @Transactional(readOnly = true)
    public EntityDefinitionWorkspaceResumeInfo getDefinitionWorkspaceResume(String resumeToken) {
        if (!StringUtils.hasText(resumeToken)) {
            return null;
        }
        return entityGovernanceStateDao
                .findByStateScopeAndStateKindAndStateKey(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_RESUME, resumeToken.trim())
                .map(this::toDefinitionWorkspaceResumeInfo)
                .orElse(null);
    }

    @Override
    public EntityDefinitionWorkspaceResumeInfo saveDefinitionWorkspaceResume(EntityDefinitionWorkspaceResumeInfo resumeInfo) {
        if (resumeInfo == null || !StringUtils.hasText(resumeInfo.getToken())) {
            throw new IllegalArgumentException("Definition workspace resume token can not be blank.");
        }
        if (!StringUtils.hasText(resumeInfo.getContent())) {
            throw new IllegalArgumentException("Definition workspace resume content can not be blank.");
        }
        String resumeToken = resumeInfo.getToken().trim();
        EntityGovernanceState state = entityGovernanceStateDao
                .findByStateScopeAndStateKindAndStateKey(
                        GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_RESUME, resumeToken)
                .orElseGet(EntityGovernanceState::new);
        state.setStateScope(GOVERNANCE_SCOPE_DEFINITION);
        state.setStateKind(GOVERNANCE_STATE_KIND_RESUME);
        state.setStateKey(resumeToken);
        state.setStateName(limitLength(trimToNull(resumeInfo.getSource()), 128));
        state.setStatus(limitLength(trimToNull(resumeInfo.getFormat()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "content", trimToNull(resumeInfo.getContent()));
        putIfPresent(content, "format", normalizeDefinitionActivityFormat(resumeInfo.getFormat()));
        putIfPresent(content, "source", trimToNull(resumeInfo.getSource()));
        putIfPresent(content, "count", resumeInfo.getCount());
        putIfPresent(content, "ownerDraft", trimToNull(resumeInfo.getOwnerDraft()));
        putIfPresent(content, "systemDraft", trimToNull(resumeInfo.getSystemDraft()));
        putIfPresent(content, "runbookDraft", trimToNull(resumeInfo.getRunbookDraft()));
        if (resumeInfo.getQueryParams() != null && !resumeInfo.getQueryParams().isEmpty()) {
            content.put("queryParams", resumeInfo.getQueryParams());
        }
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDefinitionWorkspaceResumeInfo(entityGovernanceStateDao.saveAndFlush(state));
    }

    @Override
    public void deleteDefinitionWorkspaceResume(String resumeToken) {
        if (!StringUtils.hasText(resumeToken)) {
            return;
        }
        entityGovernanceStateDao.deleteByStateScopeAndStateKindAndStateKey(
                GOVERNANCE_SCOPE_DEFINITION, GOVERNANCE_STATE_KIND_RESUME, resumeToken.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityDiscoveryGovernancePresetInfo> getDiscoveryGovernancePresets(int limit) {
        int pageSize = limit <= 0 ? 8 : Math.min(limit, 50);
        PageRequest pageRequest = PageRequest.of(0, pageSize);
        return entityGovernanceStateDao.findAllByStateScopeAndStateKindOrderByGmtUpdateDescIdDesc(
                        GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_PRESET, pageRequest)
                .stream()
                .map(this::toDiscoveryGovernancePresetInfo)
                .toList();
    }

    @Override
    public EntityDiscoveryGovernancePresetInfo saveDiscoveryGovernancePreset(EntityDiscoveryGovernancePresetInfo presetInfo) {
        if (presetInfo == null || !StringUtils.hasText(presetInfo.getName())) {
            throw new IllegalArgumentException("Discovery governance preset name can not be blank.");
        }
        String presetId = defaultText(trimToNull(presetInfo.getId()), "preset-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = entityGovernanceStateDao
                .findByStateScopeAndStateKindAndStateKey(
                        GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_PRESET, presetId)
                .orElseGet(EntityGovernanceState::new);
        state.setStateScope(GOVERNANCE_SCOPE_DISCOVERY);
        state.setStateKind(GOVERNANCE_STATE_KIND_PRESET);
        state.setStateKey(presetId);
        state.setStateName(limitLength(trimToNull(presetInfo.getName()), 128));
        state.setStatus(limitLength(trimToNull(presetInfo.getStatus()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "owner", trimToNull(presetInfo.getOwner()));
        putIfPresent(content, "system", trimToNull(presetInfo.getSystem()));
        putIfPresent(content, "source", trimToNull(presetInfo.getSource()));
        putIfPresent(content, "environment", trimToNull(presetInfo.getEnvironment()));
        putIfPresent(content, "status", trimToNull(presetInfo.getStatus()));
        putIfPresent(content, "bulkOwner", trimToNull(presetInfo.getBulkOwner()));
        putIfPresent(content, "bulkSystem", trimToNull(presetInfo.getBulkSystem()));
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDiscoveryGovernancePresetInfo(entityGovernanceStateDao.saveAndFlush(state));
    }

    @Override
    public void deleteDiscoveryGovernancePreset(String presetId) {
        if (!StringUtils.hasText(presetId)) {
            return;
        }
        entityGovernanceStateDao.deleteByStateScopeAndStateKindAndStateKey(
                GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_PRESET, presetId.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityDiscoveryGovernanceActivityInfo> getDiscoveryGovernanceActivities(String activityId, int limit) {
        if (StringUtils.hasText(activityId)) {
            return entityGovernanceStateDao
                    .findByStateScopeAndStateKindAndStateKey(
                            GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_ACTIVITY, activityId.trim())
                    .map(this::toDiscoveryGovernanceActivityInfo)
                    .map(List::of)
                    .orElseGet(List::of);
        }
        int pageSize = limit <= 0 ? 8 : Math.min(limit, 50);
        PageRequest pageRequest = PageRequest.of(0, pageSize);
        return entityGovernanceStateDao.findAllByStateScopeAndStateKindOrderByGmtUpdateDescIdDesc(
                        GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_ACTIVITY, pageRequest)
                .stream()
                .map(this::toDiscoveryGovernanceActivityInfo)
                .toList();
    }

    @Override
    public EntityDiscoveryGovernanceActivityInfo saveDiscoveryGovernanceActivity(EntityDiscoveryGovernanceActivityInfo activityInfo) {
        if (activityInfo == null || !StringUtils.hasText(activityInfo.getSummary())) {
            throw new IllegalArgumentException("Discovery governance activity summary can not be blank.");
        }
        String activityId = defaultText(trimToNull(activityInfo.getId()), "activity-" + SnowFlakeIdGenerator.generateId());
        EntityGovernanceState state = entityGovernanceStateDao
                .findByStateScopeAndStateKindAndStateKey(
                        GOVERNANCE_SCOPE_DISCOVERY, GOVERNANCE_STATE_KIND_ACTIVITY, activityId)
                .orElseGet(EntityGovernanceState::new);
        state.setStateScope(GOVERNANCE_SCOPE_DISCOVERY);
        state.setStateKind(GOVERNANCE_STATE_KIND_ACTIVITY);
        state.setStateKey(activityId);
        state.setStateName(limitLength(trimToNull(activityInfo.getSummary()), 128));
        state.setStatus(limitLength(trimToNull(activityInfo.getStatus()), 32));
        Map<String, Object> content = new LinkedHashMap<>();
        putIfPresent(content, "action", trimToNull(activityInfo.getAction()));
        putIfPresent(content, "summary", trimToNull(activityInfo.getSummary()));
        putIfPresent(content, "detail", trimToNull(activityInfo.getDetail()));
        putIfPresent(content, "workspacePath", trimToNull(activityInfo.getWorkspacePath()));
        putIfPresent(content, "seedDefinitionDraft", trimToNull(activityInfo.getSeedDefinitionDraft()));
        putIfPresent(content, "seedDefinitionFormat", trimToNull(activityInfo.getSeedDefinitionFormat()));
        putIfPresent(content, "seedDefinitionSource", trimToNull(activityInfo.getSeedDefinitionSource()));
        putIfPresent(content, "seedDefinitionCount", activityInfo.getSeedDefinitionCount());
        putIfPresent(content, "entityRefs", CollectionUtils.isEmpty(activityInfo.getEntityRefs()) ? null : activityInfo.getEntityRefs());
        state.setContent(PRETTY_JSON_MAPPER.valueToTree(content));
        return toDiscoveryGovernanceActivityInfo(entityGovernanceStateDao.saveAndFlush(state));
    }

    @Override
    @Transactional(readOnly = true)
    public EntityCatalogSuggestionsInfo getCatalogSuggestions(int limit) {
        int suggestionLimit = limit <= 0 ? 12 : Math.min(limit, 200);
        List<ObserveEntity> entities = observeEntityDao.findAll(Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id")));
        LinkedHashSet<String> owners = new LinkedHashSet<>();
        LinkedHashSet<String> namespaces = new LinkedHashSet<>();
        LinkedHashSet<String> environments = new LinkedHashSet<>();
        LinkedHashSet<String> systems = new LinkedHashSet<>();
        LinkedHashSet<String> lifecycles = new LinkedHashSet<>();
        LinkedHashSet<String> tiers = new LinkedHashSet<>();
        LinkedHashSet<String> inheritFromRefs = new LinkedHashSet<>();
        LinkedHashSet<String> entityRefs = new LinkedHashSet<>();
        LinkedHashSet<String> languages = new LinkedHashSet<>();
        LinkedHashSet<String> linkProviders = new LinkedHashSet<>();
        for (ObserveEntity entity : entities) {
            addSuggestion(owners, entity.getOwner(), suggestionLimit);
            addSuggestion(namespaces, entity.getNamespace(), suggestionLimit);
            addSuggestion(environments, entity.getEnvironment(), suggestionLimit);
            addSuggestion(systems, entity.getSystem(), suggestionLimit);
            addSuggestion(lifecycles, entity.getLifecycle(), suggestionLimit);
            addSuggestion(tiers, entity.getTier(), suggestionLimit);
            addSuggestion(inheritFromRefs, entity.getInheritFrom(), suggestionLimit);
            addSuggestion(entityRefs, buildEntityReference(entity), suggestionLimit);
            if (!CollectionUtils.isEmpty(entity.getAdditionalOwners())) {
                entity.getAdditionalOwners().stream()
                        .map(EntityOwnerRef::getName)
                        .forEach(value -> addSuggestion(owners, value, suggestionLimit));
            }
            if (!CollectionUtils.isEmpty(entity.getLanguages())) {
                entity.getLanguages().forEach(value -> addSuggestion(languages, value, suggestionLimit));
            }
            if (!CollectionUtils.isEmpty(entity.getLinks())) {
                entity.getLinks().stream()
                        .map(EntityCatalogLink::getProvider)
                        .forEach(value -> addSuggestion(linkProviders, value, suggestionLimit));
            }
        }
        return new EntityCatalogSuggestionsInfo(
                List.copyOf(owners),
                List.copyOf(namespaces),
                List.copyOf(environments),
                List.copyOf(systems),
                List.copyOf(lifecycles),
                List.copyOf(tiers),
                List.copyOf(inheritFromRefs),
                List.copyOf(entityRefs),
                List.copyOf(languages),
                List.copyOf(linkProviders)
        );
    }

    private void recordDefinitionActivity(Long entityId, String activityType, EntityDefinitionRequest definitionRequest,
                                          ObserveEntity entity) {
        if (entityId == null) {
            return;
        }
        persistEntityLifecycleActivity(entityId, activityType, normalizeDefinitionActivityFormat(definitionRequest == null ? null : definitionRequest.getFormat()),
                ACTIVITY_SUCCESS,
                buildDefinitionActivitySummary(activityType, ACTIVITY_SUCCESS),
                buildDefinitionActivityDetail(entity, null));
    }

    private void recordDefinitionActivityFailure(Long entityId, String activityType, EntityDefinitionRequest definitionRequest,
                                                 RuntimeException exception) {
        if (entityId == null) {
            return;
        }
        persistEntityLifecycleActivity(entityId, activityType, normalizeDefinitionActivityFormat(definitionRequest == null ? null : definitionRequest.getFormat()),
                ACTIVITY_ERROR,
                buildDefinitionActivitySummary(activityType, ACTIVITY_ERROR),
                buildDefinitionActivityDetail(null, exception));
    }

    private void recordEntityLifecycleActivity(Long entityId, String activityType, ObserveEntity entity) {
        if (entityId == null || !StringUtils.hasText(activityType)) {
            return;
        }
        persistEntityLifecycleActivity(entityId, activityType, null, ACTIVITY_SUCCESS,
                buildEntityLifecycleActivitySummary(activityType),
                buildEntityLifecycleActivityDetail(entity, activityType));
    }

    private void persistEntityLifecycleActivity(Long entityId, String activityType, String format,
                                                String status, String summary, String detail) {
        String normalizedFormat = StringUtils.hasText(format) ? format : FORMAT_YAML;
        entityDefinitionActivityDao.saveAndFlush(EntityDefinitionActivity.builder()
                .entityId(entityId)
                .activityType(activityType)
                .format(normalizedFormat)
                .status(status)
                .summary(summary)
                .detail(detail)
                .build());
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
            addLifecycleDetailPart(parts, "evidence", entity == null ? null : String.valueOf(entityMonitorBindDao.countByEntityId(entity.getId())) + " monitor binds");
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

    private EntityDefinitionActivityInfo toDefinitionActivityInfo(EntityDefinitionActivity activity) {
        return new EntityDefinitionActivityInfo(
                activity.getId(),
                activity.getEntityId(),
                activity.getActivityType(),
                activity.getFormat(),
                activity.getStatus(),
                activity.getSummary(),
                activity.getDetail(),
                activity.getCreator(),
                activity.getGmtCreate()
        );
    }

    private EntityDefinitionWorkspaceTemplateInfo toDefinitionWorkspaceTemplateInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime updatedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        return new EntityDefinitionWorkspaceTemplateInfo(
                state.getStateKey(),
                defaultText(trimToNull(state.getStateName()), state.getStateKey()),
                defaultText(jsonText(content, "format"), FORMAT_YAML),
                defaultText(jsonText(content, "content"), ""),
                jsonText(content, "summary"),
                defaultText(jsonText(content, "source"), state.getStatus()),
                jsonText(content, "kind"),
                state.getCreator(),
                updatedAt
        );
    }

    private EntityDefinitionWorkspaceActivityInfo toDefinitionWorkspaceActivityInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime happenedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        Long entityId = content != null && content.hasNonNull("entityId") ? content.get("entityId").asLong() : null;
        return new EntityDefinitionWorkspaceActivityInfo(
                state.getStateKey(),
                happenedAt,
                defaultText(state.getStatus(), ACTIVITY_SUCCESS),
                defaultText(jsonText(content, "format"), FORMAT_YAML),
                defaultText(jsonText(content, "summary"), trimToNull(state.getStateName()), state.getStateKey()),
                jsonText(content, "detail"),
                entityId,
                jsonText(content, "entityName"),
                state.getCreator()
        );
    }

    private EntityDefinitionWorkspaceResumeInfo toDefinitionWorkspaceResumeInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime updatedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        return new EntityDefinitionWorkspaceResumeInfo(
                state.getStateKey(),
                defaultText(jsonText(content, "content"), ""),
                defaultText(jsonText(content, "format"), FORMAT_YAML),
                defaultText(jsonText(content, "source"), trimToNull(state.getStateName())),
                jsonInteger(content, "count"),
                jsonText(content, "ownerDraft"),
                jsonText(content, "systemDraft"),
                jsonText(content, "runbookDraft"),
                jsonStringMap(content == null ? null : content.get("queryParams")),
                state.getCreator(),
                updatedAt
        );
    }

    private EntityDiscoveryGovernancePresetInfo toDiscoveryGovernancePresetInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime updatedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        return new EntityDiscoveryGovernancePresetInfo(
                state.getStateKey(),
                defaultText(trimToNull(state.getStateName()), state.getStateKey()),
                jsonText(content, "owner"),
                jsonText(content, "system"),
                jsonText(content, "source"),
                jsonText(content, "environment"),
                defaultText(jsonText(content, "status"), state.getStatus()),
                jsonText(content, "bulkOwner"),
                jsonText(content, "bulkSystem"),
                state.getCreator(),
                updatedAt
        );
    }

    private EntityDiscoveryGovernanceActivityInfo toDiscoveryGovernanceActivityInfo(EntityGovernanceState state) {
        JsonNode content = state.getContent();
        LocalDateTime happenedAt = state.getGmtUpdate() != null ? state.getGmtUpdate() : state.getGmtCreate();
        return new EntityDiscoveryGovernanceActivityInfo(
                state.getStateKey(),
                happenedAt,
                defaultText(state.getStatus(), "info"),
                defaultText(jsonText(content, "action"), "review"),
                defaultText(jsonText(content, "summary"), trimToNull(state.getStateName()), state.getStateKey()),
                jsonText(content, "detail"),
                jsonEntityRefs(content == null ? null : content.get("entityRefs")),
                jsonText(content, "workspacePath"),
                jsonText(content, "seedDefinitionDraft"),
                jsonText(content, "seedDefinitionFormat"),
                jsonText(content, "seedDefinitionSource"),
                jsonInteger(content, "seedDefinitionCount"),
                state.getCreator()
        );
    }

    private List<EntityDiscoveryGovernanceEntityRefInfo> jsonEntityRefs(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<EntityDiscoveryGovernanceEntityRefInfo> refs = new ArrayList<>();
        node.forEach(item -> {
            Long entityId = item != null && item.hasNonNull("entityId") ? item.get("entityId").asLong() : null;
            if (entityId != null) {
                refs.add(new EntityDiscoveryGovernanceEntityRefInfo(entityId, jsonText(item, "entityName")));
            }
        });
        return refs;
    }

    private Map<String, String> jsonStringMap(JsonNode node) {
        if (node == null || !node.isObject()) {
            return Map.of();
        }
        Map<String, String> raw = PRETTY_JSON_MAPPER.convertValue(node, new TypeReference<Map<String, String>>() { });
        if (raw == null || raw.isEmpty()) {
            return Map.of();
        }
        Map<String, String> values = new LinkedHashMap<>();
        raw.forEach((key, value) -> {
            String normalizedValue = trimToNull(value);
            if (StringUtils.hasText(key) && normalizedValue != null) {
                values.put(key, normalizedValue);
            }
        });
        return values.isEmpty() ? Map.of() : values;
    }

    private String jsonText(JsonNode node, String fieldName) {
        if (node == null || !node.has(fieldName) || node.get(fieldName).isNull()) {
            return null;
        }
        return trimToNull(node.get(fieldName).asText());
    }

    private Integer jsonInteger(JsonNode node, String fieldName) {
        if (node == null || !node.has(fieldName) || node.get(fieldName).isNull()) {
            return null;
        }
        return node.get(fieldName).asInt();
    }

    private String limitLength(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
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

    @Override
    public Page<EntitySummaryInfo> getEntities(List<Long> entityIds, String type, String status, String search,
                                               String owner, String source, String environment, String lifecycle, String tier, String system,
                                               String sort, String order, int pageIndex, int pageSize) {
        Specification<ObserveEntity> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (!CollectionUtils.isEmpty(entityIds)) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (Long entityId : entityIds) {
                    inPredicate.value(entityId);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.hasText(type)) {
                if (TYPE_API.equals(type)) {
                    Predicate apiType = criteriaBuilder.equal(root.get("type"), TYPE_API);
                    Predicate legacyApiEndpoint = criteriaBuilder.and(
                            criteriaBuilder.equal(root.get("type"), TYPE_ENDPOINT),
                            criteriaBuilder.or(
                                    criteriaBuilder.isNotNull(root.get("implementedBy")),
                                    criteriaBuilder.isNotNull(root.get("apiInterface")),
                                    criteriaBuilder.like(criteriaBuilder.lower(root.get("subtype")), "%api%")
                            )
                    );
                    andList.add(criteriaBuilder.or(apiType, legacyApiEndpoint));
                } else {
                    andList.add(criteriaBuilder.equal(root.get("type"), type));
                }
            }
            if (StringUtils.hasText(status)) {
                andList.add(criteriaBuilder.equal(root.get("status"), status));
            }
            if (StringUtils.hasText(owner)) {
                andList.add(criteriaBuilder.equal(root.get("owner"), owner));
            }
            if (StringUtils.hasText(source)) {
                andList.add(criteriaBuilder.equal(root.get("source"), source));
            }
            if (StringUtils.hasText(environment)) {
                andList.add(criteriaBuilder.equal(root.get("environment"), environment));
            }
            if (StringUtils.hasText(lifecycle)) {
                andList.add(criteriaBuilder.equal(root.get("lifecycle"), lifecycle));
            }
            if (StringUtils.hasText(tier)) {
                andList.add(criteriaBuilder.equal(root.get("tier"), tier));
            }
            if (StringUtils.hasText(system)) {
                andList.add(criteriaBuilder.equal(root.get("system"), system));
            }
            List<Predicate> orList = new ArrayList<>();
            if (StringUtils.hasText(search)) {
                String lower = "%" + search.toLowerCase() + "%";
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("displayName")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("subtype")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("namespace")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("environment")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("owner")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("lifecycle")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("tier")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("system")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("runbook")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("inheritFrom")), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("labels").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("tags").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("additionalOwners").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("componentOf").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("components").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("implementedBy").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("apiInterface").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("languages").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("links").as(String.class)), lower));
                orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("contacts").as(String.class)), lower));
                Long id = Longs.tryParse(search);
                if (id != null) {
                    orList.add(criteriaBuilder.equal(root.get("id"), id));
                }
            }
            Predicate andPredicate = andList.isEmpty() ? null : criteriaBuilder.and(andList.toArray(new Predicate[0]));
            Predicate orPredicate = orList.isEmpty() ? null : criteriaBuilder.or(orList.toArray(new Predicate[0]));
            if (andPredicate == null && orPredicate == null) {
                return query.where().getRestriction();
            }
            if (andPredicate == null) {
                return orPredicate;
            }
            if (orPredicate == null) {
                return andPredicate;
            }
            return query.where(andPredicate, orPredicate).getRestriction();
        };
        String effectiveSort = StringUtils.hasText(sort) ? sort : "gmtUpdate";
        String effectiveOrder = StringUtils.hasText(order) ? order : "desc";
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(effectiveOrder), effectiveSort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<ObserveEntity> entityPage = observeEntityDao.findAll(specification, pageRequest);
        Map<Long, EntityDefinitionActivity> latestActivityMap = loadLatestDefinitionActivities(entityPage.getContent());
        List<EntitySummaryInfo> summaries = entityPage.getContent().stream()
                .map(entity -> buildEntitySummary(entity, latestActivityMap.get(entity.getId())))
                .toList();
        return new PageImpl<>(summaries, pageRequest, entityPage.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntityMonitorBindingCandidate> getMonitorBindingCandidates(long monitorId) {
        Monitor monitor = monitorDao.findById(monitorId).orElse(null);
        if (monitor == null) {
            return Collections.emptyList();
        }
        Map<String, String> monitorIdentities = extractMonitorIdentityCandidates(monitor);
        if (monitorIdentities.isEmpty()) {
            return Collections.emptyList();
        }
        List<EntityIdentity> matchedIdentities = entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(
                monitorIdentities.keySet(), new HashSet<>(monitorIdentities.values())
        );
        Set<Long> boundEntityIds = entityMonitorBindDao.findAllByMonitorId(monitorId).stream()
                .map(EntityMonitorBind::getEntityId)
                .collect(Collectors.toSet());
        Map<Long, BindingCandidateAccumulator> candidates = new LinkedHashMap<>();
        for (EntityIdentity identity : matchedIdentities) {
            String candidateValue = monitorIdentities.get(identity.getIdentityKey());
            if (!Objects.equals(candidateValue, identity.getNormalizedValue())) {
                continue;
            }
            BindingCandidateAccumulator accumulator = candidates.computeIfAbsent(identity.getEntityId(),
                    key -> new BindingCandidateAccumulator());
            accumulator.score += matchScore(identity);
            accumulator.matchedIdentities.computeIfAbsent(identity.getIdentityKey(), key -> new ArrayList<>())
                    .add(identity.getIdentityValue());
        }
        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }
        Map<Long, ObserveEntity> entityMap = observeEntityDao.findAllById(candidates.keySet())
                .stream().collect(Collectors.toMap(ObserveEntity::getId, item -> item));
        List<EntityMonitorBindingCandidate> result = new ArrayList<>();
        for (Map.Entry<Long, BindingCandidateAccumulator> entry : candidates.entrySet()) {
            ObserveEntity entity = entityMap.get(entry.getKey());
            if (entity == null) {
                continue;
            }
            BindingCandidateAccumulator accumulator = entry.getValue();
            int score = accumulator.finalScore();
            result.add(new EntityMonitorBindingCandidate(
                    entity.getId(),
                    entity.getDisplayName() == null ? entity.getName() : entity.getDisplayName(),
                    entity.getType(),
                    score,
                    score >= 100 ? RECOMMEND_DIRECT : RECOMMEND_SUGGESTED,
                    boundEntityIds.contains(entity.getId()),
                    accumulator.matchedIdentities
            ));
        }
        result.sort((left, right) -> Integer.compare(right.getScore(), left.getScore()));
        return result;
    }

    private List<EntityDto> parseEntityDefinitionDtos(EntityDefinitionRequest definitionRequest, Long entityId) {
        return parseDefinitions(definitionRequest).stream()
                .map(definition -> toEntityDto(definition, entityId))
                .toList();
    }

    private List<EntityDefinition> parseDefinitions(EntityDefinitionRequest definitionRequest) {
        String payload = extractDefinitionPayload(definitionRequest.getContent(), definitionRequest.getFormat());
        String format = normalizeDefinitionFormat(definitionRequest.getFormat(), payload);
        return parseDefinitionDocuments(payload, format).stream()
                .map(this::normalizeDefinition)
                .toList();
    }

    private List<Map<String, Object>> parseDefinitionDocuments(String payload, String format) {
        if (FORMAT_JSON.equals(format)) {
            return toDefinitionRecords(JsonUtil.fromJson(payload, Object.class));
        }
        List<Map<String, Object>> documents = new ArrayList<>();
        for (Object document : new Yaml().loadAll(payload)) {
            if (document == null) {
                continue;
            }
            documents.add(toDefinitionRecord(document));
        }
        return documents;
    }

    private List<Map<String, Object>> toDefinitionRecords(Object value) {
        if (value instanceof List<?> items) {
            List<Map<String, Object>> documents = new ArrayList<>();
            for (Object item : items) {
                if (item == null) {
                    continue;
                }
                documents.add(toDefinitionRecord(item));
            }
            return documents;
        }
        return List.of(toDefinitionRecord(value));
    }

    private String extractDefinitionPayload(String content, String format) {
        String trimmed = content == null ? null : content.trim();
        if (!StringUtils.hasText(trimmed)) {
            throw new IllegalArgumentException("Entity definition content can not be blank.");
        }
        if (!FORMAT_CURL.equalsIgnoreCase(defaultText(format, ""))) {
            return trimmed;
        }
        int singleQuoteIndex = trimmed.indexOf("-d '");
        if (singleQuoteIndex >= 0) {
            int payloadStart = singleQuoteIndex + 4;
            int payloadEnd = trimmed.lastIndexOf('\'');
            if (payloadEnd > payloadStart) {
                return trimmed.substring(payloadStart, payloadEnd)
                        .replace("'\\\\''", "'")
                        .replace("\\\\", "\\");
            }
        }
        int doubleQuoteIndex = trimmed.indexOf("-d \"");
        if (doubleQuoteIndex >= 0) {
            int payloadStart = doubleQuoteIndex + 4;
            int payloadEnd = trimmed.lastIndexOf('"');
            if (payloadEnd > payloadStart) {
                return trimmed.substring(payloadStart, payloadEnd)
                        .replace("\\\"", "\"")
                        .replace("\\\\", "\\");
            }
        }
        return trimmed;
    }

    private String normalizeDefinitionFormat(String format, String payload) {
        if (FORMAT_JSON.equalsIgnoreCase(defaultText(format, "")) || JsonUtil.isJsonStr(payload)) {
            return FORMAT_JSON;
        }
        return FORMAT_YAML;
    }

    private Map<String, Object> toDefinitionRecord(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            throw new IllegalArgumentException("Entity definition must be a yaml or json object.");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            if (entry.getKey() != null) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return result;
    }

    private EntityDefinition normalizeDefinition(Map<String, Object> root) {
        Map<String, Object> metadataMap = toObjectMap(root.get("metadata"));
        Map<String, Object> specMap = toObjectMap(root.get("spec"));
        Map<String, Object> telemetryMap = toObjectMap(specMap.get("telemetry"));
        boolean useRootMetadataFallback = !metadataMap.containsKey("labels") && !metadataMap.containsKey("tags")
                && (root.containsKey("labels") || root.containsKey("tags"));

        EntityDefinition definition = new EntityDefinition();
        String normalizedKind = resolveDefinitionEntityType(root, specMap);
        definition.setApiVersion(defaultText(
                asText(root.get("apiVersion")),
                asText(root.get("schema-version")),
                asText(root.get("schema_version")),
                ENTITY_DEFINITION_API_VERSION
        ));
        definition.setKind(normalizedKind);

        EntityDefinition.Metadata metadata = new EntityDefinition.Metadata();
        metadata.setName(defaultText(
                asText(metadataMap.get("name")),
                asText(root.get("dd-service")),
                asText(root.get("dd_service")),
                asText(root.get("name"))
        ));
        metadata.setNamespace(defaultText(asText(metadataMap.get("namespace")),
                asText(specMap.get("namespace")), asText(specMap.get("serviceNamespace")), asText(root.get("namespace"))));
        metadata.setOwner(defaultText(asText(metadataMap.get("owner")),
                asText(metadataMap.get("team")),
                asText(specMap.get("owner")), asText(specMap.get("ownedBy")), asText(specMap.get("team")),
                asText(root.get("team"))));
        metadata.setAdditionalOwners(extractDefinitionOwnerRefs(defaultText(
                metadataMap.containsKey("additionalOwners") ? "additionalOwners" : null,
                specMap.containsKey("additionalOwners") ? "additionalOwners" : null,
                specMap.containsKey("owners") ? "owners" : null
        ), metadataMap, specMap));
        metadata.setInheritFrom(defaultText(asText(metadataMap.get("inheritFrom")),
                asText(metadataMap.get("inherit_from")), asText(root.get("inheritFrom")), asText(root.get("inherit_from"))));
        metadata.setDisplayName(defaultText(asText(metadataMap.get("displayName")),
                asText(metadataMap.get("display_name")), asText(root.get("displayName")), asText(root.get("display_name"))));
        metadata.setDescription(defaultText(
                asText(metadataMap.get("description")),
                asText(specMap.get("description")),
                asText(root.get("description"))
        ));
        metadata.setLabels(extractDefinitionLabels(useRootMetadataFallback ? root : metadataMap));
        metadata.setTags(extractDefinitionTags(useRootMetadataFallback ? root : metadataMap));
        metadata.setLinks(extractDefinitionLinks(defaultText(metadataMap.containsKey("links") ? "links" : null,
                specMap.containsKey("links") ? "links" : null,
                root.containsKey("links") ? "links" : null), metadataMap, specMap, root, null));
        metadata.setContacts(extractDefinitionContacts(defaultText(metadataMap.containsKey("contacts") ? "contacts" : null,
                specMap.containsKey("contacts") ? "contacts" : null,
                root.containsKey("contacts") ? "contacts" : null), metadataMap, specMap, root));
        definition.setMetadata(metadata);

        EntityDefinition.Spec spec = new EntityDefinition.Spec();
        spec.setType(resolveDefinitionSubtype(root, specMap, normalizedKind));
        spec.setSource(defaultText(asText(specMap.get("source")), SOURCE_MANUAL));
        spec.setOwner(defaultText(asText(specMap.get("owner")), asText(specMap.get("ownedBy")), asText(specMap.get("team")),
                asText(metadataMap.get("owner")), asText(metadataMap.get("team")), asText(root.get("team"))));
        spec.setOwnedBy(defaultText(asText(specMap.get("ownedBy")), asText(specMap.get("owner")), asText(specMap.get("team")),
                asText(metadataMap.get("owner")), asText(metadataMap.get("team")), asText(root.get("team"))));
        spec.setNamespace(defaultText(asText(metadataMap.get("namespace")),
                asText(specMap.get("namespace")), asText(specMap.get("serviceNamespace")), asText(root.get("namespace"))));
        spec.setEnvironment(defaultText(asText(specMap.get("environment")),
                asText(specMap.get("deploymentEnvironment")), asText(root.get("environment")), asText(root.get("env"))));
        spec.setCriticality(defaultText(asText(specMap.get("criticality")), asText(root.get("criticality"))));
        spec.setRunbook(defaultText(
                asText(specMap.get("runbook")),
                extractRunbook(specMap.get("links")),
                extractRunbook(metadataMap.get("links")),
                extractRunbook(root.get("links")),
                asText(root.get("runbook"))
        ));
        spec.setLifecycle(defaultText(asText(specMap.get("lifecycle")), asText(root.get("lifecycle"))));
        spec.setTier(defaultText(asText(specMap.get("tier")), asText(root.get("tier"))));
        List<String> components = defaultList(extractDefinitionStringList("components", specMap), extractDefinitionStringList("components", root));
        List<String> componentOf = defaultList(extractDefinitionStringList("componentOf", specMap), extractDefinitionStringList("componentOf", root));
        String explicitSystem = defaultText(
                asText(specMap.get("partOf")),
                asText(specMap.get("system")),
                asText(specMap.get("systemName")),
                asText(specMap.get("system_name")),
                asText(root.get("partOf")),
                asText(root.get("system")),
                asText(root.get("systemName")),
                asText(root.get("system_name")),
                asText(root.get("application"))
        );
        boolean deriveSystemFromLegacyComponentOf = !StringUtils.hasText(explicitSystem) && componentOf.size() > 1;
        String system = defaultText(explicitSystem, deriveSystemFromLegacyComponentOf ? componentOf.getFirst() : null);
        if (deriveSystemFromLegacyComponentOf) {
            componentOf = new ArrayList<>(componentOf.subList(1, componentOf.size()));
        }
        spec.setSystem(system);
        spec.setPartOf(system);
        spec.setComponentOf(componentOf);
        spec.setComponents(components);
        spec.setImplementedBy(defaultList(extractDefinitionStringList("implementedBy", specMap), extractDefinitionStringList("implementedBy", root)));
        spec.setApiInterface(extractDefinitionApiInterface(firstNonNull(specMap.get("interface"), root.get("interface"))));
        spec.setLanguages(defaultList(extractDefinitionStringList("languages", specMap), extractDefinitionStringList("languages", root)));

        EntityDefinition.Telemetry telemetry = new EntityDefinition.Telemetry();
        telemetry.setIdentities(extractDefinitionIdentities(telemetryMap.get("identities")));
        telemetry.setMonitors(extractDefinitionMonitorBinds(telemetryMap.get("monitors")));
        if (!CollectionUtils.isEmpty(telemetry.getIdentities()) || !CollectionUtils.isEmpty(telemetry.getMonitors())) {
            spec.setTelemetry(telemetry);
        }
        List<EntityDefinition.Relation> relations = mergeDefinitionRelations(
                extractDefinitionRelations(defaultText(specMap.containsKey("relations") ? "relations" : null,
                        specMap.containsKey("dependencies") ? "dependencies" : null), specMap),
                extractDefinitionDependsOn(specMap.get("dependsOn"))
        );
        spec.setRelations(relations);
        spec.setDependsOn(extractRelationReferences(relations));

        definition.setIntegrations(extractDefinitionObjectNodeMap(firstNonNull(root.get("integrations"), specMap.get("integrations"))));
        definition.setExtensions(extractDefinitionObjectNodeMap(firstNonNull(root.get("extensions"), specMap.get("extensions"))));
        EntityDefinition.Hertzbeat hertzbeat = extractDefinitionHertzbeat(firstNonNull(root.get("hertzbeat"), specMap.get("hertzbeat")));
        if ((hertzbeat == null || hertzbeat.getPipelines() == null || CollectionUtils.isEmpty(hertzbeat.getPipelines().getFingerprints()))
                && root.containsKey("ci-pipeline-fingerprints")) {
            List<String> fingerprints = extractDefinitionStringList("ci-pipeline-fingerprints", root);
            if (!CollectionUtils.isEmpty(fingerprints)) {
                if (hertzbeat == null) {
                    hertzbeat = new EntityDefinition.Hertzbeat();
                }
                EntityDefinition.Pipelines pipelines = new EntityDefinition.Pipelines();
                pipelines.setFingerprints(fingerprints);
                hertzbeat.setPipelines(pipelines);
            }
        }
        definition.setHertzbeat(hasHertzbeatContent(hertzbeat) ? hertzbeat : null);
        definition.setSpec(spec);
        return definition;
    }

    private EntityDto toEntityDto(EntityDefinition definition, Long entityId) {
        EntityDto entityDto = new EntityDto();
        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setId(entityId);
        entityInfo.setType(defaultText(
                normalizeEntityTypeFromKind(definition.getKind()),
                "service"
        ));
        entityInfo.setName(definition.getMetadata() == null ? null : definition.getMetadata().getName());
        entityInfo.setDisplayName(definition.getMetadata() == null ? null : definition.getMetadata().getDisplayName());
        entityInfo.setSubtype(definition.getSpec() == null ? null : definition.getSpec().getType());
        entityInfo.setDescription(definition.getMetadata() == null ? null : definition.getMetadata().getDescription());
        entityInfo.setLabels(definition.getMetadata() == null ? null : definition.getMetadata().getLabels());
        entityInfo.setTags(definition.getMetadata() == null ? Collections.emptyList() : definition.getMetadata().getTags());
        entityInfo.setAdditionalOwners(toEntityOwnerRefs(definition.getMetadata() == null ? null : definition.getMetadata().getAdditionalOwners()));
        entityInfo.setInheritFrom(definition.getMetadata() == null ? null : definition.getMetadata().getInheritFrom());
        entityInfo.setLinks(toEntityLinks(
                definition.getMetadata() == null ? null : definition.getMetadata().getLinks(),
                definition.getSpec() == null ? null : definition.getSpec().getRunbook()
        ));
        entityInfo.setContacts(toEntityContacts(definition.getMetadata() == null ? null : definition.getMetadata().getContacts()));
        entityInfo.setIntegrations(toJsonNode(definition.getIntegrations()));
        entityInfo.setExtensions(toJsonNode(definition.getExtensions()));
        entityInfo.setHertzbeat(toJsonNode(definition.getHertzbeat()));
        if (definition.getSpec() != null) {
            entityInfo.setSource(definition.getSpec().getSource());
            entityInfo.setOwner(defaultText(
                    definition.getMetadata() == null ? null : definition.getMetadata().getOwner(),
                    definition.getSpec().getOwner(),
                    definition.getSpec().getOwnedBy()
            ));
            entityInfo.setNamespace(defaultText(
                    definition.getMetadata() == null ? null : definition.getMetadata().getNamespace(),
                    definition.getSpec().getNamespace()
            ));
            entityInfo.setEnvironment(definition.getSpec().getEnvironment());
            entityInfo.setCriticality(definition.getSpec().getCriticality());
            entityInfo.setRunbook(definition.getSpec().getRunbook());
            entityInfo.setLifecycle(definition.getSpec().getLifecycle());
            entityInfo.setTier(definition.getSpec().getTier());
            entityInfo.setSystem(defaultText(definition.getSpec().getPartOf(), definition.getSpec().getSystem()));
            entityInfo.setComponentOf(definition.getSpec().getComponentOf());
            entityInfo.setComponents(definition.getSpec().getComponents());
            entityInfo.setImplementedBy(definition.getSpec().getImplementedBy());
            entityInfo.setApiInterface(toJsonNode(definition.getSpec().getApiInterface()));
            entityInfo.setLanguages(definition.getSpec().getLanguages());
        }
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(toEntityIdentities(definition.getSpec() == null ? null : definition.getSpec().getTelemetry()));
        entityDto.setMonitorBinds(toEntityMonitorBinds(definition.getSpec() == null ? null : definition.getSpec().getTelemetry()));
        entityDto.setRelations(toEntityRelations(definition.getSpec() == null ? null : definition.getSpec().getRelations(), entityId));
        return entityDto;
    }

    private EntityDefinition toEntityDefinition(EntityDto entityDto) {
        EntityDefinition definition = new EntityDefinition();
        definition.setApiVersion(ENTITY_DEFINITION_API_VERSION);
        definition.setKind(defaultText(toDefinitionKind(entityDto.getEntity().getType()), "service"));

        ObserveEntity entity = entityDto.getEntity();
        EntityDefinition.Metadata metadata = new EntityDefinition.Metadata();
        metadata.setName(entity.getName());
        metadata.setNamespace(entity.getNamespace());
        metadata.setOwner(entity.getOwner());
        metadata.setAdditionalOwners(toDefinitionOwnerRefs(entity.getAdditionalOwners()));
        metadata.setInheritFrom(entity.getInheritFrom());
        metadata.setDisplayName(entity.getDisplayName());
        metadata.setDescription(entity.getDescription());
        metadata.setLabels(entity.getLabels());
        metadata.setTags(normalizeTags(entity.getTags(), entity.getLabels()));
        metadata.setLinks(toDefinitionLinks(entity.getLinks(), entity.getRunbook()));
        metadata.setContacts(toDefinitionContacts(entity.getContacts()));
        definition.setMetadata(metadata);
        definition.setIntegrations(toObjectNodeMap(entity.getIntegrations()));
        definition.setExtensions(toObjectNodeMap(entity.getExtensions()));
        definition.setHertzbeat(toDefinitionHertzbeat(entity.getHertzbeat()));

        EntityDefinition.Spec spec = new EntityDefinition.Spec();
        spec.setSource(entity.getSource());
        spec.setOwner(entity.getOwner());
        spec.setOwnedBy(entity.getOwner());
        spec.setNamespace(entity.getNamespace());
        spec.setEnvironment(entity.getEnvironment());
        spec.setCriticality(entity.getCriticality());
        spec.setRunbook(entity.getRunbook());
        spec.setLifecycle(entity.getLifecycle());
        spec.setTier(entity.getTier());
        spec.setType(entity.getSubtype());
        spec.setSystem(entity.getSystem());
        spec.setPartOf(entity.getSystem());
        spec.setComponentOf(entity.getComponentOf());
        spec.setComponents(entity.getComponents());
        spec.setImplementedBy(entity.getImplementedBy());
        spec.setApiInterface(toDefinitionApiInterface(entity.getApiInterface()));
        spec.setLanguages(entity.getLanguages());

        EntityDefinition.Telemetry telemetry = new EntityDefinition.Telemetry();
        telemetry.setIdentities((entityDto.getIdentities() == null ? Collections.<EntityIdentity>emptyList() : entityDto.getIdentities()).stream()
                .map(identity -> {
                    EntityDefinition.Identity item = new EntityDefinition.Identity();
                    item.setKey(identity.getIdentityKey());
                    item.setValue(identity.getIdentityValue());
                    item.setType(identity.getIdentityType());
                    item.setPriority(identity.getPriority());
                    item.setPrimary(identity.isPrimaryIdentity());
                    return item;
                }).toList());
        telemetry.setMonitors((entityDto.getMonitorBinds() == null ? Collections.<EntityMonitorBind>emptyList() : entityDto.getMonitorBinds()).stream()
                .map(bind -> {
                    EntityDefinition.MonitorBind item = new EntityDefinition.MonitorBind();
                    item.setMonitorId(bind.getMonitorId());
                    item.setBindType(bind.getBindType());
                    item.setBindSource(bind.getBindSource());
                    item.setStatus(bind.getStatus());
                    item.setScore(bind.getScore());
                    item.setMatchContext(bind.getMatchContext());
                    return item;
                }).toList());
        if (!CollectionUtils.isEmpty(telemetry.getIdentities()) || !CollectionUtils.isEmpty(telemetry.getMonitors())) {
            spec.setTelemetry(telemetry);
        }

        Long entityId = entity.getId();
        List<EntityDefinition.Relation> relations = (entityDto.getRelations() == null ? Collections.<EntityRelation>emptyList() : entityDto.getRelations()).stream()
                .filter(relation -> entityId == null || Objects.equals(relation.getSourceEntityId(), entityId))
                .map(relation -> {
                    EntityDefinition.Relation item = new EntityDefinition.Relation();
                    item.setTargetEntityId(relation.getTargetEntityId());
                    item.setTargetRef(defaultText(relation.getTargetRef(), buildEntityReference(relation.getTargetEntityId())));
                    item.setRelationType(relation.getRelationType());
                    item.setRelationSource(relation.getRelationSource());
                    item.setStatus(relation.getStatus());
                    item.setScore(relation.getScore());
                    item.setDescription(relation.getDescription());
                    item.setAttributes(relation.getAttributes());
                    return item;
                }).toList();
        if (!relations.isEmpty()) {
            spec.setRelations(relations);
            spec.setDependsOn(extractRelationReferences(relations));
        }
        definition.setSpec(spec);
        return definition;
    }

    private List<EntityIdentity> toEntityIdentities(EntityDefinition.Telemetry telemetry) {
        if (telemetry == null || CollectionUtils.isEmpty(telemetry.getIdentities())) {
            return Collections.emptyList();
        }
        return telemetry.getIdentities().stream()
                .filter(identity -> StringUtils.hasText(identity.getKey()) && StringUtils.hasText(identity.getValue()))
                .map(identity -> EntityIdentity.builder()
                        .identityKey(identity.getKey().trim())
                        .identityValue(identity.getValue().trim())
                        .identityType(defaultText(identity.getType(), SOURCE_MANUAL))
                        .priority(identity.getPriority())
                        .primaryIdentity(Boolean.TRUE.equals(identity.getPrimary()))
                        .build())
                .toList();
    }

    private List<EntityMonitorBind> toEntityMonitorBinds(EntityDefinition.Telemetry telemetry) {
        if (telemetry == null || CollectionUtils.isEmpty(telemetry.getMonitors())) {
            return Collections.emptyList();
        }
        return telemetry.getMonitors().stream()
                .filter(bind -> bind.getMonitorId() != null)
                .map(bind -> EntityMonitorBind.builder()
                        .monitorId(bind.getMonitorId())
                        .bindType(defaultText(bind.getBindType(), SOURCE_MANUAL))
                        .bindSource(defaultText(bind.getBindSource(), SOURCE_MANUAL))
                        .status(defaultText(bind.getStatus(), BIND_ACTIVE))
                        .score(bind.getScore())
                        .matchContext(bind.getMatchContext())
                        .build())
                .toList();
    }

    private List<EntityRelation> toEntityRelations(List<EntityDefinition.Relation> relations, Long entityId) {
        if (CollectionUtils.isEmpty(relations)) {
            return Collections.emptyList();
        }
        return relations.stream()
                .map(relation -> EntityRelation.builder()
                        .sourceEntityId(entityId)
                        .targetEntityId(defaultTargetEntityId(relation))
                        .targetRef(defaultText(relation.getTargetRef(),
                                relation.getTargetEntityId() == null ? null : buildEntityReference(relation.getTargetEntityId())))
                        .relationType(defaultText(relation.getRelationType(), "depends_on"))
                        .relationSource(defaultText(relation.getRelationSource(), SOURCE_MANUAL))
                        .status(defaultText(relation.getStatus(), RELATION_CONFIRMED))
                        .score(relation.getScore())
                        .description(relation.getDescription())
                        .attributes(relation.getAttributes())
                        .build())
                .filter(relation -> relation.getTargetEntityId() != null || StringUtils.hasText(relation.getTargetRef()))
                .toList();
    }

    private String renderDefinition(EntityDefinition definition, String format) {
        String normalizedFormat = normalizeDefinitionFormat(format, "");
        if (FORMAT_JSON.equals(normalizedFormat)) {
            try {
                return PRETTY_JSON_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(toDefinitionMap(definition));
            } catch (Exception e) {
                throw new IllegalArgumentException("Fail to render entity definition json.", e);
            }
        }
        DumperOptions dumperOptions = new DumperOptions();
        dumperOptions.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        dumperOptions.setPrettyFlow(true);
        dumperOptions.setIndent(2);
        dumperOptions.setIndicatorIndent(1);
        dumperOptions.setDefaultScalarStyle(DumperOptions.ScalarStyle.PLAIN);
        return new Yaml(dumperOptions).dumpAsMap(toDefinitionMap(definition));
    }

    private Map<String, Object> toDefinitionMap(EntityDefinition definition) {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("apiVersion", definition.getApiVersion());
        root.put("kind", definition.getKind());

        Map<String, Object> metadata = new LinkedHashMap<>();
        if (definition.getMetadata() != null) {
            putIfPresent(metadata, "name", definition.getMetadata().getName());
            putIfPresent(metadata, "namespace", definition.getMetadata().getNamespace());
            putIfPresent(metadata, "owner", definition.getMetadata().getOwner());
            if (!CollectionUtils.isEmpty(definition.getMetadata().getAdditionalOwners())) {
                metadata.put("additionalOwners", definition.getMetadata().getAdditionalOwners().stream().map(owner -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    putIfPresent(item, "name", owner.getName());
                    putIfPresent(item, "type", owner.getType());
                    return item;
                }).toList());
            }
            putIfPresent(metadata, "inheritFrom", definition.getMetadata().getInheritFrom());
            putIfPresent(metadata, "displayName", definition.getMetadata().getDisplayName());
            putIfPresent(metadata, "description", definition.getMetadata().getDescription());
            if (!CollectionUtils.isEmpty(definition.getMetadata().getTags())) {
                metadata.put("tags", definition.getMetadata().getTags());
            }
            if (!CollectionUtils.isEmpty(definition.getMetadata().getLabels())) {
                metadata.put("labels", definition.getMetadata().getLabels());
            }
            if (!CollectionUtils.isEmpty(definition.getMetadata().getLinks())) {
                metadata.put("links", definition.getMetadata().getLinks().stream().map(link -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    putIfPresent(item, "name", link.getName());
                    putIfPresent(item, "type", link.getType());
                    putIfPresent(item, "provider", link.getProvider());
                    putIfPresent(item, "url", link.getUrl());
                    return item;
                }).toList());
            }
            if (!CollectionUtils.isEmpty(definition.getMetadata().getContacts())) {
                metadata.put("contacts", definition.getMetadata().getContacts().stream().map(contact -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    putIfPresent(item, "name", contact.getName());
                    putIfPresent(item, "type", contact.getType());
                    putIfPresent(item, "contact", defaultText(contact.getContact(), contact.getValue()));
                    return item;
                }).toList());
            }
        }
        root.put("metadata", metadata);

        Map<String, Object> spec = new LinkedHashMap<>();
        if (definition.getSpec() != null) {
            putIfPresent(spec, "type", definition.getSpec().getType());
            putIfPresent(spec, "source", definition.getSpec().getSource());
            putIfPresent(spec, "ownedBy", definition.getSpec().getOwnedBy());
            putIfPresent(spec, "environment", definition.getSpec().getEnvironment());
            putIfPresent(spec, "criticality", definition.getSpec().getCriticality());
            putIfPresent(spec, "runbook", definition.getSpec().getRunbook());
            putIfPresent(spec, "lifecycle", definition.getSpec().getLifecycle());
            putIfPresent(spec, "tier", definition.getSpec().getTier());
            putIfPresent(spec, "partOf", defaultText(definition.getSpec().getPartOf(), definition.getSpec().getSystem()));
            if (!CollectionUtils.isEmpty(definition.getSpec().getComponentOf())) {
                spec.put("componentOf", definition.getSpec().getComponentOf());
            }
            if (!CollectionUtils.isEmpty(definition.getSpec().getComponents())) {
                spec.put("components", definition.getSpec().getComponents());
            }
            if (!CollectionUtils.isEmpty(definition.getSpec().getImplementedBy())) {
                spec.put("implementedBy", definition.getSpec().getImplementedBy());
            }
            if (definition.getSpec().getApiInterface() != null) {
                Map<String, Object> apiInterface = new LinkedHashMap<>();
                if (definition.getSpec().getApiInterface().getDefinition() != null) {
                    apiInterface.put("definition", definition.getSpec().getApiInterface().getDefinition());
                }
                putIfPresent(apiInterface, "fileRef", definition.getSpec().getApiInterface().getFileRef());
                if (!apiInterface.isEmpty()) {
                    spec.put("interface", apiInterface);
                }
            }
            if (!CollectionUtils.isEmpty(definition.getSpec().getLanguages())) {
                spec.put("languages", definition.getSpec().getLanguages());
            }
            if (definition.getSpec().getTelemetry() != null) {
                Map<String, Object> telemetry = new LinkedHashMap<>();
                if (!CollectionUtils.isEmpty(definition.getSpec().getTelemetry().getIdentities())) {
                    telemetry.put("identities", definition.getSpec().getTelemetry().getIdentities().stream().map(identity -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        putIfPresent(item, "key", identity.getKey());
                        putIfPresent(item, "value", identity.getValue());
                        putIfPresent(item, "type", identity.getType());
                        if (identity.getPriority() != null) {
                            item.put("priority", identity.getPriority());
                        }
                        if (identity.getPrimary() != null) {
                            item.put("primary", identity.getPrimary());
                        }
                        return item;
                    }).toList());
                }
                if (!CollectionUtils.isEmpty(definition.getSpec().getTelemetry().getMonitors())) {
                    telemetry.put("monitors", definition.getSpec().getTelemetry().getMonitors().stream().map(bind -> {
                        Map<String, Object> item = new LinkedHashMap<>();
                        if (bind.getMonitorId() != null) {
                            item.put("monitorId", bind.getMonitorId());
                        }
                        putIfPresent(item, "bindType", bind.getBindType());
                        putIfPresent(item, "bindSource", bind.getBindSource());
                        putIfPresent(item, "status", bind.getStatus());
                        if (bind.getScore() != null) {
                            item.put("score", bind.getScore());
                        }
                        if (!CollectionUtils.isEmpty(bind.getMatchContext())) {
                            item.put("matchContext", bind.getMatchContext());
                        }
                        return item;
                    }).toList());
                }
                if (!telemetry.isEmpty()) {
                    spec.put("telemetry", telemetry);
                }
            }
            if (!CollectionUtils.isEmpty(definition.getSpec().getRelations())) {
                if (!CollectionUtils.isEmpty(definition.getSpec().getDependsOn())) {
                    spec.put("dependsOn", definition.getSpec().getDependsOn());
                }
                spec.put("relations", definition.getSpec().getRelations().stream().map(relation -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    if (relation.getTargetEntityId() != null) {
                        item.put("targetEntityId", relation.getTargetEntityId());
                    }
                    putIfPresent(item, "targetRef", relation.getTargetRef());
                    putIfPresent(item, "relationType", relation.getRelationType());
                    putIfPresent(item, "relationSource", relation.getRelationSource());
                    putIfPresent(item, "status", relation.getStatus());
                    if (relation.getScore() != null) {
                        item.put("score", relation.getScore());
                    }
                    putIfPresent(item, "description", relation.getDescription());
                    if (!CollectionUtils.isEmpty(relation.getAttributes())) {
                        item.put("attributes", relation.getAttributes());
                    }
                    return item;
                }).toList());
            }
        }
        root.put("spec", spec);
        if (!CollectionUtils.isEmpty(definition.getIntegrations())) {
            root.put("integrations", definition.getIntegrations());
        }
        if (!CollectionUtils.isEmpty(definition.getExtensions())) {
            root.put("extensions", definition.getExtensions());
        }
        Map<String, Object> hertzbeat = toDefinitionHertzbeatMap(definition.getHertzbeat());
        if (!hertzbeat.isEmpty()) {
            root.put("hertzbeat", hertzbeat);
        }
        return root;
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value instanceof String stringValue) {
            if (StringUtils.hasText(stringValue)) {
                target.put(key, stringValue);
            }
            return;
        }
        if (value != null) {
            target.put(key, value);
        }
    }

    private Map<String, String> extractDefinitionLabels(Map<String, Object> metadataMap) {
        Map<String, String> labels = toStringMap(metadataMap.get("labels"));
        if (!labels.isEmpty()) {
            return labels;
        }
        Object tags = metadataMap.get("tags");
        if (!(tags instanceof List<?> tagList)) {
            return Collections.emptyMap();
        }
        Map<String, String> mappedLabels = new LinkedHashMap<>();
        for (Object tag : tagList) {
            String item = asText(tag);
            if (!StringUtils.hasText(item)) {
                continue;
            }
            int index = item.indexOf(':');
            if (index <= 0 || index >= item.length() - 1) {
                mappedLabels.put(item.trim(), "");
            } else {
                mappedLabels.put(item.substring(0, index).trim(), item.substring(index + 1).trim());
            }
        }
        return mappedLabels;
    }

    private List<String> extractDefinitionTags(Map<String, Object> metadataMap) {
        if (metadataMap == null || metadataMap.isEmpty()) {
            return Collections.emptyList();
        }
        Object tags = metadataMap.get("tags");
        if (tags instanceof List<?> tagList) {
            return tagList.stream()
                    .map(this::asText)
                    .filter(StringUtils::hasText)
                    .toList();
        }
        Map<String, String> labels = toStringMap(metadataMap.get("labels"));
        return toDefinitionTags(labels);
    }

    private List<String> toDefinitionTags(Map<String, String> labels) {
        if (CollectionUtils.isEmpty(labels)) {
            return Collections.emptyList();
        }
        return labels.entrySet().stream()
                .filter(entry -> StringUtils.hasText(entry.getKey()))
                .map(entry -> StringUtils.hasText(entry.getValue())
                        ? entry.getKey().trim() + ":" + entry.getValue().trim()
                        : entry.getKey().trim())
                .toList();
    }

    private List<String> normalizeTags(List<String> tags, Map<String, String> labels) {
        List<String> normalized = defaultList(tags, Collections.emptyList()).stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
        if (!CollectionUtils.isEmpty(normalized)) {
            return normalized;
        }
        return toDefinitionTags(labels);
    }

    private String extractRunbook(Object links) {
        if (links instanceof Map<?, ?> mapLinks) {
            Object runbook = mapLinks.get("runbook");
            return asText(runbook);
        }
        if (!(links instanceof List<?> items)) {
            return null;
        }
        for (Object item : items) {
            Map<String, Object> link = toObjectMap(item);
            String name = asText(link.get("name"));
            String type = asText(link.get("type"));
            if ("runbook".equals(name) || "runbook".equals(type)) {
                return asText(link.get("url"));
            }
        }
        return null;
    }

    private List<EntityDefinition.Link> extractDefinitionLinks(String key, Map<String, Object> metadataMap,
                                                               Map<String, Object> specMap, Map<String, Object> rootMap,
                                                               String runbookUrl) {
        Object links = null;
        if (key != null) {
            if (metadataMap.containsKey(key)) {
                links = metadataMap.get(key);
            } else if (specMap.containsKey(key)) {
                links = specMap.get(key);
            } else if (rootMap.containsKey(key)) {
                links = rootMap.get(key);
            }
        }
        List<EntityDefinition.Link> result = new ArrayList<>();
        if (links instanceof Map<?, ?> linkMap) {
            for (Map.Entry<?, ?> entry : linkMap.entrySet()) {
                String linkName = entry.getKey() == null ? null : String.valueOf(entry.getKey());
                String url = asText(entry.getValue());
                if (!StringUtils.hasText(linkName) || !StringUtils.hasText(url)) {
                    continue;
                }
                EntityDefinition.Link item = new EntityDefinition.Link();
                item.setName(linkName.trim());
                item.setType("runbook".equalsIgnoreCase(linkName) ? "runbook" : "link");
                item.setUrl(url.trim());
                result.add(item);
            }
        } else if (links instanceof List<?> items) {
            for (Object itemValue : items) {
                Map<String, Object> linkMap = toObjectMap(itemValue);
                String url = defaultText(asText(linkMap.get("url")), asText(linkMap.get("href")));
                if (!StringUtils.hasText(url)) {
                    continue;
                }
                EntityDefinition.Link item = new EntityDefinition.Link();
                item.setName(defaultText(asText(linkMap.get("name")), asText(linkMap.get("label"))));
                item.setType(defaultText(asText(linkMap.get("type")), "link"));
                item.setProvider(asText(linkMap.get("provider")));
                item.setUrl(url.trim());
                result.add(item);
            }
        }
        if (StringUtils.hasText(runbookUrl)) {
            boolean hasRunbook = result.stream().anyMatch(link -> "runbook".equalsIgnoreCase(defaultText(link.getType(), link.getName())));
            if (!hasRunbook) {
                EntityDefinition.Link runbook = new EntityDefinition.Link();
                runbook.setName("runbook");
                runbook.setType("runbook");
                runbook.setUrl(runbookUrl.trim());
                result.add(0, runbook);
            }
        }
        return result;
    }

    private List<EntityDefinition.Contact> extractDefinitionContacts(String key, Map<String, Object> metadataMap,
                                                                     Map<String, Object> specMap, Map<String, Object> rootMap) {
        Object contacts = null;
        if (key != null) {
            if (metadataMap.containsKey(key)) {
                contacts = metadataMap.get(key);
            } else if (specMap.containsKey(key)) {
                contacts = specMap.get(key);
            } else if (rootMap.containsKey(key)) {
                contacts = rootMap.get(key);
            }
        }
        if (contacts instanceof Map<?, ?> contactMap) {
            List<EntityDefinition.Contact> result = new ArrayList<>();
            for (Map.Entry<?, ?> entry : contactMap.entrySet()) {
                String contactName = entry.getKey() == null ? null : String.valueOf(entry.getKey());
                String value = asText(entry.getValue());
                if (!StringUtils.hasText(contactName) || !StringUtils.hasText(value)) {
                    continue;
                }
                EntityDefinition.Contact item = new EntityDefinition.Contact();
                item.setName(contactName.trim());
                item.setType(contactName.trim());
                item.setValue(value.trim());
                result.add(item);
            }
            return result;
        }
        if (!(contacts instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.Contact> result = new ArrayList<>();
        for (Object itemValue : items) {
            Map<String, Object> contactMap = toObjectMap(itemValue);
            String value = defaultText(
                    asText(contactMap.get("value")),
                    asText(contactMap.get("contact")),
                    asText(contactMap.get("url"))
            );
            if (!StringUtils.hasText(value)) {
                continue;
            }
            EntityDefinition.Contact item = new EntityDefinition.Contact();
            item.setName(defaultText(asText(contactMap.get("name")), asText(contactMap.get("label"))));
            item.setType(defaultText(asText(contactMap.get("type")), "contact"));
            item.setValue(value.trim());
            result.add(item);
        }
        return result;
    }

    private List<EntityCatalogLink> toEntityLinks(List<EntityDefinition.Link> links, String runbookUrl) {
        if (CollectionUtils.isEmpty(links) && !StringUtils.hasText(runbookUrl)) {
            return Collections.emptyList();
        }
        List<EntityCatalogLink> result = new ArrayList<>();
        if (!CollectionUtils.isEmpty(links)) {
            for (EntityDefinition.Link link : links) {
                if (link == null || !StringUtils.hasText(link.getUrl())) {
                    continue;
                }
                result.add(new EntityCatalogLink(
                        defaultText(link.getName(), link.getType()),
                        defaultText(link.getType(), "link"),
                        trimToNull(link.getProvider()),
                        link.getUrl().trim()
                ));
            }
        }
        if (StringUtils.hasText(runbookUrl)) {
            boolean hasRunbook = result.stream().anyMatch(link -> "runbook".equalsIgnoreCase(defaultText(link.getType(), link.getName())));
            if (!hasRunbook) {
                result.add(0, new EntityCatalogLink("runbook", "runbook", "manual", runbookUrl.trim()));
            }
        }
        return result;
    }

    private List<EntityCatalogContact> toEntityContacts(List<EntityDefinition.Contact> contacts) {
        if (CollectionUtils.isEmpty(contacts)) {
            return Collections.emptyList();
        }
        return contacts.stream()
                .filter(contact -> contact != null && StringUtils.hasText(defaultText(contact.getValue(), contact.getContact())))
                .map(contact -> {
                    String value = defaultText(contact.getValue(), contact.getContact()).trim();
                    EntityCatalogContact item = new EntityCatalogContact(
                            defaultText(contact.getName(), contact.getType()),
                            defaultText(contact.getType(), "contact"),
                            value
                    );
                    item.setContact(value);
                    return item;
                })
                .toList();
    }

    private List<EntityDefinition.Link> toDefinitionLinks(List<EntityCatalogLink> links, String runbookUrl) {
        List<EntityDefinition.Link> result = new ArrayList<>();
        if (!CollectionUtils.isEmpty(links)) {
            for (EntityCatalogLink link : links) {
                if (link == null || !StringUtils.hasText(link.getUrl())) {
                    continue;
                }
                EntityDefinition.Link item = new EntityDefinition.Link();
                item.setName(defaultText(link.getName(), link.getType()));
                item.setType(defaultText(link.getType(), "link"));
                item.setProvider(trimToNull(link.getProvider()));
                item.setUrl(link.getUrl().trim());
                result.add(item);
            }
        }
        if (StringUtils.hasText(runbookUrl)) {
            boolean hasRunbook = result.stream().anyMatch(link -> "runbook".equalsIgnoreCase(defaultText(link.getType(), link.getName())));
            if (!hasRunbook) {
                EntityDefinition.Link runbook = new EntityDefinition.Link();
                runbook.setName("runbook");
                runbook.setType("runbook");
                runbook.setProvider("manual");
                runbook.setUrl(runbookUrl.trim());
                result.add(0, runbook);
            }
        }
        return result;
    }

    private List<EntityDefinition.Contact> toDefinitionContacts(List<EntityCatalogContact> contacts) {
        if (CollectionUtils.isEmpty(contacts)) {
            return Collections.emptyList();
        }
        return contacts.stream()
                .filter(contact -> contact != null && StringUtils.hasText(defaultText(contact.getContact(), contact.getValue())))
                .map(contact -> {
                    EntityDefinition.Contact item = new EntityDefinition.Contact();
                    item.setName(defaultText(contact.getName(), contact.getType()));
                    item.setType(defaultText(contact.getType(), "contact"));
                    item.setContact(defaultText(contact.getContact(), contact.getValue()).trim());
                    return item;
                })
                .toList();
    }

    private Map<String, Object> extractDefinitionObjectNodeMap(Object value) {
        Map<String, Object> objectMap = toObjectMap(value);
        return objectMap.isEmpty() ? Collections.emptyMap() : objectMap;
    }

    private EntityDefinition.Hertzbeat extractDefinitionHertzbeat(Object value) {
        Map<String, Object> hertzbeatMap = toObjectMap(value);
        if (hertzbeatMap.isEmpty()) {
            return null;
        }
        EntityDefinition.Hertzbeat hertzbeat = new EntityDefinition.Hertzbeat();
        hertzbeat.setCodeLocations(extractDefinitionCodeLocations(hertzbeatMap.get("codeLocations")));
        hertzbeat.setEvents(extractDefinitionSavedQueries(hertzbeatMap.get("events")));
        hertzbeat.setLogs(extractDefinitionSavedQueries(hertzbeatMap.get("logs")));
        hertzbeat.setPerformanceData(extractDefinitionPerformanceData(hertzbeatMap.get("performanceData")));
        hertzbeat.setPipelines(extractDefinitionPipelines(hertzbeatMap.get("pipelines")));
        return hasHertzbeatContent(hertzbeat) ? hertzbeat : null;
    }

    private List<EntityDefinition.CodeLocation> extractDefinitionCodeLocations(Object value) {
        if (!(value instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.CodeLocation> results = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> codeLocationMap = toObjectMap(item);
            String repositoryUrl = defaultText(asText(codeLocationMap.get("repositoryURL")), asText(codeLocationMap.get("repositoryUrl")));
            List<String> paths = extractDefinitionStringList("paths", codeLocationMap);
            if (!StringUtils.hasText(repositoryUrl) && CollectionUtils.isEmpty(paths)) {
                continue;
            }
            EntityDefinition.CodeLocation codeLocation = new EntityDefinition.CodeLocation();
            codeLocation.setRepositoryURL(trimToNull(repositoryUrl));
            codeLocation.setPaths(paths);
            results.add(codeLocation);
        }
        return results;
    }

    private List<EntityDefinition.SavedQuery> extractDefinitionSavedQueries(Object value) {
        if (!(value instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.SavedQuery> results = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> queryMap = toObjectMap(item);
            String query = defaultText(asText(queryMap.get("query")), asText(queryMap.get("search")));
            if (!StringUtils.hasText(query)) {
                continue;
            }
            EntityDefinition.SavedQuery savedQuery = new EntityDefinition.SavedQuery();
            savedQuery.setName(defaultText(asText(queryMap.get("name")), asText(queryMap.get("label"))));
            savedQuery.setQuery(query.trim());
            results.add(savedQuery);
        }
        return results;
    }

    private EntityDefinition.PerformanceData extractDefinitionPerformanceData(Object value) {
        Map<String, Object> performanceMap = toObjectMap(value);
        if (performanceMap.isEmpty()) {
            return null;
        }
        List<String> tags = extractDefinitionStringList("tags", performanceMap);
        if (CollectionUtils.isEmpty(tags)) {
            return null;
        }
        EntityDefinition.PerformanceData performanceData = new EntityDefinition.PerformanceData();
        performanceData.setTags(tags);
        return performanceData;
    }

    private EntityDefinition.Pipelines extractDefinitionPipelines(Object value) {
        Map<String, Object> pipelinesMap = toObjectMap(value);
        if (pipelinesMap.isEmpty()) {
            return null;
        }
        List<String> fingerprints = extractDefinitionStringList("fingerprints", pipelinesMap);
        if (CollectionUtils.isEmpty(fingerprints)) {
            return null;
        }
        EntityDefinition.Pipelines pipelines = new EntityDefinition.Pipelines();
        pipelines.setFingerprints(fingerprints);
        return pipelines;
    }

    private boolean hasHertzbeatContent(EntityDefinition.Hertzbeat hertzbeat) {
        if (hertzbeat == null) {
            return false;
        }
        return !CollectionUtils.isEmpty(hertzbeat.getCodeLocations())
                || !CollectionUtils.isEmpty(hertzbeat.getEvents())
                || !CollectionUtils.isEmpty(hertzbeat.getLogs())
                || (hertzbeat.getPerformanceData() != null && !CollectionUtils.isEmpty(hertzbeat.getPerformanceData().getTags()))
                || (hertzbeat.getPipelines() != null && !CollectionUtils.isEmpty(hertzbeat.getPipelines().getFingerprints()));
    }

    private Map<String, Object> toDefinitionHertzbeatMap(EntityDefinition.Hertzbeat hertzbeat) {
        if (!hasHertzbeatContent(hertzbeat)) {
            return Collections.emptyMap();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        if (!CollectionUtils.isEmpty(hertzbeat.getCodeLocations())) {
            result.put("codeLocations", hertzbeat.getCodeLocations().stream().map(codeLocation -> {
                Map<String, Object> item = new LinkedHashMap<>();
                putIfPresent(item, "repositoryURL", codeLocation.getRepositoryURL());
                if (!CollectionUtils.isEmpty(codeLocation.getPaths())) {
                    item.put("paths", codeLocation.getPaths());
                }
                return item;
            }).toList());
        }
        if (!CollectionUtils.isEmpty(hertzbeat.getEvents())) {
            result.put("events", hertzbeat.getEvents().stream().map(query -> {
                Map<String, Object> item = new LinkedHashMap<>();
                putIfPresent(item, "name", query.getName());
                putIfPresent(item, "query", query.getQuery());
                return item;
            }).toList());
        }
        if (!CollectionUtils.isEmpty(hertzbeat.getLogs())) {
            result.put("logs", hertzbeat.getLogs().stream().map(query -> {
                Map<String, Object> item = new LinkedHashMap<>();
                putIfPresent(item, "name", query.getName());
                putIfPresent(item, "query", query.getQuery());
                return item;
            }).toList());
        }
        if (hertzbeat.getPerformanceData() != null && !CollectionUtils.isEmpty(hertzbeat.getPerformanceData().getTags())) {
            Map<String, Object> performanceData = new LinkedHashMap<>();
            performanceData.put("tags", hertzbeat.getPerformanceData().getTags());
            result.put("performanceData", performanceData);
        }
        if (hertzbeat.getPipelines() != null && !CollectionUtils.isEmpty(hertzbeat.getPipelines().getFingerprints())) {
            Map<String, Object> pipelines = new LinkedHashMap<>();
            pipelines.put("fingerprints", hertzbeat.getPipelines().getFingerprints());
            result.put("pipelines", pipelines);
        }
        return result;
    }

    private EntityDefinition.Hertzbeat toDefinitionHertzbeat(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return JsonUtil.fromJson(node.toString(), EntityDefinition.Hertzbeat.class);
    }

    private EntityDefinition.ApiInterface toDefinitionApiInterface(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return JsonUtil.fromJson(node.toString(), EntityDefinition.ApiInterface.class);
    }

    private Map<String, Object> toObjectNodeMap(JsonNode node) {
        if (node == null || node.isNull() || !node.isObject()) {
            return Collections.emptyMap();
        }
        return JsonUtil.fromJson(node.toString(), new tools.jackson.core.type.TypeReference<Map<String, Object>>() {
        });
    }

    private JsonNode toJsonNode(Object value) {
        if (value == null) {
            return null;
        }
        return JsonUtil.fromJson(JsonUtil.toJson(value));
    }

    private EntityDefinition.ApiInterface extractDefinitionApiInterface(Object value) {
        Map<String, Object> interfaceMap = toObjectMap(value);
        if (interfaceMap.isEmpty()) {
            return null;
        }
        EntityDefinition.ApiInterface apiInterface = new EntityDefinition.ApiInterface();
        Object definition = firstNonNull(interfaceMap.get("definition"), interfaceMap.get("schema"));
        if (definition != null) {
            apiInterface.setDefinition(definition);
        }
        apiInterface.setFileRef(defaultText(
                asText(interfaceMap.get("fileRef")),
                asText(interfaceMap.get("fileref")),
                asText(interfaceMap.get("file_ref"))
        ));
        if (apiInterface.getDefinition() == null && !StringUtils.hasText(apiInterface.getFileRef())) {
            return null;
        }
        return apiInterface;
    }

    private List<EntityDefinition.Identity> extractDefinitionIdentities(Object identities) {
        if (!(identities instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.Identity> result = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> identityMap = toObjectMap(item);
            String key = asText(identityMap.get("key"));
            String value = asText(identityMap.get("value"));
            if (!StringUtils.hasText(key) || !StringUtils.hasText(value)) {
                continue;
            }
            EntityDefinition.Identity identity = new EntityDefinition.Identity();
            identity.setKey(key.trim());
            identity.setValue(value.trim());
            identity.setType(defaultText(asText(identityMap.get("type")), asText(identityMap.get("source")), SOURCE_MANUAL));
            identity.setPriority(asInteger(identityMap.get("priority")));
            identity.setPrimary(asBoolean(identityMap.get("primary")));
            result.add(identity);
        }
        return result;
    }

    private List<EntityDefinition.MonitorBind> extractDefinitionMonitorBinds(Object monitors) {
        if (!(monitors instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.MonitorBind> result = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> bindMap = toObjectMap(item);
            Long monitorId = asLong(defaultText(bindMap.containsKey("monitorId") ? "monitorId" : null,
                    bindMap.containsKey("id") ? "id" : null), bindMap);
            if (monitorId == null) {
                continue;
            }
            EntityDefinition.MonitorBind bind = new EntityDefinition.MonitorBind();
            bind.setMonitorId(monitorId);
            bind.setBindType(defaultText(asText(bindMap.get("bindType")), SOURCE_MANUAL));
            bind.setBindSource(defaultText(asText(bindMap.get("bindSource")), SOURCE_MANUAL));
            bind.setStatus(defaultText(asText(bindMap.get("status")), BIND_ACTIVE));
            bind.setScore(asInteger(bindMap.get("score")));
            bind.setMatchContext(toStringListMap(bindMap.get("matchContext")));
            result.add(bind);
        }
        return result;
    }

    private List<EntityDefinition.Relation> extractDefinitionRelations(String relationKey, Map<String, Object> specMap) {
        Object relationValue = relationKey == null ? null : specMap.get(relationKey);
        if (!(relationValue instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.Relation> result = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> relationMap = toObjectMap(item);
            Long targetEntityId = asLong(defaultText(relationMap.containsKey("targetEntityId") ? "targetEntityId" : null,
                    relationMap.containsKey("target") ? "target" : null), relationMap);
            String targetRef = defaultText(asText(relationMap.get("targetRef")), asText(relationMap.get("ref")));
            if (targetEntityId == null && !StringUtils.hasText(targetRef)) {
                continue;
            }
            EntityDefinition.Relation relation = new EntityDefinition.Relation();
            relation.setTargetEntityId(targetEntityId);
            relation.setTargetRef(targetRef);
            relation.setRelationType(defaultText(asText(relationMap.get("relationType")), "depends_on"));
            relation.setRelationSource(defaultText(asText(relationMap.get("relationSource")), SOURCE_MANUAL));
            relation.setStatus(defaultText(asText(relationMap.get("status")), RELATION_CONFIRMED));
            relation.setScore(asInteger(relationMap.get("score")));
            relation.setDescription(asText(relationMap.get("description")));
            relation.setAttributes(toStringMap(relationMap.get("attributes")));
            result.add(relation);
        }
        return result;
    }

    private List<EntityDefinition.Relation> extractDefinitionDependsOn(Object dependsOnValue) {
        if (!(dependsOnValue instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.Relation> result = new ArrayList<>();
        for (Object item : items) {
            EntityDefinition.Relation relation = new EntityDefinition.Relation();
            if (item instanceof String text) {
                relation.setTargetRef(asText(text));
            } else {
                Map<String, Object> dependencyMap = toObjectMap(item);
                relation.setTargetRef(defaultText(asText(dependencyMap.get("ref")),
                        asText(dependencyMap.get("entity")), asText(dependencyMap.get("entityRef"))));
                relation.setTargetEntityId(asLong(defaultText(
                        dependencyMap.containsKey("targetEntityId") ? "targetEntityId" : null,
                        dependencyMap.containsKey("id") ? "id" : null
                ), dependencyMap));
            }
            if (relation.getTargetEntityId() == null && !StringUtils.hasText(relation.getTargetRef())) {
                continue;
            }
            relation.setRelationType("depends_on");
            relation.setRelationSource(SOURCE_MANUAL);
            relation.setStatus(RELATION_CONFIRMED);
            relation.setScore(100);
            result.add(relation);
        }
        return result;
    }

    private List<EntityDefinition.Relation> mergeDefinitionRelations(List<EntityDefinition.Relation> primary,
                                                                     List<EntityDefinition.Relation> additional) {
        if (CollectionUtils.isEmpty(primary)) {
            return CollectionUtils.isEmpty(additional) ? Collections.emptyList() : additional;
        }
        if (CollectionUtils.isEmpty(additional)) {
            return primary;
        }
        List<EntityDefinition.Relation> result = new ArrayList<>(primary);
        Set<String> seen = primary.stream().map(this::relationSignature).collect(Collectors.toCollection(LinkedHashSet::new));
        for (EntityDefinition.Relation relation : additional) {
            String signature = relationSignature(relation);
            if (seen.add(signature)) {
                result.add(relation);
            }
        }
        return result;
    }

    private String relationSignature(EntityDefinition.Relation relation) {
        return String.join("|",
                defaultText(relation.getRelationType(), "depends_on"),
                relation.getTargetEntityId() == null ? "" : String.valueOf(relation.getTargetEntityId()),
                relation.getTargetRef() == null ? "" : relation.getTargetRef());
    }

    private List<String> extractRelationReferences(List<EntityDefinition.Relation> relations) {
        if (CollectionUtils.isEmpty(relations)) {
            return Collections.emptyList();
        }
        return relations.stream()
                .map(relation -> defaultText(relation.getTargetRef(),
                        relation.getTargetEntityId() == null ? null : buildEntityReference(relation.getTargetEntityId())))
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    private List<EntityDefinition.OwnerRef> extractDefinitionOwnerRefs(String ownerKey, Map<String, Object> metadataMap, Map<String, Object> specMap) {
        Object ownerValue = ownerKey == null ? null : (metadataMap.containsKey(ownerKey) ? metadataMap.get(ownerKey) : specMap.get(ownerKey));
        if (!(ownerValue instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.OwnerRef> result = new ArrayList<>();
        Set<String> dedupe = new LinkedHashSet<>();
        for (Object item : items) {
            if (item instanceof String value) {
                String name = value.trim();
                if (dedupe.add(name + "|team")) {
                    EntityDefinition.OwnerRef owner = new EntityDefinition.OwnerRef();
                    owner.setName(name);
                    owner.setType("team");
                    result.add(owner);
                }
                continue;
            }
            Map<String, Object> ownerMap = toObjectMap(item);
            String name = defaultText(asText(ownerMap.get("name")), asText(ownerMap.get("team")), asText(ownerMap.get("value")));
            if (name != null) {
                String type = defaultText(asText(ownerMap.get("type")), "team");
                if (dedupe.add(name.trim() + "|" + type.trim())) {
                    EntityDefinition.OwnerRef owner = new EntityDefinition.OwnerRef();
                    owner.setName(name.trim());
                    owner.setType(type.trim());
                    result.add(owner);
                }
            }
        }
        return result;
    }

    private List<EntityOwnerRef> toEntityOwnerRefs(List<EntityDefinition.OwnerRef> owners) {
        if (CollectionUtils.isEmpty(owners)) {
            return Collections.emptyList();
        }
        return owners.stream()
                .filter(owner -> owner != null && StringUtils.hasText(owner.getName()))
                .map(owner -> new EntityOwnerRef(owner.getName().trim(), defaultText(owner.getType(), "team")))
                .toList();
    }

    private List<EntityDefinition.OwnerRef> toDefinitionOwnerRefs(List<EntityOwnerRef> owners) {
        if (CollectionUtils.isEmpty(owners)) {
            return Collections.emptyList();
        }
        return owners.stream()
                .filter(owner -> owner != null && StringUtils.hasText(owner.getName()))
                .map(owner -> {
                    EntityDefinition.OwnerRef item = new EntityDefinition.OwnerRef();
                    item.setName(owner.getName().trim());
                    item.setType(defaultText(owner.getType(), "team"));
                    return item;
                })
                .toList();
    }

    private List<String> extractDefinitionStringList(String key, Map<String, Object> source) {
        if (!StringUtils.hasText(key) || source == null || source.isEmpty()) {
            return Collections.emptyList();
        }
        Object rawValue = source.get(key);
        if (rawValue instanceof List<?> items) {
            return items.stream()
                    .map(this::asText)
                    .filter(StringUtils::hasText)
                    .map(String::trim)
                    .distinct()
                    .toList();
        }
        String value = asText(rawValue);
        if (StringUtils.hasText(value)) {
            return List.of(value.trim());
        }
        return Collections.emptyList();
    }

    private <T> List<T> defaultList(List<T> primary, List<T> fallback) {
        if (!CollectionUtils.isEmpty(primary)) {
            return primary;
        }
        return fallback;
    }

    private Map<String, Object> toObjectMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Collections.emptyMap();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            if (entry.getKey() != null) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return result;
    }

    private Map<String, String> toStringMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Collections.emptyMap();
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            String key = entry.getKey() == null ? null : String.valueOf(entry.getKey());
            String itemValue = entry.getValue() == null ? null : String.valueOf(entry.getValue());
            if (StringUtils.hasText(key) && itemValue != null) {
                result.put(key, itemValue);
            }
        }
        return result;
    }

    private Map<String, List<String>> toStringListMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Collections.emptyMap();
        }
        Map<String, List<String>> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            String key = entry.getKey() == null ? null : String.valueOf(entry.getKey());
            if (!StringUtils.hasText(key) || entry.getValue() == null) {
                continue;
            }
            List<String> values = new ArrayList<>();
            if (entry.getValue() instanceof List<?> items) {
                for (Object item : items) {
                    String text = asText(item);
                    if (text != null) {
                        values.add(text);
                    }
                }
            } else {
                String text = asText(entry.getValue());
                if (text != null) {
                    values.add(text);
                }
            }
            if (!values.isEmpty()) {
                result.put(key, values);
            }
        }
        return result;
    }

    private String asText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return StringUtils.hasText(text) ? text.trim() : null;
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean asBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }
        return Boolean.parseBoolean(String.valueOf(value).trim());
    }

    private Long asLong(String key, Map<String, Object> source) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        return asLong(source.get(key));
    }

    private Long asLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String normalizeEntityTypeFromKind(String kind) {
        if (!StringUtils.hasText(kind)) {
            return null;
        }
        if (LEGACY_ENTITY_DEFINITION_KIND.equalsIgnoreCase(kind.trim())) {
            return null;
        }
        return switch (kind.trim().toLowerCase()) {
            case KIND_DATASTORE -> TYPE_DATABASE;
            case KIND_API -> TYPE_API;
            default -> kind.trim().toLowerCase();
        };
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

    private String resolveDefinitionEntityType(Map<String, Object> root, Map<String, Object> specMap) {
        String normalizedKind = normalizeSupportedEntityType(asText(root.get("kind")));
        if (StringUtils.hasText(normalizedKind)) {
            return normalizedKind;
        }
        String normalizedEntityType = normalizeSupportedEntityType(defaultText(
                asText(specMap.get("entityType")),
                asText(specMap.get("entity_type")),
                asText(root.get("entityType")),
                asText(root.get("entity_type"))
        ));
        if (StringUtils.hasText(normalizedEntityType)) {
            return normalizedEntityType;
        }
        return defaultText(
                normalizeSupportedEntityType(asText(specMap.get("type"))),
                normalizeSupportedEntityType(asText(root.get("type"))),
                asText(root.get("dd-service")) != null || asText(root.get("dd_service")) != null ? "service" : null,
                "service"
        );
    }

    private String resolveDefinitionSubtype(Map<String, Object> root, Map<String, Object> specMap, String entityType) {
        String explicitSubtype = defaultText(
                asText(specMap.get("subtype")),
                asText(specMap.get("serviceType")),
                asText(specMap.get("resourceType")),
                asText(root.get("subtype")),
                asText(root.get("serviceType")),
                asText(root.get("resourceType"))
        );
        if (StringUtils.hasText(explicitSubtype)) {
            return explicitSubtype.trim();
        }
        String rawType = defaultText(asText(specMap.get("type")), asText(root.get("type")));
        if (!StringUtils.hasText(rawType)) {
            return null;
        }
        String normalizedSupportedType = normalizeSupportedEntityType(rawType);
        if (StringUtils.hasText(normalizedSupportedType)
                && Objects.equals(normalizedSupportedType, entityType)) {
            return null;
        }
        return rawType.trim();
    }

    private String normalizeSupportedEntityType(String value) {
        String normalized = normalizeEntityTypeFromKind(value);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        return SUPPORTED_TYPES.contains(normalized) ? normalized : null;
    }

    private EntityDefinition.Relation resolveRelationTarget(EntityDefinition.Relation relation) {
        if (relation == null) {
            return null;
        }
        if (relation.getTargetEntityId() != null) {
            return relation;
        }
        Long resolvedTargetId = resolveEntityReference(relation.getTargetRef());
        if (resolvedTargetId == null) {
            return null;
        }
        relation.setTargetEntityId(resolvedTargetId);
        return relation;
    }

    private Long resolveEntityReference(String targetRef) {
        if (!StringUtils.hasText(targetRef)) {
            return null;
        }
        Long directId = asLong(targetRef);
        if (directId != null) {
            return directId;
        }
        String normalized = targetRef.trim();
        int typeSeparator = normalized.indexOf(':');
        if (typeSeparator < 0 || typeSeparator == normalized.length() - 1) {
            return null;
        }
        String type = normalizeEntityTypeFromKind(normalized.substring(0, typeSeparator));
        String remainder = normalized.substring(typeSeparator + 1).trim();
        if (!StringUtils.hasText(type) || !StringUtils.hasText(remainder)) {
            return null;
        }
        int namespaceSeparator = remainder.indexOf('/');
        if (namespaceSeparator > 0 && namespaceSeparator < remainder.length() - 1) {
            String namespace = remainder.substring(0, namespaceSeparator).trim();
            String name = remainder.substring(namespaceSeparator + 1).trim();
            return observeEntityDao.findFirstByTypeAndNamespaceAndName(type, namespace, name)
                    .map(ObserveEntity::getId)
                    .orElseGet(() -> observeEntityDao.findFirstByTypeAndName(type, name).map(ObserveEntity::getId).orElse(null));
        }
        return observeEntityDao.findFirstByTypeAndName(type, remainder).map(ObserveEntity::getId).orElse(null);
    }

    private void addSuggestion(LinkedHashSet<String> values, String value, int limit) {
        String normalizedValue = trimToNull(value);
        if (!StringUtils.hasText(normalizedValue) || values.size() >= limit) {
            return;
        }
        values.add(normalizedValue);
    }

    private String buildEntityReference(ObserveEntity entity) {
        if (entity == null || !StringUtils.hasText(entity.getType()) || !StringUtils.hasText(entity.getName())) {
            return null;
        }
        String namespace = defaultText(entity.getNamespace(), "default");
        return toDefinitionKind(entity.getType()) + ":" + namespace + "/" + entity.getName();
    }

    private String buildEntityReference(Long entityId) {
        if (entityId == null) {
            return null;
        }
        return observeEntityDao.findById(entityId)
                .map(this::buildEntityReference)
                .orElse(null);
    }

    private EntitySummaryInfo buildEntitySummary(ObserveEntity entity, EntityDefinitionActivity latestDefinitionActivity) {
        EntityStatusInfo statusInfo = refreshEntityStatus(entity);
        List<EntityMonitorBind> monitorBinds = entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(entity.getId());
        long identityCount = entityIdentityDao.countByEntityId(entity.getId());
        long relationCount = entityRelationDao.countBySourceEntityIdOrTargetEntityId(entity.getId(), entity.getId());
        EntityEvidenceSummaryInfo evidenceSummary = entityObservabilityGateway.buildEntityEvidenceSummary(
                entity,
                statusInfo,
                identityCount,
                0,
                findEntityMonitors(entity.getId()),
                Collections.emptyList()
        );
        EntityOpsSummaryInfo opsSummary = entityObservabilityGateway.buildEntityOpsSummary(entity, relationCount, evidenceSummary);
        EntityNextActionInfo nextAction = entityObservabilityGateway.buildEntityNextActions(entity, evidenceSummary, null, opsSummary).stream()
                .findFirst()
                .orElse(null);
        return new EntitySummaryInfo(
                EntityInfo.fromEntity(entity),
                identityCount,
                monitorBinds.size(),
                relationCount,
                statusInfo.getActiveAlertCount(),
                statusInfo,
                opsSummary,
                nextAction,
                evidenceSummary.getLastEvidenceAt(),
                latestDefinitionActivity != null,
                latestDefinitionActivity == null ? null : latestDefinitionActivity.getStatus(),
                latestDefinitionActivity == null ? null : latestDefinitionActivity.getSummary(),
                latestDefinitionActivity == null ? null : latestDefinitionActivity.getFormat(),
                latestDefinitionActivity == null ? null : latestDefinitionActivity.getGmtCreate()
        );
    }

    private Map<Long, EntityDefinitionActivity> loadLatestDefinitionActivities(List<ObserveEntity> entities) {
        if (CollectionUtils.isEmpty(entities)) {
            return Collections.emptyMap();
        }
        List<Long> entityIds = entities.stream()
                .map(ObserveEntity::getId)
                .filter(Objects::nonNull)
                .toList();
        if (CollectionUtils.isEmpty(entityIds)) {
            return Collections.emptyMap();
        }
        List<EntityDefinitionActivity> activities = entityDefinitionActivityDao.findAllByEntityIdIn(
                entityIds, Sort.by(Sort.Order.desc("gmtCreate"), Sort.Order.desc("id"))
        );
        Map<Long, EntityDefinitionActivity> latestActivityMap = new LinkedHashMap<>();
        for (EntityDefinitionActivity activity : activities) {
            if (activity.getEntityId() != null
                    && isDefinitionActivityType(activity.getActivityType())
                    && !latestActivityMap.containsKey(activity.getEntityId())) {
                latestActivityMap.put(activity.getEntityId(), activity);
            }
        }
        return latestActivityMap;
    }

    private boolean isDefinitionActivityType(String activityType) {
        return ACTIVITY_TYPE_DEFINITION_IMPORT.equals(activityType) || ACTIVITY_TYPE_DEFINITION_UPDATE.equals(activityType);
    }

    private String resolveCreateLifecycleActivityType(EntityDto entityDto) {
        ObserveEntity entity = entityDto == null ? null : entityDto.getEntity();
        if (isTelemetryLifecycleSource(entity == null ? null : entity.getSource())
                || hasTelemetryDiscoveryBind(Collections.emptyList(), entityDto == null ? null : entityDto.getMonitorBinds())) {
            return ACTIVITY_TYPE_DISCOVERY_GOVERNANCE;
        }
        return ACTIVITY_TYPE_CATALOG_CREATE;
    }

    private String resolveModifyLifecycleActivityType(ObserveEntity currentEntity, ObserveEntity updateEntity,
                                                      List<EntityMonitorBind> existingBinds, List<EntityMonitorBind> nextBinds) {
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

    private boolean hasTelemetryDiscoveryBind(List<EntityMonitorBind> existingBinds, List<EntityMonitorBind> nextBinds) {
        if (CollectionUtils.isEmpty(nextBinds)) {
            return false;
        }
        Set<Long> existingTelemetryDiscoveryMonitors = CollectionUtils.isEmpty(existingBinds)
                ? Collections.emptySet()
                : existingBinds.stream()
                        .filter(bind -> "telemetry_discovery".equals(bind.getBindSource()))
                        .map(EntityMonitorBind::getMonitorId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
        return nextBinds.stream()
                .filter(bind -> "telemetry_discovery".equals(bind.getBindSource()))
                .map(EntityMonitorBind::getMonitorId)
                .filter(Objects::nonNull)
                .anyMatch(monitorId -> !existingTelemetryDiscoveryMonitors.contains(monitorId));
    }

    private boolean isTelemetryLifecycleSource(String source) {
        return SOURCE_OTEL_RESOURCE.equals(source) || SOURCE_DERIVED.equals(source);
    }

    private void applyEntityCore(ObserveEntity target, ObserveEntity source, String fallbackSource) {
        target.setType(source.getType());
        target.setName(source.getName());
        target.setDisplayName(source.getDisplayName());
        target.setSubtype(source.getSubtype());
        target.setNamespace(source.getNamespace());
        target.setEnvironment(source.getEnvironment());
        target.setStatus(defaultText(source.getStatus(), STATUS_UNKNOWN));
        target.setCriticality(source.getCriticality());
        target.setOwner(source.getOwner());
        target.setAdditionalOwners(source.getAdditionalOwners());
        target.setRunbook(source.getRunbook());
        target.setLifecycle(source.getLifecycle());
        target.setTier(source.getTier());
        target.setSystem(source.getSystem());
        target.setComponentOf(source.getComponentOf());
        target.setComponents(source.getComponents());
        target.setImplementedBy(source.getImplementedBy());
        target.setApiInterface(source.getApiInterface());
        target.setInheritFrom(source.getInheritFrom());
        target.setLanguages(source.getLanguages());
        target.setLinks(source.getLinks());
        target.setContacts(source.getContacts());
        target.setIntegrations(source.getIntegrations());
        target.setExtensions(source.getExtensions());
        target.setHertzbeat(source.getHertzbeat());
        target.setSource(defaultText(source.getSource(), fallbackSource, SOURCE_MANUAL));
        target.setDescription(source.getDescription());
        target.setLabels(source.getLabels());
        target.setTags(normalizeTags(source.getTags(), source.getLabels()));
    }

    private void replaceIdentities(ObserveEntity entity, List<EntityIdentity> identities) {
        entityIdentityDao.deleteAllByEntityId(entity.getId());
        entityIdentityDao.flush();
        List<EntityIdentity> rows = new ArrayList<>();
        Set<String> dedupeKeys = new LinkedHashSet<>();
        if (!CollectionUtils.isEmpty(identities)) {
            for (EntityIdentity identity : identities) {
                if (!StringUtils.hasText(identity.getIdentityKey()) || !StringUtils.hasText(identity.getIdentityValue())) {
                    continue;
                }
                String identityKey = identity.getIdentityKey().trim();
                String identityType = defaultText(identity.getIdentityType(), SOURCE_MANUAL);
                String identityValue = canonicalizeIdentityValue(entity, identityKey, identity.getIdentityValue().trim(), identityType);
                if (!StringUtils.hasText(identityValue)) {
                    continue;
                }
                String normalizedValue = normalizeIdentityValue(identityKey, identityValue);
                String dedupeKey = identityKey + "\u0000" + normalizedValue;
                if (!dedupeKeys.add(dedupeKey)) {
                    continue;
                }
                rows.add(EntityIdentity.builder()
                        .entityId(entity.getId())
                        .identityType(identityType)
                        .identityKey(identityKey)
                        .identityValue(identityValue)
                        .normalizedValue(normalizedValue)
                        .priority(identity.getPriority() == null ? defaultIdentityPriority(identityKey) : identity.getPriority())
                        .primaryIdentity(identity.isPrimaryIdentity())
                        .build());
            }
        }
        if (rows.isEmpty()) {
            rows.addAll(buildDefaultIdentities(entity));
        }
        entityIdentityDao.saveAll(rows);
    }

    private void replaceMonitorBinds(Long entityId, List<EntityMonitorBind> monitorBinds) {
        entityMonitorBindDao.deleteAllByEntityId(entityId);
        entityMonitorBindDao.flush();
        if (CollectionUtils.isEmpty(monitorBinds)) {
            return;
        }
        List<EntityMonitorBind> rows = new ArrayList<>();
        for (EntityMonitorBind bind : monitorBinds) {
            if (bind.getMonitorId() == null || !monitorDao.existsById(bind.getMonitorId())) {
                continue;
            }
            rows.add(EntityMonitorBind.builder()
                    .entityId(entityId)
                    .monitorId(bind.getMonitorId())
                    .bindType(defaultText(bind.getBindType(), SOURCE_MANUAL))
                    .bindSource(defaultText(bind.getBindSource(), SOURCE_MANUAL))
                    .status(defaultText(bind.getStatus(), BIND_ACTIVE))
                    .score(bind.getScore() == null ? 100 : bind.getScore())
                    .matchContext(bind.getMatchContext())
                    .build());
        }
        if (!rows.isEmpty()) {
            entityMonitorBindDao.saveAll(rows);
        }
    }

    private void replaceRelations(Long entityId, List<EntityRelation> relations) {
        entityRelationDao.deleteAllBySourceEntityId(entityId);
        entityRelationDao.flush();
        if (CollectionUtils.isEmpty(relations)) {
            return;
        }
        List<EntityRelation> rows = new ArrayList<>();
        Set<String> dedupeKeys = new LinkedHashSet<>();
        for (EntityRelation relation : relations) {
            Long sourceEntityId = relation.getSourceEntityId() == null ? entityId : relation.getSourceEntityId();
            String targetRef = trimToNull(relation.getTargetRef());
            Long targetEntityId = relation.getTargetEntityId();
            if (targetEntityId == null && StringUtils.hasText(targetRef)) {
                targetEntityId = resolveEntityReference(targetRef);
            }
            if (!Objects.equals(sourceEntityId, entityId)) {
                continue;
            }
            if (targetEntityId == null && !StringUtils.hasText(targetRef)) {
                continue;
            }
            if (targetEntityId != null && Objects.equals(sourceEntityId, targetEntityId)) {
                continue;
            }
            String normalizedTargetRef = defaultText(targetRef, buildEntityReference(targetEntityId));
            String dedupeKey = String.join("|",
                    String.valueOf(sourceEntityId),
                    defaultText(relation.getRelationType(), "depends_on"),
                    targetEntityId == null ? "" : String.valueOf(targetEntityId),
                    defaultText(normalizedTargetRef, ""));
            if (!dedupeKeys.add(dedupeKey)) {
                continue;
            }
            rows.add(EntityRelation.builder()
                    .sourceEntityId(sourceEntityId)
                    .targetEntityId(targetEntityId)
                    .targetRef(normalizedTargetRef)
                    .relationType(defaultText(relation.getRelationType(), "depends_on"))
                    .relationSource(defaultText(relation.getRelationSource(), SOURCE_MANUAL))
                    .status(defaultText(relation.getStatus(), RELATION_CONFIRMED))
                    .score(relation.getScore() == null ? 100 : relation.getScore())
                    .description(relation.getDescription())
                    .attributes(relation.getAttributes())
                    .build());
        }
        if (!rows.isEmpty()) {
            entityRelationDao.saveAll(rows);
        }
    }

    private Long defaultTargetEntityId(EntityDefinition.Relation relation) {
        if (relation == null) {
            return null;
        }
        if (relation.getTargetEntityId() != null) {
            return relation.getTargetEntityId();
        }
        return resolveEntityReference(relation.getTargetRef());
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private EntityStatusInfo refreshEntityStatus(ObserveEntity entity) {
        List<Monitor> monitors = findEntityMonitors(entity.getId());
        return refreshEntityStatus(entity, monitors, queryActiveAlerts(monitors, 20));
    }

    private EntityStatusInfo refreshEntityStatus(ObserveEntity entity, List<Monitor> monitors, List<SingleAlert> activeAlerts) {
        int monitorTotal = monitors.size();
        int monitorUpCount = (int) monitors.stream().filter(monitor -> monitor.getStatus() == CommonConstants.MONITOR_UP_CODE).count();
        int monitorDownCount = (int) monitors.stream().filter(monitor -> monitor.getStatus() == CommonConstants.MONITOR_DOWN_CODE).count();
        int monitorPausedCount = (int) monitors.stream().filter(monitor -> monitor.getStatus() == CommonConstants.MONITOR_PAUSED_CODE).count();
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
        if (!Objects.equals(entity.getStatus(), status)) {
            entity.setStatus(status);
            observeEntityDao.save(entity);
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

    private EntityDetailDto.EntityNoiseControlSummaryInfo buildNoiseControlSummary(EntityDto entityDto, List<Monitor> monitors,
                                                                                   List<SingleAlert> activeAlerts) {
        List<Map<String, String>> candidateLabels = buildNoiseControlCandidateLabels(entityDto, monitors, activeAlerts);
        List<EntityDetailDto.EntityNoiseControlRuleInfo> matchedSilences = alertSilenceDao.findAll().stream()
                .filter(rule -> Boolean.TRUE.equals(rule.isEnable()))
                .map(rule -> matchSilenceRule(rule, candidateLabels))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(EntityDetailDto.EntityNoiseControlRuleInfo::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        List<EntityDetailDto.EntityNoiseControlRuleInfo> matchedInhibits = alertInhibitDao.findAll().stream()
                .filter(rule -> Boolean.TRUE.equals(rule.getEnable()))
                .map(rule -> matchInhibitRule(rule, candidateLabels))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(EntityDetailDto.EntityNoiseControlRuleInfo::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        boolean possibleAlertSuppression = CollectionUtils.isEmpty(activeAlerts)
                && (!matchedSilences.isEmpty() || !matchedInhibits.isEmpty());
        return new EntityDetailDto.EntityNoiseControlSummaryInfo(
                matchedSilences.size(),
                matchedInhibits.size(),
                matchedSilences.stream().limit(NOISE_CONTROL_PREVIEW_LIMIT).toList(),
                matchedInhibits.stream().limit(NOISE_CONTROL_PREVIEW_LIMIT).toList(),
                possibleAlertSuppression
        );
    }

    private List<Map<String, String>> buildNoiseControlCandidateLabels(EntityDto entityDto, List<Monitor> monitors,
                                                                       List<SingleAlert> activeAlerts) {
        List<Map<String, String>> candidates = new ArrayList<>();
        if (!CollectionUtils.isEmpty(activeAlerts)) {
            activeAlerts.stream()
                    .map(SingleAlert::getLabels)
                    .map(this::normalizeNoiseControlLabels)
                    .filter(labels -> !labels.isEmpty())
                    .forEach(candidates::add);
        }
        if (!candidates.isEmpty()) {
            return candidates;
        }
        Map<String, String> entityLabels = new LinkedHashMap<>();
        if (entityDto != null && entityDto.getEntity() != null) {
            String entityName = trimToNull(entityDto.getEntity().getName());
            if (entityName != null) {
                entityLabels.put("service.name", entityName);
            }
            String environment = trimToNull(entityDto.getEntity().getEnvironment());
            if (environment != null) {
                entityLabels.put("env", environment);
            }
        }
        if (!CollectionUtils.isEmpty(entityDto == null ? null : entityDto.getIdentities())) {
            entityDto.getIdentities().forEach(identity -> {
                String key = trimToNull(identity.getIdentityKey());
                String value = trimToNull(identity.getIdentityValue());
                if (key != null && value != null) {
                    entityLabels.put(key, value);
                }
            });
        }
        Map<String, String> normalizedEntityLabels = normalizeNoiseControlLabels(entityLabels);
        if (!normalizedEntityLabels.isEmpty()) {
            candidates.add(normalizedEntityLabels);
        }
        if (!CollectionUtils.isEmpty(monitors)) {
            monitors.stream()
                    .map(this::buildMonitorNoiseControlLabels)
                    .filter(labels -> !labels.isEmpty())
                    .forEach(candidates::add);
        }
        return candidates;
    }

    private Map<String, String> buildMonitorNoiseControlLabels(Monitor monitor) {
        Map<String, String> labels = new LinkedHashMap<>();
        if (monitor == null) {
            return labels;
        }
        if (!CollectionUtils.isEmpty(monitor.getLabels())) {
            labels.putAll(monitor.getLabels());
        }
        String instance = trimToNull(monitor.getInstance());
        if (instance != null) {
            labels.put(CommonConstants.LABEL_INSTANCE, instance);
            labels.put("service.name", instance);
        }
        String name = trimToNull(monitor.getName());
        if (name != null) {
            labels.put(CommonConstants.LABEL_INSTANCE_NAME, name);
        }
        String app = trimToNull(monitor.getApp());
        if (app != null) {
            labels.put("job", app);
        }
        return normalizeNoiseControlLabels(labels);
    }

    private Map<String, String> normalizeNoiseControlLabels(Map<String, String> labels) {
        if (CollectionUtils.isEmpty(labels)) {
            return Collections.emptyMap();
        }
        return labels.entrySet().stream()
                .map(entry -> Map.entry(trimToNull(entry.getKey()), trimToNull(entry.getValue())))
                .filter(entry -> entry.getKey() != null && entry.getValue() != null)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private EntityDetailDto.EntityNoiseControlRuleInfo matchSilenceRule(AlertSilence silence,
                                                                        List<Map<String, String>> candidateLabels) {
        if (silence == null) {
            return null;
        }
        if (Boolean.TRUE.equals(silence.isMatchAll())) {
            return new EntityDetailDto.EntityNoiseControlRuleInfo(
                    silence.getId(),
                    silence.getName(),
                    "silence",
                    true,
                    Collections.emptyList(),
                    toEpochMillis(silence.getGmtUpdate() == null ? silence.getGmtCreate() : silence.getGmtUpdate())
            );
        }
        Map<String, String> labels = normalizeNoiseControlLabels(silence.getLabels());
        if (labels.isEmpty()) {
            return null;
        }
        return candidateLabels.stream()
                .filter(candidate -> labels.entrySet().stream().allMatch(entry -> Objects.equals(candidate.get(entry.getKey()), entry.getValue())))
                .findFirst()
                .map(candidate -> new EntityDetailDto.EntityNoiseControlRuleInfo(
                        silence.getId(),
                        silence.getName(),
                        "silence",
                        false,
                        new ArrayList<>(labels.keySet()),
                        toEpochMillis(silence.getGmtUpdate() == null ? silence.getGmtCreate() : silence.getGmtUpdate())
                ))
                .orElse(null);
    }

    private EntityDetailDto.EntityNoiseControlRuleInfo matchInhibitRule(AlertInhibit inhibit,
                                                                        List<Map<String, String>> candidateLabels) {
        if (inhibit == null) {
            return null;
        }
        Map<String, String> labels = normalizeNoiseControlLabels(inhibit.getTargetLabels());
        if (labels.isEmpty()) {
            return null;
        }
        return candidateLabels.stream()
                .filter(candidate -> labels.entrySet().stream().allMatch(entry -> Objects.equals(candidate.get(entry.getKey()), entry.getValue())))
                .findFirst()
                .map(candidate -> new EntityDetailDto.EntityNoiseControlRuleInfo(
                        inhibit.getId(),
                        inhibit.getName(),
                        "inhibit",
                        false,
                        new ArrayList<>(labels.keySet()),
                        toEpochMillis(inhibit.getGmtUpdate() == null ? inhibit.getGmtCreate() : inhibit.getGmtUpdate())
                ))
                .orElse(null);
    }

    private EntityResponseHandoffsInfo buildResponseHandoffs(long entityId,
                                                             ObservedEntityContext entityContext,
                                                             List<SingleAlert> activeAlerts,
                                                             List<Monitor> monitors, EntityLogSummaryInfo logSummary,
                                                             EntityTraceSummaryDto traceSummary,
                                                             List<MetricEvidence> metricEvidence,
                                                             List<LogEvidence> logEvidence,
                                                             List<TraceEvidence> traceEvidence,
                                                             List<EntityTraceQueryHintDto> traceQueryHints,
                                                             EntityOpsSummaryInfo opsSummary) {
        return entityObservabilityGateway.buildEntityResponseHandoffs(new EntityResponseHandoffsRequest(
                "/entities/" + entityId,
                entityObservabilityGateway.buildEntityReturnLabel(entityContext),
                entityContext == null || entityContext.getEntity() == null ? null : entityContext.getEntity().getOwner(),
                entityContext == null || entityContext.getEntity() == null ? null : entityContext.getEntity().getSystem(),
                entityContext == null || entityContext.getEntity() == null ? null : entityContext.getEntity().getEnvironment(),
                entityContext == null || entityContext.getEntity() == null ? null : entityContext.getEntity().getSource(),
                entityContext,
                activeAlerts,
                monitors,
                logSummary,
                traceSummary,
                metricEvidence,
                logEvidence,
                traceEvidence,
                traceQueryHints,
                opsSummary != null && opsSummary.isOwnerReady(),
                opsSummary != null && opsSummary.isRunbookReady(),
                opsSummary != null && opsSummary.isRelationReady(),
                opsSummary != null && opsSummary.isTelemetryReady()
        ));
    }

    private String pickPrimaryAlertSeverity(List<SingleAlert> activeAlerts) {
        if (CollectionUtils.isEmpty(activeAlerts)) {
            return null;
        }
        return activeAlerts.stream()
                .map(this::resolveAlertSeverity)
                .filter(StringUtils::hasText)
                .sorted(Comparator.comparingInt(this::severityPriority).reversed())
                .findFirst()
                .orElse(null);
    }

    private int severityPriority(String severity) {
        String normalized = trimToNull(severity);
        if (normalized == null) {
            return 0;
        }
        return switch (normalized.toLowerCase()) {
            case "critical", "fatal", "emergency", "severe" -> 5;
            case "error", "high" -> 4;
            case "warning", "warn", "medium" -> 3;
            case "info", "low" -> 2;
            case "debug", "trace" -> 1;
            default -> 0;
        };
    }

    private int monitorStatusPriority(Byte status) {
        if (Objects.equals(status, CommonConstants.MONITOR_DOWN_CODE)) {
            return 3;
        }
        if (Objects.equals(status, CommonConstants.MONITOR_UP_CODE)) {
            return 2;
        }
        if (Objects.equals(status, CommonConstants.MONITOR_PAUSED_CODE)) {
            return 1;
        }
        return 0;
    }

    private PageRequest normalizePageRequest(int pageIndex, int pageSize) {
        return normalizePageRequest(pageIndex, pageSize, Sort.unsorted());
    }

    private PageRequest normalizePageRequest(int pageIndex, int pageSize, Sort sort) {
        int safePageIndex = Math.max(pageIndex, 0);
        int safePageSize = pageSize <= 0 ? 10 : Math.min(pageSize, 100);
        return PageRequest.of(safePageIndex, safePageSize, sort);
    }

    private String normalizeAlertSeverityFilter(String severity) {
        String normalized = trimToNull(severity);
        if (normalized == null || "all".equalsIgnoreCase(normalized)) {
            return null;
        }
        return switch (normalized.toLowerCase()) {
            case "warn" -> "warning";
            case "err" -> "error";
            default -> normalized.toLowerCase();
        };
    }

    private <T> Page<T> slicePage(List<T> items, PageRequest pageRequest) {
        if (CollectionUtils.isEmpty(items)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        int start = Math.min((int) pageRequest.getOffset(), items.size());
        int end = Math.min(start + pageRequest.getPageSize(), items.size());
        return new PageImpl<>(items.subList(start, end), pageRequest, items.size());
    }

    private List<Monitor> findEntityMonitors(Long entityId) {
        List<EntityMonitorBind> binds = entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(entityId);
        if (binds.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> monitorIds = binds.stream().map(EntityMonitorBind::getMonitorId).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, Monitor> monitorMap = monitorDao.findMonitorsByIdIn(monitorIds).stream()
                .collect(Collectors.toMap(Monitor::getId, item -> item));
        List<Monitor> monitors = new ArrayList<>();
        for (Long monitorId : monitorIds) {
            Monitor monitor = monitorMap.get(monitorId);
            if (monitor != null) {
                monitors.add(monitor);
            }
        }
        return monitors;
    }

    private int countActiveAlerts(List<Monitor> monitors) {
        if (CollectionUtils.isEmpty(monitors)) {
            return 0;
        }
        Page<SingleAlert> page = singleAlertDao.findAll(
                buildAlertSpecification(monitors, CommonConstants.ALERT_STATUS_FIRING),
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "gmtUpdate"))
        );
        return Math.toIntExact(page.getTotalElements());
    }

    private List<SingleAlert> queryActiveAlerts(List<Monitor> monitors, int limit) {
        if (CollectionUtils.isEmpty(monitors)) {
            return Collections.emptyList();
        }
        PageRequest pageRequest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "gmtUpdate"));
        return singleAlertDao.findAll(buildAlertSpecification(monitors, CommonConstants.ALERT_STATUS_FIRING), pageRequest).getContent();
    }

    private Specification<SingleAlert> buildAlertSpecification(List<Monitor> monitors, String status) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (StringUtils.hasText(status)) {
                andList.add(criteriaBuilder.equal(root.get("status"), status));
            }
            List<Predicate> orList = new ArrayList<>();
            for (Monitor monitor : monitors) {
                addJsonLikePredicate(orList, criteriaBuilder, root.get("labels"), CommonConstants.LABEL_INSTANCE, monitor.getInstance());
                addJsonLikePredicate(orList, criteriaBuilder, root.get("labels"), CommonConstants.LABEL_INSTANCE_NAME, monitor.getName());
                addTextLikePredicate(orList, criteriaBuilder, root.get("content"), monitor.getName());
                addTextLikePredicate(orList, criteriaBuilder, root.get("content"), monitor.getInstance());
            }
            if (orList.isEmpty()) {
                return criteriaBuilder.and(andList.toArray(new Predicate[0]));
            }
            return criteriaBuilder.and(criteriaBuilder.and(andList.toArray(new Predicate[0])),
                    criteriaBuilder.or(orList.toArray(new Predicate[0])));
        };
    }

    private String normalizeAlertStatusFilter(String status) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            return CommonConstants.ALERT_STATUS_FIRING;
        }
        String lowered = normalized.toLowerCase(Locale.ROOT);
        if (ALERT_STATUS_ACKNOWLEDGED.equals(lowered)) {
            return ALERT_STATUS_ACKNOWLEDGED;
        }
        if (CommonConstants.ALERT_STATUS_RESOLVED.equals(lowered)) {
            return CommonConstants.ALERT_STATUS_RESOLVED;
        }
        return CommonConstants.ALERT_STATUS_FIRING;
    }

    private void addJsonLikePredicate(List<Predicate> predicates, jakarta.persistence.criteria.CriteriaBuilder criteriaBuilder,
                                      Expression<String> expression, String key, String value) {
        if (!StringUtils.hasText(value)) {
            return;
        }
        String pattern = String.format("%%\"%s\":\"%s\"%%", key, value);
        predicates.add(criteriaBuilder.like(criteriaBuilder.lower(expression), pattern.toLowerCase()));
    }

    private void addTextLikePredicate(List<Predicate> predicates, jakarta.persistence.criteria.CriteriaBuilder criteriaBuilder,
                                      Expression<String> expression, String value) {
        if (!StringUtils.hasText(value)) {
            return;
        }
        predicates.add(criteriaBuilder.like(criteriaBuilder.lower(expression), "%" + value.toLowerCase() + "%"));
    }

    private String resolveAlertSeverity(SingleAlert alert) {
        if (alert == null) {
            return "unknown";
        }
        String severity = defaultText(
                trimToNull(alert.getLabels() == null ? null : alert.getLabels().get("severity")),
                defaultText(
                        trimToNull(alert.getLabels() == null ? null : alert.getLabels().get("priority")),
                        trimToNull(alert.getAnnotations() == null ? null : alert.getAnnotations().get("severity"))
                )
        );
        return severity == null ? "unknown" : severity.toLowerCase();
    }

    private Long toEpochMillis(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    private Map<String, String> extractMonitorIdentityCandidates(Monitor monitor) {
        Map<String, String> identities = new LinkedHashMap<>();
        putSupportedCandidates(identities, monitor.getLabels());
        putSupportedCandidates(identities, monitor.getAnnotations());
        String app = monitor.getApp() == null ? null : monitor.getApp().toLowerCase();
        if (StringUtils.hasText(app) && HOST_LIKE_APPS.contains(app)) {
            putIdentityCandidate(identities, "host.name", monitor.getName());
            putIdentityCandidate(identities, "host.id", monitor.getInstance());
        }
        if (StringUtils.hasText(app) && QUEUE_LIKE_APPS.contains(app)) {
            putIdentityCandidate(identities, "messaging.destination.name", defaultText(monitor.getName(), monitor.getInstance()));
        }
        if (StringUtils.hasText(app) && (SERVICE_LIKE_APPS.contains(app) || DATABASE_LIKE_APPS.contains(app)
                || (MIDDLEWARE_LIKE_APPS.contains(app) && !QUEUE_LIKE_APPS.contains(app)))) {
            putIdentityCandidate(identities, "service.name", monitor.getName());
        }
        if (StringUtils.hasText(app) && ENDPOINT_LIKE_APPS.contains(app)) {
            putIdentityCandidate(identities, "endpoint.url", monitor.getInstance());
        }
        if (containsK8sSignal(monitor.getLabels()) || containsK8sSignal(monitor.getAnnotations())) {
            putIdentityCandidate(identities, "k8s.workload.name", monitor.getName());
        }
        putIdentityCandidate(identities, "monitor.instance", monitor.getInstance());
        putIdentityCandidate(identities, "monitor.name", monitor.getName());
        putIdentityCandidate(identities, "monitor.app", monitor.getApp());
        return identities;
    }

    private void putSupportedCandidates(Map<String, String> target, Map<String, String> source) {
        if (source == null || source.isEmpty()) {
            return;
        }
        for (Map.Entry<String, String> entry : source.entrySet()) {
            if (!StringUtils.hasText(entry.getKey()) || !StringUtils.hasText(entry.getValue())) {
                continue;
            }
            if (isOtelResourceIdentity(entry.getKey()) || SYNTHETIC_IDENTITY_KEYS.contains(entry.getKey())) {
                putIdentityCandidate(target, entry.getKey(), entry.getValue());
            }
        }
    }

    private void putIdentityCandidate(Map<String, String> target, String key, String value) {
        if (!StringUtils.hasText(key) || !StringUtils.hasText(value) || target.containsKey(key)) {
            return;
        }
        target.put(key, normalizeIdentityValue(key, value));
    }

    private List<EntityIdentity> buildDefaultIdentities(ObserveEntity entity) {
        List<EntityIdentity> identities = new ArrayList<>();
        String name = StringUtils.hasText(entity.getName()) ? entity.getName() : entity.getDisplayName();
        String primaryKey = switch (entity.getType()) {
            case "host", "device" -> "host.name";
            case "endpoint" -> "endpoint.url";
            case TYPE_QUEUE -> "messaging.destination.name";
            case TYPE_API -> "service.name";
            case "k8s_workload" -> "k8s.workload.name";
            default -> "service.name";
        };
        if (StringUtils.hasText(name)) {
            identities.add(EntityIdentity.builder()
                    .entityId(entity.getId())
                    .identityType(SOURCE_DERIVED)
                    .identityKey(primaryKey)
                    .identityValue(name)
                    .normalizedValue(normalizeIdentityValue(primaryKey, name))
                    .priority(defaultIdentityPriority(primaryKey))
                    .primaryIdentity(true)
                    .build());
        }
        if (StringUtils.hasText(entity.getNamespace())) {
            identities.add(EntityIdentity.builder()
                    .entityId(entity.getId())
                    .identityType(SOURCE_DERIVED)
                    .identityKey("service.namespace")
                    .identityValue(entity.getNamespace())
                    .normalizedValue(normalizeIdentityValue("service.namespace", entity.getNamespace()))
                    .priority(defaultIdentityPriority("service.namespace"))
                    .primaryIdentity(false)
                    .build());
        }
        if (StringUtils.hasText(entity.getEnvironment())) {
            identities.add(EntityIdentity.builder()
                    .entityId(entity.getId())
                    .identityType(SOURCE_DERIVED)
                    .identityKey("deployment.environment.name")
                    .identityValue(entity.getEnvironment())
                    .normalizedValue(normalizeIdentityValue("deployment.environment.name", entity.getEnvironment()))
                    .priority(defaultIdentityPriority("deployment.environment.name"))
                    .primaryIdentity(false)
                    .build());
        }
        return identities;
    }

    private String canonicalizeIdentityValue(ObserveEntity entity, String identityKey, String identityValue, String identityType) {
        if (!StringUtils.hasText(identityType) || SOURCE_MANUAL.equalsIgnoreCase(identityType)) {
            return identityValue;
        }
        return switch (identityKey) {
            case "service.name" -> isServiceLikeEntity(entity) && StringUtils.hasText(entity.getName()) ? entity.getName() : identityValue;
            case "messaging.destination.name" -> TYPE_QUEUE.equals(entity.getType()) && StringUtils.hasText(entity.getName()) ? entity.getName() : identityValue;
            case "k8s.workload.name" -> StringUtils.hasText(entity.getName()) ? entity.getName() : identityValue;
            case "display_name" -> StringUtils.hasText(entity.getDisplayName()) ? entity.getDisplayName() : identityValue;
            default -> identityValue;
        };
    }

    private boolean isServiceLikeEntity(ObserveEntity entity) {
        if (entity == null || !StringUtils.hasText(entity.getType())) {
            return false;
        }
        return switch (entity.getType()) {
            case "service", "database", "middleware" -> true;
            default -> false;
        };
    }

    private int matchScore(EntityIdentity identity) {
        int base = identity.getPriority() == null ? defaultIdentityPriority(identity.getIdentityKey()) : identity.getPriority();
        if (identity.isPrimaryIdentity()) {
            base += 10;
        }
        return base;
    }

    private int defaultIdentityPriority(String identityKey) {
        if (EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(identityKey)) {
            return EntityCanonicalIdentityRegistry.defaultPriority(identityKey);
        }
        if (identityKey != null && identityKey.startsWith("k8s.")) {
            return 70;
        }
        return IDENTITY_SCORES.getOrDefault(identityKey, 40);
    }

    private boolean containsK8sSignal(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            return false;
        }
        return values.keySet().stream().anyMatch(key -> key != null && key.startsWith("k8s."));
    }

    private boolean isOtelResourceIdentity(String identityKey) {
        if (!StringUtils.hasText(identityKey)) {
            return false;
        }
        return EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(identityKey);
    }

    private String normalizeIdentityValue(String identityKey, String identityValue) {
        if (!StringUtils.hasText(identityValue)) {
            return identityValue;
        }
        if ("monitor.app".equals(identityKey)) {
            return identityValue.trim().toLowerCase();
        }
        return identityValue.trim().toLowerCase();
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private Object firstNonNull(Object... values) {
        if (values == null) {
            return null;
        }
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static final class BindingCandidateAccumulator {
        private int score;
        private final Map<String, List<String>> matchedIdentities = new LinkedHashMap<>();

        private int finalScore() {
            int finalScore = score;
            if (matchedIdentities.containsKey("service.name") && matchedIdentities.containsKey("service.namespace")) {
                finalScore += 30;
            }
            if (matchedIdentities.containsKey("host.id") && matchedIdentities.containsKey("host.name")) {
                finalScore += 20;
            }
            if (matchedIdentities.keySet().stream().anyMatch(key -> key.startsWith("k8s."))) {
                finalScore += 20;
            }
            return finalScore;
        }
    }
}
