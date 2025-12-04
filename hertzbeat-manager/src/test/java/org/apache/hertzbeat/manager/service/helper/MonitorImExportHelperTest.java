/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.manager.service.helper;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hertzbeat.manager.config.ManagerSseManager;
import org.apache.hertzbeat.manager.service.ImExportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonitorImExportHelperTest {

    private MonitorImExportHelper helper;

    @Mock
    private ImExportService imExportService;

    @Mock
    private ManagerSseManager managerSseManager;

    @BeforeEach
    void setUp() {
        when(imExportService.type()).thenReturn("JSON");
        helper = new MonitorImExportHelper(List.of(imExportService), managerSseManager);
    }

    @Test
    void export_Success() throws Exception {
        HttpServletResponse response = mock(HttpServletResponse.class);
        ServletOutputStream outputStream = mock(ServletOutputStream.class);
        when(response.getOutputStream()).thenReturn(outputStream);
        when(imExportService.getFileName()).thenReturn("test.json");

        helper.export(List.of(1L), "JSON", response);

        verify(imExportService).exportConfig(eq(outputStream), anyList());
    }

    @Test
    void export_UnsupportedType() {
        HttpServletResponse response = mock(HttpServletResponse.class);
        assertThrows(IllegalArgumentException.class, () -> helper.export(List.of(1L), "XML", response));
    }

    @Test
    void importConfig_Success() throws Exception {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("test.json");
        InputStream inputStream = new ByteArrayInputStream("{}".getBytes());
        when(file.getInputStream()).thenReturn(inputStream);

        helper.importConfig(file);

        verify(imExportService).importConfig(eq("test.json"), any(InputStream.class));
    }

    @Test
    void importConfig_UnsupportedType() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("test.xml");

        assertThrows(RuntimeException.class, () -> helper.importConfig(file));
        verify(managerSseManager).broadcastImportTaskFail(eq("test.xml"), any());
    }
}
