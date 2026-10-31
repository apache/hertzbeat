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

import org.apache.hertzbeat.ai.gateway.contract.AgentQueryPurpose;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
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

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

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
        result.put(
                "annotations",
                monitor.getAnnotations() == null ? Map.of() : monitor.getAnnotations());
        result.put("collector", collectorBinding(monitorId));
        result.put("credentialPresent", credentialPresent(monitorDto.getParams()));
        result.putAll(monitorRow(monitor));
        result.put("collectionState", monitor.getStatus() == 0 ? "paused" : "enabled");
        result.put("parameters", safeWebsiteParameters(monitor.getApp(), monitorDto.getParams()));
        result.put("readbackVersion", AgentMonitorMutationReceipt.READBACK_VERSION);
        return result;
    }

    @Tool(
            name = "monitor.params",
            description = "Get safe monitor parameter definition and value-presence summary. "
                    + "Protected defaults, option values, dependencies and placeholders are omitted; "
                    + "use the native editor for protected configuration.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorParams(
            @ToolParam(description = "Monitor id.") Long monitorId,
            @ToolParam(
                            required = false,
                            description = "Application type. Omit to infer it from the monitor.")
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
        result.putAll(monitorRow(monitor));
        result.put("collectionState", monitor.getStatus() == 0 ? "paused" : "enabled");
        result.put("parameters", safeWebsiteParameters(monitor.getApp(), monitorDto.getParams()));
        result.put("readbackVersion", AgentMonitorMutationReceipt.READBACK_VERSION);
        List<ParamDefineInfo> definitions = List.of();
        if (resolvedApp != null) {
            // Application catalog keys are case-insensitive; canonicalize model-provided app names for lookup.
            definitions = AgentParameterMetadataProjection.safe(appService.getAppParamDefines(resolvedApp.toLowerCase(Locale.ROOT)));
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

    public Map<String, Object> queryMonitors(List<Long> ids, String app, String status, String search, String labels,
                                             String sort, String order, Integer pageIndex, Integer pageSize, Boolean includeStats) {
        return queryMonitors(ids, app, status, search, labels, sort, order, pageIndex, pageSize, includeStats,
                AgentQueryPurpose.PAGE);
    }

    @Tool(
            name = "monitor.query",
            description =
                    "Query current monitor snapshots. Choose purpose from the current user request:"
                        + " COUNT needs only an exact matching total and one sample; PAGE returns"
                        + " one requested page; ALL_ROWS requires every matching page;"
                        + " STATUS_COUNTS returns exact status aggregates for the same filters."
                        + " totalElements is the full matching total, not the sample count."
                        + " Returned row attributes apply only to those rows. This tool has no"
                        + " historical/time-range filter. Do not query other signals to answer a"
                        + " monitor count.")
    @AgentToolPolicy
    public Map<String, Object> queryMonitors(
            @ToolParam(required = false, description = "Monitor ids.") List<Long> ids,
            @ToolParam(required = false, description = "Monitor application type.") String app,
            @ToolParam(
                            required = false,
                            description = "Status: paused, up, down, or all; default all.")
                    String status,
            @ToolParam(required = false, description = "Monitor name or host search text.")
                    String search,
            @ToolParam(required = false, description = "Comma-separated key:value label filters.")
                    String labels,
            @ToolParam(required = false, description = "Sort field.") String sort,
            @ToolParam(required = false, description = "Sort order: asc or desc.") String order,
            @ToolParam(required = false, description = "Zero-based page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size.") Integer pageSize,
            @ToolParam(required = false, description = "Include monitor status statistics.")
                    Boolean includeStats,
            @ToolParam(
                            required = false,
                            description =
                                    "Result required by the current question: COUNT, PAGE,"
                                        + " ALL_ROWS, STATUS_COUNTS, or TIME_RANGE. Default PAGE."
                                        + " Select COUNT for how many, not ALL_ROWS.")
                    AgentQueryPurpose purpose) {
        AgentQueryPurpose resultPurpose = purpose == null ? AgentQueryPurpose.PAGE : purpose;
        if (resultPurpose == AgentQueryPurpose.TIME_RANGE) {
            return Map.of("state", "unsupported_time_range", "temporalScope", "CURRENT_SNAPSHOT",
                    "reasonCode", "MONITOR_HISTORY_FILTER_UNSUPPORTED");
        }
        int resolvedPageIndex = resultPurpose == AgentQueryPurpose.COUNT ? 0
                : AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE);
        int resolvedPageSize = resultPurpose == AgentQueryPurpose.COUNT ? 1
                : AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        String resolvedSort = sort == null || sort.isBlank()
                ? resultPurpose == AgentQueryPurpose.ALL_ROWS ? "id" : "gmtCreate" : sort;
        if (!MONITOR_SORT_FIELDS.contains(resolvedSort)) {
            throw new IllegalArgumentException(
                    "sort must be id, name, app, status, gmtCreate, or gmtUpdate");
        }
        String resolvedOrder =
                order == null || order.isBlank()
                        ? resultPurpose == AgentQueryPurpose.ALL_ROWS ? "asc" : "desc"
                        : order.toLowerCase(Locale.ROOT);
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
        boolean aggregate = resultPurpose != AgentQueryPurpose.COUNT
                && (Boolean.TRUE.equals(includeStats) || resultPurpose == AgentQueryPurpose.STATUS_COUNTS);
        if (aggregate) {
            result.put("status", statusCounts(ids, app, status, search, labels));
        }
        Map<String, Object> filters = new LinkedHashMap<>();
        if (ids != null && !ids.isEmpty()) {
            filters.put("ids", List.copyOf(ids));
        }
        for (var filter :
                Map.of(
                                "app",
                                app == null ? "" : app,
                                "status",
                                status == null ? "all" : status,
                                "search",
                                search == null ? "" : search,
                                "labels",
                                labels == null ? "" : labels)
                        .entrySet()) {
            if (!filter.getValue().isBlank()
                    && !(filter.getKey().equals("status")
                            && filter.getValue().equalsIgnoreCase("all"))) {
                filters.put(filter.getKey(), filter.getValue());
            }
        }
        result.put(
                "queryMetadata",
                Map.of(
                        "version",
                        "monitor-query.v1",
                        "purpose",
                        resultPurpose.name(),
                        "totalScope",
                        "MATCHING_FILTERS",
                        "totalIsExact",
                        true,
                        "rowScope",
                        "RETURNED_PAGE",
                        "temporalScope",
                        "CURRENT_SNAPSHOT",
                        "authorizationScope",
                        "CURRENT_TOOL_ACCESS",
                        "filters",
                        filters,
                        "statusCountsScope",
                        aggregate ? "MATCHING_FILTERS" : "NOT_REQUESTED",
                        "statusCountsAtomic",
                        false));
        return result;
    }

    public Map<String, Object> createMonitor(String name, String app, Integer intervals, Map<String, Object> params,
            String description, Map<String, String> labels, String inputRef) {
        return createMonitor(name, app, intervals, params, description, labels, inputRef, null);
    }

    /** Non-secret scheduling and collector fields for creation. */
    public record CreateOptions(String collector, Map<String, String> annotations, String scheduleType, String cronExpression) { }

    @Tool(
            name = "monitor.create",
            description = "Create a HertzBeat monitor from an application type and parameters.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> createMonitor(
            @ToolParam(description = "Unique monitor name.") String name,
            @ToolParam(description = "Monitor application type, such as linux, mysql, or website.")
                    String app,
            @ToolParam(required = false, description = "Collection interval in seconds.")
                    Integer intervals,
            @ToolParam(description = "Monitor parameters keyed by parameter field.")
                    Map<String, Object> params,
            @ToolParam(required = false, description = "Monitor description.") String description,
            @ToolParam(
                            required = false,
                            description =
                                    "Business labels attached to collected metrics and alerts.")
                    Map<String, String> labels,
            @ToolParam(
                            required = false,
                            description = "Reference returned by interaction.request_input.")
                    String inputRef,
            @ToolParam(
                            required = false,
                            description =
                                    "Non-secret collector, annotations and interval/cron scheduling"
                                            + " fields.")
                    CreateOptions options) {
        if (name == null || name.isBlank() || name.length() > 100 || app == null || app.isBlank()
                || app.length() > 100 || params == null || params.isEmpty() || params.size() > 100) {
            throw new IllegalArgumentException(
                    "name, app, and 1 to 100 params are required; name and app must not exceed 100"
                            + " characters");
        }
        if (description != null && description.length() > 255) {
            throw new IllegalArgumentException("description must not exceed 255 characters");
        }
        // Application catalog keys are case-insensitive; canonicalize the model-provided app for lookup and storage.
        String resolvedApp = app.trim().toLowerCase(Locale.ROOT);
        rejectExecutableParameterFields(params.keySet());
        requireNonCodeTemplate(resolvedApp);
        List<ParamDefineInfo> definitions = appService.getAppParamDefines(resolvedApp);
        Map<String, ParamDefineInfo> definitionsByField = definitions.stream()
                .collect(java.util.stream.Collectors.toMap(ParamDefineInfo::getField, definition -> definition));
        if (!definitionsByField.keySet().containsAll(params.keySet())) {
            Set<String> unknownFields = new LinkedHashSet<>(params.keySet());
            unknownFields.removeAll(definitionsByField.keySet());
            throw new IllegalArgumentException(
                    "Unknown monitor parameter fields: " + unknownFields);
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
        String instance =
                host == null
                        ? ""
                        : port == null || port.isBlank() ? host.trim() : host.trim() + ":" + port;
        if (instance.length() > 100) {
            throw new IllegalArgumentException(
                    "The derived monitor instance must not exceed 100 characters");
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
        if (options != null) {
            if (options.collector() != null) {
                monitorDto.setCollector(optionalText(options.collector(), 100));
            }
            if (options.annotations() != null) {
                monitor.setAnnotations(stringMap(options.annotations()));
            }
            if (options.scheduleType() != null) {
                if (!Set.of("interval", "cron").contains(options.scheduleType())) {
                    throw new IllegalArgumentException("scheduleType must be interval or cron");
                }
                monitor.setScheduleType(options.scheduleType());
            }
            if (options.cronExpression() != null) {
                monitor.setCronExpression(optionalText(options.cronExpression(), 100));
            }
        }
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(monitorParams, false);
        monitorService.validate(monitorDto, false);
        Monitor validatedMonitor = monitorDto.getMonitor();
        List<Param> validatedParams = monitorDto.getParams();
        monitorService.addMonitor(validatedMonitor, validatedParams, monitorDto.getCollector(), null);
        Map<String, Object> result =
                new LinkedHashMap<>(
                        Map.of(
                                "monitorId",
                                validatedMonitor.getId(),
                                "name",
                                validatedMonitor.getName(),
                                "app",
                                validatedMonitor.getApp(),
                                "instance",
                                validatedMonitor.getInstance(),
                                "intervals",
                                validatedMonitor.getIntervals(),
                                "labels",
                                validatedMonitor.getLabels()));
        if ("website".equals(validatedMonitor.getApp())
                && AgentMonitorMutationReceipt.WEBSITE_FIELDS.containsAll(params.keySet())) {
            Map<String, Object> expected = monitorRow(validatedMonitor);
            expected.remove("status");
            expected.remove("monitorId");
            expected.put(
                    "collectionState", validatedMonitor.getStatus() == 0 ? "paused" : "enabled");
            if (options != null && options.collector() != null) {
                expected.put("collector", monitorDto.getCollector());
            }
            attachMutation(
                    result,
                    "monitor.create",
                    List.of(
                            new AgentMonitorMutationReceipt.Target(
                                    validatedMonitor.getId(),
                                    expected,
                                    safeWebsiteParameters(
                                            validatedMonitor.getApp(), validatedParams))));
        }
        return result;
    }

    @Tool(
            name = "monitor.update",
            description =
                    "Update monitor metadata. Supported fields are name, intervals, description,"
                            + " labels, annotations, collector, scheduleType, and cronExpression."
                            + " Protocol credentials must use the native monitor form.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> updateMonitor(
            @ToolParam(description = "Monitor id.") Long monitorId,
            @ToolParam(
                            description =
                                    "Fields to update. Labels replace the complete current label"
                                            + " map.")
                    Map<String, Object> updates,
            @ToolParam(
                            required = false,
                            description = "Reference returned by interaction.request_input.")
                    String inputRef) {
        if (monitorId == null || updates == null || updates.isEmpty()) {
            throw new IllegalArgumentException("monitorId and updates are required");
        }
        Set<String> supportedFields =
                Set.of(
                        "name",
                        "intervals",
                        "description",
                        "labels",
                        "annotations",
                        "collector",
                        "scheduleType",
                        "cronExpression");
        if (!supportedFields.containsAll(updates.keySet())) {
            throw new IllegalArgumentException(
                    "Unsupported update field; use the native monitor form for protocol"
                            + " parameters");
        }
        MonitorDto monitorDto = monitorService.getMonitorDto(monitorId);
        if (monitorDto != null && monitorDto.getMonitor() != null) requireNonCodeTemplate(monitorDto.getMonitor().getApp());
        if (monitorDto == null || monitorDto.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor was not found: " + monitorId);
        }
        Monitor monitor = monitorDto.getMonitor();
        applyMonitorUpdates(monitor, updates);
        if (updates.containsKey("annotations")) {
            monitor.setAnnotations(stringMap(updates.get("annotations")));
        }
        if (updates.containsKey("collector")) {
            monitorDto.setCollector(optionalText(updates.get("collector"), 100));
        }
        if (updates.containsKey("scheduleType")) {
            String scheduleType = optionalText(updates.get("scheduleType"), 20);
            if (!Set.of("interval", "cron").contains(scheduleType)) {
                throw new IllegalArgumentException("scheduleType must be interval or cron");
            }
            monitor.setScheduleType(scheduleType);
        }
        if (updates.containsKey("cronExpression")) {
            monitor.setCronExpression(optionalText(updates.get("cronExpression"), 100));
        }
        restoreInstanceWithoutPort(monitor, monitorDto.getParams());
        monitorDto.setMonitor(monitor);
        monitorService.validate(monitorDto, true);
        monitorService.modifyMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector(),
                monitorDto.getGrafanaDashboard());
        Monitor persisted = monitorService.getMonitor(monitorId);
        Map<String, Object> result = monitorRow(persisted == null ? monitorDto.getMonitor() : persisted);
        result.put("verified", persisted != null);
        Map<String, Object> expected = new LinkedHashMap<>();
        for (String field : updates.keySet()) {
            expected.put(
                    field,
                    "collector".equals(field) ? monitorDto.getCollector() : result.get(field));
        }
        attachMutation(
                result,
                "monitor.update",
                List.of(new AgentMonitorMutationReceipt.Target(monitorId, expected, Map.of())));
        return result;
    }

    @Tool(
            name = "monitor.protocol_update",
            description =
                    "Patch declared non-secret scalar protocol parameters on an existing monitor,"
                            + " preserving stored credentials server-side. Password, composite and"
                            + " credential-bearing parameters require the native secure editor.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> protocolUpdate(
            @ToolParam(description = "Existing monitor id.") Long monitorId,
            @ToolParam(description = "Declared non-secret scalar parameter fields to patch.")
                    Map<String, String> parameters) {
        if (monitorId == null || monitorId <= 0 || parameters == null || parameters.isEmpty() || parameters.size() > 100) {
            throw new IllegalArgumentException(
                    "A monitor and bounded parameter patch are required");
        }
        MonitorDto dto = monitorService.getMonitorDto(monitorId);
        if (dto != null && dto.getMonitor() != null) requireNonCodeTemplate(dto.getMonitor().getApp());
        if (dto == null || dto.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor not found");
        }
        Map<String, ParamDefineInfo> definitions = appService.getAppParamDefines(dto.getMonitor().getApp()).stream()
                .collect(java.util.stream.Collectors.toMap(ParamDefineInfo::getField, value -> value));
        validateNonSecretParameters(parameters, definitions);
        Map<String, Param> merged = new LinkedHashMap<>();
        if (dto.getParams() != null) {
            dto.getParams().forEach(param -> merged.put(param.getField(), param));
        }
        parameters.forEach((field, value) -> merged.put(field,
                Param.builder().field(field).paramValue(value).type(paramType(definitions.get(field))).build()));
        List<Param> params = List.copyOf(merged.values());
        Monitor monitor = dto.getMonitor();
        restoreInstanceWithoutPort(monitor, params);
        dto.setMonitor(monitor);
        dto.setParams(params, false);
        monitorService.validate(dto, true);
        monitorService.modifyMonitor(dto.getMonitor(), dto.getParams(), dto.getCollector(), dto.getGrafanaDashboard());
        MonitorDto persisted = monitorService.getMonitorDto(monitorId);
        boolean verified = persisted != null && persisted.getParams() != null && parameters.entrySet().stream()
                .allMatch(entry -> persisted.getParams().stream().anyMatch(param -> entry.getKey().equals(param.getField())
                        && entry.getValue().equals(param.getParamValue())));
        return Map.of("monitorId", monitorId, "verified", verified,
                "updatedFields", List.copyOf(parameters.keySet()));
    }

    @Tool(
            name = "monitor.detect_draft",
            description =
                    "Probe an unsaved monitor using declared non-secret scalar parameters. Performs"
                            + " a live collector probe without saving a monitor. Credential-bearing"
                            + " drafts require the native secure editor.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> detectDraft(
            @ToolParam(description = "Application identifier.") String app,
            @ToolParam(description = "Non-secret scalar protocol parameters.")
                    Map<String, String> parameters,
            @ToolParam(required = false, description = "Collector name.") String collector) {
        if (app == null || app.isBlank() || app.length() > 100 || parameters == null
                || parameters.isEmpty() || parameters.size() > 100) {
            throw new IllegalArgumentException("Application and bounded parameters are required");
        }
        String canonicalApp = app.trim().toLowerCase(Locale.ROOT);
        requireNonCodeTemplate(canonicalApp);
        Map<String, ParamDefineInfo> definitions = appService.getAppParamDefines(canonicalApp).stream()
                .collect(java.util.stream.Collectors.toMap(ParamDefineInfo::getField, value -> value));
        validateNonSecretParameters(parameters, definitions);
        MonitorDto dto = new MonitorDto();
        dto.setMonitor(Monitor.builder().name("AI availability probe").app(canonicalApp)
                .instance(parameters.getOrDefault("host", "")).intervals(60).type((byte) 0)
                .labels(Map.of()).annotations(Map.of()).build());
        dto.setParams(parameters.entrySet().stream().map(entry -> Param.builder().field(entry.getKey())
                .paramValue(entry.getValue()).type(paramType(definitions.get(entry.getKey()))).build()).toList(), false);
        dto.setCollector(collector == null ? null : optionalText(collector, 100));
        try {
            monitorService.validate(dto, null);
            monitorService.detectMonitor(dto.getMonitor(), dto.getParams(), dto.getCollector());
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException(
                    "Monitor draft validation or availability probe failed; inspect the native"
                            + " editor for details");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("app", canonicalApp);
        result.put("probeCompleted", true);
        result.put("persisted", false);
        result.put("probeVersion", "monitor-probe.v1");
        result.put("parameters", safeWebsiteParameters(canonicalApp, dto.getParams()));
        result.put("collector", dto.getCollector() == null ? "" : dto.getCollector());
        try {
            result.put(
                    "inputHash",
                    AgentToolContextSupport.invocation().getLedgerCall().getInputHash());
        } catch (IllegalArgumentException noInvocation) {
            result.put("inputHash", null);
        }
        return result;
    }

    private static void rejectExecutableParameterFields(Set<String> fields) {
        for (String raw : fields) {
            String field =
                    raw == null ? "" : raw.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
            if (Set.of(
                            "script",
                            "scriptcommand",
                            "scriptpath",
                            "scripttool",
                            "command",
                            "commands",
                            "cmd",
                            "sql",
                            "sqls",
                            "sqlquery",
                            "python",
                            "groovy",
                            "javascript",
                            "workdirectory")
                    .contains(field)) {
                throw new IllegalArgumentException(
                        "Executable monitor parameters are unavailable through AI tools");
            }
        }
    }

    private void validateNonSecretParameters(Map<String, String> parameters, Map<String, ParamDefineInfo> definitions) {
        rejectExecutableParameterFields(parameters.keySet());
        for (var entry : parameters.entrySet()) {
            ParamDefineInfo definition = definitions.get(entry.getKey());
            String field =
                    entry.getKey() == null
                            ? ""
                            : entry.getKey().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
            if (definition == null
                    || paramType(definition) > 1
                    || field.matches(
                            ".*(password|passwd|secret|token|credential|authorization|privatekey|apikey|accesskey|header).*")) {
                throw new IllegalArgumentException(
                        "This parameter requires the native secure editor");
            }
            if (entry.getValue() == null || entry.getValue().length() > 4096
                    || entry.getValue().matches("(?s).*://[^/\\s]*@.*")
                    || containsCredentialQueryParameter(entry.getValue())) {
                throw new IllegalArgumentException(
                        "A bounded non-secret parameter value is required");
            }
        }
    }

    private boolean containsCredentialQueryParameter(String value) {
        int queryStart = value.indexOf('?');
        if (queryStart < 0) {
            return false;
        }
        String query = value.substring(queryStart + 1).split("#", 2)[0];
        for (String parameter : query.split("[&;]")) {
            String rawName = parameter.split("=", 2)[0];
            String name;
            try {
                name = java.net.URLDecoder.decode(rawName, java.nio.charset.StandardCharsets.UTF_8)
                        .toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("Malformed URL query parameter name");
            }
            if (Set.of(
                                    "key",
                                    "token",
                                    "secret",
                                    "password",
                                    "passwd",
                                    "pwd",
                                    "pass",
                                    "authorization",
                                    "bearer")
                            .contains(name)
                    || name.matches(
                            ".*(password|secret|token|credential|authorization|privatekey|apikey|accesskey|signature)$")) {
                return true;
            }
        }
        return false;
    }

    @Tool(name = "monitor.pause", description = "Pause collection for one or more monitors.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> pauseMonitors(
            @ToolParam(description = "Monitor ids; at most 100 per request.")
                    List<Long> monitorIds) {
        Set<Long> ids = monitorIds(monitorIds);
        requireExistingMonitors(ids);
        monitorService.cancelManageMonitors(ids);
        return collectionMutation("pause", ids);
    }

    @Tool(
            name = "monitor.resume",
            description = "Resume collection for one or more paused monitors.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> resumeMonitors(
            @ToolParam(description = "Monitor ids; at most 100 per request.")
                    List<Long> monitorIds) {
        Set<Long> ids = monitorIds(monitorIds);
        requireExistingMonitors(ids);
        ids.forEach(id -> requireNonCodeTemplate(monitorService.getMonitor(id).getApp()));
        monitorService.enableManageMonitors(ids);
        return collectionMutation("resume", ids);
    }

    @Tool(
            name = "monitor.delete",
            description = "Permanently delete one or more monitors and their scheduled jobs.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteMonitors(
            @ToolParam(description = "Monitor ids; at most 100 per request.") List<Long> monitorIds,
            @ToolParam(description = "Operator-provided reason recorded with the tool invocation.")
                    String reason) {
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

    @Tool(
            name = "monitor.types",
            description = "List monitor application types available for creation.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, String> listMonitorTypes(
            @ToolParam(required = false, description = "Language tag, such as en-US or zh-CN.")
                    String language) {
        return appService.getI18nApps(language == null || language.isBlank() ? "en-US" : language);
    }

    @Tool(
            name = "monitor.type_params",
            description = "Get required parameter definitions for a monitor application type. "
                    + "Only fixed port/timeout/SSL defaults are returned. Other defaults, choices, "
                    + "dependencies and placeholders are withheld; use the native editor for protected values.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public List<ParamDefineInfo> getMonitorTypeParams(
            @ToolParam(description = "Monitor application type.") String app) {
        if (app == null || app.isBlank()) {
            throw new IllegalArgumentException("app is required");
        }
        // Application catalog keys are case-insensitive; canonicalize the model-provided app for lookup.
        return AgentParameterMetadataProjection.safe(appService.getAppParamDefines(app.trim().toLowerCase(Locale.ROOT)));
    }

    @Tool(
            name = "monitor.copy",
            description =
                    "Copy an existing monitor through the native copy service. Credentials remain"
                        + " server-side. The service does not return the new id; query monitors to"
                        + " verify the copy.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> copyMonitor(
            @ToolParam(description = "Source monitor id.") Long monitorId) {
        if (monitorId == null || monitorId <= 0) {
            throw new IllegalArgumentException("A positive monitor id is required");
        }
        Monitor source = monitorService.getMonitor(monitorId);
        if (source == null) throw new IllegalArgumentException("Source monitor was not found");
        requireNonCodeTemplate(source.getApp());
        monitorService.copyMonitor(monitorId);
        return Map.of(
                "sourceMonitorId", monitorId, "operation", "copy", "verificationRequired", true);
    }

    private String optionalText(Object value, int maximum) {
        if (!(value instanceof String text) || text.length() > maximum) {
            throw new IllegalArgumentException("Expected bounded text");
        }
        return text;
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

    private Map<String, Long> statusCounts(List<Long> ids, String app, String status, String search, String labels) {
        Map<String, Long> counts = new LinkedHashMap<>();
        Byte selected = monitorStatus(status);
        counts.put("up", count(ids, app, search, labels, selected, (byte) 1));
        counts.put("down", count(ids, app, search, labels, selected, (byte) 2));
        counts.put("paused", count(ids, app, search, labels, selected, (byte) 0));
        counts.put("unreachable", count(ids, app, search, labels, selected, (byte) 3));
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
            default ->
                    throw new IllegalArgumentException("status must be paused, up, down, or all");
        };
    }

    private int validIntervals(Integer intervals) {
        if (intervals == null) {
            return 600;
        }
        if (intervals < 10 || intervals > 604_800) {
            throw new IllegalArgumentException(
                    "Monitor intervals must be from 10 to 604800 seconds");
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
        row.put("scheduleType", monitor.getScheduleType());
        row.put("cronExpression", monitor.getCronExpression());
        row.put("status", switch (monitor.getStatus()) {
            case 0 -> "paused";
            case 1 -> "up";
            case 2 -> "down";
            default -> "unknown";
        });
        row.put("labels", monitor.getLabels() == null ? Map.of() : monitor.getLabels());
        row.put(
                "annotations",
                monitor.getAnnotations() == null ? Map.of() : monitor.getAnnotations());
        row.put("description", monitor.getDescription());
        return row;
    }

    private long count(List<Long> ids, String app, String search, String labels, Byte selected, byte status) {
        return selected != null && selected != status
                ? 0
                : monitorService
                        .getMonitors(ids, app, search, status, "id", "asc", 0, 1, labels)
                        .getTotalElements();
    }

    private Set<Long> monitorIds(List<Long> monitorIds) {
        if (monitorIds == null || monitorIds.isEmpty() || monitorIds.size() > 100
                || monitorIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("monitorIds must contain 1 to 100 positive ids");
        }
        return new LinkedHashSet<>(monitorIds);
    }

    private Map<String, String> safeWebsiteParameters(String app, List<Param> params) {
        if (!"website".equals(app) || params == null) {
            return Map.of();
        }
        Map<String, String> safe = new LinkedHashMap<>();
        for (Param param : params) {
            // Never obtain the value of a secret, composite or undeclared field.
            if (param == null
                    || !AgentMonitorMutationReceipt.WEBSITE_FIELDS.contains(param.getField())
                    || param.getType() > 1) {
                continue;
            }
            String value = param.getParamValue();
            if (value != null
                    && value.length() <= 4096
                    && !value.matches("(?s).*://[^/\\s]*@.*")
                    && !containsCredentialQueryParameter(value)) {
                safe.put(param.getField(), value);
            }
        }
        return Map.copyOf(safe);
    }

    private void attachMutation(
            Map<String, Object> result,
            String tool,
            List<AgentMonitorMutationReceipt.Target> targets) {
        String inputHash;
        try {
            inputHash = AgentToolContextSupport.invocation().getLedgerCall().getInputHash();
        } catch (IllegalArgumentException noInvocation) {
            inputHash = null;
        }
        result.put(
                "mutation",
                new AgentMonitorMutationReceipt(
                        AgentMonitorMutationReceipt.VERSION, tool, inputHash, targets));
    }

    /** Ordinary write tools must not start/reschedule code collectors without the bound preview flow. */
    private void requireNonCodeTemplate(String app) {
        org.apache.hertzbeat.ai.gateway.tool.core.AgentCollectionCapabilityBoundary.requireNonCode(appService.getAppDefine(app));
    }

    private void requireExistingMonitors(Set<Long> ids) {
        if (ids.stream().anyMatch(id -> monitorService.getMonitor(id) == null)) {
            throw new IllegalArgumentException(
                    "Every requested monitor id must exist; no collection change was made");
        }
    }

    private Map<String, Object> collectionMutation(String operation, Set<Long> ids) {
        Map<String, Object> result = new LinkedHashMap<>(operationResult(operation, ids));
        List<AgentMonitorMutationReceipt.Target> targets =
                ids.stream()
                        .map(
                                id ->
                                        new AgentMonitorMutationReceipt.Target(
                                                id,
                                                Map.of(
                                                        "collectionState",
                                                        "pause".equals(operation)
                                                                ? "paused"
                                                                : "enabled"),
                                                Map.of()))
                        .toList();
        attachMutation(result, "monitor." + operation, targets);
        return result;
    }

    private Map<String, Object> operationResult(String operation, Set<Long> monitorIds) {
        List<Map<String, Object>> outcomes = monitorIds.stream().map(id -> {
            Monitor current = monitorService.getMonitor(id);
            String state = current == null ? "absent" : monitorStatus(current.getStatus());
            boolean verified = "delete".equals(operation) ? current == null
                    : current != null && ("pause".equals(operation) ? current.getStatus() == 0 : current.getStatus() != 0);
            return Map.<String, Object>of("monitorId", id, "state", state, "verified", verified);
        }).toList();
        return Map.of("operation", operation, "monitorIds", List.copyOf(monitorIds),
                "requestedCount", monitorIds.size(), "outcomes", outcomes);
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
                throw new IllegalArgumentException(
                        "Monitor name must not be blank or exceed 100 characters");
            }
            monitor.setName(value);
        }
        if (updates.containsKey("intervals")) {
            Object intervals = updates.get("intervals");
            int exact;
            try {
                exact =
                        intervals instanceof Number value
                                ? new java.math.BigDecimal(value.toString()).intValueExact()
                                : -1;
            } catch (ArithmeticException | NumberFormatException invalid) {
                throw new IllegalArgumentException("Monitor interval must be an exact integer");
            }
            monitor.setIntervals(validIntervals(exact));
        }
        if (updates.containsKey("description")) {
            Object description = updates.get("description");
            if (!(description instanceof String value) || value.length() > 255) {
                throw new IllegalArgumentException(
                        "Monitor description must be text and at most 255 characters");
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
                throw new IllegalArgumentException(
                        "Monitor labels must contain non-blank string keys and values");
            }
            labels.put(key, labelValue);
        }
        if (labels.size() > 50 || JsonUtil.toJson(labels).length() > 4096) {
            throw new IllegalArgumentException(
                    "Monitor labels must contain at most 50 entries and fit in 4096 characters");
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
