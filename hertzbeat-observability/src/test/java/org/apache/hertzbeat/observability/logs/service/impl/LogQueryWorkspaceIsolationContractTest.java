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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.Invocation;

class LogQueryWorkspaceIsolationContractTest {

    private static final String WORKSPACE = "team-a";
    private static final String COMPLEX_RESOURCE_FILTER = "service.version IN ('1.2.3', '1.2.4')";
    private static final String COMPLEX_ATTRIBUTE_FILTER = "http.route CONTAINS '/checkout'";

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void allComplexReadsUseOnlyTheCapturedWorkspaceReaderContract() {
        HistoryDataReader reader = workspaceAwareReader();
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        for (Consumer<LogQueryServiceImpl> operation : allComplexReads()) {
            AuthTokenRequestContext.bindWorkspaceId(WORKSPACE);
            clearInvocations(reader);

            operation.accept(service);

            List<Invocation> storageCalls = mockingDetails(reader).getInvocations().stream()
                    .filter(invocation -> invocation.getMethod().getName().startsWith("queryLogs"))
                    .toList();
            assertThat(storageCalls).isNotEmpty();
            assertThat(storageCalls)
                    .allSatisfy(invocation -> assertThat(Arrays.asList(invocation.getArguments())).contains(WORKSPACE));
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void complexPaginationCountsOnlyRowsFromTheScopedRead() {
        HistoryDataReader reader = workspaceAwareReader();
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));
        AuthTokenRequestContext.bindWorkspaceId(WORKSPACE);

        var page = service.list(null, null, null, null, null, null, null,
                null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER,
                0, 1, false, false);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).extracting(LogEntry::getBody).containsExactly("team-a");
        assertNoUnscopedStorageCall(reader);
    }

    @Test
    void unsupportedFirstReaderCanUseOnlyLaterScopedReader() {
        HistoryDataReader unsupported = mock(HistoryDataReader.class, invocation -> {
            if (invocation.getMethod().getName().startsWith("queryLogs")) {
                throw new UnsupportedOperationException("unsupported");
            }
            return null;
        });
        HistoryDataReader supported = workspaceAwareReader();
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(unsupported, supported));
        AuthTokenRequestContext.bindWorkspaceId(WORKSPACE);

        var page = service.list(null, null, null, null, null, null, null,
                null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER,
                0, 20, false, false);

        assertThat(page.getContent()).extracting(LogEntry::getBody).containsExactly("team-a");
        assertNoUnscopedStorageCall(unsupported);
        assertNoUnscopedStorageCall(supported);
    }

    @Test
    void allUnsupportedReadersAreUnavailableInsteadOfEmpty() {
        HistoryDataReader unsupported = mock(HistoryDataReader.class, invocation -> {
            if (invocation.getMethod().getName().startsWith("queryLogs")
                    || invocation.getMethod().getName().startsWith("countLog")) {
                throw new UnsupportedOperationException("unsupported");
            }
            return null;
        });
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(unsupported));
        AuthTokenRequestContext.bindWorkspaceId(WORKSPACE);

        assertThatThrownBy(() -> service.list(null, null, null, null, null, null, null,
                null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER,
                0, 20, false, false))
                .isInstanceOf(TelemetryStorageUnavailableException.class);
        assertNoUnscopedStorageCall(unsupported);
    }

    @Test
    void foreignEntityIsIndistinguishableFromMissingBeforeLogStorage() {
        HistoryDataReader reader = workspaceAwareReader();
        ObservabilityWorkspaceQueryGateway workspaceGateway = mock(ObservabilityWorkspaceQueryGateway.class);
        when(workspaceGateway.findEntityById(WORKSPACE, 42L)).thenReturn(Optional.empty());
        when(workspaceGateway.findIdentitiesByEntityId(WORKSPACE, 42L)).thenReturn(List.of());
        when(workspaceGateway.findEntityById(WORKSPACE, 99L)).thenReturn(Optional.empty());
        when(workspaceGateway.findIdentitiesByEntityId(WORKSPACE, 99L)).thenReturn(List.of());
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader), Optional.of(workspaceGateway));
        AuthTokenRequestContext.bindWorkspaceId(WORKSPACE);

        var foreign = service.list(42L, null, null, null, null, null, null, null,
                null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER,
                0, 20, false, false);
        var missing = service.list(99L, null, null, null, null, null, null, null,
                null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER,
                0, 20, false, false);

        assertThat(foreign).isEqualTo(missing);
        verify(workspaceGateway).findEntityById(WORKSPACE, 42L);
        verify(workspaceGateway).findEntityById(WORKSPACE, 99L);
        verify(workspaceGateway, never()).findIdentitiesByEntityId(WORKSPACE, 42L);
        verify(workspaceGateway, never()).findIdentitiesByEntityId(WORKSPACE, 99L);
        verify(workspaceGateway, never()).findEntityById(42L);
        verify(workspaceGateway, never()).findIdentitiesByEntityId(42L);
        verifyNoInteractions(reader);
    }

    @Test
    void callerWorkspaceAliasesAreRejectedBeforeStorage() {
        for (String reservedKey : Set.of(
                "hertzbeat.workspace_id", "hertzbeat_workspace_id", "workspace.id", "workspace_id")) {
            HistoryDataReader reader = workspaceAwareReader();
            LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));
            AuthTokenRequestContext.bindWorkspaceId(WORKSPACE);

            assertThatThrownBy(() -> service.list(null, null, null, null, null, null, null,
                    null, null, null, reservedKey + " IN ('team-b')", null,
                    0, 20, false, false))
                    .isInstanceOf(IllegalArgumentException.class);
            verifyNoInteractions(reader);
            AuthTokenRequestContext.clear();
        }
    }

    private HistoryDataReader workspaceAwareReader() {
        return mock(HistoryDataReader.class, invocation -> {
            if (!invocation.getMethod().getName().startsWith("queryLogs")) {
                return null;
            }
            boolean scoped = Arrays.asList(invocation.getArguments()).contains(WORKSPACE);
            if (scoped) {
                AuthTokenRequestContext.clear();
                return List.of(log("team-a", WORKSPACE));
            }
            return List.of(log("team-b", "team-b"));
        });
    }

    private List<Consumer<LogQueryServiceImpl>> allComplexReads() {
        return List.of(
                service -> service.list(null, null, null, null, null, null, null,
                        null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER,
                        0, 20, false, false),
                service -> service.context(1_734_005_477_630_000_000L, null, null,
                        null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER,
                        10, null, null, false, false),
                service -> service.overviewStats(null, null, null, null, null, null, null,
                        null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER, false, false),
                service -> service.traceCoverageStats(null, null, null, null, null, null, null,
                        null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER, false, false),
                service -> service.trendStats(null, null, null, null, null, null, null,
                        null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER, false, false),
                service -> service.groupByStats(null, null, null, null, null, null, null,
                        null, null, null, COMPLEX_RESOURCE_FILTER, COMPLEX_ATTRIBUTE_FILTER,
                        "service.name", 20, "count-desc", 1, false, false));
    }

    private LogEntry log(String body, String workspace) {
        return LogEntry.builder()
                .timeUnixNano(1_734_005_477_630_000_000L)
                .severityNumber(9)
                .severityText("INFO")
                .body(body)
                .resource(Map.of(
                        "hertzbeat.workspace_id", workspace,
                        "service.name", "checkout",
                        "service.version", "1.2.3"))
                .attributes(Map.of("http.route", "/checkout"))
                .build();
    }

    private void assertNoUnscopedStorageCall(HistoryDataReader reader) {
        assertThat(mockingDetails(reader).getInvocations().stream()
                .filter(invocation -> invocation.getMethod().getName().startsWith("queryLogs"))
                .map(Invocation::getArguments)
                .map(Arrays::asList))
                .allSatisfy(arguments -> assertThat(arguments).contains(WORKSPACE));
    }
}
