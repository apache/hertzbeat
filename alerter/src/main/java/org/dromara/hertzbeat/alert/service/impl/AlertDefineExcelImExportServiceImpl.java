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

package org.dromara.hertzbeat.alert.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.*;


/**
 * Configure the import and export EXCEL format
 * 配置导入导出 EXCEL格式
 *
 * @author a-little-fool
 * Created by a-little-fool on 2023/12/25
 */
@Slf4j
@Service
public class AlertDefineExcelImExportServiceImpl extends AlertDefineAbstractImExportServiceImpl {
    public static final String TYPE = "EXCEL";
    public static final String FILE_SUFFIX = ".xlsx";

    /**
     * Export file type
     * 导出文件类型
     *
     * @return 文件类型
     */
    @Override
    public String type() {
        return TYPE;
    }

    /**
     * Get Export File Name
     * 获取导出文件名
     *
     * @return 文件名
     */
    @Override
    public String getFileName() {
        return fileNamePrefix() + FILE_SUFFIX;
    }


    /**
     * Parsing an input stream into a form
     * 将输入流解析为表单
     *
     * @param is 输入流
     * @return 表单
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
            return JsonUtil.fromJson(jsonStr, new TypeReference<List<TagItem>>() {});
        }
        return null;
    }


    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                return String.valueOf(cell.getNumericCellValue());
            default:
                return null;
        }
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
     * 导出配置到输出流
     *
     * @param exportAlertDefineList 配置列表
     * @param os          输出流
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
            // 设置表头样式
            CellStyle headerCellStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setAlignment(HorizontalAlignment.CENTER);
            // 设置表格内容样式
            CellStyle cellStyle = workbook.createCellStyle();
            cellStyle.setAlignment(HorizontalAlignment.CENTER);
            // 设置表头
            String[] headers = {"app", "metric", "field", "preset", "expr", "priority", "times", "tags",
                    "enable", "recoverNotice", "template"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerCellStyle);
            }

            // 遍历阀值规则列表，每个阀值规则对象对应一行数据
            int rowIndex = 1;
            for (ExportAlertDefineDTO alertDefine : exportAlertDefineList) {
                // 获取阀值规则信息
                AlertDefineDTO alertDefineDTO = alertDefine.getAlertDefine();
                // 阀值规则信息一行中
                Row row = sheet.createRow(rowIndex++);
                // 阀值规则信息只需要写一次
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
                // 获取标签信息
                List<TagItem> tagList = alertDefineDTO.getTags();
                String tagValue = tagList == null || tagList.size() == 0 ? "" : JsonUtil.toJson(tagList);
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
