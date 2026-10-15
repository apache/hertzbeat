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

package org.apache.hertzbeat.warehouse.repository;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.event.CollectionExecutionEvent.CollectionPhase;
import org.apache.hertzbeat.common.entity.event.CollectionExecutionEvent.FailureClass;
import org.apache.hertzbeat.common.entity.event.CollectionExecutionEvent.Outcome;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Greptime adapter for the bounded {@code hzb_collection_events} Monitor evidence query.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeMonitorCollectionEventQueryRepository implements MonitorCollectionEventQueryRepository {

    private static final String COLLECTION_EVENT_TABLE = "hzb_collection_events";
    private static final int MAX_COLLECTOR_ID_LENGTH = 128;
    private static final int MAX_TARGET_LENGTH = 512;
    private static final int MAX_METRIC_SET_LENGTH = 192;
    private static final int MAX_ENUM_LENGTH = 32;

    private final ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    public GreptimeMonitorCollectionEventQueryRepository(
            ObjectProvider<GreptimeSqlQueryExecutor> executorProvider) {
        this.executorProvider = executorProvider;
    }

    @Override
    public MonitorCollectionEventQueryResult query(MonitorCollectionEventQuery query) {
        try {
            GreptimeSqlQueryExecutor executor = executorProvider.getIfAvailable();
            if (executor == null) {
                return MonitorCollectionEventQueryResult.unavailable();
            }
            List<Map<String, Object>> rows = executor.executeStrict(sql(query));
            if (rows.isEmpty()) {
                return MonitorCollectionEventQueryResult.available(null);
            }
            if (rows.size() != 1) {
                return MonitorCollectionEventQueryResult.unavailable();
            }
            return MonitorCollectionEventQueryResult.available(event(rows.getFirst(), query));
        } catch (RuntimeException exception) {
            log.debug("Greptime Monitor collection evidence is unavailable: {}",
                    exception.getClass().getSimpleName());
            return MonitorCollectionEventQueryResult.unavailable();
        }
    }

    private MonitorCollectionEvent event(Map<String, Object> row, MonitorCollectionEventQuery query) {
        String monitorId = requiredString(row, "monitor_id");
        if (!Long.toString(query.monitorId()).equals(monitorId)) {
            throw new IllegalArgumentException("Collection event Monitor identity mismatch");
        }
        long observedAt = losslessLong(requiredValue(row, "observed_at"), "observed_at");
        if (observedAt < query.start() || observedAt >= query.end()) {
            throw new IllegalArgumentException("Collection event is outside the query window");
        }
        long durationMillis = losslessLong(requiredValue(row, "duration_ms"), "duration_ms");
        if (durationMillis < -1L) {
            throw new IllegalArgumentException("Collection event duration is invalid");
        }
        long fieldCount = losslessLong(requiredValue(row, "field_count"), "field_count");
        long rowCount = losslessLong(requiredValue(row, "row_count"), "row_count");
        return new MonitorCollectionEvent(
                observedAt,
                durationMillis,
                enumName(row, "outcome", Outcome.class),
                boundedString(row, "collector_id", MAX_COLLECTOR_ID_LENGTH),
                boundedString(row, "target", MAX_TARGET_LENGTH),
                boundedString(row, "metric_set", MAX_METRIC_SET_LENGTH),
                enumName(row, "failure_class", FailureClass.class),
                enumName(row, "phase", CollectionPhase.class),
                exactNonNegativeInt(fieldCount, "field_count"),
                exactNonNegativeInt(rowCount, "row_count"));
    }

    private String sql(MonitorCollectionEventQuery query) {
        return "SELECT monitor_id, CAST(observed_at AS BIGINT) AS observed_at, "
                + "duration_ms, outcome, collector_id, target, metric_set, failure_class, phase, "
                + "field_count, row_count FROM " + COLLECTION_EVENT_TABLE
                + " WHERE monitor_id = " + sqlLiteral(Long.toString(query.monitorId()))
                + " AND observed_at >= to_timestamp_millis(" + query.start() + ")"
                + " AND observed_at < to_timestamp_millis(" + query.end() + ")"
                + " ORDER BY observed_at DESC LIMIT 1";
    }

    private Object requiredValue(Map<String, Object> row, String column) {
        Object value = value(row, column);
        if (value == null) {
            throw new IllegalArgumentException("Collection event is missing " + column);
        }
        return value;
    }

    private String requiredString(Map<String, Object> row, String column) {
        Object value = requiredValue(row, column);
        if (!(value instanceof String text)) {
            throw new IllegalArgumentException("Collection event " + column + " must be a string");
        }
        return text;
    }

    private String boundedString(Map<String, Object> row, String column, int maximumLength) {
        String value = requiredString(row, column);
        if (value.length() > maximumLength) {
            throw new IllegalArgumentException("Collection event " + column + " exceeds its persisted bound");
        }
        return value;
    }

    private Object value(Map<String, Object> row, String column) {
        Object exact = row.get(column);
        if (exact != null || row.containsKey(column)) {
            return exact;
        }
        return row.entrySet().stream()
                .filter(entry -> entry.getKey() != null && column.equalsIgnoreCase(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private <E extends Enum<E>> String enumName(Map<String, Object> row, String column, Class<E> type) {
        return Enum.valueOf(type, boundedString(row, column, MAX_ENUM_LENGTH)).name();
    }

    private int exactNonNegativeInt(long value, String column) {
        if (value < 0L || value > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Collection event " + column + " is outside integer bounds");
        }
        return (int) value;
    }

    private long losslessLong(Object value, String column) {
        try {
            if (value instanceof Byte || value instanceof Short
                    || value instanceof Integer || value instanceof Long) {
                return ((Number) value).longValue();
            }
            if (value instanceof BigInteger integer) {
                return integer.longValueExact();
            }
            if (value instanceof BigDecimal decimal) {
                return decimal.longValueExact();
            }
            if (value instanceof Float || value instanceof Double) {
                double decimal = ((Number) value).doubleValue();
                if (!Double.isFinite(decimal)) {
                    throw new IllegalArgumentException("Collection event " + column + " must be finite");
                }
                return BigDecimal.valueOf(decimal).longValueExact();
            }
            if (value instanceof Number number) {
                return new BigDecimal(number.toString()).longValueExact();
            }
            throw new IllegalArgumentException("Collection event " + column + " must be numeric");
        } catch (ArithmeticException | NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "Collection event " + column + " is not a lossless long", exception);
        }
    }

    private String sqlLiteral(String value) {
        return "'" + value.replace("'", "''") + "'";
    }
}
