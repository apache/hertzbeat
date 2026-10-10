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

package org.apache.hertzbeat.manager.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardEntity;
import org.apache.hertzbeat.manager.dao.SignalDashboardDao;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link SignalDashboardServiceImpl}.
 */
@ExtendWith(MockitoExtension.class)
class SignalDashboardServiceImplTest {

    @Mock
    private SignalDashboardDao signalDashboardDao;

    @Spy
    private PersesDashboardDocumentValidator validator = new PersesDashboardDocumentValidator();

    @InjectMocks
    private SignalDashboardServiceImpl signalDashboardService;

    @Test
    void listSignalDashboardsReturnsWorkspaceSharedDashboards() {
        SignalDashboardEntity entity = SignalDashboardEntity.builder()
                .id(1L)
                .creator("teammate")
                .dashboardKey("signals-overview")
                .title("Signals overview")
                .description("Logs, traces, and metrics")
                .tags("logs,traces,metrics")
                .layout("[{\"i\":\"panel-1\",\"x\":0,\"y\":0,\"w\":6,\"h\":4}]")
                .widgets("[{\"id\":\"panel-1\",\"signal\":\"logs\"}]")
                .variables("[]")
                .panelMap("{}")
                .version("v1")
                .createTime(LocalDateTime.now().minusMinutes(1))
                .updateTime(LocalDateTime.now())
                .build();
        when(signalDashboardDao.findAllByOrderByUpdateTimeDesc()).thenReturn(List.of(entity));

        List<SignalDashboard> dashboards = signalDashboardService.listSignalDashboards("operator");

        assertEquals(1, dashboards.size());
        assertEquals("signals-overview", dashboards.get(0).getDashboardKey());
        assertEquals("v1", dashboards.get(0).getVersion());
        verify(signalDashboardDao).findAllByOrderByUpdateTimeDesc();
    }

    @Test
    void newKeyRequiresStandardDocument() {
        SignalDashboard request = SignalDashboard.builder().dashboardKey("new-legacy").title("Legacy")
                .layout("[]").widgets("[]").version("v1").build();
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> signalDashboardService.upsertSignalDashboard("operator", request));
        assertEquals("signal_dashboard_document_required", exception.getMessage());
        verify(signalDashboardDao, never()).saveAndFlush(any());
    }

    @Test
    void upsertSignalDashboardUpdatesExistingSharedCompositionWithoutChangingOwner() {
        SignalDashboardEntity existing = SignalDashboardEntity.builder()
                .id(3L)
                .revision(0L)
                .creator("teammate")
                .dashboardKey("signals-overview")
                .title("Old")
                .layout("[]")
                .widgets("[]")
                .createTime(LocalDateTime.now().minusDays(1))
                .updateTime(LocalDateTime.now().minusDays(1))
                .build();
        when(signalDashboardDao.findByDashboardKey("signals-overview"))
                .thenReturn(Optional.of(existing));
        when(signalDashboardDao.saveAndFlush(any(SignalDashboardEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SignalDashboard saved = signalDashboardService.upsertSignalDashboard("operator", SignalDashboard.builder().revision(0L)
                .dashboardKey("signals-overview")
                .title("Signals overview")
                .layout("[{\"i\":\"metrics-panel\"}]")
                .widgets("[{\"id\":\"metrics-panel\"}]")
                .build());

        assertEquals(3L, saved.getId());
        assertEquals("Signals overview", saved.getTitle());
        assertEquals("[{\"i\":\"metrics-panel\"}]", saved.getLayout());
        assertEquals("v1", saved.getVersion());
        assertEquals("teammate", existing.getCreator());
    }

    @Test
    void upsertSignalDashboardRejectsInvalidKey() {
        SignalDashboard request = SignalDashboard.builder()
                .dashboardKey("bad key")
                .title("Bad")
                .layout("[]")
                .widgets("[]")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardService.upsertSignalDashboard("operator", request));
    }

    @Test
    void upsertSignalDashboardRejectsMissingLayout() {
        SignalDashboard request = SignalDashboard.builder()
                .dashboardKey("signals-overview")
                .title("Bad")
                .widgets("[]")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardService.upsertSignalDashboard("operator", request));
    }

    @Test
    void upsertSignalDashboardRejectsMalformedCompositionJson() {
        SignalDashboard request = SignalDashboard.builder()
                .dashboardKey("signals-overview")
                .title("Bad")
                .layout("[{\"i\":\"logs-panel\"")
                .widgets("[{\"id\":\"logs-panel\"}]")
                .variables("[]")
                .panelMap("{}")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardService.upsertSignalDashboard("operator", request));
    }

    @Test
    void deleteSignalDashboardUsesSharedKey() {
        SignalDashboardEntity entity = SignalDashboardEntity.builder().dashboardKey("signals-overview").revision(0L).build();
        when(signalDashboardDao.findByDashboardKey("signals-overview")).thenReturn(Optional.of(entity));
        signalDashboardService.deleteSignalDashboard("operator", "signals-overview", 0);
        verify(signalDashboardDao).delete(entity);
        verify(signalDashboardDao).flush();
    }

    @Test
    void documentIsTheOnlyContentSourceAndDerivesMetadata() {
        SignalDashboard request = documentRequest();
        when(signalDashboardDao.saveAndFlush(any())).thenAnswer(invocation -> {
            SignalDashboardEntity entity = invocation.getArgument(0);
            assertNull(entity.getRevision());
            entity.setRevision(0L);
            return entity;
        });
        SignalDashboard saved = signalDashboardService.upsertSignalDashboard("operator", request);
        assertEquals(request.getDocument(), saved.getDocument());
        assertEquals("Empty dashboard", saved.getTitle());
        assertEquals("a,b", saved.getTags());
        assertEquals(0L, saved.getRevision());
        assertEquals("[]", saved.getWidgets());
    }

    @Test
    void documentRejectsSecondContentSourceBeforeRepositoryAccess() {
        SignalDashboard request = documentRequest();
        request.setWidgets("[]");
        assertThrows(IllegalArgumentException.class, () -> signalDashboardService.upsertSignalDashboard("operator", request));
        verifyNoMoreInteractions(signalDashboardDao);
    }

    @Test
    void invalidDocumentAndConflictingMetadataDoNotReachRepository() {
        SignalDashboard request = documentRequest();
        request.setTitle("Different");
        assertThrows(IllegalArgumentException.class, () -> signalDashboardService.upsertSignalDashboard("operator", request));
        request.setTitle(null);
        request.setVersion("v2");
        assertThrows(IllegalArgumentException.class, () -> signalDashboardService.upsertSignalDashboard("operator", request));
        verifyNoMoreInteractions(signalDashboardDao);
    }

    @Test
    void staleOrMissingRevisionDoesNotMutateStoredDocument() {
        SignalDashboardEntity existing = emptyLegacy();
        existing.setRevision(4L);
        when(signalDashboardDao.findByDashboardKey("empty")).thenReturn(Optional.of(existing));
        for (Long revision : new Long[]{null, 0L, -1L}) {
            SignalDashboard request = documentRequest();
            request.setRevision(revision);
            assertThrows(SignalDashboardConflictException.class,
                    () -> signalDashboardService.upsertSignalDashboard("operator", request));
            assertNull(existing.getDocument());
        }
        verify(signalDashboardDao, never()).saveAndFlush(any());
    }

    @Test
    void creationWithRevisionCannotRecreateDeletedAsset() {
        SignalDashboard request = documentRequest();
        request.setRevision(0L);
        assertThrows(SignalDashboardConflictException.class,
                () -> signalDashboardService.upsertSignalDashboard("operator", request));
        verify(signalDashboardDao, never()).saveAndFlush(any());
    }

    @Test
    void explicitEmptyLegacyUpgradePreservesOriginalFragments() {
        SignalDashboardEntity existing = emptyLegacy();
        existing.setLayout("[ ]");
        existing.setVariables("[  ]");
        existing.setPanelMap("{ }");
        when(signalDashboardDao.findByDashboardKey("empty")).thenReturn(Optional.of(existing));
        when(signalDashboardDao.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        SignalDashboard request = documentRequest();
        request.setRevision(0L);
        SignalDashboard saved = signalDashboardService.upsertSignalDashboard("operator", request);
        assertEquals(request.getDocument(), saved.getDocument());
        assertEquals("[ ]", saved.getLayout());
        assertEquals("[  ]", saved.getVariables());
        assertEquals("{ }", saved.getPanelMap());
        assertEquals("original", existing.getCreator());
    }

    @Test
    void firstLegacyUpgradeMustMatchTheExactEmptyConversion() {
        SignalDashboardEntity existing = emptyLegacy();
        when(signalDashboardDao.findByDashboardKey("empty")).thenReturn(Optional.of(existing));
        SignalDashboard request = documentRequest();
        request.setRevision(0L);
        ((tools.jackson.databind.node.ObjectNode) request.getDocument().path("spec")).put("duration", "1h");
        assertThrows(IllegalArgumentException.class, () -> signalDashboardService.upsertSignalDashboard("operator", request));
        assertNull(existing.getDocument());
    }

    @Test
    void nonemptyLegacyAndLossyTagsCannotBeUpgraded() {
        SignalDashboardEntity existing = emptyLegacy();
        when(signalDashboardDao.findByDashboardKey("empty")).thenReturn(Optional.of(existing));
        SignalDashboard request = documentRequest();
        request.setRevision(0L);
        existing.setWidgets("[{\"id\":\"draft\"}]");
        assertThrows(IllegalArgumentException.class, () -> signalDashboardService.upsertSignalDashboard("operator", request));
        existing.setWidgets("[]");
        request.setDocument(JsonUtil.fromJsonQuietly(request.getDocument().toString().replace("[\"a\",\"b\"]", "[\"a,b\"]")));
        assertThrows(IllegalArgumentException.class, () -> signalDashboardService.upsertSignalDashboard("operator", request));
        assertNull(existing.getDocument());
        verify(signalDashboardDao, never()).saveAndFlush(any());
    }

    @Test
    void readDoesNotValidateOrRewriteUnknownLegacyFragments() {
        SignalDashboardEntity existing = emptyLegacy();
        existing.setLayout("unknown historical bytes");
        existing.setVariables(null);
        when(signalDashboardDao.findAllByOrderByUpdateTimeDesc()).thenReturn(List.of(existing));
        SignalDashboard read = signalDashboardService.listSignalDashboards("operator").getFirst();
        assertEquals("unknown historical bytes", read.getLayout());
        assertNull(read.getVariables());
        assertNull(read.getDocument());
        verify(signalDashboardDao).findAllByOrderByUpdateTimeDesc();
        verifyNoMoreInteractions(signalDashboardDao);
    }

    @Test
    void legacyWriterCannotOverwriteUpgradedDocument() {
        SignalDashboardEntity existing = emptyLegacy();
        existing.setDocument(documentRequest().getDocument().toString());
        when(signalDashboardDao.findByDashboardKey("empty")).thenReturn(Optional.of(existing));
        SignalDashboard request = SignalDashboard.builder().dashboardKey("empty").title("Old writer")
                .layout("[]").widgets("[]").revision(0L).build();
        assertThrows(IllegalArgumentException.class, () -> signalDashboardService.upsertSignalDashboard("operator", request));
        assertEquals("Empty dashboard", existing.getTitle());
        verify(signalDashboardDao, never()).saveAndFlush(any());
    }

    @Test
    void staleDeleteCannotRemoveNewerOrMissingRecord() {
        when(signalDashboardDao.findByDashboardKey("empty")).thenReturn(Optional.of(emptyLegacy()), Optional.empty());
        assertThrows(SignalDashboardConflictException.class, () -> signalDashboardService.deleteSignalDashboard("operator", "empty", 1));
        assertThrows(SignalDashboardConflictException.class, () -> signalDashboardService.deleteSignalDashboard("operator", "empty", 0));
        assertThrows(IllegalArgumentException.class, () -> signalDashboardService.deleteSignalDashboard("operator", "empty", -1));
        verify(signalDashboardDao, never()).delete(any());
    }

    private SignalDashboardEntity emptyLegacy() {
        return SignalDashboardEntity.builder().dashboardKey("empty").creator("original").title("Empty dashboard")
                .description("").tags("a,b").layout("[]").widgets("[]").version("v1").revision(0L).build();
    }

    private SignalDashboard documentRequest() {
        return SignalDashboard.builder().dashboardKey("empty").version(PersesDashboardDocumentValidator.VERSION)
                .document(JsonUtil.fromJsonQuietly("""
                        {"kind":"Dashboard","metadata":{"name":"empty","project":"hertzbeat","tags":["a","b"]},
                        "spec":{"display":{"name":"Empty dashboard","description":""},"duration":"30m","variables":[],
                        "panels":{},"layouts":[{"kind":"Grid","spec":{"items":[]}}]}}
                        """)).build();
    }
}
