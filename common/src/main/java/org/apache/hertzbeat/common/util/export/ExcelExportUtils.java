package org.apache.hertzbeat.common.util.export;

import java.util.ArrayList;
import java.util.List;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.util.ReflectionUtils;

/**
 * Excel export utils
 */

public final class ExcelExportUtils {

    private ExcelExportUtils() {
    }

    /**
     * set cell style
     * @param workbook workbook entity
     */
    public static CellStyle setCellStyle(Workbook workbook) {

        CellStyle cellStyle = workbook.createCellStyle();
        cellStyle.setAlignment(HorizontalAlignment.CENTER);
        return cellStyle;
    }

    /**
     * @param clazz Export entity class
     */
    public static <T extends Class<?>> Sheet setSheet(String sheetName, Workbook workbook, T clazz) {

        var sheet = workbook.createSheet(sheetName);
        sheet.setDefaultColumnWidth(20);
        sheet.setColumnWidth(9, 40 * 256);
        sheet.setColumnWidth(10, 40 * 256);

        // set header style
        CellStyle headerCellStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerCellStyle.setFont(headerFont);
        headerCellStyle.setAlignment(HorizontalAlignment.CENTER);

        List<String> headers = new ArrayList<>();
        ReflectionUtils.doWithFields(clazz, field -> {

            field.setAccessible(true);
            headers.add(field.getName());
        });
        headers.forEach(System.out::println);

        // set header
        Row headerRow = sheet.createRow(0);
        headers.forEach(header -> {
            Cell cell = headerRow.createCell(headers.indexOf(header));
            cell.setCellValue(header);
            cell.setCellStyle(headerCellStyle);
        });

        return sheet;
    }

}
