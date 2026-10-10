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

import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

class PersesLogAnalysisDocumentTest {
    private final PersesDashboardDocumentValidator validator = new PersesDashboardDocumentValidator();

    @Test
    void acceptsAppliedAnalysisAndDormantControlsWithoutRewriting() throws Exception {
        JsonNode document = fixture();
        ((ObjectNode) document.at("/spec/panels/logs/spec/plugin/spec")).removeAll();
        ObjectNode query = query(document);
        query.put("queryKind", "analysis").put("search", "  literal  ");
        ObjectNode analysis = query.putObject("analysis");
        analysis.put("version", 1).put("representation", "table").put("limit", 20)
                .put("order", "count-desc").put("minCount", 2).put("intervalMs", 1000);
        analysis.putArray("additionalMeasures").addObject().put("function", "sum").put("field", "attribute:duration");
        analysis.putObject("comparison").put("version", 1).put("search", "")
                .put("formula", "a-b").put("timeShiftMs", 604800000);
        String before = document.toString();
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        assertEquals(before, document.toString());
        analysis.put("intervalMs", 2);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void persistsOnlyBoundedComparisonVisibilityAndSingleSourceFormula() throws Exception {
        JsonNode document = analytical();
        ObjectNode comparison = ((ObjectNode) query(document).path("analysis")).putObject("comparison");
        comparison.put("version", 1).put("formula", "2*a");
        comparison.putArray("hidden").add("a").add("formula");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        comparison.put("formula", "a+b");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        comparison.put("formula", "a");
        comparison.putArray("hidden").add("b");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        comparison.putArray("hidden").add("a").add("a");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        comparison.putArray("hidden").add("unknown");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        comparison.putArray("hidden").add("formula");
        comparison.remove("formula");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        comparison.put("formula", "a").put("timeShiftMs", 3600000);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        comparison.remove("timeShiftMs");
        comparison.put("searchSyntax", "structured-v1");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        comparison.remove("searchSyntax");
        comparison.put("hidden", true);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        comparison.put("search", "status:ERROR").put("searchSyntax", "structured-v1");
        comparison.put("formula", "a+b");
        comparison.putArray("hidden").add("b").add("formula");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void pairsAllRepresentationsAndRejectsUnknownInactiveOrCrossedState() throws Exception {
        for (String representation : java.util.List.of("table", "toplist", "timeseries")) {
            JsonNode document = fixture();
            var panel = (ObjectNode) document.at("/spec/panels/logs/spec");
            ((ObjectNode) panel.at("/plugin/spec")).removeAll();
            ObjectNode query = query(document);
            query.put("queryKind", "analysis");
            ObjectNode state = query.putObject("analysis");
            state.put("version", 1).put("representation", representation).put("limit", 20)
                    .put("order", "count-desc").put("minCount", 1);
            if ("timeseries".equals(representation)) {
                ((ObjectNode) panel.path("plugin")).put("kind", "TimeSeriesChart");
                ((ObjectNode) panel.at("/queries/0")).put("kind", "TimeSeriesQuery");
                ((ObjectNode) panel.at("/queries/0/spec/plugin")).put("kind", "HertzBeatTimeSeriesQuery");
                state.put("transform", "throughput").put("intervalMs", 1000);
            }
            assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
            state.put("extra", true);
            assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
            state.remove("extra");
            state.put("representation", "timeseries".equals(representation) ? "table" : "timeseries");
            assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        }
    }

    @Test
    void validatesExactScopeAndReturnViewWithoutAcceptingHiddenUnknowns() throws Exception {
        JsonNode document = fixture();
        ((ObjectNode) document.at("/spec/panels/logs/spec/plugin/spec")).removeAll();
        ObjectNode query = query(document);
        query.put("queryKind", "analysis");
        query.putObject("analysis").put("version", 1).put("representation", "table")
                .put("limit", 20).put("order", "count-desc").put("minCount", 1);
        query.putObject("logNumericRange").put("version", 1).put("field", "attribute:duration").put("min", 2).put("max", 6);
        query.putObject("logGroupSelection").put("version", 1).putArray("groups").addObject()
                .put("field", "attribute:label").put("kind", "value").put("value", "  exact  ");
        var view = query.putObject("returnView");
        view.put("version", 1).put("density", "compact").put("wrap", true);
        view.putArray("columns").addObject().put("kind", "message");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        view.put("showTime", true);
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        view.remove("showTime");
        ((ObjectNode) query.path("logNumericRange")).put("max", "6");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    @Test
    void rejectsMalformedRetainedDescriptorsAndSourceControls() throws Exception {
        for (String patch : java.util.List.of(
                "{\"version\":2}", "{\"intervalMs\":null}", "{\"additionalMeasures\":[]}",
                "{\"additionalMeasures\":[{\"function\":\"p96\",\"field\":\"attribute:v\"}]}",
                "{\"comparison\":{\"version\":1,\"search\":\"\",\"timeShiftMs\":2}}",
                "{\"comparison\":{\"version\":1,\"search\":\"\",\"formula\":\"a+c\"}}",
                "{\"comparison\":{\"version\":1,\"search\":\"x OR\",\"searchSyntax\":\"structured-v1\"}}",
                "{\"comparison\":{\"version\":1,\"search\":\"\",\"start\":1}}",
                "{\"transform\":\"throughput\"}", "{\"measure\":{\"function\":\"sum\",\"field\":\"attribute:v\"}}")) {
            JsonNode document = analytical();
            ObjectNode state = (ObjectNode) query(document).path("analysis");
            JsonNode changes = JsonUtil.fromJsonQuietly(patch);
            for (String key : changes.propertyNames()) { state.set(key, changes.get(key)); }
            assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document), patch);
        }
    }

    @Test
    void acceptsAllMeasuresAndValidDormantExtrasButRejectsInvalidVisualOptions() throws Exception {
        for (String function : java.util.List.of("avg", "min", "max", "sum", "unique", "p50", "p75", "p90", "p95", "p98", "p99")) {
            JsonNode document = analytical();
            ObjectNode state = (ObjectNode) query(document).path("analysis");
            state.put("representation", "toplist").put("order", "measure-desc");
            state.putObject("measure").put("function", function).put("field", "attribute:v");
            state.putArray("additionalMeasures").addObject().put("function", "sum").put("field", "attribute:other");
            assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
            ((ObjectNode) document.at("/spec/panels/logs/spec/plugin/spec")).put("showTime", true);
            assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
        }
    }

    @Test
    void rejectsTrimChangingScopeAndNoncanonicalCountButKeepsSearchExact() throws Exception {
        for (String field : java.util.List.of("severity", "traceId", "spanId")) {
            for (String value : java.util.List.of("", " ", " value", "value ", "\u00a0value", "value\ufeff")) {
                JsonNode document = analytical();
                query(document).put(field, value);
                assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document), field);
            }
        }
        JsonNode document = analytical();
        query(document).put("search", "  exact  ");
        assertDoesNotThrow(() -> validator.validate("alpha-service-diagnostics", document));
        ((ObjectNode) query(document).path("analysis")).putObject("measure").put("function", "count");
        assertThrows(IllegalArgumentException.class, () -> validator.validate("alpha-service-diagnostics", document));
    }

    private JsonNode analytical() throws Exception {
        JsonNode document = fixture();
        ((ObjectNode) document.at("/spec/panels/logs/spec/plugin/spec")).removeAll();
        query(document).put("queryKind", "analysis");
        query(document).putObject("analysis").put("version", 1).put("representation", "table")
                .put("limit", 20).put("order", "count-desc").put("minCount", 1);
        return document;
    }

    private ObjectNode query(JsonNode document) {
        return (ObjectNode) document.at("/spec/panels/logs/spec/queries/0/spec/plugin/spec/query");
    }

    private JsonNode fixture() throws Exception {
        try (var input = getClass().getResourceAsStream("/dashboard/supported-dashboard.json")) {
            return JsonUtil.fromJsonQuietly(new String(input.readAllBytes(), StandardCharsets.UTF_8));
        }
    }
}
