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

package org.dromara.hertzbeat.manager.service.impl;

import cn.afterturn.easypoi.excel.annotation.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.manager.Param;
import org.dromara.hertzbeat.common.entity.manager.Tag;
import org.dromara.hertzbeat.manager.pojo.dto.MonitorDto;
import org.dromara.hertzbeat.manager.service.ImExportService;
import org.dromara.hertzbeat.manager.service.MonitorService;
import org.dromara.hertzbeat.manager.service.TagService;
import org.springframework.beans.BeanUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.util.CollectionUtils;

import javax.annotation.Resource;
import java.io.InputStream;
import java.io.OutputStream;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/3/31
 */
@Slf4j
abstract class AbstractImExportServiceImpl implements ImExportService {

    @Resource
    @Lazy
    private MonitorService monitorService;

    @Resource
    private TagService tagService;

    @Override
    public void importConfig(InputStream is) {
        var formList = parseImport(is)
                .stream()
                .map(this::convert)
                .collect(Collectors.toUnmodifiableList());
        if (!CollectionUtils.isEmpty(formList)) {
            formList.forEach(monitorDto -> {
                monitorService.validate(monitorDto, false);
                if (monitorDto.isDetected()) {
                    monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
                }
                monitorService.addMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
            });
        }
    }

    @Override
    public void exportConfig(OutputStream os, List<Long> configList) {
        var monitorList = configList.stream()
                .map(it -> monitorService.getMonitorDto(it))
                .map(this::convert)
                .collect(Collectors.toUnmodifiableList());
        writeOs(monitorList, os);
    }

    /**
     * Parsing an input stream into a form
     * 将输入流解析为表单
     *
     * @param is 输入流
     * @return 表单
     */
    abstract List<ExportMonitorDTO> parseImport(InputStream is);

    /**
     * Export Configuration to Output Stream
     * 导出配置到输出流
     *
     * @param monitorList 配置列表
     * @param os          输出流
     */
    abstract void writeOs(List<ExportMonitorDTO> monitorList, OutputStream os);

    private ExportMonitorDTO convert(MonitorDto dto) {
        var exportMonitor = new ExportMonitorDTO();
        var monitor = new MonitorDTO();
        BeanUtils.copyProperties(dto.getMonitor(), monitor);
        if (!CollectionUtils.isEmpty(dto.getMonitor().getTags())) {
            monitor.setTags(dto.getMonitor().getTags().stream()
                    .map(Tag::getId).collect(Collectors.toUnmodifiableList()));
        }
        exportMonitor.setMonitor(monitor);
        exportMonitor.setParams(dto.getParams().stream()
                .map(it -> {
                    var param = new ParamDTO();
                    BeanUtils.copyProperties(it, param);
                    return param;
                })
                .collect(Collectors.toUnmodifiableList()));
        exportMonitor.setMetrics(dto.getMetrics());
        exportMonitor.setDetected(false);
        exportMonitor.getMonitor().setCollector(dto.getCollector());
        return exportMonitor;
    }

    private MonitorDto convert(ExportMonitorDTO exportMonitor) {
        var monitorDto = new MonitorDto();
        monitorDto.setDetected(exportMonitor.getDetected());
        var monitor = new Monitor();
        log.debug("exportMonitor.monitor{}", exportMonitor.monitor);
        BeanUtils.copyProperties(exportMonitor.monitor, monitor);
        monitor.setTags(tagService.listTag(new HashSet<>(exportMonitor.monitor.tags))
                .stream().
                filter(tag -> !(tag.getName().equals(CommonConstants.TAG_MONITOR_ID) || tag.getName().equals(CommonConstants.TAG_MONITOR_NAME)))
                .collect(Collectors.toList()));
        monitorDto.setMonitor(monitor);
        monitorDto.setCollector(exportMonitor.getMonitor().getCollector());
        monitorDto.setMetrics(exportMonitor.metrics);
        monitorDto.setParams(exportMonitor.params.stream()
                .map(it -> {
                    var param = new Param();
                    BeanUtils.copyProperties(it, param);
                    return param;
                })
                .collect(Collectors.toUnmodifiableList()));
        return monitorDto;
    }

    protected String
    fileNamePrefix() {
        return "hertzbeat_monitor_" + LocalDate.now();
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ExcelTarget(value = "ExportMonitorDTO")
    protected static class ExportMonitorDTO {
        @ExcelEntity(name = "Monitor")
        private MonitorDTO monitor;
        @ExcelCollection(name = "Params")
        private List<ParamDTO> params;
        @ExcelCollection(name = "Metrics")
        private List<String> metrics;
        @ExcelCollection(name = "detected")
        private Boolean detected;
    }


    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ExcelTarget(value = "MonitorDTO")
    protected static class MonitorDTO {
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
        @Excel(name = "Tags")
        private List<Long> tags;
        @Excel(name = "Collector")
        private String collector;
    }


    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ExcelTarget(value = "ParamDTO")
    protected static class ParamDTO {
        @Excel(name = "Field")
        private String field;
        @Excel(name = "Type")
        private Byte type;
        @Excel(name = "Value")
        private String value;
    }


}
