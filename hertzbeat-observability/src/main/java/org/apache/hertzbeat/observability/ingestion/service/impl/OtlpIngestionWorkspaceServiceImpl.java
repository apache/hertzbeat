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

package org.apache.hertzbeat.observability.ingestion.service.impl;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.observability.dto.binding.OtlpEntityBindingSummaryDto;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionGuideDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionOverviewDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpRelatedMetricsDto;
import org.apache.hertzbeat.common.observability.model.EntityCanonicalIdentityRegistry;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.repository.LogQueryRepository;
import org.apache.hertzbeat.warehouse.repository.MetricQueryRepository;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Unified OTLP ingestion workspace service.
 */
@Service
@Slf4j
public class OtlpIngestionWorkspaceServiceImpl implements OtlpIngestionWorkspaceService {

    private static final long LOOKBACK_MILLIS = Duration.ofHours(24).toMillis();
    private static final long DEFAULT_CONSOLE_LOOKBACK_MILLIS = Duration.ofHours(1).toMillis();
    private static final int SAMPLE_LIMIT = 20;
    private static final String OTLP_HTTP_PATH = "/api/otlp";
    private static final String OTLP_HOST_PLACEHOLDER = "<your-hertzbeat-host>";
    private static final List<String> METRICS_ENTITY_CONTEXT_GROUP_LABELS = List.of(
            "__name__",
            "service_name",
            "service_namespace",
            "deployment_environment_name",
            "hertzbeat_entity_id",
            "hertzbeat_entity_type",
            "hertzbeat_entity_name"
    );
    private static final String DEFAULT_METRICS_GROUP_BY = String.join(", ", METRICS_ENTITY_CONTEXT_GROUP_LABELS);
    private static final String DEFAULT_METRICS_AGGREGATION = "sum";
    private static final String METRICS_CONSOLE_REF_ID = "otlp-metrics-console";
    private static final String RELATED_METRICS_REF_ID = "otlp-related-metrics";
    private static final Pattern METRICS_FILTER_MATCHER = Pattern.compile(
            "\\s*([A-Za-z_:][A-Za-z0-9_.:-]*)\\s*(=~|!~|!=|=)\\s*(?:\"((?:\\\\.|[^\"\\\\])*)\"|'((?:\\\\.|[^'\\\\])*)'|([^,\\s]+))\\s*"
    );
    private static final Pattern METRICS_FILTER_LIST_OPERATOR_PATTERN = Pattern.compile(
            "\\s*([A-Za-z_:][A-Za-z0-9_.:-]*)\\s+(NOT\\s+IN|IN)\\s*(\\(.+\\))\\s*",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern METRICS_FILTER_TEXT_OPERATOR_PATTERN = Pattern.compile(
            "\\s*([A-Za-z_:][A-Za-z0-9_.:-]*)\\s+(NOT\\s+CONTAINS|CONTAINS)\\s+(.+)\\s*",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern METRICS_FILTER_PRESENCE_OPERATOR_PATTERN = Pattern.compile(
            "\\s*([A-Za-z_:][A-Za-z0-9_.:-]*)\\s+(NOT\\s+EXISTS|EXISTS)\\s*",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SIMPLE_METRIC_NAME = Pattern.compile("[A-Za-z_:][A-Za-z0-9_:.-]*");
    private static final int DEFAULT_RECENT_SERVICE_LIMIT = 6;
    private static final int DEFAULT_RECENT_UNBOUND_CANDIDATE_LIMIT = 6;
    private static final int DEFAULT_RECENT_METRIC_NAME_LIMIT = 64;
    private static final int DEFAULT_METRICS_QUERY_CANDIDATE_LIMIT = 64;
    private static final int MAX_METRICS_SERIES_LIMIT = 100;
    private static final int DEFAULT_METRICS_SERIES_LIMIT = MAX_METRICS_SERIES_LIMIT;
    private static final int DEFAULT_RELATED_METRICS_LIMIT = 8;
    private static final int MAX_RELATED_METRICS_LIMIT = 32;
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

    private final EntityTraceQueryService entityTraceQueryService;
    private final ObservabilityWorkspaceQueryGateway workspaceQueryGateway;
    private final ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway;
    private final LogQueryRepository logQueryRepository;
    private final MetricQueryRepository metricQueryRepository;
    private final List<HistoryDataReader> historyDataReaders;
    private final List<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutors;
    private final List<GreptimeProperties> greptimeProperties;

    public OtlpIngestionWorkspaceServiceImpl(EntityTraceQueryService entityTraceQueryService,
                                             ObservabilityWorkspaceQueryGateway workspaceQueryGateway,
                                             @Qualifier("telemetryIntakeServiceImpl")
                                             ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway,
                                             LogQueryRepository logQueryRepository,
                                             MetricQueryRepository metricQueryRepository,
                                             List<HistoryDataReader> historyDataReaders,
                                             List<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutors,
                                             List<GreptimeProperties> greptimeProperties) {
        this.entityTraceQueryService = entityTraceQueryService;
        this.workspaceQueryGateway = workspaceQueryGateway;
        this.observabilitySignalIntakeGateway = observabilitySignalIntakeGateway;
        this.logQueryRepository = logQueryRepository;
        this.metricQueryRepository = metricQueryRepository;
        this.historyDataReaders = safeBeanList(historyDataReaders);
        this.greptimeSqlQueryExecutors = safeBeanList(greptimeSqlQueryExecutors);
        this.greptimeProperties = safeBeanList(greptimeProperties);
    }

    @Value("${server.ssl.enabled:false}")
    private boolean sslEnabled = false;

    @Value("${server.port:1157}")
    private int serverPort = 1157;

    @Value("${hertzbeat.otlp.grpc.port:4317}")
    private int otlpGrpcPort = 4317;

    @Override
    public OtlpIngestionOverviewDto getOverview() {
        long now = System.currentTimeMillis();
        long start = now - LOOKBACK_MILLIS;
        List<LogEntry> recentLogs = queryRecentLogs(start, now);
        List<LogEntry> externalLogs = recentLogs.stream().filter(this::isExternalLog).toList();
        List<TraceListItemDto> recentTraces = entityTraceQueryService
                .queryTraceList(null, start, now, null, false, null, null, null, 0, SAMPLE_LIMIT)
                .getContent();
        List<TraceListItemDto> externalTraces = recentTraces.stream().filter(this::isExternalTrace).toList();
        TraceOverviewDto traceOverview = new TraceOverviewDto(
                externalTraces.size(),
                (int) externalTraces.stream().filter(item -> "error".equalsIgnoreCase(item.getStatus())).count(),
                externalTraces.stream().map(TraceListItemDto::getStartTime).filter(Objects::nonNull).max(Long::compareTo).orElse(null),
                externalTraces.stream().anyMatch(item -> item.getStartTime() != null && item.getStartTime() >= now - LOOKBACK_MILLIS)
        );
        List<Monitor> recentMetricSources = workspaceQueryGateway.findLatestMonitor().map(List::of).orElseGet(List::of);
        List<TelemetryIdentitySnapshot> identitySnapshots =
                observabilitySignalIntakeGateway.collectRecentExternalIdentitySnapshots(externalLogs, externalTraces, recentMetricSources);
        List<TelemetryIdentitySnapshot> metricSnapshots = identitySnapshots.stream()
                .filter(snapshot -> "metrics".equals(snapshot.getSignal()))
                .toList();
        long otlpMetricCount = metricSnapshots.stream()
                .filter(snapshot -> "otlp".equals(snapshot.getSource()))
                .count();

        Set<String> services = new LinkedHashSet<>();
        identitySnapshots.stream()
                .map(TelemetryIdentitySnapshot::getServiceName)
                .filter(StringUtils::hasText)
                .forEach(services::add);

        long logTotalCount = externalLogs.size();
        long monitorTotalCount = workspaceQueryGateway.countMonitors();
        Optional<Monitor> latestMonitor = workspaceQueryGateway.findLatestMonitor();
        Long latestMonitorObservedAt = latestMonitor.map(Monitor::getGmtUpdate).map(this::toEpochMillis).orElse(null);
        TelemetryIdentitySnapshot latestMetricSnapshot = metricSnapshots.stream()
                .filter(snapshot -> snapshot.getObservedAt() != null)
                .max(Comparator.comparing(TelemetryIdentitySnapshot::getObservedAt))
                .orElse(null);
        Long metricsLatestObservedAt = java.util.stream.Stream.of(
                        latestMonitorObservedAt,
                        latestMetricSnapshot == null ? null : latestMetricSnapshot.getObservedAt())
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);
        Long logsLatestObservedAt = externalLogs.stream()
                .map(LogEntry::getTimeUnixNano)
                .filter(Objects::nonNull)
                .map(value -> value / 1_000_000L)
                .max(Long::compareTo)
                .orElse(null);

        List<OtlpIngestionOverviewDto.RecentSignalEvent> recentEvents = new ArrayList<>();
        TraceListItemDto latestTrace = externalTraces.isEmpty() ? null : externalTraces.getFirst();
        if (latestTrace != null) {
            recentEvents.add(new OtlpIngestionOverviewDto.RecentSignalEvent(
                    "traces",
                    defaultText(latestTrace.getRootSpanName(), latestTrace.getTraceId()),
                    defaultText(latestTrace.getServiceName(), latestTrace.getTraceId()),
                    latestTrace.getStartTime() instanceof Number ? ((Number) latestTrace.getStartTime()).longValue() : traceOverview.getLatestObservedAt()
            ));
        }
        LogEntry latestLog = externalLogs.stream()
                .filter(log -> log.getTimeUnixNano() != null)
                .max(Comparator.comparing(LogEntry::getTimeUnixNano))
                .orElse(null);
        if (latestLog != null) {
            recentEvents.add(new OtlpIngestionOverviewDto.RecentSignalEvent(
                    "logs",
                    defaultText(latestLog.getSeverityText(), "log"),
                    truncateLogBody(latestLog.getBody()),
                    latestLog.getTimeUnixNano() == null ? null : latestLog.getTimeUnixNano() / 1_000_000L
            ));
        }
        if (latestMetricSnapshot != null && (latestMonitorObservedAt == null
                || latestMetricSnapshot.getObservedAt() == null
                || latestMetricSnapshot.getObservedAt() >= latestMonitorObservedAt)) {
            recentEvents.add(new OtlpIngestionOverviewDto.RecentSignalEvent(
                    "metrics",
                    defaultText(latestMetricSnapshot.getServiceName(),
                            message("observability.otlp.overview.event.metrics.title")),
                    defaultText(latestMetricSnapshot.getServiceNamespace(),
                            message("observability.otlp.overview.event.metrics.copy")),
                    latestMetricSnapshot.getObservedAt()
            ));
        } else if (latestMonitor.isPresent()) {
            recentEvents.add(new OtlpIngestionOverviewDto.RecentSignalEvent(
                    "metrics",
                    defaultText(latestMonitor.get().getName(), latestMonitor.get().getApp()),
                    defaultText(latestMonitor.get().getInstance(), latestMonitor.get().getApp()),
                    metricsLatestObservedAt
            ));
        }
        int activeSignalCount = 0;
        boolean metricsActive = metricsLatestObservedAt != null && metricsLatestObservedAt >= start;
        if (metricsActive) {
            activeSignalCount++;
        }
        if (logTotalCount > 0) {
            activeSignalCount++;
        }
        if (traceOverview.getTotalTraceCount() > 0) {
            activeSignalCount++;
        }
        Long latestObservedAt = java.util.stream.Stream.of(metricsLatestObservedAt, logsLatestObservedAt, traceOverview.getLatestObservedAt())
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);

        return new OtlpIngestionOverviewDto(
                new OtlpIngestionOverviewDto.SignalOverview(
                        "metrics",
                        metricsActive,
                        monitorTotalCount + otlpMetricCount,
                        metricsLatestObservedAt,
                        metricsIntakeMode(monitorTotalCount, otlpMetricCount),
                        metricsActive
                                ? message("observability.otlp.overview.metrics.active")
                                : message("observability.otlp.overview.metrics.inactive")
                ),
                new OtlpIngestionOverviewDto.SignalOverview(
                        "logs",
                        logTotalCount > 0,
                        logTotalCount,
                        logsLatestObservedAt,
                        "OTLP",
                        logTotalCount > 0
                                ? message("observability.otlp.overview.logs.active")
                                : message("observability.otlp.overview.logs.inactive")
                ),
                new OtlpIngestionOverviewDto.SignalOverview(
                        "traces",
                        traceOverview.getTotalTraceCount() > 0,
                        traceOverview.getTotalTraceCount(),
                        traceOverview.getLatestObservedAt(),
                        "OTLP",
                        traceOverview.getTotalTraceCount() > 0
                                ? message("observability.otlp.overview.traces.active")
                                : message("observability.otlp.overview.traces.inactive")
                ),
                activeSignalCount,
                latestObservedAt,
                services.size(),
                workspaceQueryGateway.countDistinctBoundEntityIdsByIdentityKeys(canonicalIdentityKeySet()),
                recentEvents,
                buildReadinessChecks(now)
        );
    }

    private List<OtlpIngestionOverviewDto.ReadinessCheck> buildReadinessChecks(long checkedAt) {
        return List.of(
                buildCollectorReadiness(checkedAt),
                buildStorageReadiness(checkedAt),
                buildQueryReadiness(checkedAt),
                buildGreptimeReadiness(checkedAt)
        );
    }

    private OtlpIngestionOverviewDto.ReadinessCheck buildCollectorReadiness(long checkedAt) {
        long total = workspaceQueryGateway.countCollectors();
        long online = workspaceQueryGateway.countCollectorsByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE);
        if (total <= 0) {
            return readinessCheck("collector", message("observability.otlp.readiness.collector.title"), "warning",
                    message("observability.otlp.readiness.collector.unregistered"),
                    message("observability.otlp.readiness.collector.deploy"), checkedAt);
        }
        if (online >= total) {
            return readinessCheck("collector", message("observability.otlp.readiness.collector.title"), "success",
                    message("observability.otlp.readiness.collector.online", online, total),
                    message("observability.otlp.readiness.collector.accepting"), checkedAt);
        }
        if (online > 0) {
            return readinessCheck("collector", message("observability.otlp.readiness.collector.title"), "warning",
                    message("observability.otlp.readiness.collector.online", online, total),
                    message("observability.otlp.readiness.collector.offline", total - online), checkedAt);
        }
        return readinessCheck("collector", message("observability.otlp.readiness.collector.title"), "danger",
                message("observability.otlp.readiness.collector.online", 0, total),
                message("observability.otlp.readiness.collector.all-offline"), checkedAt);
    }

    private OtlpIngestionOverviewDto.ReadinessCheck buildStorageReadiness(long checkedAt) {
        int total = historyDataReaders.size();
        long available = countAvailableHistoryReaders();
        if (total <= 0) {
            return readinessCheck("storage", message("observability.otlp.readiness.storage.title"), "warning",
                    message("observability.otlp.readiness.storage.disabled"),
                    message("observability.otlp.readiness.storage.check-config"), checkedAt);
        }
        if (available >= total) {
            return readinessCheck("storage", message("observability.otlp.readiness.storage.title"), "success",
                    message("observability.otlp.readiness.storage.available", available, total),
                    message("observability.otlp.readiness.storage.reader-available"), checkedAt);
        }
        if (available > 0) {
            return readinessCheck("storage", message("observability.otlp.readiness.storage.title"), "warning",
                    message("observability.otlp.readiness.storage.available", available, total),
                    message("observability.otlp.readiness.storage.partial"), checkedAt);
        }
        return readinessCheck("storage", message("observability.otlp.readiness.storage.title"), "danger",
                message("observability.otlp.readiness.storage.available", 0, total),
                message("observability.otlp.readiness.storage.check-config"), checkedAt);
    }

    private OtlpIngestionOverviewDto.ReadinessCheck buildQueryReadiness(long checkedAt) {
        boolean promqlAvailable = hasPromqlExecutor();
        boolean historyAvailable = countAvailableHistoryReaders() > 0;
        if (promqlAvailable && historyAvailable) {
            return readinessCheck("query", message("observability.otlp.readiness.query.title"), "success",
                    message("observability.otlp.readiness.query.available"),
                    message("observability.otlp.readiness.query.promql-history"), checkedAt);
        }
        if (promqlAvailable || historyAvailable) {
            return readinessCheck("query", message("observability.otlp.readiness.query.title"), "warning",
                    message("observability.otlp.readiness.query.partial"),
                    promqlAvailable
                            ? message("observability.otlp.readiness.query.promql-only")
                            : message("observability.otlp.readiness.query.history-only"), checkedAt);
        }
        return readinessCheck("query", message("observability.otlp.readiness.query.title"), "danger",
                message("observability.otlp.readiness.query.unavailable"),
                message("observability.otlp.readiness.query.check-config"), checkedAt);
    }

    private OtlpIngestionOverviewDto.ReadinessCheck buildGreptimeReadiness(long checkedAt) {
        boolean greptimeEnabled = greptimeProperties.stream().anyMatch(GreptimeProperties::enabled);
        if (!greptimeEnabled) {
            return readinessCheck("greptime", "GreptimeDB", "neutral",
                    message("observability.otlp.readiness.greptime.disabled"),
                    message("observability.otlp.readiness.greptime.other-storage"), checkedAt);
        }
        if (greptimeSqlQueryExecutors.isEmpty()) {
            return readinessCheck("greptime", "GreptimeDB", "warning",
                    message("observability.otlp.readiness.greptime.sql-not-ready"),
                    message("observability.otlp.readiness.greptime.check-http"), checkedAt);
        }
        try {
            greptimeSqlQueryExecutors.getFirst().execute("SELECT 1");
            return readinessCheck("greptime", "GreptimeDB", "success",
                    message("observability.otlp.readiness.greptime.sql-ok"),
                    message("observability.otlp.readiness.greptime.select-ok"), checkedAt);
        } catch (RuntimeException exception) {
            return readinessCheck("greptime", "GreptimeDB", "danger",
                    message("observability.otlp.readiness.greptime.sql-failed"),
                    defaultText(exception.getMessage(),
                            message("observability.otlp.readiness.greptime.check-connection")), checkedAt);
        }
    }

    private OtlpIngestionOverviewDto.ReadinessCheck readinessCheck(String key, String title, String status,
                                                                   String summary, String detail, long checkedAt) {
        return new OtlpIngestionOverviewDto.ReadinessCheck(key, title, status, summary, detail, checkedAt);
    }

    private long countAvailableHistoryReaders() {
        return historyDataReaders.stream()
                .filter(this::isHistoryReaderAvailable)
                .count();
    }

    private boolean isHistoryReaderAvailable(HistoryDataReader reader) {
        try {
            return reader.isServerAvailable();
        } catch (RuntimeException exception) {
            log.debug("History data reader readiness check failed: {}", exception.getMessage(), exception);
            return false;
        }
    }

    private boolean hasPromqlExecutor() {
        try {
            return metricQueryRepository.hasPromqlExecutor();
        } catch (RuntimeException exception) {
            log.debug("PromQL readiness check failed: {}", exception.getMessage(), exception);
            return false;
        }
    }

    @Override
    public OtlpIngestionGuideDto getGuide(HttpServletRequest request) {
        String unifiedBaseEndpoint = resolveOtlpHttpBaseEndpoint(request);
        String grpcEndpoint = resolveOtlpGrpcEndpoint(request);
        String traceEndpoint = unifiedBaseEndpoint + "/v1/traces";
        String metricsEndpoint = unifiedBaseEndpoint + "/v1/metrics";
        String logsEndpoint = unifiedBaseEndpoint + "/v1/logs";
        String collectorSnippet = """
                receivers:
                  otlp:
                    protocols:
                      http:
                      grpc:

                processors:
                  batch:

                exporters:
                  otlphttp/hertzbeat:
                    endpoint: %s
                    headers:
                      Authorization: "Bearer <api-token>"

                service:
                  pipelines:
                    logs:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlphttp/hertzbeat]
                    traces:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlphttp/hertzbeat]
                    metrics:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlphttp/hertzbeat]
                """.formatted(unifiedBaseEndpoint);
        String collectorGrpcSnippet = """
                receivers:
                  otlp:
                    protocols:
                      http:
                      grpc:

                processors:
                  batch:

                exporters:
                  otlp/hertzbeat:
                    endpoint: %s
                    headers:
                      Authorization: "Bearer <api-token>"
                    tls:
                      insecure: true

                service:
                  pipelines:
                    logs:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlp/hertzbeat]
                    traces:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlp/hertzbeat]
                    metrics:
                      receivers: [otlp]
                      processors: [batch]
                      exporters: [otlp/hertzbeat]
                """.formatted(grpcEndpoint);
        String javaSnippet = """
                export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
                export OTEL_EXPORTER_OTLP_ENDPOINT=%s
                export OTEL_EXPORTER_OTLP_HEADERS=\"Authorization=Bearer <api-token>\"
                export OTEL_RESOURCE_ATTRIBUTES=\"service.name=checkout,service.namespace=commerce,deployment.environment.name=prod\"
                """.formatted(unifiedBaseEndpoint);
        String javaGrpcSnippet = """
                export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
                export OTEL_EXPORTER_OTLP_ENDPOINT=%s
                export OTEL_EXPORTER_OTLP_HEADERS=\"Authorization=Bearer <api-token>\"
                export OTEL_RESOURCE_ATTRIBUTES=\"service.name=checkout,service.namespace=commerce,deployment.environment.name=prod\"
                """.formatted("http://" + grpcEndpoint);
        String pythonSnippet = """
                from opentelemetry.sdk.resources import Resource
                resource = Resource.create({
                    "service.name": "checkout",
                    "service.namespace": "commerce",
                    "deployment.environment.name": "prod",
                })

                # %s
                # %s
                """.formatted(message("observability.otlp.guide.snippet.python.http.comment"), unifiedBaseEndpoint);
        String pythonGrpcSnippet = """
                from opentelemetry.sdk.resources import Resource
                resource = Resource.create({
                    "service.name": "checkout",
                    "service.namespace": "commerce",
                    "deployment.environment.name": "prod",
                })

                # %s
                # %s
                """.formatted(message("observability.otlp.guide.snippet.python.grpc.comment"), grpcEndpoint);

        return new OtlpIngestionGuideDto(
                "OTLP HTTP",
                "OTLP gRPC",
                "Authorization",
                "Bearer <api-token>",
                grpcEndpoint,
                List.of(
                        new OtlpIngestionGuideDto.SignalGuide(
                                "metrics",
                                "http",
                                "OTLP HTTP",
                                metricsEndpoint,
                                message("observability.otlp.guide.metrics.http.description"),
                                message("observability.otlp.guide.metrics.http.note")
                        ),
                        new OtlpIngestionGuideDto.SignalGuide(
                                "logs",
                                "http",
                                "OTLP HTTP",
                                logsEndpoint,
                                message("observability.otlp.guide.logs.http.description"),
                                message("observability.otlp.guide.logs.http.note")
                        ),
                        new OtlpIngestionGuideDto.SignalGuide(
                                "traces",
                                "http",
                                "OTLP HTTP",
                                traceEndpoint,
                                message("observability.otlp.guide.traces.http.description"),
                                message("observability.otlp.guide.traces.http.note")
                        ),
                        new OtlpIngestionGuideDto.SignalGuide(
                                "metrics",
                                "grpc",
                                "OTLP gRPC",
                                grpcEndpoint,
                                message("observability.otlp.guide.metrics.grpc.description"),
                                message("observability.otlp.guide.metrics.grpc.note")
                        ),
                        new OtlpIngestionGuideDto.SignalGuide(
                                "logs",
                                "grpc",
                                "OTLP gRPC",
                                grpcEndpoint,
                                message("observability.otlp.guide.logs.grpc.description"),
                                message("observability.otlp.guide.logs.grpc.note")
                        ),
                        new OtlpIngestionGuideDto.SignalGuide(
                                "traces",
                                "grpc",
                                "OTLP gRPC",
                                grpcEndpoint,
                                message("observability.otlp.guide.traces.grpc.description"),
                                message("observability.otlp.guide.traces.grpc.note")
                        )
                ),
                List.of(
                        new OtlpIngestionGuideDto.Snippet("collector-http", "http", "OpenTelemetry Collector", "yaml", collectorSnippet),
                        new OtlpIngestionGuideDto.Snippet("java-http", "http",
                                message("observability.otlp.guide.snippet.java-env"), "bash", javaSnippet),
                        new OtlpIngestionGuideDto.Snippet("python-http", "http",
                                message("observability.otlp.guide.snippet.python-resource"), "python", pythonSnippet),
                        new OtlpIngestionGuideDto.Snippet("collector-grpc", "grpc", "OpenTelemetry Collector", "yaml", collectorGrpcSnippet),
                        new OtlpIngestionGuideDto.Snippet("java-grpc", "grpc",
                                message("observability.otlp.guide.snippet.java-env"), "bash", javaGrpcSnippet),
                        new OtlpIngestionGuideDto.Snippet("python-grpc", "grpc",
                                message("observability.otlp.guide.snippet.python-resource"), "python", pythonGrpcSnippet)
                )
        );
    }

    @Override
    public OtlpEntityBindingSummaryDto getBindingSummary() {
        long now = System.currentTimeMillis();
        long start = now - LOOKBACK_MILLIS;
        List<LogEntry> recentLogs = queryRecentLogs(start, now);
        List<TraceListItemDto> recentTraces = entityTraceQueryService
                .queryTraceList(null, start, now, null, false, null, null, null, 0, SAMPLE_LIMIT)
                .getContent();
        List<Monitor> recentMetricSources = workspaceQueryGateway.findLatestMonitor().map(List::of).orElseGet(List::of);
        List<TelemetryIdentitySnapshot> identitySnapshots =
                observabilitySignalIntakeGateway.collectRecentExternalIdentitySnapshots(
                        recentLogs.stream().filter(this::isExternalLog).toList(),
                        recentTraces.stream().filter(this::isExternalTrace).toList(),
                        recentMetricSources);

        List<OtlpEntityBindingSummaryDto.CanonicalIdentitySample> samples = new ArrayList<>();
        appendIdentitySamples(samples, identitySnapshots);
        samples = samples.stream().limit(12).toList();
        List<String> recentServices = collectRecentServices(identitySnapshots, DEFAULT_RECENT_SERVICE_LIMIT);

        Map<Long, List<EntityIdentity>> entityIdentityMap = collectRecentBoundEntityIdentities(identitySnapshots);
        Set<String> boundIdentityMatches = boundIdentityMatchKeys(entityIdentityMap);
        List<OtlpEntityBindingSummaryDto.UnboundEntityCandidate> unboundCandidates =
                buildUnboundEntityCandidates(identitySnapshots, boundIdentityMatches);

        Map<Long, ObserveEntity> entityMap = workspaceQueryGateway.findEntitiesByIds(entityIdentityMap.keySet());
        List<OtlpEntityBindingSummaryDto.BoundEntity> boundEntities = new ArrayList<>();
        for (Map.Entry<Long, List<EntityIdentity>> entry : entityIdentityMap.entrySet()) {
            ObserveEntity entity = entityMap.get(entry.getKey());
            if (entity == null) {
                continue;
            }
            EntityIdentity primaryIdentity = entry.getValue().stream()
                    .sorted(Comparator.comparing(EntityIdentity::isPrimaryIdentity).reversed()
                            .thenComparing(EntityIdentity::getPriority, Comparator.nullsLast(Comparator.reverseOrder()))
                            .thenComparing(EntityIdentity::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                    .findFirst()
                    .orElse(null);
            boundEntities.add(new OtlpEntityBindingSummaryDto.BoundEntity(
                    entity.getId(),
                    entity.getType(),
                    entity.getName(),
                    entity.getDisplayName(),
                    entity.getNamespace(),
                    primaryIdentity == null ? null : primaryIdentity.getIdentityKey(),
                    primaryIdentity == null ? null : primaryIdentity.getIdentityValue(),
                    workspaceQueryGateway.countMonitorBindsByEntityId(entity.getId())
            ));
            if (boundEntities.size() >= 6) {
                break;
            }
        }

        return new OtlpEntityBindingSummaryDto(
                EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS,
                recentServices,
                samples,
                boundEntities,
                unboundCandidates
        );
    }

    @Override
    public OtlpMetricsConsoleDto getMetricsConsole(Long entityId, String entityType, Long start, Long end,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   String query, String filter, String groupBy, String aggregation,
                                                   String temporalAggregation, String step, String limit) {
        long resolvedEnd = end == null || end <= 0 ? System.currentTimeMillis() : end;
        long resolvedStart = start == null || start <= 0 || start >= resolvedEnd
                ? resolvedEnd - DEFAULT_CONSOLE_LOOKBACK_MILLIS
                : start;
        String resolvedStep = resolvePromqlStep(resolvedStart, resolvedEnd, step);
        int resolvedSeriesLimit = resolveMetricsSeriesLimit(limit);
        boolean explicitContextRequested = entityId != null
                || StringUtils.hasText(trimToNull(entityType))
                || StringUtils.hasText(trimToNull(serviceName))
                || StringUtils.hasText(trimToNull(serviceNamespace))
                || StringUtils.hasText(trimToNull(environment));
        OtlpMetricsConsoleDto.Context context = resolveMetricsConsoleContext(
                entityId, entityType, resolvedStart, resolvedEnd, serviceName, serviceNamespace, environment
        );
        String resolvedQuery = trimToNull(query);
        if (!StringUtils.hasText(resolvedQuery)) {
            OtlpMetricsConsoleDto autoResolvedConsole = queryDefaultMetricsConsole(
                    context,
                    explicitContextRequested,
                    filter,
                    groupBy,
                    aggregation,
                    temporalAggregation,
                    resolvedStart,
                    resolvedEnd,
                    resolvedStep,
                    resolvedSeriesLimit
            );
            if (autoResolvedConsole != null) {
                return autoResolvedConsole;
            }
            resolvedQuery = buildDefaultMetricsQuery(context, filter, groupBy, aggregation, temporalAggregation);
        } else {
            resolvedQuery = buildMetricsQueryForExplicitMetric(context, resolvedQuery, filter, groupBy, aggregation,
                    temporalAggregation);
        }
        if (!StringUtils.hasText(resolvedQuery)) {
            return new OtlpMetricsConsoleDto(
                    context,
                    null,
                    null,
                    WarehouseConstants.PROMQL,
                    null,
                    new OtlpMetricsConsoleDto.Stats(0, 0, null),
                    "no_context",
                    message("observability.otlp.metrics-console.no-context")
            );
        }
        if (!metricQueryRepository.hasPromqlExecutor()) {
            return new OtlpMetricsConsoleDto(
                    context,
                    resolvedQuery,
                    null,
                    WarehouseConstants.PROMQL,
                    null,
                    new OtlpMetricsConsoleDto.Stats(0, 0, null),
                    "load_failed",
                    message("observability.otlp.metrics-console.promql-unavailable")
            );
        }
        MetricsQueryExecution execution = executeMetricsConsoleQuery(resolvedQuery, resolvedStart, resolvedEnd,
                resolvedStep, resolvedSeriesLimit);
        if (execution.errorMessage() != null) {
            return new OtlpMetricsConsoleDto(
                    context,
                    resolvedQuery,
                    execution.datasource(),
                    WarehouseConstants.PROMQL,
                    null,
                    new OtlpMetricsConsoleDto.Stats(0, 0, null),
                    "load_failed",
                    execution.errorMessage()
            );
        }
        return new OtlpMetricsConsoleDto(
                context,
                resolvedQuery,
                execution.datasource(),
                WarehouseConstants.PROMQL,
                execution.results(),
                execution.stats(),
                deriveMetricsEmptyStateReason(execution.results(), execution.stats()),
                execution.results() == null ? null : trimToNull(execution.results().getMsg())
        );
    }

    public OtlpMetricsConsoleDto getMetricsConsole(Long entityId, Long start, Long end,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   String query, String filter, String groupBy, String aggregation) {
        return getMetricsConsole(entityId, null, start, end, serviceName, serviceNamespace, environment, query, filter,
                groupBy, aggregation, null, null, null);
    }

    public OtlpMetricsConsoleDto getMetricsConsole(Long entityId, Long start, Long end,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   String query, String filter, String groupBy, String aggregation,
                                                   String temporalAggregation, String step, String limit) {
        return getMetricsConsole(entityId, null, start, end, serviceName, serviceNamespace, environment, query, filter,
                groupBy, aggregation, temporalAggregation, step, limit);
    }

    @Override
    public OtlpRelatedMetricsDto getRelatedMetrics(Long entityId, String entityType, Long start, Long end, String serviceName,
                                                   String serviceNamespace, String environment,
                                                   String filter, String operationName, String limit) {
        long resolvedEnd = end == null || end <= 0 ? System.currentTimeMillis() : end;
        long resolvedStart = start == null || start <= 0 || start >= resolvedEnd
                ? resolvedEnd - DEFAULT_CONSOLE_LOOKBACK_MILLIS
                : start;
        int resolvedLimit = resolveRelatedMetricsLimit(limit);
        OtlpMetricsConsoleDto.Context context = resolveMetricsConsoleContext(
                entityId, entityType, resolvedStart, resolvedEnd, serviceName, serviceNamespace, environment
        );
        String normalizedFilter = trimToNull(filter);
        String normalizedOperationName = trimToNull(operationName);
        List<OtlpRelatedMetricsDto.ResourceMatcher> resourceMatchers = parseRelatedMetricResourceMatchers(normalizedFilter);
        List<OtlpRelatedMetricsDto.Candidate> candidates = buildRelatedMetricCandidates(
                context, resourceMatchers, normalizedOperationName, resolvedStart, resolvedEnd, resolvedLimit
        );
        return new OtlpRelatedMetricsDto(
                context,
                normalizedFilter,
                normalizedOperationName,
                "backend-related-metrics",
                candidates.size(),
                resourceMatchers,
                candidates
        );
    }

    public OtlpRelatedMetricsDto getRelatedMetrics(Long entityId, Long start, Long end, String serviceName,
                                                   String serviceNamespace, String environment,
                                                   String filter, String limit) {
        return getRelatedMetrics(entityId, null, start, end, serviceName, serviceNamespace, environment, filter, null, limit);
    }

    private List<OtlpRelatedMetricsDto.Candidate> buildRelatedMetricCandidates(
            OtlpMetricsConsoleDto.Context context,
            List<OtlpRelatedMetricsDto.ResourceMatcher> resourceMatchers,
            String operationName,
            long start,
            long end,
            int limit) {
        LinkedHashMap<String, OtlpRelatedMetricsDto.Candidate> candidates = new LinkedHashMap<>();
        Map<String, String> resourceMatch = resourceMatcherValueMap(resourceMatchers);
        List<String> podLabels = matchedLabels(resourceMatchers, Set.of(
                "k8s_pod_name",
                "k8s_namespace_name",
                "k8s_container_name",
                "container_name"
        ));
        if (!podLabels.isEmpty()) {
            addRelatedMetricCandidate(candidates, "container.cpu.usage", "pod", "cpu",
                    "resource-filter", podLabels, resourceMatch);
            addRelatedMetricCandidate(candidates, "container.memory.working_set", "pod", "memory",
                    "resource-filter", podLabels, resourceMatch);
        }
        List<String> hostLabels = matchedLabels(resourceMatchers, Set.of("host_name", "k8s_node_name"));
        if (!hostLabels.isEmpty()) {
            addRelatedMetricCandidate(candidates, "system.cpu.utilization", "host", "cpu",
                    "resource-filter", hostLabels, resourceMatch);
            addRelatedMetricCandidate(candidates, "system.memory.usage", "host", "memory",
                    "resource-filter", hostLabels, resourceMatch);
        }
        for (String metricName : candidateMetricNames(context)) {
            addRelatedMetricCandidate(
                    candidates,
                    normalizePromqlMetricName(metricName),
                    StringUtils.hasText(operationName) ? "operation" : "service",
                    relatedMetricFamily(metricName),
                    StringUtils.hasText(operationName) ? "operation-context" : "service-context",
                    StringUtils.hasText(operationName)
                            ? operationContextLabels(context, operationName)
                            : serviceContextLabels(context),
                    StringUtils.hasText(operationName)
                            ? operationContextResourceMatch(context, operationName)
                            : serviceContextResourceMatch(context)
            );
        }
        List<OtlpRelatedMetricsDto.Candidate> rawCandidates = candidates.values().stream()
                .limit(MAX_RELATED_METRICS_LIMIT)
                .toList();
        if (metricQueryRepository.hasPromqlExecutor()) {
            List<OtlpRelatedMetricsDto.Candidate> availableCandidates =
                    filterPromqlAvailableRelatedMetricCandidates(rawCandidates, start, end, limit);
            if (!availableCandidates.isEmpty()) {
                return availableCandidates;
            }
        }
        return rawCandidates.stream().limit(limit).toList();
    }

    private List<OtlpRelatedMetricsDto.Candidate> filterPromqlAvailableRelatedMetricCandidates(
            List<OtlpRelatedMetricsDto.Candidate> candidates,
            long start,
            long end,
            int limit) {
        if (CollectionUtils.isEmpty(candidates) || limit <= 0) {
            return List.of();
        }
        String step = resolvePromqlStep(start, end, null);
        List<OtlpRelatedMetricsDto.Candidate> available = new ArrayList<>();
        for (OtlpRelatedMetricsDto.Candidate candidate : candidates) {
            for (String query : buildRelatedMetricAvailabilityQueries(candidate)) {
                MetricQueryRepository.PromqlRangeQueryResult result = metricQueryRepository.queryPromqlRange(
                        RELATED_METRICS_REF_ID,
                        query,
                        start,
                        end,
                        step
                );
                if (result.errorMessage() != null) {
                    log.debug("query related metric candidate failed: {}", result.errorMessage());
                    continue;
                }
                if (buildMetricsConsoleStats(result.results()).getNonEmptySeries() > 0) {
                    available.add(new OtlpRelatedMetricsDto.Candidate(
                            candidate.getQuery(),
                            candidate.getSource(),
                            candidate.getFamily(),
                            "promql-series",
                            candidate.getMatchedLabels(),
                            candidate.getResourceMatch()
                    ));
                    break;
                }
            }
            if (available.size() >= limit) {
                break;
            }
        }
        return available;
    }

    private List<String> buildRelatedMetricAvailabilityQueries(OtlpRelatedMetricsDto.Candidate candidate) {
        if (candidate == null || !StringUtils.hasText(candidate.getQuery())) {
            return List.of();
        }
        String metricName = normalizePromqlMetricName(candidate.getQuery());
        if (!StringUtils.hasText(metricName)) {
            return List.of();
        }
        Map<String, String> resourceMatch = candidate.getResourceMatch() == null
                ? Map.of()
                : candidate.getResourceMatch();
        if ("operation".equals(candidate.getSource())
                && StringUtils.hasText(resourceMatch.get("operation_name"))
                && StringUtils.hasText(resourceMatch.get("http_route"))) {
            LinkedHashMap<String, String> operationNameMatch = new LinkedHashMap<>(resourceMatch);
            operationNameMatch.remove("http_route");
            LinkedHashMap<String, String> httpRouteMatch = new LinkedHashMap<>(resourceMatch);
            httpRouteMatch.remove("operation_name");
            return List.of(
                    buildRelatedMetricAvailabilityQuery(metricName, operationNameMatch),
                    buildRelatedMetricAvailabilityQuery(metricName, httpRouteMatch)
            );
        }
        return List.of(buildRelatedMetricAvailabilityQuery(metricName, resourceMatch));
    }

    private String buildRelatedMetricAvailabilityQuery(String metricName, Map<String, String> resourceMatch) {
        List<String> matchers = new ArrayList<>();
        matchers.add("__name__=\"" + escapePromqlLabelValue(metricName) + "\"");
        if (!CollectionUtils.isEmpty(resourceMatch)) {
            for (Map.Entry<String, String> entry : resourceMatch.entrySet()) {
                String label = normalizePromqlLabelName(entry.getKey());
                String value = trimToNull(entry.getValue());
                if (!isPromqlLabelName(label) || !StringUtils.hasText(value)) {
                    continue;
                }
                matchers.add(label + "=\"" + escapePromqlLabelValue(value) + "\"");
            }
        }
        return "sum by (__name__) ({" + String.join(", ", matchers) + "})";
    }

    private void addRelatedMetricCandidate(LinkedHashMap<String, OtlpRelatedMetricsDto.Candidate> candidates,
                                           String query,
                                           String source,
                                           String family,
                                           String reason,
                                           List<String> matchedLabels,
                                           Map<String, String> resourceMatch) {
        String normalizedQuery = trimToNull(query);
        if (!StringUtils.hasText(normalizedQuery)) {
            return;
        }
        String key = source + ":" + normalizePromqlMetricName(normalizedQuery);
        if (candidates.containsKey(key)) {
            return;
        }
        candidates.put(key, new OtlpRelatedMetricsDto.Candidate(
                normalizedQuery,
                source,
                family,
                reason,
                matchedLabels == null ? List.of() : matchedLabels,
                resourceMatch == null ? Map.of() : resourceMatch
        ));
    }

    private List<OtlpRelatedMetricsDto.ResourceMatcher> parseRelatedMetricResourceMatchers(String filter) {
        String normalized = trimToNull(filter);
        if (!StringUtils.hasText(normalized)) {
            return List.of();
        }
        List<OtlpRelatedMetricsDto.ResourceMatcher> matchers = new ArrayList<>();
        for (String rawClause : splitMetricsFilterClauses(normalized)) {
            String clause = trimToNull(rawClause);
            if (!StringUtils.hasText(clause)) {
                continue;
            }
            String parsedMatcher = parseMetricsFriendlyFilterMatcher(clause, Set.of());
            Matcher matcher = METRICS_FILTER_MATCHER.matcher(StringUtils.hasText(parsedMatcher) ? parsedMatcher : clause);
            if (!matcher.matches()) {
                continue;
            }
            String labelName = normalizePromqlLabelName(matcher.group(1));
            if (!isPromqlLabelName(labelName)) {
                continue;
            }
            String labelValue = firstText(matcher.group(3), matcher.group(4), matcher.group(5));
            if (!StringUtils.hasText(labelValue)) {
                continue;
            }
            matchers.add(new OtlpRelatedMetricsDto.ResourceMatcher(labelName, matcher.group(2), labelValue));
        }
        return matchers;
    }

    private Map<String, String> resourceMatcherValueMap(List<OtlpRelatedMetricsDto.ResourceMatcher> matchers) {
        if (CollectionUtils.isEmpty(matchers)) {
            return Map.of();
        }
        LinkedHashMap<String, String> values = new LinkedHashMap<>();
        for (OtlpRelatedMetricsDto.ResourceMatcher matcher : matchers) {
            if (matcher == null || !StringUtils.hasText(matcher.getLabel()) || !StringUtils.hasText(matcher.getValue())) {
                continue;
            }
            values.putIfAbsent(matcher.getLabel(), matcher.getValue());
        }
        return values;
    }

    private List<String> matchedLabels(List<OtlpRelatedMetricsDto.ResourceMatcher> matchers, Set<String> labels) {
        if (CollectionUtils.isEmpty(matchers) || CollectionUtils.isEmpty(labels)) {
            return List.of();
        }
        LinkedHashSet<String> matched = new LinkedHashSet<>();
        for (OtlpRelatedMetricsDto.ResourceMatcher matcher : matchers) {
            if (matcher != null && labels.contains(matcher.getLabel())) {
                matched.add(matcher.getLabel());
            }
        }
        return List.copyOf(matched);
    }

    private List<String> serviceContextLabels(OtlpMetricsConsoleDto.Context context) {
        if (context == null || !StringUtils.hasText(context.getServiceName())) {
            return List.of();
        }
        List<String> labels = new ArrayList<>();
        labels.add("service_name");
        if (StringUtils.hasText(context.getServiceNamespace())) {
            labels.add("service_namespace");
        }
        if (StringUtils.hasText(context.getEnvironment())) {
            labels.add("deployment_environment_name");
        }
        if (context.getEntityId() != null) {
            labels.add("hertzbeat_entity_id");
        }
        if (StringUtils.hasText(context.getEntityType())) {
            labels.add("hertzbeat_entity_type");
        }
        return List.copyOf(labels);
    }

    private List<String> operationContextLabels(OtlpMetricsConsoleDto.Context context, String operationName) {
        List<String> labels = new ArrayList<>(serviceContextLabels(context));
        if (StringUtils.hasText(operationName)) {
            labels.add("operation_name");
            labels.add("http_route");
        }
        return List.copyOf(new LinkedHashSet<>(labels));
    }

    private Map<String, String> serviceContextResourceMatch(OtlpMetricsConsoleDto.Context context) {
        if (context == null || !StringUtils.hasText(context.getServiceName())) {
            return Map.of();
        }
        LinkedHashMap<String, String> values = new LinkedHashMap<>();
        values.put("service_name", context.getServiceName());
        if (StringUtils.hasText(context.getServiceNamespace())) {
            values.put("service_namespace", context.getServiceNamespace());
        }
        if (StringUtils.hasText(context.getEnvironment())) {
            values.put("deployment_environment_name", context.getEnvironment());
        }
        if (context.getEntityId() != null) {
            values.put("hertzbeat_entity_id", String.valueOf(context.getEntityId()));
        }
        if (StringUtils.hasText(context.getEntityType())) {
            values.put("hertzbeat_entity_type", context.getEntityType());
        }
        return values;
    }

    private Map<String, String> operationContextResourceMatch(OtlpMetricsConsoleDto.Context context, String operationName) {
        LinkedHashMap<String, String> values = new LinkedHashMap<>(serviceContextResourceMatch(context));
        String normalizedOperationName = trimToNull(operationName);
        if (StringUtils.hasText(normalizedOperationName)) {
            values.put("operation_name", normalizedOperationName);
            values.put("http_route", normalizedOperationName);
        }
        return values;
    }

    private String relatedMetricFamily(String metricName) {
        String normalized = trimToNull(metricName);
        if (!StringUtils.hasText(normalized)) {
            return "other";
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("cpu")) {
            return "cpu";
        }
        if (lower.contains("memory") || lower.contains("mem") || lower.contains("working_set") || lower.contains("rss")) {
            return "memory";
        }
        if (lower.contains("duration") || lower.contains("latency")) {
            return "latency";
        }
        if (lower.endsWith("_count") || lower.contains("request") || lower.contains("rpc")) {
            return "throughput";
        }
        return "other";
    }

    private int resolveRelatedMetricsLimit(String requestedLimit) {
        String normalizedLimit = trimToNull(requestedLimit);
        if (!StringUtils.hasText(normalizedLimit) || !normalizedLimit.matches("\\d+")) {
            return DEFAULT_RELATED_METRICS_LIMIT;
        }
        try {
            int parsed = Integer.parseInt(normalizedLimit);
            return parsed > 0 ? Math.min(parsed, MAX_RELATED_METRICS_LIMIT) : DEFAULT_RELATED_METRICS_LIMIT;
        } catch (NumberFormatException ignored) {
            return DEFAULT_RELATED_METRICS_LIMIT;
        }
    }

    private List<LogEntry> queryRecentLogs(long start, long end) {
        return logQueryRepository.queryRecentLogs(start, end, SAMPLE_LIMIT);
    }

    private <T> List<T> safeBeanList(List<T> items) {
        if (items == null) {
            return List.of();
        }
        return items.stream().filter(Objects::nonNull).toList();
    }

    private TelemetryIdentitySnapshot resolveRecentExternalSignalContext(long start, long end,
                                                                        String serviceName, String serviceNamespace,
                                                                        String environment) {
        String requiredServiceName = trimToNull(serviceName);
        String requiredServiceNamespace = trimToNull(serviceNamespace);
        String requiredEnvironment = trimToNull(environment);
        List<LogEntry> externalLogs = queryRecentLogs(start, end).stream()
                .filter(this::isExternalLog)
                .toList();
        var tracePage = entityTraceQueryService
                .queryTraceList(null, start, end, null, false, null, null, null, 0, SAMPLE_LIMIT);
        List<TraceListItemDto> externalTraces = (tracePage == null ? List.<TraceListItemDto>of() : tracePage.getContent())
                .stream()
                .filter(this::isExternalTrace)
                .toList();
        return observabilitySignalIntakeGateway.collectRecentExternalIdentitySnapshots(externalLogs, externalTraces, List.of()).stream()
                .filter(snapshot -> StringUtils.hasText(trimToNull(snapshot.getServiceName())))
                .filter(snapshot -> requiredServiceName == null
                        || requiredServiceName.equals(trimToNull(snapshot.getServiceName())))
                .filter(snapshot -> requiredServiceNamespace == null
                        || requiredServiceNamespace.equals(trimToNull(snapshot.getServiceNamespace())))
                .filter(snapshot -> requiredEnvironment == null
                        || requiredEnvironment.equals(trimToNull(snapshot.getEnvironmentName())))
                .sorted(Comparator
                        .comparingInt((TelemetryIdentitySnapshot snapshot) -> signalContextPriority(snapshot.getSignal()))
                        .thenComparing(TelemetryIdentitySnapshot::getObservedAt,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .findFirst()
                .orElse(null);
    }

    private int signalContextPriority(String signal) {
        if ("traces".equalsIgnoreCase(signal)) {
            return 0;
        }
        if ("logs".equalsIgnoreCase(signal)) {
            return 1;
        }
        return 2;
    }

    private long safeLogCount(long start, long end) {
        return logQueryRepository.countRecentLogs(start, end);
    }

    private void appendIdentitySamples(List<OtlpEntityBindingSummaryDto.CanonicalIdentitySample> samples,
                                       List<TelemetryIdentitySnapshot> snapshots) {
        Set<String> seen = new LinkedHashSet<>();
        for (TelemetryIdentitySnapshot snapshot : snapshots) {
            if (snapshot == null || CollectionUtils.isEmpty(snapshot.getCanonicalIdentities())) {
                continue;
            }
            for (String key : EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS) {
                String value = snapshot.getCanonicalIdentities().get(key);
                if (!StringUtils.hasText(value) || !seen.add(snapshot.getSignal() + ":" + key + ":" + value)) {
                    continue;
                }
                samples.add(new OtlpEntityBindingSummaryDto.CanonicalIdentitySample(key, value, snapshot.getSignal()));
                if (samples.size() >= 12) {
                    return;
                }
            }
        }
    }

    private boolean isExternalLog(LogEntry logEntry) {
        if (logEntry == null || CollectionUtils.isEmpty(logEntry.getResource())) {
            return true;
        }
        return !isWorkspaceNoiseResource(logEntry.getResource());
    }

    private boolean isExternalTrace(TraceListItemDto traceItem) {
        if (traceItem == null || CollectionUtils.isEmpty(traceItem.getResourceAttributes())) {
            return true;
        }
        return !isWorkspaceNoiseResource(traceItem.getResourceAttributes());
    }

    private boolean isSelfTelemetryResource(Map<?, ?> resourceAttributes) {
        if (CollectionUtils.isEmpty(resourceAttributes)) {
            return false;
        }
        String serviceName = normalizeValue(resourceAttributes.get("service.name"));
        String serviceNamespace = normalizeValue(resourceAttributes.get("service.namespace"));
        return "hertzbeat".equals(serviceName)
                || "apache-hertzbeat".equals(serviceName)
                || "hertzbeat".equals(serviceNamespace)
                || "apache-hertzbeat".equals(serviceNamespace);
    }

    private boolean isWorkspaceNoiseResource(Map<?, ?> resourceAttributes) {
        if (isSelfTelemetryResource(resourceAttributes)) {
            return true;
        }
        if (CollectionUtils.isEmpty(resourceAttributes)) {
            return false;
        }
        String serviceName = normalizeValue(resourceAttributes.get("service.name"));
        return isWorkspaceNoiseService(serviceName);
    }

    private boolean isWorkspaceNoiseService(String serviceName) {
        String normalized = normalizeValue(serviceName);
        return StringUtils.hasText(normalized) && WORKSPACE_INFRA_SERVICE_NAMES.contains(normalized);
    }

    private String normalizeValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text.toLowerCase(Locale.ROOT);
    }

    private Set<String> canonicalIdentityKeySet() {
        return new LinkedHashSet<>(EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS);
    }

    private Map<Long, List<EntityIdentity>> collectRecentBoundEntityIdentities(List<TelemetryIdentitySnapshot> snapshots) {
        if (CollectionUtils.isEmpty(snapshots)) {
            return Collections.emptyMap();
        }
        Set<String> identityKeys = canonicalIdentityKeySet();
        Set<String> normalizedValues = new LinkedHashSet<>();
        Map<String, Integer> matchOrder = new HashMap<>();
        int order = 0;
        for (TelemetryIdentitySnapshot snapshot : snapshots) {
            if (snapshot == null || CollectionUtils.isEmpty(snapshot.getCanonicalIdentities())) {
                continue;
            }
            for (Map.Entry<String, String> entry : snapshot.getCanonicalIdentities().entrySet()) {
                if (!identityKeys.contains(entry.getKey())) {
                    continue;
                }
                String normalizedValue = normalizeIdentityValue(entry.getValue());
                if (!StringUtils.hasText(normalizedValue)) {
                    continue;
                }
                normalizedValues.add(normalizedValue);
                matchOrder.putIfAbsent(entry.getKey() + "\u0000" + normalizedValue, order++);
            }
        }
        if (normalizedValues.isEmpty()) {
            return Collections.emptyMap();
        }
        List<EntityIdentity> matchedIdentities =
                workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(identityKeys, normalizedValues);
        if (CollectionUtils.isEmpty(matchedIdentities)) {
            return Collections.emptyMap();
        }

        Map<Long, Integer> entityOrder = new HashMap<>();
        Map<Long, List<EntityIdentity>> groupedIdentities = new LinkedHashMap<>();
        for (EntityIdentity identity : matchedIdentities) {
            if (identity == null || identity.getEntityId() == null) {
                continue;
            }
            String normalizedValue = normalizeIdentityValue(defaultText(identity.getNormalizedValue(), identity.getIdentityValue()));
            if (!StringUtils.hasText(normalizedValue)) {
                continue;
            }
            int currentOrder = matchOrder.getOrDefault(identity.getIdentityKey() + "\u0000" + normalizedValue, Integer.MAX_VALUE);
            entityOrder.merge(identity.getEntityId(), currentOrder, Math::min);
            groupedIdentities.computeIfAbsent(identity.getEntityId(), key -> new ArrayList<>()).add(identity);
        }

        return groupedIdentities.entrySet().stream()
                .sorted(Comparator.comparingInt(entry -> entityOrder.getOrDefault(entry.getKey(), Integer.MAX_VALUE)))
                .limit(6)
                .collect(LinkedHashMap::new, (map, entry) -> map.put(entry.getKey(), entry.getValue()), Map::putAll);
    }

    private String normalizeIdentityValue(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }

    private Set<String> boundIdentityMatchKeys(Map<Long, List<EntityIdentity>> entityIdentityMap) {
        if (CollectionUtils.isEmpty(entityIdentityMap)) {
            return Collections.emptySet();
        }
        Set<String> matches = new LinkedHashSet<>();
        for (List<EntityIdentity> identities : entityIdentityMap.values()) {
            if (CollectionUtils.isEmpty(identities)) {
                continue;
            }
            for (EntityIdentity identity : identities) {
                if (identity == null || !StringUtils.hasText(identity.getIdentityKey())) {
                    continue;
                }
                String normalizedValue = normalizeIdentityValue(
                        defaultText(identity.getNormalizedValue(), identity.getIdentityValue())
                );
                if (!StringUtils.hasText(normalizedValue)) {
                    continue;
                }
                matches.add(identity.getIdentityKey() + "\u0000" + normalizedValue);
            }
        }
        return matches;
    }

    private List<OtlpEntityBindingSummaryDto.UnboundEntityCandidate> buildUnboundEntityCandidates(
            List<TelemetryIdentitySnapshot> snapshots, Set<String> boundIdentityMatches) {
        if (CollectionUtils.isEmpty(snapshots)) {
            return Collections.emptyList();
        }
        Map<String, CandidateAccumulator> candidates = new LinkedHashMap<>();
        for (TelemetryIdentitySnapshot snapshot : snapshots) {
            if (snapshot == null || CollectionUtils.isEmpty(snapshot.getCanonicalIdentities())) {
                continue;
            }
            if (matchesKnownEntityIdentity(snapshot.getCanonicalIdentities(), boundIdentityMatches)) {
                continue;
            }
            String serviceName = trimToNull(firstText(
                    snapshot.getServiceName(),
                    snapshot.getCanonicalIdentities().get("service.name")
            ));
            if (!StringUtils.hasText(serviceName) || isWorkspaceNoiseService(serviceName)) {
                continue;
            }
            String namespace = trimToNull(firstText(
                    snapshot.getServiceNamespace(),
                    snapshot.getCanonicalIdentities().get("service.namespace")
            ));
            String environment = trimToNull(firstText(
                    snapshot.getEnvironmentName(),
                    snapshot.getCanonicalIdentities().get("deployment.environment.name")
            ));
            String candidateKey = normalizeIdentityValue(serviceName) + "|"
                    + defaultText(normalizeIdentityValue(namespace), "") + "|"
                    + defaultText(normalizeIdentityValue(environment), "");
            CandidateAccumulator accumulator = candidates.computeIfAbsent(candidateKey,
                    ignored -> new CandidateAccumulator(serviceName, namespace, environment,
                            snapshot.getCanonicalIdentities()));
            accumulator.add(snapshot.getSignal(), snapshot.getObservedAt(), snapshot.getCanonicalIdentities());
        }
        return candidates.values().stream()
                .sorted(Comparator.comparing(
                        CandidateAccumulator::latestObservedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .limit(DEFAULT_RECENT_UNBOUND_CANDIDATE_LIMIT)
                .map(CandidateAccumulator::toDto)
                .toList();
    }

    private boolean matchesKnownEntityIdentity(Map<String, String> canonicalIdentities, Set<String> boundIdentityMatches) {
        if (CollectionUtils.isEmpty(canonicalIdentities) || CollectionUtils.isEmpty(boundIdentityMatches)) {
            return false;
        }
        Set<String> identityKeys = canonicalIdentityKeySet();
        for (Map.Entry<String, String> entry : canonicalIdentities.entrySet()) {
            if (!identityKeys.contains(entry.getKey())) {
                continue;
            }
            String normalizedValue = normalizeIdentityValue(entry.getValue());
            if (StringUtils.hasText(normalizedValue)
                    && boundIdentityMatches.contains(entry.getKey() + "\u0000" + normalizedValue)) {
                return true;
            }
        }
        return false;
    }

    private String truncateLogBody(Object body) {
        if (body == null) {
            return null;
        }
        String text = String.valueOf(body).trim();
        if (text.length() <= 80) {
            return text;
        }
        return text.substring(0, 77) + "...";
    }

    private Long toEpochMillis(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    private String resolveOtlpHttpBaseEndpoint(HttpServletRequest request) {
        String scheme = firstText(
                extractForwardedComponent(request, "proto"),
                headerValue(request, "X-Forwarded-Proto"),
                sslEnabled ? "https" : "http"
        );
        String host = resolveExternalHost(request);
        if (!StringUtils.hasText(host)) {
            return scheme + "://" + OTLP_HOST_PLACEHOLDER + OTLP_HTTP_PATH;
        }
        return scheme + "://" + appendPortIfNeeded(host, resolveExternalPort(request, scheme), scheme) + OTLP_HTTP_PATH;
    }

    private String resolveOtlpGrpcEndpoint(HttpServletRequest request) {
        String host = resolveExternalHost(request);
        if (!StringUtils.hasText(host)) {
            return OTLP_HOST_PLACEHOLDER + ":" + otlpGrpcPort;
        }
        return stripPort(host) + ":" + otlpGrpcPort;
    }

    private String resolveExternalHost(HttpServletRequest request) {
        String forwardedHost = firstText(
                extractForwardedComponent(request, "host"),
                headerValue(request, "X-Forwarded-Host"),
                headerValue(request, "Host")
        );
        if (StringUtils.hasText(forwardedHost)) {
            return trimForwardedValue(forwardedHost);
        }
        if (request == null || !StringUtils.hasText(request.getServerName())) {
            return null;
        }
        return request.getServerName();
    }

    private Integer resolveExternalPort(HttpServletRequest request, String scheme) {
        String host = resolveExternalHost(request);
        String forwardedPort = firstText(
                extractForwardedComponent(request, "port"),
                headerValue(request, "X-Forwarded-Port")
        );
        if (StringUtils.hasText(forwardedPort)) {
            try {
                return Integer.parseInt(trimForwardedValue(forwardedPort));
            } catch (NumberFormatException ignored) {
                // Ignore invalid forwarded port and fall back to request or server defaults.
            }
        }
        Integer explicitHostPort = extractPortFromHost(host);
        if (explicitHostPort != null) {
            return explicitHostPort;
        }
        if (request != null && request.getServerPort() > 0) {
            return request.getServerPort();
        }
        return "https".equalsIgnoreCase(scheme) ? 443 : serverPort;
    }

    private String extractForwardedComponent(HttpServletRequest request, String key) {
        String forwarded = headerValue(request, "Forwarded");
        if (!StringUtils.hasText(forwarded)) {
            return null;
        }
        String firstPart = forwarded.split(",", 2)[0];
        for (String token : firstPart.split(";")) {
            String[] pair = token.split("=", 2);
            if (pair.length == 2 && key.equalsIgnoreCase(pair[0].trim())) {
                return trimForwardedValue(pair[1]);
            }
        }
        return null;
    }

    private String headerValue(HttpServletRequest request, String headerName) {
        if (request == null) {
            return null;
        }
        return request.getHeader(headerName);
    }

    private String firstText(String... candidates) {
        for (String candidate : candidates) {
            if (StringUtils.hasText(candidate)) {
                return trimForwardedValue(candidate);
            }
        }
        return null;
    }

    private String trimForwardedValue(String value) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        String trimmed = value.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() > 1) {
            trimmed = trimmed.substring(1, trimmed.length() - 1);
        }
        int commaIndex = trimmed.indexOf(',');
        if (commaIndex > 0) {
            trimmed = trimmed.substring(0, commaIndex);
        }
        return trimmed.trim();
    }

    private String appendPortIfNeeded(String host, Integer port, String scheme) {
        String normalizedHost = stripPort(host);
        if (!StringUtils.hasText(normalizedHost) || port == null) {
            return normalizedHost;
        }
        if (("http".equalsIgnoreCase(scheme) && port == 80)
                || ("https".equalsIgnoreCase(scheme) && port == 443)) {
            return normalizedHost;
        }
        return normalizedHost + ":" + port;
    }

    private String stripPort(String host) {
        if (!StringUtils.hasText(host)) {
            return host;
        }
        String trimmed = host.trim();
        if (trimmed.startsWith("[") && trimmed.contains("]")) {
            return trimmed.substring(0, trimmed.indexOf(']') + 1);
        }
        int colonIndex = trimmed.lastIndexOf(':');
        if (colonIndex > 0 && trimmed.indexOf(':') == colonIndex) {
            return trimmed.substring(0, colonIndex);
        }
        if (colonIndex > 0 && trimmed.indexOf(':') != colonIndex) {
            return "[" + trimmed + "]";
        }
        return trimmed;
    }

    private Integer extractPortFromHost(String host) {
        if (!StringUtils.hasText(host)) {
            return null;
        }
        String trimmed = host.trim();
        if (trimmed.startsWith("[") && trimmed.contains("]")) {
            int lastColon = trimmed.lastIndexOf(':');
            int closingBracket = trimmed.lastIndexOf(']');
            if (lastColon > closingBracket) {
                try {
                    return Integer.parseInt(trimmed.substring(lastColon + 1));
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
            return null;
        }
        int colonIndex = trimmed.lastIndexOf(':');
        if (colonIndex > 0 && trimmed.indexOf(':') == colonIndex) {
            try {
                return Integer.parseInt(trimmed.substring(colonIndex + 1));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String metricsIntakeMode(long monitorTotalCount, long otlpMetricCount) {
        if (monitorTotalCount > 0 && otlpMetricCount > 0) {
            return message("observability.otlp.overview.metrics.mode.mixed");
        }
        if (otlpMetricCount > 0) {
            return "OTLP";
        }
        return message("observability.otlp.overview.metrics.mode.monitor");
    }

    private static String message(String key) {
        return OtlpIngestionMessages.get(key);
    }

    private static String message(String key, Object... args) {
        return OtlpIngestionMessages.format(key, args);
    }

    private String defaultText(String primary, String fallback) {
        return StringUtils.hasText(primary) ? primary : fallback;
    }

    private OtlpMetricsConsoleDto.Context resolveMetricsConsoleContext(Long entityId, String requestedEntityType,
                                                                       long start, long end,
                                                                       String serviceName, String serviceNamespace,
                                                                       String environment) {
        String resolvedServiceName = trimToNull(serviceName);
        String resolvedServiceNamespace = trimToNull(serviceNamespace);
        String resolvedEnvironment = trimToNull(environment);
        String entityType = trimToNull(requestedEntityType);
        String entityName = null;
        if (entityId != null) {
            Optional<ObserveEntity> entity = workspaceQueryGateway.findEntityById(entityId);
            if (!StringUtils.hasText(entityType)) {
                entityType = entity.map(ObserveEntity::getType).map(this::trimToNull).orElse(null);
            }
            entityName = entity
                    .map(value -> StringUtils.hasText(value.getDisplayName()) ? value.getDisplayName() : value.getName())
                    .orElse(null);
            List<EntityIdentity> identities = workspaceQueryGateway.findIdentitiesByEntityId(entityId);
            Set<String> resolvedIdentityKeys = new LinkedHashSet<>();
            for (EntityIdentity identity : rankedEntityIdentities(identities)) {
                if (!StringUtils.hasText(identity.getIdentityKey()) || !StringUtils.hasText(identity.getIdentityValue())) {
                    continue;
                }
                if (!resolvedIdentityKeys.add(identity.getIdentityKey())) {
                    continue;
                }
                switch (identity.getIdentityKey()) {
                    case "service.name" -> resolvedServiceName = trimToNull(identity.getIdentityValue());
                    case "service.namespace" -> resolvedServiceNamespace = trimToNull(identity.getIdentityValue());
                    case "deployment.environment.name" -> resolvedEnvironment = trimToNull(identity.getIdentityValue());
                    default -> {
                    }
                }
            }
            if (!StringUtils.hasText(resolvedServiceName) && entity.isPresent()
                    && "service".equalsIgnoreCase(trimToNull(entity.get().getType()))) {
                resolvedServiceName = trimToNull(entity.get().getName());
            }
            if (!StringUtils.hasText(resolvedServiceNamespace) && entity.isPresent()) {
                resolvedServiceNamespace = trimToNull(entity.get().getNamespace());
            }
            if (!StringUtils.hasText(resolvedEnvironment) && entity.isPresent()) {
                resolvedEnvironment = trimToNull(entity.get().getEnvironment());
            }
        }
        TelemetryIdentitySnapshot recentMetricContext = observabilitySignalIntakeGateway.resolveRecentOtlpMetricContext(
                resolvedServiceName, resolvedServiceNamespace, resolvedEnvironment
        );
        if (recentMetricContext != null) {
            if (!StringUtils.hasText(resolvedServiceName)) {
                resolvedServiceName = trimToNull(recentMetricContext.getServiceName());
            }
            if (!StringUtils.hasText(resolvedServiceNamespace)) {
                resolvedServiceNamespace = trimToNull(recentMetricContext.getServiceNamespace());
            }
            if (!StringUtils.hasText(resolvedEnvironment)) {
                resolvedEnvironment = trimToNull(recentMetricContext.getEnvironmentName());
            }
        }
        if (isWorkspaceNoiseService(resolvedServiceName)) {
            resolvedServiceName = null;
            resolvedServiceNamespace = null;
            resolvedEnvironment = null;
        }
        if (!StringUtils.hasText(resolvedServiceName)
                || !StringUtils.hasText(resolvedServiceNamespace)
                || !StringUtils.hasText(resolvedEnvironment)) {
            TelemetryIdentitySnapshot fallbackSignalContext = resolveRecentExternalSignalContext(
                    start, end, resolvedServiceName, resolvedServiceNamespace, resolvedEnvironment
            );
            if (fallbackSignalContext != null) {
                if (!StringUtils.hasText(resolvedServiceName)) {
                    resolvedServiceName = trimToNull(fallbackSignalContext.getServiceName());
                }
                if (!StringUtils.hasText(resolvedServiceNamespace)) {
                    resolvedServiceNamespace = trimToNull(fallbackSignalContext.getServiceNamespace());
                }
                if (!StringUtils.hasText(resolvedEnvironment)) {
                    resolvedEnvironment = trimToNull(fallbackSignalContext.getEnvironmentName());
                }
            }
        }
        return new OtlpMetricsConsoleDto.Context(
                entityId,
                entityType,
                entityName,
                resolvedServiceName,
                resolvedServiceNamespace,
                resolvedEnvironment,
                start,
                end
        );
    }

    private List<EntityIdentity> rankedEntityIdentities(List<EntityIdentity> identities) {
        if (CollectionUtils.isEmpty(identities)) {
            return List.of();
        }
        return identities.stream()
                .sorted(Comparator.comparing(EntityIdentity::isPrimaryIdentity).reversed()
                        .thenComparing(EntityIdentity::getPriority, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(EntityIdentity::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private OtlpMetricsConsoleDto queryDefaultMetricsConsole(OtlpMetricsConsoleDto.Context initialContext,
                                                             boolean explicitContextRequested,
                                                             String filter,
                                                             String groupBy,
                                                             String aggregation,
                                                             String temporalAggregation,
                                                             long resolvedStart,
                                                             long resolvedEnd,
                                                             String resolvedStep,
                                                             int resolvedSeriesLimit) {
        if (!metricQueryRepository.hasPromqlExecutor()) {
            return null;
        }
        List<OtlpMetricsConsoleDto.Context> candidateContexts = new ArrayList<>();
        addCandidateMetricsContext(candidateContexts, initialContext, resolvedStart, resolvedEnd);
        if (!explicitContextRequested) {
            observabilitySignalIntakeGateway.collectRecentOtlpMetricContexts(DEFAULT_RECENT_SERVICE_LIMIT).stream()
                    .map(snapshot -> new OtlpMetricsConsoleDto.Context(
                            null,
                            null,
                            null,
                            trimToNull(snapshot.getServiceName()),
                            trimToNull(snapshot.getServiceNamespace()),
                            trimToNull(snapshot.getEnvironmentName()),
                            resolvedStart,
                            resolvedEnd
                    ))
                    .forEach(context -> addCandidateMetricsContext(candidateContexts, context, resolvedStart, resolvedEnd));
        }
        OtlpMetricsConsoleDto firstEmptyConsole = null;
        String lastErrorMessage = null;
        for (OtlpMetricsConsoleDto.Context candidateContext : candidateContexts) {
            for (String metricName : candidateMetricNames(candidateContext)) {
                String candidateQuery = buildMetricsQueryForMetric(candidateContext, metricName, filter, groupBy,
                        aggregation, temporalAggregation);
                if (!StringUtils.hasText(candidateQuery)) {
                    continue;
                }
                MetricsQueryExecution execution = executeMetricsConsoleQuery(candidateQuery, resolvedStart,
                        resolvedEnd, resolvedStep, resolvedSeriesLimit);
                if (execution.errorMessage() != null) {
                    lastErrorMessage = execution.errorMessage();
                    continue;
                }
                OtlpMetricsConsoleDto console = new OtlpMetricsConsoleDto(
                        candidateContext,
                        candidateQuery,
                        execution.datasource(),
                        WarehouseConstants.PROMQL,
                        execution.results(),
                        execution.stats(),
                        deriveMetricsEmptyStateReason(execution.results(), execution.stats()),
                        execution.results() == null ? null : trimToNull(execution.results().getMsg())
                );
                if (execution.stats().getNonEmptySeries() > 0) {
                    return console;
                }
                if (firstEmptyConsole == null) {
                    firstEmptyConsole = console;
                }
            }
        }
        if (firstEmptyConsole != null) {
            return firstEmptyConsole;
        }
        if (lastErrorMessage != null) {
            return new OtlpMetricsConsoleDto(
                    initialContext,
                    null,
                    null,
                    WarehouseConstants.PROMQL,
                    null,
                    new OtlpMetricsConsoleDto.Stats(0, 0, null),
                    "load_failed",
                    lastErrorMessage
            );
        }
        return null;
    }

    private String buildDefaultMetricsQuery(OtlpMetricsConsoleDto.Context context,
                                            String filter,
                                            String groupBy,
                                            String aggregation,
                                            String temporalAggregation) {
        if (context == null || !StringUtils.hasText(context.getServiceName())) {
            return null;
        }
        String preferredMetricName = candidateMetricNames(context).stream().findFirst().orElse(null);
        if (!StringUtils.hasText(preferredMetricName)) {
            return null;
        }
        return buildMetricsQueryForMetric(context, preferredMetricName, filter, groupBy, aggregation,
                temporalAggregation);
    }

    private List<String> candidateMetricNames(OtlpMetricsConsoleDto.Context context) {
        if (context == null || !StringUtils.hasText(context.getServiceName())) {
            return List.of();
        }
        List<String> candidates = new ArrayList<>(contextServiceExperienceMetricNames(context));
        List<String> contextNames = observabilitySignalIntakeGateway.collectRecentOtlpMetricNames(
                context.getServiceName(),
                context.getServiceNamespace(),
                context.getEnvironment(),
                DEFAULT_RECENT_METRIC_NAME_LIMIT
        );
        candidates.addAll(contextNames);
        if (!CollectionUtils.isEmpty(candidates)) {
            return normalizeCandidateMetricNames(candidates);
        }
        return normalizeCandidateMetricNames(observabilitySignalIntakeGateway.collectRecentOtlpMetricNames(
                null,
                null,
                null,
                DEFAULT_RECENT_METRIC_NAME_LIMIT
        ));
    }

    private List<String> contextServiceExperienceMetricNames(OtlpMetricsConsoleDto.Context context) {
        if (context == null || !"hertzbeat-demo".equalsIgnoreCase(trimToNull(context.getServiceNamespace()))) {
            return List.of();
        }
        String serviceMetricSegment = normalizePromqlMetricName(context.getServiceName());
        if (!StringUtils.hasText(serviceMetricSegment)) {
            return List.of("rpc_server_duration_milliseconds");
        }
        return List.of(
                "rpc_server_duration_milliseconds",
                "hertzbeat_demo_" + serviceMetricSegment + "_latency_ms_milliseconds"
        );
    }

    private List<String> normalizeCandidateMetricNames(List<String> metricNames) {
        if (CollectionUtils.isEmpty(metricNames)) {
            return List.of();
        }
        return metricNames.stream()
                .map(this::normalizePromqlMetricName)
                .filter(StringUtils::hasText)
                .filter(metricName -> !isWorkspaceNoiseMetric(metricName))
                .distinct()
                .limit(DEFAULT_METRICS_QUERY_CANDIDATE_LIMIT)
                .toList();
    }

    private String buildMetricsQueryForMetric(OtlpMetricsConsoleDto.Context context,
                                              String metricName,
                                              String filter,
                                              String groupBy,
                                              String aggregation,
                                              String temporalAggregation) {
        if (context == null || !StringUtils.hasText(context.getServiceName())) {
            return null;
        }
        String normalizedMetricName = normalizePromqlMetricName(metricName);
        if (!StringUtils.hasText(normalizedMetricName)) {
            return null;
        }
        List<String> matchers = new ArrayList<>();
        Set<String> scopedLabels = new LinkedHashSet<>();
        matchers.add("__name__=\"" + escapePromqlLabelValue(normalizedMetricName) + "\"");
        scopedLabels.add("__name__");
        matchers.add("service_name=\"" + escapePromqlLabelValue(context.getServiceName()) + "\"");
        scopedLabels.add("service_name");
        if (StringUtils.hasText(context.getServiceNamespace())) {
            matchers.add("service_namespace=\"" + escapePromqlLabelValue(context.getServiceNamespace()) + "\"");
            scopedLabels.add("service_namespace");
        }
        if (StringUtils.hasText(context.getEnvironment())) {
            matchers.add("deployment_environment_name=\"" + escapePromqlLabelValue(context.getEnvironment()) + "\"");
            scopedLabels.add("deployment_environment_name");
        }
        if (context.getEntityId() != null) {
            matchers.add("hertzbeat_entity_id=\"" + escapePromqlLabelValue(String.valueOf(context.getEntityId())) + "\"");
            scopedLabels.add("hertzbeat_entity_id");
        }
        if (StringUtils.hasText(context.getEntityType())) {
            matchers.add("hertzbeat_entity_type=\"" + escapePromqlLabelValue(context.getEntityType()) + "\"");
            scopedLabels.add("hertzbeat_entity_type");
        }
        matchers.addAll(parseMetricsFilterMatchers(filter, scopedLabels));
        String selector = "{" + String.join(", ", matchers) + "}";
        return normalizeAggregation(aggregation)
                + " by (" + normalizeGroupBy(groupBy) + ") ("
                + wrapMetricSelectorForTemporalAggregation(selector, temporalAggregation) + ")";
    }

    private String buildMetricsQueryForContext(OtlpMetricsConsoleDto.Context context,
                                               String filter,
                                               String groupBy,
                                               String aggregation,
                                               String temporalAggregation) {
        if (context == null || !StringUtils.hasText(context.getServiceName())) {
            return null;
        }
        List<String> matchers = new ArrayList<>();
        Set<String> scopedLabels = new LinkedHashSet<>();
        matchers.add("service_name=\"" + escapePromqlLabelValue(context.getServiceName()) + "\"");
        scopedLabels.add("service_name");
        if (StringUtils.hasText(context.getServiceNamespace())) {
            matchers.add("service_namespace=\"" + escapePromqlLabelValue(context.getServiceNamespace()) + "\"");
            scopedLabels.add("service_namespace");
        }
        if (StringUtils.hasText(context.getEnvironment())) {
            matchers.add("deployment_environment_name=\"" + escapePromqlLabelValue(context.getEnvironment()) + "\"");
            scopedLabels.add("deployment_environment_name");
        }
        if (context.getEntityId() != null) {
            matchers.add("hertzbeat_entity_id=\"" + escapePromqlLabelValue(String.valueOf(context.getEntityId())) + "\"");
            scopedLabels.add("hertzbeat_entity_id");
        }
        if (StringUtils.hasText(context.getEntityType())) {
            matchers.add("hertzbeat_entity_type=\"" + escapePromqlLabelValue(context.getEntityType()) + "\"");
            scopedLabels.add("hertzbeat_entity_type");
        }
        matchers.addAll(parseMetricsFilterMatchers(filter, scopedLabels));
        String selector = "{" + String.join(", ", matchers) + "}";
        return normalizeAggregation(aggregation)
                + " by (" + normalizeGroupBy(groupBy) + ") ("
                + wrapMetricSelectorForTemporalAggregation(selector, temporalAggregation) + ")";
    }

    private String buildMetricsQueryForExplicitMetric(OtlpMetricsConsoleDto.Context context,
                                                      String query,
                                                      String filter,
                                                      String groupBy,
                                                      String aggregation,
                                                      String temporalAggregation) {
        String normalizedQuery = trimToNull(query);
        if (!StringUtils.hasText(normalizedQuery) || !SIMPLE_METRIC_NAME.matcher(normalizedQuery).matches()) {
            return query;
        }
        String generatedQuery = buildMetricsQueryForMetric(context, normalizedQuery, filter, groupBy, aggregation,
                temporalAggregation);
        return StringUtils.hasText(generatedQuery) ? generatedQuery : query;
    }

    private List<String> parseMetricsFilterMatchers(String filter) {
        return parseMetricsFilterMatchers(filter, Set.of());
    }

    private List<String> parseMetricsFilterMatchers(String filter, Set<String> excludedLabels) {
        String normalized = trimToNull(filter);
        if (!StringUtils.hasText(normalized)) {
            return List.of();
        }
        List<String> matchers = new ArrayList<>();
        for (String rawClause : splitMetricsFilterClauses(normalized)) {
            String clause = trimToNull(rawClause);
            if (!StringUtils.hasText(clause)) {
                continue;
            }
            String parsedMatcher = parseMetricsFriendlyFilterMatcher(clause, excludedLabels);
            if (StringUtils.hasText(parsedMatcher)) {
                matchers.add(parsedMatcher);
                continue;
            }
            Matcher matcher = METRICS_FILTER_MATCHER.matcher(clause);
            if (!matcher.matches()) {
                continue;
            }
            String labelName = normalizePromqlLabelName(matcher.group(1));
            if (!isPromqlLabelName(labelName)) {
                continue;
            }
            if (excludedLabels.contains(labelName)) {
                continue;
            }
            String labelValue = firstText(matcher.group(3), matcher.group(4), matcher.group(5));
            if (!StringUtils.hasText(labelValue)) {
                continue;
            }
            matchers.add(labelName + matcher.group(2) + "\"" + escapePromqlLabelValue(labelValue) + "\"");
        }
        return matchers;
    }

    private String parseMetricsFriendlyFilterMatcher(String clause, Set<String> excludedLabels) {
        String listMatcher = parseMetricsListFilterMatcher(clause, excludedLabels);
        if (StringUtils.hasText(listMatcher)) {
            return listMatcher;
        }
        String textMatcher = parseMetricsTextFilterMatcher(clause, excludedLabels);
        if (StringUtils.hasText(textMatcher)) {
            return textMatcher;
        }
        return parseMetricsPresenceFilterMatcher(clause, excludedLabels);
    }

    private String parseMetricsListFilterMatcher(String clause, Set<String> excludedLabels) {
        Matcher matcher = METRICS_FILTER_LIST_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return null;
        }
        String labelName = normalizePromqlLabelName(matcher.group(1));
        if (!isPromqlLabelName(labelName) || excludedLabels.contains(labelName)) {
            return null;
        }
        String valueList = trimToNull(matcher.group(3));
        if (!StringUtils.hasText(valueList) || valueList.length() < 2
                || !valueList.startsWith("(") || !valueList.endsWith(")")) {
            return null;
        }
        List<String> values = splitMetricsFilterListValues(valueList.substring(1, valueList.length() - 1)).stream()
                .map(value -> stripMetricsFilterQuotes(trimToNull(value)))
                .filter(StringUtils::hasText)
                .toList();
        if (values.isEmpty()) {
            return null;
        }
        String regex = "^(?:" + values.stream()
                .map(this::escapePromqlRegexValue)
                .collect(java.util.stream.Collectors.joining("|")) + ")$";
        String operator = trimToNull(matcher.group(2));
        String promqlOperator = operator != null && operator.replaceAll("\\s+", " ").equalsIgnoreCase("not in")
                ? "!~"
                : "=~";
        return labelName + promqlOperator + "\"" + escapePromqlLabelValue(regex) + "\"";
    }

    private String parseMetricsTextFilterMatcher(String clause, Set<String> excludedLabels) {
        Matcher matcher = METRICS_FILTER_TEXT_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return null;
        }
        String labelName = normalizePromqlLabelName(matcher.group(1));
        if (!isPromqlLabelName(labelName) || excludedLabels.contains(labelName)) {
            return null;
        }
        String value = stripMetricsFilterQuotes(trimToNull(matcher.group(3)));
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String regex = ".*" + escapePromqlRegexValue(value) + ".*";
        String operator = trimToNull(matcher.group(2));
        String promqlOperator = operator != null && operator.replaceAll("\\s+", " ").equalsIgnoreCase("not contains")
                ? "!~"
                : "=~";
        return labelName + promqlOperator + "\"" + escapePromqlLabelValue(regex) + "\"";
    }

    private String parseMetricsPresenceFilterMatcher(String clause, Set<String> excludedLabels) {
        Matcher matcher = METRICS_FILTER_PRESENCE_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return null;
        }
        String labelName = normalizePromqlLabelName(matcher.group(1));
        if (!isPromqlLabelName(labelName) || excludedLabels.contains(labelName)) {
            return null;
        }
        String operator = trimToNull(matcher.group(2));
        String promqlOperator = operator != null && operator.replaceAll("\\s+", " ").equalsIgnoreCase("not exists")
                ? "!~"
                : "=~";
        return labelName + promqlOperator + "\".+\"";
    }

    private List<String> splitMetricsFilterClauses(String filter) {
        List<String> clauses = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        char quote = 0;
        for (int index = 0; index < filter.length(); index++) {
            char character = filter.charAt(index);
            if (quote != 0) {
                current.append(character);
                if (character == quote) {
                    quote = 0;
                }
                continue;
            }
            if (character == '\'' || character == '"') {
                quote = character;
                current.append(character);
                continue;
            }
            if (character == '(') {
                depth++;
                current.append(character);
                continue;
            }
            if (character == ')') {
                depth = Math.max(0, depth - 1);
                current.append(character);
                continue;
            }
            if (depth == 0 && character == ',') {
                addMetricsFilterClause(clauses, current);
                continue;
            }
            if (depth == 0 && isMetricsFilterAndDelimiter(filter, index)) {
                addMetricsFilterClause(clauses, current);
                index += 4;
                continue;
            }
            current.append(character);
        }
        addMetricsFilterClause(clauses, current);
        return clauses;
    }

    private List<String> splitMetricsFilterListValues(String values) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        char quote = 0;
        for (int index = 0; index < values.length(); index++) {
            char character = values.charAt(index);
            if (quote != 0) {
                current.append(character);
                if (character == quote) {
                    quote = 0;
                }
                continue;
            }
            if (character == '\'' || character == '"') {
                quote = character;
                current.append(character);
                continue;
            }
            if (character == ',') {
                addMetricsFilterClause(result, current);
                continue;
            }
            current.append(character);
        }
        addMetricsFilterClause(result, current);
        return result;
    }

    private void addMetricsFilterClause(List<String> clauses, StringBuilder current) {
        String clause = trimToNull(current.toString());
        if (StringUtils.hasText(clause)) {
            clauses.add(clause);
        }
        current.setLength(0);
    }

    private boolean isMetricsFilterAndDelimiter(String value, int index) {
        return index + 5 <= value.length() && value.regionMatches(true, index, " and ", 0, 5);
    }

    private String stripMetricsFilterQuotes(String value) {
        if (value == null || value.length() < 2) {
            return value;
        }
        char first = value.charAt(0);
        char last = value.charAt(value.length() - 1);
        if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
            return trimToNull(value.substring(1, value.length() - 1));
        }
        return value;
    }

    private String escapePromqlRegexValue(String value) {
        String normalized = trimToNull(value);
        if (!StringUtils.hasText(normalized)) {
            return "";
        }
        StringBuilder escaped = new StringBuilder();
        for (int index = 0; index < normalized.length(); index++) {
            char character = normalized.charAt(index);
            if ("\\.^$|?*+()[]{}".indexOf(character) >= 0) {
                escaped.append('\\');
            }
            escaped.append(character);
        }
        return escaped.toString();
    }

    private String normalizePromqlLabelName(String label) {
        String normalized = trimToNull(label);
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

    private void addCandidateMetricsContext(List<OtlpMetricsConsoleDto.Context> contexts,
                                            OtlpMetricsConsoleDto.Context candidate,
                                            long resolvedStart,
                                            long resolvedEnd) {
        if (candidate == null || !StringUtils.hasText(candidate.getServiceName())) {
            return;
        }
        OtlpMetricsConsoleDto.Context normalized = new OtlpMetricsConsoleDto.Context(
                candidate.getEntityId(),
                trimToNull(candidate.getEntityType()),
                candidate.getEntityName(),
                trimToNull(candidate.getServiceName()),
                trimToNull(candidate.getServiceNamespace()),
                trimToNull(candidate.getEnvironment()),
                resolvedStart,
                resolvedEnd
        );
        boolean duplicated = contexts.stream().anyMatch(existing ->
                Objects.equals(trimToNull(existing.getServiceName()), trimToNull(normalized.getServiceName()))
                        && Objects.equals(trimToNull(existing.getServiceNamespace()), trimToNull(normalized.getServiceNamespace()))
                        && Objects.equals(trimToNull(existing.getEnvironment()), trimToNull(normalized.getEnvironment()))
        );
        if (!duplicated) {
            contexts.add(normalized);
        }
    }

    private MetricsQueryExecution executeMetricsConsoleQuery(String query,
                                                             long resolvedStart,
                                                             long resolvedEnd,
                                                             String resolvedStep,
                                                             int resolvedSeriesLimit) {
        MetricQueryRepository.PromqlRangeQueryResult queryResult = metricQueryRepository.queryPromqlRange(
                METRICS_CONSOLE_REF_ID,
                query,
                resolvedStart,
                resolvedEnd,
                resolvedStep
        );
        if (queryResult.errorMessage() != null) {
            log.warn("query OTLP metrics console failed: {}", queryResult.errorMessage());
            return new MetricsQueryExecution(
                    queryResult.datasource(),
                    null,
                    new OtlpMetricsConsoleDto.Stats(0, 0, null),
                    queryResult.errorMessage()
            );
        }
        DatasourceQueryData results = limitMetricsConsoleResults(queryResult.results(), resolvedSeriesLimit);
        return new MetricsQueryExecution(
                queryResult.datasource(),
                results,
                buildMetricsConsoleStats(results),
                null
        );
    }

    private List<String> collectRecentServices(List<TelemetryIdentitySnapshot> snapshots, int limit) {
        if (CollectionUtils.isEmpty(snapshots) || limit <= 0) {
            return List.of();
        }
        LinkedHashSet<String> services = new LinkedHashSet<>();
        snapshots.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(
                        TelemetryIdentitySnapshot::getObservedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(snapshot -> firstText(snapshot.getServiceName(),
                        snapshot.getCanonicalIdentities() == null ? null : snapshot.getCanonicalIdentities().get("service.name")))
                .filter(StringUtils::hasText)
                .forEach(serviceName -> {
                    if (services.size() < limit) {
                        services.add(serviceName);
                    }
                });
        return List.copyOf(services);
    }

    private String selectPreferredMetricName(List<String> metricNames) {
        if (CollectionUtils.isEmpty(metricNames)) {
            return null;
        }
        return metricNames.stream()
                .filter(StringUtils::hasText)
                .sorted(Comparator.comparingInt(this::metricNamePriority).thenComparing(String::compareTo))
                .findFirst()
                .orElse(null);
    }

    private int metricNamePriority(String metricName) {
        String normalized = trimToNull(metricName);
        if (!StringUtils.hasText(normalized)) {
            return Integer.MAX_VALUE;
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (normalized.contains("http_server") && normalized.endsWith("_count")) {
            return 0;
        }
        if (normalized.contains("rpc_server") && normalized.endsWith("_count")) {
            return 1;
        }
        if (normalized.contains("request_duration_count")) {
            return 2;
        }
        if (normalized.contains("duration_count")) {
            return 3;
        }
        if (normalized.endsWith("_count")) {
            return 4;
        }
        if (normalized.contains("active_requests")) {
            return 5;
        }
        if (normalized.endsWith("_sum")) {
            return 6;
        }
        if (normalized.endsWith("_bucket")) {
            return 8;
        }
        return 7;
    }

    private String normalizePromqlMetricName(String metricName) {
        String normalized = trimToNull(metricName);
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

    private boolean isWorkspaceNoiseMetric(String metricName) {
        String normalized = trimToNull(metricName);
        if (!StringUtils.hasText(normalized)) {
            return true;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        return lower.startsWith("otelcol_")
                || lower.startsWith("process_")
                || lower.startsWith("scrape_")
                || lower.startsWith("target_info")
                || lower.startsWith("otel_scope_")
                || lower.contains("exporter_send_")
                || lower.contains("receiver_accepted_")
                || lower.contains("receiver_refused_");
    }

    private String normalizeAggregation(String aggregation) {
        String normalized = trimToNull(aggregation);
        return StringUtils.hasText(normalized) ? normalized : DEFAULT_METRICS_AGGREGATION;
    }

    private String wrapMetricSelectorForTemporalAggregation(String selector, String temporalAggregation) {
        String normalized = trimToNull(temporalAggregation);
        if (!StringUtils.hasText(normalized) || "raw".equalsIgnoreCase(normalized)) {
            return selector;
        }
        String function = normalized.toLowerCase(Locale.ROOT);
        if (!List.of("rate", "increase", "delta").contains(function)) {
            return selector;
        }
        return function + "(" + selector + "[5m])";
    }

    private String normalizeGroupBy(String groupBy) {
        String normalized = trimToNull(groupBy);
        if (!StringUtils.hasText(normalized)) {
            return DEFAULT_METRICS_GROUP_BY;
        }
        LinkedHashSet<String> groupLabels = new LinkedHashSet<>();
        for (String label : normalized.split(",")) {
            String trimmed = trimToNull(label);
            if (!StringUtils.hasText(trimmed)) {
                continue;
            }
            String resolvedLabel = normalizeMetricsGroupByLabel(trimmed);
            if (StringUtils.hasText(resolvedLabel)) {
                groupLabels.add(resolvedLabel);
            }
        }
        groupLabels.addAll(METRICS_ENTITY_CONTEXT_GROUP_LABELS);
        return String.join(", ", groupLabels);
    }

    private String normalizeMetricsGroupByLabel(String label) {
        String normalized = trimToNull(label);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        String resourceKey = normalized.toLowerCase(Locale.ROOT);
        if (resourceKey.startsWith("resource:")) {
            resourceKey = resourceKey.substring("resource:".length());
        }
        if (EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(resourceKey)
                || resourceKey.startsWith("hertzbeat.")) {
            return resourceKey.replace('.', '_').replace('-', '_');
        }
        return isPromqlLabelName(normalized) ? normalized : null;
    }

    private boolean isPromqlLabelName(String label) {
        return label != null && label.matches("[A-Za-z_:][A-Za-z0-9_:]*");
    }

    private String escapePromqlLabelValue(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String resolvePromqlStep(long start, long end, String requestedStep) {
        String normalizedStep = trimToNull(requestedStep);
        if (StringUtils.hasText(normalizedStep) && normalizedStep.matches("\\d+")) {
            try {
                long seconds = Long.parseLong(normalizedStep);
                if (seconds > 0 && seconds <= Duration.ofDays(1).toSeconds()) {
                    return seconds + "s";
                }
            } catch (NumberFormatException ignored) {
                // Fall back to the automatic step for out-of-range values.
            }
        }
        long rangeMillis = Math.max(1L, end - start);
        if (rangeMillis <= Duration.ofHours(1).toMillis()) {
            return "30s";
        }
        if (rangeMillis <= Duration.ofHours(6).toMillis()) {
            return "1m";
        }
        if (rangeMillis <= Duration.ofDays(1).toMillis()) {
            return "5m";
        }
        return "15m";
    }

    private int resolveMetricsSeriesLimit(String requestedLimit) {
        String normalizedLimit = trimToNull(requestedLimit);
        if (!StringUtils.hasText(normalizedLimit) || !normalizedLimit.matches("\\d+")) {
            return DEFAULT_METRICS_SERIES_LIMIT;
        }
        try {
            int limit = Integer.parseInt(normalizedLimit);
            return limit > 0 ? Math.min(limit, MAX_METRICS_SERIES_LIMIT) : DEFAULT_METRICS_SERIES_LIMIT;
        } catch (NumberFormatException ignored) {
            return DEFAULT_METRICS_SERIES_LIMIT;
        }
    }

    private DatasourceQueryData limitMetricsConsoleResults(DatasourceQueryData results, int seriesLimit) {
        if (results == null || seriesLimit <= 0 || CollectionUtils.isEmpty(results.getFrames())
                || results.getFrames().size() <= seriesLimit) {
            return results;
        }
        return new DatasourceQueryData(
                results.getRefId(),
                results.getStatus(),
                results.getMsg(),
                results.getFrames().stream().limit(seriesLimit).toList()
        );
    }

    private OtlpMetricsConsoleDto.Stats buildMetricsConsoleStats(DatasourceQueryData results) {
        if (results == null || CollectionUtils.isEmpty(results.getFrames())) {
            return new OtlpMetricsConsoleDto.Stats(0, 0, null);
        }
        int totalSeries = results.getFrames().size();
        int nonEmptySeries = 0;
        Long latestObservedAt = null;
        for (DatasourceQueryData.SchemaData frame : results.getFrames()) {
            if (frame == null || CollectionUtils.isEmpty(frame.getData())) {
                continue;
            }
            nonEmptySeries++;
            for (Object[] row : frame.getData()) {
                if (row == null || row.length == 0) {
                    continue;
                }
                Long rowTimestamp = numberToLong(row[0]);
                if (rowTimestamp != null && (latestObservedAt == null || rowTimestamp > latestObservedAt)) {
                    latestObservedAt = rowTimestamp;
                }
            }
        }
        return new OtlpMetricsConsoleDto.Stats(totalSeries, nonEmptySeries, latestObservedAt);
    }

    private String deriveMetricsEmptyStateReason(DatasourceQueryData results, OtlpMetricsConsoleDto.Stats stats) {
        if (results == null) {
            return "load_failed";
        }
        if (results.getStatus() != null && results.getStatus() != 200) {
            return "load_failed";
        }
        if (stats == null || stats.getTotalSeries() == 0) {
            return "no_matching_metrics";
        }
        if (stats.getNonEmptySeries() == 0) {
            return "current_time_range_no_data";
        }
        return null;
    }

    private Long numberToLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return (long) Double.parseDouble(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private final class CandidateAccumulator {
        private final String suggestedName;
        private final String namespace;
        private final String environment;
        private final LinkedHashSet<String> signals = new LinkedHashSet<>();
        private final LinkedHashMap<String, String> canonicalIdentities = new LinkedHashMap<>();
        private Long latestObservedAt;

        private CandidateAccumulator(String suggestedName, String namespace, String environment,
                                     Map<String, String> canonicalIdentities) {
            this.suggestedName = suggestedName;
            this.namespace = namespace;
            this.environment = environment;
            mergeCanonicalIdentities(canonicalIdentities);
        }

        private void add(String signal, Long observedAt, Map<String, String> canonicalIdentities) {
            String normalizedSignal = trimToNull(signal);
            if (StringUtils.hasText(normalizedSignal)) {
                signals.add(normalizedSignal);
            }
            if (observedAt != null && (latestObservedAt == null || observedAt > latestObservedAt)) {
                latestObservedAt = observedAt;
            }
            mergeCanonicalIdentities(canonicalIdentities);
        }

        private Long latestObservedAt() {
            return latestObservedAt;
        }

        private OtlpEntityBindingSummaryDto.UnboundEntityCandidate toDto() {
            String primaryIdentityValue = firstText(canonicalIdentities.get("service.name"), suggestedName);
            return new OtlpEntityBindingSummaryDto.UnboundEntityCandidate(
                    suggestedName,
                    "service",
                    namespace,
                    environment,
                    "service.name",
                    primaryIdentityValue,
                    List.copyOf(signals),
                    new LinkedHashMap<>(canonicalIdentities),
                    latestObservedAt
            );
        }

        private void mergeCanonicalIdentities(Map<String, String> identities) {
            if (CollectionUtils.isEmpty(identities)) {
                return;
            }
            for (String key : EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS) {
                String value = trimToNull(identities.get(key));
                if (StringUtils.hasText(value)) {
                    canonicalIdentities.putIfAbsent(key, value);
                }
            }
        }
    }

    private record MetricsQueryExecution(String datasource,
                                         DatasourceQueryData results,
                                         OtlpMetricsConsoleDto.Stats stats,
                                         String errorMessage) {
    }
}
