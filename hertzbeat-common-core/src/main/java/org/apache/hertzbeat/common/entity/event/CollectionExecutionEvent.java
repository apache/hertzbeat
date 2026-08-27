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

package org.apache.hertzbeat.common.entity.event;

import java.util.Locale;
import java.util.Objects;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * Bounded summary of one completed native collection execution.
 * <p>
 * The event deliberately references an entity by monitor and optional resolved id,
 * keeps runtime context optional, and records only observation metadata. It never
 * retains Arrow rows, arbitrary labels, annotations, or raw exception messages.
 *
 * @param entity stable entity reference for later resolution
 * @param runtime optional collector/runtime context; {@code null} is valid
 * @param observation bounded collection result
 */
public record CollectionExecutionEvent(
        EntityReference entity,
        RuntimeContext runtime,
        Observation observation) {

    public static final long UNKNOWN_DURATION_MILLIS = -1L;
    private static final int MAX_APP_LENGTH = 128;
    private static final int MAX_METRIC_SET_LENGTH = 192;
    private static final int MAX_COLLECTOR_ID_LENGTH = 128;
    private static final int MAX_TARGET_LENGTH = 512;

    public CollectionExecutionEvent {
        Objects.requireNonNull(entity, "entity");
        Objects.requireNonNull(observation, "observation");
    }

    /**
     * Create a summary from Arrow-backed metrics without copying its rows.
     *
     * @param metricsData completed metrics data
     * @return bounded execution event
     */
    public static CollectionExecutionEvent from(CollectRep.MetricsData metricsData) {
        Objects.requireNonNull(metricsData, "metricsData");
        long observedAt = metricsData.getTime();
        long startedAt = parseLong(metricsData.getMetadataValue(MetricDataConstants.COLLECTION_STARTED_AT), -1L);
        long durationMillis = startedAt >= 0L && observedAt >= startedAt
                ? observedAt - startedAt
                : UNKNOWN_DURATION_MILLIS;
        Long entityId = parseNullableLong(metricsData.getMetadataValue(MetricDataConstants.ENTITY_ID));
        String collectorId = bounded(
                metricsData.getMetadataValue(MetricDataConstants.COLLECTOR_ID), MAX_COLLECTOR_ID_LENGTH);
        String target = bounded(metricsData.getInstance(), MAX_TARGET_LENGTH);
        RuntimeContext runtimeContext = collectorId.isEmpty() && target.isEmpty()
                ? null
                : new RuntimeContext(collectorId, target);
        CollectRep.Code code = metricsData.getCode();
        return new CollectionExecutionEvent(
                new EntityReference(metricsData.getId(), entityId, metricsData.getApp()),
                runtimeContext,
                new Observation(
                        metricsData.getMetrics(),
                        observedAt,
                        durationMillis,
                        code == CollectRep.Code.SUCCESS ? Outcome.SUCCESS : Outcome.FAILURE,
                        FailureClass.from(code),
                        CollectionPhase.from(metricsData.getMetadataValue(MetricDataConstants.COLLECTION_PHASE)),
                        metricsData.getFieldsCount(),
                        metricsData.getValuesCount()));
    }

    /**
     * Entity authority reference. A missing entity id means resolution is deferred
     * to the existing monitor-to-entity binding model.
     */
    public record EntityReference(long monitorId, Long entityId, String app) {

        public EntityReference {
            app = bounded(app, MAX_APP_LENGTH);
        }
    }

    /**
     * Optional execution runtime. Non-Kubernetes and embedded deployments remain valid.
     */
    public record RuntimeContext(String collectorId, String target) {

        public RuntimeContext {
            collectorId = bounded(collectorId, MAX_COLLECTOR_ID_LENGTH);
            target = bounded(target, MAX_TARGET_LENGTH);
        }
    }

    /**
     * Bounded observation facts. Raw Arrow values and error messages are intentionally excluded.
     */
    public record Observation(
            String metricSet,
            long observedAt,
            long durationMillis,
            Outcome outcome,
            FailureClass failureClass,
            CollectionPhase phase,
            int fieldCount,
            int rowCount) {

        public Observation {
            metricSet = bounded(metricSet, MAX_METRIC_SET_LENGTH);
            observedAt = Math.max(0L, observedAt);
            durationMillis = Math.max(UNKNOWN_DURATION_MILLIS, durationMillis);
            outcome = Objects.requireNonNull(outcome, "outcome");
            failureClass = Objects.requireNonNull(failureClass, "failureClass");
            phase = Objects.requireNonNull(phase, "phase");
            fieldCount = Math.max(0, fieldCount);
            rowCount = Math.max(0, rowCount);
        }
    }

    /** Collection outcome. */
    public enum Outcome {
        SUCCESS,
        FAILURE
    }

    /** Stable failure categories derived from the collection response code. */
    public enum FailureClass {
        NONE,
        UNAVAILABLE,
        UNREACHABLE,
        UNCONNECTABLE,
        COLLECTION,
        TIMEOUT,
        UNKNOWN;

        private static FailureClass from(CollectRep.Code code) {
            if (code == null) {
                return UNKNOWN;
            }
            return switch (code) {
                case SUCCESS -> NONE;
                case UN_AVAILABLE -> UNAVAILABLE;
                case UN_REACHABLE -> UNREACHABLE;
                case UN_CONNECTABLE -> UNCONNECTABLE;
                case FAIL -> COLLECTION;
                case TIMEOUT -> TIMEOUT;
                case UNRECOGNIZED -> UNKNOWN;
            };
        }
    }

    /** Typed collection stage. Collectors may leave it unknown without losing functionality. */
    public enum CollectionPhase {
        UNKNOWN,
        RESOLVE,
        CONNECT,
        AUTHENTICATE,
        QUERY,
        PARSE,
        CONVERT,
        DISPATCH;

        private static CollectionPhase from(String value) {
            if (value == null || value.isBlank()) {
                return UNKNOWN;
            }
            try {
                return valueOf(value.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ignored) {
                return UNKNOWN;
            }
        }
    }

    private static String bounded(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private static Long parseNullableLong(String value) {
        long parsed = parseLong(value, Long.MIN_VALUE);
        return parsed == Long.MIN_VALUE ? null : parsed;
    }

    private static long parseLong(String value, long fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }
}
