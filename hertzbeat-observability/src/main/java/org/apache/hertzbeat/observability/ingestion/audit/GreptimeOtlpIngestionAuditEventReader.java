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
import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Reads durable OTLP ingest RED audit events back from Greptime SQL.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeOtlpIngestionAuditEventReader implements OtlpIngestionAuditEventReader {

    private static final int MAX_LIMIT = 256;
    private static final String STATUS_OK = "OK";
    private static final Set<String> SUPPORTED_SIGNALS = Set.of("metrics", "logs", "traces");
    private static final Set<String> SUPPORTED_PROTOCOLS = Set.of("http", "grpc");
    private static final Set<String> SUPPORTED_OUTCOMES = Set.of("accepted", "rejected", "dropped");
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
    private static final BigInteger LONG_MAX_VALUE = BigInteger.valueOf(Long.MAX_VALUE);
    private static final BigInteger LONG_MIN_VALUE = BigInteger.valueOf(Long.MIN_VALUE);
    private static final BigDecimal LONG_MAX_DECIMAL = BigDecimal.valueOf(Long.MAX_VALUE);
    private static final BigDecimal LONG_MIN_DECIMAL = BigDecimal.valueOf(Long.MIN_VALUE);

    private final ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider;
    private final OtlpIngestionRedactionService redactionService = new OtlpIngestionRedactionService();

    public GreptimeOtlpIngestionAuditEventReader(
            ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider) {
        this.greptimeSqlQueryExecutorProvider = greptimeSqlQueryExecutorProvider;
    }

    @Override
    public List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit) {
        return recentEvents(workspaceId, limit, null);
    }

    @Override
    public List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit, Long startMillis) {
        return recentEvents(workspaceId, limit, startMillis, null);
    }

    @Override
    public List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit, Long startMillis,
                                                      Long endMillis) {
        GreptimeSqlQueryExecutor executor = greptimeSqlQueryExecutorOrNull();
        if (executor == null) {
            return Collections.emptyList();
        }
        try {
            String safeWorkspaceId = StringUtils.trimToNull(workspaceId);
            Long safeStartMillis = startMillis == null || startMillis <= 0 ? null : startMillis;
            Long safeEndMillis = endMillis == null || endMillis <= 0 ? null : endMillis;
            return executor.execute(recentEventsSql(workspaceId, limit, safeStartMillis, safeEndMillis)).stream()
                    .filter(Objects::nonNull)
                    .map(this::toEventOrNull)
                    .filter(Objects::nonNull)
                    .filter(this::hasSupportedAuditClassification)
                    .filter(event -> event.observedAt() > 0)
                    .filter(event -> safeWorkspaceId == null || safeWorkspaceId.equals(event.workspaceId()))
                    .filter(event -> safeStartMillis == null || event.observedAt() >= safeStartMillis)
                    .filter(event -> safeEndMillis == null || event.observedAt() <= safeEndMillis)
                    .toList();
        } catch (RuntimeException ex) {
            log.warn("[otlp-ingest-red] failed to read Greptime audit events: {}", ex.getMessage(), ex);
            return Collections.emptyList();
        }
    }

    private GreptimeSqlQueryExecutor greptimeSqlQueryExecutorOrNull() {
        try {
            return greptimeSqlQueryExecutorProvider.getIfAvailable();
        } catch (RuntimeException ex) {
            log.warn("[otlp-ingest-red] failed to resolve Greptime audit query executor: {}", ex.getMessage(), ex);
            return null;
        }
    }

    private String recentEventsSql(String workspaceId, int limit, Long startMillis, Long endMillis) {
        StringBuilder sql = new StringBuilder("SELECT observed_at, workspace_id, entity_id, ingest_id, signal, ")
                .append("protocol, outcome, status_code, request_bytes, signal_items, duration_millis, reason ")
                .append("FROM ")
                .append(GreptimeOtlpIngestionAuditEventSink.TABLE_NAME);
        List<String> filters = new ArrayList<>();
        String safeWorkspaceId = StringUtils.trimToNull(workspaceId);
        if (safeWorkspaceId != null) {
            filters.add("workspace_id = '" + escapeSql(safeWorkspaceId) + "'");
        }
        if (startMillis != null && startMillis > 0) {
            filters.add("observed_at >= to_timestamp_millis(" + startMillis + ")");
        }
        if (endMillis != null && endMillis > 0) {
            filters.add("observed_at <= to_timestamp_millis(" + endMillis + ")");
        }
        if (!filters.isEmpty()) {
            sql.append(" WHERE ")
                    .append(String.join(" AND ", filters));
        }
        sql.append(" ORDER BY observed_at DESC LIMIT ")
                .append(boundedLimit(limit));
        return sql.toString();
    }

    private OtlpIngestionAuditEvent toEvent(Map<String, Object> row) {
        return new OtlpIngestionAuditEvent(
                normalizedDimension(row.get("signal")),
                normalizedDimension(row.get("protocol")),
                normalizedDimension(row.get("outcome")),
                normalizedStatusCode(row.get("status_code")),
                stringValue(row.get("workspace_id")),
                stringValue(row.get("entity_id")),
                stringValue(row.get("ingest_id")),
                longValue(row.get("request_bytes"), 0L),
                nullableLongValue(row.get("signal_items")),
                redactedReason(row.get("reason")),
                nullableLongValue(row.get("duration_millis")),
                longValue(row.get("observed_at"), 0L)
        );
    }

    private OtlpIngestionAuditEvent toEventOrNull(Map<String, Object> row) {
        try {
            return toEvent(row);
        } catch (RuntimeException ex) {
            log.warn("[otlp-ingest-red] skipped malformed Greptime audit row: {}", ex.getMessage());
            return null;
        }
    }

    private boolean hasSupportedAuditClassification(OtlpIngestionAuditEvent event) {
        String signal = event.signal();
        String protocol = event.protocol();
        String outcome = event.outcome();
        String statusCode = StringUtils.trimToNull(event.statusCode());
        return signal != null && protocol != null
                && SUPPORTED_SIGNALS.contains(signal)
                && SUPPORTED_PROTOCOLS.contains(protocol)
                && statusCode != null
                && (isSupportedOutcome(outcome) || isNonOkStatus(statusCode));
    }

    private boolean isSupportedOutcome(String outcome) {
        return outcome != null && SUPPORTED_OUTCOMES.contains(outcome.toLowerCase(Locale.ROOT));
    }

    private boolean isNonOkStatus(String statusCode) {
        return !StringUtils.equalsIgnoreCase(STATUS_OK, statusCode);
    }

    private int boundedLimit(int limit) {
        if (limit <= 0) {
            return MAX_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return StringUtils.trimToNull(text);
    }

    private String normalizedDimension(Object value) {
        String text = stringValue(value);
        return text == null ? null : text.toLowerCase(Locale.ROOT);
    }

    private String normalizedStatusCode(Object value) {
        String text = stringValue(value);
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

    private String redactedReason(Object value) {
        return StringUtils.trimToNull(redactionService.redactText(stringValue(value)));
    }

    private Long nullableLongValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return nonNegativeLong(clampLong(bigDecimal));
        }
        if (value instanceof BigInteger bigInteger) {
            return nonNegativeLong(clampLong(bigInteger));
        }
        if (value instanceof Number number) {
            return nonNegativeLong(number.longValue());
        }
        String text = StringUtils.trimToNull(String.valueOf(value));
        if (text == null) {
            return null;
        }
        return integerTextLongValue(text);
    }

    private long longValue(Object value, long defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return nonNegativeLong(clampLong(bigDecimal));
        }
        if (value instanceof BigInteger bigInteger) {
            return nonNegativeLong(clampLong(bigInteger));
        }
        if (value instanceof Number number) {
            return nonNegativeLong(number.longValue());
        }
        if (value instanceof Timestamp timestamp) {
            return nonNegativeLong(timestamp.toInstant().toEpochMilli());
        }
        if (value instanceof Date date) {
            return nonNegativeLong(date.getTime());
        }
        if (value instanceof Instant instant) {
            return nonNegativeLong(instant.toEpochMilli());
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return nonNegativeLong(offsetDateTime.toInstant().toEpochMilli());
        }
        if (value instanceof ZonedDateTime zonedDateTime) {
            return nonNegativeLong(zonedDateTime.toInstant().toEpochMilli());
        }
        if (value instanceof LocalDateTime localDateTime) {
            return nonNegativeLong(localDateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli());
        }
        String text = StringUtils.trimToNull(String.valueOf(value));
        if (text == null) {
            return defaultValue;
        }
        Long integerValue = integerTextLongValue(text);
        if (integerValue != null) {
            return integerValue;
        }
        return nonNegativeLong(parseTimestamp(text, defaultValue));
    }

    private long nonNegativeLong(long value) {
        return Math.max(value, 0L);
    }

    private Long integerTextLongValue(String text) {
        if (!text.matches("[+-]?\\d+")) {
            return null;
        }
        try {
            return nonNegativeLong(clampLong(new BigInteger(text)));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private long clampLong(BigInteger value) {
        if (value.compareTo(LONG_MAX_VALUE) > 0) {
            return Long.MAX_VALUE;
        }
        if (value.compareTo(LONG_MIN_VALUE) < 0) {
            return Long.MIN_VALUE;
        }
        return value.longValue();
    }

    private long clampLong(BigDecimal value) {
        if (value.compareTo(LONG_MAX_DECIMAL) > 0) {
            return Long.MAX_VALUE;
        }
        if (value.compareTo(LONG_MIN_DECIMAL) < 0) {
            return Long.MIN_VALUE;
        }
        return value.longValue();
    }

    private long parseTimestamp(String text, long defaultValue) {
        try {
            return Instant.parse(text).toEpochMilli();
        } catch (DateTimeParseException ignored) {
            // Try Greptime/DataFusion timestamp text variants.
        }
        String normalizedText = normalizedTimestampText(text);
        try {
            return OffsetDateTime.parse(normalizedText, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                    .toInstant()
                    .toEpochMilli();
        } catch (DateTimeParseException ignored) {
            // Try Greptime/DataFusion's common timestamp text without a zone.
        }
        try {
            return LocalDateTime.parse(normalizedText, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                    .atZone(ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli();
        } catch (DateTimeParseException ignored) {
            return defaultValue;
        }
    }

    private String normalizedTimestampText(String text) {
        return text.replaceFirst("\\s+", "T")
                .replaceFirst("(?i)\\s+UTC$", "Z")
                .replaceFirst("\\s+(?=Z$|[+-]\\d{2}:?\\d{2}$)", "")
                .replaceFirst("([+-]\\d{2})(\\d{2})$", "$1:$2");
    }

    private String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "''");
    }
}
