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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.hertzbeat.alert.dto.AlertDefineDTO;
import org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO;
import org.apache.hertzbeat.alert.service.impl.AlertDefineExcelImExportServiceImpl;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.export.ExcelExportUtils;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link AlertDefineExcelImExportServiceImpl}
 */
@ExtendWith(MockitoExtension.class)
public class AlertDefineExcelImExportServiceTest {

    @InjectMocks
    private AlertDefineExcelImExportServiceImpl alertDefineExcelImExportService;

    private Workbook workbook;
    private Sheet sheet;

    @BeforeEach
    public void setUp() throws IOException {

        Workbook initialWorkbook = WorkbookFactory.create(true);
        Sheet initialSheet = ExcelExportUtils.setSheet("Test sheet", initialWorkbook, AlertDefineDTO.class);

        Row row = initialSheet.createRow(1);
        row.createCell(0).setCellValue("app1");
        row.createCell(1).setCellValue("metric1");
        row.createCell(2).setCellValue("expr1");
        row.createCell(3).setCellValue(10);
        row.createCell(4).setCellValue(1);
        row.createCell(5).setCellValue(JsonUtil.toJson(Map.of("key", "value")));
        row.createCell(6).setCellValue(JsonUtil.toJson(Map.of("key", "value")));
        row.createCell(7).setCellValue("template1");
        row.createCell(8).setCellValue(true);

        ByteArrayInputStream inputStream = new ByteArrayInputStream(toByteArray(initialWorkbook));

        workbook = WorkbookFactory.create(inputStream);
        sheet = workbook.getSheetAt(0);
    }

    @Test
    public void testParseImport() throws IOException {

        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(toByteArray(workbook))) {
            List<ExportAlertDefineDTO> result = alertDefineExcelImExportService.parseImport(inputStream);

            assertEquals(1, result.size());
            AlertDefineDTO alertDefineDTO = result.get(0).getAlertDefine();
            assertEquals("app1", alertDefineDTO.getName());
            assertEquals("metric1", alertDefineDTO.getType());
            assertEquals("expr1", alertDefineDTO.getExpr());
            assertEquals(10, alertDefineDTO.getPeriod());
            assertEquals(1, alertDefineDTO.getTimes());
            assertEquals(Map.of("key", "value"), alertDefineDTO.getLabels());
            assertEquals(Map.of("key", "value"), alertDefineDTO.getAnnotations());
            assertEquals("template1", alertDefineDTO.getTemplate());
            assertTrue(alertDefineDTO.getEnable());
        }
    }

    @Test
    public void testWriteOs() throws IOException {

        List<ExportAlertDefineDTO> exportAlertDefineList = new ArrayList<>();
        ExportAlertDefineDTO exportAlertDefineDTO = new ExportAlertDefineDTO();
        AlertDefineDTO alertDefineDTO = new AlertDefineDTO();
        alertDefineDTO.setName("app1");
        alertDefineDTO.setType("metric1");
        alertDefineDTO.setExpr("expr1");
        alertDefineDTO.setPeriod(10);
        alertDefineDTO.setTimes(1);
        alertDefineDTO.setLabels(Map.of("key", "value"));
        alertDefineDTO.setAnnotations(Map.of("key", "value"));
        alertDefineDTO.setTemplate("template1");
        alertDefineDTO.setEnable(true);
        exportAlertDefineDTO.setAlertDefine(alertDefineDTO);
        exportAlertDefineList.add(exportAlertDefineDTO);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            alertDefineExcelImExportService.writeOs(exportAlertDefineList, outputStream);

            try (Workbook resultWorkbook = WorkbookFactory.create(new ByteArrayInputStream(outputStream.toByteArray()))) {
                Sheet resultSheet = resultWorkbook.getSheetAt(0);
                Row headerRow = resultSheet.getRow(0);
                assertEquals("Name", headerRow.getCell(0).getStringCellValue());
                assertEquals("Type", headerRow.getCell(1).getStringCellValue());
                assertEquals("Expr", headerRow.getCell(2).getStringCellValue());
                assertEquals("Period", headerRow.getCell(3).getStringCellValue());
                assertEquals("Times", headerRow.getCell(4).getStringCellValue());
                assertEquals("Labels", headerRow.getCell(5).getStringCellValue());
                assertEquals("Annotations", headerRow.getCell(6).getStringCellValue());
                assertEquals("Template", headerRow.getCell(7).getStringCellValue());
                assertEquals("Enable", headerRow.getCell(8).getStringCellValue());

                Row dataRow = resultSheet.getRow(1);
                assertEquals("app1", dataRow.getCell(0).getStringCellValue());
                assertEquals("metric1", dataRow.getCell(1).getStringCellValue());
                assertEquals("expr1", dataRow.getCell(2).getStringCellValue());
                assertEquals(10, (int) dataRow.getCell(3).getNumericCellValue());
                assertEquals(1, (int) dataRow.getCell(4).getNumericCellValue());
                assertEquals(JsonUtil.toJson(Map.of("key", "value")), dataRow.getCell(5).getStringCellValue());
                assertEquals(JsonUtil.toJson(Map.of("key", "value")), dataRow.getCell(6).getStringCellValue());
                assertEquals("template1", dataRow.getCell(7).getStringCellValue());
                assertTrue(dataRow.getCell(8).getBooleanCellValue());
            }
        }
    }

    private byte[] toByteArray(Workbook workbook) throws IOException {

        try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            workbook.write(bos);
            return bos.toByteArray();
        }
    }

}