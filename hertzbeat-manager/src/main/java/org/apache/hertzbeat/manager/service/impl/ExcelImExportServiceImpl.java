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

package org.apache.hertzbeat.manager.service.impl;

import static org.apache.hertzbeat.common.constants.ExportFileConstants.ExcelFile.FILE_SUFFIX;
import static org.apache.hertzbeat.common.constants.ExportFileConstants.ExcelFile.TYPE;
import com.fasterxml.jackson.core.type.TypeReference;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.RegionUtil;
import org.springframework.stereotype.Service;

/**
 * Configure the import and export EXCEL format
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class ExcelImExportServiceImpl extends AbstractImExportServiceImpl{

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
     * @return form
     */
    @Override
    public List<ExportMonitorDTO> parseImport(InputStream is) {
        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            List<ExportMonitorDTO> monitors = new ArrayList<>();
            List<Integer> startRowList = new ArrayList<>();

            for (Row row : sheet) {
                if (row.getRowNum() == 0) {
                    continue;
                }
                String name = getCellValueAsString(row.getCell(0));
                if (StringUtils.isNotBlank(name)) {
                    startRowList.add(row.getRowNum());
                    MonitorDTO monitor = extractMonitorDataFromRow(row);
                    ExportMonitorDTO exportMonitor = new ExportMonitorDTO();
                    exportMonitor.setMonitor(monitor);
                    monitors.add(exportMonitor);
                }
            }
            List<List<ParamDTO>> paramsList = new ArrayList<>();
            for (int i = 0; i < startRowList.size(); i++) {
                int startRowIndex = startRowList.get(i);
                int endRowIndex = (i + 1 < startRowList.size()) ? startRowList.get(i + 1) : sheet.getLastRowNum() + 1;
                List<ParamDTO> params = new ArrayList<>();

                for (int j = startRowIndex; j < endRowIndex; j++) {
                    Row row = sheet.getRow(j);
                    if (row == null) {
                        continue;
                    }
                    ParamDTO param = extractParamDataFromRow(row);
                    if (param != null) {
                        params.add(param);
                    }
                }
                paramsList.add(params);
            }
            for (int i = 0; i < monitors.size(); i++) {
                monitors.get(i).setParams(paramsList.get(i));
            }
            return monitors;
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse monitor data", e);
        }
    }

    private MonitorDTO extractMonitorDataFromRow(Row row) {
        MonitorDTO monitor = new MonitorDTO();

        monitor.setName(getCellValueAsString(row.getCell(0)));
        monitor.setApp(getCellValueAsString(row.getCell(1)));
        monitor.setHost(getCellValueAsString(row.getCell(2)));
        monitor.setIntervals(getCellValueAsInteger(row.getCell(3)));
        monitor.setStatus(getCellValueAsByte(row.getCell(4)));
        monitor.setDescription(getCellValueAsString(row.getCell(5)));

        String labelsString = getCellValueAsString(row.getCell(6));
        if (StringUtils.isNotBlank(labelsString)) {
            try {
                TypeReference<Map<String, String>> typeReference = new TypeReference<>() {};
                Map<String, String> labels = JsonUtil.fromJson(labelsString, typeReference);
                monitor.setLabels(labels);
            } catch (Exception ignored) {}
        }
        monitor.setCollector(getCellValueAsString(row.getCell(7)));
        return monitor;
    }

    private ParamDTO extractParamDataFromRow(Row row) {
        String fieldName = getCellValueAsString(row.getCell(8));
        if (StringUtils.isNotBlank(fieldName)) {
            ParamDTO param = new ParamDTO();
            param.setField(fieldName);
            param.setType(getCellValueAsByte(row.getCell(9)));
            param.setValue(getCellValueAsString(row.getCell(10)));
            return param;
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

    /**
     * Export Configuration to Output Stream
     * @param monitorList config list
     * @param os          output stream
     */
    @Override
    public void writeOs(List<ExportMonitorDTO> monitorList, OutputStream os) {
        try {

            Workbook workbook = WorkbookFactory.create(true);
            String sheetName = "Export Monitor";
            Sheet sheet = workbook.createSheet(sheetName);
            sheet.setDefaultColumnWidth(20);
            sheet.setColumnWidth(6, 40 * 256);
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
            String[] headers = { "Name", "App", "Host", "Intervals", "Status", "Description", "Labels", "Collector", "Param-Field", "Param-Type", "Param-Value" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerCellStyle);
            }

            // foreach monitor, each monitor object corresponds to a row of data
            int rowIndex = 1;
            for (ExportMonitorDTO monitor : monitorList) {
                // get monitor information
                MonitorDTO monitorDTO = monitor.getMonitor();
                // get monitor parameters
                List<ParamDTO> paramList = monitor.getParams();
                // merge monitor information and parameter information into one row
                for (int i = 0; i < Math.max(paramList.size(), 1); i++) {
                    Row row = sheet.createRow(rowIndex++);
                    if (i == 0) {
                        // You need to fill in the monitoring information only once
                        Cell nameCell = row.createCell(0);
                        nameCell.setCellValue(monitorDTO.getName());
                        nameCell.setCellStyle(cellStyle);
                        Cell appCell = row.createCell(1);
                        appCell.setCellValue(monitorDTO.getApp());
                        appCell.setCellStyle(cellStyle);
                        Cell hostCell = row.createCell(2);
                        hostCell.setCellValue(monitorDTO.getHost());
                        hostCell.setCellStyle(cellStyle);
                        Cell intervalsCell = row.createCell(3);
                        intervalsCell.setCellValue(monitorDTO.getIntervals());
                        intervalsCell.setCellStyle(cellStyle);
                        Cell statusCell = row.createCell(4);
                        statusCell.setCellValue(monitorDTO.getStatus());
                        statusCell.setCellStyle(cellStyle);
                        Cell descriptionCell = row.createCell(5);
                        descriptionCell.setCellValue(monitorDTO.getDescription());
                        descriptionCell.setCellStyle(cellStyle);
                        Cell labelsCell = row.createCell(6);
                        labelsCell.setCellValue(JsonUtil.toJson(monitorDTO.getLabels()));
                        labelsCell.setCellStyle(cellStyle);
                        Cell collectorCell = row.createCell(7);
                        collectorCell.setCellValue(monitorDTO.getCollector());
                        collectorCell.setCellStyle(cellStyle);
                    }
                    // Fill in parameter information
                    if (i < paramList.size()) {
                        ParamDTO paramDTO = paramList.get(i);
                        Cell fieldCell = row.createCell(8);
                        fieldCell.setCellValue(paramDTO.getField());
                        fieldCell.setCellStyle(cellStyle);
                        Cell typeCell = row.createCell(9);
                        typeCell.setCellValue(paramDTO.getType());
                        typeCell.setCellStyle(cellStyle);
                        Cell valueCell = row.createCell(10);
                        valueCell.setCellValue(paramDTO.getValue());
                        valueCell.setCellStyle(cellStyle);
                    }
                }
                if (CollectionUtils.isNotEmpty(paramList)) {
                    RegionUtil.setBorderTop(BorderStyle.THICK, new CellRangeAddress(rowIndex - paramList.size(), rowIndex - 1, 0, 10), sheet);
                    RegionUtil.setBorderBottom(BorderStyle.THICK, new CellRangeAddress(rowIndex - paramList.size(), rowIndex - 1, 0, 10), sheet);
                    RegionUtil.setBorderLeft(BorderStyle.THICK, new CellRangeAddress(rowIndex - paramList.size(), rowIndex - 1, 0, 10), sheet);
                    RegionUtil.setBorderRight(BorderStyle.THICK, new CellRangeAddress(rowIndex - paramList.size(), rowIndex - 1, 0, 10), sheet);
                }
            }
            workbook.write(os);
            os.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

}
