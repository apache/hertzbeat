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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.hertzbeat.common.entity.job.Job;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MonitorDefinitionWriteServiceTest {

    private MonitorDefinitionSourceReader sourceReader;
    private MonitorDefinitionCommandPort commandPort;
    private MonitorDefinitionService service;

    @BeforeEach
    void setUp() {
        sourceReader = mock(MonitorDefinitionSourceReader.class);
        commandPort = mock(MonitorDefinitionCommandPort.class);
        service = new MonitorDefinitionService(sourceReader, commandPort);
    }

    @Test
    void revisionIsStableAndChangesWithEffectiveProvenanceOrDefinition() {
        MonitorDefinitionSource custom = source("MySql", "app: MySql", false, true);
        MonitorDefinitionSource override = source("MySql", "app: MySql", true, true);

        String first = MonitorDefinitionRevision.from(custom);

        assertEquals(first, MonitorDefinitionRevision.from(custom));
        assertEquals(first, MonitorDefinitionRevision.from(source("mysql", "app: MySql", false, true)));
        assertEquals(64, first.length());
        assertNotEquals(first, MonitorDefinitionRevision.from(override));
        assertNotEquals(first, MonitorDefinitionRevision.from(source("MySql", "app: MySql\nhelp: changed", false, true)));
    }

    @Test
    void canonicalIdentityIsIndependentOfTurkishDefaultLocale() {
        Locale previous = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertEquals("i-app", MonitorDefinitionIdentity.normalize("I-APP"));
        } finally {
            Locale.setDefault(previous);
        }
    }

    @Test
    void catalogAndDetailExposeSameRevisionWithoutBackingReads() {
        MonitorDefinitionSource source = source("custom", "app: custom", false, true);
        when(sourceReader.readAll()).thenReturn(List.of(source));

        String catalogRevision = service.catalog("en-US").items().getFirst().revision();
        String detailRevision = service.detail("custom", "en-US").revision();

        assertEquals(MonitorDefinitionRevision.from(source), catalogRevision);
        assertEquals(catalogRevision, detailRevision);
        verify(sourceReader, org.mockito.Mockito.times(2)).readAll();
    }

    @Test
    void createReturnsAuthoritativeDetailAndDelegatesDefinitionOnly() {
        MonitorDefinitionSource created = source("custom", "app: custom", false, true);
        when(commandPort.create("app: custom")).thenReturn(created);

        MonitorDefinitionDetailResponse response = service.create(new MonitorDefinitionWriteRequest("app: custom"), "en-US");

        assertEquals("custom", response.app());
        assertEquals(MonitorDefinitionOrigin.CUSTOM, response.origin());
        assertEquals(MonitorDefinitionRevision.from(created), response.revision());
        verify(commandPort).create("app: custom");
    }

    @Test
    void updateRequiresStrongRevisionAndReturnsNewAuthoritativeRevision() {
        MonitorDefinitionSource updated = source("custom", "app: custom\nhelp: changed", false, true);
        String expected = "a".repeat(64);
        when(commandPort.update("custom", expected, "app: custom\nhelp: changed")).thenReturn(updated);

        MonitorDefinitionDetailResponse response = service.update(
                "custom", '"' + expected + '"', new MonitorDefinitionWriteRequest(updated.definition()), "en-US");

        assertEquals(MonitorDefinitionRevision.from(updated), response.revision());
        verify(commandPort).update("custom", expected, updated.definition());
    }

    @Test
    void updateAndDeleteRejectMissingWeakMalformedRevisionBeforeCommand() {
        MonitorDefinitionWriteRequest request = new MonitorDefinitionWriteRequest("app: custom");

        assertError(MonitorDefinitionErrorCode.REVISION_REQUIRED,
                () -> service.update("custom", null, request, "en-US"));
        assertError(MonitorDefinitionErrorCode.REVISION_INVALID,
                () -> service.update("custom", "W/\"" + "a".repeat(64) + "\"", request, "en-US"));
        assertError(MonitorDefinitionErrorCode.REVISION_INVALID,
                () -> service.update("custom", "*", request, "en-US"));
        assertError(MonitorDefinitionErrorCode.REVISION_INVALID,
                () -> service.update("custom", "\"" + "a".repeat(64) + "\", \"" + "b".repeat(64) + "\"",
                        request, "en-US"));
        assertError(MonitorDefinitionErrorCode.REVISION_INVALID,
                () -> service.delete("custom", "not-a-revision"));
    }

    @Test
    void deleteDelegatesStrongRevisionAndReturnsStableDisposition() {
        String expected = "b".repeat(64);
        when(commandPort.delete("custom", expected)).thenReturn(new MonitorDefinitionDeleteResponse(
                1, "custom", MonitorDefinitionDeleteDisposition.REMOVED));

        MonitorDefinitionDeleteResponse response = service.delete("custom", '"' + expected + '"');

        assertEquals(MonitorDefinitionDeleteDisposition.REMOVED, response.disposition());
        verify(commandPort).delete("custom", expected);
    }

    private static void assertError(MonitorDefinitionErrorCode expected, Runnable action) {
        assertEquals(expected, assertThrows(MonitorDefinitionException.class, action::run).errorCode());
    }

    private static MonitorDefinitionSource source(String app, String definition, boolean builtin, boolean custom) {
        Job job = new Job();
        job.setApp(app);
        job.setName(Map.of("en-US", app));
        return new MonitorDefinitionSource(job, definition, builtin, custom);
    }
}
