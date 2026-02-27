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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.apache.hertzbeat.common.constants.ExportFileConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

/**
 * test case for {@link FileUtil}.
 */

class FileUtilTest {

    private static final String EXCEL_TYPE = "application/vnd.ms-excel";
    private static final String YAML_TYPE = "application/x-yaml";

    private MockMultipartFile jsonFile;
    private MockMultipartFile excelFile;
    private MockMultipartFile yamlFile;
    private MockMultipartFile emptyFile;

    @BeforeEach
    void setUp() {

        jsonFile = new MockMultipartFile("file", "test.json", MediaType.APPLICATION_JSON_VALUE,
                "test content".getBytes(StandardCharsets.UTF_8));
        excelFile = new MockMultipartFile("file", "test.xlsx", EXCEL_TYPE,
                "test content".getBytes(StandardCharsets.UTF_8));
        yamlFile = new MockMultipartFile("file", "test.yaml", YAML_TYPE,
                "test content".getBytes(StandardCharsets.UTF_8));
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
