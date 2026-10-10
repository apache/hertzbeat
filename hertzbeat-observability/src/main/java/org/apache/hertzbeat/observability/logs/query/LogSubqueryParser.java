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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSubquery;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Strict authored set filter; trusted scope is bound only by the controller. */
public final class LogSubqueryParser {
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private static final LogCalculated.Definitions EMPTY = new LogCalculated.Definitions(2, List.of());

    private LogSubqueryParser() { }

    /** Parsed user input before the controller binds trusted workspace and hard scope. */
    public record Envelope(Map<String, String> parameters, LogSearchExpression search, LogSubquery.Filter filter,
                           LogCalculated.Operation operation) { }

    public static Envelope parse(String source) {
        try {
            if (source == null || source.getBytes(StandardCharsets.UTF_8).length > 32768) { throw invalid(); }
            JsonNode root = MAPPER.readTree(source);
            fields(root, Set.of("version", "parameters", "subquery", "operation"));
            if (!integer(root.get("version"), 1, 1)) { throw invalid(); }
            var parameters = LogCalculatedParser.parameters(root.get("parameters"));
            String mainSyntax = parameters.get("searchSyntax");
            String mainText = parameters.get("search");
            LogSearchParser.validateQuery(mainSyntax, mainText);
            if (mainText != null && !mainText.isBlank() && !LogSearchParser.SYNTAX.equals(mainSyntax)) {
                throw invalid();
            }
            var search = LogSearchParser.parse(mainText);
            var descriptor = descriptor(root.get("subquery"));
            var child = descriptor.child();
            var childSearch = LogSearchParser.parse(child.search());
            var operation = LogCalculatedParser.operation(root.get("operation"), EMPTY, parameters);
            return new Envelope(parameters, search, new LogSubquery.Filter(descriptor, childSearch), operation);
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw invalid();
        }
    }

    public static LogSubquery.Descriptor descriptor(JsonNode node) {
        fields(node, Set.of("version", "mainField", "operator", "child", "rank"));
        if (!integer(node.get("version"), 1, 1)) { throw invalid(); }
        String main = field(node.get("mainField"));
        String operator = text(node.get("operator"));
        if (!Set.of("in", "not_in").contains(operator)) { throw invalid(); }
        JsonNode child = node.get("child");
        fields(child, Set.of("field", "searchSyntax", "search"));
        String childField = field(child.get("field"));
        String childSyntax = text(child.get("searchSyntax"));
        String childSearch = text(child.get("search"));
        if (!LogSearchParser.SYNTAX.equals(childSyntax)) { throw invalid(); }
        LogSearchParser.parse(childSearch);
        JsonNode rank = node.get("rank");
        fields(rank, Set.of("direction", "limit", "measure"));
        String direction = text(rank.get("direction"));
        if (!Set.of("top", "bottom").contains(direction) || !integer(rank.get("limit"), 1, 1000)) {
            throw invalid();
        }
        JsonNode measure = rank.get("measure");
        String function = text(measure.get("function"));
        String measureField = null;
        if ("count_all".equals(function)) {
            fields(measure, Set.of("function"));
        } else if ("count_distinct".equals(function)) {
            fields(measure, Set.of("function", "field"));
            measureField = field(measure.get("field"));
        } else {
            throw invalid();
        }
        return new LogSubquery.Descriptor(1, main, operator,
                new LogSubquery.Child(childField, childSyntax, childSearch),
                new LogSubquery.Rank(direction, rank.get("limit").intValue(),
                        new LogSubquery.Measure(function, measureField)));
    }

    private static String field(JsonNode node) {
        String field = text(node);
        LogFacets.Field.parse(field);
        return field;
    }

    private static void fields(JsonNode node, Set<String> allowed) {
        LogCalculatedParser.fields(node, allowed);
    }

    private static boolean integer(JsonNode node, long min, long max) {
        return LogCalculatedParser.integer(node, min, max);
    }

    private static String text(JsonNode node) {
        return LogCalculatedParser.text(node);
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Invalid log subquery");
    }
}
