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

package org.apache.hertzbeat.manager.service.helper;

import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.ExportFileConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.util.FileUtil;
import org.apache.hertzbeat.manager.config.ManagerSseManager;
import org.apache.hertzbeat.manager.service.ImExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Helper class for monitor import and export operations
 */
@Component
@Slf4j
public class MonitorImExportHelper {

    private static final String CONTENT_VALUE = MediaType.APPLICATION_OCTET_STREAM_VALUE + SignConstants.SINGLE_MARK
            + "charset=" + StandardCharsets.UTF_8;

    private final Map<String, ImExportService> imExportServiceMap = new HashMap<>();
    private final ManagerSseManager managerSseManager;

    public MonitorImExportHelper(List<ImExportService> imExportServiceList, ManagerSseManager managerSseManager) {
        imExportServiceList.forEach(it -> imExportServiceMap.put(it.type(), it));
        this.managerSseManager = managerSseManager;
    }

    public void export(List<Long> ids, String type, HttpServletResponse res) throws Exception {
        var imExportService = imExportServiceMap.get(type);
        if (imExportService == null) {
            throw new IllegalArgumentException("not support export type: " + type);
        }
        var fileName = imExportService.getFileName();
        res.setHeader(HttpHeaders.CONTENT_DISPOSITION, CONTENT_VALUE);
        res.setContentType(CONTENT_VALUE);
        res.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment;filename=" + URLEncoder.encode(fileName, StandardCharsets.UTF_8));
        res.setHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION);
        imExportService.exportConfig(res.getOutputStream(), ids);
    }

    public void importConfig(MultipartFile file) throws Exception {
        var fileName = FileUtil.getFileName(file);
        var type = FileUtil.getFileType(file);
        try {
            if (!imExportServiceMap.containsKey(type)) {
                String errMsg = ExportFileConstants.FILE + " " + fileName + " is not supported.";
                throw new RuntimeException(errMsg);
            }
            var imExportService = imExportServiceMap.get(type);
            imExportService.importConfig(fileName, file.getInputStream());
        } catch (Exception e) {
            managerSseManager.broadcastImportTaskFail(fileName, e.getMessage());
            throw e;
        }
    }
}
