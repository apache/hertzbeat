/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSubquery;
import org.junit.jupiter.api.Test;

class GreptimeLogSubqueryTest {
    @Test
    void membershipUsesTheSameStringExtractionAndAnExplicitAntijoinNullPolicy() {
        for (String operator : List.of("in", "not_in")) {
            var descriptor = new LogSubquery.Descriptor(1, "attribute:proof.key", operator,
                    new LogSubquery.Child("attribute:proof.key", "structured-v1", ""),
                    new LogSubquery.Rank("top", 5, new LogSubquery.Measure("count_all", null)));
            String sql = GreptimeLogCalculatedPage.sql(
                    query(new LogCalculated.Page(0, 20, new LogCalculated.Sort("timestamp", "desc")), descriptor),
                    " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
            String extraction = "json_get_string(log_attributes, '$[\"proof.key\"]')";
            assertTrue(sql.contains(extraction + " AS child_key"));
            assertTrue(sql.contains(extraction + " AS main_key"));
            assertTrue(sql.contains("WHERE child_key IS NOT NULL GROUP BY child_key"));
            assertTrue(sql.contains("LEFT JOIN subquery_top ON subquery_main.main_key = subquery_top.child_key"));
            assertTrue(sql.contains("WHERE subquery_top.child_key IS " + ("in".equals(operator) ? "NOT NULL" : "NULL")));
            assertFalse(sql.contains(" NOT IN "));
            assertFalse(sql.contains("COALESCE(" + extraction));
        }
        // This pins compiler structure only; Greptime JSON type extraction and empty-child execution
        // still require native database evidence before claiming a missing/null/number/string matrix.
    }

    @Test
    void fourOperationsShareRankedFullPopulationAndTrustedScope() {
        String where = " WHERE hertzbeat_workspace_id = 'trusted'";
        var page = query(new LogCalculated.Page(0, 20, new LogCalculated.Sort("timestamp", "desc")));
        String pageSql = GreptimeLogCalculatedPage.sql(page, where, "fixture");
        String trendSql = GreptimeLogCalculatedAggregate.trendSql(query(new LogCalculated.Trend(60000)), where, "fixture");
        String facetSql = GreptimeLogCalculatedAggregate.facetSql(
                query(new LogCalculated.Facet("builtin:serviceName", 20, null)), where, "fixture");
        var analysis = new LogCalculated.Analysis("groups", List.of(), null, 20, "count-desc", 1, null);
        String analysisSql = GreptimeLogCalculatedAnalysis.sql(query(analysis), where, "fixture");
        for (String sql : List.of(pageSql, trendSql, facetSql, analysisSql)) {
            assertTrue(sql.contains("scoped AS (SELECT * FROM fixture" + where));
            assertTrue(sql.contains("subquery_counts AS"));
            assertTrue(sql.contains("ROW_NUMBER() OVER (ORDER BY child_count ASC, child_key ASC)"));
            assertTrue(sql.contains("ordinal <= 2"));
            assertTrue(sql.contains("subquery_top.child_key IS NULL"));
            assertTrue(sql.contains("FROM filtered"));
            assertTrue(sql.contains("'worker'"));
            assertTrue(sql.contains("'api'"));
        }
        assertTrue(pageSql.contains("FROM total LEFT JOIN page ON true"));
    }

    @Test
    void ranksChildValuesByDistinctCountOfTheSelectedLogField() {
        var descriptor = new LogSubquery.Descriptor(1, "builtin:serviceName", "in",
                new LogSubquery.Child("builtin:serviceName", "structured-v1", ""),
                new LogSubquery.Rank("top", 5,
                        new LogSubquery.Measure("count_distinct", "resource:host.name")));
        var operation = new LogCalculated.Page(0, 20, new LogCalculated.Sort("timestamp", "desc"));

        String sql = GreptimeLogCalculatedPage.sql(query(operation, descriptor), " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");

        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"host.name\"]') AS sort_value"));
        assertTrue(sql.contains("COUNT(DISTINCT sort_value) AS child_count"));
        assertTrue(sql.contains("ROW_NUMBER() OVER (ORDER BY child_count DESC, child_key ASC)"));
        assertTrue(sql.contains("ordinal <= 5"));
    }

    @Test
    void pagesTheGlobalAntijoinOrderWithoutPartitionLocalLimitOrOffset() {
        var request = query(new LogCalculated.Page(1, 20, new LogCalculated.Sort("timestamp", "desc")));

        String sql = GreptimeLogCalculatedPage.sql(request, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");

        assertTrue(sql.contains("ROW_NUMBER() OVER (ORDER BY timestamp DESC NULLS LAST, timestamp DESC, "
                + "log_record_uid DESC) AS page_ordinal FROM filtered"));
        assertTrue(sql.contains("page_ordinal > 20 AND page_ordinal <= 40"));
        assertTrue(sql.contains("FROM total LEFT JOIN page ON true"));
    }

    private LogCalculated.Query query(LogCalculated.Operation operation) {
        var descriptor = new LogSubquery.Descriptor(1, "builtin:serviceName", "not_in",
                new LogSubquery.Child("builtin:serviceName", "structured-v1", "service:worker"),
                new LogSubquery.Rank("bottom", 2, new LogSubquery.Measure("count_all", null)));
        return query(operation, descriptor);
    }

    private LogCalculated.Query query(LogCalculated.Operation operation, LogSubquery.Descriptor descriptor) {
        var scope = new LogFacets.Scope("trusted", 1, 60000, null, null, null, null, null, null,
                null, null, Map.of(), Map.of(), Set.of(), false, null);
        var mainSearch = term("api");
        var childSearch = term("worker");
        return new LogCalculated.Query(scope, mainSearch, new LogCalculated.Definitions(2, List.of()), operation,
                null, new LogSubquery.Filter(descriptor, childSearch));
    }

    private LogSearchExpression term(String value) {
        return new LogSearchExpression.Term(new LogSearchExpression.Field(LogSearchExpression.Domain.BUILTIN, "service"),
                LogSearchExpression.Operator.EQUALS, value);
    }
}
