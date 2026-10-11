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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.Hierarchy;
import org.apache.hertzbeat.manager.service.AppService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

/**
 * Alert-rule tools migrated into Agent Gateway.
 */
@Service
public class AgentAlertRuleToolService {

    private static final Pattern INSTANCE_CONDITION = Pattern.compile(
            "equals\\(__instance__,\\s*\"([^\"]+)\"\\)");
    private static final Pattern GROUPED_INSTANCE_CONDITION = Pattern.compile(
            "\\(\\s*equals\\(__instance__,\\s*\"[^\"]+\"\\)(?:\\s+or\\s+equals\\(__instance__,"
                    + "\\s*\"[^\"]+\"\\))*\\s*\\)");

    private final AlertDefineService alertDefineService;
    private final AppService appService;

    public AgentAlertRuleToolService(AlertDefineService alertDefineService, AppService appService) {
        this.alertDefineService = alertDefineService;
        this.appService = appService;
    }

    @Tool(name = "alert_rule.create", description = "Create an alert rule from an app, metrics name, and field condition expression.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> createAlertRule(
            @ToolParam(description = "Unique alert rule name.") String name,
            @ToolParam(description = "Application name from the metrics hierarchy.") String app,
            @ToolParam(description = "Metrics name from the metrics hierarchy.") String metrics,
            @ToolParam(description = "Field condition expression.") String fieldConditions,
            @ToolParam(required = false, description = "Rule type: realtime or periodic.") String type,
            @ToolParam(required = false, description = "Periodic execution interval in seconds.") Integer period,
            @ToolParam(required = false, description = "Consecutive violations before triggering.") Integer times,
            @ToolParam(required = false, description = "Priority: 0 critical, 1 warning, 2 info.") Integer priority,
            @ToolParam(required = false, description = "Rule description.") String description,
            @ToolParam(required = false, description = "Alert message template.") String template,
            @ToolParam(required = false, description = "Data source type.") String datasource,
            @ToolParam(required = false, description = "Alert labels as a string map.") Map<String, String> labels,
            @ToolParam(required = false, description = "Alert annotations as a string map.")
            Map<String, String> annotations,
            @ToolParam(required = false, description = "Enable the rule after creation.") Boolean enable) {
        if (name == null || name.isBlank() || name.length() > 100 || app == null || app.isBlank()
                || metrics == null || metrics.isBlank() || fieldConditions == null || fieldConditions.isBlank()) {
            throw new IllegalArgumentException(
                    "name, app, metrics, and fieldConditions are required; name must not exceed 100 characters");
        }
        String requestedType = type == null || type.isBlank() ? "realtime" : type;
        if (!"realtime".equals(requestedType) && !"periodic".equals(requestedType)) {
            throw new IllegalArgumentException("type must be realtime or periodic");
        }
        String resolvedType = "periodic".equals(requestedType)
                ? CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_PERIODIC
                : CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_REALTIME;
        int resolvedPriority = priority == null ? 1 : priority;
        if (resolvedPriority < 0 || resolvedPriority > 2) {
            throw new IllegalArgumentException("priority must be 0, 1, or 2");
        }
        // Application catalog keys are case-insensitive; canonicalize the model-provided app for hierarchy lookup.
        String resolvedApp = app.trim().toLowerCase(Locale.ROOT);
        List<Hierarchy> hierarchy = appService.getAppHierarchy(resolvedApp, "en-US");
        if (!containsValue(hierarchy, metrics.trim())) {
            throw new IllegalArgumentException("metrics does not exist in the application hierarchy: " + metrics);
        }
        Map<String, String> resolvedLabels = validatedMap(labels, "labels", 2048);
        resolvedLabels.put("severity", switch (resolvedPriority) {
            case 0 -> "critical";
            case 2 -> "info";
            default -> "warning";
        });
        resolvedLabels = validatedMap(resolvedLabels, "labels", 2048);
        Map<String, String> resolvedAnnotations = validatedMap(annotations, "annotations", 4096);
        resolvedAnnotations.putIfAbsent("summary", description == null || description.isBlank()
                ? "Alert for " + resolvedApp + " " + metrics : description);
        resolvedAnnotations.putIfAbsent("description", "Condition: " + fieldConditions);
        resolvedAnnotations = validatedMap(resolvedAnnotations, "annotations", 4096);
        Integer resolvedPeriod;
        if ("periodic".equals(requestedType)) {
            resolvedPeriod = period == null ? 300 : period;
        } else {
            resolvedPeriod = period;
        }
        if (resolvedPeriod != null && (resolvedPeriod < 10 || resolvedPeriod > 86_400)) {
            throw new IllegalArgumentException("period must be from 10 to 86400 seconds");
        }
        int resolvedTimes = times == null ? 3 : times;
        if (resolvedTimes < 1 || resolvedTimes > 100) {
            throw new IllegalArgumentException("times must be from 1 to 100");
        }
        AlertDefine alertDefine = AlertDefine.builder()
                .name(name.trim())
                .type(resolvedType)
                .expr("equals(__app__,\"" + resolvedApp + "\") && equals(__metrics__,\""
                        + metrics.trim() + "\") && " + fieldConditions.trim())
                .period(resolvedPeriod)
                .times(resolvedTimes)
                .labels(resolvedLabels)
                .annotations(resolvedAnnotations)
                .template(template == null || template.isBlank()
                        ? "Alert: " + resolvedApp + " " + metrics + " - " + fieldConditions : template)
                .datasource(datasource == null || datasource.isBlank() ? "promql" : datasource)
                .enable(enable == null || enable)
                .build();
        if (alertDefine.getExpr().length() > 2048) {
            throw new IllegalArgumentException("The generated alert expression must not exceed 2048 characters");
        }
        alertDefineService.validate(alertDefine, false);
        alertDefineService.addAlertDefine(alertDefine);
        return ruleRow(alertDefine);
    }

    @Tool(name = "alert_rule.list", description = "List alert rules with filtering and pagination.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> listAlertRules(
            @ToolParam(required = false, description = "Rule name or description search text.") String search,
            @ToolParam(required = false, description = "Monitor application type.") String monitorType,
            @ToolParam(required = false, description = "Enabled status.") Boolean enabled,
            @ToolParam(required = false, description = "Zero-based page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size.") Integer pageSize) {
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 10 : pageSize, 1, 100);
        List<String> searchTerms = search == null || search.isBlank() ? List.of() : List.of(search.trim());
        Page<AlertDefine> page = alertDefineService.getAlertDefines(null, searchTerms, monitorType, enabled,
                "gmtCreate", "desc", resolvedPageIndex, resolvedPageSize);
        return Map.of("content", page.getContent().stream().map(this::ruleRow).toList(),
                "pageIndex", page.getNumber(), "pageSize", page.getSize(),
                "totalElements", page.getTotalElements(), "totalPages", page.getTotalPages());
    }

    @Tool(name = "alert_rule.get", description = "Get complete alert-rule details.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> getAlertRule(@ToolParam(description = "Alert rule id.") Long ruleId) {
        return ruleRow(requiredRule(ruleId));
    }

    @Tool(name = "alert_rule.hierarchy", description = "Get the app, metrics, and field hierarchy used to build alert expressions.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public List<Hierarchy> getAlertRuleHierarchy(
            @ToolParam(description = "Monitor application type.") String app) {
        if (app == null || app.isBlank()) {
            throw new IllegalArgumentException("app is required");
        }
        // Application catalog keys are case-insensitive; canonicalize the model-provided app for hierarchy lookup.
        return appService.getAppHierarchy(app.trim().toLowerCase(Locale.ROOT), "en-US");
    }

    @Tool(name = "alert_rule.toggle", description = "Enable or disable an alert rule.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> toggleAlertRule(
            @ToolParam(description = "Alert rule id.") Long ruleId,
            @ToolParam(description = "Whether the rule should be enabled.") Boolean enabled) {
        if (enabled == null) {
            throw new IllegalArgumentException("enabled is required");
        }
        AlertDefine rule = requiredRule(ruleId);
        rule.setEnable(Boolean.TRUE.equals(enabled));
        alertDefineService.validate(rule, true);
        alertDefineService.modifyAlertDefine(rule);
        return ruleRow(rule);
    }

    @Tool(name = "alert_rule.update",
            description = "Update alert-rule metadata without replacing its metric expression or datasource.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> updateAlertRule(
            @ToolParam(description = "Alert rule id.") Long ruleId,
            @ToolParam(description = "Fields to update: name, period, times, template, labels, annotations, enabled.")
            Map<String, Object> updates) {
        if (updates == null || updates.isEmpty()) {
            throw new IllegalArgumentException("updates is required");
        }
        Set<String> supported = Set.of("name", "period", "times", "template", "labels", "annotations", "enabled");
        if (!supported.containsAll(updates.keySet())) {
            throw new IllegalArgumentException(
                    "alert_rule.update supports name, period, times, template, labels, annotations, and enabled");
        }
        AlertDefine rule = requiredRule(ruleId);
        applyUpdates(rule, updates);
        alertDefineService.validate(rule, true);
        alertDefineService.modifyAlertDefine(rule);
        return ruleRow(rule);
    }

    @Tool(name = "alert_rule.bind_monitors",
            description = "Replace or extend the monitor-id scope in an alert rule expression.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> bindMonitors(
            @ToolParam(description = "Alert rule id.") Long ruleId,
            @ToolParam(description = "Monitor ids; at most 100 per request.") List<Long> monitorIds,
            @ToolParam(required = false,
                    description = "Replace the existing monitor scope; defaults to true. False extends it.")
            Boolean replaceExisting) {
        if (monitorIds == null || monitorIds.isEmpty() || monitorIds.size() > 100
                || monitorIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("monitorIds must contain 1 to 100 positive ids");
        }
        Set<String> ids = monitorIds.stream().map(String::valueOf)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        AlertDefine rule = requiredRule(ruleId);
        if (Boolean.FALSE.equals(replaceExisting)) {
            Matcher existingMatcher = INSTANCE_CONDITION.matcher(rule.getExpr());
            while (existingMatcher.find()) {
                ids.add(existingMatcher.group(1));
            }
        }
        String condition = ids.stream()
                .map(id -> "equals(__instance__, \"" + id + "\")")
                .collect(Collectors.joining(" or ", ids.size() > 1 ? "(" : "", ids.size() > 1 ? ")" : ""));
        String expression = rule.getExpr();
        Matcher groupedMatcher = GROUPED_INSTANCE_CONDITION.matcher(expression);
        if (groupedMatcher.find()) {
            expression = groupedMatcher.replaceFirst(Matcher.quoteReplacement(condition));
        } else if (INSTANCE_CONDITION.matcher(expression).find()) {
            expression = INSTANCE_CONDITION.matcher(expression).replaceFirst(Matcher.quoteReplacement(condition));
        } else {
            int metricsEnd = expression.indexOf(") && ", expression.indexOf("equals(__metrics__"));
            if (metricsEnd < 0) {
                throw new IllegalArgumentException("Alert expression does not contain a supported metrics condition");
            }
            expression = expression.substring(0, metricsEnd + 5) + condition + " && "
                    + expression.substring(metricsEnd + 5);
        }
        rule.setExpr(expression);
        alertDefineService.validate(rule, true);
        alertDefineService.modifyAlertDefine(rule);
        return ruleRow(rule);
    }

    @Tool(name = "alert_rule.delete", description = "Permanently delete an exact alert rule.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteAlertRule(
            @ToolParam(description = "Alert rule id.") Long ruleId,
            @ToolParam(description = "Operator-provided deletion reason recorded with the tool invocation.")
            String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for alert_rule.delete");
        }
        AlertDefine rule = requiredRule(ruleId);
        alertDefineService.deleteAlertDefine(rule.getId());
        return Map.of("operation", "delete", "ruleId", rule.getId(), "name", rule.getName());
    }

    private AlertDefine requiredRule(Long ruleId) {
        if (ruleId == null || ruleId <= 0) {
            throw new IllegalArgumentException("ruleId must be positive");
        }
        AlertDefine rule = alertDefineService.getAlertDefine(ruleId);
        if (rule == null) {
            throw new IllegalArgumentException("Alert rule was not found: " + ruleId);
        }
        return rule;
    }

    private void applyUpdates(AlertDefine rule, Map<String, Object> updates) {
        if (updates.containsKey("name")) {
            Object name = updates.get("name");
            if (!(name instanceof String value) || value.isBlank() || value.length() > 100) {
                throw new IllegalArgumentException("name must be non-blank and at most 100 characters");
            }
            rule.setName(value);
        }
        if (updates.containsKey("period")) {
            rule.setPeriod(boundedInteger(updates.get("period"), "period", 10, 86_400));
        }
        if (updates.containsKey("times")) {
            rule.setTimes(boundedInteger(updates.get("times"), "times", 1, 100));
        }
        if (updates.containsKey("template")) {
            Object template = updates.get("template");
            if (!(template instanceof String value) || value.length() > 2048) {
                throw new IllegalArgumentException("template must be text and at most 2048 characters");
            }
            rule.setTemplate(value);
        }
        if (updates.containsKey("labels")) {
            rule.setLabels(stringMap(updates.get("labels"), "labels", 2048));
        }
        if (updates.containsKey("annotations")) {
            rule.setAnnotations(stringMap(updates.get("annotations"), "annotations", 4096));
        }
        if (updates.containsKey("enabled")) {
            Object enabled = updates.get("enabled");
            if (!(enabled instanceof Boolean value)) {
                throw new IllegalArgumentException("enabled must be boolean");
            }
            rule.setEnable(value);
        }
    }

    private int boundedInteger(Object value, String field, int minimum, int maximum) {
        if (!(value instanceof Number number) || number.intValue() < minimum || number.intValue() > maximum) {
            throw new IllegalArgumentException(field + " must be from " + minimum + " to " + maximum);
        }
        return number.intValue();
    }

    private Map<String, String> stringMap(Object value, String field, int maxLength) {
        if (!(value instanceof Map<?, ?> source)) {
            throw new IllegalArgumentException(field + " must be a string map");
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : source.entrySet()) {
            if (!(entry.getKey() instanceof String key) || key.isBlank()
                    || !(entry.getValue() instanceof String text) || text.isBlank()) {
                throw new IllegalArgumentException(field + " must contain non-blank string keys and values");
            }
            result.put(key, text);
        }
        if (JsonUtil.toJson(result).length() > maxLength) {
            throw new IllegalArgumentException(field + " must fit in " + maxLength + " characters");
        }
        return result;
    }

    private Map<String, Object> ruleRow(AlertDefine rule) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("ruleId", rule.getId());
        row.put("name", rule.getName());
        row.put("type", rule.getType());
        row.put("expression", rule.getExpr());
        row.put("period", rule.getPeriod());
        row.put("times", rule.getTimes());
        row.put("labels", rule.getLabels() == null ? Map.of() : rule.getLabels());
        row.put("annotations", rule.getAnnotations() == null ? Map.of() : rule.getAnnotations());
        row.put("template", rule.getTemplate());
        row.put("datasource", rule.getDatasource());
        row.put("enabled", rule.isEnable());
        return row;
    }

    private Map<String, String> validatedMap(Map<String, String> value, String field, int maxLength) {
        return value == null ? new LinkedHashMap<>() : stringMap(value, field, maxLength);
    }

    private boolean containsValue(List<Hierarchy> hierarchy, String value) {
        if (hierarchy == null) {
            return false;
        }
        return hierarchy.stream().anyMatch(item -> value.equals(item.getValue()) || containsValue(item.getChildren(), value));
    }
}
