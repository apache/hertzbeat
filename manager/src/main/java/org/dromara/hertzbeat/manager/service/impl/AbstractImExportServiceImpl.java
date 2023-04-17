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

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
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
            formList.forEach(it -> {
                monitorService.validate(it, false);
                if (it.isDetected()) {
                    monitorService.detectMonitor(it.getMonitor(), it.getParams());
                }
                monitorService.addMonitor(it.getMonitor(), it.getParams());
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
        return exportMonitor;
    }

    private MonitorDto convert(ExportMonitorDTO exportMonitor) {
        var monitorDto = new MonitorDto();
        monitorDto.setDetected(true);
        var monitor = new Monitor();
        BeanUtils.copyProperties(exportMonitor.monitor, monitor);
        monitor.setTags(tagService.listTag(new HashSet<>(exportMonitor.monitor.tags)));
        monitorDto.setMonitor(monitor);
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

    protected String fileNamePrefix() {
        return "hertzbeat_monitor_" + LocalDate.now();
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    protected static class ExportMonitorDTO {
        private MonitorDTO monitor;
        private List<ParamDTO> params;
        private List<String> metrics;
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    protected static class MonitorDTO {
        private String name;
        private String app;
        private String host;
        private Integer intervals;
        private Byte status;
        private String description;
        private List<Long> tags;
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    protected static class ParamDTO {
        private String field;
        private String value;
        private Byte type;
    }

}
