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

import java.util.Comparator;
import java.util.List;
import org.apache.commons.lang3.StringUtils;

/**
 * Durable/readback source for OTLP ingest audit events.
 */
@FunctionalInterface
public interface OtlpIngestionAuditEventReader {

    int DEFAULT_MAX_LIMIT = 256;

    List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit);

    default List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit, Long startMillis) {
        return recentEvents(workspaceId, limit, startMillis, null);
    }

    default List<OtlpIngestionAuditEvent> recentEvents(String workspaceId, int limit, Long startMillis,
                                                       Long endMillis) {
        Long safeStartMillis = startMillis == null || startMillis <= 0 ? null : startMillis;
        Long safeEndMillis = endMillis == null || endMillis <= 0 ? null : endMillis;
        String safeWorkspaceId = StringUtils.trimToNull(workspaceId);
        int safeLimit = boundedLimit(limit);
        return recentEvents(safeWorkspaceId, safeLimit).stream()
                .filter(event -> event != null)
                .filter(event -> event.observedAt() > 0)
                .filter(event -> safeWorkspaceId == null
                        || safeWorkspaceId.equals(StringUtils.trimToNull(event.workspaceId())))
                .filter(event -> safeStartMillis == null || event.observedAt() >= safeStartMillis)
                .filter(event -> safeEndMillis == null || event.observedAt() <= safeEndMillis)
                .sorted(Comparator.comparingLong(OtlpIngestionAuditEvent::observedAt).reversed())
                .limit(safeLimit)
                .toList();
    }

    private static int boundedLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_MAX_LIMIT;
        }
        return Math.min(limit, DEFAULT_MAX_LIMIT);
    }
}
