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

package org.apache.hertzbeat.ai.sop.executor;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.sop.model.SopStep;
import org.apache.hertzbeat.ai.tools.AlertDefineTools;
import org.apache.hertzbeat.ai.tools.AlertTools;
import org.apache.hertzbeat.ai.tools.MetricsTools;
import org.apache.hertzbeat.ai.tools.MonitorTools;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Executor for 'tool' type steps.
 * Calls existing MCP tools registered in the system.
 */
@Slf4j
@Component
public class ToolExecutor implements SopExecutor {

    private final MonitorTools monitorTools;
    private final AlertTools alertTools;
    private final AlertDefineTools alertDefineTools;
    private final MetricsTools metricsTools;

    @Autowired
    public ToolExecutor(MonitorTools monitorTools, AlertTools alertTools,
                        AlertDefineTools alertDefineTools, MetricsTools metricsTools) {
        this.monitorTools = monitorTools;
        this.alertTools = alertTools;
        this.alertDefineTools = alertDefineTools;
        this.metricsTools = metricsTools;
    }

    @Override
    public boolean support(String type) {
        return "tool".equalsIgnoreCase(type);
    }

    @Override
    public Object execute(SopStep step, Map<String, Object> context) {
        String toolName = step.getTool();
        log.info("Executing tool step: {}", toolName);

        Map<String, Object> args = resolveArgs(step.getArgs(), context);

        try {
            String result = invokeTool(toolName, args);
            log.debug("Tool {} returned result length: {}", toolName, result.length());
            return result;
        } catch (Exception e) {
            log.error("Failed to execute tool {}: {}", toolName, e.getMessage());
            throw new RuntimeException("Tool execution failed: " + toolName, e);
        }
    }

    private String invokeTool(String toolName, Map<String, Object> args) {
        switch (toolName) {
            // MonitorTools
            case "queryMonitors":
                return monitorTools.queryMonitors(
                        getListArg(args, "ids"),
                        getStringArg(args, "app"),
                        getByteArg(args, "status"),
                        getStringArg(args, "search"),
                        getStringArg(args, "labels"),
                        getStringArg(args, "sort"),
                        getStringArg(args, "order"),
                        getIntArg(args, "pageIndex"),
                        getIntArg(args, "pageSize"),
                        getBoolArg(args, "includeStats")
                );
            case "listMonitorTypes":
                return monitorTools.listMonitorTypes(getStringArg(args, "language"));
            case "getMonitorParams":
                return monitorTools.getMonitorParams(getStringArg(args, "app"));
            case "addMonitor":
                return monitorTools.addMonitor(
                        getStringArg(args, "name"),
                        getStringArg(args, "app"),
                        getIntArg(args, "intervals"),
                        getStringArg(args, "params"),
                        getStringArg(args, "description")
                );

            // AlertTools
            case "queryAlerts":
                return alertTools.queryAlerts(
                        getStringArg(args, "alertType"),
                        getStringArg(args, "status"),
                        getStringArg(args, "search"),
                        getStringArg(args, "sort"),
                        getStringArg(args, "order"),
                        getIntArg(args, "pageIndex"),
                        getIntArg(args, "pageSize")
                );
            case "getAlertsSummary":
                return alertTools.getAlertsSummary();

            // MetricsTools
            case "getRealtimeMetrics":
                return metricsTools.getRealtimeMetrics(
                        getLongArg(args, "monitorId"),
                        getStringArg(args, "metrics")
                );
            case "getHistoricalMetrics":
                return metricsTools.getHistoricalMetrics(
                        getStringArg(args, "instance"),
                        getStringArg(args, "app"),
                        getStringArg(args, "metrics"),
                        getStringArg(args, "metric"),
                        getStringArg(args, "label"),
                        getStringArg(args, "history"),
                        getBoolArg(args, "interval")
                );
            case "getWarehouseStatus":
                return metricsTools.getWarehouseStatus();

            // AlertDefineTools
            case "listAlertRules":
                return alertDefineTools.listAlertRules(
                        getStringArg(args, "search"),
                        getStringArg(args, "monitorType"),
                        getBoolArg(args, "enabled"),
                        getIntArg(args, "pageIndex"),
                        getIntArg(args, "pageSize")
                );
            case "getAlertRuleDetails":
                return alertDefineTools.getAlertRuleDetails(getLongArg(args, "ruleId"));
            case "toggleAlertRule":
                return alertDefineTools.toggleAlertRule(
                        getLongArg(args, "ruleId"),
                        getBoolArg(args, "enabled")
                );
            case "getAppsMetricsHierarchy":
                return alertDefineTools.getAppsMetricsHierarchy(getStringArg(args, "app"));

            default:
                throw new IllegalArgumentException("Unknown tool: " + toolName);
        }
    }

    private Map<String, Object> resolveArgs(Map<String, Object> args, Map<String, Object> context) {
        if (args == null) {
            return new HashMap<>();
        }

        Map<String, Object> resolved = new HashMap<>();
        for (Map.Entry<String, Object> entry : args.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof String) {
                String strValue = (String) value;
                for (Map.Entry<String, Object> ctxEntry : context.entrySet()) {
                    String placeholder = "${" + ctxEntry.getKey() + "}";
                    if (strValue.contains(placeholder)) {
                        strValue = strValue.replace(placeholder, String.valueOf(ctxEntry.getValue()));
                    }
                }
                resolved.put(entry.getKey(), strValue);
            } else {
                resolved.put(entry.getKey(), value);
            }
        }
        return resolved;
    }

    // Helper methods for argument extraction
    private String getStringArg(Map<String, Object> args, String key) {
        Object value = args.get(key);
        return value != null ? String.valueOf(value) : null;
    }

    private Integer getIntArg(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.valueOf(String.valueOf(value));
    }

    private Long getLongArg(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return Long.valueOf(String.valueOf(value));
    }

    private Byte getByteArg(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).byteValue();
        }
        return Byte.valueOf(String.valueOf(value));
    }

    private Boolean getBoolArg(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return Boolean.valueOf(String.valueOf(value));
    }

    @SuppressWarnings("unchecked")
    private List<Long> getListArg(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof List) {
            return (List<Long>) value;
        }
        // Parse comma-separated string
        String str = String.valueOf(value);
        if (str.isEmpty()) {
            return new ArrayList<>();
        }
        List<Long> result = new ArrayList<>();
        for (String s : str.split(",")) {
            result.add(Long.valueOf(s.trim()));
        }
        return result;
    }
}
