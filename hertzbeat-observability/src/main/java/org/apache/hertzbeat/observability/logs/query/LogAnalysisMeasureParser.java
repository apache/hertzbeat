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

import java.util.Set;
import java.util.List;
import java.util.ArrayList;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Bounded optional analysis measure; absence alone preserves the count contract. */
public final class LogAnalysisMeasureParser {
    private static final int MAX_LENGTH = 512;
    private static final int MAX_ADDITIONAL_LENGTH = 2048;
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    private LogAnalysisMeasureParser() { }

    public static LogAnalysis.Measure parse(String source) {
        if (source == null) { return null; }
        if (source.length() > MAX_LENGTH) { throw invalid(); }
        try {
            JsonNode root = MAPPER.readTree(source);
            if (root == null || !root.isObject() || !Set.of("function", "field").containsAll(root.propertyNames())) { throw invalid(); }
            String function = text(root.get("function"));
            if ("count".equals(function)) {
                if (root.has("field")) { throw invalid(); }
                return null;
            }
            return new LogAnalysis.Measure(function, text(root.get("field")));
        } catch (RuntimeException ignored) {
            throw invalid();
        }
    }

    public static List<LogAnalysis.Measure> parseAdditional(String source) {
        if (source == null) { return null; }
        if (source.length() > MAX_ADDITIONAL_LENGTH) { throw invalid(); }
        try {
            JsonNode root = MAPPER.readTree(source);
            if (root == null || !root.isArray() || root.isEmpty() || root.size() > 3) { throw invalid(); }
            var values = new ArrayList<LogAnalysis.Measure>();
            for (JsonNode item : root) {
                var measure = parse(item.toString());
                if (measure == null || values.contains(measure)) { throw invalid(); }
                values.add(measure);
            }
            return List.copyOf(values);
        } catch (RuntimeException ignored) {
            throw invalid();
        }
    }

    private static String text(JsonNode node) {
        if (node == null || !node.isString()) { throw invalid(); }
        return node.stringValue();
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Invalid log analysis measure");
    }
}
