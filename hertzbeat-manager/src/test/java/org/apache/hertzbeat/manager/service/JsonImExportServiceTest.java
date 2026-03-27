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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl;
import org.apache.hertzbeat.manager.service.impl.JsonImExportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link JsonImExportServiceImpl}
 */

class JsonImExportServiceTest {

    private JsonImExportServiceImpl jsonImExportService;

    @BeforeEach
    public void setUp() {
        jsonImExportService = new JsonImExportServiceImpl();
    }

    @Test
    void testParseImport() {
        String json = "[{\"monitor\":{\"name\":\"Monitor1\",\"app\":\"App1\",\"host\":\"Host1\"}}]";
        ByteArrayInputStream bis = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));

        List<AbstractImExportServiceImpl.ExportMonitorDTO> result = jsonImExportService.parseImport(bis);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Monitor1", result.get(0).getMonitor().getName());
    }

    @Test
    void testParseImportInvalidJson() {
        String invalidJson = "invalid json";
        ByteArrayInputStream bis = new ByteArrayInputStream(invalidJson.getBytes(StandardCharsets.UTF_8));

        assertThrows(RuntimeException.class, () -> jsonImExportService.parseImport(bis));
    }

    @Test
    public void testWriteOs() {
        AbstractImExportServiceImpl.MonitorDTO monitorDTO = new AbstractImExportServiceImpl.MonitorDTO();
        monitorDTO.setName("Monitor1");
        monitorDTO.setApp("App1");
        monitorDTO.setHost("Host1");

        AbstractImExportServiceImpl.ExportMonitorDTO exportMonitorDTO = new AbstractImExportServiceImpl.ExportMonitorDTO();
        exportMonitorDTO.setMonitor(monitorDTO);

        List<AbstractImExportServiceImpl.ExportMonitorDTO> monitorList = List.of(exportMonitorDTO);

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        jsonImExportService.writeOs(monitorList, bos);

        String result = bos.toString(StandardCharsets.UTF_8);
        assertNotNull(result);
        assertTrue(result.contains("Monitor1"));
        assertTrue(result.contains("App1"));
    }

    @Test
    void testType() {
        assertEquals("JSON", jsonImExportService.type());
    }

}
