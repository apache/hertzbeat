/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

        // set header
        Row headerRow = sheet.createRow(0);
        String[] headerArray = headers.toArray(new String[0]);
        for (int i = 0; i < headerArray.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headerArray[i]);
            cell.setCellStyle(headerCellStyle);
        }

        return sheet;
    }

}
