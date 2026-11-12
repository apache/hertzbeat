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

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Explicit shared-asset, receiver and public-status metadata shapes; never delivery or signal
 * health.
 */
final class AgentSharedConfigurationReadSemantics {
    private static final Set<String> TOOLS =
            Set.of(
                    "notice.receiver_get",
                    "notice.receiver_list",
                    "dashboard.list_signal_dashboards",
                    "saved_query.list_signal_saved_views",
                    "bulletin.get",
                    "bulletin.list",
                    "status_page.organization.get",
                    "status_page.component.get",
                    "status_page.component.list",
                    "status_page.incident.get",
                    "status_page.incident.list");
    private static final Set<String> SECRETS =
            Set.of(
                    "hookUrl",
                    "hookAuthToken",
                    "wechatId",
                    "accessToken",
                    "tgBotToken",
                    "slackWebHookUrl",
                    "appSecret",
                    "discordBotToken",
                    "smnAk",
                    "smnSk",
                    "serverChanToken",
                    "gotifyToken",
                    "ntfyToken",
                    "wpushToken");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> output) {
        if (call == null || !supports(call.getToolName()) || output == null) return null;
        try {
            String tool = call.getToolName();
            var args = call.getArguments();
            if (tool.startsWith("dashboard.") || tool.startsWith("saved_query."))
                return assets(tool, args, output);
            boolean receiver = tool.startsWith("notice.");
            Map<?, ?> data = output;
            if (!receiver) {
                if (!Boolean.FALSE.equals(output.get("partial"))
                        || !Boolean.TRUE.equals(output.get("redactionApplied"))) return null;
                if (output.get("data") == null && tool.equals("status_page.organization.get"))
                    return observation(0);
                if (!(output.get("data") instanceof Map<?, ?> view)) return null;
                data = view;
            }
            if (data.containsKey("error") || Boolean.TRUE.equals(data.get("partial"))) return null;
            if (tool.endsWith(".get") || tool.endsWith("_get")) {
                if (!row(tool, data)) return null;
                String argument =
                        receiver
                                ? "id"
                                : tool.startsWith("bulletin")
                                        ? "bulletinId"
                                        : tool.contains("component") ? "componentId" : "incidentId";
                return tool.equals("status_page.organization.get")
                                || id(data.get("id")) == id(args.get(argument))
                        ? observation(1)
                        : null;
            }
            long page = number(args.getOrDefault(receiver ? "page" : "pageIndex", 0));
            long size = number(args.getOrDefault(receiver ? "size" : "pageSize", 20));
            long total = number(data.get("totalElements"));
            if (page < 0
                    || page > Integer.MAX_VALUE
                    || size < 1
                    || size > 100
                    || total < 0
                    || total > Integer.MAX_VALUE
                    || number(data.get(receiver ? "number" : "pageIndex")) != page
                    || number(data.get(receiver ? "size" : "pageSize")) != size
                    || !(data.get("content") instanceof List<?> rows)
                    || rows.size() != Math.min(size, Math.max(0, total - page * size))) return null;
            if (tool.equals("status_page.component.list")) {
                if (!Boolean.valueOf((page + 1) * size < total).equals(output.get("hasMore")))
                    return null;
            } else if (number(data.get("totalPages"))
                    != (total == 0 ? 0 : (total + size - 1) / size)) return null;
            Set<Long> seen = new HashSet<>();
            for (Object v : rows)
                if (!(v instanceof Map<?, ?> item)
                        || !row(tool, item)
                        || !seen.add(id(item.get("id")))) return null;
            return observation(rows.size());
        } catch (IllegalArgumentException | ArithmeticException | NullPointerException invalid) {
            return null;
        }
    }

    private AgentReadObservationClassifier.Observation assets(
            String tool, Map<String, Object> args, Map<String, Object> output) {
        long offset = number(args.getOrDefault("offset", 0));
        long limit = number(args.getOrDefault("limit", 5));
        if (offset < 0
                || offset > 10000
                || limit < 1
                || limit > 10
                || !"shared".equals(output.get("scope"))
                || number(output.get("offset")) != offset
                || number(output.get("limit")) != limit
                || !(output.get("hasMore") instanceof Boolean more)
                || !(output.get("items") instanceof List<?> rows)
                || rows.size() > limit
                || more && rows.size() != limit
                || Boolean.TRUE.equals(output.get("partial"))) return null;
        boolean saved = tool.startsWith("saved_query");
        Set<String> seen = new HashSet<>();
        if (saved && !Set.of("logs", "traces", "metrics").contains(args.get("signal"))) return null;
        for (Object v : rows) {
            if (!(v instanceof Map<?, ?> item)
                    || !(item.get(saved ? "viewKey" : "dashboardKey") instanceof String key)
                    || !key.matches("[A-Za-z0-9_.:-]{1,128}")
                    || !seen.add(key)
                    || !(item.get(saved ? "label" : "title") instanceof String title)
                    || title.isBlank()
                    || item.get("revision") != null && number(item.get("revision")) < 0
                    || saved && !args.get("signal").equals(item.get("signal"))) return null;
        }
        return observation(rows.size());
    }

    private boolean row(String tool, Map<?, ?> value) {
        id(value.get("id"));
        if (!(value.get("name") instanceof String name) || name.isBlank() || name.length() > 256)
            return false;
        if (tool.startsWith("notice.")) return receiver(value);
        if (tool.startsWith("bulletin."))
            return value.get("app") instanceof String app
                    && !app.isBlank()
                    && value.get("monitorIds") instanceof List<?> ids
                    && ids.size() <= 100
                    && ids.stream().allMatch(v -> id(v) > 0)
                    && value.get("fields") instanceof Map<?, ?>;
        long state = number(value.get("state"));
        if (state < 0 || state > (tool.contains("incident") ? 3 : 2)) return false;
        if (tool.contains("component"))
            return id(value.get("orgId")) > 0
                    && number(value.get("method")) >= 0
                    && number(value.get("method")) <= 1
                    && number(value.get("configState")) >= 0
                    && number(value.get("configState")) <= 2;
        if (tool.contains("incident"))
            return id(value.get("orgId")) > 0
                    && number(value.get("contentCount")) >= 0
                    && number(value.get("componentCount")) >= 0;
        return true;
    }

    static boolean receiver(Map<?, ?> value) {
        if (!(value.get("id") instanceof Number)
                || !(value.get("name") instanceof String name)
                || name.isBlank()
                || !(value.get("type") instanceof Number type)
                || !(value.get("typeKey") instanceof String key)
                || key.isBlank()
                || !(value.get("options") instanceof Map<?, ?> options)
                || !(value.get("configuredSecrets") instanceof List<?> configured)
                || configured.size() > SECRETS.size()
                || !configured.stream().allMatch(SECRETS::contains)) return false;
        int n = new BigDecimal(type.toString()).intValueExact();
        if (n < 0 || n > 16) return false;
        for (String field : SECRETS) {
            Object secret = options.get(field);
            if (secret != null && !"[REDACTED]".equals(secret)) return false;
        }
        return true;
    }

    private static long number(Object value) {
        if (!(value instanceof Number)) throw new IllegalArgumentException();
        return new BigDecimal(value.toString()).longValueExact();
    }

    private static long id(Object value) {
        long n = number(value);
        if (n <= 0) throw new IllegalArgumentException();
        return n;
    }

    private AgentReadObservationClassifier.Observation observation(int count) {
        return new AgentReadObservationClassifier.Observation(
                "shared-configuration-metadata-rows", count);
    }
}
