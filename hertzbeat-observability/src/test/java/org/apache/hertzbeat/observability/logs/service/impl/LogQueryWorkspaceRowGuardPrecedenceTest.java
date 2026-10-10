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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Answers;
import org.mockito.invocation.Invocation;
import org.springframework.data.domain.Page;

class LogQueryWorkspaceRowGuardPrecedenceTest {

    @ParameterizedTest(name = "{0}")
    @MethodSource("trimmedWorkspacePrecedenceCases")
    void everyWorkspaceAliasUsesTrimmedCanonicalPrecedence(
            String name, Map<String, Object> resource, String ownerWorkspace, String foreignWorkspace) {
        HistoryDataReader reader = scopedPagedReader(List.of(log(name, resource)));
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        assertThat(list(service, ownerWorkspace).getContent())
                .extracting(LogEntry::getBody)
                .containsExactly(name);
        assertThat(list(service, foreignWorkspace).getContent()).isEmpty();
        assertOnlyScopedStorageCalls(reader, Set.of(ownerWorkspace, foreignWorkspace));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void promotedLegacyWorkspaceWinsWhenCanonicalIsMissingOrBlank(boolean blankCanonical) {
        Map<String, Object> resource = new HashMap<>();
        if (blankCanonical) {
            resource.put("hertzbeat.workspace_id", "");
        }
        resource.put("hertzbeat_workspace_id", "team-a");
        resource.put("workspace.id", "team-b");
        resource.put("workspace_id", "team-b");
        HistoryDataReader reader = scopedPagedReader(List.of(log("promoted", resource)));
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        assertThat(list(service, "team-a").getContent())
                .extracting(LogEntry::getBody)
                .containsExactly("promoted");
        assertThat(list(service, "team-b").getContent()).isEmpty();
        assertOnlyScopedStorageCalls(reader, Set.of("team-a", "team-b"));
    }

    @Test
    void canonicalWorkspaceWinsOverEveryConflictingLegacyAlias() {
        HistoryDataReader reader = scopedPagedReader(List.of(log("canonical", Map.of(
                "hertzbeat.workspace_id", "team-b",
                "hertzbeat_workspace_id", "team-a",
                "workspace.id", "team-a",
                "workspace_id", "team-a"))));
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        assertThat(list(service, "team-a").getContent()).isEmpty();
        assertThat(list(service, "team-b").getContent())
                .extracting(LogEntry::getBody)
                .containsExactly("canonical");
        assertOnlyScopedStorageCalls(reader, Set.of("team-a", "team-b"));
    }

    @Test
    void missingEveryWorkspaceKeyBelongsOnlyToDefaultCompatibilityScope() {
        HistoryDataReader reader = scopedPagedReader(List.of(log("legacy-default", Map.of(
                "service.name", "checkout"))));
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        assertThat(list(service, "default").getContent())
                .extracting(LogEntry::getBody)
                .containsExactly("legacy-default");
        assertThat(list(service, "team-a").getContent()).isEmpty();
        assertOnlyScopedStorageCalls(reader, Set.of("default", "team-a"));
    }

    private static Stream<Arguments> trimmedWorkspacePrecedenceCases() {
        Map<String, Object> nullCanonical = new HashMap<>();
        nullCanonical.put("hertzbeat.workspace_id", null);
        nullCanonical.put("hertzbeat_workspace_id", "  team-a  ");
        nullCanonical.put("workspace.id", "team-b");
        nullCanonical.put("workspace_id", "team-b");
        return Stream.of(
                Arguments.of("null canonical", nullCanonical, "team-a", "team-b"),
                Arguments.of("empty promoted", Map.of(
                        "hertzbeat.workspace_id", " ",
                        "hertzbeat_workspace_id", "",
                        "workspace.id", " team-a ",
                        "workspace_id", "team-b"), "team-a", "team-b"),
                Arguments.of("whitespace dotted alias", Map.of(
                        "hertzbeat.workspace_id", "",
                        "hertzbeat_workspace_id", "  ",
                        "workspace.id", " \t ",
                        "workspace_id", " team-a "), "team-a", "team-b"),
                Arguments.of("padded canonical conflict", Map.of(
                        "hertzbeat.workspace_id", " team-b ",
                        "hertzbeat_workspace_id", "team-a",
                        "workspace.id", "team-a",
                        "workspace_id", "team-a"), "team-b", "team-a"),
                Arguments.of("all aliases blank", Map.of(
                        "hertzbeat.workspace_id", " ",
                        "hertzbeat_workspace_id", "",
                        "workspace.id", " \t ",
                        "workspace_id", "  "), "default", "team-a"));
    }

    private HistoryDataReader scopedPagedReader(List<LogEntry> rows) {
        return mock(HistoryDataReader.class, invocation -> {
            String methodName = invocation.getMethod().getName();
            if (methodName.startsWith("countLogs")) {
                return (long) rows.size();
            }
            if (methodName.startsWith("queryLogs")) {
                return rows;
            }
            return Answers.RETURNS_DEFAULTS.answer(invocation);
        });
    }

    private Page<LogEntry> list(LogQueryServiceImpl service, String workspaceId) {
        return service.list(workspaceId,
                null, null, null, null, null, null, null, null, null, null, null, null, null,
                0, 20, false, false);
    }

    private LogEntry log(String body, Map<String, Object> resource) {
        return LogEntry.builder()
                .timeUnixNano(1_734_005_477_630_000_000L)
                .severityNumber(9)
                .body(body)
                .resource(resource)
                .build();
    }

    private void assertOnlyScopedStorageCalls(HistoryDataReader reader, Set<String> expectedWorkspaces) {
        List<Invocation> calls = mockingDetails(reader).getInvocations().stream()
                .filter(invocation -> invocation.getMethod().getName().startsWith("countLogs")
                        || invocation.getMethod().getName().startsWith("queryLogs"))
                .toList();
        assertThat(calls).isNotEmpty();
        calls.forEach(invocation -> assertThat(Arrays.asList(invocation.getArguments()).stream()
                .filter(argument -> argument instanceof String)
                .map(String.class::cast)
                .toList()).anyMatch(expectedWorkspaces::contains));
    }
}
