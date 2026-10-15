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

package org.apache.hertzbeat.manager.service.impl;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.SignalDashboardDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

class PersesDashboardDocumentValidatorTest {
    private final PersesDashboardDocumentValidator validator = new PersesDashboardDocumentValidator();

    @Test
    void savesOnlyVersionedCalculatedLogPanelsWithExecutableDependencies() throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        String definitions = """
                {"version":2,"nextFieldSeq":2,"fields":[
                  {"id":"c1","kind":"formula","name":"upperService","expression":"upper(@service)"}]}
                """;
        query.put("searchSyntax", "structured-v2");
        query.put("logCalculatedV2", definitions);
        query.put("search", "#upperService:CODEX-APP-SERVER");
        query.put("limit", 20);
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        query.remove("search");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        query.put("search", "#missing:CODEX-APP-SERVER");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.put("search", "#upperService:CODEX-APP-SERVER");
        query.put("logCalculatedV2", definitions.replace("\"version\":2", "\"version\":1"));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void rejectsCalculatedPanelScopeAndLegacyOrUnknownDefinitionShapes() throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        String definitions = """
                {"version":2,"nextFieldSeq":2,"fields":[
                  {"id":"c1","kind":"formula","name":"upperService","expression":"upper(@service)"}]}
                """;
        query.put("searchSyntax", "structured-v2");
        query.put("logCalculatedV2", definitions);
        for (String invalid : new String[]{
                definitions.replace("\"nextFieldSeq\":2", "\"nextFieldSeq\":1"),
                definitions.replace("\"nextFieldSeq\":2", "\"nextFieldSeq\":2,\"extra\":true"),
                definitions.replace("\"expression\":\"upper(@service)\"", "\"expression\":\"upper(@missing)\""),
                definitions.replace("\"version\":2", "\"version\":2,\"version\":2")}) {
            query.put("logCalculatedV2", invalid);
            assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        }
        query.put("logCalculatedV2", definitions);
        query.put("limit", 100);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.put("limit", 20);
        query.putObject("logSort").put("version", 1).put("field", "calculated:missing")
                .put("type", "text").put("direction", "asc");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.remove("logSort");
        query.putObject("context").put("entityType", "server");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.remove("context");
        query.remove("logCalculatedV2");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.put("logCalculatedV2", definitions);
        query.put("searchSyntax", "structured-v1");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @ParameterizedTest
    @ValueSource(strings = {"StatChart", "GaugeChart", "Table"})
    void preservesMetricPanelKindsWithStrictOptions(String kind) throws IOException {
        JsonNode document = fixture();
        var plugin = (ObjectNode) document.at("/spec/panels/jvm/spec/plugin");
        plugin.put("kind", kind);
        var options = (ObjectNode) plugin.path("spec");
        options.removeAll();
        if ("Table".equals(kind)) {
            options.put("density", "compact");
        } else {
            options.put("calculation", "last-number");
            options.putObject("format").put("unit", "decimal");
            if ("GaugeChart".equals(kind)) { options.put("max", 100); }
        }
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        options.put("unknown", true);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void rejectsNonpositiveGaugeMaximumAndWrongSignalPair() throws IOException {
        JsonNode document = fixture();
        var plugin = (ObjectNode) document.at("/spec/panels/jvm/spec/plugin");
        plugin.put("kind", "GaugeChart");
        var options = (ObjectNode) plugin.path("spec");
        options.removeAll();
        options.put("calculation", "last-number");
        options.putObject("format").put("unit", "decimal");
        options.put("max", 0);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        options.put("max", 100);
        ((ObjectNode) document.at("/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query")).put("signal", "logs");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void numericRangeObjectPreservesNativeBounds() throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        var range = query.putObject("logNumericRange");
        range.put("version", 1).put("field", "attribute:duration").put("min", 2).put("max", 6);
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        assertEquals(2, query.path("logNumericRange").path("min").intValue());
        range.put("min", "2");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        range.put("min", 7);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.putNull("logNumericRange");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void logSortVersionUsesExactNumericOne() throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        var sort = query.putObject("logSort");
        sort.put("field", "attribute:duration").put("type", "number").put("direction", "desc");
        for (String value : java.util.List.of("1", "1.0", "1e0")) {
            sort.put("version", new java.math.BigDecimal(value));
            assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        }
        for (String value : java.util.List.of("0", "2", "1.1", "1.00000000000000000001")) {
            sort.put("version", new java.math.BigDecimal(value));
            assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        }
        sort.put("version", "1");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void preservesTypedLogSortObjectAndRejectsConflictingOrInvalidDescriptors() throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        var sort = query.putObject("logSort");
        sort.put("version", 1).put("field", "attribute:duration").put("type", "number").put("direction", "desc");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        assertEquals("number", query.path("logSort").path("type").asString());
        query.put("sort", "oldest");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.put("sort", "newest");
        sort.put("field", "builtin:serviceName");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        sort.put("type", "text");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        sort.put("extra", true);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.putNull("logSort");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.put("logSort", "{\"version\":1}");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.remove("logSort");
        query.put("sort", "oldest");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void acceptsConsoleMetricIdentifiersConsistently() throws IOException {
        JsonNode document = fixture();
        var metric = (ObjectNode) document.at("/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/metric");
        for (String name : java.util.List.of("http.server-duration", "m".repeat(256))) {
            metric.put("name", name);
            assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        }
    }

    @Test
    void preservesIndependentRawSeverityCategoryAndLogFieldFilters() throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        query.put("severity", "SEVERE");
        query.put("severityCategory", "ERROR");
        query.put("resourceFilter", " service.version = \"v1,blue\" ");
        query.put("attributeFilter", "http.route != \"/failure\"");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void preservesExplicitStructuredLogSearchWithoutChangingLegacyText() throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        query.put("searchSyntax", "structured-v1");
        query.put("search", "(service:checkout OR service:billing) AND @http.status_code:[500 TO 599]");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        assertTrue(query.path("search").asString().contains(" OR "));
        query.remove("searchSyntax");
        query.put("search", "service:(unfinished literal");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void allowsLongStructuredExpressionsWithoutRelaxingLegacySearchLimit() throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        query.put("search", "@request.id:" + "a".repeat(600));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        query.put("searchSyntax", "structured-v1");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        query.put("search", "@request.id:" + "a".repeat(8192));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @ParameterizedTest
    @ValueSource(strings = {"service:(checkout OR", "@duration:[100 TO 1]", "@status:>=NaN"})
    void rejectsMalformedStructuredSearchBeforePersistence(String search) throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        query.put("searchSyntax", "structured-v1");
        query.put("search", search);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @ParameterizedTest
    @ValueSource(strings = {"structured-v2", "unknown", ""})
    void rejectsUnknownLogSearchSyntax(String syntax) throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
        query.put("searchSyntax", syntax);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {"spans|limit|101", "spans|sort|\"oldest\"", "spans|population|\"matched_spans\"",
        "groups|sort|\"newest\"", "groups|groupBy|\"duration\"", "groups|population|\"unknown\""})
    void rejectsLossyTracePopulationOptions(String kind, String field, String value) throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/traces/spec/queries/0/spec/plugin/spec/query");
        query.put("queryKind", kind);
        query.put("limit", 100);
        if ("groups".equals(kind)) {
            query.put("population", "matched_traces");
            query.put("groupBy", "serviceName");
        }
        query.set(field, JsonUtil.fromJsonQuietly(value));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @ParameterizedTest
    @ValueSource(strings = {"spans", "groups"})
    void preservesTracePopulationQueries(String kind) throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/traces/spec/queries/0/spec/plugin/spec/query");
        query.put("queryKind", kind);
        query.put("limit", 100);
        query.put("resourceFilter", "service.name=checkout");
        if ("groups".equals(kind)) {
            query.put("population", "matched_spans");
            query.put("groupBy", "operationName");
            query.put("orderBy", "error-count-desc");
        } else {
            query.put("sort", "duration_desc");
        }
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
    }

    @ParameterizedTest
    @ValueSource(strings = {"[{\"kind\":\"time\"}]", "[{\"kind\":\"message\"},{\"kind\":\"message\"}]",
        "[{\"kind\":\"message\"},{\"kind\":\"field\",\"scope\":\"resource\",\"path\":[]}]",
        "[{\"kind\":\"message\",\"scope\":\"resource\"}]"})
    void rejectsInvalidLogDisplayColumns(String columns) throws IOException {
        JsonNode document = fixture();
        ((ObjectNode) document.at("/spec/panels/logs/spec/plugin/spec")).set("columns", JsonUtil.fromJsonQuietly(columns));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void preservesTypedTableDisplayColumns() throws IOException {
        JsonNode document = fixture();
        var logs = (ObjectNode) document.at("/spec/panels/logs/spec/plugin/spec");
        logs.put("density", "comfortable");
        logs.set("columns", JsonUtil.fromJsonQuietly("[{\"kind\":\"message\"},{\"kind\":\"field\",\"scope\":\"resource\",\"path\":[\"service.name\"]}]"));
        var traces = (ObjectNode) document.at("/spec/panels/traces/spec/plugin/spec");
        traces.put("density", "compact");
        traces.set("columns", JsonUtil.fromJsonQuietly("[\"traceName\",\"service\"]"));
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "{\"version\":1,\"queries\":[],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\"},{\"refId\":\"a\",\"metric\":\"memory\"}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"step\":\"86401\"}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"aggregation\":\"median\"}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"timeShiftSeconds\":-1}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"timeShiftSeconds\":31536001}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"timeShiftSeconds\":\"3600\"}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"rollup\":{\"aggregation\":\"avg\",\"intervalSeconds\":0}}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"rollup\":{\"aggregation\":\"median\",\"intervalSeconds\":300}}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"nestedRollup\":{\"aggregation\":\"max\",\"intervalSeconds\":1800}}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\","
                + "\"rollup\":{\"aggregation\":\"avg\",\"intervalSeconds\":300},"
                + "\"nestedRollup\":{\"aggregation\":\"max\",\"intervalSeconds\":60}}],\"formulas\":[]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\"}],\"formulas\":[{\"id\":\"f1\",\"expression\":\"a + b\"}]}",
        "{\"version\":1,\"queries\":[{\"refId\":\"a\",\"metric\":\"cpu\",\"metricFilter\":\"x=${serviceName}\"}],\"formulas\":[]}"
    })
    void invalidCompositionDoesNotBecomeAnExecutableDashboard(String plan) throws IOException {
        JsonNode document = fixture();
        var query = (ObjectNode) document.at("/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query");
        query.remove("metric");
        query.put("queryKind", "composition");
        query.set("plan", JsonUtil.fromJsonQuietly(plan));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void scalarMetricMatchersAndGroupByArePreservedAsPlainText() throws IOException {
        JsonNode document = fixture();
        var metric = (ObjectNode) document.at("/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/metric");
        metric.put("metricFilter", "http_route=\"/checkout\"");
        metric.put("groupBy", "http_route");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        metric.put("metricFilter", "http_route=${serviceName}");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void compositionAndSignalPresentationScopesPersistWithoutRewriting() throws IOException {
        JsonNode document = fixture();
        set(document, "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query", JsonUtil.fromJsonQuietly("""
                {"signal":"metrics","queryKind":"composition","operationName":"GET /checkout","plan":{"version":1,
                 "queries":[{"refId":"a","metric":"http_request_count","aggregation":" SUM ","step":"1800","timeShiftSeconds":3600,
                             "rollup":{"aggregation":"avg","intervalSeconds":300},
                             "nestedRollup":{"aggregation":"max","intervalSeconds":1800}},
                            {"refId":"b","metric":"http_request_error","temporalAggregation":"rate"}],
                 "formulas":[{"id":"f1","expression":"maximum(a, b) / (a + 1)"}]},"limit":32}
                """));
        set(document, "/spec/panels/jvm/spec/plugin/spec/metricView", JsonUtil.fromJsonQuietly("""
                {"mode":"split","hidden":["b"],"splitBy":"service_name","splitRankBy":"f1",
                 "splitLimit":6,"splitOrder":"top","splitScale":"uniform"}
                """));
        set(document, "/spec/panels/logs/spec/queries/0/spec/plugin/spec/query/sort", JsonUtil.fromJsonQuietly("\"oldest\""));
        set(document, "/spec/panels/traces/spec/queries/0/spec/plugin/spec/query/endExclusive", JsonUtil.fromJsonQuietly("true"));
        String before = document.toString();
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        assertEquals(before, document.toString());
    }

    @Test
    void pinnedFourPanelDocumentIsAcceptedWithoutChangingSupportedFields() throws IOException {
        JsonNode document = fixture();
        String before = document.toString();
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        assertEquals(before, document.toString());
    }

    @Test
    void reservedPrototypePanelIsRejectedBeforeRepositoryAccess() throws IOException {
        JsonNode document = withPanelId("__proto__");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        SignalDashboardDao repository = org.mockito.Mockito.mock(SignalDashboardDao.class);
        SignalDashboardServiceImpl service = new SignalDashboardServiceImpl(repository, validator);
        SignalDashboard request = SignalDashboard.builder().dashboardKey("alpha-service-diagnostics")
                .version(PersesDashboardDocumentValidator.VERSION).document(document).build();
        assertThrows(IllegalArgumentException.class, () -> service.upsertSignalDashboard("operator", request));
        org.mockito.Mockito.verifyNoInteractions(repository);
    }

    @Test
    void constructorPanelRemainsSupportedWithoutRewriting() throws IOException {
        JsonNode document = withPanelId("constructor");
        String before = document.toString();
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        assertEquals(before, document.toString());
        assertTrue(document.path("spec").path("panels").has("constructor"));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "/kind|\"Other\"",
        "/metadata/name|\"other-name\"",
        "/metadata/project|\"external\"",
        "/metadata/version|1",
        "/metadata/tags|[\"alpha\",\"alpha\"]",
        "/metadata/tags|[\" alpha\"]",
        "/spec/duration|\"7d\"",
        "/spec/refreshInterval|\"1s\"",
        "/spec/timezone|\"Not/AZone\"",
        "/spec/datasources|{}",
        "/spec/variables/0/spec/value|\" checkout\"",
        "/spec/variables/0/spec/value|\"   \"",
        "/spec/variables/0/spec/name|\"unsupported\"",
        "/spec/variables/2/spec/allowMultiple|true",
        "/spec/variables/2/spec/defaultValue|\"absent\"",
        "/spec/variables/2/spec/plugin/kind|\"HertzBeatStaticListVariable\"",
        "/spec/variables/2/spec/plugin/spec/version|1",
        "/spec/variables/2/spec/plugin/spec/values|[\" local-proof\"]",
        "/spec/panels/jvm/spec/plugin/kind|\"BarChart\"",
        "/spec/panels/jvm/spec/queries/0/kind|\"LogQuery\"",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/kind|\"PrometheusTimeSeriesQuery\"",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/version|2",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/timeWindow|{}",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/snapshot|{}",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/limit|33",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/metric/name|\"select * from metrics\"",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/context/serviceName|\"prefix-${serviceName}\"",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/context/serviceName|\"${environment}\"",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/context/entityId|\"9223372036854775808\"",
        "/spec/panels/jvm/spec/queries/0/spec/plugin/spec/query/context/collectorId|\"bad space\"",
        "/spec/panels/logs/spec/queries/0/spec/plugin/spec/query/severityCategory|\"FINE\"",
        "/spec/panels/logs/spec/queries/0/spec/plugin/spec/query/search|\"$__interval\"",
        "/spec/panels/traces/spec/queries/0/spec/plugin/spec/query/limit|1001",
        "/spec/panels/traces/spec/queries/0/spec/plugin/spec/query/spanScope|\"all\"",
        "/spec/panels/traces/spec/queries/0/spec/plugin/spec/query/sort|\"oldest\"",
        "/spec/panels/traces/spec/queries/0/spec/plugin/spec/query/errorOnly|\"true\"",
        "/spec/panels/traces/spec/queries/0/spec/plugin/spec/query/minDurationMs|-1",
        "/spec/panels/trace/spec/queries/0/spec/plugin/spec/query/context|{}",
        "/spec/panels/trace/spec/queries/0/spec/plugin/spec/query/traceId|\"invalid\"",
        "/spec/layouts/0/spec/items/0/width|25",
        "/spec/layouts/0/spec/items/0/x|0.5",
        "/spec/layouts/0/spec/items/0/content/$ref|\"#/spec/panels/missing\"",
        "/spec/layouts/0/spec/items/1/content/$ref|\"#/spec/panels/jvm\"",
        "/spec/layouts/0/spec/items/1/x|0"
    })
    void rejectsUnsupportedOrNonExecutableFields(String pointer, String value) throws IOException {
        JsonNode document = fixture();
        set(document, pointer, JsonUtil.fromJsonQuietly(value));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document), pointer);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "/spec/display/name|\"\u00a0name\u00a0\"",
        "/spec/display/name|\"\u2003name\u2003\"",
        "/spec/panels/logs/spec/queries/0/spec/plugin/spec/query/search|\"\u00a0search\u00a0\"",
        "/spec/panels/logs/spec/queries/0/spec/plugin/spec/query/context/instance|\"\u2003instance\u2003\"",
        "/spec/variables/0/spec/value|\"\ufeffvalue\""
    })
    void rejectsUnicodeWhitespaceThatTheControlledClientWouldTrim(String pointer, String value) throws IOException {
        JsonNode document = fixture();
        set(document, pointer, JsonUtil.fromJsonQuietly(value));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @ParameterizedTest
    @ValueSource(strings = {"UTC", "utc", "america/new_york", "EST", "MST", "HST"})
    void executableTimezoneAliasesArePreserved(String zone) throws IOException {
        JsonNode document = fixture();
        ((ObjectNode) document.path("spec")).put("timezone", zone);
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        assertEquals(zone, document.path("spec").path("timezone").asText());
    }

    @Test
    void emptyTextVariableAllowedButUndefinedVariableAndReversedDurationRejected() throws IOException {
        JsonNode document = fixture();
        set(document, "/spec/variables/0/spec/value", JsonUtil.fromJsonQuietly("\"\""));
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        ((ArrayNode) document.at("/spec/variables")).remove(0);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        JsonNode reversed = fixture();
        set(reversed, "/spec/panels/traces/spec/queries/0/spec/plugin/spec/query/minDurationMs", JsonUtil.fromJsonQuietly("20"));
        set(reversed, "/spec/panels/traces/spec/queries/0/spec/plugin/spec/query/maxDurationMs", JsonUtil.fromJsonQuietly("10"));
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", reversed));
    }

    @Test
    void documentSizeUsesUtf8BytesRatherThanCharacterCount() throws IOException {
        JsonNode document = fixture();
        ObjectNode panels = (ObjectNode) document.at("/spec/panels");
        ObjectNode template = (ObjectNode) panels.get("logs").deepCopy();
        ((ObjectNode) template.at("/spec/display")).put("description", "\u20ac".repeat(512));
        ((ObjectNode) template.at("/spec/display")).put("name", "\u20ac".repeat(255));
        ((ObjectNode) template.at("/spec/queries/0/spec/plugin/spec/query")).put("search", "\u20ac".repeat(512));
        panels.removeAll();
        ArrayNode items = (ArrayNode) document.at("/spec/layouts/0/spec/items");
        items.removeAll();
        for (int i = 0; i < 24; i++) {
            String id = "panel" + i;
            panels.set(id, template.deepCopy());
            ObjectNode item = items.addObject();
            item.put("x", 0).put("y", i).put("width", 24).put("height", 1);
            item.putObject("content").put("$ref", "#/spec/panels/" + id);
        }
        assertTrue(document.toString().length() < 65535);
        assertTrue(document.toString().getBytes(StandardCharsets.UTF_8).length > 65535);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        for (JsonNode panel : panels) {
            ((ObjectNode) panel.at("/spec/display")).put("description", "a".repeat(512));
            ((ObjectNode) panel.at("/spec/display")).put("name", "a".repeat(255));
            ((ObjectNode) panel.at("/spec/queries/0/spec/plugin/spec/query")).put("search", "a".repeat(512));
        }
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
    }

    private void set(JsonNode document, String pointer, JsonNode value) {
        int split = pointer.lastIndexOf('/');
        ((ObjectNode) document.at(pointer.substring(0, split))).set(pointer.substring(split + 1), value);
    }

    private JsonNode withPanelId(String id) throws IOException {
        JsonNode document = fixture();
        ObjectNode panels = (ObjectNode) document.path("spec").path("panels");
        panels.set(id, panels.remove("jvm"));
        ((ObjectNode) document.at("/spec/layouts/0/spec/items/0/content")).put("$ref", "#/spec/panels/" + id);
        return document;
    }

    private JsonNode fixture() throws IOException {
        try (var input = getClass().getResourceAsStream("/dashboard/supported-dashboard.json")) {
            return JsonUtil.fromJsonQuietly(new String(input.readAllBytes(), StandardCharsets.UTF_8));
        }
    }
}
