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
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl;
import org.apache.hertzbeat.manager.service.impl.YamlImExportServiceImpl;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link YamlImExportServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class YamlImExportServiceTest {

    private static final String INVALID_YAML_MESSAGE = "Monitor YAML import content is invalid.";

    @InjectMocks
    private YamlImExportServiceImpl yamlImExportService;

    @Mock
    private MonitorService monitorService;

    @Mock
    private LabelService labelService;

    @Mock
    private ImportTaskService importTaskService;

    @Test
    void testType() {

        assertEquals("YAML", yamlImExportService.type());
    }

    @Test
    void testParseImport() {

        String yamlContent = """
                - monitor:
                    name: Monitor1
                    app: website
                  params: []
                - monitor:
                    name: Monitor2
                    app: port
                  params: []
                """;
        InputStream is = new ByteArrayInputStream(yamlContent.getBytes(StandardCharsets.UTF_8));

        List<AbstractImExportServiceImpl.ExportMonitorDTO> result = yamlImExportService.parseImport(is);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("Monitor1", result.get(0).getMonitor().getName());
        assertEquals("website", result.get(0).getMonitor().getApp());
        assertEquals("Monitor2", result.get(1).getMonitor().getName());
        assertEquals("port", result.get(1).getMonitor().getApp());
    }

    @Test
    void testParseImportNull() {

        InputStream is = new ByteArrayInputStream("".getBytes(StandardCharsets.UTF_8));

        List<AbstractImExportServiceImpl.ExportMonitorDTO> result = yamlImExportService.parseImport(is);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void importConfigMapsValidYamlIntoMonitorWritePipeline() {
        String yamlContent = """
                - monitor:
                    name: website-prod
                    app: website
                    host: example.com
                    intervals: 60
                    status: 1
                  params:
                    - field: host
                      type: 1
                      value: example.com
                """;

        assertDoesNotThrow(() -> yamlImExportService.importConfig(
                "monitors.yaml",
                new ByteArrayInputStream(yamlContent.getBytes(StandardCharsets.UTF_8))));

        ArgumentCaptor<MonitorDto> monitorDtoCaptor = ArgumentCaptor.forClass(MonitorDto.class);
        verify(monitorService).validate(monitorDtoCaptor.capture(), eq(false));
        MonitorDto monitorDto = monitorDtoCaptor.getValue();
        assertEquals("website-prod", monitorDto.getMonitor().getName());
        assertEquals("website", monitorDto.getMonitor().getApp());
        assertEquals("example.com", monitorDto.getMonitor().getInstance());
        assertEquals(1, monitorDto.getParams().size());
        verify(monitorService).addMonitor(any(Monitor.class), anyList(), isNull(), isNull());
        verify(importTaskService).complete("monitors.yaml");
    }

    @Test
    void importConfigTreatsEmptyYamlAsNoOp() {
        assertDoesNotThrow(() -> yamlImExportService.importConfig(
                "empty.yaml",
                new ByteArrayInputStream(new byte[0])));

        verifyNoInteractions(monitorService);
        verify(importTaskService).complete("empty.yaml");
    }

    @Test
    void importConfigRejectsInvalidFieldTypeWithoutInputLeakage() {
        String yamlContent = """
                - monitor:
                    name: website-prod
                    app: website
                    host: example.com
                    intervals: private-input-value
                  params: []
                """;

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> yamlImExportService.importConfig("monitors.yaml", inputStream(yamlContent)));

        assertEquals(INVALID_YAML_MESSAGE, exception.getMessage());
        assertFalse(exception.getMessage().contains("private-input-value"));
        verifyNoInteractions(monitorService, importTaskService);
    }

    @Test
    void importConfigRejectsRecordWithoutMonitorWithStableMessage() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> yamlImExportService.importConfig("monitors.yaml", inputStream("- foo: bar")));

        assertEquals(INVALID_YAML_MESSAGE, exception.getMessage());
        verifyNoInteractions(monitorService, importTaskService);
    }

    @Test
    void testWriteOs() {

        AbstractImExportServiceImpl.ParamDTO paramDTO = new AbstractImExportServiceImpl.ParamDTO();
        paramDTO.setType((byte) 1);
        paramDTO.setField("Test");
        paramDTO.setValue("Test");
        AbstractImExportServiceImpl.MonitorDTO monitorDTO = new AbstractImExportServiceImpl.MonitorDTO();
        monitorDTO.setLabels(Map.of("env", "prod"));
        monitorDTO.setIntervals(1);
        monitorDTO.setStatus((byte) 1);
        AbstractImExportServiceImpl.ExportMonitorDTO exportMonitorDto1 = new AbstractImExportServiceImpl.ExportMonitorDTO();
        exportMonitorDto1.setParams(List.of(paramDTO));
        exportMonitorDto1.setMonitor(monitorDTO);
        AbstractImExportServiceImpl.ExportMonitorDTO exportMonitorDto2 = new AbstractImExportServiceImpl.ExportMonitorDTO();
        exportMonitorDto2.setParams(List.of(paramDTO));
        exportMonitorDto2.setMonitor(monitorDTO);

        List<AbstractImExportServiceImpl.ExportMonitorDTO> monitorList = Arrays.asList(
                exportMonitorDto1,
                exportMonitorDto2
        );
        OutputStream os = new ByteArrayOutputStream();

        yamlImExportService.writeOs(monitorList, os);

        String output = os.toString();
        assertFalse(output.contains("metrics:\n  - Test1"));
        assertTrue(output.contains("  params:\n  - &id002\n    field: Test"));
    }

    private static InputStream inputStream(String content) {
        return new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
    }

}
