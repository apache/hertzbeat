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

package org.apache.hertzbeat.ai.gateway.tool.application;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Canonical app-summary groups; undefined app types and unrelated signals are outside this source.
 */
@Service
public class AgentMonitorSummaryToolService {
    private final MonitorService monitors;

    public AgentMonitorSummaryToolService(MonitorService monitors) {
        this.monitors = monitors;
    }

    @Tool(
            name = "monitor.app_summary",
            description =
                    "Read the native /api/summary app monitoring groups, with bounded app"
                        + " pagination. Includes transitional status counts as otherSize. Native"
                        + " summary excludes monitors with undefined application types;"
                        + " reportedMonitorCount is this source's count, not an unrestricted"
                        + " platform total or health of logs/traces. offset 0..10000, limit"
                        + " 1..100.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> summary(int offset, int limit) {
        if (offset < 0 || offset > 10000 || limit < 1 || limit > 100)
            throw new IllegalArgumentException("Bounded app-summary pagination is required");
        var nativeRows = monitors.getAllAppMonitorsCount();
        if (nativeRows == null) nativeRows = List.of();
        var seen = new java.util.HashSet<String>();
        long total = 0;
        var rows = new java.util.ArrayList<Map<String, Object>>();
        for (var app : nativeRows) {
            if (app == null
                    || app.getApp() == null
                    || app.getApp().isBlank()
                    || !seen.add(app.getApp())
                    || app.getSize() < 0
                    || app.getAvailableSize() < 0
                    || app.getUnAvailableSize() < 0
                    || app.getUnManageSize() < 0)
                throw new IllegalStateException("Invalid native app summary");
            long known =
                    Math.addExact(
                            Math.addExact(app.getAvailableSize(), app.getUnAvailableSize()),
                            app.getUnManageSize());
            if (known > app.getSize())
                throw new IllegalStateException("Native app-summary counters conflict");
            total = Math.addExact(total, app.getSize());
            Map<String, Object> row =
                    new java.util.LinkedHashMap<>(
                            Map.of(
                                    "app",
                                    app.getApp(),
                                    "size",
                                    app.getSize(),
                                    "availableSize",
                                    app.getAvailableSize(),
                                    "unAvailableSize",
                                    app.getUnAvailableSize(),
                                    "unManageSize",
                                    app.getUnManageSize(),
                                    "otherSize",
                                    app.getSize() - known));
            row.put("category", app.getCategory());
            rows.add(row);
        }
        rows.sort(java.util.Comparator.comparing(row -> row.get("app").toString()));
        int from = Math.min(offset, rows.size());
        int end = Math.min(from + limit, rows.size());
        return Map.of(
                "source",
                "native-defined-app-summary",
                "apps",
                List.copyOf(rows.subList(from, end)),
                "offset",
                offset,
                "limit",
                limit,
                "totalAppGroups",
                rows.size(),
                "hasMore",
                end < rows.size(),
                "reportedMonitorCount",
                total,
                "undefinedAppTypesIncluded",
                false);
    }
}
