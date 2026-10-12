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

package org.apache.hertzbeat.observability.investigation.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationServiceIdentity;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView.DependencyEdge;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView.Span;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView.TraceDetail;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.TraceSpanRow;
import org.springframework.util.StringUtils;

/** Strictly validates and assembles a complete selected trace. */
final class InvestigationTraceAssembler {

    private InvestigationTraceAssembler() {
    }

    static AssembledTrace assemble(String traceId, String selectedSpanId, List<TraceSpanRow> rows) {
        return assemble(traceId, selectedSpanId, rows, false);
    }

    static AssembledTrace assemble(String traceId, String selectedSpanId, List<TraceSpanRow> rows, boolean partial) {
        if (rows == null || rows.isEmpty()) {
            throw new MalformedTraceException();
        }
        Map<String, TraceSpanRow> byId = validatedRows(traceId, rows);
        List<TraceSpanRow> roots = rows.stream().filter(row -> row.parentSpanId() == null).toList();
        TraceSpanRow representative = rows.stream().min(java.util.Comparator.comparingLong(TraceSpanRow::startTimeUnixNano)
                .thenComparing(TraceSpanRow::spanId)).orElseThrow();
        TraceSpanRow root = roots.size() == 1 ? roots.getFirst() : null;
        TraceSpanRow selected = root == null ? representative : root;
        if (StringUtils.hasText(selectedSpanId)) {
            selected = byId.get(selectedSpanId);
            if (selected == null) {
                throw new ObservabilityQueryRequestException();
            }
        }
        List<Span> spans = rows.stream().map(InvestigationTraceAssembler::toSpan).toList();
        int errorCount = (int) rows.stream().filter(row -> isError(row.status())).count();
        int missingParents = (int) rows.stream().filter(row -> row.parentSpanId() != null
                && !byId.containsKey(row.parentSpanId())).count();
        long observedEnd = rows.stream().mapToLong(InvestigationTraceAssembler::endTime).max().orElseThrow();
        TraceDetail detail = new TraceDetail(root == null ? null : root.spanId(), root == null ? null : root.serviceName(),
                root == null ? null : root.serviceNamespace(), root == null ? null : root.deploymentEnvironment(),
                root == null ? null : root.entityId(), root == null ? null : root.entityType(),
                root == null ? null : root.spanName(), root == null ? null : Long.toString(root.durationNanos()),
                root == null ? null : normalizedStatus(root.status()), root == null ? null : root.startTime(),
                errorCount, root == null ? null : root.resourceAttributes(), spans,
                roots.isEmpty() ? "missing" : roots.size() == 1 ? "unique" : "ambiguous", roots.size(),
                new org.apache.hertzbeat.common.observability.dto.trace.TraceRepresentativeSpanDto(
                        representative.spanId(), representative.spanName(), representative.serviceName(),
                        representative.serviceNamespace(), representative.startTime(), representative.durationNanos()),
                representative.startTime(), observedEnd, missingParents, partial);
        return new AssembledTrace(detail, selected.spanId(), identity(selected), dependencies(rows, byId));
    }

    private static Map<String, TraceSpanRow> validatedRows(String traceId, List<TraceSpanRow> rows) {
        Map<String, TraceSpanRow> byId = new LinkedHashMap<>();
        if (traceId == null || !traceId.matches("[0-9a-f]{32}") || traceId.matches("0+")) {
            throw new MalformedTraceException();
        }
        for (TraceSpanRow row : rows) {
            if (row == null || !traceId.equals(row.traceId()) || !validSpanId(row.spanId())
                    || (row.parentSpanId() != null && !validSpanId(row.parentSpanId()))
                    || row.spanId().equals(row.parentSpanId()) || row.startTime() < 0 || row.startTimeUnixNano() < 0
                    || row.startTimeUnixNano() / 1_000_000L != row.startTime()
                    || row.durationNanos() < 0 || row.durationNanos() > 9_007_199_254_740_991L
                    || byId.put(row.spanId(), row) != null) {
                throw new MalformedTraceException();
            }
            endTime(row);
        }
        Set<String> complete = new HashSet<>();
        for (TraceSpanRow row : rows) {
            Set<String> path = new HashSet<>();
            TraceSpanRow current = row;
            while (current != null && !complete.contains(current.spanId())) {
                if (!path.add(current.spanId())) {
                    throw new MalformedTraceException();
                }
                current = byId.get(current.parentSpanId());
            }
            complete.addAll(path);
        }
        return byId;
    }

    private static boolean validSpanId(String value) {
        return value != null && value.matches("[0-9a-f]{16}") && !value.matches("0+");
    }

    private static long endTime(TraceSpanRow row) {
        long durationMillis = row.durationNanos() / 1_000_000L + (row.durationNanos() % 1_000_000L == 0 ? 0 : 1);
        if (row.startTime() > 9_007_199_254_740_991L - durationMillis) {
            throw new MalformedTraceException();
        }
        if (row.observedEndTime() < row.startTime() || row.observedEndTime() > 9_007_199_254_740_991L) {
            throw new MalformedTraceException();
        }
        return row.observedEndTime();
    }

    private static Span toSpan(TraceSpanRow row) {
        return new Span(row.spanId(), row.parentSpanId(), row.spanName(), row.serviceName(), row.serviceNamespace(),
                row.deploymentEnvironment(), row.entityId(), row.entityType(), normalizedStatus(row.status()),
                row.statusMessage(), row.spanKind(), row.traceState(), row.scopeName(), row.scopeVersion(),
                Long.toString(row.durationNanos()), row.startTime(), Long.toString(row.startTimeUnixNano()),
                isError(row.status()), row.resourceAttributes(),
                row.spanAttributes(), row.spanEvents(), row.spanLinks(), row.codeNavigationHint());
    }

    private static InvestigationServiceIdentity identity(TraceSpanRow row) {
        if (!StringUtils.hasText(row.workspaceId()) || !StringUtils.hasText(row.entityId())
                || !StringUtils.hasText(row.entityType()) || !StringUtils.hasText(row.serviceName())) {
            return null;
        }
        try {
            return new InvestigationServiceIdentity(row.workspaceId(), row.entityId(), row.entityType(),
                    row.serviceName(), row.serviceNamespace(), row.deploymentEnvironment());
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private static List<DependencyEdge> dependencies(List<TraceSpanRow> rows, Map<String, TraceSpanRow> byId) {
        List<DependencyEdge> edges = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (TraceSpanRow child : rows) {
            TraceSpanRow parent = byId.get(child.parentSpanId());
            if (parent == null || !StringUtils.hasText(parent.serviceName()) || !StringUtils.hasText(child.serviceName())
                    || parent.serviceName().equals(child.serviceName())) {
                continue;
            }
            String key = parent.serviceName() + '\0' + child.serviceName() + '\0' + child.spanId();
            if (seen.add(key)) {
                edges.add(new DependencyEdge(parent.serviceName(), child.serviceName(), parent.entityId(),
                        child.entityId(), child.spanId(), normalizedStatus(child.status()),
                        child.durationNanos() / 1_000_000D));
            }
        }
        return List.copyOf(edges);
    }

    private static boolean isError(String status) {
        return status != null && status.toUpperCase(java.util.Locale.ROOT).contains("ERROR");
    }

    private static String normalizedStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return "unknown";
        }
        String normalized = status.trim().toUpperCase(java.util.Locale.ROOT);
        if (normalized.contains("ERROR")) {
            return "error";
        }
        if (normalized.endsWith("_OK") || "OK".equals(normalized)) {
            return "ok";
        }
        if (normalized.contains("UNSET")) {
            return "unset";
        }
        return "unknown";
    }

    record AssembledTrace(TraceDetail detail,
                          String selectedSpanId,
                          InvestigationServiceIdentity selectedIdentity,
                          List<DependencyEdge> dependencies) {
    }

    static final class MalformedTraceException extends RuntimeException {
        private static final long serialVersionUID = 1L;
    }
}
