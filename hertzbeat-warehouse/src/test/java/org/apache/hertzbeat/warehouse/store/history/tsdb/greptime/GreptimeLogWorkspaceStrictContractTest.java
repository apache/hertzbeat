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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import io.greptime.GreptimeDB;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.MockedStatic;
import org.springframework.web.client.RestTemplate;

class GreptimeLogWorkspaceStrictContractTest {

    private GreptimeSqlQueryExecutor queryExecutor;
    private GreptimeQueryGuard queryGuard;
    private GreptimeDbDataStorage storage;
    private MockedStatic<GreptimeDB> greptimeDbStatic;

    @BeforeEach
    void setUp() {
        GreptimeProperties properties = mock(GreptimeProperties.class);
        lenient().when(properties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        lenient().when(properties.database()).thenReturn("hertzbeat");
        lenient().when(properties.username()).thenReturn("username");
        lenient().when(properties.password()).thenReturn("password");
        lenient().when(properties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        lenient().when(properties.expireTime()).thenReturn(null);
        queryExecutor = mock(GreptimeSqlQueryExecutor.class);
        queryGuard = new GreptimeQueryGuard(2, Duration.ofSeconds(1), Duration.ofMillis(10));
        greptimeDbStatic = mockStatic(GreptimeDB.class);
        greptimeDbStatic.when(() -> GreptimeDB.create(org.mockito.ArgumentMatchers.any()))
                .thenReturn(mock(GreptimeDB.class));
        storage = new GreptimeDbDataStorage(properties, mock(RestTemplate.class), queryExecutor, queryGuard);
    }

    @AfterEach
    void tearDown() {
        greptimeDbStatic.close();
        queryGuard.close();
    }

    @Test
    void scopedNonPagedReadAndCountReportProviderFailureAsUnavailable() {
        when(queryExecutor.executeStrict(anyString())).thenThrow(new IllegalStateException("provider details"));

        assertAll(
                () -> assertThrows(TelemetryStorageUnavailableException.class,
                        () -> storage.queryLogsByMultipleConditions(
                                null, null, null, null, null, null, null,
                                Set.of(), false, "team-a", null, null, null)),
                () -> assertThrows(TelemetryStorageUnavailableException.class,
                        () -> storage.countLogsByMultipleConditions(
                                null, null, null, null, null, null, null,
                        Set.of(), false, "team-a")));
    }

    @ParameterizedTest
    @MethodSource("malformedScopedCountRows")
    void scopedCountRequiresOneRecognizableNumericCountAlias(List<Map<String, Object>> rows) {
        when(queryExecutor.executeStrict(anyString())).thenReturn(rows);

        assertThrows(TelemetryStorageUnavailableException.class, this::logCount);
    }

    @Test
    void scopedCountAcceptsRecognizableNumericZero() {
        when(queryExecutor.executeStrict(anyString())).thenReturn(List.of(Map.of("count", 0)));

        assertEquals(0L, logCount());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidScopedCounts")
    void scopedAggregateCountsRequireNonnegativeExactLongs(String name, Object invalidCount) {
        when(queryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("SELECT COUNT(*) as count")) {
                return List.of(Map.of("count", invalidCount));
            }
            if (sql.contains(" as fatalCount")) {
                Map<String, Object> row = new HashMap<>(validSeverityRow());
                row.put("totalCount", invalidCount);
                return List.of(row);
            }
            if (sql.contains(" as withBothTraceAndSpan")) {
                Map<String, Object> row = new HashMap<>(validTraceRow());
                row.put("totalCount", invalidCount);
                return List.of(row);
            }
            if (sql.contains("date_bin('1 minute'")) {
                return List.of(Map.of("bucket", "2026-08-15 14:00", "count", invalidCount));
            }
            return List.of(Map.of("groupValue", "checkout", "count", invalidCount));
        });

        assertAll(
                () -> assertCauseFreeUnavailable(this::logCount),
                () -> assertCauseFreeUnavailable(this::severityBuckets),
                () -> assertCauseFreeUnavailable(this::traceCoverage),
                () -> assertCauseFreeUnavailable(this::intervalStats),
                () -> assertCauseFreeUnavailable(this::groupStats));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidScopedCounts")
    void scopedNullableSumsRejectEveryNonNullInvalidCount(String name, Object invalidCount) {
        when(queryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.contains(" as fatalCount")) {
                Map<String, Object> row = new HashMap<>(validSeverityRow());
                row.put("fatalCount", invalidCount);
                return List.of(row);
            }
            Map<String, Object> row = new HashMap<>(validTraceRow());
            row.put("withTrace", invalidCount);
            return List.of(row);
        });

        assertAll(
                () -> assertCauseFreeUnavailable(this::severityBuckets),
                () -> assertCauseFreeUnavailable(this::traceCoverage));
    }

    @Test
    void scopedAggregatesPreserveNonnegativeIntegersAndOnlyNullSumsBecomeZero() {
        when(queryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("SELECT COUNT(*) as count")) {
                return List.of(Map.of("count", 7));
            }
            if (sql.contains(" as fatalCount")) {
                Map<String, Object> row = new HashMap<>(validSeverityRow());
                row.put("totalCount", 7);
                row.put("fatalCount", null);
                row.put("errorCount", 2);
                return List.of(row);
            }
            if (sql.contains(" as withBothTraceAndSpan")) {
                Map<String, Object> row = new HashMap<>(validTraceRow());
                row.put("totalCount", 7);
                row.put("withTrace", null);
                row.put("withSpan", 3);
                return List.of(row);
            }
            if (sql.contains("date_bin('1 minute'")) {
                return List.of(Map.of("bucket", "2026-08-15 14:00", "count", 4));
            }
            return List.of(Map.of("groupValue", "checkout", "count", 5));
        });

        assertAll(
                () -> assertEquals(7L, logCount()),
                () -> assertEquals(0L, severityBuckets().get("fatalCount")),
                () -> assertEquals(2L, severityBuckets().get("errorCount")),
                () -> assertEquals(0L, traceCoverage().get("withTrace")),
                () -> assertEquals(3L, traceCoverage().get("withSpan")),
                () -> assertEquals(List.of(4L), intervalStats().stream().map(bucket -> bucket.count()).toList()),
                () -> assertEquals(Map.of("checkout", 5L), groupStats()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"1.0", "1E+3"})
    void scopedAggregatesConsumeTheExactValueAcceptedByValidation(String count) {
        long expected = new BigDecimal(count).longValueExact();
        when(queryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("SELECT COUNT(*) as count")) {
                return List.of(Map.of("count", count));
            }
            if (sql.contains(" as fatalCount")) {
                Map<String, Object> row = new HashMap<>(validSeverityRow());
                row.put("totalCount", count);
                row.put("errorCount", count);
                return List.of(row);
            }
            if (sql.contains(" as withBothTraceAndSpan")) {
                Map<String, Object> row = new HashMap<>(validTraceRow());
                row.put("totalCount", count);
                row.put("withTrace", count);
                return List.of(row);
            }
            return sql.contains("date_bin('1 minute'")
                    ? List.of(Map.of("bucket", "2026-08-15 14:00", "count", count))
                    : List.of(Map.of("groupValue", "checkout", "count", count));
        });

        assertAll(
                () -> assertEquals(expected, logCount()),
                () -> assertEquals(expected, severityBuckets().get("errorCount")),
                () -> assertEquals(expected, traceCoverage().get("withTrace")),
                () -> assertEquals(List.of(expected), intervalStats().stream().map(bucket -> bucket.count()).toList()),
                () -> assertEquals(expected, groupStats().get("checkout")));
    }

    @Test
    void legacyNumericAndTimestampCoercionRemainsForgiving() {
        when(queryExecutor.execute(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("SELECT COUNT(*) as count")) {
                return List.of(Map.of("count", 1.5d));
            }
            return List.of(Map.of("bucket", 1_734_005_477_630_000_000L, "count", 2.5d));
        });

        long count = storage.countLogsByMultipleConditions(
                null, null, null, null, null, null, null, Set.of(), false, null);
        var intervals = storage.countLogsByInterval(
                null, null, 60_000L, null, null, null, null, null,
                Set.of(), false, null, null, null, null, Map.of(), Map.of());

        assertEquals(1L, count);
        assertEquals(List.of(2L), intervals.stream().map(bucket -> bucket.count()).toList());
    }

    @Test
    void allScopedAggregatesReportProviderFailureAsUnavailable() {
        when(queryExecutor.executeStrict(anyString())).thenThrow(new IllegalStateException("provider details"));

        assertAll(
                () -> assertThrows(TelemetryStorageUnavailableException.class,
                        () -> storage.countLogsBySeverityBuckets(
                                null, null, null, null, null, null, null,
                                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of())),
                () -> assertThrows(TelemetryStorageUnavailableException.class,
                        () -> storage.countLogTraceCoverage(
                                null, null, null, null, null, null, null,
                                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of())),
                () -> assertThrows(TelemetryStorageUnavailableException.class,
                        () -> storage.countLogsByInterval(
                                null, null, 60_000L, null, null, null, null, null,
                                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of())),
                () -> assertThrows(TelemetryStorageUnavailableException.class,
                        () -> storage.countLogsByGroup(
                                null, null, null, null, null, null, null,
                        Set.of(), false, "team-a", null, null, null, Map.of(), Map.of(), "service.name")));
    }

    @Test
    void scopedNoGroupAggregatesRejectAnEmptyStrictResponse() {
        when(queryExecutor.executeStrict(anyString())).thenReturn(List.of());

        assertAll(
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::severityBuckets),
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::traceCoverage));
    }

    @Test
    void scopedSeverityAggregateRequiresEveryRecognizedNumericAlias() {
        when(queryExecutor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of("unexpected", 1)))
                .thenReturn(List.of(Map.of("totalCount", "not-a-number")));

        assertAll(
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::severityBuckets),
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::severityBuckets));
    }

    @Test
    void scopedTraceAggregateRequiresEveryRecognizedNumericAlias() {
        when(queryExecutor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of("unexpected", 1)))
                .thenReturn(List.of(Map.of("totalCount", "not-a-number")));

        assertAll(
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::traceCoverage),
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::traceCoverage));
    }

    @Test
    void scopedGroupedAggregatesTreatZeroRowsAsAnHonestEmptyResult() {
        when(queryExecutor.executeStrict(anyString())).thenReturn(List.of());

        assertAll(
                () -> assertEquals(List.of(), intervalStats()),
                () -> assertEquals(Map.of(), groupStats()));
    }

    @Test
    void scopedGroupedAggregatesRejectMissingOrNonNumericRequiredAliases() {
        when(queryExecutor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of("count", 1)))
                .thenReturn(List.of(Map.of("bucket", "2026-08-15 14:00", "count", "not-a-number")))
                .thenReturn(List.of(Map.of("count", 1)))
                .thenReturn(List.of(Map.of("groupValue", "checkout", "count", "not-a-number")));

        assertAll(
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::intervalStats),
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::intervalStats),
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::groupStats),
                () -> assertThrows(TelemetryStorageUnavailableException.class, this::groupStats));
    }

    @Test
    void allScopedReadsUseTheFourKeyCanonicalPrecedencePredicate() {
        List<String> sqlStatements = new ArrayList<>();
        when(queryExecutor.executeStrict(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            sqlStatements.add(sql);
            if (sql.contains(" as fatalCount")) {
                return List.of(validSeverityRow());
            }
            if (sql.contains(" as withBothTraceAndSpan")) {
                return List.of(validTraceRow());
            }
            if (sql.startsWith("SELECT COUNT(*) as count")) {
                return List.of(Map.of("count", 0));
            }
            return List.of();
        });

        storage.queryLogsByMultipleConditions(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null);
        storage.countLogsByMultipleConditions(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a");
        storage.countLogsBySeverityBuckets(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of());
        storage.countLogTraceCoverage(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of());
        storage.countLogsByInterval(
                null, null, 60_000L, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of());
        storage.countLogsByGroup(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of(), "service.name");

        assertEquals(6, sqlStatements.size());
        sqlStatements.forEach(sql -> assertTrue(sql.contains(expectedWorkspacePredicate("team-a")), sql));
    }

    @Test
    void defaultWorkspaceRequiresAllFourWorkspaceKeysToBeAbsentOrBlank() {
        when(queryExecutor.executeStrict(anyString())).thenReturn(List.of());

        storage.queryLogsByMultipleConditions(
                null, null, null, null, null, null, null,
                Set.of(), false, "default", null, null, null);

        org.mockito.ArgumentCaptor<String> sqlCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(queryExecutor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains(expectedWorkspacePredicate("default")), sql);
        assertTrue(sql.contains(missing(workspaceExpression("workspace_id"))), sql);
    }

    private String expectedWorkspacePredicate(String workspaceId) {
        String canonical = workspaceExpression("hertzbeat.workspace_id");
        String promoted = workspaceExpression("hertzbeat_workspace_id");
        String legacyDot = workspaceExpression("workspace.id");
        String legacySnake = workspaceExpression("workspace_id");
        String lowestPriority = legacySnake + " = '" + workspaceId + "'";
        if ("default".equals(workspaceId)) {
            lowestPriority = "(" + lowestPriority + " OR " + missing(legacySnake) + ")";
        }
        return "(" + canonical + " = '" + workspaceId + "' OR (" + missing(canonical)
                + " AND (" + promoted + " = '" + workspaceId + "' OR (" + missing(promoted)
                + " AND (" + legacyDot + " = '" + workspaceId + "' OR (" + missing(legacyDot)
                + " AND " + lowestPriority + "))))))";
    }

    private String workspaceExpression(String key) {
        return "TRIM(json_get_string(resource_attributes, '$[\"" + key + "\"]'))";
    }

    private String missing(String expression) {
        return "(" + expression + " IS NULL OR " + expression + " = '')";
    }

    private Map<String, Long> severityBuckets() {
        return storage.countLogsBySeverityBuckets(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of());
    }

    private long logCount() {
        return storage.countLogsByMultipleConditions(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a");
    }

    private Map<String, Long> traceCoverage() {
        return storage.countLogTraceCoverage(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of());
    }

    private java.util.List<org.apache.hertzbeat.common.observability.dto.log.LogTrendBucket> intervalStats() {
        return storage.countLogsByInterval(
                null, null, 60_000L, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of());
    }

    private Map<String, Long> groupStats() {
        return storage.countLogsByGroup(
                null, null, null, null, null, null, null,
                Set.of(), false, "team-a", null, null, null, Map.of(), Map.of(), "service.name");
    }

    private Map<String, Object> validSeverityRow() {
        return Map.ofEntries(
                Map.entry("totalCount", 0),
                Map.entry("fatalCount", 0),
                Map.entry("errorCount", 0),
                Map.entry("warnCount", 0),
                Map.entry("infoCount", 0),
                Map.entry("debugCount", 0),
                Map.entry("traceCount", 0),
                Map.entry("withTrace", 0),
                Map.entry("withSpan", 0),
                Map.entry("withBothTraceAndSpan", 0));
    }

    private Map<String, Object> validTraceRow() {
        return Map.of(
                "totalCount", 0,
                "withTrace", 0,
                "withSpan", 0,
                "withBothTraceAndSpan", 0);
    }

    private static Stream<Arguments> malformedScopedCountRows() {
        return Stream.of(
                Arguments.of(List.of()),
                Arguments.of(List.of(Map.of("unexpected", 0))),
                Arguments.of(List.of(Map.of("count", "not-a-number"))));
    }

    private static Stream<Arguments> invalidScopedCounts() {
        return Stream.of(
                Arguments.of("negative", -1L),
                Arguments.of("fractional", new BigDecimal("1.5")),
                Arguments.of("NaN", Double.NaN),
                Arguments.of("infinity", Double.POSITIVE_INFINITY),
                Arguments.of("above Long maximum", new BigInteger("9223372036854775808")));
    }

    private void assertCauseFreeUnavailable(Executable executable) {
        TelemetryStorageUnavailableException unavailable =
                assertThrows(TelemetryStorageUnavailableException.class, executable);
        assertEquals(null, unavailable.getCause());
    }
}
