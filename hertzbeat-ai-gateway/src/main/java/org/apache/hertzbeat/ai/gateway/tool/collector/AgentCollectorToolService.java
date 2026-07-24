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

package org.apache.hertzbeat.ai.gateway.tool.collector;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolArguments;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInfo;
import org.apache.hertzbeat.manager.pojo.dto.CollectorSummary;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.CollectorService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;

/**
 * Executes one-time protocol collection through HertzBeat collector scheduling.
 */
@Service
public class AgentCollectorToolService {

    private final CollectorService collectorService;
    private final MonitorService monitorService;
    private final AppService appService;
    private final CollectJobScheduling collectJobScheduling;

    public AgentCollectorToolService(CollectorService collectorService, MonitorService monitorService,
                                     AppService appService,
                                     CollectJobScheduling collectJobScheduling) {
        this.collectorService = collectorService;
        this.monitorService = monitorService;
        this.appService = appService;
        this.collectJobScheduling = collectJobScheduling;
    }

    @Tool(name = "collector.collect_once",
        description = "Run one bounded collector protocol validation using monitor configuration.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput collectOnce(
        @ToolParam(description = "Monitor id.")
        Long monitorId,
        @ToolParam(required = false, description = "Collector name.")
        String collector) {
        return doCollectOnce(monitorId, collector);
    }

    private AgentToolOutput doCollectOnce(Long monitorId, String collector) {
        Long resolvedMonitorId = monitorId(monitorId);
        String resolvedCollector = collector(collector);
        Job job = oneTimeJob(resolvedMonitorId);
        List<CollectRep.MetricsData> metricsData = resolvedCollector == null
            ? collectJobScheduling.collectSyncJobData(job)
            : collectJobScheduling.collectSyncJobData(job, resolvedCollector);
        Map<String, Object> result = collectResult(resolvedMonitorId, resolvedCollector, metricsData);
        close(metricsData);
        return output(result, statusFrom(result));
    }

    @Tool(name = "collector.detect",
        description = "Validate monitor protocol configuration without mutating state.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput detect(
        @ToolParam(description = "Monitor id.")
        Long monitorId,
        @ToolParam(required = false, description = "Collector name.")
        String collector) {
        AgentToolOutput collect = doCollectOnce(monitorId, collector);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", collect.getStatus() == AgentToolStatus.SUCCEEDED ? "SUCCESS" : "FAILED");
        Map<String, Object> collectResult = JsonUtil.fromJson(collect.getModelContent(), new TypeReference<>() { });
        result.put("collect", collectResult == null ? Map.of() : collectResult);
        return AgentToolOutput.builder()
            .status(collect.getStatus())
            .modelContent(JsonUtil.toJson(result))
            .build();
    }

    @Tool(name = "collector.list", description = "List registered collectors and their monitor assignment counts.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> listCollectors(
            @ToolParam(required = false, description = "Collector name search text.") String name,
            @ToolParam(required = false, description = "Zero-based page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size; maximum 100.") Integer pageSize) {
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        Page<CollectorSummary> page = collectorService.getCollectors(name, resolvedPageIndex, resolvedPageSize);
        return Map.of("content", page.getContent().stream().map(this::collectorRow).toList(),
                "pageIndex", page.getNumber(), "pageSize", page.getSize(),
                "totalElements", page.getTotalElements(), "totalPages", page.getTotalPages());
    }

    @Tool(name = "collector.set_state", description = "Mark registered collectors online or offline.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> setCollectorState(
            @ToolParam(description = "Collector names; at most 50 per request.") List<String> collectors,
            @ToolParam(description = "Target state: online or offline.") String state) {
        List<String> names = collectorNames(collectors);
        if ("online".equals(state)) {
            collectorService.makeCollectorsOnline(names);
        } else if ("offline".equals(state)) {
            collectorService.makeCollectorsOffline(names);
        } else {
            throw new IllegalArgumentException("state must be online or offline");
        }
        return Map.of("operation", "set_state", "collectors", names, "state", state,
                "affectedCount", names.size());
    }

    @Tool(name = "collector.assign_monitor",
            description = "Assign one monitor to a registered collector and reschedule its collection job.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> assignMonitor(
            @ToolParam(description = "Monitor id.") Long monitorId,
            @ToolParam(description = "Registered collector name.") String collector) {
        if (collector == null || collector.isBlank() || !collectorService.hasCollector(collector)) {
            throw new IllegalArgumentException("collector must identify a registered collector");
        }
        MonitorDto monitor = requiredMonitor(monitorId);
        monitorService.modifyMonitor(monitor.getMonitor(), monitor.getParams(), collector,
                monitor.getGrafanaDashboard());
        return Map.of("operation", "assign_monitor", "monitorId", monitorId, "collector", collector);
    }

    @Tool(name = "collector.unassign_monitor",
            description = "Remove a monitor's pinned collector assignment and return it to automatic dispatch.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> unassignMonitor(@ToolParam(description = "Monitor id.") Long monitorId) {
        MonitorDto monitor = requiredMonitor(monitorId);
        monitorService.modifyMonitor(monitor.getMonitor(), monitor.getParams(), null,
                monitor.getGrafanaDashboard());
        return Map.of("operation", "unassign_monitor", "monitorId", monitorId);
    }

    @Tool(name = "collector.delete", description = "Permanently delete registered collectors.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteCollectors(
            @ToolParam(description = "Collector names; at most 50 per request.") List<String> collectors,
            @ToolParam(description = "Operator-provided deletion reason recorded with the tool invocation.")
            String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for collector.delete");
        }
        List<String> names = collectorNames(collectors);
        collectorService.deleteRegisteredCollector(names);
        return Map.of("operation", "delete", "collectors", names, "affectedCount", names.size());
    }

    private Job oneTimeJob(Long monitorId) {
        MonitorDto dto = monitorService.getMonitorDto(monitorId);
        if (dto == null || dto.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor not found: " + monitorId);
        }
        Monitor monitor = dto.getMonitor();
        List<Param> params = dto.getParams();
        String app = AgentToolArguments.firstNonBlank(monitor.getScrape(), monitor.getApp());
        Job job = appService.getAppDefine(app);
        if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
            job.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
        }
        job.setMonitorId(monitorId);
        job.setCyclic(false);
        job.setTimestamp(System.currentTimeMillis());
        job.setMetadata(Map.of(CommonConstants.LABEL_INSTANCE_NAME, monitor.getName(),
            CommonConstants.LABEL_INSTANCE, monitor.getInstance()));
        job.setLabels(monitor.getLabels());
        job.setAnnotations(monitor.getAnnotations());
        job.setConfigmap(params == null ? List.of() : params.stream()
            .map(param -> new Configmap(param.getField(), param.getParamValue(), param.getType()))
            .collect(Collectors.toList()));
        return job;
    }

    private Map<String, Object> collectResult(Long monitorId, String collector, List<CollectRep.MetricsData> metricsData) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monitorId", monitorId);
        result.put("collector", collector);
        result.put("status", collectSucceeded(metricsData) ? "SUCCESS" : "FAILED");
        result.put("metricsCount", metricsData == null ? 0 : metricsData.size());
        result.put("metrics", metricsData == null ? List.of() : metricsData.stream()
            .map(this::metricsRow)
            .toList());
        return result;
    }

    private Map<String, Object> metricsRow(CollectRep.MetricsData data) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("app", data.getApp());
        row.put("metrics", data.getMetrics());
        row.put("code", data.getCode() == null ? null : data.getCode().name());
        row.put("message", data.getMsg());
        row.put("fields", data.getFields().stream().map(field -> field.getName()).toList());
        row.put("rowCount", data.rowCount());
        row.put("valueRows", data.getValuesCount());
        return row;
    }

    private boolean collectSucceeded(List<CollectRep.MetricsData> metricsData) {
        return metricsData != null && !metricsData.isEmpty()
            && metricsData.stream().allMatch(data -> data.getCode() == CollectRep.Code.SUCCESS);
    }

    private AgentToolStatus statusFrom(Map<String, Object> result) {
        return "SUCCESS".equals(result.get("status")) ? AgentToolStatus.SUCCEEDED : AgentToolStatus.FAILED;
    }

    private List<String> collectorNames(List<String> collectors) {
        if (collectors == null || collectors.isEmpty() || collectors.size() > 50
                || collectors.stream().anyMatch(name -> name == null || name.isBlank())) {
            throw new IllegalArgumentException("collectors must contain 1 to 50 non-blank names");
        }
        Set<String> names = new LinkedHashSet<>(collectors);
        List<String> missing = names.stream().filter(name -> !collectorService.hasCollector(name)).toList();
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("Collectors were not found: " + missing);
        }
        return List.copyOf(names);
    }

    private MonitorDto requiredMonitor(Long monitorId) {
        if (monitorId == null || monitorId <= 0) {
            throw new IllegalArgumentException("monitorId must be positive");
        }
        MonitorDto monitor = monitorService.getMonitorDto(monitorId);
        if (monitor == null || monitor.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor was not found: " + monitorId);
        }
        return monitor;
    }

    private Map<String, Object> collectorRow(CollectorSummary summary) {
        CollectorInfo collector = summary.getCollector();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("collectorId", collector.getId());
        row.put("name", collector.getName());
        row.put("ip", collector.getIp());
        row.put("version", collector.getVersion());
        row.put("status", collector.getStatus() == 0 ? "online" : "offline");
        row.put("mode", collector.getMode());
        row.put("pinnedMonitorCount", summary.getPinMonitorNum());
        row.put("dispatchedMonitorCount", summary.getDispatchMonitorNum());
        return row;
    }

    private void close(List<CollectRep.MetricsData> metricsData) {
        if (metricsData != null) {
            metricsData.forEach(CollectRep.MetricsData::close);
        }
    }

    private Long monitorId(Long requestedMonitorId) {
        Long monitorId = requestedMonitorId;
        if (monitorId == null) {
            throw new IllegalArgumentException("collector.collect_once requires monitorId");
        }
        return monitorId;
    }

    private String collector(String requestedCollector) {
        return AgentToolArguments.firstNonBlank(requestedCollector);
    }

    private AgentToolOutput output(Map<String, Object> result, AgentToolStatus status) {
        return AgentToolOutput.builder()
            .status(status)
            .modelContent(JsonUtil.toJson(result))
            .build();
    }
}
