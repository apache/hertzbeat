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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.config.ManagerSseManager;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ExcelImExportServiceImpl;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test case for {@link ExcelImExportServiceImpl}
 */

class ExcelImExportServiceTest {

    @InjectMocks
    private ExcelImExportServiceImpl excelImExportService;

    @Mock
    private MonitorService monitorService;

    @Mock
    private ManagerSseManager managerSseManager;

    @BeforeEach
    public void setUp() {

        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testParseImport() throws IOException {

        Workbook workbook = new XSSFWorkbook();
        var sheet = workbook.createSheet();
        var headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("name");
        headerRow.createCell(1).setCellValue("app");
        headerRow.createCell(2).setCellValue("host");
        var dataRow = sheet.createRow(1);
        dataRow.createCell(0).setCellValue("Monitor1");
        dataRow.createCell(1).setCellValue("App1");
        dataRow.createCell(2).setCellValue("Host1");

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        workbook.write(bos);
        ByteArrayInputStream bis = new ByteArrayInputStream(bos.toByteArray());

        List<AbstractImExportServiceImpl.ExportMonitorDTO> result = excelImExportService.parseImport(bis);
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Monitor1", result.get(0).getMonitor().getName());
    }

    @Test
    public void testWriteOs() throws IOException {

        AbstractImExportServiceImpl.MonitorDTO monitorDTO = new AbstractImExportServiceImpl.MonitorDTO();
        monitorDTO.setName("Monitor1");
        monitorDTO.setApp("App1");
        monitorDTO.setHost("Host1");
        monitorDTO.setIntervals(10);
        monitorDTO.setStatus((byte) 1);
        monitorDTO.setLabels(Map.of("env", "prod"));

        AbstractImExportServiceImpl.ParamDTO paramDTO = new AbstractImExportServiceImpl.ParamDTO();
        paramDTO.setField("field1");
        paramDTO.setValue("value1");
        paramDTO.setType((byte) 1);

        AbstractImExportServiceImpl.ExportMonitorDTO exportMonitorDTO = new AbstractImExportServiceImpl.ExportMonitorDTO();
        exportMonitorDTO.setMonitor(monitorDTO);
        exportMonitorDTO.setParams(List.of(paramDTO));

        List<AbstractImExportServiceImpl.ExportMonitorDTO> monitorList = List.of(exportMonitorDTO);

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        excelImExportService.writeOs(monitorList, bos);

        ByteArrayInputStream bis = new ByteArrayInputStream(bos.toByteArray());
        Workbook workbook = WorkbookFactory.create(bis);
        var sheet = workbook.getSheetAt(0);
        var dataRow = sheet.getRow(1);

        assertEquals("Monitor1", dataRow.getCell(0).getStringCellValue());
        assertEquals("App1", dataRow.getCell(1).getStringCellValue());
        assertEquals("Host1", dataRow.getCell(2).getStringCellValue());
    }

    @Test
    public void testImportConfigAllValid() throws IOException {
        ByteArrayInputStream is = buildImportStream(List.of("Monitor1", "Monitor2"));
        excelImExportService.importConfig("task", is);
        verify(monitorService, times(2)).validate(any(MonitorDto.class), eq(false));
        verify(monitorService, times(2)).addMonitor(any(), any(), any(), any());
        verify(managerSseManager).broadcastImportTaskSuccess("task");
    }

    @Test
    public void testImportConfigRejectsDuplicateNameInFile() throws IOException {
        ByteArrayInputStream is = buildImportStream(List.of("DupMonitor", "DupMonitor"));
        assertThrows(IllegalArgumentException.class, () -> excelImExportService.importConfig("task", is));
        verify(monitorService, never()).addMonitor(any(), any(), any(), any());
        verify(managerSseManager, never()).broadcastImportTaskSuccess(any());
    }

    @Test
    public void testImportConfigRejectsWholeBatchWhenLaterEntryInvalid() throws IOException {
        doNothing().doThrow(new IllegalArgumentException("Monitoring name already exists!"))
                .when(monitorService).validate(any(MonitorDto.class), eq(false));
        ByteArrayInputStream is = buildImportStream(List.of("Monitor1", "Monitor2"));
        assertThrows(IllegalArgumentException.class, () -> excelImExportService.importConfig("task", is));
        verify(monitorService, never()).addMonitor(any(), any(), any(), any());
        verify(managerSseManager, never()).broadcastImportTaskSuccess(any());
    }

    private ByteArrayInputStream buildImportStream(List<String> names) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            var sheet = workbook.createSheet();
            var headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("name");
            headerRow.createCell(1).setCellValue("app");
            headerRow.createCell(2).setCellValue("host");
            for (int i = 0; i < names.size(); i++) {
                var dataRow = sheet.createRow(i + 1);
                dataRow.createCell(0).setCellValue(names.get(i));
                dataRow.createCell(1).setCellValue("App");
                dataRow.createCell(2).setCellValue("Host");
                dataRow.createCell(4).setCellValue(1);
            }
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return new ByteArrayInputStream(bos.toByteArray());
        }
    }

    @Test
    public void testWriteThenParsePreservesAllFields() throws IOException {

        AbstractImExportServiceImpl.MonitorDTO monitorDTO = new AbstractImExportServiceImpl.MonitorDTO();
        monitorDTO.setName("Monitor1");
        monitorDTO.setApp("linux");
        monitorDTO.setHost("Host1");
        monitorDTO.setIntervals(10);
        monitorDTO.setStatus((byte) 1);
        monitorDTO.setLabels(Map.of("env", "prod"));
        monitorDTO.setAnnotations(Map.of("owner", "ops"));
        monitorDTO.setScheduleType("cron");
        monitorDTO.setCronExpression("0 0/5 * * * ?");

        AbstractImExportServiceImpl.ParamDTO paramDTO = new AbstractImExportServiceImpl.ParamDTO();
        paramDTO.setField("host");
        paramDTO.setValue("192.168.1.1");
        paramDTO.setType((byte) 1);

        AbstractImExportServiceImpl.ExportMonitorDTO exportMonitorDTO = new AbstractImExportServiceImpl.ExportMonitorDTO();
        exportMonitorDTO.setMonitor(monitorDTO);
        exportMonitorDTO.setParams(List.of(paramDTO));

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        excelImExportService.writeOs(List.of(exportMonitorDTO), bos);

        ByteArrayInputStream bis = new ByteArrayInputStream(bos.toByteArray());
        List<AbstractImExportServiceImpl.ExportMonitorDTO> result = excelImExportService.parseImport(bis);

        assertNotNull(result);
        assertEquals(1, result.size());
        AbstractImExportServiceImpl.MonitorDTO parsed = result.get(0).getMonitor();
        assertEquals("prod", parsed.getLabels().get("env"));
        assertEquals("ops", parsed.getAnnotations().get("owner"));
        assertEquals("cron", parsed.getScheduleType());
        assertEquals("0 0/5 * * * ?", parsed.getCronExpression());
        // verify the shifted param columns still round-trip correctly
        assertEquals(1, result.get(0).getParams().size());
        assertEquals("host", result.get(0).getParams().get(0).getField());
        assertEquals("192.168.1.1", result.get(0).getParams().get(0).getValue());
    }

}
