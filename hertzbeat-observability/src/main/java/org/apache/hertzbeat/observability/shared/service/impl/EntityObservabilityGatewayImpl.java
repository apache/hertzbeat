/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.shared.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.entity.EntityAlertSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityObservabilityDetailBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntitySignalEvidenceBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusPageSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityTriageRecommendation;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsRequest;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.metrics.MetricCorrelationHint;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Aggregates entity-focused observability behavior behind one gateway.
 */
@Service
@RequiredArgsConstructor
public class EntityObservabilityGatewayImpl implements EntityObservabilityGateway {

    private final TelemetryIntakeServiceImpl telemetryIntakeService;
    private final EntityTraceQueryService entityTraceQueryService;

    @Override
    public EntityTraceSummaryDto resolveEntityTraceSummary(ObservedEntityContext entityContext) {
        EntityTraceSummaryDto traceSummary = telemetryIntakeService.buildTraceSummary(entityContext);
        if (traceSummary == null || !traceSummary.isActive()) {
            return entityTraceQueryService.buildEntityTraceSummary(entityContext);
        }
        return traceSummary;
    }

    @Override
    public List<EntityTraceQueryHintDto> resolveEntityTraceQueryHints(ObservedEntityContext entityContext) {
        List<EntityTraceQueryHintDto> traceQueryHints = telemetryIntakeService.buildTraceQueryHints(entityContext);
        if (CollectionUtils.isEmpty(traceQueryHints)) {
            return entityTraceQueryService.buildEntityTraceQueryHints(entityContext);
        }
        return traceQueryHints;
    }

    @Override
    public List<EntityLogQueryHint> buildEntityLogQueryHints(List<EntityIdentity> identities, List<Monitor> monitors) {
        List<EntityLogQueryHint> hints = new ArrayList<>();
        Map<String, String> resourceFilters = new LinkedHashMap<>();
        String serviceName = null;
        String serviceNamespace = null;
        String environment = null;
        if (!CollectionUtils.isEmpty(identities)) {
            for (EntityIdentity identity : identities) {
                if (isOtelResourceIdentity(identity.getIdentityKey()) && !resourceFilters.containsKey(identity.getIdentityKey())) {
                    resourceFilters.put(identity.getIdentityKey(), identity.getIdentityValue());
                }
                if ("service.name".equals(identity.getIdentityKey()) && !StringUtils.hasText(serviceName)) {
                    serviceName = trimToNull(identity.getIdentityValue());
                } else if ("service.namespace".equals(identity.getIdentityKey()) && !StringUtils.hasText(serviceNamespace)) {
                    serviceNamespace = trimToNull(identity.getIdentityValue());
                } else if ("deployment.environment.name".equals(identity.getIdentityKey()) && !StringUtils.hasText(environment)) {
                    environment = trimToNull(identity.getIdentityValue());
                }
            }
        }
        long end = System.currentTimeMillis();
        long start = Math.max(0L, end - 15 * 60 * 1000L);
        if (!resourceFilters.isEmpty()) {
            hints.add(new EntityLogQueryHint("otel-resource", resourceFilters, Collections.emptyList(),
                    null, null, serviceName, serviceNamespace, environment, start, end));
        }
        List<String> searchTerms = new ArrayList<>();
        if (!CollectionUtils.isEmpty(monitors)) {
            for (Monitor monitor : monitors) {
                if (StringUtils.hasText(monitor.getName())) {
                    searchTerms.add(monitor.getName());
                }
                if (StringUtils.hasText(monitor.getInstance())) {
                    searchTerms.add(monitor.getInstance());
                }
            }
        }
        if (!searchTerms.isEmpty()) {
            hints.add(new EntityLogQueryHint("fallback-search", Collections.emptyMap(),
                    searchTerms.stream().distinct().toList(),
                    null, null, serviceName, serviceNamespace, environment, start, end));
        }
        return hints;
    }

    @Override
    public EntityLogSummaryInfo buildEntityLogSummary(List<EntityLogQueryHint> logQueryHints) {
        if (CollectionUtils.isEmpty(logQueryHints)) {
            return new EntityLogSummaryInfo(0, null, null, Collections.emptyMap(), Collections.emptyList(), null);
        }
        EntityLogQueryHint preferredHint = logQueryHints.getFirst();
        String fallbackSearchTerm = preferredHint.getSearchTerms() == null || preferredHint.getSearchTerms().isEmpty()
                ? null
                : preferredHint.getSearchTerms().getFirst();
        return new EntityLogSummaryInfo(
                logQueryHints.size(),
                preferredHint.getTitle(),
                preferredHint.getTitle(),
                preferredHint.getResourceFilters() == null ? Collections.emptyMap() : preferredHint.getResourceFilters(),
                preferredHint.getSearchTerms() == null ? Collections.emptyList() : preferredHint.getSearchTerms(),
                fallbackSearchTerm
        );
    }

    @Override
    public EntityAlertSummaryInfo buildEntityAlertSummary(List<SingleAlert> activeAlerts) {
        if (CollectionUtils.isEmpty(activeAlerts)) {
            return new EntityAlertSummaryInfo(0, Collections.emptyList(), Collections.emptyMap(), null);
        }
        Map<String, Long> severityDistribution = activeAlerts.stream()
                .collect(java.util.stream.Collectors.groupingBy(this::resolveAlertSeverity,
                        LinkedHashMap::new, java.util.stream.Collectors.counting()));
        Long latestStatusChangeAt = activeAlerts.stream()
                .map(this::resolveAlertTimestamp)
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);
        return new EntityAlertSummaryInfo(
                activeAlerts.size(),
                activeAlerts.stream().limit(5).toList(),
                severityDistribution,
                latestStatusChangeAt
        );
    }

    @Override
    public EntityMonitorSummaryInfo buildEntityMonitorSummary(List<Monitor> monitors) {
        if (CollectionUtils.isEmpty(monitors)) {
            return new EntityMonitorSummaryInfo(0, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyList(), null);
        }
        Map<String, Long> appDistribution = monitors.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        monitor -> defaultText(trimToNull(monitor.getApp()), "unknown"),
                        LinkedHashMap::new,
                        java.util.stream.Collectors.counting()));
        Map<String, Long> statusDistribution = monitors.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        monitor -> monitorStatusKey(monitor.getStatus()),
                        LinkedHashMap::new,
                        java.util.stream.Collectors.counting()));
        List<org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo> abnormalMonitors = monitors.stream()
                .filter(monitor -> monitor.getStatus() == CommonConstants.MONITOR_DOWN_CODE)
                .sorted(java.util.Comparator.comparing(Monitor::getGmtUpdate, java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder()))
                        .thenComparing(Monitor::getId, java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .limit(5)
                .map(org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo::fromEntity)
                .toList();
        Long latestStatusChangeAt = monitors.stream()
                .map(Monitor::getGmtUpdate)
                .filter(Objects::nonNull)
                .map(this::toEpochMillis)
                .max(Long::compareTo)
                .orElse(null);
        return new EntityMonitorSummaryInfo(monitors.size(), appDistribution, statusDistribution, abnormalMonitors, latestStatusChangeAt);
    }

    @Override
    public EntityEvidenceSummaryInfo buildEntityEvidenceSummary(ObserveEntity entity,
                                                                EntityStatusInfo statusInfo,
                                                                long identityCount,
                                                                int logHintCount,
                                                                List<Monitor> monitors,
                                                                List<SingleAlert> activeAlerts) {
        int activeAlertCount = statusInfo == null ? 0 : statusInfo.getActiveAlertCount();
        int downMonitorCount = statusInfo == null ? 0 : statusInfo.getMonitorDownCount();
        int healthyMonitorCount = statusInfo == null ? 0 : statusInfo.getMonitorUpCount();
        Long lastEvidenceAt = resolveLastEvidenceAt(entity, monitors, activeAlerts);
        return new EntityEvidenceSummaryInfo(
                activeAlertCount,
                downMonitorCount,
                healthyMonitorCount,
                identityCount,
                logHintCount,
                lastEvidenceAt
        );
    }

    @Override
    public EntityOpsSummaryInfo buildEntityOpsSummary(ObserveEntity entity,
                                                      long relationCount,
                                                      EntityEvidenceSummaryInfo evidenceSummary) {
        boolean ownerReady = entity != null && StringUtils.hasText(entity.getOwner());
        boolean runbookReady = entity != null && StringUtils.hasText(entity.getRunbook());
        boolean relationReady = relationCount > 0;
        boolean telemetryReady = evidenceSummary != null
                && (evidenceSummary.getIdentityCount() > 0 || evidenceSummary.getHealthyMonitorCount() > 0
                || evidenceSummary.getDownMonitorCount() > 0 || evidenceSummary.getActiveAlertCount() > 0
                || evidenceSummary.getLogHintCount() > 0);
        boolean statusReady = evidenceSummary != null
                && (evidenceSummary.getActiveAlertCount() > 0
                || evidenceSummary.getDownMonitorCount() > 0
                || evidenceSummary.getHealthyMonitorCount() > 0);
        int readinessScore = 0;
        readinessScore += ownerReady ? 20 : 0;
        readinessScore += runbookReady ? 20 : 0;
        readinessScore += relationReady ? 20 : 0;
        readinessScore += telemetryReady ? 20 : 0;
        readinessScore += statusReady ? 20 : 0;
        return new EntityOpsSummaryInfo(ownerReady, runbookReady, relationReady, telemetryReady, statusReady, readinessScore);
    }

    @Override
    public List<EntityNextActionInfo> buildEntityNextActions(ObserveEntity entity,
                                                             EntityEvidenceSummaryInfo evidenceSummary,
                                                             EntityLogSummaryInfo logSummary,
                                                             EntityOpsSummaryInfo opsSummary) {
        List<EntityNextActionInfo> actions = new ArrayList<>();
        int activeAlertCount = evidenceSummary == null ? 0 : evidenceSummary.getActiveAlertCount();
        int downMonitorCount = evidenceSummary == null ? 0 : evidenceSummary.getDownMonitorCount();
        int healthyMonitorCount = evidenceSummary == null ? 0 : evidenceSummary.getHealthyMonitorCount();
        if (activeAlertCount > 0) {
            actions.add(new EntityNextActionInfo(
                    "review_alerts",
                    ObservabilityMessages.get("observability.entity.next.review-alerts.title"),
                    ObservabilityMessages.format("observability.entity.next.review-alerts.description", activeAlertCount),
                    ObservabilityMessages.get("observability.entity.next.review-alerts.action"),
                    100
            ));
        }
        if (opsSummary != null && !opsSummary.isOwnerReady()) {
            actions.add(new EntityNextActionInfo(
                    "complete_owner",
                    ObservabilityMessages.get("observability.entity.next.complete-owner.title"),
                    ObservabilityMessages.get("observability.entity.next.complete-owner.description"),
                    ObservabilityMessages.get("observability.entity.next.complete-owner.action"),
                    90
            ));
        }
        if (opsSummary != null && !opsSummary.isRunbookReady()) {
            actions.add(new EntityNextActionInfo(
                    "complete_runbook",
                    ObservabilityMessages.get("observability.entity.next.complete-runbook.title"),
                    ObservabilityMessages.get("observability.entity.next.complete-runbook.description"),
                    ObservabilityMessages.get("observability.entity.next.complete-runbook.action"),
                    80
            ));
        }
        if (evidenceSummary != null && healthyMonitorCount + downMonitorCount == 0) {
            actions.add(new EntityNextActionInfo(
                    "bind_monitor",
                    ObservabilityMessages.get("observability.entity.next.bind-monitor.title"),
                    ObservabilityMessages.get("observability.entity.next.bind-monitor.description"),
                    ObservabilityMessages.get("observability.entity.next.bind-monitor.action"),
                    75
            ));
        } else if (downMonitorCount > 0 && activeAlertCount == 0) {
            actions.add(new EntityNextActionInfo(
                    "bind_monitor",
                    ObservabilityMessages.get("observability.entity.next.abnormal-monitors.title"),
                    ObservabilityMessages.format("observability.entity.next.abnormal-monitors.description", downMonitorCount),
                    ObservabilityMessages.get("observability.entity.next.abnormal-monitors.action"),
                    74
            ));
        }
        if (opsSummary != null && !opsSummary.isTelemetryReady()) {
            actions.add(new EntityNextActionInfo(
                    "open_discovery",
                    ObservabilityMessages.get("observability.entity.next.open-discovery.title"),
                    ObservabilityMessages.get("observability.entity.next.open-discovery.description"),
                    ObservabilityMessages.get("observability.entity.next.open-discovery.action"),
                    70
            ));
        }
        if (logSummary != null && logSummary.getHintCount() > 0 && activeAlertCount == 0) {
            actions.add(new EntityNextActionInfo(
                    "inspect_logs",
                    ObservabilityMessages.get("observability.entity.next.inspect-logs.title"),
                    ObservabilityMessages.get("observability.entity.next.inspect-logs.description"),
                    ObservabilityMessages.get("observability.entity.next.inspect-logs.action"),
                    60
            ));
        }
        if (opsSummary != null && !opsSummary.isRelationReady()) {
            actions.add(new EntityNextActionInfo(
                    "review_relations",
                    ObservabilityMessages.get("observability.entity.next.review-relations.title"),
                    ObservabilityMessages.get("observability.entity.next.review-relations.description"),
                    ObservabilityMessages.get("observability.entity.next.review-relations.action"),
                    50
            ));
        }
        if (actions.isEmpty()) {
            actions.add(new EntityNextActionInfo(
                    "inspect_logs",
                    ObservabilityMessages.get("observability.entity.next.fallback.title"),
                    ObservabilityMessages.get("observability.entity.next.fallback.description"),
                    ObservabilityMessages.get("observability.entity.next.fallback.action"),
                    10
            ));
        }
        return actions.stream()
                .sorted(Comparator.comparingInt(EntityNextActionInfo::getPriority).reversed())
                .limit(5)
                .toList();
    }

    @Override
    public EntityStatusPageSummaryInfo buildEntityStatusPageSummary(ObserveEntity entity, EntityOpsSummaryInfo opsSummary) {
        Map<String, String> labels = entity == null ? null : entity.getLabels();
        String linkedComponent = labels == null ? null
                : defaultText(trimToNull(labels.get("status.page.component")),
                defaultText(trimToNull(labels.get("status_page_component")), trimToNull(labels.get("status.page"))));
        boolean linked = StringUtils.hasText(linkedComponent);
        boolean suggestExpose = !linked
                && entity != null
                && java.util.Set.of("service", "api", "endpoint", "system").contains(entity.getType())
                && opsSummary != null
                && opsSummary.isStatusReady();
        return new EntityStatusPageSummaryInfo(linked, linked ? 1 : 0, null, suggestExpose);
    }

    @Override
    public String buildEntityReturnLabel(ObservedEntityContext entityContext) {
        if (entityContext == null || entityContext.getEntity() == null) {
            return ObservabilityMessages.get("observability.entity.return-label.fallback");
        }
        return defaultText(
                trimToNull(entityContext.getEntity().getDisplayName()),
                defaultText(trimToNull(entityContext.getEntity().getName()),
                        ObservabilityMessages.get("observability.entity.return-label.fallback"))
        );
    }

    @Override
    public String buildEntityAlertSearchToken(ObservedEntityContext entityContext, List<SingleAlert> activeAlerts) {
        List<String> alertLabelKeys = List.of(
                "instance",
                "instance_name",
                "service.name",
                "messaging.destination.name",
                "endpoint.url",
                "host.name",
                "k8s.workload.name",
                "db.name");
        String sharedAlertToken = pickSharedAlertToken(activeAlerts, alertLabelKeys);
        if (sharedAlertToken != null) {
            return sharedAlertToken;
        }
        String firstAlertToken = pickFirstAlertToken(activeAlerts, alertLabelKeys);
        if (firstAlertToken != null) {
            return firstAlertToken;
        }
        return defaultText(
                getEntityIdentityValue(entityContext, "service.name"),
                getEntityIdentityValue(entityContext, "messaging.destination.name"),
                getEntityIdentityValue(entityContext, "endpoint.url"),
                getEntityIdentityValue(entityContext, "host.name"),
                getEntityIdentityValue(entityContext, "k8s.workload.name"),
                getEntityIdentityValue(entityContext, "db.name"),
                buildFallbackEntitySearchToken(entityContext)
        );
    }

    @Override
    public EntityResponseHandoffInfo buildEntityAlertHandoff(String returnTo, String returnLabel,
                                                             ObservedEntityContext entityContext,
                                                             List<SingleAlert> activeAlerts) {
        EntityResponseHandoffInfo handoff = new EntityResponseHandoffInfo();
        handoff.setReturnTo(returnTo);
        handoff.setReturnLabel(returnLabel);
        handoff.setSearch(buildEntityAlertSearchToken(entityContext, activeAlerts));
        handoff.setStatus(CollectionUtils.isEmpty(activeAlerts) ? null : "firing");
        handoff.setSeverity(pickPrimaryAlertSeverity(activeAlerts));
        return handoff;
    }

    @Override
    public EntityResponseHandoffInfo buildEntityMonitorHandoff(String returnTo, String returnLabel,
                                                               List<Monitor> monitors,
                                                               String fallbackSearchToken,
                                                               MetricEvidence preferredMetricEvidence) {
        EntityResponseHandoffInfo handoff = emptyResponseHandoff(returnTo, returnLabel);
        List<Monitor> abnormalMonitors = monitors == null ? List.of() : monitors.stream()
                .filter(monitor -> Objects.equals(monitor.getStatus(), CommonConstants.MONITOR_DOWN_CODE))
                .toList();
        List<Monitor> preferredMonitors = !abnormalMonitors.isEmpty() ? abnormalMonitors : (monitors == null ? List.of() : monitors);
        Monitor preferredMonitor = preferredMonitors.isEmpty() ? null : preferredMonitors.getFirst();
        if (preferredMonitor != null) {
            String preferredApp = singleMonitorApp(preferredMonitors);
            handoff.setApp(preferredApp);
            if (preferredMonitors.size() == 1) {
                handoff.setContent(defaultText(trimToNull(preferredMonitor.getInstance()),
                        defaultText(trimToNull(preferredMonitor.getName()), fallbackSearchToken)));
            }
        } else {
            handoff.setContent(fallbackSearchToken);
        }
        handoff.setStatus(!abnormalMonitors.isEmpty() ? String.valueOf(CommonConstants.MONITOR_DOWN_CODE) : null);
        if (preferredMetricEvidence != null) {
            applyMetricCorrelation(handoff, preferredMetricEvidence.getCorrelationHint());
            handoff.setCodeNavigationHint(preferredMetricEvidence.getCodeNavigationHint());
        }
        return handoff;
    }

    @Override
    public EntityResponseHandoffInfo buildEntityLogHandoff(String returnTo, String returnLabel,
                                                           String logSearchToken,
                                                           List<SingleAlert> activeAlerts,
                                                           LogEvidence preferredLogEvidence,
                                                           EntityTraceSummaryDto traceSummary,
                                                           TraceEvidence preferredTraceEvidence,
                                                           List<EntityTraceQueryHintDto> traceQueryHints) {
        EntityResponseHandoffInfo handoff = emptyResponseHandoff(returnTo, returnLabel);
        handoff.setSearch(logSearchToken);
        handoff.setSeverityText(pickPrimaryAlertSeverity(activeAlerts));
        if (preferredLogEvidence != null) {
            handoff.setTraceId(trimToNull(preferredLogEvidence.getTraceId()));
            handoff.setSpanId(trimToNull(preferredLogEvidence.getSpanId()));
            handoff.setServiceName(trimToNull(preferredLogEvidence.getIdentitySnapshot() == null
                    ? null : preferredLogEvidence.getIdentitySnapshot().getServiceName()));
            handoff.setServiceNamespace(trimToNull(preferredLogEvidence.getIdentitySnapshot() == null
                    ? null : preferredLogEvidence.getIdentitySnapshot().getServiceNamespace()));
            handoff.setEnvironment(trimToNull(preferredLogEvidence.getIdentitySnapshot() == null
                    ? null : preferredLogEvidence.getIdentitySnapshot().getEnvironmentName()));
            long end = preferredLogEvidence.getObservedAt() == null ? System.currentTimeMillis() : preferredLogEvidence.getObservedAt();
            handoff.setEnd(end);
            handoff.setStart(Math.max(0L, end - 15 * 60 * 1000L));
            handoff.setSearch(defaultText(trimToNull(preferredLogEvidence.getTraceId()),
                    defaultText(handoff.getSearch(), trimToNull(preferredLogEvidence.getQueryHint()))));
            handoff.setCodeNavigationHint(preferredLogEvidence.getCodeNavigationHint());
        }
        if (!StringUtils.hasText(handoff.getTraceId())) {
            EntityTraceQueryHintDto preferredTraceHint = CollectionUtils.isEmpty(traceQueryHints) ? null : traceQueryHints.getFirst();
            handoff.setTraceId(firstNonBlank(
                    preferredTraceEvidence == null ? null : trimToNull(preferredTraceEvidence.getTraceId()),
                    preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getTraceId()),
                    traceSummary == null ? null : trimToNull(traceSummary.getLatestTraceId())
            ));
            handoff.setSpanId(firstNonBlank(
                    preferredTraceEvidence == null ? null : trimToNull(preferredTraceEvidence.getRootSpanId()),
                    preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getSpanId())
            ));
            handoff.setServiceName(firstNonBlank(
                    handoff.getServiceName(),
                    preferredTraceEvidence == null ? null : trimToNull(preferredTraceEvidence.getServiceName()),
                    preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getServiceName())
            ));
            handoff.setServiceNamespace(firstNonBlank(
                    handoff.getServiceNamespace(),
                    preferredTraceEvidence == null ? null : trimToNull(preferredTraceEvidence.getServiceNamespace()),
                    preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getServiceNamespace())
            ));
            handoff.setEnvironment(firstNonBlank(
                    handoff.getEnvironment(),
                    preferredTraceEvidence == null || preferredTraceEvidence.getIdentitySnapshot() == null
                            ? null : trimToNull(preferredTraceEvidence.getIdentitySnapshot().getEnvironmentName()),
                    preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getEnvironment())
            ));
            long end = firstPositiveMillis(
                    handoff.getEnd(),
                    preferredTraceEvidence == null ? null : preferredTraceEvidence.getObservedAt(),
                    preferredTraceHint == null ? null : preferredTraceHint.getEnd(),
                    System.currentTimeMillis()
            );
            handoff.setEnd(end);
            handoff.setStart(firstPositiveMillis(
                    handoff.getStart(),
                    preferredTraceHint == null ? null : preferredTraceHint.getStart(),
                    Math.max(0L, end - 15 * 60 * 1000L)
            ));
            handoff.setSearch(defaultText(trimToNull(handoff.getTraceId()), handoff.getSearch()));
            if (handoff.getCodeNavigationHint() == null && preferredTraceEvidence != null) {
                handoff.setCodeNavigationHint(preferredTraceEvidence.getCodeNavigationHint());
            }
        }
        return handoff;
    }

    @Override
    public EntityResponseHandoffInfo buildEntityTraceHandoff(String returnTo, String returnLabel,
                                                             String traceSearchToken,
                                                             EntityTraceSummaryDto traceSummary,
                                                             TraceEvidence preferredTraceEvidence) {
        EntityResponseHandoffInfo handoff = emptyResponseHandoff(returnTo, returnLabel);
        handoff.setSearch(traceSearchToken);
        if (traceSummary != null) {
            handoff.setTraceId(trimToNull(traceSummary.getLatestTraceId()));
        }
        if (preferredTraceEvidence != null) {
            handoff.setTraceId(defaultText(trimToNull(preferredTraceEvidence.getTraceId()), handoff.getTraceId()));
            handoff.setSpanId(trimToNull(preferredTraceEvidence.getRootSpanId()));
            handoff.setServiceName(trimToNull(preferredTraceEvidence.getServiceName()));
            handoff.setServiceNamespace(trimToNull(preferredTraceEvidence.getServiceNamespace()));
            handoff.setEnvironment(trimToNull(preferredTraceEvidence.getIdentitySnapshot() == null
                    ? null : preferredTraceEvidence.getIdentitySnapshot().getEnvironmentName()));
            long end = preferredTraceEvidence.getObservedAt() == null ? System.currentTimeMillis() : preferredTraceEvidence.getObservedAt();
            handoff.setEnd(end);
            handoff.setStart(Math.max(0L, end - 15 * 60 * 1000L));
            handoff.setCodeNavigationHint(preferredTraceEvidence.getCodeNavigationHint());
        }
        return handoff;
    }

    @Override
    public EntityResponseHandoffInfo buildEntityDiscoveryHandoff(String returnTo, String returnLabel,
                                                                 String owner, String system,
                                                                 String environment, String source,
                                                                 String alertSearchToken, String logSearchToken,
                                                                 String fallbackSearchToken) {
        EntityResponseHandoffInfo handoff = emptyResponseHandoff(returnTo, returnLabel);
        handoff.setQuery(defaultText(alertSearchToken, defaultText(logSearchToken, fallbackSearchToken)));
        handoff.setOwner(trimToNull(owner));
        handoff.setSystem(trimToNull(system));
        handoff.setEnvironment(trimToNull(environment));
        handoff.setSource(trimToNull(source));
        return handoff;
    }

    @Override
    public EntityResponseHandoffInfo buildEntityEditorHandoff(String returnTo, String returnLabel,
                                                              boolean ownerReady, boolean runbookReady,
                                                              boolean relationReady, boolean telemetryReady) {
        EntityResponseHandoffInfo handoff = emptyResponseHandoff(returnTo, returnLabel);
        String focus = "basic";
        if (!ownerReady || !runbookReady) {
            focus = "ownership";
        } else if (!relationReady) {
            focus = "relations";
        } else if (!telemetryReady) {
            focus = "monitors";
        }
        handoff.setFocus(focus);
        return handoff;
    }

    @Override
    public EntityResponseHandoffsInfo buildEntityResponseHandoffs(EntityResponseHandoffsRequest request) {
        if (request == null) {
            return new EntityResponseHandoffsInfo();
        }
        EntitySignalEvidenceBundle signalEvidence = request.getSignalEvidence();
        EntityLogSummaryInfo logSummary = signalEvidence == null ? request.getLogSummary() : signalEvidence.getLogSummary();
        EntityTraceSummaryDto traceSummary = signalEvidence == null ? request.getTraceSummary() : signalEvidence.getTraceSummary();
        List<MetricEvidence> metricEvidence = signalEvidence == null ? request.getMetricEvidence() : signalEvidence.getMetricEvidence();
        List<LogEvidence> logEvidence = signalEvidence == null ? request.getLogEvidence() : signalEvidence.getLogEvidence();
        List<TraceEvidence> traceEvidence = signalEvidence == null ? request.getTraceEvidence() : signalEvidence.getTraceEvidence();
        List<EntityTraceQueryHintDto> traceQueryHints = signalEvidence == null
                ? request.getTraceQueryHints()
                : signalEvidence.getTraceQueryHints();
        String alertSearchToken = buildEntityAlertSearchToken(request.getEntityContext(), request.getActiveAlerts());
        String logSearchToken = buildEntityLogSearchToken(request.getEntityContext(), logSummary);
        String traceSearchToken = buildEntityTraceSearchToken(request.getEntityContext(), traceSummary);
        String fallbackSearchToken = defaultText(
                trimToNull(request.getEntityContext() == null || request.getEntityContext().getEntity() == null
                        ? null : request.getEntityContext().getEntity().getName()),
                trimToNull(request.getEntityContext() == null || request.getEntityContext().getEntity() == null
                        ? null : request.getEntityContext().getEntity().getDisplayName()));
        MetricEvidence preferredMetricEvidence =
                CollectionUtils.isEmpty(metricEvidence) ? null : metricEvidence.getFirst();
        LogEvidence preferredLogEvidence =
                CollectionUtils.isEmpty(logEvidence) ? null : logEvidence.getFirst();
        TraceEvidence preferredTraceEvidence =
                CollectionUtils.isEmpty(traceEvidence) ? null : traceEvidence.getFirst();
        EntityResponseHandoffsInfo handoffs = new EntityResponseHandoffsInfo(
                buildEntityAlertHandoff(request.getReturnTo(), request.getReturnLabel(),
                        request.getEntityContext(), request.getActiveAlerts()),
                buildEntityMonitorHandoff(request.getReturnTo(), request.getReturnLabel(),
                        request.getMonitors(), fallbackSearchToken, preferredMetricEvidence),
                buildEntityLogHandoff(request.getReturnTo(), request.getReturnLabel(),
                        logSearchToken, request.getActiveAlerts(), preferredLogEvidence,
                        traceSummary, preferredTraceEvidence, traceQueryHints),
                buildEntityTraceHandoff(request.getReturnTo(), request.getReturnLabel(),
                        traceSearchToken, traceSummary, preferredTraceEvidence),
                buildEntityDiscoveryHandoff(request.getReturnTo(), request.getReturnLabel(),
                        request.getEntityOwner(), request.getEntitySystem(),
                        request.getEntityEnvironment(), request.getEntitySource(),
                        alertSearchToken, logSearchToken, fallbackSearchToken),
                buildEntityEditorHandoff(request.getReturnTo(), request.getReturnLabel(),
                        request.isOwnerReady(), request.isRunbookReady(),
                        request.isRelationReady(), request.isTelemetryReady())
        );
        applyEntityContextToResponseHandoffs(handoffs, request.getEntityContext());
        return handoffs;
    }

    private void applyEntityContextToResponseHandoffs(EntityResponseHandoffsInfo handoffs,
                                                      ObservedEntityContext entityContext) {
        if (handoffs == null || entityContext == null || entityContext.getEntity() == null) {
            return;
        }
        applyEntityContextToResponseHandoff(handoffs.getAlerts(), entityContext);
        applyEntityContextToResponseHandoff(handoffs.getMonitors(), entityContext);
        applyEntityContextToResponseHandoff(handoffs.getLogs(), entityContext);
        applyEntityContextToResponseHandoff(handoffs.getTraces(), entityContext);
        applyEntityContextToResponseHandoff(handoffs.getDiscovery(), entityContext);
        applyEntityContextToResponseHandoff(handoffs.getEditor(), entityContext);
    }

    private void applyEntityContextToResponseHandoff(EntityResponseHandoffInfo handoff,
                                                    ObservedEntityContext entityContext) {
        if (handoff == null || entityContext == null || entityContext.getEntity() == null) {
            return;
        }
        ObserveEntity entity = entityContext.getEntity();
        if (handoff.getEntityId() == null) {
            handoff.setEntityId(entity.getId());
        }
        if (!StringUtils.hasText(handoff.getEntityType())) {
            handoff.setEntityType(trimToNull(entity.getType()));
        }
        if (!StringUtils.hasText(handoff.getEntityName())) {
            handoff.setEntityName(firstNonBlank(entity.getDisplayName(), entity.getName()));
        }
    }

    @Override
    public String buildEntityLogSearchToken(ObservedEntityContext entityContext, EntityLogSummaryInfo logSummary) {
        if (logSummary != null && !CollectionUtils.isEmpty(logSummary.getPreferredSearchTerms())) {
            String preferredSearch = logSummary.getPreferredSearchTerms().stream()
                    .map(this::trimToNull)
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            if (preferredSearch != null) {
                return preferredSearch;
            }
        }
        if (logSummary != null && !CollectionUtils.isEmpty(logSummary.getPreferredResourceFilters())) {
            String preferredResource = logSummary.getPreferredResourceFilters().values().stream()
                    .map(this::trimToNull)
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            if (preferredResource != null) {
                return preferredResource;
            }
        }
        return defaultText(
                getEntityIdentityValue(entityContext, "service.name"),
                getEntityIdentityValue(entityContext, "messaging.destination.name"),
                getEntityIdentityValue(entityContext, "endpoint.url"),
                getEntityIdentityValue(entityContext, "host.name"),
                logSummary == null ? null : trimToNull(logSummary.getFallbackSearchTerm()),
                buildFallbackEntitySearchToken(entityContext)
        );
    }

    @Override
    public String buildEntityTraceSearchToken(ObservedEntityContext entityContext, EntityTraceSummaryDto traceSummary) {
        if (traceSummary != null && StringUtils.hasText(traceSummary.getLatestTraceId())) {
            return traceSummary.getLatestTraceId();
        }
        return defaultText(
                getEntityIdentityValue(entityContext, "service.name"),
                getEntityIdentityValue(entityContext, "service.instance.id"),
                getEntityIdentityValue(entityContext, "host.name"),
                getEntityIdentityValue(entityContext, "k8s.deployment.name"),
                buildFallbackEntitySearchToken(entityContext)
        );
    }

    @Override
    public EntityObservabilityDetailBundle resolveEntityDetailBundle(ObservedEntityContext entityContext,
                                                                     EntityStatusInfo statusInfo,
                                                                     EntityEvidenceSummaryInfo evidenceSummary,
                                                                     EntityMonitorSummaryInfo monitorSummary,
                                                                     EntityLogSummaryInfo logSummary,
                                                                     List<Monitor> monitors,
                                                                     List<EntityLogQueryHint> logQueryHints) {
        EntityTraceSummaryDto traceSummary = resolveEntityTraceSummary(entityContext);
        List<EntityTraceQueryHintDto> traceQueryHints = resolveEntityTraceQueryHints(entityContext);
        List<MetricEvidence> metricEvidence = buildMetricEvidence(entityContext, statusInfo, monitors);
        List<LogEvidence> logEvidence = buildLogEvidence(entityContext, logSummary, logQueryHints);
        List<TraceEvidence> traceEvidence = buildTraceEvidence(entityContext, traceSummary, traceQueryHints);
        List<EntityLogQueryHint> effectiveLogQueryHints = enrichEntityLogQueryHints(logQueryHints, logEvidence, traceQueryHints);
        EntityLogSummaryInfo effectiveLogSummary = buildEntityLogSummary(effectiveLogQueryHints);
        EntityUnifiedEvidenceSummary unifiedEvidenceSummary = buildUnifiedEvidenceSummary(
                evidenceSummary, monitorSummary, effectiveLogSummary, traceSummary, metricEvidence, logEvidence, traceEvidence);
        EntityTriageRecommendation triageRecommendation = buildTriageRecommendation(
                evidenceSummary, monitorSummary, effectiveLogSummary, traceSummary, metricEvidence, logEvidence, traceEvidence);
        return new EntityObservabilityDetailBundle(
                traceSummary, traceQueryHints, effectiveLogSummary, effectiveLogQueryHints,
                metricEvidence, logEvidence, traceEvidence, unifiedEvidenceSummary, triageRecommendation);
    }

    @Override
    public List<EntityLogQueryHint> enrichEntityLogQueryHints(List<EntityLogQueryHint> originalHints,
                                                              List<LogEvidence> logEvidence,
                                                              List<EntityTraceQueryHintDto> traceQueryHints) {
        if (CollectionUtils.isEmpty(logEvidence)) {
            return originalHints == null ? Collections.emptyList() : originalHints;
        }
        LogEvidence preferredEvidence = logEvidence.getFirst();
        if (preferredEvidence == null) {
            return originalHints == null ? Collections.emptyList() : originalHints;
        }
        EntityTraceQueryHintDto preferredTraceHint = CollectionUtils.isEmpty(traceQueryHints) ? null : traceQueryHints.getFirst();
        List<EntityLogQueryHint> safeOriginalHints = originalHints == null ? Collections.emptyList() : originalHints;
        List<EntityLogQueryHint> enrichedHints = new ArrayList<>(safeOriginalHints);
        EntityLogQueryHint preferredOriginalHint = safeOriginalHints.isEmpty() ? null : safeOriginalHints.getFirst();
        Map<String, String> resourceFilters = preferredOriginalHint == null || preferredOriginalHint.getResourceFilters() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(preferredOriginalHint.getResourceFilters());
        if (resourceFilters.isEmpty() && preferredEvidence.getResource() != null) {
            resourceFilters.putAll(preferredEvidence.getResource());
        }
        if (resourceFilters.isEmpty() && preferredTraceHint != null && preferredTraceHint.getResourceFilters() != null) {
            resourceFilters.putAll(preferredTraceHint.getResourceFilters());
        }
        List<String> searchTerms = safeOriginalHints.stream()
                .map(EntityLogQueryHint::getSearchTerms)
                .filter(terms -> !CollectionUtils.isEmpty(terms))
                .findFirst()
                .orElseGet(() -> CollectionUtils.isEmpty(preferredEvidence.getPreferredSearchTerms())
                        ? (preferredTraceHint == null || CollectionUtils.isEmpty(preferredTraceHint.getSearchTerms())
                        ? Collections.emptyList()
                        : preferredTraceHint.getSearchTerms())
                        : preferredEvidence.getPreferredSearchTerms());
        String traceId = firstNonBlank(trimToNull(preferredEvidence.getTraceId()),
                preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getTraceId()));
        String spanId = firstNonBlank(trimToNull(preferredEvidence.getSpanId()),
                preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getSpanId()));
        String serviceName = firstNonBlank(
                preferredOriginalHint == null ? null : trimToNull(preferredOriginalHint.getServiceName()),
                trimToNull(preferredEvidence.getIdentitySnapshot() == null ? null : preferredEvidence.getIdentitySnapshot().getServiceName()),
                preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getServiceName())
        );
        String serviceNamespace = firstNonBlank(
                preferredOriginalHint == null ? null : trimToNull(preferredOriginalHint.getServiceNamespace()),
                trimToNull(preferredEvidence.getIdentitySnapshot() == null ? null : preferredEvidence.getIdentitySnapshot().getServiceNamespace()),
                preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getServiceNamespace())
        );
        String environment = firstNonBlank(
                preferredOriginalHint == null ? null : trimToNull(preferredOriginalHint.getEnvironment()),
                trimToNull(preferredEvidence.getIdentitySnapshot() == null ? null : preferredEvidence.getIdentitySnapshot().getEnvironmentName()),
                preferredTraceHint == null ? null : trimToNull(preferredTraceHint.getEnvironment())
        );
        Long end = firstPositiveMillis(
                preferredOriginalHint == null ? null : preferredOriginalHint.getEnd(),
                preferredEvidence.getObservedAt(),
                preferredTraceHint == null ? null : preferredTraceHint.getEnd()
        );
        Long start = firstPositiveMillis(
                preferredOriginalHint == null ? null : preferredOriginalHint.getStart(),
                preferredTraceHint == null ? null : preferredTraceHint.getStart(),
                end == null ? null : Math.max(0L, end - 15 * 60 * 1000L)
        );
        EntityLogQueryHint enrichedHint = new EntityLogQueryHint(
                preferredOriginalHint == null ? preferredEvidence.getBody() : preferredOriginalHint.getTitle(),
                resourceFilters,
                searchTerms,
                traceId,
                spanId,
                serviceName,
                serviceNamespace,
                environment,
                start,
                end
        );
        if (enrichedHints.isEmpty()) {
            enrichedHints.add(enrichedHint);
        } else {
            enrichedHints.set(0, enrichedHint);
        }
        return enrichedHints;
    }

    @Override
    public void recordOtlpMetricIntake(Map<String, String> resourceAttributes, Long observedAt, String metricName,
                                       String metricType, String unit, Double value, Map<String, String> attributes) {
        telemetryIntakeService.recordOtlpMetricIntake(resourceAttributes, observedAt, metricName, metricType, unit, value, attributes);
    }

    @Override
    public void recordOtlpLogIntake(Map<String, String> resourceAttributes, Long observedAt, String body,
                                    String severityText, String traceId, String spanId, Map<String, String> attributes) {
        telemetryIntakeService.recordOtlpLogIntake(resourceAttributes, observedAt, body, severityText, traceId, spanId, attributes);
    }

    @Override
    public void recordOtlpTraceIntake(Map<String, String> resourceAttributes, Long observedAt, String traceId,
                                      String spanId, String spanName, String errorState, Map<String, String> spanAttributes) {
        telemetryIntakeService.recordOtlpTraceIntake(resourceAttributes, observedAt, traceId, spanId, spanName, errorState, spanAttributes);
    }

    @Override
    public List<TelemetryIdentitySnapshot> collectRecentIdentitySnapshots(List<LogEntry> logs,
                                                                          List<TraceListItemDto> traces,
                                                                          List<Monitor> monitors) {
        return telemetryIntakeService.collectRecentIdentitySnapshots(logs, traces, monitors);
    }

    @Override
    public List<TelemetryIdentitySnapshot> collectRecentExternalIdentitySnapshots(List<LogEntry> logs,
                                                                                  List<TraceListItemDto> traces,
                                                                                  List<Monitor> monitors) {
        return telemetryIntakeService.collectRecentExternalIdentitySnapshots(logs, traces, monitors);
    }

    @Override
    public TelemetryIdentitySnapshot resolveRecentOtlpMetricContext(String serviceName, String serviceNamespace, String environment) {
        return telemetryIntakeService.resolveRecentOtlpMetricContext(serviceName, serviceNamespace, environment);
    }

    @Override
    public List<TelemetryIdentitySnapshot> collectRecentOtlpMetricContexts(int limit) {
        return telemetryIntakeService.collectRecentOtlpMetricContexts(limit);
    }

    @Override
    public List<String> collectRecentOtlpMetricNames(String serviceName, String serviceNamespace, String environment, int limit) {
        return telemetryIntakeService.collectRecentOtlpMetricNames(serviceName, serviceNamespace, environment, limit);
    }

    @Override
    public List<MetricEvidence> buildMetricEvidence(ObservedEntityContext entityContext, EntityStatusInfo statusInfo, List<Monitor> monitors) {
        return telemetryIntakeService.buildMetricEvidence(entityContext, statusInfo, monitors);
    }

    @Override
    public List<LogEvidence> buildLogEvidence(ObservedEntityContext entityContext, EntityLogSummaryInfo logSummary,
                                              List<EntityLogQueryHint> logQueryHints) {
        return telemetryIntakeService.buildLogEvidence(entityContext, logSummary, logQueryHints);
    }

    @Override
    public EntityTraceSummaryDto buildTraceSummary(ObservedEntityContext entityContext) {
        return telemetryIntakeService.buildTraceSummary(entityContext);
    }

    @Override
    public List<EntityTraceQueryHintDto> buildTraceQueryHints(ObservedEntityContext entityContext) {
        return telemetryIntakeService.buildTraceQueryHints(entityContext);
    }

    @Override
    public List<TraceEvidence> buildTraceEvidence(ObservedEntityContext entityContext, EntityTraceSummaryDto traceSummary,
                                                  List<EntityTraceQueryHintDto> traceQueryHints) {
        return telemetryIntakeService.buildTraceEvidence(entityContext, traceSummary, traceQueryHints);
    }

    @Override
    public EntityUnifiedEvidenceSummary buildUnifiedEvidenceSummary(EntityEvidenceSummaryInfo evidenceSummary,
                                                                   EntityMonitorSummaryInfo monitorSummary,
                                                                   EntityLogSummaryInfo logSummary,
                                                                   EntityTraceSummaryDto traceSummary,
                                                                   List<MetricEvidence> metricEvidence,
                                                                   List<LogEvidence> logEvidence,
                                                                   List<TraceEvidence> traceEvidence) {
        return telemetryIntakeService.buildUnifiedEvidenceSummary(
                evidenceSummary, monitorSummary, logSummary, traceSummary, metricEvidence, logEvidence, traceEvidence);
    }

    @Override
    public EntityTriageRecommendation buildTriageRecommendation(EntityEvidenceSummaryInfo evidenceSummary,
                                                               EntityMonitorSummaryInfo monitorSummary,
                                                               EntityLogSummaryInfo logSummary,
                                                               EntityTraceSummaryDto traceSummary,
                                                               List<MetricEvidence> metricEvidence,
                                                               List<LogEvidence> logEvidence,
                                                               List<TraceEvidence> traceEvidence) {
        return telemetryIntakeService.buildTriageRecommendation(
                evidenceSummary, monitorSummary, logSummary, traceSummary, metricEvidence, logEvidence, traceEvidence);
    }

    @Override
    public MetricCorrelationHint buildMetricCorrelationHint(ObservedEntityContext entityContext,
                                                            TelemetryIdentitySnapshot identitySnapshot,
                                                            Long observedAt,
                                                            String metricName) {
        return telemetryIntakeService.buildMetricCorrelationHint(entityContext, identitySnapshot, observedAt, metricName);
    }

    @Override
    public CodeNavigationHint buildCodeNavigationHint(ObservedEntityContext entityContext,
                                                      Map<String, String> resourceAttributes,
                                                      Map<String, String> signalAttributes,
                                                      List<String> fallbackSearchTerms,
                                                      String fallbackTitle) {
        return telemetryIntakeService.buildCodeNavigationHint(
                entityContext, resourceAttributes, signalAttributes, fallbackSearchTerms, fallbackTitle);
    }

    private EntityResponseHandoffInfo emptyResponseHandoff(String returnTo, String returnLabel) {
        EntityResponseHandoffInfo handoff = new EntityResponseHandoffInfo();
        handoff.setReturnTo(returnTo);
        handoff.setReturnLabel(returnLabel);
        return handoff;
    }

    private String singleMonitorApp(List<Monitor> monitors) {
        if (CollectionUtils.isEmpty(monitors)) {
            return null;
        }
        return monitors.stream()
                .map(Monitor::getApp)
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .distinct()
                .reduce((left, right) -> null)
                .orElseGet(() -> trimToNull(monitors.getFirst().getApp()));
    }

    private void applyMetricCorrelation(EntityResponseHandoffInfo handoff, MetricCorrelationHint correlationHint) {
        if (handoff == null || correlationHint == null) {
            return;
        }
        handoff.setTraceId(trimToNull(correlationHint.getTraceId()));
        handoff.setSpanId(trimToNull(correlationHint.getSpanId()));
        handoff.setServiceName(trimToNull(correlationHint.getServiceName()));
        handoff.setServiceNamespace(trimToNull(correlationHint.getServiceNamespace()));
        handoff.setEnvironment(trimToNull(correlationHint.getEnvironment()));
        handoff.setStart(correlationHint.getStart());
        handoff.setEnd(correlationHint.getEnd());
        handoff.setSearch(defaultText(trimToNull(correlationHint.getSearchQuery()), handoff.getSearch()));
        handoff.setQuery(defaultText(trimToNull(correlationHint.getTraceQuery()), handoff.getQuery()));
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Long resolveAlertTimestamp(SingleAlert alert) {
        if (alert == null) {
            return null;
        }
        if (alert.getActiveAt() != null) {
            return alert.getActiveAt();
        }
        if (alert.getStartAt() != null) {
            return alert.getStartAt();
        }
        if (alert.getGmtUpdate() != null) {
            return toEpochMillis(alert.getGmtUpdate());
        }
        if (alert.getGmtCreate() != null) {
            return toEpochMillis(alert.getGmtCreate());
        }
        return null;
    }

    private Long resolveLastEvidenceAt(ObserveEntity entity, List<Monitor> monitors, List<SingleAlert> activeAlerts) {
        Long monitorLatest = CollectionUtils.isEmpty(monitors) ? null : monitors.stream()
                .map(Monitor::getGmtUpdate)
                .filter(Objects::nonNull)
                .map(this::toEpochMillis)
                .max(Long::compareTo)
                .orElse(null);
        Long alertLatest = CollectionUtils.isEmpty(activeAlerts) ? null : activeAlerts.stream()
                .map(this::resolveAlertTimestamp)
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);
        if (monitorLatest == null && alertLatest == null) {
            if (entity == null) {
                return null;
            }
            java.time.LocalDateTime latestEntityTime = entity.getGmtUpdate() != null ? entity.getGmtUpdate() : entity.getGmtCreate();
            return latestEntityTime == null ? null : toEpochMillis(latestEntityTime);
        }
        if (monitorLatest == null) {
            return alertLatest;
        }
        if (alertLatest == null) {
            return monitorLatest;
        }
        return Math.max(monitorLatest, alertLatest);
    }

    private String monitorStatusKey(byte status) {
        return switch (status) {
            case CommonConstants.MONITOR_UP_CODE -> "up";
            case CommonConstants.MONITOR_DOWN_CODE -> "down";
            case CommonConstants.MONITOR_PAUSED_CODE -> "paused";
            default -> "unknown";
        };
    }

    private Long toEpochMillis(java.time.LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    private boolean isOtelResourceIdentity(String identityKey) {
        if (!StringUtils.hasText(identityKey)) {
            return false;
        }
        return org.apache.hertzbeat.common.observability.model.EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(identityKey);
    }

    private String getEntityIdentityValue(ObservedEntityContext entityContext, String identityKey) {
        if (entityContext == null || CollectionUtils.isEmpty(entityContext.getIdentities())) {
            return null;
        }
        return entityContext.getIdentities().stream()
                .filter(identity -> java.util.Objects.equals(identity.getIdentityKey(), identityKey))
                .map(EntityIdentity::getIdentityValue)
                .map(this::trimToNull)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private String buildFallbackEntitySearchToken(ObservedEntityContext entityContext) {
        if (entityContext == null || entityContext.getEntity() == null) {
            return null;
        }
        return defaultText(trimToNull(entityContext.getEntity().getName()),
                trimToNull(entityContext.getEntity().getDisplayName()));
    }

    private String pickSharedAlertToken(List<SingleAlert> activeAlerts, List<String> labelKeys) {
        if (CollectionUtils.isEmpty(activeAlerts) || CollectionUtils.isEmpty(labelKeys)) {
            return null;
        }
        for (String labelKey : labelKeys) {
            String candidate = null;
            boolean shared = true;
            for (SingleAlert alert : activeAlerts) {
                String value = readAlertSearchValue(alert, labelKey);
                if (value == null) {
                    shared = false;
                    break;
                }
                if (candidate == null) {
                    candidate = value;
                    continue;
                }
                if (!candidate.equalsIgnoreCase(value)) {
                    shared = false;
                    break;
                }
            }
            if (shared && candidate != null) {
                return candidate;
            }
        }
        return null;
    }

    private String pickFirstAlertToken(List<SingleAlert> activeAlerts, List<String> labelKeys) {
        if (CollectionUtils.isEmpty(activeAlerts) || CollectionUtils.isEmpty(labelKeys)) {
            return null;
        }
        for (SingleAlert alert : activeAlerts) {
            for (String labelKey : labelKeys) {
                String value = readAlertSearchValue(alert, labelKey);
                if (value != null) {
                    return value;
                }
            }
        }
        return null;
    }

    private String readAlertSearchValue(SingleAlert alert, String labelKey) {
        if (alert == null || !StringUtils.hasText(labelKey)) {
            return null;
        }
        return defaultText(
                trimToNull(alert.getLabels() == null ? null : alert.getLabels().get(labelKey)),
                trimToNull(alert.getAnnotations() == null ? null : alert.getAnnotations().get(labelKey))
        );
    }

    private String pickPrimaryAlertSeverity(List<SingleAlert> activeAlerts) {
        if (CollectionUtils.isEmpty(activeAlerts)) {
            return null;
        }
        return activeAlerts.stream()
                .map(this::resolveAlertSeverity)
                .filter(StringUtils::hasText)
                .sorted(java.util.Comparator.comparingInt(this::severityPriority).reversed())
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

    private String defaultText(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String firstNonBlank(String... candidates) {
        if (candidates == null) {
            return null;
        }
        for (String candidate : candidates) {
            if (StringUtils.hasText(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    private Long firstPositiveMillis(Long... candidates) {
        if (candidates == null) {
            return null;
        }
        for (Long candidate : candidates) {
            if (candidate != null && candidate > 0) {
                return candidate;
            }
        }
        return null;
    }
}
