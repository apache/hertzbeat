package org.dromara.hertzbeat.alert.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.RegionUtil;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
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
            List<Integer> startRowList = new ArrayList<>();

            for (Row row : sheet) {
                if (row.getRowNum() == 0) {
                    continue;
                }
                String app = getCellValueAsString(row.getCell(0));
                if (StringUtils.hasText(app)) {
                    startRowList.add(row.getRowNum());
                    AlertDefineDTO alertDefineDTO = extractAlertDefineDataFromRow(row);
                    ExportAlertDefineDTO exportAlertDefineDTO = new ExportAlertDefineDTO();
                    exportAlertDefineDTO.setAlertDefine(alertDefineDTO);
                    alertDefines.add(exportAlertDefineDTO);
                }
            }

            List<List<TagItem>> tagsList = new ArrayList<>();
            for (int i = 0; i < startRowList.size(); i++) {
                int startRowIndex = startRowList.get(i);
                int endRowIndex = (i + 1 < startRowList.size() ? startRowList.get(i + 1) : sheet.getLastRowNum() + 1);
                List<TagItem> tags = new ArrayList<>();

                for (int j = startRowIndex; j < endRowIndex; j++) {
                    Row row = sheet.getRow(j);
                    if (row == null) {
                        continue;
                    }
                    TagItem tagItem = extractTagDataFromRow(row);
                    if (tagItem != null) {
                        tags.add(tagItem);
                    }
                }
                tagsList.add(tags);
            }
            for (int i = 0; i < alertDefines.size(); i++) {
                alertDefines.get(i).getAlertDefine().setTags(tagsList.get(i));
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
        alertDefineDTO.setEnable(getCellValueAsBoolean(row.getCell(9)));
        alertDefineDTO.setRecoverNotice(getCellValueAsBoolean(row.getCell(10)));
        alertDefineDTO.setTemplate(getCellValueAsString(row.getCell(11)));

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
            String[] headers = {"app", "metric", "field", "preset", "expr", "priority", "times", "name", "value",
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
                // 获取标签信息
                List<TagItem> tagList = alertDefineDTO.getTags();
                int size = tagList == null ? 0 : tagList.size();
                // 将阀值规则信息和标签信息合并到一行中
                for (int i = 0; i < Math.max(size, 1); i++) {
                    Row row = sheet.createRow(rowIndex++);
                    if (i == 0) {
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
                        timesCell.setCellStyle(cellStyle);
                        Cell enableCell = row.createCell(9);
                        enableCell.setCellValue(alertDefineDTO.getEnable() != null
                                && alertDefineDTO.getEnable());
                        enableCell.setCellStyle(cellStyle);
                        Cell recoverNoticeCell = row.createCell(10);
                        recoverNoticeCell.setCellValue(alertDefineDTO.getRecoverNotice() != null
                                && alertDefineDTO.getRecoverNotice());
                        recoverNoticeCell.setCellStyle(cellStyle);
                        Cell templateCell = row.createCell(11);
                        templateCell.setCellValue(alertDefineDTO.getTemplate());
                        recoverNoticeCell.setCellStyle(cellStyle);
                    }
                    if (i < size) {
                        TagItem tagItem = tagList.get(i);
                        Cell nameCell = row.createCell(7);
                        nameCell.setCellValue(tagItem.getName());
                        nameCell.setCellStyle(cellStyle);
                        Cell valueCell = row.createCell(8);
                        valueCell.setCellValue(tagItem.getValue());
                        valueCell.setCellStyle(cellStyle);
                    }
                }
                if (null != tagList && !tagList.isEmpty()) {
                    RegionUtil.setBorderTop(BorderStyle.THICK, new CellRangeAddress(rowIndex - tagList.size(), rowIndex - 1, 0, 10), sheet);
                    RegionUtil.setBorderBottom(BorderStyle.THICK, new CellRangeAddress(rowIndex - tagList.size(), rowIndex - 1, 0, 10), sheet);
                    RegionUtil.setBorderLeft(BorderStyle.THICK, new CellRangeAddress(rowIndex - tagList.size(), rowIndex - 1, 0, 10), sheet);
                    RegionUtil.setBorderRight(BorderStyle.THICK, new CellRangeAddress(rowIndex - tagList.size(), rowIndex - 1, 0, 10), sheet);
                }
            }
            workbook.write(os);
            os.close();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }


}
