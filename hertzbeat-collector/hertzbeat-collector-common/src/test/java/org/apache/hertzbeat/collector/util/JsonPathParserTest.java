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

package org.apache.hertzbeat.collector.util;

import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link JsonPathParser}
 */
class JsonPathParserTest {

    private static final String ROW_JSON = "{\"metadata\": {\"name\": \"pod-a\"},"
            + " \"status\": {\"phase\": \"Running\","
            + " \"containerStatuses\": [{\"name\": \"c1\", \"ready\": true, \"restartCount\": 5}]}}";

    private Object row() {
        return JsonPathParser.parseContentWithJsonPath(ROW_JSON, "$").get(0);
    }

    @Test
    void parseRowWithJsonPathReturnsExistingValue() {
        List<Object> values = JsonPathParser.parseRowWithJsonPath(row(), "$.status.containerStatuses[0].restartCount");

        assertEquals(1, values.size());
        assertEquals(5, values.get(0));
    }

    @Test
    void parseRowWithJsonPathReturnsEmptyListWhenPathMissing() {
        Object pendingRow = JsonPathParser
                .parseContentWithJsonPath("{\"metadata\": {\"name\": \"pod-b\"}, \"status\": {\"phase\": \"Pending\"}}", "$")
                .get(0);

        List<Object> values = JsonPathParser.parseRowWithJsonPath(pendingRow, "$.status.containerStatuses[0].restartCount");

        assertTrue(values.isEmpty());
    }

    @Test
    void parseRowWithJsonPathReturnsAllValuesForWildcard() {
        List<Object> values = JsonPathParser.parseRowWithJsonPath(row(), "$.status.containerStatuses[0].*");

        assertEquals(3, values.size());
        assertTrue(values.contains("c1"));
        assertTrue(values.contains(true));
        assertTrue(values.contains(5));
    }

    @Test
    void parseRowWithJsonPathHandlesNullDocumentAndEmptyPath() {
        assertTrue(JsonPathParser.parseRowWithJsonPath(null, "$.status").isEmpty());
        assertTrue(JsonPathParser.parseRowWithJsonPath(row(), "").isEmpty());
    }
}
