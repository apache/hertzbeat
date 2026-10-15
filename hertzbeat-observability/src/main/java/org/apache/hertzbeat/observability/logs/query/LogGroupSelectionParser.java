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
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Parses exact group identities independently from the log search language. */
public final class LogGroupSelectionParser {
    private static final int MAX_LENGTH = 4096;
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    private LogGroupSelectionParser() { }

    public static LogGroupSelection parse(String source) {
        if (source == null) { return null; }
        if (source.length() > MAX_LENGTH) { throw new LogFilterQueryException(); }
        try {
            JsonNode root = MAPPER.readTree(source);
            fields(root, Set.of("version", "groups"));
            JsonNode version = root.get("version");
            JsonNode groups = root.get("groups");
            if (version == null || !version.isIntegralNumber() || !version.canConvertToInt() || version.intValue() != 1
                    || groups == null || !groups.isArray() || groups.isEmpty() || groups.size() > 4) {
                throw new LogFilterQueryException();
            }
            var keys = new ArrayList<LogGroupSelection.Key>();
            for (JsonNode group : groups) {
                fields(group, Set.of("field", "kind", "value"));
                JsonNode value = group.get("value");
                if (value != null && !value.isNull() && !value.isString()) { throw new LogFilterQueryException(); }
                keys.add(new LogGroupSelection.Key(LogFacets.Field.parse(text(group.get("field"))),
                        text(group.get("kind")), value == null || value.isNull() ? null : value.stringValue()));
            }
            return new LogGroupSelection(1, keys);
        } catch (RuntimeException invalid) {
            throw new LogFilterQueryException();
        }
    }

    private static void fields(JsonNode node, Set<String> allowed) {
        if (node == null || !node.isObject() || !allowed.containsAll(node.propertyNames())) {
            throw new LogFilterQueryException();
        }
    }

    private static String text(JsonNode node) {
        if (node == null || !node.isString()) { throw new LogFilterQueryException(); }
        return node.stringValue();
    }
}
