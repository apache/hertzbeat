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
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/** Production Greptime adapter for scoped instrumentation signal detection. */
@Primary
@Component
@ConditionalOnBean(GreptimeSqlQueryExecutor.class)
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeInstrumentationSignalDetectionStore implements InstrumentationSignalDetectionStore {

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
            List<Map<String, Object>> rows = executor.executeStrict(queryFactory.latestReceivedAt(signal, criteria));
            Long lastReceivedAt = latestTimestamp(rows);
            if (lastReceivedAt == null || lastReceivedAt < criteria.startedAt()) {
                return SignalObservation.waiting();
            }
            return SignalObservation.received(lastReceivedAt);
        } catch (RuntimeException exception) {
            return SignalObservation.error(DetectionErrorCode.STORAGE_QUERY_FAILED, null);
        }
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
            return number.longValue();
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
            return Long.parseLong(text);
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
            return Timestamp.valueOf(text).toInstant().toEpochMilli();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Greptime returned an invalid detection timestamp", exception);
        }
    }
}
