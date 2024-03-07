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

package org.dromara.hertzbeat.alert.service.impl;


import cn.afterturn.easypoi.excel.annotation.Excel;
import cn.afterturn.easypoi.excel.annotation.ExcelTarget;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.service.AlertDefineImExportService;
import org.dromara.hertzbeat.alert.service.AlertDefineService;
import org.dromara.hertzbeat.common.entity.alerter.AlertDefine;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.springframework.beans.BeanUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.util.CollectionUtils;

import jakarta.annotation.Resource;
import java.io.InputStream;
import java.io.OutputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Configuration Import Export
 * 配置导入导出
 *
 * @author a-little-fool
 * Created by a-little-fool on 2023/12/25
 */
@Slf4j
public abstract class AlertDefineAbstractImExportServiceImpl implements AlertDefineImExportService {
    @Resource
    @Lazy
    private AlertDefineService alertDefineService;

    @Override
    public void importConfig(InputStream is) {
        var formList = parseImport(is)
                .stream()
                .map(this::convert)
                .collect(Collectors.toUnmodifiableList());
        if (!CollectionUtils.isEmpty(formList)) {
            formList.forEach(alertDefine -> {
                alertDefineService.validate(alertDefine, false);
                alertDefineService.addAlertDefine(alertDefine);
            });
        }
    }

    @Override
    public void exportConfig(OutputStream os, List<Long> configList) {
        var monitorList = configList.stream()
                .map(it -> alertDefineService.getAlertDefine(it))
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
    abstract List<ExportAlertDefineDTO> parseImport(InputStream is);

    /**
     * Export Configuration to Output Stream
     * 导出配置到输出流
     *
     * @param exportAlertDefineList 配置列表
     * @param os          输出流
     */
    abstract void writeOs(List<ExportAlertDefineDTO> exportAlertDefineList, OutputStream os);


    private ExportAlertDefineDTO convert(AlertDefine alertDefine) {
        var exportAlertDefine = new ExportAlertDefineDTO();
        var alertDefineDTO = new AlertDefineDTO();
        BeanUtils.copyProperties(alertDefine, alertDefineDTO);
        exportAlertDefine.setAlertDefine(alertDefineDTO);
        return exportAlertDefine;
    }

    private AlertDefine convert(ExportAlertDefineDTO exportAlertDefineDTO) {
        var alertDefine = new AlertDefine();
        var alertDefineDTO = exportAlertDefineDTO.getAlertDefine();
        BeanUtils.copyProperties(alertDefineDTO, alertDefine);
        return alertDefine;
    }

    protected String fileNamePrefix() {
        return "hertzbeat_alertDefine_" + LocalDate.now();
    }

    /**
     * Export data transfer objects for alert configurations
     */
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ExcelTarget(value = "ExportAlertDefineDTO")
    protected static class ExportAlertDefineDTO {
        @Excel(name = "AlertDefine")
        private AlertDefineDTO alertDefine;
    }

    /**
     * Data transfer object for alert configuration
     */
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ExcelTarget(value = "AlertDefineDTO")
    protected static class AlertDefineDTO {
        @Excel(name = "App")
        private String app;
        @Excel(name = "Metric")
        private String metric;
        @Excel(name = "Field")
        private String field;
        @Excel(name = "Preset")
        private Boolean preset;
        @Excel(name = "Expr")
        private String expr;
        @Excel(name = "Priority")
        private Byte priority;
        @Excel(name = "Times")
        private Integer times;
        @Excel(name = "Tags")
        private List<TagItem> tags;
        @Excel(name = "Enable")
        private Boolean enable;
        @Excel(name = "RecoverNotice")
        private Boolean recoverNotice;
        @Excel(name = "Template")
        private String template;
    }
}
