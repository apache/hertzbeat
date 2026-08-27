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

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * Optional read boundary for a telemetry-derived semantic graph.
 *
 * <p>The repository supplies relationship evidence only. HertzBeat's entity catalog remains the authoritative
 * identity source, and callers must resolve every endpoint before exposing a relationship.</p>
 */
public interface SemanticGraphQueryRepository {

    int MAX_QUERY_ENTITIES = 64;
    int MAX_RELATIONSHIPS = 256;
    long MAX_WINDOW_MILLIS = 3_600_000L;

    RelationshipQueryResult queryRelationships(RelationshipQuery query);

    /** A bounded semantic entity endpoint. */
    record EntityKey(String type, String id) {

        public EntityKey {
            type = normalize(type, 64, "Entity type").toLowerCase(Locale.ROOT);
            id = normalize(id, 512, "Entity ID");
        }
    }

    /** A bounded relationship lookup adjacent to authoritative HertzBeat entity identities. */
    record RelationshipQuery(Set<EntityKey> entities, long start, long end, int limit) {

        public RelationshipQuery {
            entities = Set.copyOf(Objects.requireNonNull(entities, "entities"));
            if (entities.isEmpty() || entities.size() > MAX_QUERY_ENTITIES) {
                throw new IllegalArgumentException("Semantic graph entity count must be between 1 and "
                        + MAX_QUERY_ENTITIES);
            }
            if (start < 0 || end <= start || end - start > MAX_WINDOW_MILLIS) {
                throw new IllegalArgumentException("Semantic graph query requires a positive bounded time window");
            }
            if (limit < 1 || limit > MAX_RELATIONSHIPS) {
                throw new IllegalArgumentException("Semantic graph relationship limit must be between 1 and "
                        + MAX_RELATIONSHIPS);
            }
        }
    }

    /** One telemetry-derived relationship. */
    record Relationship(Instant observedAt,
                        EntityKey source,
                        EntityKey target,
                        String relationType,
                        String provenance,
                        double confidence,
                        long requestCount,
                        long errorCount,
                        double durationSum,
                        long durationCount) {

        public Relationship {
            observedAt = Objects.requireNonNull(observedAt, "observedAt");
            source = Objects.requireNonNull(source, "source");
            target = Objects.requireNonNull(target, "target");
            relationType = normalize(relationType, 64, "Relationship type");
            provenance = normalize(provenance, 64, "Relationship provenance");
            confidence = Double.isFinite(confidence) ? Math.max(0D, Math.min(1D, confidence)) : 0D;
            requestCount = Math.max(0L, requestCount);
            errorCount = Math.max(0L, errorCount);
            durationSum = Double.isFinite(durationSum) ? Math.max(0D, durationSum) : 0D;
            durationCount = Math.max(0L, durationCount);
        }
    }

    /** Distinguishes an unsupported/unavailable graph from a valid empty graph. */
    record RelationshipQueryResult(boolean available, List<Relationship> relationships) {

        public RelationshipQueryResult {
            relationships = List.copyOf(Objects.requireNonNull(relationships, "relationships"));
            if (relationships.size() > MAX_RELATIONSHIPS) {
                throw new IllegalArgumentException("Semantic graph result exceeds " + MAX_RELATIONSHIPS
                        + " relationships");
            }
        }

        public static RelationshipQueryResult unavailable() {
            return new RelationshipQueryResult(false, List.of());
        }

        public static RelationshipQueryResult available(List<Relationship> relationships) {
            return new RelationshipQueryResult(true, relationships);
        }
    }

    private static String normalize(String value, int maximumLength, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " cannot be blank");
        }
        String normalized = value.trim();
        if (normalized.length() > maximumLength) {
            throw new IllegalArgumentException(label + " exceeds " + maximumLength + " characters");
        }
        return normalized;
    }
}
