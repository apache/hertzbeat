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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.decode;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.keys;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.list;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.management;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.number;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.object;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.observation;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.require;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.same;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.text;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.traceProjection;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadContract.window;

import org.apache.hertzbeat.alert.dto.AlertGroupEvidence;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationEvidenceState;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView;
import org.apache.hertzbeat.manager.pojo.dto.MonitorSignalView;

import java.util.Map;
import java.util.List;
import java.util.Set;

/**
 * Validates persisted anchors and each producer's typed availability states, never inventing absent
 * signals.
 */
final class AgentNativeInvestigationReadSemantics {
    private static final Set<String> STATUSES =
            Set.of("firing", "pending", "acknowledged", "resolved");

    AgentReadObservationClassifier.Observation classify(
            String tool, Map<String, Object> args, Map<String, Object> output) {
        if (tool.equals("traces.detail")) {
            traceProjection(output);
            return trace(args, output);
        }
        var data = object(management(output));
        return switch (tool) {
            case "monitor.investigation" -> monitor(args, data);
            case "alert.investigation" -> alert(args, data);
            case "alert.group.evidence" -> evidence(args, data);
            case "alert.group.query" -> groups(args, data);
            default -> null;
        };
    }

    private AgentReadObservationClassifier.Observation monitor(
            Map<String, Object> args, Map<String, Object> data) {
        var result = decode(data, MonitorSignalView.class);
        require(
                result.monitorId() == number(args.get("monitorId"))
                        && number(args.get("start")) > 0);
        require(window(args, object(data.get("window")), 86_400_000));
        same("greptime_collection_events", result.collection().source());
        same("current_alerts", result.alerts().source());
        same("current", result.alerts().scope());
        int count = 0;
        if (result.collection().state() == MonitorSignalView.EvidenceState.READY) {
            var event = result.collection().event();
            require(
                    event.observedAt() >= result.window().start()
                            && event.observedAt() < result.window().end());
            require(
                    event.durationMillis() >= 0
                            && event.fieldCount() >= 0
                            && event.rowCount() >= 0);
            text(event.outcome());
            count++;
        }
        for (var alert : result.alerts().previews()) {
            require(alert.id() > 0 && "firing".equals(alert.status()));
            count++;
        }
        require(
                result.collection().state() != MonitorSignalView.EvidenceState.UNAVAILABLE
                        || result.alerts().state() != MonitorSignalView.EvidenceState.UNAVAILABLE);
        return observation("monitor-observed-signals", count);
    }

    private AgentReadObservationClassifier.Observation alert(
            Map<String, Object> args, Map<String, Object> data) {
        var result = decode(data, AlertInvestigationView.class);
        require(result.alertId() == number(args.get("alertId")));
        require(window(args, object(data.get("window")), 86_400_000));
        require(STATUSES.contains(result.alert().status()));
        // The exact persisted header is evidence even when correlated signal storage is
        // unavailable.
        return observation("persisted-alert-investigation", 1);
    }

    private AgentReadObservationClassifier.Observation trace(
            Map<String, Object> args, Map<String, Object> data) {
        var result = decode(data, TraceInvestigationView.class);
        same(AgentNativeTraceReadSemantics.hex(args.get("traceId"), 32), result.traceId());
        if (args.get("spanId") != null) {
            same(args.get("spanId"), result.selectedSpanId());
        }
        if (result.selectedSpanId() != null) {
            AgentNativeTraceReadSemantics.hex(result.selectedSpanId(), 16);
        }
        require(window(args, object(data.get("window")), 86_400_000));
        if (result.gantt().state() == InvestigationEvidenceState.UNAVAILABLE) {
            return null;
        }
        if (result.gantt().state() == InvestigationEvidenceState.EMPTY) {
            return observation("trace-gantt-observed", 0);
        }
        var detail = result.gantt().detail();
        var ids = new java.util.HashSet<String>();
        for (var span : detail.spans()) {
            require(ids.add(AgentNativeTraceReadSemantics.hex(span.spanId(), 16)));
        }
        require(result.selectedSpanId() == null || ids.contains(result.selectedSpanId()));
        return observation("trace-gantt-observed", detail.spans().size());
    }

    private AgentReadObservationClassifier.Observation evidence(
            Map<String, Object> args, Map<String, Object> data) {
        keys(data, "groups", "missingIds", "observedAt");
        var result = decode(data, AlertGroupEvidence.class);
        require(result.observedAt() > 0);
        var requested = new java.util.HashSet<Long>();
        var raw = list(args.get("ids"));
        require(!raw.isEmpty() && raw.size() <= 100);
        for (Object id : raw) {
            long value = number(id);
            require(value > 0);
            requested.add(value);
        }
        var accounted = new java.util.HashSet<Long>();
        for (var group : result.groups()) {
            require(
                    group.id() != null
                            && requested.contains(group.id())
                            && accounted.add(group.id())
                            && STATUSES.contains(group.status()));
        }
        for (Long id : result.missingIds()) {
            require(requested.contains(id) && accounted.add(id));
        }
        require(accounted.equals(requested));
        return observation("alert-group-status-records", result.groups().size());
    }

    private AgentReadObservationClassifier.Observation groups(
            Map<String, Object> args, Map<String, Object> data) {
        keys(data, "content", "pageIndex", "pageSize", "totalElements", "totalPages");
        long page = args.get("pageIndex") == null ? 0 : number(args.get("pageIndex"));
        long size = args.get("pageSize") == null ? 20 : number(args.get("pageSize"));
        require(page <= 10_000 && size >= 1 && size <= 50);
        require(number(data.get("pageIndex")) == page && number(data.get("pageSize")) == size);
        var rows = list(data.get("content"));
        long total = number(data.get("totalElements"));
        require(rows.size() <= size && total >= (rows.isEmpty() ? 0 : page * size + rows.size()));
        require(number(data.get("totalPages")) == Math.ceilDiv(total, size));
        var seen = new java.util.HashSet<Long>();
        for (Object value : rows) {
            var row = object(value);
            long id = number(row.get("id"));
            String status = text(row.get("status"));
            require(id > 0 && seen.add(id) && STATUSES.contains(status));
            if (args.get("status") instanceof String filter && !filter.isBlank()) {
                same(filter.trim(), status);
            }
            labelScope(args, row, "serviceName", List.of("service.name", "service", "serviceName", "job", "instance"));
            labelScope(args, row, "serviceNamespace", List.of("service.namespace", "serviceNamespace", "service_namespace"));
            labelScope(args, row, "environment", List.of("deployment.environment.name", "environment", "deployment.environment"));
        }
        return observation("alert-group-page-records", rows.size());
    }

    private void labelScope(Map<String, Object> args, Map<String, Object> row, String field, List<String> aliases) {
        if (!(args.get(field) instanceof String expected) || expected.isBlank()) { return; }
        boolean matched = false;
        for (String group : List.of("commonLabels", "groupLabels")) {
            if (!(row.get(group) instanceof Map<?, ?> labels)) { continue; }
            matched |= aliases.stream().anyMatch(key -> labels.get(key) instanceof String value && expected.trim().equals(value.trim()));
        }
        require(matched);
    }

}
