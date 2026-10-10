/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.repository;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationLogRecord;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationWindow;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView.SpanEvent;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView.SpanLink;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;

/** Strict storage boundary for bounded Trace and Log investigation evidence. */
public interface InvestigationQueryRepository {

    int MAX_TRACE_SPANS = 5_000;
    int MAX_TRACE_LOGS = 200;
    int MAX_NEARBY_LOGS = 25;
    int MAX_ALERT_LOGS = 100;
    int MAX_ALERT_TRACES = 50;

    RowsResult<TraceSpanRow> trace(TraceQuery query);

    RowsResult<InvestigationLogRecord> selectedLog(LogQuery query);

    RowsResult<InvestigationLogRecord> sameTraceLogs(TraceLogsQuery query);

    NearbyResult nearbyLogs(NearbyQuery query);

    RowsResult<InvestigationLogRecord> identityLogs(IdentityQuery query);

    RowsResult<TraceSummaryRow> identityTraces(IdentityQuery query);

    /** Exact trusted trace scope. */
    record TraceQuery(String workspaceId, String traceId, long start, long end, String selectedSpanId) {
        public TraceQuery {
            requireWindow(start, end);
            workspaceId = requireText(workspaceId, "workspaceId");
            traceId = requireIdentifier(traceId, "[0-9a-f]{32}", "traceId");
            if (selectedSpanId != null) {
                selectedSpanId = requireIdentifier(selectedSpanId, "[0-9a-f]{16}", "selectedSpanId");
            }
        }

        public TraceQuery(String workspaceId, String traceId, long start, long end) {
            this(workspaceId, traceId, start, end, null);
        }
    }

    /** Exact trusted selected-log scope. */
    record LogQuery(String workspaceId, String logRecordUid, long start, long end) {
        public LogQuery {
            requireWindow(start, end);
            workspaceId = requireText(workspaceId, "workspaceId");
            logRecordUid = requireText(logRecordUid, "logRecordUid");
        }
    }

    /** Exact trusted same-trace log scope. */
    record TraceLogsQuery(String workspaceId, String traceId, long start, long end) {
        public TraceLogsQuery {
            requireWindow(start, end);
            workspaceId = requireText(workspaceId, "workspaceId");
            traceId = requireIdentifier(traceId, "[0-9a-f]{32}", "traceId");
        }
    }

    /** Exact trusted nearby-log scope derived from the selected persisted row. */
    record NearbyQuery(String workspaceId,
                       String selectedLogRecordUid,
                       long selectedTimeUnixNano,
                       String serviceName,
                       String entityId,
                       String entityType,
                       String serviceNamespace,
                       String deploymentEnvironment,
                       long start,
                       long end,
                       String hostName) {
        public NearbyQuery {
            requireWindow(start, end);
            workspaceId = requireText(workspaceId, "workspaceId");
            selectedLogRecordUid = requireText(selectedLogRecordUid, "selectedLogRecordUid");
            serviceName = requireText(serviceName, "serviceName");
            entityId = optionalText(entityId, "entityId");
            entityType = optionalText(entityType, "entityType");
            hostName = optionalText(hostName, "hostName");
            if ((entityId == null) != (entityType == null) || (entityId == null && hostName == null)) {
                throw new IllegalArgumentException("Nearby query needs an entity identity or host name");
            }
            if (selectedTimeUnixNano <= 0L) {
                throw new IllegalArgumentException("selectedTimeUnixNano is invalid");
            }
        }

        public NearbyQuery(String workspaceId,
                           String selectedLogRecordUid,
                           long selectedTimeUnixNano,
                           String serviceName,
                           String entityId,
                           String entityType,
                           String serviceNamespace,
                           String deploymentEnvironment,
                           long start,
                           long end) {
            this(workspaceId, selectedLogRecordUid, selectedTimeUnixNano, serviceName, entityId, entityType,
                    serviceNamespace, deploymentEnvironment, start, end, null);
        }
    }

    /** Exact trusted persisted service/entity identity for an alert signal query. */
    record IdentityQuery(String workspaceId,
                         String entityId,
                         String serviceName,
                         String serviceNamespace,
                         String deploymentEnvironment,
                         long start,
                         long end) {
        public IdentityQuery {
            requireWindow(start, end);
            workspaceId = requireText(workspaceId, "workspaceId");
            entityId = entityId == null ? null : requireIdentifier(entityId, "[1-9][0-9]{0,18}", "entityId");
            serviceName = requireText(serviceName, "serviceName");
            serviceNamespace = optionalText(serviceNamespace, "serviceNamespace");
            deploymentEnvironment = optionalText(deploymentEnvironment, "deploymentEnvironment");
        }
    }

    /** Strict aggregate trace summary row for an alert investigation. */
    record TraceSummaryRow(String traceId,
                           String startTimeUnixNano,
                           String durationNanos,
                           String status,
                           int spanCount,
                           String serviceName) {
    }

    /** Strictly mapped span row. */
    record TraceSpanRow(long startTime,
                        long startTimeUnixNano,
                        long observedEndTime,
                        String traceId,
                        String spanId,
                        String parentSpanId,
                        String spanName,
                        String serviceName,
                        String status,
                        String statusMessage,
                        String spanKind,
                        String traceState,
                        String scopeName,
                        String scopeVersion,
                        long durationNanos,
                        String workspaceId,
                        String entityId,
                        String entityType,
                        String serviceNamespace,
                        String deploymentEnvironment,
                        Map<String, String> resourceAttributes,
                        Map<String, String> spanAttributes,
                        List<SpanEvent> spanEvents,
                        List<SpanLink> spanLinks,
                        CodeNavigationHint codeNavigationHint) {
        public TraceSpanRow {
            resourceAttributes = resourceAttributes == null ? Map.of() : Map.copyOf(resourceAttributes);
            spanAttributes = spanAttributes == null ? Map.of() : Map.copyOf(spanAttributes);
            spanEvents = spanEvents == null ? List.of() : List.copyOf(spanEvents);
            spanLinks = spanLinks == null ? List.of() : List.copyOf(spanLinks);
        }
    }

    /** Repository status that never collapses failure or malformed data into zero rows. */
    enum Status {
        AVAILABLE,
        STORAGE_UNAVAILABLE,
        MALFORMED_DATA,
        LIMIT_EXCEEDED
    }

    /** Bounded query result. */
    record RowsResult<T>(Status status, List<T> rows, boolean truncated) {
        public RowsResult {
            rows = rows == null ? List.of() : List.copyOf(rows);
            if (status != Status.AVAILABLE && (!rows.isEmpty() || truncated)) {
                throw new IllegalArgumentException("Unavailable result cannot carry rows");
            }
        }

        public static <T> RowsResult<T> available(List<T> rows, boolean truncated) {
            return new RowsResult<>(Status.AVAILABLE, rows, truncated);
        }

        public static <T> RowsResult<T> failed(Status status) {
            return new RowsResult<>(status, List.of(), false);
        }
    }

    /** Bounded log rows on both sides of an exact selected row. */
    record NearbyResult(Status status,
                        List<InvestigationLogRecord> before,
                        List<InvestigationLogRecord> after,
                        boolean hasMoreBefore,
                        boolean hasMoreAfter) {
        public NearbyResult {
            before = before == null ? List.of() : List.copyOf(before);
            after = after == null ? List.of() : List.copyOf(after);
        }
    }

    private static void requireWindow(long start, long end) {
        new InvestigationWindow(start, end);
    }

    private static String requireText(String value, String label) {
        if (value == null || value.isBlank() || value.length() > 256
                || value.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(label + " is invalid");
        }
        return value.trim();
    }

    private static String requireIdentifier(String value, String pattern, String label) {
        if (value == null || !value.matches(pattern)) {
            throw new IllegalArgumentException(label + " is invalid");
        }
        return value;
    }

    private static String optionalText(String value, String label) {
        return value == null || value.isBlank() ? null : requireText(value, label);
    }
}
