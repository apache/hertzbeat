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

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.Comparator;
import org.apache.hertzbeat.common.entity.observability.TelemetryIntakeSignalEvent;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryBindingResult;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityTriageRecommendation;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.gateway.TelemetryEvidenceGateway;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.metrics.MetricCorrelationHint;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;
import org.apache.hertzbeat.common.observability.model.EntityCanonicalIdentityRegistry;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.warehouse.repository.LogQueryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

/**
 * Default telemetry intake/read-model service.
 */
@Service
public class TelemetryIntakeServiceImpl implements TelemetryEvidenceGateway {

    private static final String SIGNAL_METRICS = "metrics";
    private static final String SIGNAL_LOGS = "logs";
    private static final String SIGNAL_TRACES = "traces";
    private static final String SOURCE_MONITOR = "monitor";
    private static final String SOURCE_OTLP = "otlp";
    private static final String FOCUS_METRICS = "metrics";
    private static final String FOCUS_LOGS = "logs";
    private static final String FOCUS_TRACES = "traces";
    private static final String FOCUS_EVIDENCE = "evidence";
    private static final long CORRELATION_WINDOW_MILLIS = Duration.ofMinutes(15).toMillis();
    private static final int MAX_RECENT_METRIC_SIGNALS = 256;
    private static final int MAX_RECENT_LOG_SIGNALS = 256;
    private static final int MAX_RECENT_TRACE_SIGNALS = 256;
    private static final String OTLP_METRIC_METADATA_PREFIX = "otlp.metric.";
    private static final String OTLP_METRIC_COMPATIBILITY = "otlp.metric.compatibility";
    private static final String OTLP_METRIC_COMPATIBILITY_REASON = "otlp.metric.compatibility.reason";
    private static final String OTLP_METRIC_GREPTIME_COMPATIBILITY = "otlp.metric.greptime.compatibility";
    private static final String OTLP_METRIC_FACADE_COMPATIBILITY = "otlp.metric.facade.compatibility";
    private static final String OTLP_METRIC_AGGREGATION_TEMPORALITY = "otlp.metric.aggregation_temporality";
    private static final String OTLP_METRIC_MONOTONIC = "otlp.metric.monotonic";
    private static final String OTLP_METRIC_SUMMARY_QUANTILES = "otlp.metric.summary.quantiles";
    private static final String OTLP_METRIC_HISTOGRAM_BUCKET_COUNTS = "otlp.metric.histogram.bucket_counts";
    private static final String OTLP_METRIC_HISTOGRAM_EXPLICIT_BOUNDS = "otlp.metric.histogram.explicit_bounds";
    private static final String HERTZBEAT_ENTITY_ID = OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID;
    private static final String HERTZBEAT_ENTITY_TYPE = OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE;
    private static final String HERTZBEAT_ENTITY_NAME = OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_NAME;
    private static final String HERTZBEAT_WORKSPACE_ID = OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID;
    private static final Set<String> WORKSPACE_INFRA_SERVICE_NAMES = Set.of(
            "otelcol-contrib",
            "otel-collector",
            "opentelemetry-collector",
            "jaeger",
            "prometheus",
            "grafana",
            "opensearch",
            "frontend-proxy"
    );

    private final ConcurrentLinkedDeque<RecentMetricSignal> recentMetricSignals = new ConcurrentLinkedDeque<>();
    private final ConcurrentLinkedDeque<RecentLogSignal> recentLogSignals = new ConcurrentLinkedDeque<>();
    private final ConcurrentLinkedDeque<RecentTraceSignal> recentTraceSignals = new ConcurrentLinkedDeque<>();
    private final LogQueryRepository logQueryRepository;

    @Autowired
    public TelemetryIntakeServiceImpl(LogQueryRepository logQueryRepository) {
        this.logQueryRepository = logQueryRepository;
    }

    @EventListener
    public void handleTelemetryIntakeSignalEvent(TelemetryIntakeSignalEvent event) {
        if (event == null || !StringUtils.hasText(event.getSignal())) {
            return;
        }
        switch (event.getSignal()) {
            case SIGNAL_LOGS -> recordOtlpLogIntake(
                    event.getResourceAttributes(),
                    event.getObservedAt(),
                    event.getBody(),
                    event.getSeverityText(),
                    event.getTraceId(),
                    event.getSpanId(),
                    event.getAttributes()
            );
            case SIGNAL_TRACES -> recordOtlpTraceIntake(
                    event.getResourceAttributes(),
                    event.getObservedAt(),
                    event.getTraceId(),
                    event.getSpanId(),
                    event.getBody(),
                    null,
                    event.getAttributes()
            );
            case SIGNAL_METRICS -> recordOtlpMetricIntake(
                    event.getResourceAttributes(),
                    event.getObservedAt(),
                    event.getMetricName(),
                    event.getMetricType(),
                    event.getUnit(),
                    event.getValue(),
                    event.getAttributes()
            );
            default -> {
                // ignore unsupported signal types
            }
        }
    }

    @Override
    public void recordOtlpMetricIntake(Map<String, String> resourceAttributes,
                                       Long observedAt,
                                       String metricName,
                                       String metricType,
                                       String unit,
                                       Double value,
                                       Map<String, String> attributes) {
        Map<String, String> canonicalIdentities = extractCanonicalStringMap(resourceAttributes);
        if (canonicalIdentities.isEmpty()) {
            return;
        }
        RecentMetricSignal signal = new RecentMetricSignal(
                canonicalIdentities,
                observedAt,
                metricName,
                metricType,
                unit,
                value,
                attributes == null ? Collections.emptyMap() : new LinkedHashMap<>(attributes)
        );
        recentMetricSignals.addFirst(signal);
        trimRecentMetricSignals();
    }

    @Override
    public void recordOtlpLogIntake(Map<String, String> resourceAttributes,
                                    Long observedAt,
                                    String body,
                                    String severityText,
                                    String traceId,
                                    String spanId,
                                    Map<String, String> attributes) {
        Map<String, String> canonicalIdentities = extractCanonicalStringMap(resourceAttributes);
        if (canonicalIdentities.isEmpty()) {
            return;
        }
        recentLogSignals.addFirst(new RecentLogSignal(
                canonicalIdentities,
                observedAt,
                trimToNull(body),
                trimToNull(severityText),
                trimToNull(traceId),
                trimToNull(spanId),
                resourceAttributes == null ? Collections.emptyMap() : new LinkedHashMap<>(resourceAttributes),
                attributes == null ? Collections.emptyMap() : new LinkedHashMap<>(attributes)
        ));
        trimRecentLogSignals();
    }

    @Override
    public void recordOtlpTraceIntake(Map<String, String> resourceAttributes,
                                      Long observedAt,
                                      String traceId,
                                      String spanId,
                                      String spanName,
                                      String errorState,
                                      Map<String, String> spanAttributes) {
        Map<String, String> canonicalIdentities = extractCanonicalStringMap(resourceAttributes);
        if (canonicalIdentities.isEmpty()) {
            return;
        }
        recentTraceSignals.addFirst(new RecentTraceSignal(
                canonicalIdentities,
                observedAt,
                trimToNull(traceId),
                trimToNull(spanId),
                trimToNull(spanName),
                canonicalIdentities.get("service.name"),
                canonicalIdentities.get("service.namespace"),
                trimToNull(errorState),
                resourceAttributes == null ? Collections.emptyMap() : new LinkedHashMap<>(resourceAttributes),
                spanAttributes == null ? Collections.emptyMap() : new LinkedHashMap<>(spanAttributes)
        ));
        trimRecentTraceSignals();
    }

    @Override
    public List<TelemetryIdentitySnapshot> collectRecentIdentitySnapshots(List<LogEntry> logs,
                                                                          List<TraceListItemDto> traces,
                                                                          List<Monitor> monitors) {
        List<TelemetryIdentitySnapshot> snapshots = new ArrayList<>();
        if (!CollectionUtils.isEmpty(logs)) {
            for (LogEntry log : logs) {
                Map<String, String> canonicalIdentities = extractCanonicalStringMap(log == null ? null : log.getResource());
                if (canonicalIdentities.isEmpty()) {
                    continue;
                }
                snapshots.add(new TelemetryIdentitySnapshot(
                        SOURCE_OTLP,
                        SIGNAL_LOGS,
                        canonicalIdentities,
                        canonicalIdentities.get("service.name"),
                        canonicalIdentities.get("service.namespace"),
                        canonicalIdentities.get("deployment.environment.name"),
                        canonicalIdentities.get("service.instance.id"),
                        canonicalIdentities.get("host.name"),
                        log == null || log.getTimeUnixNano() == null ? null : log.getTimeUnixNano() / 1_000_000L
                ));
            }
        }
        if (!CollectionUtils.isEmpty(traces)) {
            for (TraceListItemDto trace : traces) {
                Map<String, String> canonicalIdentities = extractCanonicalStringMap(trace == null ? null : trace.getResourceAttributes());
                if (canonicalIdentities.isEmpty()) {
                    continue;
                }
                snapshots.add(new TelemetryIdentitySnapshot(
                        SOURCE_OTLP,
                        SIGNAL_TRACES,
                        canonicalIdentities,
                        canonicalIdentities.get("service.name"),
                        canonicalIdentities.get("service.namespace"),
                        canonicalIdentities.get("deployment.environment.name"),
                        canonicalIdentities.get("service.instance.id"),
                        canonicalIdentities.get("host.name"),
                        toLong(trace == null ? null : trace.getStartTime())
                ));
            }
        }
        if (!CollectionUtils.isEmpty(monitors)) {
            for (Monitor monitor : monitors) {
                Map<String, String> canonicalIdentities = extractCanonicalStringMap(monitor == null ? null : monitor.getLabels());
                if (canonicalIdentities.isEmpty()) {
                    continue;
                }
                snapshots.add(new TelemetryIdentitySnapshot(
                        SOURCE_MONITOR,
                        SIGNAL_METRICS,
                        canonicalIdentities,
                        canonicalIdentities.get("service.name"),
                        canonicalIdentities.get("service.namespace"),
                        canonicalIdentities.get("deployment.environment.name"),
                        canonicalIdentities.get("service.instance.id"),
                        canonicalIdentities.get("host.name"),
                        toEpochMillis(monitor == null ? null : monitor.getGmtUpdate())
                ));
            }
        }
        for (RecentMetricSignal signal : recentMetricSignals) {
            snapshots.add(new TelemetryIdentitySnapshot(
                    SOURCE_OTLP,
                    SIGNAL_METRICS,
                    signal.canonicalIdentities(),
                    signal.canonicalIdentities().get("service.name"),
                    signal.canonicalIdentities().get("service.namespace"),
                    signal.canonicalIdentities().get("deployment.environment.name"),
                    signal.canonicalIdentities().get("service.instance.id"),
                    signal.canonicalIdentities().get("host.name"),
                    signal.observedAt()
            ));
        }
        for (RecentLogSignal signal : recentLogSignals) {
            snapshots.add(new TelemetryIdentitySnapshot(
                    SOURCE_OTLP,
                    SIGNAL_LOGS,
                    signal.canonicalIdentities(),
                    signal.canonicalIdentities().get("service.name"),
                    signal.canonicalIdentities().get("service.namespace"),
                    signal.canonicalIdentities().get("deployment.environment.name"),
                    signal.canonicalIdentities().get("service.instance.id"),
                    signal.canonicalIdentities().get("host.name"),
                    signal.observedAt()
            ));
        }
        for (RecentTraceSignal signal : recentTraceSignals) {
            snapshots.add(new TelemetryIdentitySnapshot(
                    SOURCE_OTLP,
                    SIGNAL_TRACES,
                    signal.canonicalIdentities(),
                    signal.canonicalIdentities().get("service.name"),
                    signal.canonicalIdentities().get("service.namespace"),
                    signal.canonicalIdentities().get("deployment.environment.name"),
                    signal.canonicalIdentities().get("service.instance.id"),
                    signal.canonicalIdentities().get("host.name"),
                    signal.observedAt()
            ));
        }
        return snapshots;
    }

    @Override
    public List<TelemetryIdentitySnapshot> collectRecentExternalIdentitySnapshots(List<LogEntry> logs,
                                                                                  List<TraceListItemDto> traces,
                                                                                  List<Monitor> monitors) {
        return collectRecentIdentitySnapshots(logs, traces, monitors).stream()
                .filter(snapshot -> !isSelfTelemetrySnapshot(snapshot))
                .filter(snapshot -> !isWorkspaceNoiseSnapshot(snapshot))
                .toList();
    }

    @Override
    public TelemetryIdentitySnapshot resolveRecentOtlpMetricContext(String serviceName,
                                                                    String serviceNamespace,
                                                                    String environment) {
        String requiredServiceName = normalizeValue(serviceName);
        String requiredServiceNamespace = normalizeValue(serviceNamespace);
        String requiredEnvironment = normalizeValue(environment);
        for (RecentMetricSignal signal : orderedMetricSignals()) {
            if (!matchesMetricContext(signal.canonicalIdentities(),
                    requiredServiceName, requiredServiceNamespace, requiredEnvironment)) {
                continue;
            }
            TelemetryIdentitySnapshot snapshot = buildMetricIdentitySnapshot(signal);
            if (!StringUtils.hasText(requiredServiceName) && isWorkspaceNoiseSnapshot(snapshot)) {
                continue;
            }
            if (!StringUtils.hasText(snapshot.getServiceName()) && !StringUtils.hasText(requiredServiceName)) {
                continue;
            }
            return snapshot;
        }
        return null;
    }

    @Override
    public List<TelemetryIdentitySnapshot> collectRecentOtlpMetricContexts(int limit) {
        int resolvedLimit = limit <= 0 ? 1 : limit;
        LinkedHashMap<String, TelemetryIdentitySnapshot> contexts = new LinkedHashMap<>();
        for (RecentMetricSignal signal : orderedMetricSignals()) {
            TelemetryIdentitySnapshot snapshot = buildMetricIdentitySnapshot(signal);
            if (!StringUtils.hasText(snapshot.getServiceName())
                    || isSelfTelemetrySnapshot(snapshot)
                    || isWorkspaceNoiseSnapshot(snapshot)) {
                continue;
            }
            String contextKey = String.join("|",
                    defaultText(normalizeValue(snapshot.getServiceName()), ""),
                    defaultText(normalizeValue(snapshot.getServiceNamespace()), ""),
                    defaultText(normalizeValue(snapshot.getEnvironmentName()), ""));
            if (contexts.containsKey(contextKey)) {
                continue;
            }
            contexts.put(contextKey, snapshot);
            if (contexts.size() >= resolvedLimit) {
                break;
            }
        }
        return List.copyOf(contexts.values());
    }

    @Override
    public List<String> collectRecentOtlpMetricNames(String serviceName,
                                                     String serviceNamespace,
                                                     String environment,
                                                     int limit) {
        String requiredServiceName = normalizeValue(serviceName);
        String requiredServiceNamespace = normalizeValue(serviceNamespace);
        String requiredEnvironment = normalizeValue(environment);
        int resolvedLimit = limit <= 0 ? 1 : limit;
        List<MetricNameCandidate> candidates = new ArrayList<>();
        long sequence = 0L;
        for (RecentMetricSignal signal : orderedMetricSignals()) {
            if (!matchesMetricContext(signal.canonicalIdentities(),
                    requiredServiceName, requiredServiceNamespace, requiredEnvironment)) {
                continue;
            }
            for (String metricName : prometheusMetricNameCandidates(signal)) {
                if (!StringUtils.hasText(metricName)) {
                    continue;
                }
                candidates.add(new MetricNameCandidate(
                        metricName,
                        signal.observedAt(),
                        metricNamePriority(metricName),
                        sequence++
                ));
            }
        }
        LinkedHashSet<String> metricNames = new LinkedHashSet<>();
        candidates.stream()
                .sorted(Comparator
                        .comparingInt(MetricNameCandidate::priority)
                        .thenComparing(MetricNameCandidate::observedAt,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparingLong(MetricNameCandidate::sequence))
                .map(MetricNameCandidate::metricName)
                .filter(StringUtils::hasText)
                .forEach(metricName -> {
                    if (metricNames.size() < resolvedLimit) {
                        metricNames.add(metricName);
                    }
                });
        return List.copyOf(metricNames);
    }

    private int metricNamePriority(String metricName) {
        String normalized = trimToNull(metricName);
        if (!StringUtils.hasText(normalized)) {
            return Integer.MAX_VALUE;
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (normalized.startsWith("hertzbeat_demo_")) {
            return 0;
        }
        if (normalized.startsWith("hertzbeat_")) {
            return 1;
        }
        if (normalized.contains("http_server") && normalized.endsWith("_count")) {
            return 2;
        }
        if (normalized.contains("rpc_server") && normalized.endsWith("_count")) {
            return 3;
        }
        if (normalized.contains("request_duration_count")) {
            return 4;
        }
        if (normalized.contains("duration_count")) {
            return 5;
        }
        if (normalized.endsWith("_count")) {
            return 6;
        }
        if (normalized.contains("active_requests")) {
            return 7;
        }
        if (normalized.startsWith("system_")
                || normalized.startsWith("jvm_")
                || normalized.startsWith("postgresql_")) {
            return 50;
        }
        if (normalized.endsWith("_sum")) {
            return 8;
        }
        if (normalized.endsWith("_bucket")) {
            return 10;
        }
        return 9;
    }

    private record MetricNameCandidate(String metricName, Long observedAt, int priority, long sequence) {
    }

    private List<String> prometheusMetricNameCandidates(RecentMetricSignal signal) {
        if (signal == null) {
            return List.of();
        }
        String metricName = trimToNull(signal.metricName());
        if (!StringUtils.hasText(metricName)) {
            return List.of();
        }
        String unitSuffix = prometheusUnitSuffix(signal.unit());
        if (!StringUtils.hasText(unitSuffix)) {
            return List.of(metricName);
        }
        String normalizedMetricName = normalizePrometheusName(metricName);
        if (!StringUtils.hasText(normalizedMetricName)
                || normalizedMetricName.endsWith("_" + unitSuffix)) {
            return List.of(metricName);
        }
        return List.of(metricName + "_" + unitSuffix, metricName);
    }

    private String prometheusUnitSuffix(String unit) {
        String normalized = normalizeValue(unit);
        if (!StringUtils.hasText(normalized) || "1".equals(normalized)) {
            return null;
        }
        return switch (normalized) {
            case "ms", "millisecond", "milliseconds" -> "milliseconds";
            case "s", "sec", "secs", "second", "seconds" -> "seconds";
            case "us", "microsecond", "microseconds" -> "microseconds";
            case "ns", "nanosecond", "nanoseconds" -> "nanoseconds";
            case "by", "byte", "bytes" -> "bytes";
            case "bit", "bits" -> "bits";
            case "%", "percent", "percentage" -> "percent";
            default -> normalizePrometheusName(normalized);
        };
    }

    private String normalizePrometheusName(String value) {
        String normalized = trimToNull(value);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        normalized = normalized.replaceAll("[^A-Za-z0-9_:]", "_");
        normalized = normalized.replaceAll("_+", "_");
        if (!normalized.isEmpty() && Character.isDigit(normalized.charAt(0))) {
            normalized = "_" + normalized;
        }
        return normalized;
    }

    private List<RecentMetricSignal> orderedMetricSignals() {
        return recentMetricSignals.stream()
                .sorted(Comparator
                        .comparing(RecentMetricSignal::observedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(signal -> defaultText(normalizeValue(signal.metricName()), ""))
                )
                .toList();
    }

    @Override
    public List<MetricEvidence> buildMetricEvidence(ObservedEntityContext entityContext, EntityStatusInfo statusInfo,
                                                    List<Monitor> monitors) {
        long entityId = entityContext == null || entityContext.getEntity() == null || entityContext.getEntity().getId() == null
                ? 0L
                : entityContext.getEntity().getId();
        List<MetricEvidence> evidenceList = new ArrayList<>();
        if (!CollectionUtils.isEmpty(monitors)) {
            TelemetryIdentitySnapshot identitySnapshot =
                    buildEntityIdentitySnapshot(entityContext, SOURCE_MONITOR, SIGNAL_METRICS, latestMonitorObservedAt(monitors));
            TelemetryBindingResult bindingResult = buildBindingResult(entityContext, SOURCE_MONITOR, SIGNAL_METRICS);
            Monitor preferredMonitor = monitors.stream()
                    .filter(Objects::nonNull)
                    .filter(monitor -> Objects.equals(monitor.getStatus(), (byte) 2))
                    .findFirst()
                    .orElseGet(() -> monitors.stream().filter(Objects::nonNull).findFirst().orElse(null));
            int downCount = statusInfo == null ? 0 : statusInfo.getMonitorDownCount();
            int healthyCount = statusInfo == null ? monitors.size() : statusInfo.getMonitorUpCount();
            String severity = downCount > 0 ? "degraded" : (healthyCount > 0 ? "healthy" : "unknown");
            Map<String, String> attributes = new LinkedHashMap<>();
            attributes.put("boundMonitors", String.valueOf(monitors.size()));
            attributes.put("downMonitors", String.valueOf(downCount));
            attributes.put("healthyMonitors", String.valueOf(healthyCount));
            String queryHint = monitors.stream()
                    .filter(monitor -> monitor != null && Objects.equals(monitor.getStatus(), (byte) 2))
                    .map(Monitor::getName)
                    .filter(StringUtils::hasText)
                    .findFirst()
                    .orElseGet(() -> monitors.stream().map(Monitor::getName).filter(StringUtils::hasText).findFirst().orElse(null));
            evidenceList.add(new MetricEvidence(
                    SOURCE_MONITOR,
                    SIGNAL_METRICS,
                    entityId == 0L ? null : entityId,
                    identitySnapshot,
                    latestMonitorObservedAt(monitors),
                    severity,
                    queryHint,
                    bindingResult,
                    buildMetricCorrelationHint(entityContext, identitySnapshot, latestMonitorObservedAt(monitors), queryHint),
                    buildCodeNavigationHint(entityContext, identitySnapshot.getCanonicalIdentities(), Collections.emptyMap(),
                            preferredMonitor == null ? Collections.emptyList() : List.of(defaultText(preferredMonitor.getName(), preferredMonitor.getInstance())),
                            defaultText(preferredMonitor == null ? null : preferredMonitor.getName(), "monitor")),
                    "entity.monitor.availability",
                    ObservabilityMessages.get("observability.telemetry.metric.entity-monitor-status"),
                    "summary",
                    "count",
                    (double) healthyCount,
                    attributes,
                    monitors.stream().map(Monitor::getApp).filter(StringUtils::hasText).distinct().findFirst().orElse(null),
                    null
            ));
        }
        evidenceList.addAll(buildOtlpMetricEvidence(entityContext, entityId));
        return evidenceList;
    }

    @Override
    public List<LogEvidence> buildLogEvidence(ObservedEntityContext entityContext, EntityLogSummaryInfo logSummary,
                                              List<EntityLogQueryHint> logQueryHints) {
        long entityId = entityId(entityContext);
        if (entityContext == null || entityId == 0L) {
            return Collections.emptyList();
        }
        Set<String> entityIdentityKeys = entityIdentityKeySet(entityContext);
        Map<String, String> entityIdentityValues = entityIdentityValueMap(entityContext);
        EntityLogQueryHint preferredHint = CollectionUtils.isEmpty(logQueryHints) ? null : logQueryHints.getFirst();
        TelemetryBindingResult bindingResult = buildBindingResult(entityContext, SOURCE_OTLP, SIGNAL_LOGS);
        List<LogEvidence> results = new ArrayList<>();
        for (RecentLogSignal signal : recentLogSignals) {
            if (!matchesEntitySignal(signal.canonicalIdentities(), entityIdentityKeys, entityIdentityValues, entityId)) {
                continue;
            }
            Map<String, String> snapshotIdentities =
                    enrichCanonicalIdentitiesWithEntityContext(signal.canonicalIdentities(), entityContext);
            TelemetryIdentitySnapshot identitySnapshot = new TelemetryIdentitySnapshot(
                    SOURCE_OTLP,
                    SIGNAL_LOGS,
                    snapshotIdentities,
                    snapshotIdentities.get("service.name"),
                    snapshotIdentities.get("service.namespace"),
                    snapshotIdentities.get("deployment.environment.name"),
                    snapshotIdentities.get("service.instance.id"),
                    snapshotIdentities.get("host.name"),
                    signal.observedAt()
            );
            List<String> searchTerms = preferredHint == null || CollectionUtils.isEmpty(preferredHint.getSearchTerms())
                    ? buildFallbackSearchTerms(signal.traceId(), signal.spanId(), signal.body())
                    : preferredHint.getSearchTerms();
            String queryHint = firstNonBlank(signal.traceId(),
                    signal.body(),
                    preferredHint == null ? null : preferredHint.getTitle(),
                    logSummary == null ? null : logSummary.getFallbackSearchTerm());
            Map<String, String> resource = signal.resource() == null || signal.resource().isEmpty()
                    ? preferredHint == null || preferredHint.getResourceFilters() == null ? Collections.emptyMap() : preferredHint.getResourceFilters()
                    : signal.resource();
            results.add(new LogEvidence(
                    SOURCE_OTLP,
                    SIGNAL_LOGS,
                    entityId == 0L ? null : entityId,
                    identitySnapshot,
                    signal.observedAt(),
                    defaultText(signal.severityText(), "attention"),
                    queryHint,
                    bindingResult,
                    buildCodeNavigationHint(entityContext, resource, signal.attributes(), searchTerms, signal.body()),
                    defaultText(signal.body(), defaultText(logSummary == null ? null : logSummary.getPreferredQueryTitle(), queryHint)),
                    signal.severityText(),
                    signal.traceId(),
                    signal.spanId(),
                    resource,
                    searchTerms
            ));
        }
        if (results.isEmpty()) {
            results.addAll(buildStoredLogEvidence(entityContext, entityId, entityIdentityKeys, preferredHint, logSummary, bindingResult));
        }
        if (!results.isEmpty()) {
            return results;
        }
        if (preferredHint == null && !hasLogSummaryQuerySignal(logSummary)) {
            return Collections.emptyList();
        }
        Map<String, String> resource = preferredHint == null || preferredHint.getResourceFilters() == null
                ? Collections.emptyMap()
                : preferredHint.getResourceFilters();
        List<String> searchTerms = preferredHint == null || CollectionUtils.isEmpty(preferredHint.getSearchTerms())
                ? buildFallbackSearchTerms(null, null,
                defaultText(logSummary == null ? null : logSummary.getPreferredQueryTitle(),
                        logSummary == null ? null : logSummary.getFallbackSearchTerm()))
                : preferredHint.getSearchTerms();
        TelemetryIdentitySnapshot identitySnapshot =
                buildEntityIdentitySnapshot(entityContext, SOURCE_OTLP, SIGNAL_LOGS, System.currentTimeMillis());
        String queryHint = firstNonBlank(
                preferredHint == null ? null : preferredHint.getTraceId(),
                preferredHint == null ? null : preferredHint.getTitle(),
                logSummary == null ? null : logSummary.getPreferredQueryTitle(),
                logSummary == null ? null : logSummary.getFallbackSearchTerm()
        );
        return List.of(new LogEvidence(
                SOURCE_OTLP,
                SIGNAL_LOGS,
                entityId == 0L ? null : entityId,
                identitySnapshot,
                System.currentTimeMillis(),
                "attention",
                queryHint,
                bindingResult,
                buildCodeNavigationHint(entityContext, resource, Collections.emptyMap(), searchTerms, queryHint),
                defaultText(logSummary == null ? null : logSummary.getPreferredQueryTitle(), queryHint),
                null,
                preferredHint == null ? null : preferredHint.getTraceId(),
                preferredHint == null ? null : preferredHint.getSpanId(),
                resource,
                searchTerms
        ));
    }

    private boolean hasLogSummaryQuerySignal(EntityLogSummaryInfo logSummary) {
        return logSummary != null
                && (logSummary.getHintCount() > 0
                || StringUtils.hasText(logSummary.getPreferredQueryTitle())
                || StringUtils.hasText(logSummary.getFallbackSearchTerm())
                || !CollectionUtils.isEmpty(logSummary.getPreferredResourceFilters())
                || !CollectionUtils.isEmpty(logSummary.getPreferredSearchTerms()));
    }

    private List<LogEvidence> buildStoredLogEvidence(ObservedEntityContext entityContext,
                                                     long entityId,
                                                     Set<String> entityIdentityKeys,
                                                     EntityLogQueryHint preferredHint,
                                                     EntityLogSummaryInfo logSummary,
                                                     TelemetryBindingResult bindingResult) {
        Map<String, String> entityIdentityValues = entityIdentityValueMap(entityContext);
        long end = firstPositiveMillis(preferredHint == null ? null : preferredHint.getEnd(), System.currentTimeMillis());
        long start = firstPositiveMillis(preferredHint == null ? null : preferredHint.getStart(), end - CORRELATION_WINDOW_MILLIS);
        List<LogEntry> storedLogs = queryStoredLogs(
                start,
                end,
                trimToNull(preferredHint == null ? null : preferredHint.getTraceId()),
                trimToNull(preferredHint == null ? null : preferredHint.getSpanId()),
                20
        );
        if (CollectionUtils.isEmpty(storedLogs)) {
            return Collections.emptyList();
        }
        List<LogEvidence> results = new ArrayList<>();
        for (LogEntry log : storedLogs) {
            Map<String, String> canonicalIdentities = extractCanonicalStringMap(log == null ? null : log.getResource());
            if (!matchesEntitySignal(canonicalIdentities, entityIdentityKeys, entityIdentityValues, entityId)) {
                continue;
            }
            Map<String, String> resource = extractStringMap(log == null ? null : log.getResource());
            Map<String, String> attributes = extractStringMap(log == null ? null : log.getAttributes());
            Map<String, String> snapshotIdentities =
                    enrichCanonicalIdentitiesWithEntityContext(canonicalIdentities, entityContext);
            TelemetryIdentitySnapshot identitySnapshot = new TelemetryIdentitySnapshot(
                    SOURCE_OTLP,
                    SIGNAL_LOGS,
                    snapshotIdentities,
                    snapshotIdentities.get("service.name"),
                    snapshotIdentities.get("service.namespace"),
                    snapshotIdentities.get("deployment.environment.name"),
                    snapshotIdentities.get("service.instance.id"),
                    snapshotIdentities.get("host.name"),
                    resolveObservedAt(log)
            );
            String body = log == null || log.getBody() == null ? null : String.valueOf(log.getBody());
            List<String> searchTerms = preferredHint == null || CollectionUtils.isEmpty(preferredHint.getSearchTerms())
                    ? buildFallbackSearchTerms(log == null ? null : log.getTraceId(), log == null ? null : log.getSpanId(), body)
                    : preferredHint.getSearchTerms();
            results.add(new LogEvidence(
                    SOURCE_OTLP,
                    SIGNAL_LOGS,
                    entityId == 0L ? null : entityId,
                    identitySnapshot,
                    resolveObservedAt(log),
                    defaultText(log == null ? null : log.getSeverityText(), "attention"),
                    firstNonBlank(log == null ? null : log.getTraceId(),
                            body,
                            preferredHint == null ? null : preferredHint.getTitle(),
                            logSummary == null ? null : logSummary.getFallbackSearchTerm()),
                    bindingResult,
                    buildCodeNavigationHint(entityContext, resource, attributes, searchTerms, body),
                    defaultText(body, preferredHint == null ? null : preferredHint.getTitle()),
                    log == null ? null : log.getSeverityText(),
                    log == null ? null : trimToNull(log.getTraceId()),
                    log == null ? null : trimToNull(log.getSpanId()),
                    resource,
                    searchTerms
            ));
        }
        return results;
    }

    @Override
    public EntityTraceSummaryDto buildTraceSummary(ObservedEntityContext entityContext) {
        long entityId = entityId(entityContext);
        if (entityContext == null || entityId == 0L) {
            return new EntityTraceSummaryDto(0, 0, null, false, null);
        }
        Set<String> entityIdentityKeys = entityIdentityKeySet(entityContext);
        Map<String, String> entityIdentityValues = entityIdentityValueMap(entityContext);
        int recentTraceCount = 0;
        int recentErrorTraceCount = 0;
        Long latestObservedAt = null;
        String latestTraceId = null;
        for (RecentTraceSignal signal : recentTraceSignals) {
            if (!matchesEntitySignal(signal.canonicalIdentities(), entityIdentityKeys, entityIdentityValues, entityId)) {
                continue;
            }
            recentTraceCount++;
            if (StringUtils.hasText(signal.errorState())
                    && !"ok".equalsIgnoreCase(signal.errorState())
                    && !"false".equalsIgnoreCase(signal.errorState())) {
                recentErrorTraceCount++;
            }
            if (latestObservedAt == null || (signal.observedAt() != null && signal.observedAt() > latestObservedAt)) {
                latestObservedAt = signal.observedAt();
                latestTraceId = trimToNull(signal.traceId());
            }
        }
        return new EntityTraceSummaryDto(
                recentTraceCount,
                recentErrorTraceCount,
                latestObservedAt,
                recentTraceCount > 0,
                latestTraceId
        );
    }

    @Override
    public List<EntityTraceQueryHintDto> buildTraceQueryHints(ObservedEntityContext entityContext) {
        long entityId = entityId(entityContext);
        if (entityContext == null || entityId == 0L) {
            return Collections.emptyList();
        }
        Set<String> entityIdentityKeys = entityIdentityKeySet(entityContext);
        Map<String, String> entityIdentityValues = entityIdentityValueMap(entityContext);
        RecentTraceSignal preferredSignal = null;
        for (RecentTraceSignal signal : recentTraceSignals) {
            if (!matchesEntitySignal(signal.canonicalIdentities(), entityIdentityKeys, entityIdentityValues, entityId)) {
                continue;
            }
            if (preferredSignal == null
                    || firstPositiveMillis(signal.observedAt(), 0L) > firstPositiveMillis(preferredSignal.observedAt(), 0L)) {
                preferredSignal = signal;
            }
        }
        if (preferredSignal == null) {
            return Collections.emptyList();
        }
        long end = firstPositiveMillis(preferredSignal.observedAt(), System.currentTimeMillis());
        long start = Math.max(0L, end - CORRELATION_WINDOW_MILLIS);
        Map<String, String> resourceFilters = preferredSignal.resource() == null
                ? Collections.emptyMap()
                : new LinkedHashMap<>(preferredSignal.resource());
        List<String> searchTerms = buildFallbackSearchTerms(
                trimToNull(preferredSignal.traceId()),
                trimToNull(preferredSignal.spanName()),
                trimToNull(preferredSignal.serviceName())
        );
        return List.of(new EntityTraceQueryHintDto(
                defaultText(trimToNull(preferredSignal.spanName()), "trace"),
                resourceFilters,
                searchTerms,
                trimToNull(preferredSignal.traceId()),
                trimToNull(preferredSignal.spanId()),
                trimToNull(preferredSignal.serviceName()),
                trimToNull(preferredSignal.serviceNamespace()),
                trimToNull(preferredSignal.canonicalIdentities().get("deployment.environment.name")),
                start,
                end
        ));
    }

    @Override
    public List<TraceEvidence> buildTraceEvidence(ObservedEntityContext entityContext, EntityTraceSummaryDto traceSummary,
                                                  List<EntityTraceQueryHintDto> traceQueryHints) {
        if (traceSummary == null || traceSummary.getRecentTraceCount() <= 0) {
            return Collections.emptyList();
        }
        long entityId = entityContext == null || entityContext.getEntity() == null || entityContext.getEntity().getId() == null
                ? 0L
                : entityContext.getEntity().getId();
        TelemetryIdentitySnapshot identitySnapshot =
                buildEntityIdentitySnapshot(entityContext, SOURCE_OTLP, SIGNAL_TRACES, traceSummary.getLatestObservedAt());
        TelemetryBindingResult bindingResult = buildBindingResult(entityContext, SOURCE_OTLP, SIGNAL_TRACES);
        EntityTraceQueryHintDto preferredHint = traceQueryHints == null || traceQueryHints.isEmpty() ? null : traceQueryHints.getFirst();
        Map<String, String> resource = preferredHint == null || preferredHint.getResourceFilters() == null
                ? Collections.emptyMap()
                : preferredHint.getResourceFilters();
        List<String> searchTerms = preferredHint == null ? Collections.emptyList() : preferredHint.getSearchTerms();
        return List.of(new TraceEvidence(
                SOURCE_OTLP,
                SIGNAL_TRACES,
                entityId == 0L ? null : entityId,
                identitySnapshot,
                traceSummary.getLatestObservedAt(),
                traceSummary.getRecentErrorTraceCount() > 0 ? "error" : (traceSummary.isActive() ? "active" : "normal"),
                defaultText(traceSummary.getLatestTraceId(), identitySnapshot.getServiceName()),
                bindingResult,
                buildCodeNavigationHint(entityContext, resource, Collections.emptyMap(), searchTerms,
                        defaultText(traceSummary.getLatestTraceId(), identitySnapshot.getServiceName())),
                traceSummary.getLatestTraceId(),
                preferredHint == null ? null : preferredHint.getSpanId(),
                identitySnapshot.getServiceName(),
                identitySnapshot.getServiceNamespace(),
                traceSummary.getRecentErrorTraceCount() > 0 ? "error" : "ok",
                traceSummary.getRecentTraceCount(),
                null,
                resource
        ));
    }

    private List<LogEntry> queryStoredLogs(long start, long end, String traceId, String spanId, int limit) {
        return logQueryRepository.queryLogs(start, end, traceId, spanId, limit);
    }

    @Override
    public EntityUnifiedEvidenceSummary buildUnifiedEvidenceSummary(EntityEvidenceSummaryInfo evidenceSummary,
                                                                   EntityMonitorSummaryInfo monitorSummary,
                                                                   EntityLogSummaryInfo logSummary,
                                                                   EntityTraceSummaryDto traceSummary,
                                                                   List<MetricEvidence> metricEvidence,
                                                                   List<LogEvidence> logEvidence,
                                                                   List<TraceEvidence> traceEvidence) {
        boolean metricsActive = !CollectionUtils.isEmpty(metricEvidence)
                || (monitorSummary != null && monitorSummary.getTotalBoundMonitors() > 0);
        boolean logsActive = !CollectionUtils.isEmpty(logEvidence);
        boolean tracesActive = !CollectionUtils.isEmpty(traceEvidence)
                || (traceSummary != null && traceSummary.getRecentTraceCount() > 0);
        List<String> activeSignals = new ArrayList<>();
        if (metricsActive) {
            activeSignals.add(SIGNAL_METRICS);
        }
        if (logsActive) {
            activeSignals.add(SIGNAL_LOGS);
        }
        if (tracesActive) {
            activeSignals.add(SIGNAL_TRACES);
        }
        Long latestObservedAt = StreamMax.of(
                evidenceSummary == null ? null : evidenceSummary.getLastEvidenceAt(),
                monitorSummary == null ? null : monitorSummary.getLatestStatusChangeAt(),
                traceSummary == null ? null : traceSummary.getLatestObservedAt(),
                latestObservedAt(metricEvidence),
                latestObservedAt(logEvidence),
                latestObservedAt(traceEvidence)
        );
        return new EntityUnifiedEvidenceSummary(
                activeSignals.size(),
                metricsActive,
                logsActive,
                tracesActive,
                metricEvidence == null ? 0 : metricEvidence.size(),
                Math.max(logSummary == null ? 0 : logSummary.getHintCount(),
                        logEvidence == null ? 0 : logEvidence.size()),
                traceSummary == null ? 0 : traceSummary.getRecentTraceCount(),
                latestObservedAt,
                activeSignals
        );
    }

    @Override
    public EntityTriageRecommendation buildTriageRecommendation(EntityEvidenceSummaryInfo evidenceSummary,
                                                                EntityMonitorSummaryInfo monitorSummary,
                                                                EntityLogSummaryInfo logSummary,
                                                                EntityTraceSummaryDto traceSummary,
                                                                List<MetricEvidence> metricEvidence,
                                                                List<LogEvidence> logEvidence,
                                                                List<TraceEvidence> traceEvidence) {
        long now = System.currentTimeMillis();
        int activeAlerts = evidenceSummary == null ? 0 : evidenceSummary.getActiveAlertCount();
        int downMonitors = evidenceSummary == null ? 0 : evidenceSummary.getDownMonitorCount();
        boolean metricsRequireAttention = activeAlerts > 0
                || downMonitors > 0
                || metricEvidence.stream().anyMatch(item -> !"active".equalsIgnoreCase(item.getSeverityOrHealth())
                && !"healthy".equalsIgnoreCase(item.getSeverityOrHealth())
                && !"normal".equalsIgnoreCase(item.getSeverityOrHealth()));
        if (metricsRequireAttention) {
            String summary = activeAlerts > 0
                    ? ObservabilityMessages.get("observability.telemetry.triage.metrics.alert.summary")
                    : ObservabilityMessages.get("observability.telemetry.triage.metrics.monitor.summary");
            String whyNow = activeAlerts > 0
                    ? ObservabilityMessages.get("observability.telemetry.triage.metrics.alert.reason")
                    : ObservabilityMessages.get("observability.telemetry.triage.metrics.monitor.reason");
            return new EntityTriageRecommendation(
                    "rule",
                    FOCUS_METRICS,
                    ObservabilityMessages.get("observability.telemetry.triage.metrics.title"),
                    summary,
                    whyNow,
                    ObservabilityMessages.get("observability.telemetry.triage.metrics.action"),
                    now);
        }
        if (traceSummary != null && traceSummary.getRecentErrorTraceCount() > 0 || !CollectionUtils.isEmpty(traceEvidence)) {
            return new EntityTriageRecommendation(
                    "rule",
                    FOCUS_TRACES,
                    ObservabilityMessages.get("observability.telemetry.triage.traces.title"),
                    ObservabilityMessages.get("observability.telemetry.triage.traces.summary"),
                    ObservabilityMessages.get("observability.telemetry.triage.traces.reason"),
                    ObservabilityMessages.get("observability.telemetry.triage.traces.action"),
                    now
            );
        }
        if (logSummary != null && logSummary.getHintCount() > 0 || !CollectionUtils.isEmpty(logEvidence)) {
            return new EntityTriageRecommendation(
                    "rule",
                    FOCUS_LOGS,
                    ObservabilityMessages.get("observability.telemetry.triage.logs.title"),
                    ObservabilityMessages.get("observability.telemetry.triage.logs.summary"),
                    ObservabilityMessages.get("observability.telemetry.triage.logs.reason"),
                    ObservabilityMessages.get("observability.telemetry.triage.logs.action"),
                    now
            );
        }
        return new EntityTriageRecommendation(
                "rule",
                FOCUS_EVIDENCE,
                ObservabilityMessages.get("observability.telemetry.triage.evidence.title"),
                ObservabilityMessages.get("observability.telemetry.triage.evidence.summary"),
                ObservabilityMessages.get("observability.telemetry.triage.evidence.reason"),
                ObservabilityMessages.get("observability.telemetry.triage.evidence.action"),
                now
        );
    }

    @Override
    public MetricCorrelationHint buildMetricCorrelationHint(ObservedEntityContext entityContext,
                                                            TelemetryIdentitySnapshot identitySnapshot,
                                                            Long observedAt,
                                                            String metricName) {
        Long entityId = entityContext == null || entityContext.getEntity() == null ? null : entityContext.getEntity().getId();
        Long end = observedAt == null ? System.currentTimeMillis() : observedAt;
        Long start = Math.max(0L, end - CORRELATION_WINDOW_MILLIS);
        String serviceName = firstNonBlank(
                identitySnapshot == null ? null : trimToNull(identitySnapshot.getServiceName()),
                findEntityIdentityValue(entityContext, "service.name")
        );
        String serviceNamespace = firstNonBlank(
                identitySnapshot == null ? null : trimToNull(identitySnapshot.getServiceNamespace()),
                findEntityIdentityValue(entityContext, "service.namespace")
        );
        String environment = firstNonBlank(
                identitySnapshot == null ? null : trimToNull(identitySnapshot.getEnvironmentName()),
                findEntityIdentityValue(entityContext, "deployment.environment.name")
        );
        String searchQuery = firstNonBlank(serviceName, serviceNamespace, metricName);
        return new MetricCorrelationHint(
                entityId,
                null,
                null,
                serviceName,
                serviceNamespace,
                environment,
                start,
                end,
                searchQuery,
                searchQuery,
                searchQuery
        );
    }

    private String findEntityIdentityValue(ObservedEntityContext entityContext, String identityKey) {
        if (entityContext == null || CollectionUtils.isEmpty(entityContext.getIdentities())) {
            return null;
        }
        return entityContext.getIdentities().stream()
                .filter(identity -> identity != null && Objects.equals(identity.getIdentityKey(), identityKey))
                .map(EntityIdentity::getIdentityValue)
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    @Override
    public CodeNavigationHint buildCodeNavigationHint(ObservedEntityContext entityContext,
                                                      Map<String, String> resourceAttributes,
                                                      Map<String, String> signalAttributes,
                                                      List<String> fallbackSearchTerms,
                                                      String fallbackTitle) {
        List<RepoCodeLocation> codeLocations = extractCodeLocations(entityContext);
        if (CollectionUtils.isEmpty(codeLocations)) {
            return null;
        }
        String searchQuery = firstNonBlank(
                readAttribute(signalAttributes, "code.function"),
                readAttribute(signalAttributes, "code.namespace"),
                readAttribute(signalAttributes, "http.route"),
                readAttribute(signalAttributes, "code.filepath"),
                trimToNull(fallbackTitle),
                firstNonBlank(fallbackSearchTerms)
        );
        String preferredFilePath = firstNonBlank(readAttribute(signalAttributes, "code.filepath"),
                readAttribute(resourceAttributes, "code.filepath"));
        RepoCodeLocation preferredLocation = chooseCodeLocation(codeLocations, preferredFilePath);
        String provider = detectProvider(preferredLocation.repositoryUrl());
        String defaultPath = resolveDefaultPath(preferredLocation.paths(), preferredFilePath);
        String label = firstNonBlank(fallbackTitle, searchQuery, preferredLocation.repositoryUrl());
        return new CodeNavigationHint(preferredLocation.repositoryUrl(), provider, defaultPath, searchQuery, label);
    }

    private TelemetryIdentitySnapshot buildEntityIdentitySnapshot(ObservedEntityContext entityContext,
                                                                 String source, String signal, Long observedAt) {
        Map<String, String> canonicalIdentities = new LinkedHashMap<>();
        if (entityContext != null && !CollectionUtils.isEmpty(entityContext.getIdentities())) {
            for (String key : EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS) {
                entityContext.getIdentities().stream()
                        .filter(identity -> identity != null && Objects.equals(identity.getIdentityKey(), key))
                        .map(EntityIdentity::getIdentityValue)
                        .map(this::trimToNull)
                        .filter(Objects::nonNull)
                        .findFirst()
                        .ifPresent(value -> canonicalIdentities.put(key, value));
            }
        }
        Map<String, String> enrichedIdentities =
                enrichCanonicalIdentitiesWithEntityContext(canonicalIdentities, entityContext);
        return new TelemetryIdentitySnapshot(
                source,
                signal,
                enrichedIdentities,
                enrichedIdentities.get("service.name"),
                enrichedIdentities.get("service.namespace"),
                enrichedIdentities.get("deployment.environment.name"),
                enrichedIdentities.get("service.instance.id"),
                enrichedIdentities.get("host.name"),
                observedAt
        );
    }

    private TelemetryBindingResult buildBindingResult(ObservedEntityContext entityContext, String source, String signal) {
        if (entityContext == null || entityContext.getEntity() == null) {
            return new TelemetryBindingResult(null, null, null, false, source, 0, Collections.emptyList(), null, null);
        }
        List<String> matchedIdentityKeys = entityContext.getIdentities() == null
                ? Collections.emptyList()
                : entityContext.getIdentities().stream()
                        .map(EntityIdentity::getIdentityKey)
                        .filter(EntityCanonicalIdentityRegistry::isCanonicalOtelResourceKey)
                        .distinct()
                        .toList();
        EntityIdentity primaryIdentity = entityContext.getIdentities() == null ? null : entityContext.getIdentities().stream()
                .filter(identity -> identity != null && EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(identity.getIdentityKey()))
                .sorted((left, right) -> Integer.compare(
                        EntityCanonicalIdentityRegistry.defaultPriority(right.getIdentityKey()),
                        EntityCanonicalIdentityRegistry.defaultPriority(left.getIdentityKey())))
                .findFirst()
                .orElse(null);
        return new TelemetryBindingResult(
                entityContext.getEntity().getId(),
                entityContext.getEntity().getType(),
                defaultText(entityContext.getEntity().getDisplayName(), entityContext.getEntity().getName()),
                entityContext.getEntity().getId() != null,
                source,
                matchedIdentityKeys.size(),
                matchedIdentityKeys,
                primaryIdentity == null ? null : primaryIdentity.getIdentityKey(),
                primaryIdentity == null ? null : primaryIdentity.getIdentityValue()
        );
    }

    private Map<String, String> extractCanonicalStringMap(Map<?, ?> values) {
        if (CollectionUtils.isEmpty(values)) {
            return Collections.emptyMap();
        }
        Map<String, String> canonical = new LinkedHashMap<>();
        for (String key : EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS) {
            Object value = canonicalResourceValue(values, key);
            if (value == null) {
                continue;
            }
            String normalized = trimToNull(String.valueOf(value));
            if (normalized != null) {
                canonical.put(key, normalized);
            }
        }
        putCanonicalResourceValue(canonical, values, HERTZBEAT_ENTITY_ID);
        putCanonicalResourceValue(canonical, values, HERTZBEAT_ENTITY_TYPE);
        putCanonicalResourceValue(canonical, values, HERTZBEAT_ENTITY_NAME);
        putCanonicalResourceValue(canonical, values, HERTZBEAT_WORKSPACE_ID);
        return canonical;
    }

    private Map<String, String> enrichCanonicalIdentitiesWithEntityContext(Map<String, String> canonicalIdentities,
                                                                           ObservedEntityContext entityContext) {
        Map<String, String> enriched = new LinkedHashMap<>();
        if (!CollectionUtils.isEmpty(canonicalIdentities)) {
            enriched.putAll(canonicalIdentities);
        }
        if (entityContext == null || entityContext.getEntity() == null) {
            return enriched;
        }
        long entityId = entityId(entityContext);
        if (entityId > 0) {
            enriched.putIfAbsent(HERTZBEAT_ENTITY_ID, String.valueOf(entityId));
        }
        String entityType = trimToNull(entityContext.getEntity().getType());
        if (entityType != null) {
            enriched.putIfAbsent(HERTZBEAT_ENTITY_TYPE, entityType);
        }
        String entityName = firstNonBlank(entityContext.getEntity().getDisplayName(), entityContext.getEntity().getName());
        if (entityName != null) {
            enriched.putIfAbsent(HERTZBEAT_ENTITY_NAME, entityName);
        }
        String workspaceId = trimToNull(entityContext.getEntity().getWorkspaceId());
        if (workspaceId != null) {
            enriched.putIfAbsent(HERTZBEAT_WORKSPACE_ID, workspaceId);
        }
        return enriched;
    }

    private void putCanonicalResourceValue(Map<String, String> canonical, Map<?, ?> values, String key) {
        Object value = canonicalResourceValue(values, key);
        if (value == null) {
            return;
        }
        String normalized = trimToNull(String.valueOf(value));
        if (normalized != null) {
            canonical.put(key, normalized);
        }
    }

    private Object canonicalResourceValue(Map<?, ?> values, String key) {
        Object value = values.get(key);
        if (value != null) {
            return value;
        }
        return values.get(normalizeOtelResourceStorageKey(key));
    }

    private String normalizeOtelResourceStorageKey(String key) {
        return key == null ? null : key.replace(".", "_");
    }

    private List<MetricEvidence> buildOtlpMetricEvidence(ObservedEntityContext entityContext, long entityId) {
        if (entityContext == null || entityId == 0L || recentMetricSignals.isEmpty()) {
            return Collections.emptyList();
        }
        List<MetricEvidence> result = new ArrayList<>();
        Set<String> entityIdentityKeys = entityIdentityKeySet(entityContext);
        Map<String, String> entityIdentityValues = entityIdentityValueMap(entityContext);
        for (RecentMetricSignal signal : recentMetricSignals) {
            if (!matchesEntitySignal(signal.canonicalIdentities(), entityIdentityKeys, entityIdentityValues, entityId)) {
                continue;
            }
            Map<String, String> snapshotIdentities =
                    enrichCanonicalIdentitiesWithEntityContext(signal.canonicalIdentities(), entityContext);
            TelemetryIdentitySnapshot snapshot = new TelemetryIdentitySnapshot(
                    SOURCE_OTLP,
                    SIGNAL_METRICS,
                    snapshotIdentities,
                    snapshotIdentities.get("service.name"),
                    snapshotIdentities.get("service.namespace"),
                    snapshotIdentities.get("deployment.environment.name"),
                    snapshotIdentities.get("service.instance.id"),
                    snapshotIdentities.get("host.name"),
                    signal.observedAt()
            );
            result.add(new MetricEvidence(
                    SOURCE_OTLP,
                    SIGNAL_METRICS,
                    entityId == 0L ? null : entityId,
                    snapshot,
                    signal.observedAt(),
                    "active",
                    signal.metricName(),
                    buildBindingResult(entityContext, SOURCE_OTLP, SIGNAL_METRICS),
                    buildMetricCorrelationHint(entityContext, snapshot, signal.observedAt(), signal.metricName()),
                    buildCodeNavigationHint(entityContext, snapshotIdentities, filterMetricSignalAttributes(signal.attributes()),
                            buildFallbackSearchTerms(signal.metricName(), snapshot.getServiceName()), signal.metricName()),
                    signal.metricName(),
                    defaultText(signal.metricName(), "OTLP Metric"),
                    defaultText(signal.metricType(), "metric"),
                    signal.unit(),
                    signal.value(),
                    signal.attributes(),
                    null,
                    buildMetricOtelContext(signal.metricType(), signal.attributes(), snapshot.getServiceName())
            ));
        }
        return result;
    }

    private Map<String, String> filterMetricSignalAttributes(Map<String, String> attributes) {
        if (CollectionUtils.isEmpty(attributes)) {
            return Collections.emptyMap();
        }
        Map<String, String> filtered = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : attributes.entrySet()) {
            if (entry.getKey() == null || entry.getKey().startsWith(OTLP_METRIC_METADATA_PREFIX)) {
                continue;
            }
            filtered.put(entry.getKey(), entry.getValue());
        }
        return filtered;
    }

    private String buildMetricOtelContext(String metricType, Map<String, String> attributes, String serviceName) {
        if (CollectionUtils.isEmpty(attributes)) {
            return serviceName;
        }
        String compatibility = trimToNull(attributes.get(OTLP_METRIC_COMPATIBILITY));
        String reason = trimToNull(attributes.get(OTLP_METRIC_COMPATIBILITY_REASON));
        String greptimeCompatibility = trimToNull(attributes.get(OTLP_METRIC_GREPTIME_COMPATIBILITY));
        String facadeCompatibility = trimToNull(attributes.get(OTLP_METRIC_FACADE_COMPATIBILITY));
        String temporality = trimToNull(attributes.get(OTLP_METRIC_AGGREGATION_TEMPORALITY));
        String monotonic = trimToNull(attributes.get(OTLP_METRIC_MONOTONIC));
        String quantiles = trimToNull(attributes.get(OTLP_METRIC_SUMMARY_QUANTILES));
        String histogramBuckets = trimToNull(attributes.get(OTLP_METRIC_HISTOGRAM_BUCKET_COUNTS));
        String histogramBounds = trimToNull(attributes.get(OTLP_METRIC_HISTOGRAM_EXPLICIT_BOUNDS));

        List<String> segments = new ArrayList<>();
        if (StringUtils.hasText(compatibility)) {
            segments.add(ObservabilityMessages.format("observability.telemetry.metric.context.compatibility", switch (compatibility) {
                case "supported" -> ObservabilityMessages.get("observability.telemetry.metric.context.supported");
                case "partial" -> ObservabilityMessages.get("observability.telemetry.metric.context.partial");
                case "unsupported" -> ObservabilityMessages.get("observability.telemetry.metric.context.unsupported");
                default -> compatibility;
            }));
        }
        if (StringUtils.hasText(greptimeCompatibility) || StringUtils.hasText(facadeCompatibility)) {
            segments.add("Greptime=" + defaultText(greptimeCompatibility, "unknown")
                    + " / HertzBeat facade=" + defaultText(facadeCompatibility, "unknown"));
        }
        if (StringUtils.hasText(temporality)) {
            segments.add("temporality=" + temporality);
        }
        if (StringUtils.hasText(monotonic)) {
            segments.add("monotonic=" + monotonic);
        }
        if ("summary".equals(metricType) && StringUtils.hasText(quantiles)) {
            segments.add(ObservabilityMessages.get("observability.telemetry.metric.context.summary-quantiles"));
        }
        if ("histogram".equals(metricType) && StringUtils.hasText(histogramBuckets) && StringUtils.hasText(histogramBounds)) {
            segments.add(ObservabilityMessages.get("observability.telemetry.metric.context.histogram-buckets"));
        }
        if (StringUtils.hasText(reason)) {
            segments.add(reason);
        }
        if (segments.isEmpty()) {
            return serviceName;
        }
        return String.join("；", segments);
    }

    private boolean matchesEntitySignal(Map<String, String> canonicalIdentities,
                                        Set<String> entityIdentityKeys,
                                        Map<String, String> entityIdentityValues,
                                        long entityId) {
        if (matchesExplicitEntityId(canonicalIdentities, entityId)) {
            return true;
        }
        return matchesEntityIdentities(canonicalIdentities, entityIdentityKeys, entityIdentityValues);
    }

    private boolean matchesExplicitEntityId(Map<String, String> canonicalIdentities, long entityId) {
        if (entityId <= 0 || CollectionUtils.isEmpty(canonicalIdentities)) {
            return false;
        }
        return Objects.equals(String.valueOf(entityId), trimToNull(canonicalIdentities.get(HERTZBEAT_ENTITY_ID)));
    }

    private boolean matchesEntityIdentities(Map<String, String> canonicalIdentities,
                                            Set<String> entityIdentityKeys,
                                            Map<String, String> entityIdentityValues) {
        if (canonicalIdentities == null || canonicalIdentities.isEmpty()) {
            return false;
        }
        if (entityIdentityKeys == null || entityIdentityKeys.isEmpty()) {
            return false;
        }
        String requiredServiceName = entityIdentityValues == null ? null : entityIdentityValues.get("service.name");
        String actualServiceName = normalizeValue(canonicalIdentities.get("service.name"));
        if (StringUtils.hasText(requiredServiceName) && !Objects.equals(requiredServiceName, actualServiceName)) {
            return false;
        }
        for (String strictKey : List.of("service.namespace", "deployment.environment.name", "service.instance.id", "host.name")) {
            String expectedValue = entityIdentityValues == null ? null : entityIdentityValues.get(strictKey);
            String actualValue = normalizeValue(canonicalIdentities.get(strictKey));
            if (StringUtils.hasText(expectedValue) && StringUtils.hasText(actualValue) && !Objects.equals(expectedValue, actualValue)) {
                return false;
            }
        }
        boolean matched = false;
        for (Map.Entry<String, String> entry : canonicalIdentities.entrySet()) {
            String normalizedValue = normalizeValue(entry.getValue());
            if (!StringUtils.hasText(normalizedValue)) {
                continue;
            }
            if (entityIdentityKeys.contains(entry.getKey() + "\u0000" + normalizedValue)) {
                matched = true;
            }
        }
        return matched;
    }

    private long entityId(ObservedEntityContext entityContext) {
        return entityContext == null || entityContext.getEntity() == null || entityContext.getEntity().getId() == null
                ? 0L
                : entityContext.getEntity().getId();
    }

    private Set<String> entityIdentityKeySet(ObservedEntityContext entityContext) {
        if (entityContext == null || CollectionUtils.isEmpty(entityContext.getIdentities())) {
            return Collections.emptySet();
        }
        Set<String> entityIdentityKeys = new LinkedHashSet<>();
        for (EntityIdentity identity : entityContext.getIdentities()) {
            if (identity == null || !EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(identity.getIdentityKey())) {
                continue;
            }
            String normalizedValue = normalizeValue(defaultText(identity.getNormalizedValue(), identity.getIdentityValue()));
            if (!StringUtils.hasText(normalizedValue)) {
                continue;
            }
            entityIdentityKeys.add(identity.getIdentityKey() + "\u0000" + normalizedValue);
        }
        return entityIdentityKeys;
    }

    private Map<String, String> entityIdentityValueMap(ObservedEntityContext entityContext) {
        if (entityContext == null || CollectionUtils.isEmpty(entityContext.getIdentities())) {
            return Collections.emptyMap();
        }
        Map<String, String> entityIdentityValues = new LinkedHashMap<>();
        for (EntityIdentity identity : entityContext.getIdentities()) {
            if (identity == null || !EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(identity.getIdentityKey())) {
                continue;
            }
            String normalizedValue = normalizeValue(defaultText(identity.getNormalizedValue(), identity.getIdentityValue()));
            if (!StringUtils.hasText(normalizedValue) || entityIdentityValues.containsKey(identity.getIdentityKey())) {
                continue;
            }
            entityIdentityValues.put(identity.getIdentityKey(), normalizedValue);
        }
        return entityIdentityValues;
    }

    private String normalizeValue(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }

    private Map<String, String> extractStringMap(Map<?, ?> values) {
        if (values == null || values.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : values.entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null) {
                continue;
            }
            String key = String.valueOf(entry.getKey());
            String value = stringifyValue(entry.getValue());
            if (StringUtils.hasText(key) && StringUtils.hasText(value)) {
                result.put(key, value);
            }
        }
        return result;
    }

    private String stringifyValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof JsonNode jsonNode) {
            if (jsonNode.isValueNode()) {
                return jsonNode.asText();
            }
            return jsonNode.toString();
        }
        return String.valueOf(value);
    }

    private long firstPositiveMillis(Object candidate, long fallback) {
        Long value = toLong(candidate);
        return value != null && value > 0 ? value : fallback;
    }

    private Long resolveObservedAt(LogEntry log) {
        if (log == null) {
            return null;
        }
        if (log.getObservedTimeUnixNano() != null && log.getObservedTimeUnixNano() > 0) {
            return log.getObservedTimeUnixNano() / 1_000_000L;
        }
        if (log.getTimeUnixNano() != null && log.getTimeUnixNano() > 0) {
            return log.getTimeUnixNano() / 1_000_000L;
        }
        return null;
    }

    private void trimRecentMetricSignals() {
        while (recentMetricSignals.size() > MAX_RECENT_METRIC_SIGNALS) {
            recentMetricSignals.pollLast();
        }
        Iterator<RecentMetricSignal> iterator = recentMetricSignals.descendingIterator();
        int seen = 0;
        while (iterator.hasNext()) {
            iterator.next();
            seen++;
            if (seen > MAX_RECENT_METRIC_SIGNALS) {
                iterator.remove();
            }
        }
    }

    private void trimRecentLogSignals() {
        while (recentLogSignals.size() > MAX_RECENT_LOG_SIGNALS) {
            recentLogSignals.pollLast();
        }
    }

    private void trimRecentTraceSignals() {
        while (recentTraceSignals.size() > MAX_RECENT_TRACE_SIGNALS) {
            recentTraceSignals.pollLast();
        }
    }

    private TelemetryIdentitySnapshot buildMetricIdentitySnapshot(RecentMetricSignal signal) {
        if (signal == null) {
            return null;
        }
        return new TelemetryIdentitySnapshot(
                SOURCE_OTLP,
                SIGNAL_METRICS,
                signal.canonicalIdentities(),
                signal.canonicalIdentities().get("service.name"),
                signal.canonicalIdentities().get("service.namespace"),
                signal.canonicalIdentities().get("deployment.environment.name"),
                signal.canonicalIdentities().get("service.instance.id"),
                signal.canonicalIdentities().get("host.name"),
                signal.observedAt()
        );
    }

    private boolean matchesMetricContext(Map<String, String> canonicalIdentities,
                                         String requiredServiceName,
                                         String requiredServiceNamespace,
                                         String requiredEnvironment) {
        if (CollectionUtils.isEmpty(canonicalIdentities) || isSelfTelemetryResource(canonicalIdentities)) {
            return false;
        }
        if (StringUtils.hasText(requiredServiceName)
                && !requiredServiceName.equals(normalizeValue(canonicalIdentities.get("service.name")))) {
            return false;
        }
        if (StringUtils.hasText(requiredServiceNamespace)
                && !requiredServiceNamespace.equals(normalizeValue(canonicalIdentities.get("service.namespace")))) {
            return false;
        }
        if (StringUtils.hasText(requiredEnvironment)
                && !requiredEnvironment.equals(normalizeValue(canonicalIdentities.get("deployment.environment.name")))) {
            return false;
        }
        return true;
    }

    private record RecentMetricSignal(Map<String, String> canonicalIdentities,
                                      Long observedAt,
                                      String metricName,
                                      String metricType,
                                      String unit,
                                      Double value,
                                      Map<String, String> attributes) {
    }

    private record RecentLogSignal(Map<String, String> canonicalIdentities,
                                   Long observedAt,
                                   String body,
                                   String severityText,
                                   String traceId,
                                   String spanId,
                                   Map<String, String> resource,
                                   Map<String, String> attributes) {
    }

    private record RecentTraceSignal(Map<String, String> canonicalIdentities,
                                     Long observedAt,
                                     String traceId,
                                     String spanId,
                                     String spanName,
                                     String serviceName,
                                     String serviceNamespace,
                                     String errorState,
                                     Map<String, String> resource,
                                     Map<String, String> spanAttributes) {
    }

    private String extractLatestTraceId(List<EntityLogQueryHint> logQueryHints) {
        if (CollectionUtils.isEmpty(logQueryHints)) {
            return null;
        }
        return logQueryHints.stream()
                .map(EntityLogQueryHint::getTraceId)
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private Long latestMonitorObservedAt(List<Monitor> monitors) {
        if (CollectionUtils.isEmpty(monitors)) {
            return null;
        }
        return monitors.stream()
                .map(Monitor::getGmtUpdate)
                .filter(Objects::nonNull)
                .map(this::toEpochMillis)
                .max(Long::compareTo)
                .orElse(null);
    }

    private Long toEpochMillis(LocalDateTime dateTime) {
        if (dateTime == null) {
            return null;
        }
        return dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private String defaultText(String preferred, String fallback) {
        return trimToNull(preferred) != null ? trimToNull(preferred) : trimToNull(fallback);
    }

    private String firstNonBlank(List<String> values) {
        if (CollectionUtils.isEmpty(values)) {
            return null;
        }
        return values.stream().map(this::trimToNull).filter(Objects::nonNull).findFirst().orElse(null);
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String normalized = trimToNull(value);
            if (normalized != null) {
                return normalized;
            }
        }
        return null;
    }

    private List<String> buildFallbackSearchTerms(String... values) {
        if (values == null || values.length == 0) {
            return Collections.emptyList();
        }
        List<String> terms = new ArrayList<>();
        for (String value : values) {
            String normalized = trimToNull(value);
            if (normalized != null && !terms.contains(normalized)) {
                terms.add(normalized);
            }
        }
        return terms;
    }

    private String readAttribute(Map<String, String> attributes, String key) {
        if (CollectionUtils.isEmpty(attributes) || !StringUtils.hasText(key)) {
            return null;
        }
        return trimToNull(attributes.get(key));
    }

    private List<RepoCodeLocation> extractCodeLocations(ObservedEntityContext entityContext) {
        JsonNode hertzbeatNode = entityContext == null ? null : entityContext.getHertzbeat();
        if (hertzbeatNode == null || !hertzbeatNode.isObject()) {
            return Collections.emptyList();
        }
        JsonNode codeLocationsNode = hertzbeatNode.get("codeLocations");
        if (codeLocationsNode == null || !codeLocationsNode.isArray()) {
            return Collections.emptyList();
        }
        List<RepoCodeLocation> codeLocations = new ArrayList<>();
        for (JsonNode item : codeLocationsNode) {
            if (item == null || !item.isObject()) {
                continue;
            }
            String repositoryUrl = firstNonBlank(
                    item.hasNonNull("repositoryURL") ? item.get("repositoryURL").asText(null) : null,
                    item.hasNonNull("repositoryUrl") ? item.get("repositoryUrl").asText(null) : null
            );
            if (!StringUtils.hasText(repositoryUrl)) {
                continue;
            }
            List<String> paths = new ArrayList<>();
            JsonNode pathsNode = item.get("paths");
            if (pathsNode != null && pathsNode.isArray()) {
                for (JsonNode pathNode : pathsNode) {
                    String path = trimToNull(pathNode == null ? null : pathNode.asText(null));
                    if (path != null) {
                        paths.add(path);
                    }
                }
            }
            codeLocations.add(new RepoCodeLocation(normalizeRepositoryUrl(repositoryUrl), paths));
        }
        return codeLocations;
    }

    private RepoCodeLocation chooseCodeLocation(List<RepoCodeLocation> codeLocations, String preferredFilePath) {
        if (CollectionUtils.isEmpty(codeLocations)) {
            return null;
        }
        String normalizedFilePath = trimCodePath(preferredFilePath);
        if (normalizedFilePath != null) {
            for (RepoCodeLocation location : codeLocations) {
                if (location.paths().stream().map(this::trimCodePath).anyMatch(path ->
                        path != null && (normalizedFilePath.equals(path) || normalizedFilePath.startsWith(path + "/")))) {
                    return location;
                }
            }
        }
        return codeLocations.getFirst();
    }

    private String resolveDefaultPath(List<String> paths, String preferredFilePath) {
        String normalizedFilePath = trimCodePath(preferredFilePath);
        if (normalizedFilePath != null && !CollectionUtils.isEmpty(paths)) {
            for (String path : paths) {
                String normalizedPath = trimCodePath(path);
                if (normalizedPath != null && (normalizedFilePath.equals(normalizedPath)
                        || normalizedFilePath.startsWith(normalizedPath + "/"))) {
                    return normalizedFilePath;
                }
            }
        }
        if (normalizedFilePath != null) {
            return normalizedFilePath;
        }
        if (CollectionUtils.isEmpty(paths)) {
            return null;
        }
        return trimCodePath(paths.getFirst());
    }

    private String normalizeRepositoryUrl(String repositoryUrl) {
        String normalized = trimToNull(repositoryUrl);
        if (normalized == null) {
            return null;
        }
        if (normalized.endsWith(".git")) {
            normalized = normalized.substring(0, normalized.length() - 4);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String trimCodePath(String path) {
        String normalized = trimToNull(path);
        if (normalized == null) {
            return null;
        }
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }

    private String detectProvider(String repositoryUrl) {
        String normalized = normalizeRepositoryUrl(repositoryUrl);
        if (normalized == null) {
            return null;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("github.com")) {
            return "github";
        }
        if (lower.contains("gitlab")) {
            return "gitlab";
        }
        if (lower.contains("gitee.com")) {
            return "gitee";
        }
        return "generic";
    }

    private boolean isSelfTelemetrySnapshot(TelemetryIdentitySnapshot snapshot) {
        if (snapshot == null || CollectionUtils.isEmpty(snapshot.getCanonicalIdentities())) {
            return false;
        }
        return isSelfTelemetryResource(snapshot.getCanonicalIdentities());
    }

    private boolean isWorkspaceNoiseSnapshot(TelemetryIdentitySnapshot snapshot) {
        if (snapshot == null || CollectionUtils.isEmpty(snapshot.getCanonicalIdentities())) {
            return false;
        }
        return isWorkspaceNoiseResource(snapshot.getCanonicalIdentities());
    }

    private boolean isSelfTelemetryResource(Map<String, String> resourceAttributes) {
        String serviceName = normalizeValue(readAttribute(resourceAttributes, "service.name"));
        String serviceNamespace = normalizeValue(readAttribute(resourceAttributes, "service.namespace"));
        return "hertzbeat".equals(serviceName)
                || "apache-hertzbeat".equals(serviceName)
                || "hertzbeat".equals(serviceNamespace)
                || "apache-hertzbeat".equals(serviceNamespace);
    }

    private boolean isWorkspaceNoiseResource(Map<String, String> resourceAttributes) {
        String serviceName = normalizeValue(readAttribute(resourceAttributes, "service.name"));
        return StringUtils.hasText(serviceName) && WORKSPACE_INFRA_SERVICE_NAMES.contains(serviceName);
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private <T> Long latestObservedAt(List<T> evidence) {
        if (CollectionUtils.isEmpty(evidence)) {
            return null;
        }
        return evidence.stream()
                .map(item -> {
                    if (item instanceof MetricEvidence metricEvidence) {
                        return metricEvidence.getObservedAt();
                    }
                    if (item instanceof LogEvidence logEvidence) {
                        return logEvidence.getObservedAt();
                    }
                    if (item instanceof TraceEvidence traceEvidence) {
                        return traceEvidence.getObservedAt();
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);
    }

    private static final class StreamMax {
        private StreamMax() {
        }

        @SafeVarargs
        private static <T extends Comparable<? super T>> T of(T... values) {
            T max = null;
            if (values == null) {
                return null;
            }
            for (T value : values) {
                if (value == null) {
                    continue;
                }
                if (max == null || value.compareTo(max) > 0) {
                    max = value;
                }
            }
            return max;
        }
    }

    private record RepoCodeLocation(String repositoryUrl, List<String> paths) {
    }
}
