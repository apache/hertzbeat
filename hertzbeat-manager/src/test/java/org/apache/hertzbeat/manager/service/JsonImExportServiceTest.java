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
import static org.mockito.Mockito.doNothing;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.config.ManagerSseManager;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl;
import org.apache.hertzbeat.manager.service.impl.JsonImExportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link JsonImExportServiceImpl}
 */
@ExtendWith(MockitoExtension.class)
class JsonImExportServiceTest {

    private JsonImExportServiceImpl jsonImExportService;

    @Mock
    private MonitorService monitorService;

    @Mock
    private ManagerSseManager managerSseManager;

    @BeforeEach
    public void setUp() throws Exception {
        jsonImExportService = new JsonImExportServiceImpl();
        Field monitorServiceField = jsonImExportService.getClass().getSuperclass().getDeclaredField("monitorService");
        monitorServiceField.setAccessible(true);
        monitorServiceField.set(jsonImExportService, monitorService);
        Field sseField = jsonImExportService.getClass().getSuperclass().getDeclaredField("managerSseManager");
        sseField.setAccessible(true);
        sseField.set(jsonImExportService, managerSseManager);
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

    @Test
    void testImportConfig_shouldSetInstanceFromHostAndPortParams() {
        String json = "[{\"monitor\":{\"name\":\"test\",\"app\":\"windows\",\"intervals\":6000,\"status\":1},"
                + "\"params\":[{\"field\":\"host\",\"type\":1,\"value\":\"localhost\"},"
                + "{\"field\":\"port\",\"type\":0,\"value\":\"161\"}]}]";

        ArgumentCaptor<Monitor> monitorCaptor = ArgumentCaptor.forClass(Monitor.class);
        ArgumentCaptor<List<Param>> paramsCaptor = ArgumentCaptor.forClass(List.class);
        doNothing().when(monitorService).addMonitor(monitorCaptor.capture(), paramsCaptor.capture(),
                org.mockito.Mockito.any(), org.mockito.Mockito.any());

        ByteArrayInputStream bis = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));
        jsonImExportService.importConfig("test.json", bis);

        Monitor captured = monitorCaptor.getValue();
        assertEquals("localhost:161", captured.getInstance());
        assertEquals("test", captured.getName());
        assertEquals("windows", captured.getApp());

        List<Param> capturedParams = paramsCaptor.getValue();
        assertNotNull(capturedParams);
        assertEquals(2, capturedParams.size());
    }

    @Test
    void testImportConfig_shouldSetInstanceWithHostOnly() {
        String json = "[{\"monitor\":{\"name\":\"test\",\"app\":\"linux\",\"intervals\":6000,\"status\":1},"
                + "\"params\":[{\"field\":\"host\",\"type\":1,\"value\":\"192.168.1.1\"}]}]";

        ArgumentCaptor<Monitor> monitorCaptor = ArgumentCaptor.forClass(Monitor.class);
        doNothing().when(monitorService).addMonitor(monitorCaptor.capture(),
                org.mockito.Mockito.any(), org.mockito.Mockito.any(), org.mockito.Mockito.any());

        ByteArrayInputStream bis = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));
        jsonImExportService.importConfig("test.json", bis);

        Monitor captured = monitorCaptor.getValue();
        assertEquals("192.168.1.1", captured.getInstance());
    }

    @Test
    void testImportConfig_shouldHandleNoHostParam() {
        String json = "[{\"monitor\":{\"name\":\"test\",\"app\":\"website\",\"intervals\":6000,\"status\":1},"
                + "\"params\":[{\"field\":\"url\",\"type\":1,\"value\":\"http://example.com\"}]}]";

        ArgumentCaptor<Monitor> monitorCaptor = ArgumentCaptor.forClass(Monitor.class);
        doNothing().when(monitorService).addMonitor(monitorCaptor.capture(),
                org.mockito.Mockito.any(), org.mockito.Mockito.any(), org.mockito.Mockito.any());

        ByteArrayInputStream bis = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));
        jsonImExportService.importConfig("test.json", bis);

        Monitor captured = monitorCaptor.getValue();
        assertEquals(null, captured.getInstance());
    }

    @Test
    void testImportConfig_shouldPreserveAnnotationsAndSchedule() {
        String json = "[{\"monitor\":{\"name\":\"test\",\"app\":\"linux\",\"intervals\":6000,\"status\":1,"
                + "\"labels\":{\"env\":\"prod\"},\"annotations\":{\"owner\":\"ops\"},"
                + "\"scheduleType\":\"cron\",\"cronExpression\":\"0 0/5 * * * ?\"},"
                + "\"params\":[{\"field\":\"host\",\"type\":1,\"value\":\"192.168.1.1\"}]}]";

        ArgumentCaptor<Monitor> monitorCaptor = ArgumentCaptor.forClass(Monitor.class);
        doNothing().when(monitorService).addMonitor(monitorCaptor.capture(),
                org.mockito.Mockito.any(), org.mockito.Mockito.any(), org.mockito.Mockito.any());

        ByteArrayInputStream bis = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));
        jsonImExportService.importConfig("test.json", bis);

        Monitor captured = monitorCaptor.getValue();
        assertEquals("prod", captured.getLabels().get("env"));
        assertEquals("ops", captured.getAnnotations().get("owner"));
        assertEquals("cron", captured.getScheduleType());
        assertEquals("0 0/5 * * * ?", captured.getCronExpression());
    }
}
