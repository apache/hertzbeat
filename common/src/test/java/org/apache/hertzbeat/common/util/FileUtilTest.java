package org.apache.hertzbeat.common.util;

import org.apache.hertzbeat.common.constants.ExportFileConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * test case for {@link FileUtil}.
 */

class FileUtilTest {

    private static final String JSON_TYPE = "application/json";
    private static final String EXCEL_TYPE = "application/vnd.ms-excel";
    private static final String YAML_TYPE = "application/x-yaml";

    private MockMultipartFile jsonFile;
    private MockMultipartFile excelFile;
    private MockMultipartFile yamlFile;
    private MockMultipartFile emptyFile;

    @BeforeEach
    void setUp() {

        jsonFile = new MockMultipartFile("file", "test.json", JSON_TYPE, "test content".getBytes());
        excelFile = new MockMultipartFile("file", "test.xlsx", EXCEL_TYPE, "test content".getBytes());
        yamlFile = new MockMultipartFile("file", "test.yaml", YAML_TYPE, "test content".getBytes());
        emptyFile = new MockMultipartFile("file", "", null, (byte[]) null);
    }

    @Test
    void testGetFileName() {

        assertEquals("test.json", FileUtil.getFileName(jsonFile));
        assertEquals("test.xlsx", FileUtil.getFileName(excelFile));
        assertEquals("test.yaml", FileUtil.getFileName(yamlFile));
        assertEquals("", FileUtil.getFileName(emptyFile));
    }

    @Test
    void testGetFileType() {

        assertEquals(ExportFileConstants.JsonFile.TYPE, FileUtil.getFileType(jsonFile));
        assertEquals(ExportFileConstants.ExcelFile.TYPE, FileUtil.getFileType(excelFile));
        assertEquals(ExportFileConstants.YamlFile.TYPE, FileUtil.getFileType(yamlFile));
        assertEquals("", FileUtil.getFileType(emptyFile));
    }

}
