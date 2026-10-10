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

package org.apache.hertzbeat.observability.logs.service.impl;

import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySource;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LogManagementWorkspaceDeletionTest {
    @AfterEach
    void clear() {
        AuthTokenRequestContext.clear();
        TelemetrySourceContext.clear();
    }

    @Test
    void deletionUsesAuthenticatedWorkspaceAndNeverUnscopedLegacyWriter() {
        var writer = mock(HistoryDataWriter.class);
        var timestamps = List.of(77L);
        when(writer.batchDeleteLogs("team-a", timestamps)).thenReturn(true);
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-a");
        assertTrue(new LogManagementServiceImpl(List.of(writer)).batchDelete(timestamps));
        verify(writer).batchDeleteLogs("team-a", timestamps);
        verify(writer, never()).batchDeleteLogs(timestamps);
    }

    @Test
    void selfDeletionCannotFallBackToExternalWriterAfterStorageFailure() {
        var externalWriter = mock(HistoryDataWriter.class);
        var selfWriter = mock(HistoryDataWriter.class);
        when(selfWriter.supportsSelfTelemetry()).thenReturn(true);
        when(selfWriter.batchDeleteLogs("team-a", List.of(77L)))
                .thenThrow(new IllegalStateException("append-only table"));
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-a");
        TelemetrySourceContext.bind(new TelemetrySourceContext.Route(TelemetrySource.SELF, "ci_self", "team-a"));
        var service = new LogManagementServiceImpl(List.of(externalWriter, selfWriter));
        assertThrows(IllegalStateException.class, () -> service.batchDelete(List.of(77L)));
        verify(externalWriter, never()).batchDeleteLogs("team-a", List.of(77L));
    }

    @Test
    void missingWorkspaceAndUnsupportedScopedWriterCannotDeleteAnything() {
        var writer = mock(HistoryDataWriter.class);
        var service = new LogManagementServiceImpl(List.of(writer));
        assertFalse(service.batchDelete(List.of(77L)));
        verifyNoInteractions(writer);
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-a");
        when(writer.batchDeleteLogs("team-a", List.of(77L))).thenThrow(new UnsupportedOperationException());
        assertThrows(UnsupportedOperationException.class, () -> service.batchDelete(List.of(77L)));
        verify(writer, never()).batchDeleteLogs(List.of(77L));
    }
}
