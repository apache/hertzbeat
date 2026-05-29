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

package org.apache.hertzbeat.observability.ingestion.red;

import io.grpc.Status;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionRedSummaryDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditEvent;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditEventReader;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditService;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Builds recent OTLP ingest RED summaries from real audit events.
 */
@Service
public class OtlpIngestionRedSummaryService {

    private static final String OUTCOME_REJECTED = "rejected";
    private static final String STATUS_OK = "OK";
    private static final String UNKNOWN_DIMENSION = "unknown";
    private static final int MAX_RECENT_EVENTS = 256;
    private static final long MIN_RATE_WINDOW_MILLIS = 60_000L;
    private static final List<String> SIGNAL_ORDER = List.of("metrics", "logs", "traces");
    private static final List<String> PROTOCOL_ORDER = List.of("http", "grpc");
    private static final Set<String> SUPPORTED_SIGNALS = Set.copyOf(SIGNAL_ORDER);
    private static final Set<String> SUPPORTED_PROTOCOLS = Set.copyOf(PROTOCOL_ORDER);
    private static final Set<String> SUPPORTED_OUTCOMES = Set.of("accepted", OUTCOME_REJECTED, "dropped");
    private static final Set<String> SUPPORTED_STATUS_CODES = Set.of(
            "OK",
            "CANCELLED",
            "UNKNOWN",
            "INVALID_ARGUMENT",
            "DEADLINE_EXCEEDED",
            "NOT_FOUND",
            "ALREADY_EXISTS",
            "PERMISSION_DENIED",
            "RESOURCE_EXHAUSTED",
            "FAILED_PRECONDITION",
            "ABORTED",
            "OUT_OF_RANGE",
            "UNIMPLEMENTED",
            "INTERNAL",
            "UNAVAILABLE",
            "DATA_LOSS",
            "UNAUTHENTICATED"
    );

    private final OtlpIngestionAuditService auditService;
    private final List<OtlpIngestionAuditEventReader> eventReaders;
    private final OtlpIngestionRedactionService redactionService;

    public OtlpIngestionRedSummaryService(OtlpIngestionAuditService auditService) {
        this(auditService, List.of(), new OtlpIngestionRedactionService());
    }

    public OtlpIngestionRedSummaryService(OtlpIngestionAuditService auditService,
                                          List<OtlpIngestionAuditEventReader> eventReaders) {
        this(auditService, eventReaders, new OtlpIngestionRedactionService());
    }

    @Autowired
    public OtlpIngestionRedSummaryService(OtlpIngestionAuditService auditService,
                                          List<OtlpIngestionAuditEventReader> eventReaders,
                                          OtlpIngestionRedactionService redactionService) {
        this.auditService = auditService;
        this.eventReaders = eventReaders == null ? List.of() : List.copyOf(eventReaders.stream()
                .filter(Objects::nonNull)
                .toList());
        this.redactionService = redactionService == null ? new OtlpIngestionRedactionService() : redactionService;
    }

    public OtlpIngestionRedSummaryDto getSummary() {
        return getSummary(null);
    }

    public OtlpIngestionRedSummaryDto getSummary(Long startMillis) {
        return getSummary(startMillis, null);
    }

    public OtlpIngestionRedSummaryDto getSummary(Long startMillis, Long endMillis) {
        String workspaceId = StringUtils.trimToNull(AuthTokenRequestContext.currentWorkspaceId());
        Long safeStartMillis = normalizeTimeMillis(startMillis);
        Long safeEndMillis = normalizeTimeMillis(endMillis);
        List<OtlpIngestionAuditEvent> events = eventsForWorkspace(workspaceId, safeStartMillis, safeEndMillis);
        List<OtlpIngestionRedSummaryDto.SignalRedMetric> signals =
                buildSignalSummaries(events, safeStartMillis, safeEndMillis);
        return new OtlpIngestionRedSummaryDto(
                workspaceId,
                countRequests(events),
                requestRatePerMinute(events, safeStartMillis, safeEndMillis),
                countErrors(events),
                errorRate(events),
                requestBytes(events),
                signalItems(events),
                averageSignalItems(events),
                maxSignalItems(events),
                averageDurationMillis(events),
                maxDurationMillis(events),
                latestObservedAt(events),
                signals
        );
    }

    private List<OtlpIngestionAuditEvent> eventsForWorkspace(String workspaceId, Long startMillis, Long endMillis) {
        boolean sawDurableRows = false;
        for (OtlpIngestionAuditEventReader eventReader : eventReaders) {
            try {
                List<OtlpIngestionAuditEvent> rawEvents = eventReader
                        .recentEvents(workspaceId, MAX_RECENT_EVENTS, startMillis, endMillis).stream()
                        .filter(event -> event != null)
                        .toList();
                List<OtlpIngestionAuditEvent> scopedEvents = rawEvents.stream()
                        .filter(event -> isInRequestedScope(event, workspaceId, startMillis, endMillis))
                        .sorted(newestObservedAtFirst())
                        .limit(MAX_RECENT_EVENTS)
                        .toList();
                sawDurableRows = sawDurableRows || !scopedEvents.isEmpty();
                List<OtlpIngestionAuditEvent> events = scopedEvents.stream()
                        .map(this::normalizeAuditEvent)
                        .filter(this::hasPositiveObservedAt)
                        .filter(this::hasSupportedAuditClassification)
                        .toList();
                if (!events.isEmpty()) {
                    return events;
                }
            } catch (RuntimeException ignored) {
                // RED summary should fall back to the in-memory audit window when durable readback is unavailable.
            }
        }
        if (sawDurableRows) {
            return List.of();
        }
        return auditService.recentEvents().stream()
                .map(this::normalizeAuditEvent)
                .filter(this::hasPositiveObservedAt)
                .filter(this::hasSupportedAuditClassification)
                .filter(event -> isInRequestedScope(event, workspaceId, startMillis, endMillis))
                .sorted(newestObservedAtFirst())
                .limit(MAX_RECENT_EVENTS)
                .toList();
    }

    private Comparator<OtlpIngestionAuditEvent> newestObservedAtFirst() {
        return Comparator.comparingLong(OtlpIngestionAuditEvent::observedAt).reversed();
    }

    private boolean isInRequestedScope(OtlpIngestionAuditEvent event, String workspaceId, Long startMillis,
                                       Long endMillis) {
        return (workspaceId == null || workspaceId.equals(StringUtils.trimToNull(event.workspaceId())))
                && (startMillis == null || event.observedAt() >= startMillis)
                && (endMillis == null || event.observedAt() <= endMillis);
    }

    private boolean hasPositiveObservedAt(OtlpIngestionAuditEvent event) {
        return event.observedAt() > 0;
    }

    private boolean hasSupportedAuditClassification(OtlpIngestionAuditEvent event) {
        String signal = normalizedOptionalDimension(event.signal());
        String protocol = normalizedOptionalDimension(event.protocol());
        String outcome = normalizedOptionalDimension(event.outcome());
        String statusCode = normalizedStatusCode(event.statusCode());
        return signal != null && protocol != null
                && SUPPORTED_SIGNALS.contains(signal)
                && SUPPORTED_PROTOCOLS.contains(protocol)
                && statusCode != null
                && (isSupportedOutcome(outcome) || isNonOkStatus(statusCode));
    }

    private boolean isSupportedOutcome(String outcome) {
        return outcome != null && SUPPORTED_OUTCOMES.contains(outcome);
    }

    private boolean isNonOkStatus(String statusCode) {
        return !StringUtils.equalsIgnoreCase(STATUS_OK, statusCode);
    }

    private Long normalizeTimeMillis(Long timeMillis) {
        return timeMillis == null || timeMillis <= 0 ? null : timeMillis;
    }

    private String normalizeDimension(String value) {
        String dimension = StringUtils.defaultIfBlank(StringUtils.trimToNull(value), UNKNOWN_DIMENSION);
        return dimension.toLowerCase(Locale.ROOT);
    }

    private String normalizedOptionalDimension(String value) {
        String dimension = StringUtils.trimToNull(value);
        return dimension == null ? null : dimension.toLowerCase(Locale.ROOT);
    }

    private OtlpIngestionAuditEvent normalizeAuditEvent(OtlpIngestionAuditEvent event) {
        return new OtlpIngestionAuditEvent(
                normalizedOptionalDimension(event.signal()),
                normalizedOptionalDimension(event.protocol()),
                normalizedOptionalDimension(event.outcome()),
                normalizedStatusCode(event.statusCode()),
                StringUtils.trimToNull(event.workspaceId()),
                StringUtils.trimToNull(event.entityId()),
                StringUtils.trimToNull(event.ingestId()),
                event.requestBytes(),
                event.signalItems(),
                event.reason(),
                event.durationMillis(),
                event.observedAt()
        );
    }

    private String normalizedStatusCode(String value) {
        String text = StringUtils.trimToNull(value);
        if (text == null) {
            return null;
        }
        String grpcStatusName = numericGrpcStatusName(text);
        if (grpcStatusName != null) {
            return grpcStatusName;
        }
        if (isNumericStatusCode(text)) {
            return null;
        }
        String normalized = text.replaceAll("[\\s-]+", "_").replaceAll("^_+|_+$", "");
        normalized = StringUtils.trimToNull(normalized) == null ? null : normalized.toUpperCase(Locale.ROOT);
        return normalized != null && SUPPORTED_STATUS_CODES.contains(normalized) ? normalized : null;
    }

    private String numericGrpcStatusName(String text) {
        String trimmed = StringUtils.trimToEmpty(text);
        if (trimmed.isEmpty()) {
            return null;
        }
        try {
            BigDecimal numericStatus = new BigDecimal(trimmed).stripTrailingZeros();
            if (numericStatus.scale() > 0) {
                return null;
            }
            int codeValue = numericStatus.intValueExact();
            if (codeValue < Status.Code.OK.value() || codeValue > Status.Code.UNAUTHENTICATED.value()) {
                return null;
            }
            return Status.fromCodeValue(codeValue).getCode().name();
        } catch (ArithmeticException | NumberFormatException ignored) {
            return null;
        }
    }

    private boolean isNumericStatusCode(String text) {
        try {
            new BigDecimal(text);
            return true;
        } catch (NumberFormatException ignored) {
            return false;
        }
    }

    private List<OtlpIngestionRedSummaryDto.SignalRedMetric> buildSignalSummaries(
            List<OtlpIngestionAuditEvent> events, Long startMillis, Long endMillis) {
        Map<SignalProtocol, List<OtlpIngestionAuditEvent>> groupedEvents = new LinkedHashMap<>();
        for (OtlpIngestionAuditEvent event : events) {
            groupedEvents.computeIfAbsent(
                            new SignalProtocol(normalizeDimension(event.signal()), normalizeDimension(event.protocol())),
                            ignored -> new ArrayList<>())
                    .add(event);
        }
        return groupedEvents.entrySet().stream()
                .sorted(Comparator.comparing((Map.Entry<SignalProtocol, List<OtlpIngestionAuditEvent>> entry) ->
                                signalOrder(entry.getKey().signal()))
                        .thenComparing(entry -> protocolOrder(entry.getKey().protocol()))
                        .thenComparing(entry -> entry.getKey().signal())
                        .thenComparing(entry -> entry.getKey().protocol()))
                .map(entry -> toSignalSummary(entry.getKey(), entry.getValue(), startMillis, endMillis))
                .toList();
    }

    private OtlpIngestionRedSummaryDto.SignalRedMetric toSignalSummary(
            SignalProtocol signalProtocol, List<OtlpIngestionAuditEvent> events, Long startMillis, Long endMillis) {
        OtlpIngestionAuditEvent latest = latestEvent(events);
        return new OtlpIngestionRedSummaryDto.SignalRedMetric(
                signalProtocol.signal(),
                signalProtocol.protocol(),
                countRequests(events),
                requestRatePerMinute(events, startMillis, endMillis),
                countErrors(events),
                errorRate(events),
                requestBytes(events),
                signalItems(events),
                averageSignalItems(events),
                maxSignalItems(events),
                averageDurationMillis(events),
                maxDurationMillis(events),
                latest == null ? null : latest.statusCode(),
                latest == null ? null : redactionService.redactText(latest.reason()),
                latest == null ? null : latest.observedAt()
        );
    }

    private long countRequests(List<OtlpIngestionAuditEvent> events) {
        return events.size();
    }

    private long countErrors(List<OtlpIngestionAuditEvent> events) {
        return events.stream().filter(this::isErrorEvent).count();
    }

    private boolean isErrorEvent(OtlpIngestionAuditEvent event) {
        String outcome = StringUtils.trimToNull(event.outcome());
        if (StringUtils.equalsIgnoreCase(OUTCOME_REJECTED, outcome)) {
            return true;
        }
        String statusCode = StringUtils.trimToNull(event.statusCode());
        return statusCode != null && isNonOkStatus(statusCode);
    }

    private double requestRatePerMinute(List<OtlpIngestionAuditEvent> events, Long startMillis, Long endMillis) {
        if (events.isEmpty()) {
            return 0D;
        }
        long windowMillis = rateWindowMillis(events, startMillis, endMillis);
        return (double) events.size() * MIN_RATE_WINDOW_MILLIS / windowMillis;
    }

    private long rateWindowMillis(List<OtlpIngestionAuditEvent> events, Long startMillis, Long endMillis) {
        if (startMillis != null && endMillis != null && endMillis > startMillis) {
            return endMillis - startMillis;
        }
        long firstObservedAt = events.stream()
                .mapToLong(OtlpIngestionAuditEvent::observedAt)
                .min()
                .orElse(0L);
        long latestObservedAt = events.stream()
                .mapToLong(OtlpIngestionAuditEvent::observedAt)
                .max()
                .orElse(firstObservedAt);
        return Math.max(MIN_RATE_WINDOW_MILLIS, latestObservedAt - firstObservedAt);
    }

    private double errorRate(List<OtlpIngestionAuditEvent> events) {
        if (events.isEmpty()) {
            return 0D;
        }
        return (double) countErrors(events) / events.size();
    }

    private long requestBytes(List<OtlpIngestionAuditEvent> events) {
        long total = 0L;
        for (OtlpIngestionAuditEvent event : events) {
            total = saturatedAdd(total, nonNegativeCounter(event.requestBytes()));
        }
        return total;
    }

    private long signalItems(List<OtlpIngestionAuditEvent> events) {
        long total = 0L;
        for (OtlpIngestionAuditEvent event : events) {
            Long signalItems = nonNegativeCounter(event.signalItems());
            if (signalItems != null) {
                total = saturatedAdd(total, signalItems);
            }
        }
        return total;
    }

    private Long averageSignalItems(List<OtlpIngestionAuditEvent> events) {
        List<Long> signalItems = events.stream()
                .map(OtlpIngestionAuditEvent::signalItems)
                .map(this::nonNegativeCounter)
                .filter(value -> value != null)
                .toList();
        if (signalItems.isEmpty()) {
            return null;
        }
        return averageCounter(signalItems);
    }

    private Long maxSignalItems(List<OtlpIngestionAuditEvent> events) {
        return events.stream()
                .map(OtlpIngestionAuditEvent::signalItems)
                .map(this::nonNegativeCounter)
                .filter(value -> value != null)
                .max(Long::compareTo)
                .orElse(null);
    }

    private Long averageDurationMillis(List<OtlpIngestionAuditEvent> events) {
        List<Long> durations = events.stream()
                .map(OtlpIngestionAuditEvent::durationMillis)
                .map(this::nonNegativeCounter)
                .filter(duration -> duration != null)
                .toList();
        if (durations.isEmpty()) {
            return null;
        }
        return averageCounter(durations);
    }

    private Long maxDurationMillis(List<OtlpIngestionAuditEvent> events) {
        return events.stream()
                .map(OtlpIngestionAuditEvent::durationMillis)
                .map(this::nonNegativeCounter)
                .filter(duration -> duration != null)
                .max(Long::compareTo)
                .orElse(null);
    }

    private long nonNegativeCounter(long value) {
        return Math.max(value, 0L);
    }

    private Long nonNegativeCounter(Long value) {
        return value == null ? null : nonNegativeCounter(value.longValue());
    }

    private long saturatedAdd(long left, long right) {
        return Long.MAX_VALUE - left < right ? Long.MAX_VALUE : left + right;
    }

    private long averageCounter(List<Long> values) {
        double average = values.stream()
                .mapToDouble(Long::doubleValue)
                .average()
                .orElse(0D);
        if (average >= Long.MAX_VALUE) {
            return Long.MAX_VALUE;
        }
        return Math.round(average);
    }

    private Long latestObservedAt(List<OtlpIngestionAuditEvent> events) {
        OtlpIngestionAuditEvent latest = latestEvent(events);
        return latest == null ? null : latest.observedAt();
    }

    private OtlpIngestionAuditEvent latestEvent(List<OtlpIngestionAuditEvent> events) {
        return events.stream()
                .max(Comparator.comparingLong(OtlpIngestionAuditEvent::observedAt))
                .orElse(null);
    }

    private int signalOrder(String signal) {
        int index = SIGNAL_ORDER.indexOf(signal);
        return index < 0 ? SIGNAL_ORDER.size() : index;
    }

    private int protocolOrder(String protocol) {
        int index = PROTOCOL_ORDER.indexOf(protocol);
        return index < 0 ? PROTOCOL_ORDER.size() : index;
    }

    private record SignalProtocol(String signal, String protocol) {
    }
}
