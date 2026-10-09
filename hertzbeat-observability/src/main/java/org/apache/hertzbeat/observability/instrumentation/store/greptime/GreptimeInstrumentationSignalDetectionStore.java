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

package org.apache.hertzbeat.observability.instrumentation.store.greptime;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpMetricSemanticLabels;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;

/** Production Greptime adapter for scoped instrumentation signal detection. */
@Primary
@Component
@ConditionalOnBean(GreptimeSqlQueryExecutor.class)
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeInstrumentationSignalDetectionStore implements InstrumentationSignalDetectionStore {

    // Detection operates on contemporary telemetry. These decimal boundaries distinguish the
    // epoch precision Greptime may expose for TIMESTAMP values while keeping epoch millis intact.
    private static final long MICROSECOND_EPOCH_MIN_ABSOLUTE = 100_000_000_000_000L;
    private static final long NANOSECOND_EPOCH_MIN_ABSOLUTE = 100_000_000_000_000_000L;

    private static final String LAST_RECEIVED_AT = "last_received_at";

    private final ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;
    private final GreptimeInstrumentationDetectionQueryFactory queryFactory;

    @Autowired
    public GreptimeInstrumentationSignalDetectionStore(
            ObjectProvider<GreptimeSqlQueryExecutor> executorProvider) {
        this(executorProvider, new GreptimeInstrumentationDetectionQueryFactory());
    }

    GreptimeInstrumentationSignalDetectionStore(
            ObjectProvider<GreptimeSqlQueryExecutor> executorProvider,
            GreptimeInstrumentationDetectionQueryFactory queryFactory) {
        this.executorProvider = executorProvider;
        this.queryFactory = queryFactory;
    }

    @Override
    public DetectionSnapshot detect(DetectionCriteria criteria) {
        GreptimeSqlQueryExecutor executor = executorOrNull();
        if (executor == null) {
            return unavailableSnapshot();
        }
        EnumMap<Signal, SignalObservation> observations = new EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            observations.put(signal, detectSignal(executor, signal, criteria));
        }
        return new DetectionSnapshot(observations);
    }

    private SignalObservation detectSignal(
            GreptimeSqlQueryExecutor executor,
            Signal signal,
            DetectionCriteria criteria) {
        try {
            List<Map<String, Object>> rows = latestRows(executor, signal, criteria);
            Long lastReceivedAt = latestTimestamp(rows);
            if (lastReceivedAt == null
                    || lastReceivedAt < criteria.startedAt()
                    || lastReceivedAt > criteria.detectedAt()) {
                return SignalObservation.waiting();
            }
            return SignalObservation.received(lastReceivedAt);
        } catch (RuntimeException exception) {
            if (signal == Signal.METRICS && nativeMetricsTableNotCreated(exception)) {
                return SignalObservation.waiting();
            }
            return SignalObservation.error(DetectionErrorCode.STORAGE_QUERY_FAILED, null);
        }
    }

    private List<Map<String, Object>> latestRows(
            GreptimeSqlQueryExecutor executor, Signal signal, DetectionCriteria criteria) {
        String query = queryFactory.latestReceivedAt(signal, criteria);
        try {
            return executor.executeStrict(query);
        } catch (RuntimeException exception) {
            String error = greptimeError(exception, 3000);
            if (signal != Signal.METRICS || error == null || !error.startsWith(
                    "Failed to plan SQL: No field named hertzbeat_collector_id. Valid fields are greptime_physical_table.")) {
                throw exception;
            }
            if (criteria.collectorId() != null) {
                return List.of();
            }
        }
        List<Map<String, Object>> rows = executor.executeStrict(queryFactory.directMetricsWithoutCollectorColumn(criteria));
        List<Map<String, Object>> columns = executor.executeStrict("DESCRIBE greptime_physical_table");
        if (columns == null || columns.isEmpty() || columns.stream().anyMatch(
                column -> column == null || !(column.get("Column") instanceof String))) {
            throw new IllegalStateException("Greptime returned an unexpected native metrics schema");
        }
        // A first Collector export can add its column while the direct query runs. In that case
        // discard the result and reapply the complete scope once; never cache an absent column.
        if (columns.stream().anyMatch(column -> OtlpMetricSemanticLabels.HERTZBEAT_COLLECTOR_ID.equals(column.get("Column")))) {
            return executor.executeStrict(query);
        }
        return rows;
    }

    private boolean nativeMetricsTableNotCreated(RuntimeException exception) {
        String error = greptimeError(exception, 4001);
        return error != null && error.startsWith("Failed to plan SQL: Table not found: ")
                && error.endsWith(".greptime_physical_table");
    }

    private String greptimeError(RuntimeException exception, int code) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof HttpClientErrorException http && http.getStatusCode().value() == 400) {
                var body = JsonUtil.fromJsonQuietly(http.getResponseBodyAsString());
                if (body == null || !body.path("code").isIntegralNumber() || body.path("code").asInt() != code) {
                    return null;
                }
                return body.path("error").asText("");
            }
        }
        return null;
    }

    private GreptimeSqlQueryExecutor executorOrNull() {
        try {
            return executorProvider.getIfAvailable();
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private DetectionSnapshot unavailableSnapshot() {
        EnumMap<Signal, SignalObservation> observations = new EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            observations.put(signal, SignalObservation.unavailable(DetectionErrorCode.STORAGE_UNAVAILABLE));
        }
        return new DetectionSnapshot(observations);
    }

    private Long latestTimestamp(List<Map<String, Object>> rows) {
        if (rows == null || rows.isEmpty() || rows.getFirst() == null) {
            return null;
        }
        Map<String, Object> row = rows.getFirst();
        if (!row.containsKey(LAST_RECEIVED_AT)) {
            throw new IllegalArgumentException("Greptime detection query returned an unexpected schema");
        }
        Object value = row.get(LAST_RECEIVED_AT);
        return value == null ? null : timestampMillis(value);
    }

    private long timestampMillis(Object value) {
        if (value instanceof Number number) {
            return numericTimestampMillis(number.longValue());
        }
        if (value instanceof Instant instant) {
            return instant.toEpochMilli();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().toEpochMilli();
        }
        if (value instanceof Date date) {
            return date.getTime();
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant().toEpochMilli();
        }
        if (value instanceof ZonedDateTime zonedDateTime) {
            return zonedDateTime.toInstant().toEpochMilli();
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toInstant(ZoneOffset.UTC).toEpochMilli();
        }
        return timestampTextMillis(String.valueOf(value));
    }

    private long timestampTextMillis(String value) {
        String text = value.trim();
        try {
            return numericTimestampMillis(Long.parseLong(text));
        } catch (NumberFormatException ignored) {
            // Greptime SQL commonly returns an ISO timestamp instead of epoch milliseconds.
        }
        try {
            return Instant.parse(text).toEpochMilli();
        } catch (DateTimeParseException ignored) {
            // Offset and SQL timestamp forms are handled below.
        }
        try {
            return OffsetDateTime.parse(text).toInstant().toEpochMilli();
        } catch (DateTimeParseException ignored) {
            // Continue with Greptime's SQL timestamp representation.
        }
        try {
            return Timestamp.valueOf(text).toLocalDateTime().toInstant(ZoneOffset.UTC).toEpochMilli();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Greptime returned an invalid detection timestamp", exception);
        }
    }

    private long numericTimestampMillis(long value) {
        if (value >= NANOSECOND_EPOCH_MIN_ABSOLUTE || value <= -NANOSECOND_EPOCH_MIN_ABSOLUTE) {
            return Math.floorDiv(value, 1_000_000L);
        }
        if (value >= MICROSECOND_EPOCH_MIN_ABSOLUTE || value <= -MICROSECOND_EPOCH_MIN_ABSOLUTE) {
            return Math.floorDiv(value, 1_000L);
        }
        return value;
    }
}
