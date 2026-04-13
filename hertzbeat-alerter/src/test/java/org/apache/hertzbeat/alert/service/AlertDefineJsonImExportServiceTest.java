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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.alert.dto.AlertDefineDTO;
import org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO;
import org.apache.hertzbeat.alert.service.impl.AlertDefineJsonImExportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * test case for {@link AlertDefineJsonImExportServiceImpl}
 */

class AlertDefineJsonImExportServiceTest {

    private AlertDefineJsonImExportServiceImpl service;

    @SuppressWarnings("checkstyle:OperatorWrap")
    private static final String JSON_DATA = "[{\"alertDefine\":{\"name\":\"App1\",\"type\":\"realtime\"," +
            "\"expr\":\"Expr1\",\"period\":3000,\"times\":3," +
            "\"enable\":true,\"template\":\"Template1\"}}]";

    private InputStream inputStream;
    private List<ExportAlertDefineDTO> alertDefineList;

    @BeforeEach
    public void setup() {
        service = new AlertDefineJsonImExportServiceImpl();

        inputStream = new ByteArrayInputStream(JSON_DATA.getBytes(StandardCharsets.UTF_8));

        AlertDefineDTO alertDefine = new AlertDefineDTO();
        alertDefine.setName("App1");
        alertDefine.setType("realtime");
        alertDefine.setExpr("Expr1");
        alertDefine.setPeriod(3000);
        alertDefine.setTimes(3);
        alertDefine.setEnable(true);
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
        assertEquals("App1", result.get(0).getAlertDefine().getName());
        assertEquals("realtime", result.get(0).getAlertDefine().getType());
    }

    @Test
    void testParseImportFailed() {
        InputStream invalidInputStream = new ByteArrayInputStream("invalid json".getBytes(StandardCharsets.UTF_8));

        List<ExportAlertDefineDTO> result = service.parseImport(invalidInputStream);

        assertNull(result);
    }

    @Test
    void testWriteOs() {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        service.writeOs(alertDefineList, outputStream);

        String result = outputStream.toString(StandardCharsets.UTF_8);
        assertNotNull(result);
        assertTrue(result.contains("App1"));
        assertTrue(result.contains("realtime"));
    }

    @Test
    void testType() {
        assertEquals("JSON", service.type());
    }

    @Test
    void testGetFileName() {
        assertTrue(service.getFileName().endsWith(".json"));
    }
}
