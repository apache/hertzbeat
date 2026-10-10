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
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Answers;
import org.mockito.invocation.Invocation;
import org.mockito.invocation.InvocationOnMock;
import org.springframework.data.domain.Page;

class LogQueryScopedBaseReaderFallbackTest {

    private static final String WORKSPACE = "team-a";
    private static final String SERVICE = "checkout";
    private static final long LOG_TIME = 1_734_005_477_630_000_000L;
    private static final long TREND_START_MS = Math.floorDiv(LOG_TIME / 1_000_000L, 60_000L) * 60_000L;
    private static final long TREND_END_MS = TREND_START_MS + 30 * 60_000L;

    @ParameterizedTest(name = "{0} with {1}")
    @MethodSource("operationAndFilterCases")
    void simpleEqualityFiltersCanUseScopedBaseRows(Operation operation, FilterCase filterCase) {
        HistoryDataReader reader = scopedBaseOnlyReader();
        LogQueryServiceImpl service = new LogQueryServiceImpl(List.of(reader));

        operation.execute(service, filterCase);

        List<Invocation> storageCalls = mockingDetails(reader).getInvocations().stream()
                .filter(LogQueryScopedBaseReaderFallbackTest::isLogStorageCall)
                .toList();
        assertThat(storageCalls).isNotEmpty()
                .allSatisfy(invocation -> assertThat(Arrays.asList(invocation.getArguments())).contains(WORKSPACE));
        assertThat(storageCalls.stream().filter(LogQueryScopedBaseReaderFallbackTest::isScopedBaseRead))
                .hasSize(1);
    }

    private static Stream<Arguments> operationAndFilterCases() {
        return operations().stream().flatMap(operation -> filters().stream()
                .map(filterCase -> Arguments.of(operation, filterCase)));
    }

    private static List<Operation> operations() {
        return List.of(
                new Operation("list", LogQueryScopedBaseReaderFallbackTest::assertList),
                new Operation("context", LogQueryScopedBaseReaderFallbackTest::assertContext),
                new Operation("overview", LogQueryScopedBaseReaderFallbackTest::assertOverview),
                new Operation("trace coverage", LogQueryScopedBaseReaderFallbackTest::assertTraceCoverage),
                new Operation("trend", LogQueryScopedBaseReaderFallbackTest::assertTrend),
                new Operation("group by", LogQueryScopedBaseReaderFallbackTest::assertGroupBy));
    }

    private static List<FilterCase> filters() {
        return List.of(
                new FilterCase("resource equality", "service.version=1.2.3", null),
                new FilterCase("attribute equality", null, "error.type=Timeout"));
    }

    private static void assertList(LogQueryServiceImpl service, FilterCase filterCase) {
        Page<LogEntry> page = service.list(WORKSPACE, null, null, null, null, null, null, null, null,
                SERVICE, null, null, filterCase.resourceFilter(), filterCase.attributeFilter(),
                0, 1, false, false);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).extracting(LogEntry::getBody).containsExactly("matching");
    }

    private static void assertContext(LogQueryServiceImpl service, FilterCase filterCase) {
        Map<String, Object> result = service.context(WORKSPACE, null, LOG_TIME, null, null,
                SERVICE, null, null, filterCase.resourceFilter(), filterCase.attributeFilter(),
                10, null, null, false, false);

        assertThat(result.get("selected")).isInstanceOfSatisfying(LogEntry.class,
                log -> assertThat(log.getBody()).isEqualTo("matching"));
        assertThat(result.get("before")).isEqualTo(List.of());
        assertThat(result.get("after")).isEqualTo(List.of());
    }

    private static void assertOverview(LogQueryServiceImpl service, FilterCase filterCase) {
        Map<String, Object> result = service.overviewStats(WORKSPACE, null, null, null, null, null, null, null,
                null, SERVICE, null, null, filterCase.resourceFilter(), filterCase.attributeFilter(), false, false);

        assertThat(result).containsEntry("totalCount", 1).containsEntry("errorCount", 1L);
    }

    private static void assertTraceCoverage(LogQueryServiceImpl service, FilterCase filterCase) {
        Map<String, Object> result = service.traceCoverageStats(WORKSPACE, null, null, null, null, null, null,
                null, null, SERVICE, null, null, filterCase.resourceFilter(), filterCase.attributeFilter(),
                false, false);

        assertThat(result.get("traceCoverage")).isEqualTo(Map.of(
                "withTrace", 1L,
                "withoutTrace", 0L,
                "withSpan", 1L,
                "withBothTraceAndSpan", 1L));
    }

    private static void assertTrend(LogQueryServiceImpl service, FilterCase filterCase) {
        LogTrend result = service.trendStats(WORKSPACE, null, TREND_START_MS, TREND_END_MS, null, null, null, null,
                null, SERVICE, null, null, filterCase.resourceFilter(), filterCase.attributeFilter(), false, false);

        assertThat(result.buckets()).extracting(bucket -> bucket.count()).containsExactly(1L);
    }

    private static void assertGroupBy(LogQueryServiceImpl service, FilterCase filterCase) {
        Map<String, Object> result = service.groupByStats(WORKSPACE, null, null, null, null, null, null, null,
                null, SERVICE, null, null, filterCase.resourceFilter(), filterCase.attributeFilter(),
                "service.name", 20, "count-desc", 1, false, false);

        assertThat(result.get("groups")).isEqualTo(List.of(Map.of("value", SERVICE, "count", 1L)));
    }

    private static HistoryDataReader scopedBaseOnlyReader() {
        return mock(HistoryDataReader.class, invocation -> {
            if (isScopedBaseRead(invocation)) {
                return List.of(log("matching", LOG_TIME, "1.2.3", "Timeout"),
                        log("not-matching", LOG_TIME + 1, "9.9.9", "Other"));
            }
            if (isLogStorageCall(invocation)) {
                throw new UnsupportedOperationException("filtered log capability is unavailable");
            }
            return Answers.RETURNS_DEFAULTS.answer(invocation);
        });
    }

    private static boolean isLogStorageCall(InvocationOnMock invocation) {
        String name = invocation.getMethod().getName();
        return name.startsWith("queryLogs") || name.startsWith("countLog");
    }

    private static boolean isScopedBaseRead(InvocationOnMock invocation) {
        return invocation.getMethod().getName().equals("queryLogsByMultipleConditions")
                && invocation.getArguments().length == 13
                && Arrays.asList(invocation.getArguments()).contains(WORKSPACE);
    }

    private static LogEntry log(String body, long time, String version, String errorType) {
        return LogEntry.builder()
                .timeUnixNano(time)
                .severityNumber(18)
                .severityText("ERROR")
                .traceId("trace-a")
                .spanId("span-a")
                .body(body)
                .resource(Map.of(
                        "hertzbeat.workspace_id", WORKSPACE,
                        "service.name", SERVICE,
                        "service.version", version))
                .attributes(Map.of("error.type", errorType))
                .build();
    }

    private record FilterCase(String name, String resourceFilter, String attributeFilter) {

        @Override
        public String toString() {
            return name;
        }
    }

    private record Operation(String name, BiConsumer<LogQueryServiceImpl, FilterCase> assertion) {

        void execute(LogQueryServiceImpl service, FilterCase filterCase) {
            assertion.accept(service, filterCase);
        }

        @Override
        public String toString() {
            return name;
        }
    }
}
