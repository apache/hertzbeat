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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.util.export.YamlExportUtils;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskService;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl.ExportMonitorDTO;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl.MonitorDTO;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl.ParamDTO;
import org.apache.hertzbeat.manager.service.impl.YamlImExportServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.yaml.snakeyaml.Yaml;

/**
 * Test case for {@link YamlImExportServiceImpl}.
 */
@ExtendWith(MockitoExtension.class)
class YamlImExportServiceTest {

    private static final String INVALID_YAML_MESSAGE = "Monitor YAML import content is invalid.";

    @InjectMocks
    private YamlImExportServiceImpl yamlImExportService;

    @Mock
    private MonitorService monitorService;

    @Mock
    private ImportTaskService importTaskService;

    @Test
    void testType() {
        assertEquals("YAML", yamlImExportService.type());
    }

    @Test
    void testParseImportCreatesTypedMonitorsAndParams() {
        String yaml = """
                - monitor:
                    name: Monitor1
                    app: linux
                    intervals: 60
                    status: 1
                    labels: {env: prod}
                  params:
                    - field: port
                      type: 0
                      value: '9100'
                - monitor:
                    name: Monitor2
                    app: linux
                """;

        List<ExportMonitorDTO> result = yamlImExportService.parseImport(input(yaml));

        assertEquals(2, result.size());
        assertEquals("Monitor1", result.get(0).getMonitor().getName());
        assertEquals(60, result.get(0).getMonitor().getIntervals());
        assertEquals(Map.of("env", "prod"), result.get(0).getMonitor().getLabels());
        ParamDTO param = result.get(0).getParams().get(0);
        assertEquals("port", param.getField());
        assertEquals((byte) 0, param.getType());
        assertEquals("9100", param.getValue());
        assertEquals("Monitor2", result.get(1).getMonitor().getName());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "plain text", "- null", "- 1",
            "- {}", "- monitor: null", "- monitor: invalid", "- monitor: {intervals: invalid}", "- monitor: ["})
    void testInvalidImportDoesNotPersistMonitors(String yaml) {
        assertThrows(IllegalArgumentException.class,
                () -> yamlImExportService.importConfig("invalid.yaml", input(yaml)));
        verifyNoInteractions(monitorService, importTaskService);
    }

    @ParameterizedTest
    @EmptySource
    @ValueSource(strings = {"   ", "# comment", "null", "[]"})
    void testEmptyImportIsCompletedAsNoOp(String yaml) {
        assertDoesNotThrow(() -> yamlImExportService.importConfig("empty.yaml", input(yaml)));
        verifyNoInteractions(monitorService);
        verify(importTaskService).complete("empty.yaml");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "- !!java.util.HashMap {monitor: {name: test}}",
            "- monitor: !!java.util.HashMap {name: test}",
            "- monitor: {name: test}\n  params: [!!java.net.URL 'https://example.com']"
    })
    void testRejectsUnapprovedGlobalTags(String yaml) {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> yamlImExportService.parseImport(input(yaml)));
        assertEquals(INVALID_YAML_MESSAGE, error.getMessage());
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void testExportImportRoundTrip(boolean legacy) {
        ExportMonitorDTO expected = exportedMonitor();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        if (legacy) {
            YamlExportUtils.exportWriteOs(List.of(expected), output);
        } else {
            yamlImExportService.writeOs(List.of(expected), output);
        }
        String yaml = output.toString(StandardCharsets.UTF_8);
        if (legacy) {
            assertTrue(yaml.contains("!!" + ExportMonitorDTO.class.getName()));
        } else {
            assertFalse(yaml.contains("!!"));
            List<?> plainData = new Yaml().load(yaml);
            assertInstanceOf(Map.class, plainData.get(0));
        }

        assertEquals(List.of(expected), yamlImExportService.parseImport(input(yaml)));
        yamlImExportService.importConfig("monitors.yaml", input(yaml));

        ArgumentCaptor<Monitor> monitorCaptor = ArgumentCaptor.forClass(Monitor.class);
        ArgumentCaptor<List<Param>> paramsCaptor = ArgumentCaptor.forClass(List.class);
        verify(monitorService).validate(any(MonitorDto.class), eq(false));
        verify(monitorService).addMonitor(monitorCaptor.capture(), paramsCaptor.capture(), eq("collector-1"), isNull());
        Monitor monitor = monitorCaptor.getValue();
        assertEquals("Monitor1", monitor.getName());
        assertEquals("linux", monitor.getApp());
        assertEquals("localhost:9100", monitor.getInstance());
        assertEquals(Map.of("env", "prod"), monitor.getLabels());
        assertEquals(Map.of("owner", "ops"), monitor.getAnnotations());
        assertEquals("cron", monitor.getScheduleType());
        assertEquals("0 */5 * * * ?", monitor.getCronExpression());
        assertEquals("HBA2-export-ciphertext", paramsCaptor.getValue().get(2).getParamValue());
        verify(importTaskService).complete("monitors.yaml");
    }

    @Test
    void testExportConfigProducesImportableYaml() {
        MonitorDto source = new MonitorDto();
        source.setMonitor(Monitor.builder().id(1L).name("Monitor1").app("linux").build());
        source.setParams(List.of());
        source.setCollector("collector-1");
        when(monitorService.getMonitorDtoForExport(1L)).thenReturn(source);
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        yamlImExportService.exportConfig(output, List.of(1L));
        yamlImExportService.importConfig("monitors.yaml", new ByteArrayInputStream(output.toByteArray()));

        verify(monitorService).addMonitor(any(Monitor.class), eq(List.of()), eq("collector-1"), isNull());
        verify(importTaskService).complete("monitors.yaml");
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
                () -> yamlImExportService.importConfig("monitors.yaml", input(yamlContent)));

        assertEquals(INVALID_YAML_MESSAGE, exception.getMessage());
        assertFalse(exception.getMessage().contains("private-input-value"));
        verifyNoInteractions(monitorService, importTaskService);
    }

    @Test
    void importConfigRejectsRecordWithoutMonitorWithStableMessage() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> yamlImExportService.importConfig("monitors.yaml", input("- foo: bar")));

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
        assertFalse(output.contains("!!"));
        assertTrue(output.contains("field: Test"));
        assertTrue(output.contains("params:"));
    }

    private ExportMonitorDTO exportedMonitor() {
        MonitorDTO monitor = new MonitorDTO();
        monitor.setName("Monitor1");
        monitor.setApp("linux");
        monitor.setHost("localhost");
        monitor.setIntervals(60);
        monitor.setStatus((byte) 1);
        monitor.setLabels(Map.of("env", "prod"));
        monitor.setAnnotations(Map.of("owner", "ops"));
        monitor.setScheduleType("cron");
        monitor.setCronExpression("0 */5 * * * ?");
        monitor.setCollector("collector-1");
        ExportMonitorDTO dto = new ExportMonitorDTO();
        dto.setMonitor(monitor);
        dto.setParams(List.of(param("host", (byte) 1, "localhost"), param("port", (byte) 0, "9100"),
                param("password", (byte) 2, "HBA2-export-ciphertext")));
        return dto;
    }

    private ParamDTO param(String field, byte type, String value) {
        ParamDTO param = new ParamDTO();
        param.setField(field);
        param.setType(type);
        param.setValue(value);
        return param;
    }

    private ByteArrayInputStream input(String yaml) {
        return new ByteArrayInputStream(yaml.getBytes(StandardCharsets.UTF_8));
    }
}
