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
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.MonitorInvestigationBindingInfo;
import org.apache.hertzbeat.manager.pojo.dto.MonitorSignalView;
import org.apache.hertzbeat.manager.pojo.dto.MonitorSignalView.AlertPreview;
import org.apache.hertzbeat.manager.pojo.dto.MonitorSignalView.AlertsBlock;
import org.apache.hertzbeat.manager.pojo.dto.MonitorSignalView.BindingBlock;
import org.apache.hertzbeat.manager.pojo.dto.MonitorSignalView.CollectionBlock;
import org.apache.hertzbeat.manager.pojo.dto.MonitorSignalView.CollectionEvent;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEventQuery;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEventQueryResult;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Composes bounded collection, current-alert, and exact Entity binding evidence for one Monitor.
 */
@Service
public class MonitorInvestigationReadModelService {

    private static final String ACTIVE_BIND = "active";
    private static final String SERVICE_ENTITY = "service";
    private static final int ALERT_PREVIEW_LIMIT = 5;
    private static final int MAX_ALERT_STATUS_LENGTH = 64;
    private static final int MAX_ALERT_SEVERITY_LENGTH = 64;
    private static final int MAX_ALERT_SUMMARY_LENGTH = 512;

    private final EntityMonitorBindQueryService entityMonitorBindQueryService;
    private final EntityDetailObservabilityReadModelService entityDetailObservabilityReadModelService;
    private final EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final ObjectProvider<MonitorCollectionEventQueryRepository> collectionRepositoryProvider;

    public MonitorInvestigationReadModelService(
            EntityMonitorBindQueryService entityMonitorBindQueryService,
            EntityDetailObservabilityReadModelService entityDetailObservabilityReadModelService,
            EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService,
            EntityWorkspaceAccessService entityWorkspaceAccessService,
            ObjectProvider<MonitorCollectionEventQueryRepository> collectionRepositoryProvider) {
        this.entityMonitorBindQueryService = entityMonitorBindQueryService;
        this.entityDetailObservabilityReadModelService = entityDetailObservabilityReadModelService;
        this.entityAlertEvidenceReadModelService = entityAlertEvidenceReadModelService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.collectionRepositoryProvider = collectionRepositoryProvider;
    }

    /**
     * Reads one exact persisted Monitor over a bounded collection-evidence window.
     */
    public MonitorSignalView query(Monitor monitor, long start, long end) {
        long monitorId = requireMonitorId(monitor);
        validateWindow(start, end);
        return new MonitorSignalView(
                monitorId,
                new MonitorSignalView.Window(start, end),
                collection(monitorId, start, end),
                alerts(monitor),
                binding(monitorId));
    }

    private CollectionBlock collection(long monitorId, long start, long end) {
        try {
            MonitorCollectionEventQueryRepository repository = collectionRepositoryProvider.getIfAvailable();
            if (repository == null) {
                return CollectionBlock.unavailable();
            }
            MonitorCollectionEventQueryResult result = repository.query(
                    new MonitorCollectionEventQuery(monitorId, start, end));
            if (result == null || !result.available()) {
                return CollectionBlock.unavailable();
            }
            if (result.event() == null) {
                return CollectionBlock.empty();
            }
            var event = result.event();
            return CollectionBlock.ready(new CollectionEvent(
                    event.observedAt(),
                    event.durationMillis(),
                    event.outcome(),
                    event.collectorId(),
                    event.target(),
                    event.metricSet(),
                    event.failureClass(),
                    event.phase(),
                    event.fieldCount(),
                    event.rowCount()));
        } catch (RuntimeException exception) {
            return CollectionBlock.unavailable();
        }
    }

    private AlertsBlock alerts(Monitor monitor) {
        try {
            String workspaceId = entityWorkspaceAccessService.currentRequestWorkspaceId();
            Page<SingleAlert> page = entityAlertEvidenceReadModelService.queryActiveAlertPage(
                    List.of(monitor), 0, ALERT_PREVIEW_LIMIT, workspaceId);
            if (page == null || page.getTotalElements() < 0L) {
                return AlertsBlock.unavailable();
            }
            if (page.getTotalElements() == 0L) {
                return page.getContent().isEmpty() ? AlertsBlock.empty() : AlertsBlock.unavailable();
            }
            List<AlertPreview> previews = page.getContent().stream()
                    .limit(ALERT_PREVIEW_LIMIT)
                    .map(this::alertPreview)
                    .toList();
            if (previews.isEmpty()) {
                return AlertsBlock.unavailable();
            }
            return AlertsBlock.ready(page.getTotalElements(), previews);
        } catch (RuntimeException exception) {
            return AlertsBlock.unavailable();
        }
    }

    private AlertPreview alertPreview(SingleAlert alert) {
        if (alert == null || alert.getId() == null || alert.getId() <= 0L) {
            throw new IllegalArgumentException("Current alert preview is missing its persisted identity");
        }
        String status = boundedRequired(alert.getStatus(), MAX_ALERT_STATUS_LENGTH, "status")
                .toLowerCase(Locale.ROOT);
        if (!CommonConstants.ALERT_STATUS_FIRING.equals(status)) {
            throw new IllegalArgumentException("Current alert preview is not active");
        }
        String severity = firstText(
                mapValue(alert.getLabels(), "severity"),
                mapValue(alert.getLabels(), "priority"),
                mapValue(alert.getAnnotations(), "severity"));
        severity = boundedOptional(severity, MAX_ALERT_SEVERITY_LENGTH, "severity");
        if (severity != null) {
            severity = severity.toLowerCase(Locale.ROOT);
        }
        String summary = boundedOptional(
                mapValue(alert.getAnnotations(), "summary"), MAX_ALERT_SUMMARY_LENGTH, "summary");
        Long activeAt = alert.getActiveAt();
        if (activeAt != null && activeAt < 0L) {
            throw new IllegalArgumentException("Current alert activeAt is invalid");
        }
        return new AlertPreview(alert.getId(), status, severity, summary, activeAt);
    }

    private BindingBlock binding(long monitorId) {
        try {
            List<EntityMonitorBind> activeBinds = entityMonitorBindQueryService.findMonitorBindsByMonitorId(monitorId)
                    .stream()
                    .filter(bind -> isExactActiveBind(bind, monitorId))
                    .toList();
            if (activeBinds.isEmpty()) {
                return BindingBlock.empty();
            }
            if (activeBinds.size() != 1) {
                return BindingBlock.unavailable();
            }
            EntityMonitorBind bind = activeBinds.getFirst();
            EntityDetailDto detail = entityDetailObservabilityReadModelService.buildEntityDetail(bind.getEntityId());
            MonitorInvestigationBindingInfo identity = bindingIdentity(
                    monitorId, bind.getEntityId(), detail);
            return identity == null ? BindingBlock.unavailable() : BindingBlock.ready(identity);
        } catch (RuntimeException exception) {
            return BindingBlock.unavailable();
        }
    }

    private MonitorInvestigationBindingInfo bindingIdentity(long monitorId,
                                                             long entityId,
                                                             EntityDetailDto detail) {
        ObserveEntity entity = detail == null || detail.getEntity() == null ? null : detail.getEntity().getEntity();
        if (!validServiceEntity(entityId, entity) || !containsMonitor(detail, monitorId)) {
            return null;
        }
        List<String> signals = new ArrayList<>();
        if (!CollectionUtils.isEmpty(detail.getMetricEvidence())) {
            signals.add("metrics");
        }
        if (!CollectionUtils.isEmpty(detail.getLogEvidence())) {
            signals.add("logs");
        }
        if (!CollectionUtils.isEmpty(detail.getTraceEvidence())) {
            signals.add("traces");
        }
        return new MonitorInvestigationBindingInfo(
                monitorId,
                entityId,
                SERVICE_ENTITY,
                entity.getName().trim(),
                normalize(entity.getNamespace()),
                normalize(entity.getEnvironment()),
                signals);
    }

    private long requireMonitorId(Monitor monitor) {
        if (monitor == null || monitor.getId() == null || monitor.getId() <= 0L) {
            throw new IllegalArgumentException("monitor_signal_monitor_invalid");
        }
        return monitor.getId();
    }

    private void validateWindow(long start, long end) {
        if (start <= 0L || end <= start
                || end - start > MonitorCollectionEventQueryRepository.MAX_WINDOW_MILLIS) {
            throw new IllegalArgumentException("monitor_signal_window_invalid");
        }
    }

    private boolean isExactActiveBind(EntityMonitorBind bind, long monitorId) {
        return bind != null
                && Objects.equals(monitorId, bind.getMonitorId())
                && bind.getEntityId() != null
                && bind.getEntityId() > 0L
                && ACTIVE_BIND.equals(bind.getStatus());
    }

    private boolean validServiceEntity(long entityId, ObserveEntity entity) {
        return entity != null
                && Objects.equals(entityId, entity.getId())
                && SERVICE_ENTITY.equalsIgnoreCase(entity.getType())
                && StringUtils.hasText(entity.getName());
    }

    private boolean containsMonitor(EntityDetailDto detail, long monitorId) {
        return detail != null
                && !CollectionUtils.isEmpty(detail.getBoundMonitors())
                && detail.getBoundMonitors().stream()
                .anyMatch(monitor -> monitor != null && Objects.equals(monitorId, monitor.getId()));
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String mapValue(Map<String, String> values, String key) {
        return values == null ? null : values.get(key);
    }

    private String firstText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String boundedRequired(String value, int maximumLength, String field) {
        String normalized = boundedOptional(value, maximumLength, field);
        if (normalized == null) {
            throw new IllegalArgumentException("Current alert " + field + " is missing");
        }
        return normalized;
    }

    private String boundedOptional(String value, int maximumLength, String field) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maximumLength) {
            throw new IllegalArgumentException("Current alert " + field + " exceeds its preview bound");
        }
        return normalized;
    }
}
