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

import java.util.ArrayList;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Strict ordered grouping descriptor; omitted grouping preserves legacy controls. */
public final class LogAnalysisGroupingParser {
    private static final int MAX_LENGTH = 2048;
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    private LogAnalysisGroupingParser() { }

    public static LogAnalysis.Grouping parse(String source) {
        if (source == null) { return null; }
        if (source.length() > MAX_LENGTH) { throw invalid(); }
        try {
            JsonNode root = MAPPER.readTree(source);
            fields(root, Set.of("version", "dimensions"));
            int version = integer(root.get("version"));
            JsonNode dimensions = root.get("dimensions");
            if (dimensions == null || !dimensions.isArray() || dimensions.isEmpty() || dimensions.size() > 4) { throw invalid(); }
            var values = new ArrayList<LogAnalysis.Dimension>();
            for (JsonNode dimension : dimensions) {
                fields(dimension, Set.of("field", "limit"));
                JsonNode field = dimension.get("field");
                if (field == null || !field.isString()) { throw invalid(); }
                values.add(new LogAnalysis.Dimension(field.stringValue(), integer(dimension.get("limit"))));
            }
            return new LogAnalysis.Grouping(version, values);
        } catch (RuntimeException ignored) {
            throw invalid();
        }
    }

    private static int integer(JsonNode node) {
        if (node == null || !node.isIntegralNumber() || !node.canConvertToInt()) { throw invalid(); }
        return node.intValue();
    }

    private static void fields(JsonNode node, Set<String> allowed) {
        if (node == null || !node.isObject() || !allowed.containsAll(node.propertyNames())) { throw invalid(); }
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Invalid log analysis grouping");
    }
}
