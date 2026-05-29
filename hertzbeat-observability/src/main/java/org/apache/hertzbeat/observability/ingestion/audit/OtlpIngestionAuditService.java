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

package org.apache.hertzbeat.observability.ingestion.audit;

import io.grpc.Status;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedDeque;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Shared OTLP ingest audit and self-observability boundary.
 */
@Service
public class OtlpIngestionAuditService {

    private static final int MAX_RECENT_EVENTS = 256;
    private static final String OUTCOME_ACCEPTED = "accepted";
    private static final String OUTCOME_REJECTED = "rejected";
    private static final String OUTCOME_DROPPED = "dropped";
    private static final String STATUS_OK = "OK";
    private static final String UNKNOWN = "unknown";
    private static final Set<String> SUPPORTED_SIGNALS = Set.of("metrics", "logs", "traces");
    private static final Set<String> SUPPORTED_PROTOCOLS = Set.of("http", "grpc");

    private final ConcurrentLinkedDeque<OtlpIngestionAuditEvent> recentEvents = new ConcurrentLinkedDeque<>();
    private final OtlpIngestionRedactionService redactionService;
    private final List<OtlpIngestionAuditEventSink> eventSinks;

    public OtlpIngestionAuditService() {
        this(new OtlpIngestionRedactionService());
    }

    @Autowired
    public OtlpIngestionAuditService(OtlpIngestionRedactionService redactionService,
                                     List<OtlpIngestionAuditEventSink> eventSinks) {
        this.redactionService = redactionService == null ? new OtlpIngestionRedactionService() : redactionService;
        this.eventSinks = eventSinks == null ? List.of() : List.copyOf(eventSinks.stream()
                .filter(Objects::nonNull)
                .toList());
    }

    public OtlpIngestionAuditService(OtlpIngestionRedactionService redactionService) {
        this(redactionService, List.of());
    }

    public void recordAccepted(String signal, String protocol, OtlpCorrelationContext context, long requestBytes) {
        recordAccepted(signal, protocol, context, requestBytes, null, null);
    }

    public void recordAccepted(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                               Long durationMillis) {
        recordAccepted(signal, protocol, context, requestBytes, null, durationMillis);
    }

    public void recordAccepted(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                               Long signalItems, Long durationMillis) {
        record(signal, protocol, OUTCOME_ACCEPTED, STATUS_OK, context, requestBytes, signalItems, null,
                durationMillis);
    }

    public void recordDropped(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                              Long signalItems, String reason, Long durationMillis) {
        record(signal, protocol, OUTCOME_DROPPED, STATUS_OK, context, requestBytes, signalItems, reason,
                durationMillis);
    }

    public void recordRejected(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                               Status.Code statusCode, String reason) {
        recordRejected(signal, protocol, context, requestBytes, statusCode, reason, null, null);
    }

    public void recordRejected(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                               Status.Code statusCode, String reason, Long durationMillis) {
        recordRejected(signal, protocol, context, requestBytes, statusCode, reason, null, durationMillis);
    }

    public void recordRejected(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                               Status.Code statusCode, String reason, Long signalItems, Long durationMillis) {
        record(signal, protocol, OUTCOME_REJECTED, statusCode == null ? Status.Code.UNKNOWN.name() : statusCode.name(),
                context, requestBytes, signalItems, reason, durationMillis);
    }

    public void recordRejected(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                               Throwable throwable) {
        recordRejected(signal, protocol, context, requestBytes, throwable, null, null);
    }

    public void recordRejected(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                               Throwable throwable, Long durationMillis) {
        recordRejected(signal, protocol, context, requestBytes, throwable, null, durationMillis);
    }

    public void recordRejected(String signal, String protocol, OtlpCorrelationContext context, long requestBytes,
                               Throwable throwable, Long signalItems, Long durationMillis) {
        if (throwable == null) {
            recordRejected(signal, protocol, context, requestBytes, Status.Code.UNKNOWN, null, signalItems,
                    durationMillis);
            return;
        }
        Status status = Status.fromThrowable(throwable);
        recordRejected(signal, protocol, context, requestBytes, status.getCode(),
                StringUtils.defaultIfBlank(status.getDescription(),
                        throwable.getMessage()), signalItems, durationMillis);
    }

    public List<OtlpIngestionAuditEvent> recentEvents() {
        return Collections.unmodifiableList(recentEvents.stream().toList());
    }

    private void record(String signal, String protocol, String outcome, String statusCode,
                        OtlpCorrelationContext context, long requestBytes, Long signalItems, String reason,
                        Long durationMillis) {
        String normalizedSignal = normalizeLowerDimension(signal);
        String normalizedProtocol = normalizeLowerDimension(protocol);
        if (!hasSupportedSignalProtocol(normalizedSignal, normalizedProtocol)) {
            return;
        }
        OtlpCorrelationContext safeContext = context == null ? OtlpCorrelationContext.empty() : context;
        OtlpIngestionAuditEvent event = new OtlpIngestionAuditEvent(
                normalizedSignal,
                normalizedProtocol,
                normalizeLowerDimension(outcome),
                normalizeDimension(statusCode),
                StringUtils.trimToNull(safeContext.workspaceId()),
                StringUtils.trimToNull(safeContext.entityId()),
                StringUtils.trimToNull(safeContext.ingestId()),
                Math.max(requestBytes, 0L),
                signalItems == null ? null : Math.max(signalItems, 0L),
                StringUtils.trimToNull(redactionService.redactText(reason)),
                durationMillis == null ? null : Math.max(durationMillis, 0L),
                System.currentTimeMillis()
        );
        recentEvents.addFirst(event);
        trimRecentEvents();
        publishEvent(event);
    }

    private void trimRecentEvents() {
        while (recentEvents.size() > MAX_RECENT_EVENTS) {
            recentEvents.pollLast();
        }
    }

    private void publishEvent(OtlpIngestionAuditEvent event) {
        for (OtlpIngestionAuditEventSink eventSink : eventSinks) {
            try {
                eventSink.record(event);
            } catch (RuntimeException ignored) {
                // Ingest audit export must not make the ingest path fail.
            }
        }
    }

    private boolean hasSupportedSignalProtocol(String signal, String protocol) {
        return SUPPORTED_SIGNALS.contains(signal) && SUPPORTED_PROTOCOLS.contains(protocol);
    }

    private String normalizeDimension(String value) {
        return StringUtils.defaultIfBlank(StringUtils.trimToNull(value), UNKNOWN);
    }

    private String normalizeLowerDimension(String value) {
        return normalizeDimension(value).toLowerCase(Locale.ROOT);
    }
}
