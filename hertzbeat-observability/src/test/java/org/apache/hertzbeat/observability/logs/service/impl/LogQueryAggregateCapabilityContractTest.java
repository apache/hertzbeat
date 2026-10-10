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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.common.observability.dto.log.LogTrendBucket;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Answers;
import org.mockito.invocation.Invocation;

class LogQueryAggregateCapabilityContractTest {

    private static final String WORKSPACE = "team-a";
    private static final long LOG_TIME_NANOS = 1_734_005_477_630_000_000L;
    private static final long TREND_START_MS = Math.floorDiv(LOG_TIME_NANOS / 1_000_000L, 60_000L) * 60_000L;
    private static final long TREND_END_MS = TREND_START_MS + 30 * 60_000L;

    @ParameterizedTest(name = "{0}")
    @MethodSource("statOperations")
    void unsupportedNativeAggregateFallsBackToRowsOnTheSameScopedReader(StatOperation operation) {
        HistoryDataReader reader = aggregateUnsupportedReader(List.of(logEntry()));
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        Object result = operation.invoke(service);

        operation.assertRowResult(result);
        assertOnlyScopedRowCalls(reader, 1);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("statOperations")
    void unsupportedNativeAggregateCanUseRowsFromLaterScopedReader(StatOperation operation) {
        HistoryDataReader first = aggregateUnsupportedReader(null);
        HistoryDataReader second = aggregateUnsupportedReader(List.of(logEntry()));
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(first, second));

        Object result = operation.invoke(service);

        operation.assertRowResult(result);
        assertOnlyScopedRowCalls(first, 2);
        assertOnlyScopedRowCalls(second, 1);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("statOperations")
    void supportedEmptyNativeAggregateIsTerminalAndDoesNotReadRows(StatOperation operation) {
        HistoryDataReader reader = nativeAggregateReader(Map.of());
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        Object result = operation.invoke(service);

        operation.assertEmptyNativeResult(result);
        assertOnlyScopedRowCalls(reader, 0);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("statOperations")
    void unavailableRequiresBothNativeAggregateAndScopedRowsToBeUnsupported(StatOperation operation) {
        HistoryDataReader reader = aggregateUnsupportedReader(null);
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        assertThatThrownBy(() -> operation.invoke(service))
                .isInstanceOf(TelemetryStorageUnavailableException.class);
        assertOnlyScopedRowCalls(reader, 2);
    }

    private static Stream<StatOperation> statOperations() {
        return Stream.of(
                new StatOperation("overview", LogQueryAggregateCapabilityContractTest::overview,
                        (result, empty) -> {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> values = (Map<String, Object>) result;
                            if (empty) {
                                assertThat(values).isEmpty();
                            } else {
                                assertThat(values).containsEntry("totalCount", 1)
                                        .containsEntry("errorCount", 1L);
                            }
                        }),
                new StatOperation("trace coverage", LogQueryAggregateCapabilityContractTest::traceCoverage,
                        (result, empty) -> assertThat(((Map<?, ?>) result).get("traceCoverage"))
                                .isEqualTo(empty ? Map.of() : Map.of(
                                        "withTrace", 1L,
                                        "withoutTrace", 0L,
                                        "withSpan", 1L,
                                        "withBothTraceAndSpan", 1L))),
                new StatOperation("trend", LogQueryAggregateCapabilityContractTest::trend,
                        (result, empty) -> assertThat(((LogTrend) result).buckets())
                                .extracting(LogTrendBucket::count)
                                .containsExactlyElementsOf(empty ? List.of() : List.of(1L))),
                new StatOperation("group", LogQueryAggregateCapabilityContractTest::group,
                        (result, empty) -> assertThat(((Map<?, ?>) result).get("groups")).isEqualTo(empty
                                ? List.of()
                                : List.of(Map.of("value", "checkout", "count", 1L)))));
    }

    private static Map<String, Object> overview(LogQueryServiceImpl service) {
        return service.overviewStats(WORKSPACE,
                null, null, null, null, null, null, null, null, null, null, null, null, null,
                false, false);
    }

    private static Map<String, Object> traceCoverage(LogQueryServiceImpl service) {
        return service.traceCoverageStats(WORKSPACE,
                null, null, null, null, null, null, null, null, null, null, null, null, null,
                false, false);
    }

    private static LogTrend trend(LogQueryServiceImpl service) {
        return service.trendStats(WORKSPACE,
                null, TREND_START_MS, TREND_END_MS, null, null, null, null, null, null, null, null, null, null,
                false, false);
    }

    private static Map<String, Object> group(LogQueryServiceImpl service) {
        return service.groupByStats(WORKSPACE,
                null, null, null, null, null, null, null, null, null, null, null, null, null,
                "service.name", 20, "count-desc", 1, false, false);
    }

    private static HistoryDataReader aggregateUnsupportedReader(List<LogEntry> rows) {
        return mock(HistoryDataReader.class, invocation -> {
            String methodName = invocation.getMethod().getName();
            if (methodName.startsWith("countLog")) {
                throw new UnsupportedOperationException("native aggregate unavailable");
            }
            if (methodName.startsWith("queryLogs")) {
                if (rows == null) {
                    throw new UnsupportedOperationException("scoped rows unavailable");
                }
                return rows;
            }
            return Answers.RETURNS_DEFAULTS.answer(invocation);
        });
    }

    private static HistoryDataReader nativeAggregateReader(Map<String, Long> aggregate) {
        return mock(HistoryDataReader.class, invocation -> {
            String methodName = invocation.getMethod().getName();
            if (methodName.startsWith("countLog")) {
                if (methodName.equals("countLogsByInterval")) {
                    return aggregate.isEmpty() ? List.of() : List.of(new LogTrendBucket(TREND_START_MS, 1L));
                }
                return aggregate;
            }
            if (methodName.startsWith("queryLogs")) {
                throw new AssertionError("supported native aggregate must not read rows");
            }
            return Answers.RETURNS_DEFAULTS.answer(invocation);
        });
    }

    private static LogEntry logEntry() {
        return LogEntry.builder()
                .timeUnixNano(LOG_TIME_NANOS)
                .severityNumber(18)
                .severityText("ERROR")
                .traceId("trace-a")
                .spanId("span-a")
                .body("failure")
                .resource(Map.of(
                        "hertzbeat.workspace_id", WORKSPACE,
                        "service.name", "checkout"))
                .build();
    }

    private static void assertOnlyScopedRowCalls(HistoryDataReader reader, int expectedCount) {
        List<Invocation> rowCalls = mockingDetails(reader).getInvocations().stream()
                .filter(invocation -> invocation.getMethod().getName().startsWith("queryLogs"))
                .toList();
        assertThat(rowCalls).hasSize(expectedCount);
        rowCalls.forEach(invocation -> assertThat(Arrays.asList(invocation.getArguments())).contains(WORKSPACE));
    }

    @FunctionalInterface
    private interface StatsCall {
        Object invoke(LogQueryServiceImpl service);
    }

    private record StatOperation(String name, StatsCall call, BiConsumer<Object, Boolean> assertion) {

        Object invoke(LogQueryServiceImpl service) {
            return call.invoke(service);
        }

        void assertRowResult(Object result) {
            assertion.accept(result, false);
        }

        void assertEmptyNativeResult(Object result) {
            assertion.accept(result, true);
        }

        @Override
        public String toString() {
            return name;
        }
    }
}
