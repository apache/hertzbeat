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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl;
import org.apache.hertzbeat.manager.service.impl.JsonImExportServiceImpl;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskService;
import org.apache.hertzbeat.manager.service.importtask.InvalidImportContentException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Test case for {@link JsonImExportServiceImpl}
 */
@ExtendWith(MockitoExtension.class)
class JsonImExportServiceTest {

    private JsonImExportServiceImpl jsonImExportService;

    @Mock
    private MonitorService monitorService;

    @Mock
    private ImportTaskService importTaskService;

    @BeforeEach
    public void setUp() throws Exception {
        jsonImExportService = new JsonImExportServiceImpl();
        Field monitorServiceField = jsonImExportService.getClass().getSuperclass().getDeclaredField("monitorService");
        monitorServiceField.setAccessible(true);
        monitorServiceField.set(jsonImExportService, monitorService);
        Field taskField = jsonImExportService.getClass().getSuperclass().getDeclaredField("importTaskService");
        taskField.setAccessible(true);
        taskField.set(jsonImExportService, importTaskService);
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

        IllegalArgumentException exception = assertThrows(
                InvalidImportContentException.class, () -> jsonImExportService.parseImport(bis));
        assertEquals(InvalidImportContentException.MESSAGE, exception.getMessage());
    }

    @Test
    void testParseImportRejectsMissingMonitorShape() {
        ByteArrayInputStream input = new ByteArrayInputStream("[{}]".getBytes(StandardCharsets.UTF_8));

        assertThrows(InvalidImportContentException.class, () -> jsonImExportService.parseImport(input));
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
    void importConfigRestoresInstanceFromLegacyHostParam() {
        MonitorService monitorService = org.mockito.Mockito.mock(MonitorService.class);
        ImportTaskService importTaskService = org.mockito.Mockito.mock(ImportTaskService.class);
        ReflectionTestUtils.setField(jsonImExportService, "monitorService", monitorService);
        ReflectionTestUtils.setField(jsonImExportService, "importTaskService", importTaskService);
        String json = """
                [{
                  "monitor": {
                    "name": "Codex import monitor",
                    "app": "website",
                    "intervals": 60,
                    "status": 1
                  },
                  "params": [
                    {"field": "host", "type": 1, "value": "127.0.0.1"},
                    {"field": "port", "type": 0, "value": "4223"}
                  ]
                }]
                """;

        jsonImExportService.importConfig("legacy-export.json", new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)));

        ArgumentCaptor<MonitorDto> validateCaptor = ArgumentCaptor.forClass(MonitorDto.class);
        ArgumentCaptor<Monitor> monitorCaptor = ArgumentCaptor.forClass(Monitor.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Param>> paramsCaptor = ArgumentCaptor.forClass(List.class);
        verify(monitorService).validate(validateCaptor.capture(), org.mockito.Mockito.eq(false));
        verify(monitorService).addMonitor(monitorCaptor.capture(), paramsCaptor.capture(), any(), any());
        assertEquals("127.0.0.1:4223", validateCaptor.getValue().getMonitor().getInstance());
        assertEquals("127.0.0.1:4223", monitorCaptor.getValue().getInstance());
        assertEquals("4223", paramsCaptor.getValue().stream()
                .filter(param -> "port".equals(param.getField()))
                .findFirst()
                .orElseThrow()
                .getParamValue());
    }

    @Test
    void exportConfigPreservesMonitorInstanceAsHost() {
        MonitorService monitorService = org.mockito.Mockito.mock(MonitorService.class);
        ReflectionTestUtils.setField(jsonImExportService, "monitorService", monitorService);
        Monitor monitor = Monitor.builder()
                .id(42L)
                .name("Codex export monitor")
                .app("website")
                .instance("127.0.0.1:4223")
                .intervals(60)
                .status((byte) 1)
                .build();
        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(List.of(Param.builder().field("host").type((byte) 1).paramValue("127.0.0.1").build()));
        when(monitorService.getMonitorDtoForExport(42L)).thenReturn(monitorDto);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();

        jsonImExportService.exportConfig(bos, List.of(42L));

        String result = bos.toString(StandardCharsets.UTF_8);
        assertTrue(result.contains("\"host\":\"127.0.0.1:4223\""));
        assertTrue(result.contains("\"name\":\"Codex export monitor\""));
    }

    @Test
    void testExportConfigPreservesEncryptedCredentialForImportRoundTrip() {
        String ciphertext = "HBA2-export-ciphertext";
        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(Monitor.builder().id(1L).name("ollama").app("ollama").build());
        MonitorParam secret = new MonitorParam();
        secret.setField("apiKey");
        secret.setType(org.apache.hertzbeat.common.constants.CommonConstants.PARAM_TYPE_PASSWORD);
        secret.setParamValue(ciphertext);
        monitorDto.setParamInfos(List.of(secret));
        org.mockito.Mockito.when(monitorService.getMonitorDtoForExport(1L)).thenReturn(monitorDto);
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        jsonImExportService.exportConfig(output, List.of(1L));

        assertTrue(output.toString(StandardCharsets.UTF_8).contains(ciphertext));
    }

    @Test
    void testImportConfigPreservesEncryptedCredentialForImportRoundTrip() {
        String ciphertext = "HBA2-import-ciphertext";
        String json = "[{\"monitor\":{\"name\":\"ollama-import\",\"app\":\"ollama\","
                + "\"intervals\":6000,\"status\":1},\"params\":[{\"field\":\"apiKey\","
                + "\"type\":2,\"value\":\"" + ciphertext + "\"}]}]";
        ArgumentCaptor<List<Param>> paramsCaptor = ArgumentCaptor.forClass(List.class);
        doNothing().when(monitorService).addMonitor(
                org.mockito.Mockito.any(), paramsCaptor.capture(),
                org.mockito.Mockito.any(), org.mockito.Mockito.any());

        jsonImExportService.importConfig(
                "ollama.json", new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)));

        assertEquals(ciphertext, paramsCaptor.getValue().get(0).getParamValue());
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
