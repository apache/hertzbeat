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

package org.apache.hertzbeat.alert.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.TagItem;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Configure the import and export EXCEL format
 */
@Slf4j
@Service
public class AlertDefineExcelImExportServiceImpl extends AlertDefineAbstractImExportServiceImpl {
    public static final String TYPE = "EXCEL";
    public static final String FILE_SUFFIX = ".xlsx";

    /**
     * Export file type
     * @return file type
     */
    @Override
    public String type() {
        return TYPE;
    }

    /**
     * Get Export File Name
     * @return file name
     */
    @Override
    public String getFileName() {
        return fileNamePrefix() + FILE_SUFFIX;
    }


    /**
     * Parsing an input stream into a form
     * @param is input stream
     * @return form list
     */
    @Override
    List<ExportAlertDefineDTO> parseImport(InputStream is) {
        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            List<ExportAlertDefineDTO> alertDefines = new ArrayList<>();
            for (Row row : sheet) {
                if (row.getRowNum() == 0) {
                    continue;
                }
                String app = getCellValueAsString(row.getCell(0));
                if (StringUtils.hasText(app)) {
                    AlertDefineDTO alertDefineDTO = extractAlertDefineDataFromRow(row);
                    ExportAlertDefineDTO exportAlertDefineDTO = new ExportAlertDefineDTO();
                    exportAlertDefineDTO.setAlertDefine(alertDefineDTO);
                    alertDefines.add(exportAlertDefineDTO);
                }
            }
            return alertDefines;
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse alertDefine data", e);
        }
    }

    private TagItem extractTagDataFromRow(Row row) {
        String name = getCellValueAsString(row.getCell(7));
        if (StringUtils.hasText(name)) {
            TagItem tagItem = new TagItem();
            tagItem.setName(name);
            tagItem.setValue(getCellValueAsString(row.getCell(8)));
            return tagItem;
        }
        return null;
    }

    private List<TagItem> extractTagDataFromRow(Cell cell) {
        String jsonStr = getCellValueAsString(cell);
        if (StringUtils.hasText(jsonStr)) {
            return JsonUtil.fromJson(jsonStr, new TypeReference<>() {
            });
        }
        return null;
    }


    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            default -> null;
        };
    }


    private boolean getCellValueAsBoolean(Cell cell) {
        if (cell == null) {
            return false;
        }
        if (Objects.requireNonNull(cell.getCellType()) == CellType.BOOLEAN) {
            return cell.getBooleanCellValue();
        }
        return false;
    }


    private Integer getCellValueAsInteger(Cell cell) {
        if (cell == null) {
            return null;
        }
        if (Objects.requireNonNull(cell.getCellType()) == CellType.NUMERIC) {
            return (int) cell.getNumericCellValue();
        }
        return null;
    }


    private Byte getCellValueAsByte(Cell cell) {
        if (cell == null) {
            return null;
        }
        if (Objects.requireNonNull(cell.getCellType()) == CellType.NUMERIC) {
            return (byte) cell.getNumericCellValue();
        }
        return null;
    }


    private AlertDefineDTO extractAlertDefineDataFromRow(Row row) {
        AlertDefineDTO alertDefineDTO = new AlertDefineDTO();
        alertDefineDTO.setApp(getCellValueAsString(row.getCell(0)));
        alertDefineDTO.setMetric(getCellValueAsString(row.getCell(1)));
        alertDefineDTO.setField(getCellValueAsString(row.getCell(2)));
        alertDefineDTO.setPreset(getCellValueAsBoolean(row.getCell(3)));
        alertDefineDTO.setExpr(getCellValueAsString(row.getCell(4)));
        alertDefineDTO.setPriority(getCellValueAsByte(row.getCell(5)));
        alertDefineDTO.setTimes(getCellValueAsInteger(row.getCell(6)));
        alertDefineDTO.setTags(extractTagDataFromRow(row.getCell(7)));
        alertDefineDTO.setEnable(getCellValueAsBoolean(row.getCell(8)));
        alertDefineDTO.setRecoverNotice(getCellValueAsBoolean(row.getCell(9)));
        alertDefineDTO.setTemplate(getCellValueAsString(row.getCell(10)));
        return alertDefineDTO;
    }


    /**
     * Export Configuration to Output Stream
     * @param exportAlertDefineList exportAlertDefineList
     * @param os          output stream
     */
    @Override
    void writeOs(List<ExportAlertDefineDTO> exportAlertDefineList, OutputStream os) {
        try {
            Workbook workbook = WorkbookFactory.create(true);
            String sheetName = "Export AlertDefine";
            Sheet sheet = workbook.createSheet(sheetName);
            sheet.setDefaultColumnWidth(20);
            sheet.setColumnWidth(9, 40 * 256);
            sheet.setColumnWidth(10, 40 * 256);
            // set header style
            CellStyle headerCellStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setAlignment(HorizontalAlignment.CENTER);
            // set cell style
            CellStyle cellStyle = workbook.createCellStyle();
            cellStyle.setAlignment(HorizontalAlignment.CENTER);
            // set header
            String[] headers = {"app", "metric", "field", "preset", "expr", "priority", "times", "tags",
                    "enable", "recoverNotice", "template"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerCellStyle);
            }

            // Traverse the threshold rule list, each threshold rule object corresponds to a row of data
            int rowIndex = 1;
            for (ExportAlertDefineDTO alertDefine : exportAlertDefineList) {
                AlertDefineDTO alertDefineDTO = alertDefine.getAlertDefine();
                Row row = sheet.createRow(rowIndex++);
                // Threshold rule information only needs to be written once
                Cell appCell = row.createCell(0);
                appCell.setCellValue(alertDefineDTO.getApp());
                appCell.setCellStyle(cellStyle);
                Cell metricCell = row.createCell(1);
                metricCell.setCellValue(alertDefineDTO.getMetric());
                metricCell.setCellStyle(cellStyle);
                Cell fieldCell = row.createCell(2);
                fieldCell.setCellValue(alertDefineDTO.getField());
                fieldCell.setCellStyle(cellStyle);
                Cell presetCell = row.createCell(3);
                presetCell.setCellValue(alertDefineDTO.getPreset() != null
                        && alertDefineDTO.getPreset());
                presetCell.setCellStyle(cellStyle);
                Cell exprCell = row.createCell(4);
                exprCell.setCellValue(alertDefineDTO.getExpr());
                exprCell.setCellStyle(cellStyle);
                Cell priorityCell = row.createCell(5);
                priorityCell.setCellValue(alertDefineDTO.getPriority());
                priorityCell.setCellStyle(cellStyle);
                Cell timesCell = row.createCell(6);
                timesCell.setCellValue(alertDefineDTO.getTimes());
                Cell tagCell = row.createCell(7);
                // get tags
                List<TagItem> tagList = alertDefineDTO.getTags();
                String tagValue = tagList == null || tagList.isEmpty() ? "" : JsonUtil.toJson(tagList);
                tagCell.setCellValue(tagValue);
                tagCell.setCellStyle(cellStyle);
                Cell enableCell = row.createCell(8);
                enableCell.setCellValue(alertDefineDTO.getEnable() != null
                        && alertDefineDTO.getEnable());
                enableCell.setCellStyle(cellStyle);
                Cell recoverNoticeCell = row.createCell(9);
                recoverNoticeCell.setCellValue(alertDefineDTO.getRecoverNotice() != null
                        && alertDefineDTO.getRecoverNotice());
                recoverNoticeCell.setCellStyle(cellStyle);
                Cell templateCell = row.createCell(10);
                templateCell.setCellValue(alertDefineDTO.getTemplate());
                recoverNoticeCell.setCellStyle(cellStyle);
            }
            workbook.write(os);
            os.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
