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

package org.dromara.hertzbeat.manager.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.RegionUtil;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Configure the import and export EXCEL format
 * 配置导入导出 EXCEL格式
 *
 * @author <a href="mailto:zqr10159@126.com">zqr10159</a>
 * Created by zqr10159 on 2023/4/11
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class ExcelImExportServiceImpl extends AbstractImExportServiceImpl{
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
                if (StringUtils.hasText(name)) {
                    startRowList.add(row.getRowNum());
                    MonitorDTO monitor = extractMonitorDataFromRow(row);
                    ExportMonitorDTO exportMonitor = new ExportMonitorDTO();
                    exportMonitor.setMonitor(monitor);
                    monitors.add(exportMonitor);
                    String metrics = getCellValueAsString(row.getCell(11));
                    if (StringUtils.hasText(metrics)) {
                        List<String> metricList = Arrays.stream(metrics.split(",")).collect(Collectors.toList());
                        exportMonitor.setMetrics(metricList);
                    }
                    boolean detected = getCellValueAsBoolean(row.getCell(12));
                    exportMonitor.setDetected(detected);
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

        String tagsString = getCellValueAsString(row.getCell(6));
        if (StringUtils.hasText(tagsString)) {
            List<Long> tags = Arrays.stream(tagsString.split(","))
                    .map(Long::parseLong)
                    .collect(Collectors.toList());
            monitor.setTags(tags);
        }
        monitor.setCollector(getCellValueAsString(row.getCell(7)));


        return monitor;
    }

    private ParamDTO extractParamDataFromRow(Row row) {
        String fieldName = getCellValueAsString(row.getCell(8));
        if (StringUtils.hasText(fieldName)) {
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


    /**
     * Export Configuration to Output Stream
     * 导出配置到输出流
     *
     * @param monitorList 配置列表
     * @param os          输出流
     */
    @Override
    void writeOs(List<ExportMonitorDTO> monitorList, OutputStream os) {
        try {
            Workbook workbook = WorkbookFactory.create(true);
            String sheetName = "Export Monitor";
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
            String[] headers = { "name", "app", "host", "intervals", "status", "description", "tags", "collector(default null if system dispatch)", "field", "type", "value", "metrics", "detected" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerCellStyle);
            }

            // 遍历监控列表，每个监控对象对应一行数据
            int rowIndex = 1;
            for (ExportMonitorDTO monitor : monitorList) {
                // 获取监控信息
                MonitorDTO monitorDTO = monitor.getMonitor();
                // 获取监控参数
                List<ParamDTO> paramList = monitor.getParams();
                // 获取监控指标
                List<String> metricList = monitor.getMetrics();
                // 将监控信息和参数信息合并到一行中
                for (int i = 0; i < Math.max(paramList.size(), 1); i++) {
                    Row row = sheet.createRow(rowIndex++);
                    if (i == 0) {
                        // 监控信息只需要填写一次
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
                        Cell tagsCell = row.createCell(6);
                        tagsCell.setCellValue(monitorDTO.getTags().stream().map(Object::toString).collect(Collectors.joining(",")));
                        tagsCell.setCellStyle(cellStyle);
                        Cell collectorCell = row.createCell(7);
                        collectorCell.setCellValue(monitorDTO.getCollector());
                        collectorCell.setCellStyle(cellStyle);
                        if (metricList != null && i < metricList.size()) {
                            Cell metricCell = row.createCell(11);
                            metricCell.setCellValue(String.join(",", metricList));
                            metricCell.setCellStyle(cellStyle);
                        }
                        Cell detectedCell = row.createCell(12);
                        detectedCell.setCellValue(monitor.getDetected() != null && monitor.getDetected());
                        detectedCell.setCellStyle(cellStyle);
                    }
                    // 填写参数信息
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
                if (paramList.size() > 0) {
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
