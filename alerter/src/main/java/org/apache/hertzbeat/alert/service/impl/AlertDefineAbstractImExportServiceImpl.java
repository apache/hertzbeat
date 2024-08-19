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

package org.apache.hertzbeat.alert.service.impl;

import jakarta.annotation.Resource;
import java.io.InputStream;
import java.io.OutputStream;
import java.time.LocalDate;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dto.AlertDefineDTO;
import org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO;
import org.apache.hertzbeat.alert.service.AlertDefineImExportService;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.beans.BeanUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.util.CollectionUtils;

/**
 * Configuration Import Export
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
                .toList();
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
                .toList();
        writeOs(monitorList, os);
    }


    /**
     * Parsing an input stream into a form
     *
     * @param is input stream
     * @return form list
     */
    abstract List<ExportAlertDefineDTO> parseImport(InputStream is);

    /**
     * Export Configuration to Output Stream
     * @param exportAlertDefineList configuration list
     * @param os          output stream
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

}
