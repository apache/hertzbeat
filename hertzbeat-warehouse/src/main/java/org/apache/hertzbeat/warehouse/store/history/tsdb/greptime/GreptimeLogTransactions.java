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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.HistoricalLogRow;
import org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory;
import org.apache.hertzbeat.common.observability.dto.log.LogTransactions;

/** Complete seed-ID expansion and atomic selected-ID qualification. */
final class GreptimeLogTransactions {
    private static final List<String> COUNTERS = List.of("seed_total", "usable_seed", "oversized_seed", "other_seed", "transaction_total", "related_total");

    private GreptimeLogTransactions() { }

    static String sql(LogTransactions.Query query, String populationWhere, String seedWhere, String table) {
        return projected(query, populationWhere, table)
                + ", seed AS (SELECT * FROM projected" + seedWhere + "),"
                + " seed_ids AS (SELECT transaction_identity,COUNT(*) AS seed_count FROM seed WHERE " + usable()
                + " GROUP BY transaction_identity),"
                + " related AS (SELECT p.*,i.seed_count FROM projected p INNER JOIN seed_ids i ON p.transaction_identity=i.transaction_identity),"
                + " aggregated AS (SELECT transaction_identity AS identity,MAX(seed_count) AS seed_count,COUNT(*) AS related_count,"
                + "CAST(MIN(timestamp) AS BIGINT) AS first_ns,CAST(MAX(timestamp) AS BIGINT) AS last_ns,"
                + "CAST(MAX(timestamp)-MIN(timestamp) AS BIGINT) AS duration_ns,"
                + "MAX(CASE WHEN severity_number BETWEEN 1 AND 24 THEN severity_number END) AS max_severity"
                + " FROM related GROUP BY transaction_identity),"
                + " totals AS (SELECT COUNT(*) AS seed_total,COALESCE(SUM(CASE WHEN " + usable() + " THEN 1 ELSE 0 END),0) AS usable_seed,"
                + "COALESCE(SUM(CASE WHEN identity_units>1024 THEN 1 ELSE 0 END),0) AS oversized_seed,"
                + "COALESCE(SUM(CASE WHEN transaction_identity IS NULL OR transaction_identity='' THEN 1 ELSE 0 END),0) AS other_seed FROM seed),"
                + " identities AS (SELECT COUNT(*) AS transaction_total FROM seed_ids),"
                + " related_total AS (SELECT COUNT(*) AS related_total FROM related),"
                + " ranked AS (SELECT *,ROW_NUMBER() OVER(ORDER BY related_count DESC, identity ASC) AS ordinal FROM aggregated)"
                + " SELECT totals.*,identities.*,related_total.*,r.* FROM totals CROSS JOIN identities CROSS JOIN related_total"
                + " LEFT JOIN ranked r ON r.ordinal<=" + query.request().limit() + " ORDER BY r.ordinal";
    }

    static String detailSql(LogTransactions.Query query, LogTransactions.Detail detail, String populationWhere,
                            String seedWhere, String localWhere, String table) {
        String direction = "oldest".equals(detail.sort()) ? "ASC" : "DESC";
        return projected(query, populationWhere, table)
                + ", selected_identity AS (SELECT * FROM projected WHERE " + usable()
                + " AND transaction_identity='" + detail.identity().replace("'", "''") + "'),"
                + " qualification AS (SELECT COUNT(*) AS seed_count FROM selected_identity" + seedWhere + "),"
                + " matching AS (SELECT s.* FROM selected_identity s CROSS JOIN qualification" + localWhere
                + " AND qualification.seed_count > 0),"
                + " metadata AS (SELECT COUNT(*) AS total FROM matching),"
                + " paged AS (SELECT " + GreptimeDbDataStorage.NATIVE_LOG_SELECT_COLUMNS + ",transaction_identity FROM matching"
                + " ORDER BY timestamp " + direction + ", log_record_uid " + direction + " LIMIT " + detail.limit() + " OFFSET " + detail.offset() + ")"
                + " SELECT qualification.seed_count,metadata.total,p.* FROM qualification CROSS JOIN metadata LEFT JOIN paged p ON true"
                + " ORDER BY p.timestamp " + direction + ",p.log_record_uid " + direction;
    }

    private static String projected(LogTransactions.Query query, String populationWhere, String table) {
        var field = query.request().field();
        String column = "resource".equals(field.source()) ? "resource_attributes" : "log_attributes";
        String value = GreptimeLogFacets.expression(field);
        return "WITH scoped AS (SELECT * FROM " + table + populationWhere + "),"
                + " typed AS (SELECT *,CASE WHEN " + GreptimeStructuredLogPredicate.stringAt(column, field.key())
                + " THEN " + value + " END AS transaction_identity FROM scoped),"
                // Fixed native regex counts supplementary codepoints a second time, matching Java/JS UTF16 length.
                + " projected AS (SELECT *,length(transaction_identity)+length(regexp_replace(transaction_identity,"
                + "'[\\x{0}-\\x{FFFF}]','','g')) AS identity_units FROM typed)";
    }

    private static String usable() {
        return "transaction_identity IS NOT NULL AND transaction_identity<>'' AND identity_units<=1024";
    }

    static LogTransactions.Result map(List<Map<String, Object>> rows, LogTransactions.Query query) {
        if (rows == null || rows.isEmpty() || rows.size() > query.request().limit()) {
            throw new IllegalArgumentException("Missing or unbounded transaction rows");
        }
        var first = rows.getFirst();
        var items = new ArrayList<LogTransactions.Item>();
        for (var row : rows) {
            for (String counter : COUNTERS) {
                if (number(first.get(counter)) != number(row.get(counter))) { throw new IllegalArgumentException("Inconsistent transaction counters"); }
            }
            if (row.get("identity") == null) {
                if (rows.size() != 1 || number(first.get("transaction_total")) != 0) { throw new IllegalArgumentException("Missing transaction identity"); }
                continue;
            }
            if (!(row.get("identity") instanceof String identity)) { throw new IllegalArgumentException("Non-string transaction identity"); }
            if (number(row.get("ordinal")) != items.size() + 1L) { throw new IllegalArgumentException("Invalid transaction ordinal"); }
            items.add(new LogTransactions.Item(identity, number(row.get("seed_count")), number(row.get("related_count")),
                    Long.toString(number(row.get("first_ns"))), Long.toString(number(row.get("last_ns"))),
                    Long.toString(number(row.get("duration_ns"))), severity(row.get("max_severity"))));
        }
        long count = number(first.get("transaction_total"));
        return new LogTransactions.Result(query.population().window(), query.request(), number(first.get("seed_total")),
                number(first.get("usable_seed")), number(first.get("oversized_seed")), number(first.get("other_seed")), count,
                number(first.get("related_total")), count > query.request().limit(), items);
    }

    static LogTransactions.DetailResult mapDetail(List<Map<String, Object>> rows, LogTransactions.Query query,
                                                  LogTransactions.Detail detail, Function<List<Map<String, Object>>, List<LogEntry>> mapper) {
        if (rows == null || rows.isEmpty() || rows.size() > detail.limit()) { throw new IllegalArgumentException("Missing transaction detail rows"); }
        long seedCount = number(rows.getFirst().get("seed_count"));
        long total = number(rows.getFirst().get("total"));
        var nativeRows = new ArrayList<Map<String, Object>>();
        for (var row : rows) {
            if (seedCount != number(row.get("seed_count")) || total != number(row.get("total"))) {
                throw new IllegalArgumentException("Inconsistent transaction detail counters");
            }
            if (row.get("timestamp") == null) {
                if (rows.size() != 1) { throw new IllegalArgumentException("Unexpected empty detail row"); }
                continue;
            }
            if (!Objects.equals(detail.identity(), row.get("transaction_identity"))) { throw new IllegalArgumentException("Unrelated transaction row"); }
            nativeRows.add(row);
        }
        if (seedCount == 0 && (total != 0 || !nativeRows.isEmpty())) { throw new IllegalArgumentException("Unqualified transaction detail"); }
        var result = mapper.apply(nativeRows).stream().map(HistoricalLogRow::from).toList();
        return new LogTransactions.DetailResult(query.population().window(), query.request().field(), detail.identity(), seedCount > 0,
                seedCount > 0 ? total : null, result, detail.offset(), detail.limit(), detail.sort());
    }

    private static LogSeverityCategory severity(Object raw) {
        if (raw == null) { return null; }
        long value = number(raw);
        if (value < 1 || value > 24) { throw new IllegalArgumentException("Invalid transaction severity"); }
        return LogSeverityCategory.values()[(int) (value - 1) / 4];
    }

    private static long number(Object raw) {
        if (raw == null) { throw new IllegalArgumentException("Missing transaction number"); }
        try {
            long value = new BigDecimal(raw.toString()).longValueExact();
            if (value < 0) { throw new IllegalArgumentException("Negative transaction number"); }
            return value;
        } catch (ArithmeticException invalid) {
            throw new IllegalArgumentException("Invalid transaction number", invalid);
        }
    }
}
