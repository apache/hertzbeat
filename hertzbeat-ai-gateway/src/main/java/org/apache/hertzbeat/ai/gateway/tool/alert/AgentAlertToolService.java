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

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolArguments;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

/**
 * Alert namespace tools.
 */
@Service
public class AgentAlertToolService {

    private static final Set<String> ALERT_STATUSES = Set.of("firing", "resolved");
    private static final Set<String> ALERT_SORT_FIELDS = Set.of("id", "status", "gmtCreate", "gmtUpdate");
    private static final int MAX_ALERT_TEXT_LENGTH = 2048;

    private final AlertService alertService;

    public AgentAlertToolService(AlertService alertService) {
        this.alertService = alertService;
    }

    @Tool(name = "alert.query",
        description = "Query individual alerts, grouped alerts, or both with filtering and pagination.")
    @AgentToolPolicy
    public Map<String, Object> alertQuery(
        @ToolParam(required = false, description = "Alert type: single, group, or both; default single.")
        String alertType,
        @ToolParam(required = false, description = "Alert status filter, default all.")
        String status,
        @ToolParam(required = false, description = "Search text.")
        String search,
        @ToolParam(required = false, description = "Sort field: id, status, gmtCreate, or gmtUpdate; default gmtUpdate.")
        String sort,
        @ToolParam(required = false, description = "Sort order, default desc.")
        String order,
        @ToolParam(required = false, description = "Zero-based page index, default 0.")
        Integer pageIndex,
        @ToolParam(required = false, description = "Page size, bounded to 1..50, default 10.")
        Integer pageSize) {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        String resolvedAlertType = AgentToolArguments.firstNonBlank(alertType, "single").toLowerCase(Locale.ROOT);
        // Model-generated enum values can vary in case; canonicalize before the fixed branch comparison.
        return switch (resolvedAlertType) {
            case "single" -> Map.of("alertType", "single", "result",
                    querySingleAlerts(workspaceId, status, search, sort, order, pageIndex, pageSize));
            case "group" -> Map.of("alertType", "group", "result",
                    queryGroupAlerts(workspaceId, status, search, sort, order, pageIndex, pageSize));
            case "both" -> Map.of("alertType", "both",
                    "single", querySingleAlerts(workspaceId, status, search, sort, order, pageIndex, pageSize),
                    "group", queryGroupAlerts(workspaceId, status, search, sort, order, pageIndex, pageSize));
            default -> throw new IllegalArgumentException("alertType must be single, group, or both");
        };
    }

    @Tool(name = "alert.summary",
        description = "Get total, handled, and priority alert statistics.")
    @AgentToolPolicy
    public AlertSummary alertSummary() {
        return alertService.getAlertsSummary(AuthTokenRequestContext.currentWorkspaceId());
    }

    @Tool(name = "alert.get",
        description = "Get alert details.")
    @AgentToolPolicy
    public Map<String, Object> alertGet(
        @ToolParam(description = "Alert id.")
        Long alertId,
        @ToolParam(required = false, description = "Exact alert type: single or group; omitted checks both.")
        String alertType) {
        Long resolvedAlertId = alertId;
        if (resolvedAlertId == null) {
            throw new IllegalArgumentException("alert.get requires alertId");
        }
        String resolvedAlertType = AgentToolArguments.firstNonBlank(alertType);
        if (resolvedAlertType != null) {
            resolvedAlertType = resolvedAlertType.toLowerCase(Locale.ROOT);
            if (!"single".equals(resolvedAlertType) && !"group".equals(resolvedAlertType)) {
                throw new IllegalArgumentException("alertType must be single or group");
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("alertId", resolvedAlertId);
        if (resolvedAlertType != null) {
            result.put("alertType", resolvedAlertType);
        }
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!"group".equals(resolvedAlertType)) {
            alertService.findSingleAlert(workspaceId, resolvedAlertId)
                    .ifPresent(alert -> result.put("single", singleAlertRow(alert)));
        }
        if (!"single".equals(resolvedAlertType)) {
            alertService.findGroupAlert(workspaceId, resolvedAlertId)
                    .ifPresent(alert -> result.put("group", groupAlertRow(alert)));
        }
        if (!result.containsKey("single") && !result.containsKey("group")) {
            throw new IllegalArgumentException("Alert not found: " + resolvedAlertId);
        }
        return result;
    }

    /** Internal compatibility path for callers that intentionally request either persisted alert shape. */
    public Map<String, Object> alertGet(Long alertId) {
        return alertGet(alertId, null);
    }

    @Tool(name = "alert.similar",
        description = "Get similar recent alerts.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> alertSimilar(
        @ToolParam(description = "Baseline alert id.") Long alertId,
        @ToolParam(required = false, description = "Baseline alert type: single or group; default single.")
        String alertType,
        @ToolParam(required = false, description = "Maximum similar alerts, bounded to 1..20; default 10.")
        Integer limit) {
        if (alertId == null) {
            throw new IllegalArgumentException("alert.similar requires alertId");
        }
        String resolvedType = AgentToolArguments.firstNonBlank(alertType, "single").toLowerCase(Locale.ROOT);
        int resolvedLimit = AgentToolContextSupport.bound(limit == null ? 10 : limit, 1, 20);
        return switch (resolvedType) {
            case "single" -> similarSingleAlerts(AuthTokenRequestContext.currentWorkspaceId(), alertId, resolvedLimit);
            case "group" -> similarGroupAlerts(AuthTokenRequestContext.currentWorkspaceId(), alertId, resolvedLimit);
            default -> throw new IllegalArgumentException("alertType must be single or group");
        };
    }

    @Tool(name = "alert.resolve", description = "Mark exact single or grouped alerts as resolved.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> resolveAlerts(
            @ToolParam(description = "Alert type: single or group.") String alertType,
            @ToolParam(description = "Alert ids; at most 100 per request.") List<Long> alertIds,
            @ToolParam(description = "Operator-provided resolution reason recorded with the tool invocation.")
            String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for alert.resolve");
        }
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        Set<Long> ids = alertIds(workspaceId, alertType, alertIds);
        if ("single".equals(alertType)) {
            alertService.editSingleAlertStatus(workspaceId, "resolved", List.copyOf(ids));
        } else {
            alertService.editGroupAlertStatus(workspaceId, "resolved", List.copyOf(ids));
        }
        return operationResult("resolve", alertType, ids);
    }

    @Tool(name = "alert.delete", description = "Permanently delete exact single or grouped alerts.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteAlerts(
            @ToolParam(description = "Alert type: single or group.") String alertType,
            @ToolParam(description = "Alert ids; at most 100 per request.") List<Long> alertIds,
            @ToolParam(description = "Operator-provided deletion reason recorded with the tool invocation.")
            String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for alert.delete");
        }
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        Set<Long> ids = alertIds(workspaceId, alertType, alertIds);
        if ("single".equals(alertType)) {
            alertService.deleteSingleAlerts(workspaceId, new HashSet<>(ids));
        } else {
            alertService.deleteGroupAlerts(workspaceId, new HashSet<>(ids));
        }
        return operationResult("delete", alertType, ids);
    }

    private Map<String, Object> querySingleAlerts(String workspaceId, String status, String search,
                                                  String sort, String order,
                                                  Integer pageIndex, Integer pageSize) {
        Page<SingleAlert> page = alertService.getSingleAlerts(workspaceId, resolvedStatus(status),
                AgentToolArguments.firstNonBlank(search), resolvedSort(sort), resolvedOrder(order),
                resolvedPageIndex(pageIndex), resolvedPageSize(pageSize));
        return pageResult(page, this::singleAlertRow);
    }

    private Map<String, Object> queryGroupAlerts(String workspaceId, String status, String search,
                                                 String sort, String order,
                                                 Integer pageIndex, Integer pageSize) {
        Page<GroupAlert> page = alertService.getGroupAlerts(workspaceId, resolvedStatus(status),
                AgentToolArguments.firstNonBlank(search), null, null, null, null,
                resolvedSort(sort), resolvedOrder(order),
                resolvedPageIndex(pageIndex), resolvedPageSize(pageSize));
        return pageResult(page, this::groupAlertRow);
    }

    private String resolvedStatus(String status) {
        String resolved = AgentToolArguments.firstNonBlank(status);
        if (resolved == null || "all".equalsIgnoreCase(resolved)) {
            return null;
        }
        String normalized = resolved.toLowerCase(Locale.ROOT);
        if (!ALERT_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be firing, resolved, or all");
        }
        return normalized;
    }

    private String resolvedSort(String sort) {
        String resolved = AgentToolArguments.firstNonBlank(sort, "gmtUpdate");
        if (!ALERT_SORT_FIELDS.contains(resolved)) {
            throw new IllegalArgumentException("sort must be id, status, gmtCreate, or gmtUpdate");
        }
        return resolved;
    }

    private String resolvedOrder(String order) {
        String resolved = AgentToolArguments.firstNonBlank(order, "desc").toLowerCase(Locale.ROOT);
        if (!"asc".equals(resolved) && !"desc".equals(resolved)) {
            throw new IllegalArgumentException("order must be asc or desc");
        }
        return resolved;
    }

    private int resolvedPageIndex(Integer pageIndex) {
        return AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE);
    }

    private int resolvedPageSize(Integer pageSize) {
        return AgentToolContextSupport.bound(pageSize == null ? 10 : pageSize, 1, 50);
    }

    private <T> Map<String, Object> pageResult(Page<T> page, Function<T, Map<String, Object>> rowMapper) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getContent().stream().map(rowMapper).toList());
        result.put("pageIndex", page.getNumber());
        result.put("pageSize", page.getSize());
        result.put("totalElements", page.getTotalElements());
        result.put("totalPages", page.getTotalPages());
        return result;
    }

    private Map<String, Object> similarSingleAlerts(String workspaceId, long alertId, int limit) {
        SingleAlert baseline = alertService.findSingleAlert(workspaceId, alertId)
                .orElseThrow(() -> new IllegalArgumentException("Single alert not found: " + alertId));
        String matchValue = similarityValue(baseline.getLabels(), baseline.getContent());
        List<Map<String, Object>> content = alertService.getSingleAlerts(workspaceId, null, matchValue,
                        "gmtUpdate", "desc", 0, limit + 1).getContent().stream()
                .filter(alert -> !Long.valueOf(alertId).equals(alert.getId()))
                .limit(limit)
                .map(this::singleAlertRow)
                .toList();
        return Map.of("alertType", "single", "alertId", alertId,
                "matchValue", matchValue, "content", content, "returnedCount", content.size());
    }

    private Map<String, Object> similarGroupAlerts(String workspaceId, long alertId, int limit) {
        GroupAlert baseline = alertService.findGroupAlert(workspaceId, alertId)
                .orElseThrow(() -> new IllegalArgumentException("Group alert not found: " + alertId));
        String matchValue = similarityValue(baseline.getCommonLabels(), baseline.getGroupKey());
        List<Map<String, Object>> content = alertService.getGroupAlerts(workspaceId, null, matchValue,
                        null, null, null, null, "gmtUpdate", "desc", 0, limit + 1).getContent().stream()
                .filter(alert -> !Long.valueOf(alertId).equals(alert.getId()))
                .limit(limit)
                .map(this::groupAlertRow)
                .toList();
        return Map.of("alertType", "group", "alertId", alertId,
                "matchValue", matchValue, "content", content, "returnedCount", content.size());
    }

    private Set<Long> alertIds(String workspaceId, String alertType, List<Long> alertIds) {
        if (!"single".equals(alertType) && !"group".equals(alertType)) {
            throw new IllegalArgumentException("alertType must be single or group");
        }
        if (alertIds == null || alertIds.isEmpty() || alertIds.size() > 100
                || alertIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("alertIds must contain 1 to 100 positive ids");
        }
        LinkedHashSet<Long> ids = new LinkedHashSet<>(alertIds);
        List<Long> missingIds = ids.stream()
                .filter(id -> "single".equals(alertType)
                        ? alertService.findSingleAlert(workspaceId, id).isEmpty()
                        : alertService.findGroupAlert(workspaceId, id).isEmpty())
                .toList();
        if (!missingIds.isEmpty()) {
            throw new IllegalArgumentException("Alerts were not found: " + missingIds);
        }
        return ids;
    }

    private Map<String, Object> operationResult(String operation, String alertType, Set<Long> alertIds) {
        return Map.of("operation", operation, "alertType", alertType, "alertIds", List.copyOf(alertIds),
                "affectedCount", alertIds.size());
    }

    private String similarityValue(Map<String, String> labels, String fallback) {
        if (labels != null) {
            String value = AgentToolArguments.firstNonBlank(labels.get("alertname"), labels.get("instance"),
                    labels.get("app"), labels.get("metrics"));
            if (value != null) {
                return value;
            }
        }
        String value = AgentToolArguments.firstNonBlank(fallback);
        if (value == null) {
            throw new IllegalArgumentException("Alert does not contain a usable similarity key");
        }
        return value.substring(0, Math.min(value.length(), 128));
    }

    private Map<String, Object> singleAlertRow(SingleAlert alert) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", alert.getId());
        row.put("fingerprint", alert.getFingerprint());
        row.put("status", alert.getStatus());
        row.put("content", boundedText(alert.getContent()));
        row.put("triggerTimes", alert.getTriggerTimes());
        row.put("startAt", alert.getStartAt());
        row.put("activeAt", alert.getActiveAt());
        row.put("endAt", alert.getEndAt());
        row.put("labels", alert.getLabels() == null ? Map.of() : alert.getLabels());
        row.put("annotations", alert.getAnnotations() == null ? Map.of() : alert.getAnnotations());
        return row;
    }

    private Map<String, Object> groupAlertRow(GroupAlert alert) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", alert.getId());
        row.put("status", alert.getStatus());
        row.put("groupKey", alert.getGroupKey());
        row.put("groupLabels", alert.getGroupLabels() == null ? Map.of() : alert.getGroupLabels());
        row.put("commonLabels", alert.getCommonLabels() == null ? Map.of() : alert.getCommonLabels());
        row.put("commonAnnotations", alert.getCommonAnnotations() == null ? Map.of() : alert.getCommonAnnotations());
        row.put("alertCount", alert.getAlertFingerprints() == null ? 0 : alert.getAlertFingerprints().size());
        row.put("gmtCreate", alert.getGmtCreate());
        row.put("gmtUpdate", alert.getGmtUpdate());
        return row;
    }

    private String boundedText(String text) {
        if (text == null || text.length() <= MAX_ALERT_TEXT_LENGTH) {
            return text;
        }
        return text.substring(0, MAX_ALERT_TEXT_LENGTH);
    }
}
