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
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Strict optional raw-log ordering descriptor. */
public final class LogSortParser {
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).build();

    private LogSortParser() { }

    public static LogSort parse(String source) {
        if (source == null) { return null; }
        if (source.length() > 1024) { throw invalid(); }
        try {
            JsonNode node = MAPPER.readTree(source);
            if (node == null || !node.isObject() || !Set.of("version", "field", "type", "direction").equals(node.propertyNames())) { throw invalid(); }
            var version = node.get("version");
            if (!version.isNumber() || version.decimalValue().compareTo(java.math.BigDecimal.ONE) != 0) { throw invalid(); }
            return new LogSort(1, text(node.get("field")), text(node.get("type")), text(node.get("direction")));
        } catch (RuntimeException ignored) { throw invalid(); }
    }

    private static String text(JsonNode node) {
        if (!node.isString()) { throw invalid(); }
        return node.stringValue();
    }

    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Invalid log ordering"); }
}
