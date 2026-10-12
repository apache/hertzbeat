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

package org.apache.hertzbeat.warehouse.repository;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Capability-detected adapter for GreptimeDB's computed semantic relationship table.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeSemanticGraphQueryRepository implements SemanticGraphQueryRepository {

    private static final Duration DEFAULT_CAPABILITY_TTL = Duration.ofMinutes(10);
    private static final Duration DEFAULT_FAILURE_BACKOFF = Duration.ofSeconds(30);
    private static final String CAPABILITY_SQL = "SELECT table_name FROM information_schema.tables "
            + "WHERE table_schema = 'greptime_private' AND table_name = 'semantic_relationships' LIMIT 1";
    private static final String RELATIONSHIP_TABLE = "greptime_private.semantic_relationships";

    private final ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;
    private final Clock clock;
    private final long capabilityTtlMillis;
    private final long failureBackoffMillis;
    private final Object capabilityLock = new Object();
    private volatile CapabilityState capabilityState = CapabilityState.unchecked();

    @Autowired
    public GreptimeSemanticGraphQueryRepository(ObjectProvider<GreptimeSqlQueryExecutor> executorProvider) {
        this(executorProvider, Clock.systemUTC(), DEFAULT_CAPABILITY_TTL);
    }

    GreptimeSemanticGraphQueryRepository(ObjectProvider<GreptimeSqlQueryExecutor> executorProvider,
                                         Clock clock,
                                         Duration capabilityTtl) {
        this.executorProvider = executorProvider;
        this.clock = clock;
        this.capabilityTtlMillis = normalizeTtl(capabilityTtl).toMillis();
        this.failureBackoffMillis = DEFAULT_FAILURE_BACKOFF.toMillis();
    }

    @Override
    public RelationshipQueryResult queryRelationships(RelationshipQuery query) {
        GreptimeSqlQueryExecutor executor = executorProvider.getIfAvailable();
        if (executor == null || !semanticGraphAvailable(executor)) {
            return RelationshipQueryResult.unavailable();
        }
        try {
            List<Map<String, Object>> rows = executor.executeStrict(buildRelationshipSql(query));
            List<Relationship> relationships = new ArrayList<>(Math.min(rows.size(), query.limit()));
            for (Map<String, Object> row : rows) {
                if (relationships.size() >= query.limit()) {
                    break;
                }
                Relationship relationship = toRelationship(row);
                if (relationship != null && withinQueryWindow(relationship, query)) {
                    relationships.add(relationship);
                }
            }
            return RelationshipQueryResult.available(relationships);
        } catch (RuntimeException exception) {
            markUnavailable();
            log.debug("Greptime semantic graph query is unavailable: {}", exception.getMessage());
            return RelationshipQueryResult.unavailable();
        }
    }

    private boolean semanticGraphAvailable(GreptimeSqlQueryExecutor executor) {
        long now = clock.millis();
        CapabilityState current = capabilityState;
        if (current.validAt(now)) {
            return current.available();
        }
        synchronized (capabilityLock) {
            current = capabilityState;
            if (current.validAt(now)) {
                return current.available();
            }
            try {
                boolean available = executor.executeStrict(CAPABILITY_SQL).stream()
                        .map(row -> text(value(row, "table_name")))
                        .anyMatch("semantic_relationships"::equalsIgnoreCase);
                capabilityState = new CapabilityState(available, saturatedAdd(now, capabilityTtlMillis));
                return available;
            } catch (RuntimeException exception) {
                capabilityState = new CapabilityState(false, saturatedAdd(now, failureBackoffMillis));
                log.debug("Unable to probe Greptime semantic graph capability: {}", exception.getMessage());
                return false;
            }
        }
    }

    private void markUnavailable() {
        long now = clock.millis();
        synchronized (capabilityLock) {
            capabilityState = new CapabilityState(false, saturatedAdd(now, failureBackoffMillis));
        }
    }

    private String buildRelationshipSql(RelationshipQuery query) {
        return "SELECT MAX(observed_at) AS observed_at, src_type, src_id, dst_type, dst_id, rel_type, "
                + "provenance, MAX(confidence) AS confidence, SUM(request_count) AS request_count, "
                + "SUM(error_count) AS error_count, SUM(duration_sum) AS duration_sum, "
                + "SUM(duration_count) AS duration_count FROM " + RELATIONSHIP_TABLE
                + " WHERE observed_at >= to_timestamp_millis(" + query.start() + ")"
                + " AND observed_at <= to_timestamp_millis(" + query.end() + ")"
                + " AND (" + adjacentPredicate(query.entities()) + ")"
                + " GROUP BY src_type, src_id, dst_type, dst_id, rel_type, provenance"
                + " ORDER BY observed_at DESC LIMIT " + query.limit();
    }

    private String adjacentPredicate(Set<EntityKey> entities) {
        Set<String> predicates = new LinkedHashSet<>();
        for (EntityKey entity : entities.stream()
                .sorted(Comparator.comparing(EntityKey::type).thenComparing(EntityKey::id))
                .toList()) {
            String type = sqlLiteral(entity.type());
            String id = sqlLiteral(entity.id());
            predicates.add("(src_type = " + type + " AND src_id = " + id + ")");
            predicates.add("(dst_type = " + type + " AND dst_id = " + id + ")");
        }
        return String.join(" OR ", predicates);
    }

    private Relationship toRelationship(Map<String, Object> row) {
        try {
            return new Relationship(
                    instant(value(row, "observed_at")),
                    new EntityKey(text(value(row, "src_type")), text(value(row, "src_id"))),
                    new EntityKey(text(value(row, "dst_type")), text(value(row, "dst_id"))),
                    text(value(row, "rel_type")),
                    text(value(row, "provenance")),
                    decimal(value(row, "confidence")),
                    whole(value(row, "request_count")),
                    whole(value(row, "error_count")),
                    decimal(value(row, "duration_sum")),
                    whole(value(row, "duration_count")));
        } catch (IllegalArgumentException | DateTimeParseException exception) {
            log.debug("Skip malformed Greptime semantic relationship row: {}", exception.getMessage());
            return null;
        }
    }

    private boolean withinQueryWindow(Relationship relationship, RelationshipQuery query) {
        long observedAt = relationship.observedAt().toEpochMilli();
        return observedAt >= query.start() && observedAt <= query.end();
    }

    private Instant instant(Object value) {
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }
        if (value instanceof ZonedDateTime zonedDateTime) {
            return zonedDateTime.toInstant();
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toInstant(ZoneOffset.UTC);
        }
        if (value instanceof Number number) {
            return Instant.ofEpochMilli(number.longValue());
        }
        String timestamp = text(value);
        try {
            return Instant.parse(timestamp);
        } catch (DateTimeParseException ignored) {
            return OffsetDateTime.parse(timestamp).toInstant();
        }
    }

    private String sqlLiteral(String value) {
        return "'" + value.replace("'", "''") + "'";
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
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

    private long whole(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return StringUtils.hasText(text(value)) ? Long.parseLong(text(value)) : 0L;
    }

    private double decimal(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return StringUtils.hasText(text(value)) ? Double.parseDouble(text(value)) : 0D;
    }

    private static Duration normalizeTtl(Duration ttl) {
        return ttl == null || ttl.isNegative() || ttl.isZero() ? DEFAULT_CAPABILITY_TTL : ttl;
    }

    private long saturatedAdd(long left, long right) {
        if (right > 0 && left > Long.MAX_VALUE - right) {
            return Long.MAX_VALUE;
        }
        return left + right;
    }

    private record CapabilityState(boolean available, long expiresAt) {

        private static CapabilityState unchecked() {
            return new CapabilityState(false, Long.MIN_VALUE);
        }

        private boolean validAt(long now) {
            return now < expiresAt;
        }
    }
}
