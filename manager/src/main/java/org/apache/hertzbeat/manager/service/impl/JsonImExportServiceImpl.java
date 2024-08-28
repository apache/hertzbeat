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

import static org.apache.hertzbeat.common.constants.ExportFileConstants.JsonFile.FILE_SUFFIX;
import static org.apache.hertzbeat.common.constants.ExportFileConstants.JsonFile.TYPE;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Configure the import and export JSON format
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class JsonImExportServiceImpl extends AbstractImExportServiceImpl {

    private final ObjectMapper objectMapper;

    @Override
    public List<ExportMonitorDTO> parseImport(InputStream is) {
        try {
            return objectMapper.readValue(is, new TypeReference<>(){});
        } catch (IOException ex) {
            log.error("import monitor failed.", ex);
            throw new RuntimeException("import monitor failed");
        }
    }

    @Override
    public void writeOs(List<ExportMonitorDTO> monitorList, OutputStream os) {
        try {
            objectMapper.writeValue(os, monitorList);
        } catch (IOException ex) {
            log.error("export monitor failed.", ex);
            throw new RuntimeException("export monitor failed");
        }
    }

    @Override
    public String type() {
        return TYPE;
    }

    @Override
    public String getFileName() {
        return fileNamePrefix() + FILE_SUFFIX;
    }

}
