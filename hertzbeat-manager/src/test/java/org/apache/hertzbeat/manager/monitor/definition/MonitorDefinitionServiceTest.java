/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.job.Job;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MonitorDefinitionServiceTest {

    private MonitorDefinitionSourceReader sourceReader;
    private MonitorDefinitionService service;

    @BeforeEach
    void setUp() {
        sourceReader = mock(MonitorDefinitionSourceReader.class);
        service = new MonitorDefinitionService(sourceReader);
    }

    @Test
    void catalogUsesActualSourceIntersectionAndStableLabelAppOrdering() {
        when(sourceReader.readAll()).thenReturn(List.of(
                source("zebra", "Zebra", true, false),
                source("beta", "Alpha", true, true),
                source("alpha", "Alpha", false, true)));

        MonitorDefinitionCatalogResponse response = service.catalog("en-US");

        assertEquals(1, response.schemaVersion());
        assertEquals(List.of("alpha", "beta", "zebra"),
                response.items().stream().map(MonitorDefinitionCatalogItem::app).toList());
        assertEquals(List.of(MonitorDefinitionOrigin.CUSTOM, MonitorDefinitionOrigin.OVERRIDE,
                        MonitorDefinitionOrigin.BUILTIN),
                response.items().stream().map(MonitorDefinitionCatalogItem::origin).toList());
        assertTrue(response.items().get(0).editable());
        assertTrue(response.items().get(1).deletable());
        assertFalse(response.items().get(2).editable());
        assertFalse(response.items().get(2).deletable());
    }

    @Test
    void detailResolvesCaseInsensitiveRequestToCanonicalIdentity() {
        when(sourceReader.readAll()).thenReturn(List.of(source("MySql", "MySQL", true, true)));

        MonitorDefinitionDetailResponse response = service.detail("mysql", "en-US");

        assertEquals("MySql", response.app());
        assertEquals("MySQL", response.label());
        assertEquals(MonitorDefinitionOrigin.OVERRIDE, response.origin());
        assertEquals("app: MySql", response.definition());
    }

    @Test
    void detailUnknownUsesStableSafeError() {
        when(sourceReader.readAll()).thenReturn(List.of());

        MonitorDefinitionException error = assertThrows(MonitorDefinitionException.class,
                () -> service.detail("missing", "en-US"));

        assertEquals(MonitorDefinitionErrorCode.NOT_FOUND, error.errorCode());
        assertFalse(error.getMessage().contains("missing"));
    }

    @Test
    void detailRejectsBlankAndUnsafeRequestedIdentityWithStableSafeError() {
        assertEquals(MonitorDefinitionErrorCode.INVALID_APP,
                assertThrows(MonitorDefinitionException.class, () -> service.detail(" ", "en-US")).errorCode());
        assertEquals(MonitorDefinitionErrorCode.INVALID_APP,
                assertThrows(MonitorDefinitionException.class, () -> service.detail("../jvm", "en-US")).errorCode());
    }

    @Test
    void createValidationRequiresValidNewCanonicalIdentityWithoutPersistence() {
        Job parsed = job("custom-app", "Custom App");
        when(sourceReader.readAll()).thenReturn(List.of(source("jvm", "JVM", true, false)));
        when(sourceReader.validate("app: custom-app")).thenReturn(parsed);

        MonitorDefinitionValidationResponse response = service.validate(new MonitorDefinitionValidationRequest(
                MonitorDefinitionOperation.CREATE, null, "app: custom-app"));

        assertEquals(1, response.schemaVersion());
        assertTrue(response.valid());
        assertEquals("custom-app", response.app());
        assertEquals(MonitorDefinitionOrigin.CUSTOM, response.origin());
        verify(sourceReader).validate("app: custom-app");
    }

    @Test
    void createValidationRejectsExpectedAppAndExistingIdentityCaseInsensitively() {
        when(sourceReader.readAll()).thenReturn(List.of(source("MySql", "MySQL", false, true)));
        when(sourceReader.validate("app: mysql")).thenReturn(job("mysql", "MySQL"));

        assertEquals(MonitorDefinitionErrorCode.EXPECTED_APP_UNEXPECTED,
                assertThrows(MonitorDefinitionException.class,
                        () -> service.validate(request(MonitorDefinitionOperation.CREATE, "mysql", "app: mysql")))
                        .errorCode());
        assertEquals(MonitorDefinitionErrorCode.CREATE_CONFLICT,
                assertThrows(MonitorDefinitionException.class,
                        () -> service.validate(request(MonitorDefinitionOperation.CREATE, null, "app: mysql")))
                        .errorCode());
    }

    @Test
    void updateValidationRequiresExactCanonicalExpectedAppAndMutableExistingTarget() {
        Job parsed = job("MySql", "MySQL");
        when(sourceReader.readAll()).thenReturn(List.of(source("MySql", "MySQL", true, true)));
        when(sourceReader.validate("app: MySql")).thenReturn(parsed);

        MonitorDefinitionValidationResponse response = service.validate(new MonitorDefinitionValidationRequest(
                MonitorDefinitionOperation.UPDATE, "MySql", "app: MySql"));

        assertEquals(MonitorDefinitionOrigin.OVERRIDE, response.origin());
        assertEquals("MySql", response.app());
    }

    @Test
    void updateValidationRejectsMismatchedMissingAndBuiltinTargets() {
        when(sourceReader.readAll()).thenReturn(List.of(
                source("custom-app", "Custom", false, true),
                source("jvm", "JVM", true, false)));
        when(sourceReader.validate("app: other")).thenReturn(job("other", "Other"));
        when(sourceReader.validate("app: missing")).thenReturn(job("missing", "Missing"));
        when(sourceReader.validate("app: jvm")).thenReturn(job("jvm", "JVM"));

        assertEquals(MonitorDefinitionErrorCode.UPDATE_TARGET_MISMATCH,
                assertThrows(MonitorDefinitionException.class,
                        () -> service.validate(request(MonitorDefinitionOperation.UPDATE, "custom-app", "app: other")))
                        .errorCode());
        assertEquals(MonitorDefinitionErrorCode.NOT_FOUND,
                assertThrows(MonitorDefinitionException.class,
                        () -> service.validate(request(MonitorDefinitionOperation.UPDATE, "missing", "app: missing")))
                        .errorCode());
        assertEquals(MonitorDefinitionErrorCode.IMMUTABLE,
                assertThrows(MonitorDefinitionException.class,
                        () -> service.validate(request(MonitorDefinitionOperation.UPDATE, "jvm", "app: jvm")))
                        .errorCode());
        assertEquals(MonitorDefinitionErrorCode.EXPECTED_APP_REQUIRED,
                assertThrows(MonitorDefinitionException.class,
                        () -> service.validate(request(MonitorDefinitionOperation.UPDATE, " ", "app: jvm")))
                        .errorCode());
    }

    @Test
    void validationFailureNeverReturnsParserDetailsOrDefinitionText() {
        when(sourceReader.validate("secret-definition"))
                .thenThrow(new IllegalArgumentException("parser details secret-definition"));

        MonitorDefinitionException error = assertThrows(MonitorDefinitionException.class,
                () -> service.validate(request(MonitorDefinitionOperation.CREATE, null, "secret-definition")));

        assertEquals(MonitorDefinitionErrorCode.INVALID_DEFINITION, error.errorCode());
        assertFalse(error.getMessage().contains("parser details"));
        assertFalse(error.getMessage().contains("secret-definition"));
    }

    private static MonitorDefinitionValidationRequest request(
            MonitorDefinitionOperation operation, String expectedApp, String definition) {
        return new MonitorDefinitionValidationRequest(operation, expectedApp, definition);
    }

    private static MonitorDefinitionSource source(String app, String label, boolean builtin, boolean custom) {
        return new MonitorDefinitionSource(job(app, label), "app: " + app, builtin, custom);
    }

    private static Job job(String app, String label) {
        Job job = new Job();
        job.setApp(app);
        job.setName(Map.of("en-US", label, "zh-CN", label));
        return job;
    }
}
