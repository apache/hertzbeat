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

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Storage-owned query boundary for entity-scoped APM RED rollups.
 */
public interface ApmRedQueryRepository {

    long MAX_WINDOW_MILLIS = 24L * 60L * 60L * 1000L;
    int RESOLUTION_SECONDS = 60;
    int MAX_POINTS = 1440;

    ApmRedQueryResult query(ApmRedQuery query);

    default ApmRedBatchResult querySummaries(List<ApmRedQuery> queries) {
        return new ApmRedBatchResult(false, Map.of());
    }

    /** Whole-candidate summary result; an absent entity key is an empty observed window. */
    record ApmRedBatchResult(boolean available, Map<String, ApmRedSummary> summaries) {
        public ApmRedBatchResult {
            summaries = Map.copyOf(summaries);
            if (!available && !summaries.isEmpty()) {
                throw new IllegalArgumentException("Unavailable RED batch cannot contain summaries");
            }
        }
    }

    /** Exact trusted scope for one bounded Flow query. */
    record ApmRedQuery(long start,
                       long end,
                       String workspaceId,
                       String entityId,
                       String entityType,
                       String serviceName,
                       String serviceNamespace,
                       String deploymentEnvironment) {

        public ApmRedQuery {
            if (start < 0L || end <= start || end - start > MAX_WINDOW_MILLIS) {
                throw new IllegalArgumentException("APM RED query window is invalid");
            }
            workspaceId = requireText(workspaceId, "workspace ID");
            entityId = requireText(entityId, "entity ID");
            entityType = requireText(entityType, "entity type");
            serviceName = requireText(serviceName, "service name");
            serviceNamespace = trimToNull(serviceNamespace);
            deploymentEnvironment = trimToNull(deploymentEnvironment);
        }
    }

    /** Repository result that keeps storage failure distinct from a valid empty window. */
    record ApmRedQueryResult(boolean available, ApmRedSummary summary, List<ApmRedPoint> points) {

        public ApmRedQueryResult {
            points = points == null ? List.of() : List.copyOf(points);
            if (!available && (summary != null || !points.isEmpty())) {
                throw new IllegalArgumentException("Unavailable APM RED result cannot contain values");
            }
            if (available && points.isEmpty() && summary != null) {
                throw new IllegalArgumentException("Empty APM RED result cannot contain a summary");
            }
            if (available && !points.isEmpty()) {
                Objects.requireNonNull(summary, "summary");
            }
        }

        public static ApmRedQueryResult unavailable() {
            return new ApmRedQueryResult(false, null, List.of());
        }

        public static ApmRedQueryResult available(List<ApmRedPoint> points, ApmRedSummary summary) {
            return new ApmRedQueryResult(true, summary, points);
        }
    }

    /** Metrics aggregated across the complete requested window. */
    record ApmRedSummary(long requestCount,
                         long errorCount,
                         double requestRatePerSecond,
                         double errorRate,
                         Double latencyAverageMs,
                         Double latencyP95Ms) {
    }

    /** Metrics for one Flow-owned minute bucket. */
    record ApmRedPoint(long timestamp,
                       long requestCount,
                       long errorCount,
                       double requestRatePerSecond,
                       double errorRate,
                       Double latencyAverageMs,
                       Double latencyP95Ms) {
    }

    private static String requireText(String value, String label) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new IllegalArgumentException("APM RED " + label + " is required");
        }
        return normalized;
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
