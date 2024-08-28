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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.alert.dto.AlertDefineDTO;
import org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO;
import org.apache.hertzbeat.alert.service.impl.AlertDefineYamlImExportServiceImpl;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.yaml.snakeyaml.Yaml;

/**
 * test case for {@link AlertDefineYamlImExportServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class AlertDefineYamlImExportServiceTest {

    @InjectMocks
    private AlertDefineYamlImExportServiceImpl service;

    private static final String YAML_DATA =
            """
                    - alertDefine:
                        app: App1
                        metric: Metric1
                        field: Field1
                        preset: true
                        expr: Expr1
                        priority: 1
                        times: 1
                        tags: []
                        enable: true
                        recoverNotice: true
                        template: Template1
                    """;

    private InputStream inputStream;
    private List<ExportAlertDefineDTO> alertDefineList;

    @BeforeEach
    public void setup() {

        inputStream = new ByteArrayInputStream(YAML_DATA.getBytes(StandardCharsets.UTF_8));

        AlertDefineDTO alertDefine = new AlertDefineDTO();
        alertDefine.setApp("App1");
        alertDefine.setMetric("Metric1");
        alertDefine.setField("Field1");
        alertDefine.setPreset(true);
        alertDefine.setExpr("Expr1");
        alertDefine.setPriority((byte) 1);
        alertDefine.setTimes(1);
        alertDefine.setTags(List.of());
        alertDefine.setEnable(true);
        alertDefine.setRecoverNotice(true);
        alertDefine.setTemplate("Template1");

        ExportAlertDefineDTO exportAlertDefine = new ExportAlertDefineDTO();
        exportAlertDefine.setAlertDefine(alertDefine);

        alertDefineList = List.of(exportAlertDefine);
    }

    @Test
    void testParseImport() {

        List<ExportAlertDefineDTO> result = service.parseImport(inputStream);

        assertNotNull(result);
        assertEquals(1, result.size());

        InputStream inputStream = new ByteArrayInputStream(JsonUtil.toJson(alertDefineList)
                .getBytes(StandardCharsets.UTF_8));
        Yaml yaml = new Yaml();

        assertEquals(yaml.load(inputStream), result);
    }

    @Test
    void testParseImportFailed() {

        InputStream faultyInputStream = mock(InputStream.class);
        try {
            when(faultyInputStream.read(
                    any(byte[].class),
                    anyInt(), anyInt())
            ).thenThrow(new IOException("Test Exception"));

            RuntimeException exception = assertThrows(
                    RuntimeException.class,
                    () -> service.parseImport(faultyInputStream)
            );
            assertEquals("java.io.IOException: Test Exception", exception.getMessage());
        } catch (IOException e) {

            fail("Mocking IOException failed");
        }
    }

    @Test
    void testWriteOs() {

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        service.writeOs(alertDefineList, outputStream);
        String yamlOutput = outputStream.toString(StandardCharsets.UTF_8);

        assertTrue(yamlOutput.contains("app: App1"));
        assertTrue(yamlOutput.contains("metric: Metric1"));
    }

    @Test
    void testWriteOsFailed() {

        OutputStream faultyOutputStream = mock(OutputStream.class);

        try {
            doThrow(new IOException("Test Exception")).when(faultyOutputStream).write(any(byte[].class), anyInt(), anyInt());

            RuntimeException exception = assertThrows(RuntimeException.class, () -> service.writeOs(alertDefineList, faultyOutputStream));
            assertEquals("java.io.IOException: Test Exception", exception.getMessage());
        } catch (IOException e) {

            fail("Mocking IOException failed");
        }
    }

}
