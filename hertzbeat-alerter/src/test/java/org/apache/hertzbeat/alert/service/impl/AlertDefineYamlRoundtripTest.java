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

package org.apache.hertzbeat.alert.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dto.AlertDefineDTO;
import org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.util.export.YamlExportUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class AlertDefineYamlRoundtripTest {

    private final AlertDefineYamlImExportServiceImpl service = new AlertDefineYamlImExportServiceImpl();

    @Test
    void ownExportImportsAllConfigurationFieldsWithoutJavaTags() {
        ExportAlertDefineDTO expected = config();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.writeOs(List.of(expected), output);
        assertFalse(output.toString(StandardCharsets.UTF_8).contains("!!"));
        assertEquals(List.of(expected), service.parseImport(new ByteArrayInputStream(output.toByteArray())));
    }

    @Test
    void legacyDtoTagsAreReadAsData() {
        ByteArrayOutputStream oldExport = new ByteArrayOutputStream();
        YamlExportUtils.exportWriteOs(List.of(config()), oldExport);
        assertEquals(List.of(config()), service.parseImport(new ByteArrayInputStream(oldExport.toByteArray())));
    }

    @Test
    void plainMappingConvertsToDto() {
        var imported = service.parseImport(input("- alertDefine:\n    name: fixture\n    expr: 'value > 1'\n"));
        assertEquals("fixture", imported.get(0).getAlertDefine().getName());
        assertEquals("value > 1", imported.get(0).getAlertDefine().getExpr());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "[]", "{}", "- missing: value", "- alertDefine: null", "- scalar"})
    void rejectsEmptyOrInvalidStructure(String yaml) {
        assertThrows(IllegalArgumentException.class, () -> service.parseImport(input(yaml)));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "- !!org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO []",
        "- !!org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO scalar",
        "- alertDefine: !!org.apache.hertzbeat.alert.dto.AlertDefineDTO []",
        "- alertDefine: !!org.apache.hertzbeat.alert.dto.AlertDefineDTO scalar"
    })
    void rejectsLegacyDtoTagOnNonMappingBeforePersistence(String yaml) {
        AlertDefineService persistence = mock(AlertDefineService.class);
        ReflectionTestUtils.setField(service, "alertDefineService", persistence);
        assertThrows(IllegalArgumentException.class, () -> service.importConfig(input(yaml)));
        verifyNoInteractions(persistence);
    }

    @Test
    void rejectsUnrelatedGlobalTags() {
        assertThrows(IllegalArgumentException.class,
                () -> service.parseImport(input("- !!java.util.Date '2026-01-01'")));
    }

    @Test
    void invalidLaterEntryDoesNotCallPersistence() {
        AlertDefineService persistence = mock(AlertDefineService.class);
        ReflectionTestUtils.setField(service, "alertDefineService", persistence);
        String yaml = "- alertDefine:\n    name: fixture\n- missing: value\n";
        assertThrows(IllegalArgumentException.class, () -> service.importConfig(input(yaml)));
        verifyNoInteractions(persistence);
    }

    @Test
    void exportedConfigurationReachesImportValidationAndSave() {
        AlertDefineService persistence = mock(AlertDefineService.class);
        ReflectionTestUtils.setField(service, "alertDefineService", persistence);
        AlertDefine original = new AlertDefine();
        BeanUtils.copyProperties(config().getAlertDefine(), original);
        when(persistence.getAlertDefine(7L)).thenReturn(original);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.exportConfig(output, List.of(7L));
        service.importConfig(new ByteArrayInputStream(output.toByteArray()));
        ArgumentCaptor<AlertDefine> saved = ArgumentCaptor.forClass(AlertDefine.class);
        verify(persistence).addAlertDefine(saved.capture());
        verify(persistence).validate(any(AlertDefine.class), org.mockito.ArgumentMatchers.eq(false));
        AlertDefineDTO actual = new AlertDefineDTO();
        BeanUtils.copyProperties(saved.getValue(), actual);
        assertEquals(config().getAlertDefine(), actual);
    }

    private static ByteArrayInputStream input(String text) {
        return new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8));
    }

    private static ExportAlertDefineDTO config() {
        AlertDefineDTO define = new AlertDefineDTO();
        define.setName("fixture");
        define.setType("periodic");
        define.setExpr("value > 1");
        define.setPeriod(60);
        define.setTimes(2);
        define.setLabels(Map.of("priority", "warning"));
        define.setAnnotations(Map.of("summary", "fixture alert"));
        define.setTemplate("fixture-template");
        define.setEnable(true);
        define.setDatasource("fixture-source");
        ExportAlertDefineDTO dto = new ExportAlertDefineDTO();
        dto.setAlertDefine(define);
        return dto;
    }
}
