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

package org.apache.hertzbeat.ai.gateway.tool.protocol;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Builds bounded one-time collection jobs for protocol primitive tools.
 */
@Service
public class AgentProtocolPrimitiveSupport {

    private final MonitorService monitorService;
    private final AppService appService;
    private final CollectJobScheduling collectJobScheduling;
    private final CollectorMonitorBindDao collectorMonitorBindDao;

    public AgentProtocolPrimitiveSupport(MonitorService monitorService, AppService appService,
                                         CollectJobScheduling collectJobScheduling,
                                         CollectorMonitorBindDao collectorMonitorBindDao) {
        this.monitorService = monitorService;
        this.appService = appService;
        this.collectJobScheduling = collectJobScheduling;
        this.collectorMonitorBindDao = collectorMonitorBindDao;
    }

    public AgentToolOutput execute(Long monitorId, String protocol, String requestedCollector, int maxRows,
                                   Function<Metrics, List<Metrics>> primitiveMetrics) {
        if (monitorId == null) {
            throw new IllegalArgumentException("Protocol primitive requires monitorId");
        }
        MonitorDto monitorDto = monitorService.getMonitorDto(monitorId);
        if (monitorDto == null || monitorDto.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor not found: " + monitorId);
        }
        Job job = oneTimeJob(monitorDto);
        Metrics template = job.getMetrics().stream()
            .filter(metrics -> protocol.equalsIgnoreCase(metrics.getProtocol()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Monitor application does not define protocol " + protocol + ": " + monitorId));
        List<Metrics> metrics = primitiveMetrics.apply(template);
        if (metrics == null || metrics.isEmpty()) {
            throw new IllegalArgumentException("Protocol primitive metrics must not be empty");
        }
        for (int index = 0; index < metrics.size(); index++) {
            Metrics item = metrics.get(index);
            item.setPriority(index == 0 ? (byte) 0 : (byte) 1);
            item.setCollectTime(0L);
            item.setInterval(0L);
            item.setCalculates(null);
            item.setFilters(null);
            item.setUnits(null);
        }
        job.setMetrics(metrics);
        String collector = StringUtils.hasText(requestedCollector)
            ? requestedCollector
            : collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitorId)
                .map(CollectorMonitorBind::getCollector)
                .orElse(null);
        List<CollectRep.MetricsData> collected = collector == null
            ? collectJobScheduling.collectSyncJobData(job)
            : collectJobScheduling.collectSyncJobData(job, collector);
        try {
            Map<String, Object> result = result(monitorId, protocol, collector, collected, maxRows);
            AgentToolStatus status = collected != null && !collected.isEmpty()
                && collected.stream().allMatch(data -> data.getCode() == CollectRep.Code.SUCCESS)
                ? AgentToolStatus.SUCCEEDED
                : AgentToolStatus.FAILED;
            return AgentToolOutput.builder()
                .status(status)
                .modelContent(JsonUtil.toJson(result))
                .errorMessage(status == AgentToolStatus.FAILED ? firstError(collected) : null)
                .build();
        } finally {
            if (collected != null) {
                collected.forEach(CollectRep.MetricsData::close);
            }
        }
    }

    public Metrics copy(Metrics metrics) {
        return JsonUtil.fromJson(JsonUtil.toJson(metrics), Metrics.class);
    }

    public List<Metrics.Field> fields(List<String> names) {
        return names.stream()
            .map(name -> Metrics.Field.builder().field(name).type((byte) 1).build())
            .toList();
    }

    private Job oneTimeJob(MonitorDto monitorDto) {
        Monitor monitor = monitorDto.getMonitor();
        String app = StringUtils.hasText(monitor.getScrape()) ? monitor.getScrape() : monitor.getApp();
        Job job = appService.getAppDefine(app).clone();
        job.setMonitorId(monitor.getId());
        job.setCyclic(false);
        job.setTimestamp(System.currentTimeMillis());
        Map<String, String> metadata = new LinkedHashMap<>();
        if (monitor.getName() != null) {
            metadata.put(CommonConstants.LABEL_INSTANCE_NAME, monitor.getName());
        }
        if (monitor.getInstance() != null) {
            metadata.put(CommonConstants.LABEL_INSTANCE, monitor.getInstance());
        }
        job.setMetadata(metadata);
        job.setLabels(monitor.getLabels());
        job.setAnnotations(monitor.getAnnotations());
        List<Param> params = monitorDto.getParams();
        job.setConfigmap(params == null ? List.of() : params.stream()
            .map(param -> new Configmap(param.getField(), param.getParamValue(), param.getType()))
            .toList());
        return job;
    }

    private Map<String, Object> result(Long monitorId, String protocol, String collector,
                                       List<CollectRep.MetricsData> collected, int maxRows) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monitorId", monitorId);
        result.put("protocol", protocol);
        result.put("collector", collector);
        result.put("metrics", collected == null ? List.of() : collected.stream()
            .map(data -> metricsResult(data, maxRows))
            .toList());
        return result;
    }

    private Map<String, Object> metricsResult(CollectRep.MetricsData data, int maxRows) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name", data.getMetrics());
        result.put("code", data.getCode().name());
        result.put("message", data.getMsg());
        List<String> fields = data.getFields().stream().map(CollectRep.Field::getName).toList();
        result.put("fields", fields);
        List<Map<String, String>> rows = new ArrayList<>();
        int rowLimit = Math.max(1, Math.min(maxRows, 1000));
        for (CollectRep.ValueRow valueRow : data.getValues()) {
            if (rows.size() >= rowLimit) {
                break;
            }
            Map<String, String> row = new LinkedHashMap<>();
            for (int index = 0; index < fields.size(); index++) {
                row.put(fields.get(index), index < valueRow.getColumnsCount()
                    ? valueRow.getColumns(index) : null);
            }
            rows.add(row);
        }
        result.put("rows", rows);
        result.put("rowCount", data.getValuesCount());
        result.put("truncated", data.getValuesCount() > rows.size());
        return result;
    }

    private String firstError(List<CollectRep.MetricsData> collected) {
        if (collected == null || collected.isEmpty()) {
            return "Protocol primitive returned no collection result";
        }
        return collected.stream()
            .filter(data -> data.getCode() != CollectRep.Code.SUCCESS)
            .map(CollectRep.MetricsData::getMsg)
            .filter(StringUtils::hasText)
            .findFirst()
            .orElse("Protocol primitive failed");
    }
}
