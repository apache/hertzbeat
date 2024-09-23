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
import org.apache.hertzbeat.alert.dto.AlertDefineDTO;
import org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO;
import org.apache.hertzbeat.alert.service.impl.AlertDefineExcelImExportServiceImpl;
import org.apache.hertzbeat.common.entity.manager.TagItem;
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
        row.createCell(2).setCellValue("field1");
        row.createCell(3).setCellValue(true);
        row.createCell(4).setCellValue("expr1");
        row.createCell(5).setCellValue(1);
        row.createCell(6).setCellValue(10);
        row.createCell(7).setCellValue("[{\"name\":\"tag1\",\"value\":\"value1\"}]");
        row.createCell(8).setCellValue(true);
        row.createCell(9).setCellValue(true);
        row.createCell(10).setCellValue("template1");

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
            assertEquals("app1", alertDefineDTO.getApp());
            assertEquals("metric1", alertDefineDTO.getMetric());
            assertEquals("field1", alertDefineDTO.getField());
            assertTrue(alertDefineDTO.getPreset());
            assertEquals("expr1", alertDefineDTO.getExpr());
            assertEquals(10, alertDefineDTO.getTimes());
            assertEquals(1, alertDefineDTO.getTags().size());
            assertEquals("tag1", alertDefineDTO.getTags().get(0).getName());
            assertEquals("value1", alertDefineDTO.getTags().get(0).getValue());
            assertTrue(alertDefineDTO.getEnable());
            assertTrue(alertDefineDTO.getRecoverNotice());
            assertEquals("template1", alertDefineDTO.getTemplate());
        }
    }

    @Test
    public void testWriteOs() throws IOException {

        List<ExportAlertDefineDTO> exportAlertDefineList = new ArrayList<>();
        ExportAlertDefineDTO exportAlertDefineDTO = new ExportAlertDefineDTO();
        AlertDefineDTO alertDefineDTO = new AlertDefineDTO();
        alertDefineDTO.setApp("app1");
        alertDefineDTO.setMetric("metric1");
        alertDefineDTO.setField("field1");
        alertDefineDTO.setPreset(true);
        alertDefineDTO.setExpr("expr1");
        alertDefineDTO.setPriority((byte) 1);
        alertDefineDTO.setTimes(10);
        List<TagItem> tags = new ArrayList<>();
        TagItem tagItem = new TagItem();
        tagItem.setName("tag1");
        tagItem.setValue("value1");
        tags.add(tagItem);
        alertDefineDTO.setTags(tags);
        alertDefineDTO.setEnable(true);
        alertDefineDTO.setRecoverNotice(true);
        alertDefineDTO.setTemplate("template1");
        exportAlertDefineDTO.setAlertDefine(alertDefineDTO);
        exportAlertDefineList.add(exportAlertDefineDTO);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            alertDefineExcelImExportService.writeOs(exportAlertDefineList, outputStream);

            try (Workbook resultWorkbook = WorkbookFactory.create(new ByteArrayInputStream(outputStream.toByteArray()))) {
                Sheet resultSheet = resultWorkbook.getSheetAt(0);
                Row headerRow = resultSheet.getRow(0);
                assertEquals("app", headerRow.getCell(0).getStringCellValue());
                assertEquals("metric", headerRow.getCell(1).getStringCellValue());

                Row dataRow = resultSheet.getRow(1);
                assertEquals("app1", dataRow.getCell(0).getStringCellValue());
                assertEquals("metric1", dataRow.getCell(1).getStringCellValue());
                assertEquals("field1", dataRow.getCell(2).getStringCellValue());
                assertTrue(dataRow.getCell(3).getBooleanCellValue());
                assertEquals("expr1", dataRow.getCell(4).getStringCellValue());
                assertEquals(1, (int) dataRow.getCell(5).getNumericCellValue());
                assertEquals(10, (int) dataRow.getCell(6).getNumericCellValue());
                assertEquals("[{\"name\":\"tag1\",\"value\":\"value1\"}]", dataRow.getCell(7).getStringCellValue());
                assertTrue(dataRow.getCell(8).getBooleanCellValue());
                assertTrue(dataRow.getCell(9).getBooleanCellValue());
                assertEquals("template1", dataRow.getCell(10).getStringCellValue());
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
