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

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolArguments;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

/**
 * Monitor namespace tools.
 */
@Service
public class AgentMonitorToolService {

    private static final Set<String> MONITOR_SORT_FIELDS = Set.of(
            "id", "name", "app", "status", "gmtCreate", "gmtUpdate");

    private final MonitorService monitorService;
    private final AppService appService;
    private final CollectorMonitorBindDao collectorMonitorBindDao;

    public AgentMonitorToolService(MonitorService monitorService, AppService appService,
                                   CollectorMonitorBindDao collectorMonitorBindDao) {
        this.monitorService = monitorService;
        this.appService = appService;
        this.collectorMonitorBindDao = collectorMonitorBindDao;
    }

    @Tool(name = "monitor.get",
        description = "Get monitor summary, collector binding, and safe parameter presence.")
    @AgentToolPolicy
    public Map<String, Object> monitorGet(
        @ToolParam(description = "Monitor id.")
        Long monitorId) {
        if (monitorId == null) {
            throw new IllegalArgumentException("monitor.get requires monitorId");
        }
        MonitorDto monitorDto = monitorService.getMonitorDto(monitorId);
        if (monitorDto == null || monitorDto.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor not found: " + monitorId);
        }
        Monitor monitor = monitorDto.getMonitor();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monitorId", monitorId);
        result.put("name", monitor.getName());
        result.put("app", monitor.getApp());
        result.put("instance", monitor.getInstance());
        result.put("status", monitorStatus(monitor.getStatus()));
        result.put("labels", monitor.getLabels() == null ? Map.of() : monitor.getLabels());
        result.put("annotations", monitor.getAnnotations() == null ? Map.of() : monitor.getAnnotations());
        result.put("collector", collectorBinding(monitorId));
        result.put("credentialPresent", credentialPresent(monitorDto.getParams()));
        return result;
    }

    @Tool(name = "monitor.params",
        description = "Get safe monitor parameter definition and value-presence summary.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorParams(
        @ToolParam(description = "Monitor id.")
        Long monitorId,
        @ToolParam(required = false, description = "Application type. Omit to infer it from the monitor.")
        String app) {
        Long resolvedMonitorId = monitorId;
        if (resolvedMonitorId == null) {
            throw new IllegalArgumentException("monitor.params requires monitorId");
        }
        MonitorDto monitorDto = monitorService.getMonitorDto(resolvedMonitorId);
        if (monitorDto == null || monitorDto.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor not found: " + resolvedMonitorId);
        }
        Monitor monitor = monitorDto.getMonitor();
        String resolvedApp = AgentToolArguments.firstNonBlank(app,
            monitor == null ? null : monitor.getApp());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monitorId", resolvedMonitorId);
        result.put("app", resolvedApp);
        result.put("credentialPresent", credentialPresent(monitorDto.getParams()));
        List<ParamDefineInfo> definitions = List.of();
        if (resolvedApp != null) {
            // Application catalog keys are case-insensitive; canonicalize model-provided app names for lookup.
            definitions = appService.getAppParamDefines(resolvedApp.toLowerCase(Locale.ROOT));
        }
        result.put("paramDefinitions", definitions == null ? List.of() : definitions);
        Map<String, Boolean> valuePresence = new LinkedHashMap<>();
        if (monitorDto.getParams() != null) {
            monitorDto.getParams().forEach(param -> valuePresence.put(param.getField(),
                    param.getParamValue() != null && !param.getParamValue().isBlank()));
        }
        result.put("valuePresence", valuePresence);
        return result;
    }

    @Tool(name = "monitor.collector_binding",
        description = "Get collector binding for a monitor.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorCollectorBinding(
        @ToolParam(description = "Monitor id.")
        Long monitorId) {
        if (monitorId == null) {
            throw new IllegalArgumentException("monitor.collector_binding requires monitorId");
        }
        String collector = collectorBinding(monitorId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monitorId", monitorId);
        result.put("collector", collector);
        result.put("bound", collector != null);
        return result;
    }

    @Tool(name = "monitor.query", description = "Query monitors with filters, pagination, and optional status statistics.")
    @AgentToolPolicy
    public Map<String, Object> queryMonitors(
            @ToolParam(required = false, description = "Monitor ids.") List<Long> ids,
            @ToolParam(required = false, description = "Monitor application type.") String app,
            @ToolParam(required = false, description = "Status: paused, up, down, or all; default all.") String status,
            @ToolParam(required = false, description = "Monitor name or host search text.") String search,
            @ToolParam(required = false, description = "Comma-separated key:value label filters.") String labels,
            @ToolParam(required = false, description = "Sort field.") String sort,
            @ToolParam(required = false, description = "Sort order: asc or desc.") String order,
            @ToolParam(required = false, description = "Zero-based page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size.") Integer pageSize,
            @ToolParam(required = false, description = "Include monitor status statistics.") Boolean includeStats) {
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        String resolvedSort = sort == null || sort.isBlank() ? "gmtCreate" : sort;
        if (!MONITOR_SORT_FIELDS.contains(resolvedSort)) {
            throw new IllegalArgumentException("sort must be id, name, app, status, gmtCreate, or gmtUpdate");
        }
        String resolvedOrder = order == null || order.isBlank() ? "desc" : order.toLowerCase(Locale.ROOT);
        if (!"asc".equals(resolvedOrder) && !"desc".equals(resolvedOrder)) {
            throw new IllegalArgumentException("order must be asc or desc");
        }
        Page<Monitor> page = monitorService.getMonitors(ids, app, search, monitorStatus(status), resolvedSort,
                resolvedOrder,
                resolvedPageIndex, resolvedPageSize, labels);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getContent().stream().map(this::monitorRow).toList());
        result.put("pageIndex", page.getNumber());
        result.put("pageSize", page.getSize());
        result.put("totalElements", page.getTotalElements());
        result.put("totalPages", page.getTotalPages());
        if (Boolean.TRUE.equals(includeStats)) {
            result.put("status", statusCounts(app, search, labels));
        }
        return result;
    }

    @Tool(name = "monitor.create", description = "Create a HertzBeat monitor from an application type and parameters.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> createMonitor(
            @ToolParam(description = "Unique monitor name.") String name,
            @ToolParam(description = "Monitor application type, such as linux, mysql, or website.") String app,
            @ToolParam(required = false, description = "Collection interval in seconds.") Integer intervals,
            @ToolParam(description = "Monitor parameters keyed by parameter field.") Map<String, Object> params,
            @ToolParam(required = false, description = "Monitor description.") String description,
            @ToolParam(required = false, description = "Business labels attached to collected metrics and alerts.")
            Map<String, String> labels,
            @ToolParam(required = false, description = "Reference returned by interaction.request_input.") String inputRef) {
        if (name == null || name.isBlank() || name.length() > 100 || app == null || app.isBlank()
                || app.length() > 100 || params == null || params.isEmpty() || params.size() > 100) {
            throw new IllegalArgumentException(
                    "name, app, and 1 to 100 params are required; name and app must not exceed 100 characters");
        }
        if (description != null && description.length() > 255) {
            throw new IllegalArgumentException("description must not exceed 255 characters");
        }
        // Application catalog keys are case-insensitive; canonicalize the model-provided app for lookup and storage.
        String resolvedApp = app.trim().toLowerCase(Locale.ROOT);
        List<ParamDefineInfo> definitions = appService.getAppParamDefines(resolvedApp);
        Map<String, ParamDefineInfo> definitionsByField = definitions.stream()
                .collect(java.util.stream.Collectors.toMap(ParamDefineInfo::getField, definition -> definition));
        if (!definitionsByField.keySet().containsAll(params.keySet())) {
            Set<String> unknownFields = new LinkedHashSet<>(params.keySet());
            unknownFields.removeAll(definitionsByField.keySet());
            throw new IllegalArgumentException("Unknown monitor parameter fields: " + unknownFields);
        }
        Map<String, Object> resolvedParams = new LinkedHashMap<>(params);
        for (ParamDefineInfo definition : definitions) {
            // The application catalog uses null to mean no default; this boundary materializes declared defaults.
            if (!resolvedParams.containsKey(definition.getField()) && definition.getDefaultValue() != null) {
                resolvedParams.put(definition.getField(), definition.getDefaultValue());
            }
        }
        List<Param> monitorParams = resolvedParams.entrySet().stream()
                .map(entry -> Param.builder()
                        .field(entry.getKey())
                        .paramValue(paramValue(entry.getValue()))
                        .type(paramType(definitionsByField.get(entry.getKey())))
                        .build())
                .toList();
        String host = paramValue(resolvedParams.get("host"));
        String port = paramValue(resolvedParams.get("port"));
        String instance = host == null ? "" : port == null || port.isBlank() ? host.trim() : host.trim() + ":" + port;
        if (instance.length() > 100) {
            throw new IllegalArgumentException("The derived monitor instance must not exceed 100 characters");
        }
        Monitor monitor = Monitor.builder()
                .name(name.trim())
                .app(resolvedApp)
                .instance(instance)
                .intervals(validIntervals(intervals))
                .status((byte) 1)
                .type((byte) 0)
                .description(description == null ? "" : description)
                .labels(labels == null ? Map.of() : stringMap(labels))
                .build();
        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(monitorParams);
        monitorService.validate(monitorDto, false);
        Monitor validatedMonitor = monitorDto.getMonitor();
        List<Param> validatedParams = monitorDto.getParams();
        monitorService.addMonitor(validatedMonitor, validatedParams, null, null);
        return Map.of("monitorId", validatedMonitor.getId(), "name", validatedMonitor.getName(),
                "app", validatedMonitor.getApp(), "instance", validatedMonitor.getInstance(),
                "intervals", validatedMonitor.getIntervals(), "labels", validatedMonitor.getLabels());
    }

    @Tool(name = "monitor.update",
            description = "Update monitor metadata. Supported update fields are name, intervals, description, and labels.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> updateMonitor(
            @ToolParam(description = "Monitor id.") Long monitorId,
            @ToolParam(description = "Fields to update. Labels replace the complete current label map.")
            Map<String, Object> updates,
            @ToolParam(required = false, description = "Reference returned by interaction.request_input.")
            String inputRef) {
        if (monitorId == null || updates == null || updates.isEmpty()) {
            throw new IllegalArgumentException("monitorId and updates are required");
        }
        Set<String> supportedFields = Set.of("name", "intervals", "description", "labels");
        if (!supportedFields.containsAll(updates.keySet())) {
            throw new IllegalArgumentException("monitor.update supports only name, intervals, description, and labels");
        }
        MonitorDto monitorDto = monitorService.getMonitorDto(monitorId);
        if (monitorDto == null || monitorDto.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor was not found: " + monitorId);
        }
        Monitor monitor = monitorDto.getMonitor();
        applyMonitorUpdates(monitor, updates);
        restoreInstanceWithoutPort(monitor, monitorDto.getParams());
        monitorDto.setMonitor(monitor);
        monitorService.validate(monitorDto, true);
        monitorService.modifyMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector(),
                monitorDto.getGrafanaDashboard());
        return monitorRow(monitorDto.getMonitor());
    }

    @Tool(name = "monitor.pause", description = "Pause collection for one or more monitors.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> pauseMonitors(
            @ToolParam(description = "Monitor ids; at most 100 per request.") List<Long> monitorIds) {
        Set<Long> ids = monitorIds(monitorIds);
        monitorService.cancelManageMonitors(ids);
        return operationResult("pause", ids);
    }

    @Tool(name = "monitor.resume", description = "Resume collection for one or more paused monitors.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> resumeMonitors(
            @ToolParam(description = "Monitor ids; at most 100 per request.") List<Long> monitorIds) {
        Set<Long> ids = monitorIds(monitorIds);
        monitorService.enableManageMonitors(ids);
        return operationResult("resume", ids);
    }

    @Tool(name = "monitor.delete", description = "Permanently delete one or more monitors and their scheduled jobs.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteMonitors(
            @ToolParam(description = "Monitor ids; at most 100 per request.") List<Long> monitorIds,
            @ToolParam(description = "Operator-provided reason recorded with the tool invocation.") String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for monitor.delete");
        }
        Set<Long> ids = monitorIds(monitorIds);
        List<Long> missingIds = ids.stream()
                .filter(id -> {
                    MonitorDto monitor = monitorService.getMonitorDto(id);
                    return monitor == null || monitor.getMonitor() == null;
                })
                .toList();
        if (!missingIds.isEmpty()) {
            throw new IllegalArgumentException("Monitors were not found: " + missingIds);
        }
        monitorService.deleteMonitors(ids);
        return operationResult("delete", ids);
    }

    @Tool(name = "monitor.types", description = "List monitor application types available for creation.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, String> listMonitorTypes(
            @ToolParam(required = false, description = "Language tag, such as en-US or zh-CN.") String language) {
        return appService.getI18nApps(language == null || language.isBlank() ? "en-US" : language);
    }

    @Tool(name = "monitor.type_params", description = "Get required parameter definitions for a monitor application type.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public List<ParamDefineInfo> getMonitorTypeParams(
            @ToolParam(description = "Monitor application type.") String app) {
        if (app == null || app.isBlank()) {
            throw new IllegalArgumentException("app is required");
        }
        // Application catalog keys are case-insensitive; canonicalize the model-provided app for lookup.
        return appService.getAppParamDefines(app.trim().toLowerCase(Locale.ROOT));
    }

    private String collectorBinding(Long monitorId) {
        if (monitorId == null) {
            return null;
        }
        return collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitorId)
            .map(CollectorMonitorBind::getCollector)
            .orElse(null);
    }

    private boolean credentialPresent(List<Param> params) {
        return params != null && params.stream().anyMatch(param -> param != null && param.getType() == 2);
    }

    private String monitorStatus(byte status) {
        return switch (status) {
            case 0 -> "paused";
            case 1 -> "up";
            case 2 -> "down";
            default -> "unknown";
        };
    }

    private Map<String, Long> statusCounts(String app, String search, String labels) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("up", count(app, search, labels, (byte) 1));
        counts.put("down", count(app, search, labels, (byte) 2));
        counts.put("paused", count(app, search, labels, (byte) 0));
        return counts;
    }

    private Byte monitorStatus(String status) {
        if (status == null || status.isBlank() || "all".equalsIgnoreCase(status)) {
            return null;
        }
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "paused" -> (byte) 0;
            case "up" -> (byte) 1;
            case "down" -> (byte) 2;
            default -> throw new IllegalArgumentException("status must be paused, up, down, or all");
        };
    }

    private int validIntervals(Integer intervals) {
        if (intervals == null) {
            return 600;
        }
        if (intervals < 10 || intervals > 604_800) {
            throw new IllegalArgumentException("Monitor intervals must be from 10 to 604800 seconds");
        }
        return intervals;
    }

    private Map<String, Object> monitorRow(Monitor monitor) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("monitorId", monitor.getId());
        row.put("name", monitor.getName());
        row.put("app", monitor.getApp());
        row.put("instance", monitor.getInstance());
        row.put("intervals", monitor.getIntervals());
        row.put("status", switch (monitor.getStatus()) {
            case 0 -> "paused";
            case 1 -> "up";
            case 2 -> "down";
            default -> "unknown";
        });
        row.put("labels", monitor.getLabels() == null ? Map.of() : monitor.getLabels());
        row.put("annotations", monitor.getAnnotations() == null ? Map.of() : monitor.getAnnotations());
        row.put("description", monitor.getDescription());
        return row;
    }

    private long count(String app, String search, String labels, byte status) {
        return monitorService.getMonitors(null, app, search, status, "id", "asc", 0, 1, labels).getTotalElements();
    }

    private Set<Long> monitorIds(List<Long> monitorIds) {
        if (monitorIds == null || monitorIds.isEmpty() || monitorIds.size() > 100
                || monitorIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("monitorIds must contain 1 to 100 positive ids");
        }
        return new LinkedHashSet<>(monitorIds);
    }

    private Map<String, Object> operationResult(String operation, Set<Long> monitorIds) {
        return Map.of("operation", operation, "monitorIds", List.copyOf(monitorIds),
                "requestedCount", monitorIds.size());
    }

    private String paramValue(Object value) {
        if (value == null) {
            return null;
        }
        return value instanceof Map<?, ?> || value instanceof List<?> ? JsonUtil.toJson(value) : String.valueOf(value);
    }

    private byte paramType(ParamDefineInfo definition) {
        if (definition == null || definition.getType() == null) {
            return 1;
        }
        return switch (definition.getType()) {
            case "number" -> 0;
            case "password" -> 2;
            case "json", "map" -> 3;
            case "array", "arrays" -> 4;
            default -> 1;
        };
    }

    private void applyMonitorUpdates(Monitor monitor, Map<String, Object> updates) {
        if (updates.containsKey("name")) {
            Object name = updates.get("name");
            if (!(name instanceof String value) || value.isBlank() || value.length() > 100) {
                throw new IllegalArgumentException("Monitor name must not be blank or exceed 100 characters");
            }
            monitor.setName(value);
        }
        if (updates.containsKey("intervals")) {
            Object intervals = updates.get("intervals");
            if (!(intervals instanceof Number value) || value.intValue() < 10 || value.intValue() > 604_800) {
                throw new IllegalArgumentException("Monitor intervals must be from 10 to 604800 seconds");
            }
            monitor.setIntervals(value.intValue());
        }
        if (updates.containsKey("description")) {
            Object description = updates.get("description");
            if (!(description instanceof String value) || value.length() > 255) {
                throw new IllegalArgumentException("Monitor description must be text and at most 255 characters");
            }
            monitor.setDescription(value);
        }
        if (updates.containsKey("labels")) {
            monitor.setLabels(stringMap(updates.get("labels")));
        }
    }

    private Map<String, String> stringMap(Object value) {
        if (!(value instanceof Map<?, ?> values)) {
            throw new IllegalArgumentException("Monitor labels must be a string map");
        }
        Map<String, String> labels = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : values.entrySet()) {
            if (!(entry.getKey() instanceof String key) || key.isBlank()
                    || !(entry.getValue() instanceof String labelValue) || labelValue.isBlank()) {
                throw new IllegalArgumentException("Monitor labels must contain non-blank string keys and values");
            }
            labels.put(key, labelValue);
        }
        if (labels.size() > 50 || JsonUtil.toJson(labels).length() > 4096) {
            throw new IllegalArgumentException("Monitor labels must contain at most 50 entries and fit in 4096 characters");
        }
        return labels;
    }

    private void restoreInstanceWithoutPort(Monitor monitor, List<Param> params) {
        if (params == null || params.isEmpty()) {
            return;
        }
        String port = params.stream()
                .filter(param -> "port".equals(param.getField()))
                .map(Param::getParamValue)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
        String instance = monitor.getInstance();
        if (port != null && instance != null && instance.endsWith(":" + port)) {
            monitor.setInstance(instance.substring(0, instance.length() - port.length() - 1));
        }
    }
}
