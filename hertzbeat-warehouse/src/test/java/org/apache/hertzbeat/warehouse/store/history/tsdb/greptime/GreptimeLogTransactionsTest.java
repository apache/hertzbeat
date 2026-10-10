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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogTransactions;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class GreptimeLogTransactionsTest {
    @Test
    void appliesTrustedPopulationBeforeSeedAndRanksCompleteRelatedRows() {
        String sql = GreptimeLogTransactions.sql(query(), " WHERE workspace='trusted'", " WHERE severity_number>=17", "fixture");
        assertTrue(sql.indexOf("workspace='trusted'") < sql.indexOf("severity_number>=17"));
        assertTrue(sql.contains("regexp_replace"));
        assertTrue(sql.contains("1024"));
        assertTrue(sql.contains("INNER JOIN seed_ids"));
        assertTrue(sql.contains("ORDER BY related_count DESC, identity ASC"));
    }

    @Test
    void gatesDetailAndLocalSearchInTheSameStatementBeforePagination() {
        var detail = new LogTransactions.Detail("id'quoted", "local", new LogSearchExpression.And(List.of()), 20, 10, "oldest");
        String sql = GreptimeLogTransactions.detailSql(query(), detail, " WHERE workspace='trusted'", " WHERE severity_number>=17",
                " WHERE body='local'", "fixture");
        assertTrue(sql.contains("id''quoted"));
        assertTrue(sql.contains("qualification.seed_count > 0"));
        assertTrue(sql.contains("ORDER BY timestamp ASC, log_record_uid ASC LIMIT 10 OFFSET 20"));
        assertTrue(sql.contains("COUNT(*) AS total FROM matching"));
    }

    @Test
    void rejectsMissingAndInconsistentNativePopulationMetadata() {
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogTransactions.map(List.of(), query()));
        var row = new HashMap<String, Object>(Map.of("seed_total", 1, "usable_seed", 1, "oversized_seed", 0,
                "other_seed", 0, "transaction_total", 1, "related_total", 2));
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogTransactions.map(List.of(row), query()));
        row.putAll(Map.of("identity", "id", "seed_count", 1, "related_count", 2, "first_ns", 1000000000L,
                "last_ns", 1000000001L, "duration_ns", 1, "max_severity", 17, "ordinal", 1));
        assertEquals(2, GreptimeLogTransactions.map(List.of(row), query()).relatedLogCount());
        row.put("ordinal", 1.5);
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogTransactions.map(List.of(row), query()));
        row.put("ordinal", 2);
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogTransactions.map(List.of(row), query()));
        row.put("ordinal", 1);
        row.put("related_total", 2.5);
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogTransactions.map(List.of(row), query()));
    }

    @Test
    void unsupportedReadersNeverFallBackToCappedRawLogs() {
        var reader = mock(HistoryDataReader.class, CALLS_REAL_METHODS);
        assertThrows(UnsupportedOperationException.class, () -> reader.logTransactions(query()));
        var detail = new LogTransactions.Detail("id", null, new LogSearchExpression.And(List.of()), 0, 20, "oldest");
        assertThrows(UnsupportedOperationException.class, () -> reader.logTransactionDetail(query(), detail));
    }

    static LogTransactions.Query query() {
        var scope = new LogFacets.Scope("trusted", 1000, 2000, null, null, null, null, null,
                "checkout", null, null, Map.of(), Map.of(), Set.of(), false, null);
        return new LogTransactions.Query(scope, new LogComparison.Source(scope, new LogSearchExpression.And(List.of()), null),
                new LogTransactions.Request(1, LogFacets.Field.parse("attribute:order.id"), 20, "related-count-desc"));
    }
}
