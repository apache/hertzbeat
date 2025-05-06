/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.impl;

import cn.afterturn.easypoi.excel.annotation.Excel;
import cn.afterturn.easypoi.excel.annotation.ExcelCollection;
import cn.afterturn.easypoi.excel.annotation.ExcelEntity;
import cn.afterturn.easypoi.excel.annotation.ExcelTarget;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.annotation.Resource;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.ImExportTaskConstant;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.config.ManagerSseManager;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.ImExportService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.LabelService;
import org.springframework.beans.BeanUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.util.CollectionUtils;

import java.io.InputStream;
import java.io.OutputStream;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * class AbstractImExportServiceImpl
 */
@Slf4j
public abstract class AbstractImExportServiceImpl implements ImExportService {

    @Resource
    @Lazy
    private MonitorService monitorService;

    @Resource
    private LabelService tagService;

    @Resource
    private ManagerSseManager managerSseManager;

    @Override
    public void importConfig(String taskName, InputStream is) {
        var formList = parseImport(is).stream().map(this::convert).toList();
        if (!CollectionUtils.isEmpty(formList)) {
            int totalElements = formList.size();
            int progressInterval = Math.max(1, totalElements / 10);
            for (int i = 0; i < totalElements; i++) {
                MonitorDto monitorDto = formList.get(i);
                monitorService.validate(monitorDto, false);
                monitorService.addMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector(), monitorDto.getGrafanaDashboard());
                if (totalElements >= ImExportTaskConstant.IMPORT_TASK_PROCESS_THRESHOLD && ((i + 1) % progressInterval == 0) && (i + 1 < totalElements)) {
                    managerSseManager.broadcastImportTaskInProgress(taskName, (int) ((i + 1) * 100.0 / totalElements));
                }
            }
            managerSseManager.broadcastImportTaskSuccess(taskName);
        }
    }

    @Override
    public void exportConfig(OutputStream os, List<Long> configList) {
        var monitorList = configList.stream().map(it -> monitorService.getMonitorDto(it)).filter(Objects::nonNull).map(this::convert).toList();
        writeOs(monitorList, os);
    }

    /**
     * Parsing an input stream into a form
     *
     * @param is input stream
     * @return form
     */
    abstract List<ExportMonitorDTO> parseImport(InputStream is);

    /**
     * Export Configuration to Output Stream
     *
     * @param monitorList config list
     * @param os          output stream
     */
    abstract void writeOs(List<ExportMonitorDTO> monitorList, OutputStream os);

    private ExportMonitorDTO convert(MonitorDto dto) {
        var exportMonitor = new ExportMonitorDTO();
        var monitor = new MonitorDTO();
        BeanUtils.copyProperties(dto.getMonitor(), monitor);
        exportMonitor.setMonitor(monitor);
        exportMonitor.setParams(dto.getParams().stream().map(it -> {
            var param = new ParamDTO();
            param.setField(it.getField());
            param.setType(it.getType());
            param.setValue(it.getParamValue());
            return param;
        }).toList());
        exportMonitor.getMonitor().setCollector(dto.getCollector());
        return exportMonitor;
    }

    private MonitorDto convert(ExportMonitorDTO exportMonitor) {
        if (exportMonitor == null || exportMonitor.monitor == null) {
            throw new IllegalArgumentException("exportMonitor and exportMonitor.monitor must not be null");
        }

        var monitorDto = new MonitorDto();
        var monitor = new Monitor();
        log.debug("exportMonitor.monitor{}", exportMonitor.monitor);
        if (exportMonitor.monitor != null) {
            // Add one more null check
            BeanUtils.copyProperties(exportMonitor.monitor, monitor);
        }
        monitorDto.setMonitor(monitor);
        if (exportMonitor.getMonitor() != null) {
            monitorDto.setCollector(exportMonitor.getMonitor().getCollector());
        }
        if (exportMonitor.params != null) {
            monitorDto.setParams(exportMonitor.params.stream().map(it -> {
                var param = new Param();
                param.setField(it.field);
                param.setType(it.type);
                param.setParamValue(it.value);
                return param;
            }).toList());
        } else {
            monitorDto.setParams(Collections.emptyList());
        }
        return monitorDto;
    }

    protected String fileNamePrefix() {
        return "hertzbeat_monitor_" + LocalDate.now();
    }

    /**
     * Export Monitor DTO
     */
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ExcelTarget(value = "ExportMonitorDTO")
    public static class ExportMonitorDTO {
        @ExcelEntity(name = "Monitor")
        private MonitorDTO monitor;
        @ExcelCollection(name = "Params")
        private List<ParamDTO> params;
    }

    /**
     * Monitor DTO
     */
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ExcelTarget(value = "MonitorDTO")
    public static class MonitorDTO {
        @Excel(name = "Name")
        private String name;
        @Excel(name = "App")
        private String app;
        @Excel(name = "Host")
        private String host;
        @Excel(name = "Intervals")
        private Integer intervals;
        @Excel(name = "Status")
        private Byte status;
        @Excel(name = "Description")
        private String description;
        @Excel(name = "Labels")
        private Map<String, String> labels;
        @Excel(name = "Collector")
        private String collector;
    }

    /**
     * Param DTO
     */
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ExcelTarget(value = "ParamDTO")
    public static class ParamDTO {
        @Excel(name = "Field")
        private String field;
        @Excel(name = "Type")
        private Byte type;
        @Excel(name = "Value")
        private String value;
    }
}
