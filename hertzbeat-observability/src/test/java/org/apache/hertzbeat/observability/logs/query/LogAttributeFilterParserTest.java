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

package org.apache.hertzbeat.observability.logs.query;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LogAttributeFilterParserTest {
    @Test
    void rejectsPartialMalformedAndUnsupportedPredicates() {
        for (String raw : List.of("key=a AND nonsense", "key=a,,other=b", "key=a AND",
                "key=a OR key=b", "key > 3", "key=a*", "(key=a)", "key IN (a,)", "key IN (a,,b)",
                "key IN ('a',)", "key='unterminated", "key='a' suffix", "key=a AND key=b",
                "service.name=a AND service_name=b", "key='a\u001fb'", "key=")) {
            assertThrows(LogFilterQueryException.class, () -> LogAttributeFilterParser.parse(raw), raw);
        }
    }

    @Test
    void keepsEscapedQuotedDelimitersAndColonCompatibility() {
        assertEquals(Map.of("route", "a\",b AND c", "path", "back\\slash", "method", "GET"),
                LogAttributeFilterParser.parse("route=\"a\\\",b AND c\"\tAND\tpath='back\\\\slash',method:GET"));
        assertEquals(Map.of("note", "a OR b", "region", "__hz_in__:eu,west\u001fus"),
                LogAttributeFilterParser.parse("note='a OR b' AND region IN ('eu,west',us)"));
    }

    @Test
    void operatorsInsideQuotedValuesDoNotChangeFieldBoundaries() {
        assertEquals(Map.of("url", "a!=b", "note", "a=b", "vendor:field", "value"),
                LogAttributeFilterParser.parse("url=\"a!=b\" AND note:\"a=b\" AND vendor:field=value"));
    }

    @Test
    void equalitySentinelsStayLiteralUsingExistingSingletonListEncoding() {
        for (String value : List.of("!foo", "__hz_exists__", "__hz_in__:bar", "__hz_not_exists__")) {
            assertEquals(Map.of("key", "__hz_in__:" + value), LogAttributeFilterParser.parse("key='" + value + "'"));
            assertEquals(Map.of("key", "!" + value), LogAttributeFilterParser.parse("key!='" + value + "'"));
        }
    }

    @Test
    void emptyInputAndBoundedClausesHaveExplicitSemantics() {
        assertEquals(Map.of(), LogAttributeFilterParser.parse("  "));
        assertThrows(LogFilterQueryException.class, () -> LogAttributeFilterParser.parse("key=" + "a".repeat(8192)));
    }
}
