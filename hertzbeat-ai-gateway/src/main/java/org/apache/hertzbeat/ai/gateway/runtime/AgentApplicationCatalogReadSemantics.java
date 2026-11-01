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

import org.apache.hertzbeat.ai.gateway.tool.metrics.AgentHierarchyReadOutput;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Exact-scope native metadata; incomplete projections cannot establish a complete observation. */
final class AgentApplicationCatalogReadSemantics {
    static boolean supports(String tool) {
        return Set.of(
                        "metrics.related",
                        "alert_rule.hierarchy",
                        "monitor.favorite_list",
                        "monitor.layout_get")
                .contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> out) {
        try {
            if (!Boolean.FALSE.equals(out.get("partial"))
                    || !Boolean.TRUE.equals(out.get("redactionApplied"))
                    || out.containsKey("error")
                    || Boolean.FALSE.equals(out.get("success"))) return null;
            return switch (call.getToolName()) {
                case "metrics.related", "alert_rule.hierarchy" -> hierarchy(call, out);
                case "monitor.favorite_list" -> favorite(call.getArguments(), out);
                case "monitor.layout_get" -> layout(call.getArguments(), out);
                default -> null;
            };
        } catch (RuntimeException invalid) {
            return null;
        }
    }

    private AgentReadObservationClassifier.Observation hierarchy(
            AgentRuntimeToolCall call, Map<String, Object> out) {
        var args = call.getArguments();
        boolean alert = call.getToolName().equals("alert_rule.hierarchy");
        if (!(alert ? Set.of("app") : Set.of("app", "language")).containsAll(args.keySet())
                || !"app-hierarchy.v1".equals(out.get("readVersion"))) return null;
        String app = AgentHierarchyReadOutput.application((String) args.get("app"));
        String language =
                alert ? "en-US" : AgentHierarchyReadOutput.language((String) args.get("language"));
        if (alert && app.isEmpty()
                || !app.equals(out.get("application"))
                || !language.equals(out.get("language"))
                || !(out.get("data") instanceof List<?> rows)
                || rows.size() > 100
                || !app.isEmpty() && rows.size() > 1) return null;
        var roots = new HashSet<String>();
        for (Object value : rows) {
            if (!(value instanceof Map<?, ?> row)
                    || !node(row, 0)
                    || !roots.add((String) row.get("value"))
                    || !app.isEmpty() && !app.equals(row.get("value"))) return null;
        }
        return new AgentReadObservationClassifier.Observation(
                "app-metric-field-metadata-not-health", rows.size());
    }

    private boolean node(Map<?, ?> row, int depth) {
        if (!Set.of("category", "value", "label", "isLeaf", "hide", "type", "unit", "children")
                        .containsAll(row.keySet())
                || !(row.get("value") instanceof String value)
                || value.isBlank()
                || value.length() > 128
                || !(row.get("isLeaf") instanceof Boolean leaf)
                || !(row.get("hide") instanceof Boolean)
                || row.get("label") != null
                        && (!(row.get("label") instanceof String text) || text.length() > 2048))
            return false;
        if (depth == 2)
            return leaf
                    && Set.of(0L, 1L).contains(number(row.get("type")))
                    && (row.get("children") == null
                            || row.get("children") instanceof List<?> list && list.isEmpty());
        if (leaf || !(row.get("children") instanceof List<?> children) || children.size() > 100)
            return false;
        var seen = new HashSet<String>();
        for (Object child : children)
            if (!(child instanceof Map<?, ?> item)
                    || !node(item, depth + 1)
                    || !seen.add((String) item.get("value"))) return false;
        return true;
    }

    private AgentReadObservationClassifier.Observation favorite(
            Map<String, Object> args, Map<String, Object> out) {
        if (!args.keySet().equals(Set.of("monitorId"))
                || !"monitor-workspace-read.v1".equals(out.get("readVersion"))
                || !(out.get("data") instanceof Map<?, ?> row)
                || !row.keySet().equals(Set.of("monitorId", "metricsNames"))
                || number(args.get("monitorId")) <= 0
                || number(args.get("monitorId")) != number(row.get("monitorId"))
                || !(row.get("metricsNames") instanceof List<?> names)
                || names.size() > 100) return null;
        var seen = new HashSet<String>();
        for (Object name : names)
            if (!(name instanceof String text)
                    || text.isBlank()
                    || text.length() > 100
                    || !seen.add(text)) return null;
        return new AgentReadObservationClassifier.Observation(
                "personal-monitor-favorite-metadata", names.size());
    }

    private AgentReadObservationClassifier.Observation layout(
            Map<String, Object> args, Map<String, Object> out) {
        if (!args.keySet().equals(Set.of("application"))
                || !"monitor-workspace-read.v1".equals(out.get("readVersion"))
                || !(out.get("data") instanceof Map<?, ?> row)) return null;
        String app = AgentHierarchyReadOutput.application((String) args.get("application"));
        if (app.isEmpty() || !app.equals(row.get("application"))) return null;
        if (Boolean.FALSE.equals(row.get("present"))
                && row.keySet().equals(Set.of("application", "present")))
            return new AgentReadObservationClassifier.Observation(
                    "personal-monitor-layout-metadata", 0);
        if (!Boolean.TRUE.equals(row.get("present"))
                || !row.keySet().equals(Set.of("application", "present", "layout"))
                || !(row.get("layout") instanceof Map<?, ?> doc)
                || !app.equals(doc.get("application"))
                || !doc.keySet()
                        .equals(
                                Set.of(
                                        "application",
                                        "revision",
                                        "schemaVersion",
                                        "mode",
                                        "columns",
                                        "items",
                                        "historyDock"))
                || !(doc.get("revision") instanceof String revision)
                || !revision.matches("[a-f0-9-]{36}")
                || number(doc.get("schemaVersion")) != 1
                || number(doc.get("columns")) != 12
                || !Set.of("auto", "custom").contains(doc.get("mode"))
                || !(doc.get("historyDock") instanceof Map<?, ?> dock)
                || !dock.keySet().equals(Set.of("collapsed", "height"))
                || !(dock.get("collapsed") instanceof Boolean)
                || number(dock.get("height")) < 8
                || number(dock.get("height")) > 20
                || !(doc.get("items") instanceof List<?> items)
                || items.size() > 100) return null;
        var groups = new HashSet<String>();
        var orders = new HashSet<Long>();
        for (Object value : items) {
            if (!(value instanceof Map<?, ?> item)
                    || !item.keySet()
                            .equals(Set.of("group", "x", "y", "w", "h", "collapsed", "order"))
                    || !(item.get("group") instanceof String group)
                    || !group.matches("[A-Za-z0-9_.:-]{1,128}")
                    || !groups.add(group)
                    || !orders.add(number(item.get("order")))
                    || number(item.get("order")) > 127
                    || !(item.get("collapsed") instanceof Boolean collapsed)
                    || number(item.get("x")) + number(item.get("w")) > 12
                    || number(item.get("y")) > 999
                    || !Set.of(4L, 6L, 8L, 12L).contains(number(item.get("w")))
                    || number(item.get("h")) < (collapsed ? 4 : 8)
                    || number(item.get("h")) > 24) return null;
        }
        for (int i = 0; i < items.size(); i++)
            for (int j = i + 1; j < items.size(); j++) {
                var a = (Map<?, ?>) items.get(i);
                var b = (Map<?, ?>) items.get(j);
                if (number(a.get("x")) < number(b.get("x")) + number(b.get("w"))
                        && number(a.get("x")) + number(a.get("w")) > number(b.get("x"))
                        && number(a.get("y")) < number(b.get("y")) + number(b.get("h"))
                        && number(a.get("y")) + number(a.get("h")) > number(b.get("y")))
                    return null;
            }
        return new AgentReadObservationClassifier.Observation(
                "personal-monitor-layout-metadata", 1);
    }

    private long number(Object value) {
        return AgentNativeReadContract.number(value);
    }
}
