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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.manager.service.impl.AbstractImExportServiceImpl;
import org.apache.hertzbeat.manager.service.impl.YamlImExportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link YamlImExportServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class YamlImExportServiceTest {

    @InjectMocks
    private YamlImExportServiceImpl yamlImExportService;

    @BeforeEach
    void setUp() {

        yamlImExportService = new YamlImExportServiceImpl();
    }

    @Test
    void testType() {

        assertEquals("YAML", yamlImExportService.type());
    }

    @Test
    void testParseImport() {

        String yamlContent = "- id: 1\n  name: Monitor1\n- id: 2\n  name: Monitor2";
        InputStream is = new ByteArrayInputStream(yamlContent.getBytes(StandardCharsets.UTF_8));

        List<AbstractImExportServiceImpl.ExportMonitorDTO> result = yamlImExportService.parseImport(is);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("[{id=1, name=Monitor1}, {id=2, name=Monitor2}]", result.toString());
    }

    @Test
    void testParseImportNull() {

        InputStream is = new ByteArrayInputStream("".getBytes(StandardCharsets.UTF_8));

        List<AbstractImExportServiceImpl.ExportMonitorDTO> result = yamlImExportService.parseImport(is);

        assertNull(result);
    }

    @Test
    void testWriteOs() {

        AbstractImExportServiceImpl.ParamDTO paramDTO = new AbstractImExportServiceImpl.ParamDTO();
        paramDTO.setType((byte) 1);
        paramDTO.setField("Test");
        paramDTO.setValue("Test");
        AbstractImExportServiceImpl.MonitorDTO monitorDTO = new AbstractImExportServiceImpl.MonitorDTO();
        monitorDTO.setTags(List.of(1L, 2L));
        monitorDTO.setIntervals(1);
        monitorDTO.setStatus((byte) 1);
        AbstractImExportServiceImpl.ExportMonitorDTO exportMonitorDto1 = new AbstractImExportServiceImpl.ExportMonitorDTO();
        exportMonitorDto1.setParams(List.of(paramDTO));
        exportMonitorDto1.setMonitor(monitorDTO);
        exportMonitorDto1.setMetrics(List.of("Test1", "Test2"));
        AbstractImExportServiceImpl.ExportMonitorDTO exportMonitorDto2 = new AbstractImExportServiceImpl.ExportMonitorDTO();
        exportMonitorDto2.setParams(List.of(paramDTO));
        exportMonitorDto2.setMonitor(monitorDTO);
        exportMonitorDto2.setMetrics(List.of("Test1", "Test2"));

        List<AbstractImExportServiceImpl.ExportMonitorDTO> monitorList = Arrays.asList(
                exportMonitorDto1,
                exportMonitorDto2
        );
        OutputStream os = new ByteArrayOutputStream();

        yamlImExportService.writeOs(monitorList, os);

        String output = os.toString();
        assertTrue(output.contains("metrics:\n  - Test1"));
        assertTrue(output.contains("  params:\n  - &id002\n    field: Test"));
    }

}
