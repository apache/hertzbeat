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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import org.apache.hertzbeat.alert.dto.AlertDefineDTO;
import org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO;
import org.apache.hertzbeat.alert.service.impl.AlertDefineJsonImExportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link AlertDefineJsonImExportServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class AlertDefineJsonImExportServiceTest {

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AlertDefineJsonImExportServiceImpl service;

    @SuppressWarnings("checkstyle:OperatorWrap")
    private static final String JSON_DATA = "[{\"alertDefine\":{\"app\":\"App1\",\"metric\":\"Metric1\"," +
            "\"field\":\"Field1\",\"preset\":true,\"expr\":\"Expr1\",\"priority\":1,\"times\":1,\"tags\":[]," +
            "\"enable\":true,\"recoverNotice\":true,\"template\":\"Template1\"}}]";

    private InputStream inputStream;
    private List<ExportAlertDefineDTO> alertDefineList;

    @BeforeEach
    public void setup() {

        inputStream = new ByteArrayInputStream(JSON_DATA.getBytes());

        AlertDefineDTO alertDefine = new AlertDefineDTO();
        alertDefine.setApp("App1");
        alertDefine.setMetric("Metric1");
        alertDefine.setField("Field1");
        alertDefine.setPreset(true);
        alertDefine.setExpr("Expr1");
        alertDefine.setPriority((byte) 1);
        alertDefine.setTimes(1);
        alertDefine.setEnable(true);
        alertDefine.setRecoverNotice(true);
        alertDefine.setTemplate("Template1");

        ExportAlertDefineDTO exportAlertDefine = new ExportAlertDefineDTO();
        exportAlertDefine.setAlertDefine(alertDefine);

        alertDefineList = List.of(exportAlertDefine);
    }

    @Test
    void testParseImport() throws IOException {

        when(objectMapper.readValue(
                any(InputStream.class),
                any(TypeReference.class))
        ).thenReturn(alertDefineList);

        List<ExportAlertDefineDTO> result = service.parseImport(inputStream);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(alertDefineList, result);
        verify(objectMapper, times(1)).readValue(any(InputStream.class), any(TypeReference.class));
    }

    @Test
    void testParseImportFailed() throws IOException {

        when(objectMapper.readValue(
                any(InputStream.class),
                any(TypeReference.class))
        ).thenThrow(new IOException("Test Exception"));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> service.parseImport(inputStream));

        assertEquals("import alertDefine failed", exception.getMessage());
        verify(objectMapper, times(1)).readValue(any(InputStream.class), any(TypeReference.class));
    }

    @Test
    void testWriteOs() throws IOException {

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        service.writeOs(alertDefineList, outputStream);

        verify(objectMapper, times(1)).writeValue(any(OutputStream.class), eq(alertDefineList));
    }

    @Test
    void testWriteOsFailed() throws IOException {

        doThrow(new IOException("Test Exception")).when(objectMapper).writeValue(any(OutputStream.class), any());

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> service.writeOs(alertDefineList, outputStream)
        );

        assertEquals("export alertDefine failed", exception.getMessage());
        verify(objectMapper, times(1)).writeValue(any(OutputStream.class), eq(alertDefineList));
    }

}
