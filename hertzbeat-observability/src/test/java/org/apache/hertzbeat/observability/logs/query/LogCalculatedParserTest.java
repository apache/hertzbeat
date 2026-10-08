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

package org.apache.hertzbeat.observability.logs.query;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;
import org.apache.hertzbeat.common.observability.query.LogCalculatedExtraction;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class LogCalculatedParserTest {
    private static final String FORMULA = """
            {"version":2,"calculatedFields":{"version":2,"fields":[
              {"id":"c1","kind":"formula","name":"duration_seconds","expression":"@duration_ms / 1000"},
              {"id":"c3","kind":"formula","name":"double_duration","expression":"#duration_seconds * 2"}]}}
            """;

    @Test
    void validatesSparseDefinitionsAndInfersNumericOutputs() {
        var parsed = LogCalculatedParser.validate(FORMULA);
        assertEquals("double_duration", parsed.fields().getLast().outputs().getFirst().name());
        assertEquals("number", parsed.fields().getLast().outputs().getFirst().type());
    }

    @Test
    void acceptsRawAttributeAsNullableStringOutputWithoutChangingNestedTypeInference() {
        String direct = FORMULA.replace("@duration_ms / 1000", "@code.filepath")
                .replace("#duration_seconds * 2", "concat(#duration_seconds)");
        var parsed = LogCalculatedParser.validate(direct);
        assertEquals("string", parsed.fields().getFirst().outputs().getFirst().type());
        assertEquals("string", parsed.fields().getLast().outputs().getFirst().type());

        var numeric = LogCalculatedParser.validate(FORMULA.replace("#duration_seconds * 2", "#duration_seconds"));
        assertEquals("number", numeric.fields().getFirst().outputs().getFirst().type());
        var inferredNumber = LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "@duration_ms + @offset"));
        assertEquals("number", inferredNumber.fields().getFirst().outputs().getFirst().type());
    }

    @Test
    void acceptsTypedResourceReferencesWithoutTreatingThemAsAttributes() {
        var parsed = LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "resource(\\\"host.name\\\")")
                .replace("#duration_seconds * 2", "lower(resource(\\\"service.name\\\"))"));
        assertEquals("string", parsed.fields().getFirst().outputs().getFirst().type());
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.validate(
                FORMULA.replace("@duration_ms / 1000", "resource(\\\"host.name' OR true --\\\")")));
    }

    @Test
    void rejectsMissingReferencesCyclesAndDuplicateOutputs() {
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("#duration_seconds", "#missing")));
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("#duration_seconds * 2", "#double_duration * 2")));
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("double_duration\",\"expression", "duration_seconds\",\"expression")));
    }

    @Test
    void reusesBooleanGrammarButKeepsOldSyntaxClosed() {
        var expression = LogSearchParser.parseCalculated("service:api OR #duration_seconds:>=0.1");
        assertEquals("Or", expression.getClass().getSimpleName());
        assertThrows(IllegalArgumentException.class, () -> LogSearchParser.parse("#duration_seconds:1"));
    }

    @Test
    void boundsUnaryDepthAndUsesExistingRawAttributeNameLimit() {
        String deep = "-".repeat(20) + "@duration_ms";
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", deep)));
        String longName = "a".repeat(70);
        var parsed = LogCalculatedParser.validate(FORMULA.replace("@duration_ms", "@" + longName));
        assertEquals(2, parsed.fields().size());
        String wideSpace = "\u2003".repeat(400);
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", wideSpace + "@duration_ms")));
    }

    @Test
    void preservesLiteralHashInRawOnlySearch() {
        String request = FORMULA.replace("\"calculatedFields\"", "\"parameters\":{\"start\":\"1\",\"end\":\"1000\","
                + "\"searchSyntax\":\"structured-v1\",\"search\":\"@tag:\\\"#incident\\\"\"},"
                + "\"operation\":{\"kind\":\"page\",\"pageIndex\":0,\"pageSize\":50,"
                + "\"sort\":{\"field\":\"timestamp\",\"direction\":\"desc\"}},\"calculatedFields\"");
        assertEquals(2, LogCalculatedParser.query(request).definitions().fields().size());
    }

    @Test
    void parsesOneMixedBooleanSearchAndPageControl() {
        String request = FORMULA.replace("\"calculatedFields\"", "\"parameters\":{\"start\":\"1\",\"end\":\"1000\","
                + "\"searchSyntax\":\"structured-v2\",\"search\":\"service:api OR #duration_seconds:>=0.1\"},"
                + "\"operation\":{\"kind\":\"page\",\"pageIndex\":0,\"pageSize\":50,"
                + "\"sort\":{\"field\":\"calculated:duration_seconds\",\"direction\":\"desc\"}},\"calculatedFields\"");
        var parsed = LogCalculatedParser.query(request);
        assertEquals("Or", parsed.search().getClass().getSimpleName());
        assertEquals(50, parsed.page().pageSize());
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.query(request.replace("#duration_seconds", "#unknown")));
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.query(request.replace("#duration_seconds:>=0.1", "#duration_seconds:abc")));
    }

    @Test
    void acceptsExistingRawSortFieldsAndRejectsUnknownField() {
        String request = FORMULA.replace("\"calculatedFields\"", "\"parameters\":{\"start\":\"1\",\"end\":\"1000\"},"
                + "\"operation\":{\"kind\":\"page\",\"pageIndex\":0,\"pageSize\":50,"
                + "\"sort\":{\"field\":\"resource:deployment.version\",\"direction\":\"asc\"}},\"calculatedFields\"");
        assertEquals("resource:deployment.version", LogCalculatedParser.query(request).page().sort().field());
        assertEquals("builtin:serviceName", LogCalculatedParser.query(request.replace(
                "resource:deployment.version", "builtin:serviceName")).page().sort().field());
        String numeric = request.replace("\"direction\":\"asc\"", "\"direction\":\"asc\",\"type\":\"number\"");
        assertEquals("number", LogCalculatedParser.query(numeric).page().sort().type());
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.query(request.replace(
                "resource:deployment.version", "builtin:notAllowed")));
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.query(numeric.replace(
                "resource:deployment.version", "builtin:serviceName")));
    }

    @Test
    void separatesInvalidDraftFromMalformedValidationEnvelope() {
        assertThrows(LogCalculatedParser.StructureException.class,
                () -> LogCalculatedParser.validate("{\"version\":2,\"version\":2}"));
        assertThrows(LogCalculatedParser.StructureException.class,
                () -> LogCalculatedParser.validate(FORMULA + " trailing"));
        assertThrows(LogCalculatedParser.StructureException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("\"calculatedFields\"", "\"unknown\":1,\"calculatedFields\"")));
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "@duration_ms /")));
    }

    @Test
    void acceptsBoundedTrendAndFacetOperationsOnTheSameSearch() {
        String request = FORMULA.replace("\"calculatedFields\"", "\"parameters\":{\"start\":\"1\",\"end\":\"59999\","
                + "\"searchSyntax\":\"structured-v2\",\"search\":\"#duration_seconds:>=0.1\"},"
                + "\"operation\":{\"kind\":\"trend\",\"intervalMs\":60000},\"calculatedFields\"");
        var trend = LogCalculatedParser.query(request);
        assertEquals("trend", trend.operation().kind());
        var facet = LogCalculatedParser.query(request.replace("\"kind\":\"trend\",\"intervalMs\":60000",
                "\"kind\":\"facet\",\"field\":\"calculated:duration_seconds\",\"limit\":20"));
        assertEquals("facet", facet.operation().kind());
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.query(
                request.replace("\"intervalMs\":60000", "\"intervalMs\":100")));
    }

    @Test
    void admitsGroupedMeasuredAnalysisAndRejectsOverBudgetDimensions() {
        String request = FORMULA.replace("\"calculatedFields\"", "\"parameters\":{\"start\":\"1\",\"end\":\"59999\"},"
                + "\"operation\":{\"kind\":\"analysis\",\"view\":\"groups\","
                + "\"grouping\":[{\"field\":\"builtin:serviceName\",\"limit\":2},"
                + "{\"field\":\"calculated:duration_seconds\",\"limit\":5}],"
                + "\"measure\":{\"function\":\"avg\",\"field\":\"calculated:duration_seconds\"},"
                + "\"limit\":10,\"order\":\"measure-desc\",\"minCount\":1},\"calculatedFields\"");
        var parsed = (LogCalculated.Analysis) LogCalculatedParser.query(request).operation();
        assertEquals(2, parsed.grouping().size());
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.query(request.replace(
                "\"limit\":5}],", "\"limit\":51}],")));
    }

    @Test
    void infersTypedScalarFunctionsAndChecksBranchesAndStringAdmission() {
        var strings = LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000",
                "concat(\\\"[\\\", @audit_missing, \\\" ]\\\")").replace("#duration_seconds * 2", "lower(\\\"ABC\\\")"));
        assertEquals("string", strings.fields().getFirst().outputs().getFirst().type());
        assertEquals("string", strings.fields().getLast().outputs().getFirst().type());
        var logical = LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "is_null(@audit_missing)")
                .replace("#duration_seconds * 2", "if(#duration_seconds, true, false)"));
        assertEquals("boolean", logical.fields().getFirst().outputs().getFirst().type());
        assertEquals("boolean", logical.fields().getLast().outputs().getFirst().type());
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "concat(1, \\\"x\\\")")));
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "if(true, 1, \\\"no\\\")")));
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "if(@flag, true, false)")));
        assertThrows(IllegalArgumentException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000",
                        "textjoin(\\\"-\\\", false, \\\"x\\\", \\\"y\\\")")));
        var maximum = LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000",
                "max(-1, 1, 5, 5)"));
        assertEquals("number", maximum.fields().getFirst().outputs().getFirst().type());
        assertEquals("number", LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "max(2)"))
                .fields().getFirst().outputs().getFirst().type());
        var distance = LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000",
                "levenshtein_distance(\\\"a\\\",\\\"b\\\")"));
        assertEquals("number", distance.fields().getFirst().outputs().getFirst().type());
    }

    @Test
    void typedOperatorsAndReservedIdentifiersValidateWithoutSqlPassThrough() {
        String combined = "if((2^3==8) && (7%4==3) AND !(2<1), \\\"yes\\\", \\\"no\\\")";
        var parsed = LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", combined)
                .replace("#duration_seconds * 2", "#duration_seconds"));
        assertEquals("string", parsed.fields().getFirst().outputs().getFirst().type());
        for (String expression : List.of("upper(service)", "lower(status)")) {
            var reserved = LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", expression)
                    .replace("#duration_seconds * 2", "#duration_seconds"));
            assertEquals("string", reserved.fields().getFirst().outputs().getFirst().type());
        }
        var unsupported = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "upper(source)")));
        assertEquals("unsupported_function", unsupported.code());
        var mismatch = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", "1 AND 2")));
        assertEquals("type_mismatch", mismatch.code());
    }

    @Test
    void powerBindsBeforeUnaryAndAllowsNegativeExponent() {
        var negativeSquare = LogCalculatedFormula.parse("-2^2");
        assertEquals('-', ((LogCalculatedFormula.Unary) negativeSquare).operator());
        assertEquals("^", ((LogCalculatedFormula.Binary) ((LogCalculatedFormula.Unary) negativeSquare)
                .operand()).operator());
        var negativeExponent = (LogCalculatedFormula.Binary) LogCalculatedFormula.parse("2^-2");
        assertEquals("^", negativeExponent.operator());
        assertEquals('-', ((LogCalculatedFormula.Unary) negativeExponent.right()).operator());
    }

    @Test
    void formulaDepthAndNodeLimitsHaveBudgetErrors() {
        assertDoesNotThrow(() -> LogCalculatedFormula.parse(
                String.join("^", java.util.Collections.nCopies(16, "1"))));
        var depth = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedFormula.parse("+".repeat(17) + "1"));
        assertEquals("budget_exceeded", depth.code());
        for (String expression : List.of(String.join("^", java.util.Collections.nCopies(20, "1")),
                String.join("+", java.util.Collections.nCopies(20, "1")))) {
            var treeDepth = assertThrows(LogCalculatedFormula.ValidationException.class,
                    () -> LogCalculatedFormula.parse(expression));
            assertEquals("budget_exceeded", treeDepth.code());
        }
        var nodes = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedFormula.parse("1+".repeat(33) + "1"));
        assertEquals("budget_exceeded", nodes.code());
    }

    @Test
    void heavyNativeScalarSignaturesAreTypedAndBounded() {
        assertEquals("boolean", LogCalculatedFormula.type(
                LogCalculatedFormula.parse("regexp_like(@message,\"\")"), Map.of()));
        assertEquals("string", LogCalculatedFormula.type(
                LogCalculatedFormula.parse("regexp_replace(\"1x2x3\",\"[0-9]\",\"#\")"), Map.of()));
        assertEquals("number", LogCalculatedFormula.type(
                LogCalculatedFormula.parse("levenshtein_distance(\"kitten\",\"sitting\")"), Map.of()));
        assertEquals("string", LogCalculatedFormula.type(LogCalculatedFormula.parse(
                "regexp_replace(\"a12b\",\"([0-9]+)\",\"<$1>\")"), Map.of()));
        assertEquals("string", LogCalculatedFormula.type(LogCalculatedFormula.parse(
                "regexp_replace(\"a12b\",\"(?:a)(?<digits>[0-9]+)\",\"<$1>\")"), Map.of()));
        for (String expression : List.of("regexp_like(\"a\",@pattern)",
                "regexp_replace(\"a\",\"a\",@replacement)",
                "regexp_like(\"a\",\"" + "x".repeat(257) + "\")",
                "regexp_replace(\"a\",\"a\",\"$1\")",
                "regexp_replace(\"a\",\"[(]\",\"$1\")",
                "regexp_replace(\"a(\",\"a\\\\(\",\"$1\")",
                "regexp_replace(\"a\",\"(a)\",\"$1a\")",
                "regexp_replace(\"a\",\"(a)\",\"$$\")")) {
            assertThrows(LogCalculatedFormula.ValidationException.class,
                    () -> LogCalculatedFormula.type(LogCalculatedFormula.parse(expression), Map.of()));
        }
        String tooMany = String.join("+", java.util.Collections.nCopies(9,
                "levenshtein_distance(\"a\",\"b\")"));
        var budget = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000",
                        tooMany.replace("\"", "\\\""))));
        assertEquals("budget_exceeded", budget.code());
    }

    @Test
    void entropyIsNumericWithOneStringOperandAndSharesHeavyCallBudget() {
        for (String expression : List.of("entropy(\"abab\")", "entropy(\"\")", "entropy(\"ééa\")",
                "entropy(@message)")) {
            assertEquals("number", LogCalculatedFormula.type(LogCalculatedFormula.parse(expression), Map.of()));
        }
        assertEquals(2, LogCalculatedFormula.heavyCalls(LogCalculatedFormula.parse(
                "entropy(\"abab\")+entropy(\"ééa\")")));
        for (String expression : List.of("entropy()", "entropy(1)", "entropy(\"a\",\"b\")")) {
            assertThrows(LogCalculatedFormula.ValidationException.class,
                    () -> LogCalculatedFormula.type(LogCalculatedFormula.parse(expression), Map.of()));
        }
        String tooMany = String.join("+", java.util.Collections.nCopies(9, "entropy(\"a\")"));
        var budget = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000",
                        tooMany.replace("\"", "\\\""))));
        assertEquals("budget_exceeded", budget.code());
    }

    @Test
    void eachExtractionCaptureKeepsItsOwnNativePosition() {
        var optional = LogCalculatedExtraction.compile("regex", "^(?<optional>a)?(?<empty>)$");
        assertEquals("^(?P<optional>a)?(?:)$",
                LogCalculatedExtraction.capturePattern(optional, optional.groups().getFirst()));
        assertEquals("^(?:a)?(?P<empty>)$",
                LogCalculatedExtraction.capturePattern(optional, optional.groups().get(1)));
        var nested = LogCalculatedExtraction.compile("regex", "^(?<outer>(?<inner>[()]))(?<tail>\\()$");
        assertEquals("^(?:(?P<inner>[()]))(?:\\()$",
                LogCalculatedExtraction.capturePattern(nested, nested.groups().get(1)));
    }

    @Test
    void integerPositionArgumentsRejectFractionalOrDynamicValuesBeforeStorage() {
        for (String expression : List.of("left(\\\"abcd\\\",1.8)", "left(\\\"abcd\\\",1.0)",
                "right(\\\"abcd\\\",@duration_ms / 1000)", "round(1.234,@duration_ms / 1000)",
                "substring(\\\"abcd\\\",1.8,2)", "substring(\\\"abcd\\\",1,1.8)",
                "split_before(\\\"a/b\\\",\\\"/\\\",1.8)",
                "split_after(\\\"a/b\\\",\\\"/\\\",1.8)")) {
            var invalid = assertThrows(LogCalculatedFormula.ValidationException.class,
                    () -> LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000", expression)));
            assertEquals("type_mismatch", invalid.code());
        }
        assertEquals("string", LogCalculatedParser.validate(FORMULA.replace("@duration_ms / 1000",
                "left(\\\"abcd\\\",2)")).fields().getFirst().outputs().getFirst().type());
    }

    @Test
    void rejectsExpandedStringAmplificationAcrossFormulaDependencies() {
        var fields = new ArrayList<String>();
        fields.add("{\"id\":\"c1\",\"kind\":\"formula\",\"name\":\"v1\",\"expression\":\"\\\"x\\\"\"}");
        for (int index = 2; index <= 8; index++) {
            String previous = "#v" + (index - 1);
            String expression = "concat(" + String.join(",", java.util.Collections.nCopies(16, previous)) + ")";
            fields.add("{\"id\":\"c" + index + "\",\"kind\":\"formula\",\"name\":\"v" + index
                    + "\",\"expression\":\"" + expression + "\"}");
        }
        String request = "{\"version\":2,\"calculatedFields\":{\"version\":2,\"fields\":["
                + String.join(",", fields) + "]}}";
        var invalid = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validate(request));
        assertEquals("budget_exceeded", invalid.code());
        String wrapped = "substring_count(concat("
                + String.join(",", java.util.Collections.nCopies(16, "#v4")) + "),\\\"x\\\")";
        fields.set(4, "{\"id\":\"c5\",\"kind\":\"formula\",\"name\":\"v5\",\"expression\":\""
                + wrapped + "\"}");
        String wrappedRequest = "{\"version\":2,\"calculatedFields\":{\"version\":2,\"fields\":["
                + String.join(",", fields.subList(0, 5)) + "]}}";
        var nested = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validate(wrappedRequest));
        assertEquals("budget_exceeded", nested.code());
        assertEquals("fields[4].expression", nested.path());
        String rawCopies = "concat(" + String.join(",", java.util.Collections.nCopies(16, "@raw")) + ")";
        String rawRequest = "{\"version\":2,\"calculatedFields\":{\"version\":2,\"fields\":["
                + "{\"id\":\"c1\",\"kind\":\"formula\",\"name\":\"v1\",\"expression\":\""
                + rawCopies + "\"},{\"id\":\"c2\",\"kind\":\"formula\",\"name\":\"v2\","
                + "\"expression\":\"concat(#v1,#v1)\"}]}}";
        var duplicatedRaw = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validate(rawRequest));
        assertEquals("budget_exceeded", duplicatedRaw.code());
    }

    @Test
    void extractionCapturesShareTheOutputNamespaceAndFeedFormulaTypes() {
        String request = """
                {"version":2,"calculatedFields":{"version":2,"fields":[
                  {"id":"c1","kind":"extraction","engine":"regex","source":"builtin:body",
                   "pattern":"(?<token>[A-Za-z]+) (?<latency>[0-9.]+)",
                   "captures":[{"name":"token"},{"name":"latency"}]},
                  {"id":"c2","kind":"formula","name":"seconds","expression":"#latency / 1000"}
                ]}}
                """;
        var definitions = LogCalculatedParser.validate(request);
        assertEquals(List.of(new LogCalculated.Output("token", "string"),
                new LogCalculated.Output("latency", "string")), definitions.fields().getFirst().outputs());
        assertEquals("number", definitions.fields().get(1).outputs().getFirst().type());
        assertEquals(List.of(new LogCalculated.Capture("token"), new LogCalculated.Capture("latency")),
                definitions.fields().getFirst().captures());
    }

    @Test
    void grokNumericCaptureUsesPinnedNoncapturingMacroGroups() {
        String request = """
                {"version":2,"calculatedFields":{"version":2,"fields":[
                  {"id":"c1","kind":"extraction","engine":"grok","source":"builtin:body",
                   "pattern":"^%{notSpace:token} %{number:latency}$",
                   "captures":[{"name":"token"},{"name":"latency"}]}
                ]}}
                """;
        var definitions = LogCalculatedParser.validate(request);
        assertEquals(List.of(new LogCalculated.Output("token", "string"),
                new LogCalculated.Output("latency", "number")), definitions.fields().getFirst().outputs());
    }

    @Test
    void extractionSourcesAcceptOnlyPublishedBuiltinFieldIds() {
        for (String source : List.of("builtin:serviceName", "builtin:environment", "builtin:severityCategory")) {
            String request = "{\"version\":2,\"calculatedFields\":{\"version\":2,\"fields\":["
                    + "{\"id\":\"c1\",\"kind\":\"extraction\",\"engine\":\"grok\","
                    + "\"source\":\"" + source + "\",\"pattern\":\"^%{notSpace:serviceName}$\","
                    + "\"captures\":[{\"name\":\"serviceName\"}]}]}}";
            assertDoesNotThrow(() -> LogCalculatedParser.validate(request));
            assertDoesNotThrow(() -> LogCalculatedParser.validationRequest(request.substring(0, request.length() - 1)
                    + ",\"preview\":{\"definitionId\":\"c1\",\"sourceText\":\"codex-app-server\"}}"));
        }
        String unsupported = "{\"version\":2,\"calculatedFields\":{\"version\":2,\"fields\":["
                + "{\"id\":\"c1\",\"kind\":\"extraction\",\"engine\":\"grok\","
                + "\"source\":\"builtin:secret\",\"pattern\":\"^%{notSpace:serviceName}$\","
                + "\"captures\":[{\"name\":\"serviceName\"}]}]}}";
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.validate(unsupported));
    }

    @Test
    void previewRequiresAnExtractionAndBoundsTheExplicitSample() {
        String body = "{\"version\":2,\"calculatedFields\":{\"version\":2,\"fields\":["
                + "{\"id\":\"c1\",\"kind\":\"extraction\",\"engine\":\"regex\","
                + "\"source\":\"builtin:body\",\"pattern\":\"(?<token>[A-Za-z]+)\","
                + "\"captures\":[{\"name\":\"token\"}]}]}}";
        String withPreview = body.substring(0, body.length() - 1)
                + ",\"preview\":{\"definitionId\":\"c1\",\"sourceText\":\"GET\"}}";
        var preview = LogCalculatedParser.validationRequest(withPreview);
        assertEquals("c1", preview.previewId());
        assertEquals("GET", preview.sourceText());
        var overBudget = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validationRequest(withPreview.replace("GET", "x".repeat(16385))));
        assertEquals("budget_exceeded", overBudget.code());
        var wrongTarget = assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedParser.validationRequest(withPreview.replace("\"definitionId\":\"c1\"",
                        "\"definitionId\":\"c9\"")));
        assertEquals("preview.definitionId", wrongTarget.path());
    }

    @Test
    void extractionQueryPreservesTheAuthoredOutputDescriptor() {
        String request = """
                {"version":2,"parameters":{"start":"1","end":"59999"},
                 "calculatedFields":{"version":2,"fields":[
                   {"id":"c1","kind":"extraction","engine":"regex","source":"builtin:body",
                    "pattern":"(?<token>[A-Za-z]+)","captures":[{"name":"token"}]}
                 ]},"operation":{"kind":"page","pageIndex":0,"pageSize":10,
                  "sort":{"field":"timestamp","direction":"desc"}}}
                """;
        var parsed = LogCalculatedParser.query(request);
        assertEquals("token", parsed.definitions().fields().getFirst().outputs().getFirst().name());
    }

    @Test
    void typedSearchAndFacetUseTheExecutedOutputTypes() {
        String typed = FORMULA.replace("@duration_ms / 1000", "lower(\\\"ABC\\\")")
                .replace("#duration_seconds * 2", "is_null(@audit_missing)");
        String request = typed.replace("\"calculatedFields\"", "\"parameters\":{\"start\":\"1\",\"end\":\"59999\","
                + "\"searchSyntax\":\"structured-v2\",\"search\":\"#duration_seconds:ab* AND #double_duration:true\"},"
                + "\"operation\":{\"kind\":\"facet\",\"field\":\"calculated:duration_seconds\","
                + "\"limit\":10,\"valueSearch\":\"ab\"},\"calculatedFields\"");
        assertEquals("facet", LogCalculatedParser.query(request).operation().kind());
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.query(request.replace(
                "#double_duration:true", "#double_duration:yes")));
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.query(request.replace(
                "#duration_seconds:ab*", "#duration_seconds:>=1")));
        assertThrows(IllegalArgumentException.class, () -> LogCalculatedParser.query(request.replace(
                "calculated:duration_seconds", "calculated:double_duration")));
    }

    @Test
    void serializesOnlyExecutedFormulaKeys() {
        String json = JsonMapper.builder().build().writeValueAsString(LogCalculatedParser.validate(FORMULA));
        assertEquals(false, json.contains("\"engine\""));
        assertEquals(false, json.contains("\"captures\""));
        assertEquals(true, json.contains("\"outputs\""));
    }

    @Test
    void serializesControllerMessageWithExecutedTypesAndExactEmptyPageCount() {
        var definitions = LogCalculatedParser.validate(FORMULA);
        var operation = Map.<String, Object>of("kind", "page", "pageIndex", 100, "pageSize", 50,
                "sort", Map.of("field", "timestamp", "direction", "desc"));
        var executed = new LogCalculated.Executed(Map.of("start", "1", "end", "1000"), definitions, operation);
        var data = new LogCalculated.Result(2, new LogFacets.Window(1, 1000), executed,
                Map.of("kind", "page", "totalElements", 7, "rows", List.of()));
        var tree = JsonMapper.builder().build().readTree(JsonMapper.builder().build()
                .writeValueAsString(Message.success(data)));
        var response = tree.get("data");
        assertEquals(7, response.get("result").get("totalElements").intValue());
        assertEquals(0, response.get("result").get("rows").size());
        assertEquals("number", response.get("executed").get("calculatedFields").get("fields")
                .get(0).get("outputs").get(0).get("type").stringValue());
        assertEquals(false, response.get("executed").get("calculatedFields").get("fields")
                .get(0).has("engine"));
    }

}
