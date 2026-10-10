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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Answers;
import org.mockito.invocation.Invocation;
import org.springframework.data.domain.Page;

/**
 * Trusted entity-id filter contracts shared by every external Log Explore read shape.
 */
class LogQueryEntityScopeOverrideContractTest {

    private static final String WORKSPACE = "team-a";
    private static final long ENTITY_ID = 42L;
    private static final String ENTITY_RESOURCE_KEY = "hertzbeat.entity_id";
    private static final long LOG_TIME_NANOS = 1_734_005_477_630_000_000L;
    private static final long TREND_START_MS = Math.floorDiv(LOG_TIME_NANOS / 1_000_000L, 60_000L) * 60_000L;
    private static final long TREND_END_MS = TREND_START_MS + 30 * 60_000L;

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("readAndCallerFilterCases")
    void ownedEntityAlwaysOverridesCallerEntityResourcePredicates(
            ReadShape readShape, String name, String callerFilter, boolean preserveUnrelatedFilter) {
        HistoryDataReader reader = scopedReader();
        ObservabilityWorkspaceQueryGateway gateway = mock(ObservabilityWorkspaceQueryGateway.class);
        when(gateway.findEntityById(WORKSPACE, ENTITY_ID)).thenReturn(Optional.of(ownedEntity()));
        when(gateway.findIdentitiesByEntityId(WORKSPACE, ENTITY_ID)).thenReturn(List.of());
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader), Optional.of(gateway));

        Object result = readShape.invoke(service, ENTITY_ID, callerFilter);

        List<Invocation> storageCalls = storageCalls(reader);
        assertThat(storageCalls).as(name).isNotEmpty();
        storageCalls.forEach(invocation -> {
            assertThat(Arrays.asList(invocation.getArguments())).contains(WORKSPACE);
        });
        if (preserveUnrelatedFilter) {
            readShape.assertOnlyTrustedEntityResult(result);
        } else {
            storageCalls.forEach(invocation -> assertThat(resourceFilters(invocation).get(ENTITY_RESOURCE_KEY))
                    .isEqualTo(String.valueOf(ENTITY_ID)));
        }
        assertNoLegacyStorageCalls(reader);
    }

    @ParameterizedTest
    @EnumSource(ReadShape.class)
    void foreignAndMissingEntitiesAreIndistinguishableBeforeIdentityOrStorage(ReadShape readShape) {
        HistoryDataReader reader = scopedReader();
        ObservabilityWorkspaceQueryGateway gateway = mock(ObservabilityWorkspaceQueryGateway.class);
        when(gateway.findEntityById(WORKSPACE, 43L)).thenReturn(Optional.empty());
        when(gateway.findEntityById(WORKSPACE, 99L)).thenReturn(Optional.empty());
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader), Optional.of(gateway));

        Object foreign = readShape.invoke(service, 43L, "service.version=1.2.3");
        Object missing = readShape.invoke(service, 99L, "service.version=1.2.3");

        assertThat(foreign).isEqualTo(missing);
        verify(gateway).findEntityById(WORKSPACE, 43L);
        verify(gateway).findEntityById(WORKSPACE, 99L);
        verify(gateway, never()).findIdentitiesByEntityId(WORKSPACE, 43L);
        verify(gateway, never()).findIdentitiesByEntityId(WORKSPACE, 99L);
        verifyNoInteractions(reader);
    }

    private static Stream<Arguments> readAndCallerFilterCases() {
        return Arrays.stream(ReadShape.values()).flatMap(readShape -> Stream.of(
                Arguments.of(readShape, "exact conflict", "hertzbeat.entity_id=99", false),
                Arguments.of(readShape, "complex conflict", "hertzbeat.entity_id IN ('99','100')", false),
                Arguments.of(readShape, "key name only in value",
                        "note CONTAINS 'hertzbeat.entity_id=99'", true)));
    }

    private HistoryDataReader scopedReader() {
        return mock(HistoryDataReader.class, invocation -> {
            String methodName = invocation.getMethod().getName();
            if (methodName.startsWith("queryLogs")) {
                return List.of(logEntry(ENTITY_ID), logEntry(99L));
            }
            if (methodName.startsWith("countLog")) {
                if (methodName.equals("countLogsByInterval")) {
                    return List.of();
                }
                return invocation.getMethod().getReturnType() == long.class ? 0L : Map.of();
            }
            return Answers.RETURNS_DEFAULTS.answer(invocation);
        });
    }

    private LogEntry logEntry(long entityId) {
        return LogEntry.builder()
                .timeUnixNano(LOG_TIME_NANOS)
                .resource(Map.of(
                        "hertzbeat.workspace_id", WORKSPACE,
                        ENTITY_RESOURCE_KEY, String.valueOf(entityId),
                        "service.name", "checkout",
                        "note", "prefix hertzbeat.entity_id=99 suffix"))
                .build();
    }

    private List<Invocation> storageCalls(HistoryDataReader reader) {
        return mockingDetails(reader).getInvocations().stream()
                .filter(invocation -> invocation.getMethod().getName().startsWith("queryLogs")
                        || invocation.getMethod().getName().startsWith("countLog"))
                .toList();
    }

    private Map<?, ?> resourceFilters(Invocation invocation) {
        return Arrays.stream(invocation.getArguments())
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .filter(filters -> filters.containsKey(ENTITY_RESOURCE_KEY) || filters.containsKey("note"))
                .findFirst()
                .orElse(Map.of());
    }

    private void assertNoLegacyStorageCalls(HistoryDataReader reader) {
        storageCalls(reader).forEach(invocation ->
                assertThat(Arrays.asList(invocation.getArguments())).contains(WORKSPACE));
    }

    private ObserveEntity ownedEntity() {
        return ObserveEntity.builder()
                .id(ENTITY_ID)
                .type("service")
                .name("checkout")
                .build();
    }

    private enum ReadShape {
        LIST,
        CONTEXT,
        OVERVIEW,
        TRACE_COVERAGE,
        TREND,
        GROUP;

        @SuppressWarnings("unchecked")
        void assertOnlyTrustedEntityResult(Object result) {
            switch (this) {
                case LIST -> {
                    Page<LogEntry> page = (Page<LogEntry>) result;
                    assertThat(page.getContent()).singleElement().satisfies(this::assertTrustedEntity);
                }
                case CONTEXT -> assertTrustedEntity((LogEntry) ((Map<String, Object>) result).get("selected"));
                case OVERVIEW -> assertThat(((Map<String, Object>) result).get("totalCount")).isEqualTo(1);
                case TRACE_COVERAGE -> assertThat(
                        ((Map<String, Long>) ((Map<String, Object>) result).get("traceCoverage"))
                                .get("withoutTrace"))
                        .isEqualTo(1L);
                case TREND -> assertThat(
                        ((LogTrend) result).buckets().stream().map(bucket -> bucket.count()))
                        .containsExactly(1L);
                case GROUP -> assertThat((List<Map<String, Object>>) ((Map<String, Object>) result).get("groups"))
                        .singleElement()
                        .satisfies(group -> assertThat(group.get("count")).isEqualTo(1L));
                default -> throw new AssertionError("Unhandled read shape: " + this);
            }
        }

        private void assertTrustedEntity(LogEntry logEntry) {
            assertThat(logEntry).isNotNull();
            assertThat(logEntry.getResource().get(ENTITY_RESOURCE_KEY)).isEqualTo(String.valueOf(ENTITY_ID));
            assertThat(logEntry.getResource().get("note")).isEqualTo("prefix hertzbeat.entity_id=99 suffix");
        }

        Object invoke(LogQueryServiceImpl service, long entityId, String resourceFilter) {
            return switch (this) {
                case LIST -> service.list(WORKSPACE, entityId,
                        null, null, null, null, null, null, null,
                        null, null, null, resourceFilter, null, 0, 20, false, false);
                case CONTEXT -> service.context(WORKSPACE, entityId,
                        LOG_TIME_NANOS, null, null,
                        null, null, null, resourceFilter, null, 10, null, null, false, false);
                case OVERVIEW -> service.overviewStats(WORKSPACE, entityId,
                        null, null, null, null, null, null, null,
                        null, null, null, resourceFilter, null, false, false);
                case TRACE_COVERAGE -> service.traceCoverageStats(WORKSPACE, entityId,
                        null, null, null, null, null, null, null,
                        null, null, null, resourceFilter, null, false, false);
                case TREND -> service.trendStats(WORKSPACE, entityId,
                        TREND_START_MS, TREND_END_MS, null, null, null, null, null,
                        null, null, null, resourceFilter, null, false, false);
                case GROUP -> service.groupByStats(WORKSPACE, entityId,
                        null, null, null, null, null, null, null,
                        null, null, null, resourceFilter, null,
                        "service.name", 20, "count-desc", 1, false, false);
            };
        }
    }
}
