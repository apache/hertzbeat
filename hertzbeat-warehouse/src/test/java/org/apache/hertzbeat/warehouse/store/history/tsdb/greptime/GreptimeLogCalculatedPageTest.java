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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.Test;

class GreptimeLogCalculatedPageTest {
    @Test
    void oneStatementProjectsBeforeMixedOrAndRetainsCountOnEmptyPage() {
        String sql = GreptimeLogCalculatedPage.sql(query(), " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("scoped AS"));
        assertTrue(sql.contains("calculated_0 AS"));
        assertTrue(sql.contains("filtered AS"));
        assertTrue(sql.contains("service_name"));
        assertTrue(sql.contains(" OR "));
        assertTrue(sql.contains("total AS (SELECT COUNT(*)"));
        assertTrue(sql.contains("FROM total LEFT JOIN page ON true"));
        assertTrue(sql.contains("FROM total LEFT JOIN page ON true ORDER BY c_0 DESC NULLS LAST"));
        var result = GreptimeLogCalculatedPage.map(List.of(Map.of("total_count", 7)), query(), rows -> List.of());
        assertEquals(7, result.totalElements());
        assertTrue(result.rows().isEmpty());
    }

    @Test
    void heavyScalarSqlUsesNativeFunctionsAndNullContract() {
        String like = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse(
                "regexp_like(@missing,\"x\")"), Map.of(), Map.of());
        String replace = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse(
                "regexp_replace(\"1x2x3\",\"[0-9]\",\"#\")"), Map.of(), Map.of());
        String distance = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse(
                "levenshtein_distance(\"kitten\",\"sitting\")"), Map.of(), Map.of());
        assertTrue(like.contains("COALESCE(regexp_like("));
        assertTrue(replace.contains("regexp_replace("));
        assertTrue(distance.contains("levenshtein("));
    }

    @Test
    void rawMainSearchNarrowsPopulationBeforeExtractionBudgetGate() {
        var base = query();
        var extraction = new LogCalculated.Definition("c1", "extraction", null, null, "regex", "builtin:body",
                "(?<token>[A-Za-z]+)", List.of(new LogCalculated.Capture("token")),
                List.of(new LogCalculated.Output("token", "string")));
        var search = new LogSearchExpression.Term(new LogSearchExpression.Field(
                LogSearchExpression.Domain.ATTRIBUTE, "event.name"), LogSearchExpression.Operator.EQUALS,
                "codex.api_request");
        var request = new LogCalculated.Query(base.scope(), search, new LogCalculated.Definitions(2, List.of(extraction)),
                new LogCalculated.Page(0, 20, new LogCalculated.Sort("timestamp", "desc")));

        String sql = GreptimeLogCalculatedPage.sql(request, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        int scoped = sql.indexOf("scoped AS (");
        int narrowed = sql.indexOf("event.name", scoped);
        int admission = sql.indexOf("admission AS (");

        assertTrue(narrowed > scoped && narrowed < admission, sql);
    }

    @Test
    void mixedRawAndCalculatedSearchIsNotPartiallyPushedBeforeBudgetGate() {
        var base = query();
        var extraction = new LogCalculated.Definition("c1", "extraction", null, null, "regex", "builtin:body",
                "(?<token>[A-Za-z]+)", List.of(new LogCalculated.Capture("token")),
                List.of(new LogCalculated.Output("token", "string")));
        var calculated = new LogSearchExpression.Term(new LogSearchExpression.Field(
                LogSearchExpression.Domain.CALCULATED, "token"), LogSearchExpression.Operator.EQUALS, "GET");
        var raw = new LogSearchExpression.Term(new LogSearchExpression.Field(
                LogSearchExpression.Domain.ATTRIBUTE, "event.name"), LogSearchExpression.Operator.EQUALS,
                "codex.api_request");
        var request = new LogCalculated.Query(base.scope(), new LogSearchExpression.Or(List.of(raw, calculated)),
                new LogCalculated.Definitions(2, List.of(extraction)),
                new LogCalculated.Page(0, 20, new LogCalculated.Sort("timestamp", "desc")));

        String sql = GreptimeLogCalculatedPage.sql(request, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        int scoped = sql.indexOf("scoped AS (");
        int admission = sql.indexOf("admission AS (");

        assertFalse(sql.substring(scoped, admission).contains("event.name"), sql);
    }

    @Test
    void emptyOrAndNegatedRawSearchNeverDropsTrustedScope() {
        var base = query();
        var extraction = new LogCalculated.Definition("c1", "extraction", null, null, "regex", "builtin:body",
                "(?<token>[A-Za-z]+)", List.of(new LogCalculated.Capture("token")),
                List.of(new LogCalculated.Output("token", "string")));
        var trustedWhere = " WHERE hertzbeat_workspace_id = 'trusted'";
        var empty = admissionSql(base.scope(), new LogSearchExpression.And(List.of()), extraction, trustedWhere);
        String emptyScoped = empty.substring(empty.indexOf("scoped AS ("), empty.indexOf(", sized AS ("));
        assertEquals("scoped AS (SELECT * FROM fixture WHERE hertzbeat_workspace_id = 'trusted')", emptyScoped);

        var first = new LogSearchExpression.Term(new LogSearchExpression.Field(
                LogSearchExpression.Domain.ATTRIBUTE, "event.name"), LogSearchExpression.Operator.EQUALS, "codex.api_request");
        var second = new LogSearchExpression.Term(new LogSearchExpression.Field(
                LogSearchExpression.Domain.RESOURCE, "service.name"), LogSearchExpression.Operator.EQUALS, "codex");
        var disjunction = admissionSql(base.scope(), new LogSearchExpression.Or(List.of(first, second)), extraction, trustedWhere);
        int scoped = disjunction.indexOf("scoped AS (");
        int admission = disjunction.indexOf("admission AS (");
        String disjunctionScoped = disjunction.substring(scoped, disjunction.indexOf(", sized AS ("));
        assertTrue(disjunctionScoped.startsWith("scoped AS (SELECT * FROM fixture WHERE hertzbeat_workspace_id = 'trusted' AND ("));
        assertTrue(disjunctionScoped.contains(" OR "));
        assertTrue(disjunction.indexOf("event.name", scoped) < admission);
        assertTrue(disjunction.indexOf("service.name", scoped) < admission);

        var negated = admissionSql(base.scope(), new LogSearchExpression.Not(first), extraction, trustedWhere);
        String negatedScoped = negated.substring(negated.indexOf("scoped AS ("), negated.indexOf(", sized AS ("));
        assertTrue(negatedScoped.startsWith("scoped AS (SELECT * FROM fixture WHERE hertzbeat_workspace_id = 'trusted' AND (NOT "));
        assertTrue(negatedScoped.contains("event.name"));
    }

    private static String admissionSql(LogFacets.Scope scope, LogSearchExpression search,
                                       LogCalculated.Definition extraction, String where) {
        var request = new LogCalculated.Query(scope, search, new LogCalculated.Definitions(2, List.of(extraction)),
                new LogCalculated.Page(0, 20, new LogCalculated.Sort("timestamp", "desc")));
        return GreptimeLogCalculatedPage.sql(request, where, "fixture");
    }

    @Test
    void resourceReferencesProjectTheResourceJsonColumn() {
        String resource = GreptimeLogCalculatedFormula.sql(
                LogCalculatedFormula.parse("lower(resource(\"host.name\"))"), Map.of(), Map.of());
        assertTrue(resource.contains("json_get_string(resource_attributes, '$[\"host.name\"]')"));
        assertFalse(resource.contains("log_attributes"));
    }

    @Test
    void extractionSourcesUsePublishedBuiltinSqlExpressions() {
        assertEquals("service_name", GreptimeLogCalculatedAdmission.source("builtin:serviceName"));
        assertEquals("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]')",
                GreptimeLogCalculatedAdmission.source("builtin:environment"));
        assertTrue(GreptimeLogCalculatedAdmission.source("builtin:severityCategory").contains("severity_number"));
        assertThrows(IllegalArgumentException.class,
                () -> GreptimeLogCalculatedAdmission.source("builtin:secret"));
    }

    @Test
    void moduloUsesDivisorSignedFloorSemanticsAndZeroGuard() {
        String half = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("1/2"),
                Map.of(), Map.of());
        String negativeDividend = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("-5%3"),
                Map.of(), Map.of());
        String negativeDivisor = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("5%-3"),
                Map.of(), Map.of());
        assertTrue(half.contains("CAST('1' AS DOUBLE)"));
        assertTrue(half.contains("CAST('2' AS DOUBLE)"));
        assertTrue(half.contains(" / NULLIF("));
        assertTrue(negativeDividend.contains("FLOOR("));
        assertTrue(negativeDividend.contains("CAST("));
        assertTrue(negativeDividend.contains("NULLIF("));
        assertTrue(negativeDivisor.contains("FLOOR("));
    }

    @Test
    void arithmeticPromotesLargeIntegerOperandsBeforeNativeEvaluation() {
        for (String expression : List.of("1000000000000*1000000000000", "9223372036854775807+1",
                "-9223372036854775807-1")) {
            String sql = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse(expression),
                    Map.of(), Map.of());
            assertTrue(sql.contains(" AS DOUBLE)"));
        }
        String product = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse(
                "1000000000000*1000000000000"), Map.of(), Map.of());
        assertTrue(product.contains("CAST('1000000000000' AS DOUBLE)"));
        String position = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse(
                "left(\"abcd\",2)"), Map.of(), Map.of());
        assertTrue(position.contains("left('abcd', 2)"));
    }

    @Test
    void heavyFunctionsHaveSameStatementWorkAdmission() {
        var base = query();
        var fields = new LogCalculated.Definitions(2, List.of(
                new LogCalculated.Definition("c1", "formula", "matches", "regexp_like(@message,\"x\")",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("matches", "boolean"))),
                new LogCalculated.Definition("c2", "formula", "distance",
                        "levenshtein_distance(@message,\"x\")", null, null, null, List.of(),
                        List.of(new LogCalculated.Output("distance", "number")))));
        var heavy = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()), fields,
                new LogCalculated.Page(0, 20, new LogCalculated.Sort("timestamp", "desc")));
        String sql = GreptimeLogCalculatedPage.sql(heavy, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("heavy_regex_bytes"));
        assertTrue(sql.contains("heavy_distance_work"));
        assertTrue(sql.contains("CAST(input_bytes AS DOUBLE)"));
        assertTrue(sql.contains("SUM(heavy_distance_work), 0) <= 1000000"));
        assertTrue(sql.indexOf("admitted_rows AS") < sql.indexOf("regexp_like("));
    }

    @Test
    void entropyUsesInputBoundedNativeByteExpansionAcrossReadSurfaces() {
        var base = query();
        var fields = new LogCalculated.Definitions(2, List.of(new LogCalculated.Definition(
                "c1", "formula", "entropy_value", "entropy(@message)", null, null, null,
                List.of(), List.of(new LogCalculated.Output("entropy_value", "number")))));
        var page = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()), fields,
                new LogCalculated.Page(0, 20, new LogCalculated.Sort("timestamp", "desc")));
        var operations = List.<LogCalculated.Operation>of(page.operation(), new LogCalculated.Trend(60000),
                new LogCalculated.Facet("calculated:entropy_value", 10, null),
                new LogCalculated.Analysis("global", List.of(), null, 10, "count-desc", 1, null));
        for (var operation : operations) {
            var request = new LogCalculated.Query(base.scope(), page.search(), fields, operation);
            String sql = switch (operation) {
                case LogCalculated.Page ignored -> GreptimeLogCalculatedPage.sql(request,
                        " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
                case LogCalculated.Trend ignored -> GreptimeLogCalculatedAggregate.trendSql(request,
                        " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
                case LogCalculated.Facet ignored -> GreptimeLogCalculatedAggregate.facetSql(request,
                        " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
                case LogCalculated.Analysis ignored -> GreptimeLogCalculatedAnalysis.sql(request,
                        " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
            };
            assertTrue(sql.contains("SUM(heavy_entropy_positions), 0) <= 65536"));
            assertTrue(sql.contains("unnest(range(0, octet_length("));
            assertTrue(sql.contains("encode("));
            assertTrue(sql.contains("SELECT DISTINCT entropy_source_0"));
            assertTrue(sql.contains("GROUP BY entropy_source_0, byte_value"));
            assertTrue(sql.contains("row_number() OVER (PARTITION BY entropy_frequencies_0.entropy_source_0"));
            assertTrue(sql.contains("entropy_input_0.entropy_source_0 = entropy_values_0.entropy_source_0"));
            assertTrue(sql.indexOf("admitted_rows AS") < sql.indexOf("unnest(range"));
            assertTrue(sql.contains("admission.admitted"));
        }
    }

    @Test
    void entropyCallsReceiveDistinctColumnsAndCanFeedLaterDefinitions() {
        var base = query();
        var definitions = new LogCalculated.Definitions(2, List.of(
                new LogCalculated.Definition("c1", "formula", "mixed",
                        "entropy(\"abab\")+entropy(@message)", null, null, null, List.of(),
                        List.of(new LogCalculated.Output("mixed", "number"))),
                new LogCalculated.Definition("c2", "formula", "doubled", "#mixed*2",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("doubled", "number")))));
        var request = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()), definitions,
                new LogCalculated.Page(0, 10, new LogCalculated.Sort("timestamp", "desc")));
        String sql = GreptimeLogCalculatedPage.sql(request, " WHERE 1=1", "fixture");
        assertTrue(sql.contains("entropy_joined_0 AS"));
        assertTrue(sql.contains("entropy_joined_1 AS"));
        assertTrue(sql.contains("entropy_value_0"));
        assertTrue(sql.contains("entropy_value_1"));
        assertTrue(sql.contains("heavy_entropy_positions"));
    }

    @Test
    void appliesGroupSelectionAfterTrustedScopeAndAdmission() {
        var selection = new LogGroupSelection(1, List.of(new LogGroupSelection.Key(
                LogFacets.Field.parse("builtin:serviceName"), "value", "api")));
        var base = query();
        var selected = new LogCalculated.Query(base.scope(), base.search(), base.definitions(), base.page(), selection);
        String sql = GreptimeLogCalculatedPage.sql(selected, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("scoped AS (SELECT * FROM fixture WHERE hertzbeat_workspace_id = 'trusted')"));
        assertTrue(sql.indexOf("filtered AS") < sql.indexOf("'api'"));
        assertTrue(sql.contains("'api'"));
    }

    @Test
    void rawSortProjectsThroughExistingCatalogBeforePagination() {
        var base = query();
        var sorted = new LogCalculated.Query(base.scope(), base.search(), base.definitions(),
                new LogCalculated.Page(0, 20, new LogCalculated.Sort("resource:deployment.version", "asc")));
        String sql = GreptimeLogCalculatedPage.sql(sorted, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("raw_sort_value"));
        assertTrue(sql.contains("ORDER BY raw_sort_value ASC NULLS LAST, timestamp DESC, log_record_uid DESC"));
        var numeric = new LogCalculated.Query(base.scope(), base.search(), base.definitions(),
                new LogCalculated.Page(0, 20, new LogCalculated.Sort("attribute:duration_ms", "desc", "number")));
        assertTrue(GreptimeLogCalculatedPage.sql(numeric, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture")
                .contains("TRY_CAST("));
    }

    @Test
    void trendAndFacetUseTheSameFilteredProjection() {
        var base = query();
        var trend = new LogCalculated.Query(base.scope(), base.search(), base.definitions(),
                new LogCalculated.Trend(60000), null);
        var facet = new LogCalculated.Query(base.scope(), base.search(), base.definitions(),
                new LogCalculated.Facet("calculated:duration_seconds", 20, null), null);
        String trendSql = GreptimeLogCalculatedAggregate.trendSql(trend, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        String facetSql = GreptimeLogCalculatedAggregate.facetSql(facet, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(trendSql.contains("calculated_0 AS"));
        assertTrue(trendSql.contains("filtered AS"));
        assertTrue(facetSql.contains("calculated_0 AS"));
        assertTrue(facetSql.contains("filtered AS"));
        assertTrue(facetSql.contains("COUNT(*) AS matching_total"));
        assertTrue(trendSql.contains("FROM totals LEFT JOIN buckets ON true"));
        assertTrue(facetSql.contains("FROM totals CROSS JOIN search_totals"
                + " LEFT JOIN top_values ON top_values.facet_rank <= 21"));
    }

    @Test
    void fillsRealZeroBucketsAndChecksWholePopulation() {
        var base = query();
        var scope = new LogFacets.Scope("trusted", 1, 120000, null, null, null, null, null, null,
                null, null, Map.of(), Map.of(), Set.of(), false, null);
        var request = new LogCalculated.Query(scope, base.search(), base.definitions(),
                new LogCalculated.Trend(60000));
        var result = GreptimeLogCalculatedAggregate.trend(List.of(
                Map.of("matching_total", 2, "bucket", "1970-01-01T00:00:00Z", "bucket_count", 2)), request);
        assertEquals(2, result.matchingTotal());
        assertEquals(List.of(2L, 0L, 0L), result.buckets().stream().map(bucket -> bucket.count()).toList());
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogCalculatedAggregate.trend(List.of(
                Map.of("matching_total", 3, "bucket", "1970-01-01T00:00:00Z", "bucket_count", 2)), request));
    }

    @Test
    void numericFacetKeepsNullPopulationAndRanksTypedValues() {
        var base = query();
        var request = new LogCalculated.Query(base.scope(), base.search(), base.definitions(),
                new LogCalculated.Facet("calculated:duration_seconds", 1, null));
        String sql = GreptimeLogCalculatedAggregate.facetSql(request,
                " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, facet_value ASC) AS facet_rank"));
        assertTrue(sql.contains("LEFT JOIN top_values ON top_values.facet_rank <= 2"));
        var result = GreptimeLogCalculatedAggregate.facet(List.of(
                Map.of("matching_total", 7, "missing_or_null_count", 2, "searched_count", 5,
                        "value", 1.5, "count", 3),
                Map.of("matching_total", 7, "missing_or_null_count", 2, "searched_count", 5,
                        "value", 2.5, "count", 2)), request);
        assertEquals(7, result.matchingTotal());
        assertEquals(2, result.missingOrNullCount());
        assertEquals(1.5, result.values().getFirst().value());
        assertTrue(result.truncated());
    }

    @Test
    void rawNumericJsonFacetKeepsExistingTextValueSemantics() {
        var base = query();
        var request = new LogCalculated.Query(base.scope(), base.search(), base.definitions(),
                new LogCalculated.Facet("attribute:ttft_ms", 20, null));
        String sql = GreptimeLogCalculatedAggregate.facetSql(request,
                " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("json_get_string(log_attributes, '$[\"ttft_ms\"]') AS facet_value"));
        var result = GreptimeLogCalculatedAggregate.facet(List.of(Map.of(
                "matching_total", 2, "missing_or_null_count", 1, "searched_count", 1,
                "value", "727", "count", 1)), request);
        assertEquals("727", result.values().getFirst().value());
    }

    @Test
    void analysisRanksPrefixesAfterTheSameProjectedFilter() {
        var base = query();
        var analysis = new LogCalculated.Analysis("timeseries", List.of(
                new LogCalculated.Dimension("builtin:serviceName", 2),
                new LogCalculated.Dimension("calculated:duration_seconds", 5)),
                new LogCalculated.Measure("avg", "calculated:duration_seconds"),
                10, "measure-desc", 1, 60000L);
        var request = new LogCalculated.Query(base.scope(), base.search(), base.definitions(), analysis);
        String sql = GreptimeLogCalculatedAnalysis.sql(request,
                " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("calculated_0 AS"));
        assertTrue(sql.contains("filtered AS"));
        assertTrue(sql.contains("ranked1 AS"));
        assertTrue(sql.contains("selected2 AS"));
        assertTrue(sql.contains("date_bin('60 seconds'"));
        assertTrue(sql.contains("CASE WHEN COUNT(f.sample)=0 THEN NULL"));
    }

    @Test
    void globalCountAnalysisUsesEmptyKeysWithoutSyntheticGroup() {
        var base = query();
        var operation = new LogCalculated.Analysis("groups", List.of(), null, 20, "count-desc", 1, null);
        var request = new LogCalculated.Query(base.scope(), base.search(), base.definitions(), operation);
        var result = GreptimeLogCalculatedAnalysisRows.map(List.of(Map.of(
                "matched", 7, "ranked_count", 1, "prefix_overflow", 0,
                "final_ordinal", 1, "group_count", 7)), request);
        assertEquals(7, result.matchingTotal());
        assertEquals(List.of(), result.groups().getFirst().keys());
        assertEquals(null, result.groups().getFirst().measurement());
        assertEquals(false, result.truncated());
    }

    @Test
    void analysisNullKeyAndMissingMeasurementRemainDistinctFromZero() {
        var base = query();
        var operation = new LogCalculated.Analysis("groups", List.of(
                new LogCalculated.Dimension("calculated:duration_seconds", 5)),
                new LogCalculated.Measure("unique", "calculated:duration_seconds"),
                5, "measure-desc", 1, null);
        var request = new LogCalculated.Query(base.scope(), base.search(), base.definitions(), operation);
        var row = new java.util.HashMap<String, Object>();
        row.put("matched", 3);
        row.put("ranked_count", 1);
        row.put("prefix_overflow", 1);
        row.put("k1", "null");
        row.put("v1", 0);
        row.put("final_ordinal", 1);
        row.put("group_count", 3);
        row.put("samples", 0);
        row.put("measurement", null);
        var result = GreptimeLogCalculatedAnalysisRows.map(List.of(row), request);
        assertEquals("null", result.groups().getFirst().keys().getFirst().kind());
        assertEquals(null, result.groups().getFirst().keys().getFirst().value());
        assertEquals("no_samples", result.groups().getFirst().measurement().state());
        assertTrue(result.truncated());
    }

    @Test
    void analysisFillsMeasuredTimeseriesBucketsAndChecksSampleSum() {
        var base = query();
        var scope = new LogFacets.Scope("trusted", 1, 120000, null, null, null, null, null, null,
                null, null, Map.of(), Map.of(), Set.of(), false, null);
        var operation = new LogCalculated.Analysis("timeseries", List.of(),
                new LogCalculated.Measure("avg", "calculated:duration_seconds"),
                5, "measure-desc", 1, 60000L);
        var request = new LogCalculated.Query(scope, base.search(), base.definitions(), operation);
        var row = new java.util.HashMap<String, Object>();
        row.put("matched", 2);
        row.put("ranked_count", 1);
        row.put("prefix_overflow", 0);
        row.put("final_ordinal", 1);
        row.put("group_count", 2);
        row.put("samples", 1);
        row.put("measurement", 1.5);
        row.put("bucket", "1970-01-01T00:00:00Z");
        row.put("bucket_count", 2);
        row.put("bucket_samples", 1);
        row.put("bucket_measurement", 1.5);
        var result = GreptimeLogCalculatedAnalysisRows.map(List.of(row), request);
        assertEquals(List.of(2L, 0L, 0L), result.groups().getFirst().buckets().stream()
                .map(bucket -> bucket.count()).toList());
        assertEquals("no_samples", result.groups().getFirst().buckets().get(1).measurement().state());
    }

    @Test
    void analysisRejectsSelectedGroupCountsAboveMatchedPopulation() {
        var base = query();
        var operation = new LogCalculated.Analysis("groups", List.of(
                new LogCalculated.Dimension("builtin:serviceName", 2)), null, 2, "count-desc", 1, null);
        var request = new LogCalculated.Query(base.scope(), base.search(), base.definitions(), operation);
        var first = Map.<String, Object>of("matched", 3, "ranked_count", 2, "prefix_overflow", 0,
                "k1", "value", "v1", "api", "final_ordinal", 1, "group_count", 2);
        var second = Map.<String, Object>of("matched", 3, "ranked_count", 2, "prefix_overflow", 0,
                "k1", "value", "v1", "worker", "final_ordinal", 2, "group_count", 2);
        assertThrows(IllegalArgumentException.class,
                () -> GreptimeLogCalculatedAnalysisRows.map(List.of(first, second), request));
    }

    @Test
    void typedFormulaSearchProjectionAndPageDecodeStayAligned() {
        var base = query();
        var definitions = new LogCalculated.Definitions(2, List.of(
                new LogCalculated.Definition("c1", "formula", "label", "concat(\"[\",@missing,\"]\")",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("label", "string"))),
                new LogCalculated.Definition("c2", "formula", "empty", "is_null(@missing)",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("empty", "boolean"))),
                new LogCalculated.Definition("c3", "formula", "peak", "max(-1,1,5,5)",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("peak", "number")))));
        var search = new LogSearchExpression.And(List.of(
                new LogSearchExpression.Term(new LogSearchExpression.Field(LogSearchExpression.Domain.CALCULATED,
                        "label"), LogSearchExpression.Operator.GLOB, "[*"),
                new LogSearchExpression.Term(new LogSearchExpression.Field(LogSearchExpression.Domain.CALCULATED,
                        "empty"), LogSearchExpression.Operator.EQUALS, "true")));
        var request = new LogCalculated.Query(base.scope(), search, definitions,
                new LogCalculated.Page(0, 10, new LogCalculated.Sort("calculated:label", "asc")));
        String sql = GreptimeLogCalculatedPage.sql(request, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("COALESCE("));
        assertTrue(sql.contains("regexp_like(c_0"));
        assertTrue(sql.contains("c_1 = TRUE"));
        assertTrue(sql.contains("greatest("));
        assertTrue(sql.contains("CAST('5' AS DOUBLE)"));
        var result = GreptimeLogCalculatedPage.map(List.of(Map.of("admitted", true, "total_count", 1, "timestamp", 1,
                        "c_0", "[]", "c_1", true, "c_2", 5.0)), request,
                rows -> List.of(LogEntry.builder().timeUnixNano(1_000_000L).build()));
        assertEquals("[]", result.rows().getFirst().derived().get("label"));
        assertEquals(true, result.rows().getFirst().derived().get("empty"));
        assertEquals(5.0, result.rows().getFirst().derived().get("peak"));
    }

    @Test
    void rawNumericValuesUseTheSharedStringConversion() {
        String lower = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("lower(@attempt)"),
                Map.of(), Map.of());
        String concat = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("concat(\"[\",@attempt,\"]\")"),
                Map.of(), Map.of());
        String textjoin = GreptimeLogCalculatedFormula.sql(
                LogCalculatedFormula.parse("textjoin(\"-\",\"false\",@attempt,\"x\")"),
                Map.of(), Map.of());
        assertFalse(lower.contains("json_path_match"));
        assertFalse(concat.contains("json_path_match"));
        assertFalse(textjoin.contains("json_path_match"));
    }

    @Test
    void directRawStringOutputKeepsTheNullableJsonProjection() {
        String sql = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("@code.filepath"),
                Map.of(), Map.of());
        assertEquals("json_get_string(log_attributes, '$[\"code.filepath\"]')", sql);
        assertFalse(sql.contains("COALESCE"));
    }

    @Test
    void typedOperatorsCompileToBoundedNativeSqlWithNullConditionPreserved() {
        String sql = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse(
                "if((2^3==8) && (7%4==3) AND !(2<1), \"yes\", \"no\")"), Map.of(), Map.of());
        assertTrue(sql.contains("power(CAST('2' AS DOUBLE), CAST('3' AS DOUBLE))"));
        assertTrue(sql.contains("FLOOR("));
        assertTrue(sql.contains("NULLIF("));
        assertTrue(sql.contains(" IS NULL THEN NULL WHEN "));
        String missing = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse(
                "if(@audit_missing == @audit_missing, \"equal\", \"not_equal\")"), Map.of(), Map.of());
        assertTrue(missing.contains(" IS NULL THEN NULL WHEN "));
        String service = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("upper(service)"),
                Map.of(), Map.of());
        String status = GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("lower(status)"),
                Map.of(), Map.of());
        assertTrue(service.contains("service_name"));
        assertTrue(status.contains("severity_number BETWEEN 9 AND 12"));
        var budget = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> GreptimeLogCalculatedFormula.sql(LogCalculatedFormula.parse("2^".repeat(12) + "2"),
                        Map.of(), Map.of()));
        assertEquals("budget_exceeded", budget.code());
    }

    @Test
    void reservedAndOperatorOutputsShareAllFourGuardedReadSurfaces() {
        var base = query();
        var definitions = new LogCalculated.Definitions(2, List.of(
                new LogCalculated.Definition("c1", "formula", "flag", "if((2^3==8) && (7%4==3),\"yes\",\"no\")",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("flag", "string"))),
                new LogCalculated.Definition("c2", "formula", "serviceLabel", "upper(service)",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("serviceLabel", "string"))),
                new LogCalculated.Definition("c3", "formula", "statusLabel", "lower(status)",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("statusLabel", "string")))));
        var search = new LogSearchExpression.Term(new LogSearchExpression.Field(
                LogSearchExpression.Domain.CALCULATED, "flag"), LogSearchExpression.Operator.EQUALS, "yes");
        var operations = List.<LogCalculated.Operation>of(
                new LogCalculated.Page(0, 10, new LogCalculated.Sort("calculated:serviceLabel", "asc")),
                new LogCalculated.Trend(60000),
                new LogCalculated.Facet("calculated:serviceLabel", 10, null),
                new LogCalculated.Analysis("groups", List.of(new LogCalculated.Dimension("calculated:statusLabel", 5)),
                        null, 5, "count-desc", 1, null));
        for (var operation : operations) {
            var request = new LogCalculated.Query(base.scope(), search, definitions, operation);
            String sql = switch (operation) {
                case LogCalculated.Page ignored -> GreptimeLogCalculatedPage.sql(request, " WHERE 1=1", "fixture");
                case LogCalculated.Trend ignored -> GreptimeLogCalculatedAggregate.trendSql(request, " WHERE 1=1", "fixture");
                case LogCalculated.Facet ignored -> GreptimeLogCalculatedAggregate.facetSql(request, " WHERE 1=1", "fixture");
                case LogCalculated.Analysis ignored -> GreptimeLogCalculatedAnalysis.sql(request, " WHERE 1=1", "fixture");
            };
            assertTrue(sql.contains("admission AS"));
            assertTrue(sql.contains("octet_length(service_name)"));
            assertTrue(sql.contains("severity_number BETWEEN 9 AND 12"));
            assertTrue(sql.contains("c_0 = 'yes'"));
        }
    }

    @Test
    void extractionPreviewUsesTheNativeNamedCaptureCompiler() {
        var definition = new LogCalculated.Definition("c3", "extraction", null, null, "regex", "builtin:body",
                "(?<token>[A-Za-z]+) (?<latency>[0-9.]+)",
                List.of(new LogCalculated.Capture("token"), new LogCalculated.Capture("latency")),
                List.of(new LogCalculated.Output("token", "string"), new LogCalculated.Output("latency", "string")));
        String sql = GreptimeLogCalculatedPreview.sql(definition, "GET 12.5");
        assertTrue(sql.contains("regexp_match(source_text, '(?P<token>"));
        assertTrue(sql.contains("regexp_match(source_text, '(?:[A-Za-z]+) (?P<latency>"));
        assertTrue(sql.contains("), 1) AS c_0"));
        assertTrue(sql.contains("), 1) AS c_1"));
        var preview = GreptimeLogCalculatedPreview.map(List.of(Map.of("c_0", "GET", "c_1", "12.5")), definition);
        assertEquals(Map.of("token", "GET", "latency", "12.5"), preview.values());
        var absent = new java.util.HashMap<String, Object>();
        absent.put("c_0", "a");
        absent.put("c_1", null);
        assertEquals(null, GreptimeLogCalculatedPreview.map(List.of(absent), definition).values().get("latency"));
        absent.put("c_1", "");
        assertEquals("", GreptimeLogCalculatedPreview.map(List.of(absent), definition).values().get("latency"));
    }

    @Test
    void extractionProjectsEveryCaptureBehindSameStatementInputAdmission() {
        var base = query();
        var extraction = new LogCalculated.Definition("c1", "extraction", null, null, "regex", "builtin:body",
                "(?<token>[A-Za-z]+) (?<latency>[0-9.]+)",
                List.of(new LogCalculated.Capture("token"), new LogCalculated.Capture("latency")),
                List.of(new LogCalculated.Output("token", "string"), new LogCalculated.Output("latency", "string")));
        var formula = new LogCalculated.Definition("c2", "formula", "seconds", "#latency / 1000",
                null, null, null, List.of(), List.of(new LogCalculated.Output("seconds", "number")));
        var request = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()),
                new LogCalculated.Definitions(2, List.of(extraction, formula)),
                new LogCalculated.Page(0, 10, new LogCalculated.Sort("timestamp", "desc")));
        String sql = GreptimeLogCalculatedPage.sql(request, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(sql.contains("admission AS"));
        assertTrue(sql.contains("octet_length(body)"));
        assertTrue(sql.contains("COUNT(*) <= 1000"));
        assertTrue(sql.contains("MAX(max_source_bytes), 0) <= 16384"));
        assertTrue(sql.contains("SUM(input_bytes), 0) * 3 <= 16777216"));
        assertTrue(sql.contains("admission.admitted"));
        assertTrue(sql.contains("regexp_match(body, '(?P<token>"));
        assertTrue(sql.contains("array_element(captures_1, 1)"));
        assertTrue(sql.indexOf("admitted_rows AS") < sql.indexOf("regexp_match(body"));
        var row = new java.util.HashMap<String, Object>();
        row.put("admitted", true);
        row.put("total_count", 1);
        row.put("timestamp", 1);
        row.put("c_0", "GET");
        row.put("c_1", "12.5");
        row.put("c_2", 0.0125);
        var result = GreptimeLogCalculatedPage.map(List.of(row), request,
                rows -> List.of(LogEntry.builder().timeUnixNano(1_000_000L).build()));
        assertEquals(Map.of("token", "GET", "latency", "12.5", "seconds", 0.0125),
                result.rows().getFirst().derived());
        row.put("admitted", false);
        assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> GreptimeLogCalculatedPage.map(List.of(row), request, rows -> List.of()));
    }

    @Test
    void costlyRawStringAdmissionDoesNotRestrictNumericOnlyFormulas() {
        var base = query();
        String numericSql = GreptimeLogCalculatedPage.sql(base,
                " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertFalse(numericSql.contains("admission AS"));
        var stringField = new LogCalculated.Definition("c2", "formula", "label", "concat(@attempt,\"-\",@attempt)",
                null, null, null, List.of(), List.of(new LogCalculated.Output("label", "string")));
        var request = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()),
                new LogCalculated.Definitions(2, List.of(stringField)),
                new LogCalculated.Page(0, 10, new LogCalculated.Sort("timestamp", "desc")));
        String guarded = GreptimeLogCalculatedPage.sql(request,
                " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(guarded.contains("COUNT(*) <= 1000"));
        assertTrue(guarded.contains("octet_length(json_get_string(log_attributes, '$[\"attempt\"]'))"));
        assertTrue(guarded.contains("SUM(input_bytes), 0) * 2"));
    }

    @Test
    void extractionAdmissionSentinelIsVisibleInEveryAggregateRead() {
        var base = query();
        var extraction = new LogCalculated.Definition("c1", "extraction", null, null, "grok", "builtin:body",
                "^%{number:latency}$", List.of(new LogCalculated.Capture("latency")),
                List.of(new LogCalculated.Output("latency", "number")));
        var definitions = new LogCalculated.Definitions(2, List.of(extraction));
        var search = new LogSearchExpression.And(List.of());
        var trend = new LogCalculated.Query(base.scope(), search, definitions, new LogCalculated.Trend(60000));
        var facet = new LogCalculated.Query(base.scope(), search, definitions,
                new LogCalculated.Facet("calculated:latency", 10, null));
        var analysis = new LogCalculated.Query(base.scope(), search, definitions,
                new LogCalculated.Analysis("groups", List.of(), null, 10, "count-desc", 1, null));
        for (String sql : List.of(
                GreptimeLogCalculatedAggregate.trendSql(trend, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture"),
                GreptimeLogCalculatedAggregate.facetSql(facet, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture"),
                GreptimeLogCalculatedAnalysis.sql(analysis, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture"))) {
            assertTrue(sql.contains("admission.admitted"));
            assertTrue(sql.contains("FROM admission CROSS JOIN"));
            assertTrue(sql.contains("regexp_match(body, '^(?P<latency>"));
        }
        assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> GreptimeLogCalculatedAggregate.trend(List.of(Map.of("admitted", false)), trend));
        assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> GreptimeLogCalculatedAggregate.facet(List.of(Map.of("admitted", false)), facet));
        assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> GreptimeLogCalculatedAnalysisRows.map(List.of(Map.of("admitted", false)), analysis));
    }

    @Test
    void nativeRegexCompileFailureIsAnAuthoredPatternError() {
        var definition = new LogCalculated.Definition("c1", "extraction", null, null, "regex", "builtin:body",
                "(?<token>[z-a])", List.of(new LogCalculated.Capture("token")),
                List.of(new LogCalculated.Output("token", "string")));
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var response = new org.springframework.web.client.HttpServerErrorException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "{\"error\":\"Compute error: Regular expression did not compile: Syntax\"}"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8), java.nio.charset.StandardCharsets.UTF_8);
        when(executor.executeStrict(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RuntimeException("Greptime query failed", response));
        var invalid = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> GreptimeLogCalculatedPreview.read(executor, definition, "a"));
        assertEquals("invalid_pattern", invalid.code());
    }

    @Test
    void nativeQueryPatternFailureRemainsAnAuthoredError() {
        var base = query();
        var extraction = new LogCalculated.Definition("c1", "extraction", null, null, "regex", "builtin:body",
                "(?<token>[z-a])", List.of(new LogCalculated.Capture("token")),
                List.of(new LogCalculated.Output("token", "string")));
        var request = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()),
                new LogCalculated.Definitions(2, List.of(extraction)),
                new LogCalculated.Page(0, 10, new LogCalculated.Sort("timestamp", "desc")));
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var response = new org.springframework.web.client.HttpServerErrorException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "{\"error\":\"Compute error: Regular expression did not compile: Syntax\"}"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8), java.nio.charset.StandardCharsets.UTF_8);
        when(executor.executeStrict(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RuntimeException("Greptime query failed", response));
        var invalid = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> GreptimeLogCalculatedPage.read(executor, request, " WHERE hertzbeat_workspace_id = 'trusted'",
                        rows -> List.of()));
        assertEquals("invalid_pattern", invalid.code());
    }

    @Test
    void nativeLikePatternParseFailureRemainsAnAuthoredError() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var response = new org.springframework.web.client.HttpServerErrorException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "{\"error\":\"regex parse error:\\n    [\\n    ^\\nerror: unclosed character class\"}"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8), java.nio.charset.StandardCharsets.UTF_8);
        when(executor.executeStrict(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RuntimeException("Greptime query failed", response));
        var invalid = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> GreptimeLogCalculatedPreview.checkPattern(executor, "["));
        assertEquals("invalid_pattern", invalid.code());
    }

    @Test
    void optionalCaptureDoesNotShiftLaterPreviewOrPageOutputs() {
        var definition = new LogCalculated.Definition("c1", "extraction", null, null, "regex", "builtin:body",
                "^(?<optional>a)?(?<empty>)$", List.of(new LogCalculated.Capture("optional"),
                        new LogCalculated.Capture("empty")), List.of(
                            new LogCalculated.Output("optional", "string"),
                            new LogCalculated.Output("empty", "string")));
        String preview = GreptimeLogCalculatedPreview.sql(definition, "");
        assertTrue(preview.contains("regexp_match(source_text, '^(?P<optional>a)?(?:)$')"));
        assertTrue(preview.contains("regexp_match(source_text, '^(?:a)?(?P<empty>)$')"));
        var base = query();
        var request = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()),
                new LogCalculated.Definitions(2, List.of(definition)),
                new LogCalculated.Page(0, 10, new LogCalculated.Sort("timestamp", "desc")));
        String page = GreptimeLogCalculatedPage.sql(request, " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(page.contains("'^(?P<optional>a)?(?:)$'"));
        assertTrue(page.contains("'^(?:a)?(?P<empty>)$'"));
    }

    @Test
    void typedStringFacetAndBooleanAnalysisKeysUseOutputDescriptors() {
        var base = query();
        var definitions = new LogCalculated.Definitions(2, List.of(
                new LogCalculated.Definition("c1", "formula", "label", "lower(\"ABC\")",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("label", "string"))),
                new LogCalculated.Definition("c2", "formula", "empty", "is_null(@missing)",
                        null, null, null, List.of(), List.of(new LogCalculated.Output("empty", "boolean")))));
        var facet = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()), definitions,
                new LogCalculated.Facet("calculated:label", 10, "a"));
        String facetSql = GreptimeLogCalculatedAggregate.facetSql(facet,
                " WHERE hertzbeat_workspace_id = 'trusted'", "fixture");
        assertTrue(facetSql.contains("strpos(lower(facet_value), lower('a'))"));
        var values = GreptimeLogCalculatedAggregate.facet(List.of(Map.of(
                "admitted", true, "matching_total", 2, "missing_or_null_count", 1, "searched_count", 1,
                "value", "abc", "count", 1)), facet);
        assertEquals("abc", values.values().getFirst().value());
        assertEquals(1, values.searchMatchedCount());
        var analysis = new LogCalculated.Query(base.scope(), new LogSearchExpression.And(List.of()), definitions,
                new LogCalculated.Analysis("groups", List.of(new LogCalculated.Dimension("calculated:empty", 2)),
                        null, 2, "count-desc", 1, null));
        var groups = GreptimeLogCalculatedAnalysisRows.map(List.of(Map.of(
                "admitted", true, "matched", 2, "ranked_count", 1, "prefix_overflow", 0, "k1", "value", "v1", true,
                "final_ordinal", 1, "group_count", 2)), analysis);
        assertEquals(true, groups.groups().getFirst().keys().getFirst().value());
    }


    private LogCalculated.Query query() {
        var scope = new LogFacets.Scope("trusted", 1, 60000, null, null, null, null, null, null,
                null, null, Map.of(), Map.of(), Set.of(), false, null);
        var definition = new LogCalculated.Definition("c1", "formula", "duration_seconds", "@duration_ms / 1000",
                null, null, null, List.of(), List.of(new LogCalculated.Output("duration_seconds", "number")));
        var search = new LogSearchExpression.Or(List.of(
                new LogSearchExpression.Term(new LogSearchExpression.Field(LogSearchExpression.Domain.BUILTIN, "service"),
                        LogSearchExpression.Operator.EQUALS, "api"),
                new LogSearchExpression.Term(new LogSearchExpression.Field(LogSearchExpression.Domain.CALCULATED,
                        "duration_seconds"), LogSearchExpression.Operator.EQUALS, "1.307")));
        return new LogCalculated.Query(scope, search, new LogCalculated.Definitions(2, List.of(definition)),
                new LogCalculated.Page(100, 50, new LogCalculated.Sort("calculated:duration_seconds", "desc")));
    }
}
