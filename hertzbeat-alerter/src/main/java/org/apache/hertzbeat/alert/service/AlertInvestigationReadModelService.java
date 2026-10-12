/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.AlertHeader;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.AlertIdentity;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.CollectionBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.CollectionEvent;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.IdentityBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.LogsBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.MetricsBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.TopologyBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.TraceStatus;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.TraceSummary;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.TracesBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.Window;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationReason;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationWindow;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.IdentityQuery;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.RowsResult;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.Status;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.TraceSummaryRow;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEvent;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEventQuery;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/** Composes one honest bounded investigation for an exact workspace-scoped persisted alert. */
@Service
public class AlertInvestigationReadModelService {

    private static final String SERVICE_NAME = "service.name";
    private static final String SERVICE_NAMESPACE = "service.namespace";
    private static final String DEPLOYMENT_ENVIRONMENT = "deployment.environment.name";
    private static final String SUMMARY = "summary";

    private final AlertService alertService;
    private final ObjectProvider<InvestigationQueryRepository> signalProvider;
    private final ObjectProvider<MonitorCollectionEventQueryRepository> collectionProvider;

    public AlertInvestigationReadModelService(
            AlertService alertService,
            ObjectProvider<InvestigationQueryRepository> signalProvider,
            ObjectProvider<MonitorCollectionEventQueryRepository> collectionProvider) {
        this.alertService = alertService;
        this.signalProvider = signalProvider;
        this.collectionProvider = collectionProvider;
    }

    /** Query one exact alert investigation. */
    public AlertInvestigationView query(String workspaceId, long alertId, long start, long end) {
        requireRequest(workspaceId, alertId, start, end);
        SingleAlert alert = alertService.findSingleAlert(workspaceId, alertId)
                .filter(value -> alertId == Objects.requireNonNullElse(value.getId(), -1L))
                .filter(value -> workspaceId.equals(value.getWorkspaceId()))
                .orElseThrow(AlertInvestigationNotFoundException::new);
        long anchor = anchor(alert, start, end);
        Map<String, String> labels = immutable(alert.getLabels());
        Map<String, String> annotations = immutable(alert.getAnnotations());
        AlertHeader header = new AlertHeader(labels.get(CommonConstants.LABEL_ALERT_NAME), alert.getStatus(),
                labels.get(CommonConstants.LABEL_ALERT_SEVERITY), annotations.get(SUMMARY), alert.getContent(),
                labels, annotations);
        IdentityResolution resolution = identity(labels);
        IdentityBlock identityBlock = resolution.malformed()
                ? IdentityBlock.unavailable(InvestigationReason.MALFORMED_DATA)
                : resolution.identity() == null ? IdentityBlock.unavailable()
                : IdentityBlock.ready(resolution.identity());
        if (resolution.malformed()) {
            return new AlertInvestigationView(alertId, new Window(start, end, anchor), header, identityBlock,
                    MetricsBlock.unavailable(InvestigationReason.QUERY_STRATEGY_UNAVAILABLE),
                    LogsBlock.unavailable(InvestigationReason.MALFORMED_DATA),
                    TracesBlock.unavailable(InvestigationReason.MALFORMED_DATA),
                    TopologyBlock.unavailable(InvestigationReason.IDENTITY_UNAVAILABLE),
                    CollectionBlock.unavailable(InvestigationReason.MALFORMED_DATA));
        }
        AlertIdentity identity = resolution.identity();
        SignalBlocks signals = signals(workspaceId, identity, start, end);
        return new AlertInvestigationView(alertId, new Window(start, end, anchor), header, identityBlock,
                MetricsBlock.unavailable(InvestigationReason.QUERY_STRATEGY_UNAVAILABLE),
                signals.logs(), signals.traces(), topology(identity), collection(identity, start, end));
    }

    private SignalBlocks signals(String workspaceId, AlertIdentity identity, long start, long end) {
        if (identity == null || identity.serviceName() == null) {
            return new SignalBlocks(LogsBlock.unavailable(InvestigationReason.IDENTITY_UNAVAILABLE),
                    TracesBlock.unavailable(InvestigationReason.IDENTITY_UNAVAILABLE));
        }
        InvestigationQueryRepository repository;
        try {
            repository = signalProvider.getIfAvailable();
        } catch (RuntimeException exception) {
            repository = null;
        }
        if (repository == null) {
            return new SignalBlocks(LogsBlock.unavailable(InvestigationReason.STORAGE_UNAVAILABLE),
                    TracesBlock.unavailable(InvestigationReason.STORAGE_UNAVAILABLE));
        }
        IdentityQuery query = new IdentityQuery(workspaceId,
                identity.entityId() == null ? null : Long.toString(identity.entityId()), identity.serviceName(),
                identity.serviceNamespace(), identity.deploymentEnvironment(), start, end);
        LogsBlock logs;
        try {
            logs = logs(repository.identityLogs(query));
        } catch (RuntimeException exception) {
            logs = LogsBlock.unavailable(InvestigationReason.STORAGE_UNAVAILABLE);
        }
        TracesBlock traces;
        try {
            traces = traces(repository.identityTraces(query));
        } catch (RuntimeException exception) {
            traces = TracesBlock.unavailable(InvestigationReason.STORAGE_UNAVAILABLE);
        }
        return new SignalBlocks(logs, traces);
    }

    private LogsBlock logs(RowsResult<org.apache.hertzbeat.common.observability.dto.investigation.InvestigationLogRecord>
                                   result) {
        if (result.status() != Status.AVAILABLE) {
            return LogsBlock.unavailable(reason(result.status()));
        }
        return result.rows().isEmpty() ? LogsBlock.empty() : LogsBlock.ready(result.rows(), result.truncated());
    }

    private TracesBlock traces(RowsResult<TraceSummaryRow> result) {
        if (result.status() != Status.AVAILABLE) {
            return TracesBlock.unavailable(reason(result.status()));
        }
        if (result.rows().isEmpty()) {
            return TracesBlock.empty();
        }
        try {
            List<TraceSummary> traces = result.rows().stream().map(row -> new TraceSummary(
                    row.traceId(), row.startTimeUnixNano(), row.durationNanos(), traceStatus(row.status()),
                    row.spanCount(), row.serviceName())).toList();
            return TracesBlock.ready(traces, result.truncated());
        } catch (IllegalArgumentException exception) {
            return TracesBlock.unavailable(InvestigationReason.MALFORMED_DATA);
        }
    }

    private TopologyBlock topology(AlertIdentity identity) {
        // Alerts persist no canonical entity-type label, so a semantic graph key cannot be constructed honestly.
        return TopologyBlock.unavailable(InvestigationReason.IDENTITY_UNAVAILABLE);
    }

    private CollectionBlock collection(AlertIdentity identity, long start, long end) {
        if (identity == null || identity.monitorId() == null) {
            return CollectionBlock.unavailable(InvestigationReason.IDENTITY_UNAVAILABLE);
        }
        try {
            MonitorCollectionEventQueryRepository repository = collectionProvider.getIfAvailable();
            if (repository == null) {
                return CollectionBlock.unavailable(InvestigationReason.STORAGE_UNAVAILABLE);
            }
            var result = repository.query(new MonitorCollectionEventQuery(identity.monitorId(), start, end));
            if (!result.available()) {
                return CollectionBlock.unavailable(InvestigationReason.STORAGE_UNAVAILABLE);
            }
            if (result.event() == null) {
                return CollectionBlock.empty();
            }
            MonitorCollectionEvent value = result.event();
            if (value.observedAt() < start || value.observedAt() >= end) {
                return CollectionBlock.unavailable(InvestigationReason.MALFORMED_DATA);
            }
            return CollectionBlock.ready(new CollectionEvent(value.observedAt(), value.durationMillis(),
                    value.outcome(), value.collectorId(), value.target(), value.metricSet(), value.failureClass(),
                    value.phase(), value.fieldCount(), value.rowCount()));
        } catch (IllegalArgumentException exception) {
            return CollectionBlock.unavailable(InvestigationReason.MALFORMED_DATA);
        } catch (RuntimeException exception) {
            return CollectionBlock.unavailable(InvestigationReason.STORAGE_UNAVAILABLE);
        }
    }

    private IdentityResolution identity(Map<String, String> labels) {
        try {
            String serviceName = label(labels, SERVICE_NAME, 256);
            String namespace = label(labels, SERVICE_NAMESPACE, 256);
            String environment = label(labels, DEPLOYMENT_ENVIRONMENT, 128);
            Long entityId = positiveLabel(labels, CommonConstants.LABEL_ENTITY_ID);
            Long monitorId = positiveLabel(labels, CommonConstants.LABEL_MONITOR_ID);
            if (serviceName == null && entityId == null && monitorId == null) {
                return new IdentityResolution(null, false);
            }
            return new IdentityResolution(new AlertIdentity(serviceName, namespace, environment, entityId, null,
                    monitorId, null, null), false);
        } catch (IllegalArgumentException exception) {
            return new IdentityResolution(null, true);
        }
    }

    private String label(Map<String, String> labels, String key, int maximum) {
        String value = labels.get(key);
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maximum || normalized.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Malformed canonical alert label");
        }
        return normalized;
    }

    private Long positiveLabel(Map<String, String> labels, String key) {
        String value = label(labels, key, 19);
        if (value == null) {
            return null;
        }
        try {
            long parsed = Long.parseLong(value);
            if (parsed <= 0L) {
                throw new IllegalArgumentException("Non-positive canonical alert label");
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Malformed canonical alert label", exception);
        }
    }

    private long anchor(SingleAlert alert, long start, long end) {
        Long anchor = alert.getActiveAt() != null ? alert.getActiveAt() : alert.getStartAt();
        if (anchor == null || anchor < start || anchor >= end) {
            throw new AlertInvestigationRequestException();
        }
        return anchor;
    }

    private void requireRequest(String workspaceId, long alertId, long start, long end) {
        try {
            new InvestigationWindow(start, end);
            if (alertId <= 0L || workspaceId == null || workspaceId.isBlank() || workspaceId.length() > 128
                    || workspaceId.codePoints().anyMatch(Character::isISOControl)) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException exception) {
            throw new AlertInvestigationRequestException();
        }
    }

    private Map<String, String> immutable(Map<String, String> values) {
        return values == null ? Map.of() : Map.copyOf(values);
    }

    private TraceStatus traceStatus(String status) {
        return switch (status) {
            case "error" -> TraceStatus.ERROR;
            case "ok" -> TraceStatus.OK;
            case "unset" -> TraceStatus.UNSET;
            case "unknown" -> TraceStatus.UNKNOWN;
            default -> throw new IllegalArgumentException("Malformed trace status");
        };
    }

    private InvestigationReason reason(Status status) {
        return switch (status) {
            case AVAILABLE -> InvestigationReason.OBSERVED;
            case STORAGE_UNAVAILABLE -> InvestigationReason.STORAGE_UNAVAILABLE;
            case MALFORMED_DATA -> InvestigationReason.MALFORMED_DATA;
            case LIMIT_EXCEEDED -> InvestigationReason.LIMIT_EXCEEDED;
        };
    }

    private record IdentityResolution(AlertIdentity identity, boolean malformed) {
    }

    private record SignalBlocks(LogsBlock logs, TracesBlock traces) {
    }
}
