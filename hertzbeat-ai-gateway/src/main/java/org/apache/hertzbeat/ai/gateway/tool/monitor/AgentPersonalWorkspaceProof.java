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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayout;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutSaveRequest;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Personal presentation state only; typed binding and native readback, never an execution grant.
 */
public final class AgentPersonalWorkspaceProof {
    public static final String VERSION = "personal-workspace.v1";

    private AgentPersonalWorkspaceProof() {}

    public static boolean supports(String tool) {
        return Set.of("monitor.favorite_set", "monitor.layout_save", "monitor.layout_delete")
                .contains(tool);
    }

    public static Map<String, Object> args(
            String application, MonitorMetricLayoutSaveRequest request) {
        return AgentToolContextSupport.arguments("application", application, "request", object(request));
    }

    public static Map<String, Object> object(Object value) {
        return JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
    }

    public static String hash(Object value) {
        return AgentToolPayloadHasher.normalizedArgumentsHash(Map.of("value", value));
    }

    public static String application(Object value) {
        if (!(value instanceof String text))
            throw new IllegalArgumentException("Application is required");
        String app =
                org.apache.hertzbeat.ai.gateway.tool.metrics.AgentHierarchyReadOutput.application(
                        text);
        if (app.isEmpty()
                || !app.equals(org.apache.hertzbeat.ai.gateway.text.GatewayText.redactSecrets(app)))
            throw new IllegalArgumentException("A public application identifier is required");
        return app;
    }

    public static boolean metric(Object value) {
        return value instanceof String s
                && s.matches("[A-Za-z0-9_.:-]{1,100}")
                && s.equals(org.apache.hertzbeat.ai.gateway.text.GatewayText.redactSecrets(s));
    }

    public static boolean revision(Object value, boolean missing) {
        return value instanceof String s
                && (missing && s.equals("missing")
                        || s.matches(
                                "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"));
    }

    public static long positive(Object value) {
        long n = new BigDecimal(String.valueOf(value)).longValueExact();
        if (n <= 0) throw new IllegalArgumentException("Positive id required");
        return n;
    }

    private static long number(Object value) {
        if (!(value instanceof Number)) throw new IllegalArgumentException("Number required");
        long n = new BigDecimal(value.toString()).longValueExact();
        if (n < 0) throw new IllegalArgumentException("Nonnegative number required");
        return n;
    }

    public static Map<String, Object> document(Map<?, ?> request) {
        var copy = new java.util.LinkedHashMap<String, Object>();
        for (String key : List.of("schemaVersion", "mode", "columns", "items", "historyDock"))
            copy.put(key, request.get(key));
        return copy;
    }

    public static boolean validRequest(Object value) {
        try {
            if (!(value instanceof Map<?, ?> r)
                    || !r.keySet()
                            .equals(
                                    Set.of(
                                            "expectedRevision",
                                            "schemaVersion",
                                            "mode",
                                            "columns",
                                            "items",
                                            "historyDock"))
                    || !revision(r.get("expectedRevision"), true)) return false;
            return validDocument(document(r));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    public static boolean validDocument(Map<?, ?> doc) {
        try {
            if (!doc.keySet()
                            .equals(
                                    Set.of(
                                            "schemaVersion",
                                            "mode",
                                            "columns",
                                            "items",
                                            "historyDock"))
                    || number(doc.get("schemaVersion")) != 1
                    || number(doc.get("columns")) != 12
                    || !Set.of("auto", "custom").contains(doc.get("mode"))
                    || !(doc.get("items") instanceof List<?> items)
                    || items.size() > 128
                    || !(doc.get("historyDock") instanceof Map<?, ?> dock)
                    || !dock.keySet().equals(Set.of("collapsed", "height"))
                    || !(dock.get("collapsed") instanceof Boolean)
                    || number(dock.get("height")) < 8
                    || number(dock.get("height")) > 20) return false;
            var groups = new HashSet<String>();
            var orders = new HashSet<Long>();
            for (Object value : items) {
                if (!(value instanceof Map<?, ?> item)
                        || !item.keySet()
                                .equals(Set.of("group", "x", "y", "w", "h", "collapsed", "order"))
                        || !(item.get("group") instanceof String group)
                        || !group.matches("[A-Za-z0-9_.:-]{1,128}")
                        || !group.equals(
                                org.apache.hertzbeat.ai.gateway.text.GatewayText.redactSecrets(
                                        group))
                        || !groups.add(group)
                        || !orders.add(number(item.get("order")))
                        || number(item.get("order")) > 127
                        || !(item.get("collapsed") instanceof Boolean collapsed)
                        || number(item.get("x")) + number(item.get("w")) > 12
                        || number(item.get("y")) > 999
                        || !Set.of(4L, 6L, 8L, 12L).contains(number(item.get("w")))
                        || number(item.get("h")) < (collapsed ? 4 : 8)
                        || number(item.get("h")) > 24) return false;
            }
            for (int i = 0; i < items.size(); i++)
                for (int j = i + 1; j < items.size(); j++) {
                    var a = (Map<?, ?>) items.get(i);
                    var b = (Map<?, ?>) items.get(j);
                    if (number(a.get("x")) < number(b.get("x")) + number(b.get("w"))
                            && number(a.get("x")) + number(a.get("w")) > number(b.get("x"))
                            && number(a.get("y")) < number(b.get("y")) + number(b.get("h"))
                            && number(a.get("y")) + number(a.get("h")) > number(b.get("y")))
                        return false;
                }
            return true;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    public static boolean validArguments(String tool, Map<String, Object> args) {
        try {
            if (!supports(tool) || args == null) return false;
            if (tool.equals("monitor.favorite_set"))
                return args.keySet().equals(Set.of("monitorId", "metricsName", "favorite"))
                        && positive(args.get("monitorId")) > 0
                        && metric(args.get("metricsName"))
                        && args.get("favorite") instanceof Boolean;
            application(args.get("application"));
            if (tool.equals("monitor.layout_delete"))
                return args.keySet().equals(Set.of("application", "expectedRevision"))
                        && revision(args.get("expectedRevision"), false);
            return args.keySet().equals(Set.of("application", "request"))
                    && validRequest(object(args.get("request")));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    /** Re-check the already admitted exact invocation immediately before the native write. */
    public static void guard(String tool, Map<String, Object> args) {
        var context = AgentToolContextSupport.invocation();
        var r = context.getRequest();
        var row = context.getLedgerCall();
        String h = AgentToolPayloadHasher.normalizedArgumentsHash(args);
        boolean approved =
                "APPROVED".equals(row.getApprovalStatus())
                        ? "APPROVED".equals(r.getApprovalStatus())
                                && r.getApprovalId() != null
                                && Objects.equals(r.getApprovalId(), row.getApprovalId())
                                && Objects.equals(
                                        r.getActor().getType(), row.getApprovalActorType())
                                && Objects.equals(r.getActor().getId(), row.getApprovalActorId())
                        : "NOT_REQUIRED".equals(row.getApprovalStatus())
                                && r.getApprovalId() == null
                                && (r.getApprovalStatus() == null
                                        || "NOT_REQUIRED".equals(r.getApprovalStatus()));
        if (!validArguments(tool, args)
                || !tool.equals(r.getToolName())
                || !tool.equals(row.getToolName())
                || !h.equals(row.getInputHash())
                || !h.equals(AgentToolPayloadHasher.normalizedArgumentsHash(r.getArguments()))
                || !"RUNNING".equals(row.getStatus())
                || !approved
                || !Objects.equals(r.getSessionUid(), row.getSessionUid())
                || !Objects.equals(r.getRunId(), row.getRunId())
                || !Objects.equals(r.getRunUid(), row.getRunUid())
                || !Objects.equals(r.getRunSessionId(), row.getSessionId())
                || !Objects.equals(r.getToolCallId(), row.getToolCallId())
                || !r.getExecutionGuard().getAsBoolean())
            throw new IllegalStateException(
                    "Exact admitted personal workspace invocation is required");
    }

    public static Map<String, Object> receipt(
            String tool, Map<String, Object> args, Map<String, Object> facts, boolean verified) {
        var out = new java.util.LinkedHashMap<String, Object>(facts);
        out.put("receiptVersion", VERSION);
        out.put("operation", tool);
        out.put("inputHash", AgentToolPayloadHasher.normalizedArgumentsHash(args));
        out.put("verified", verified);
        return out;
    }

    public static boolean matches(
            MonitorMetricLayout actual,
            MonitorMetricLayout saved,
            MonitorMetricLayoutSaveRequest request,
            String app) {
        return actual != null
                && saved != null
                && actual.equals(saved)
                && app.equals(actual.application())
                && revision(actual.revision(), false)
                && hash(document(object(actual))).equals(hash(document(object(request))));
    }
}
