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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;

class LogAnalysisGroupingParserTest {
    @Test
    void absencePreservesLegacyAndOrderedDimensionsDeriveLimit() {
        assertNull(LogAnalysisGroupingParser.parse(null));
        var grouping = LogAnalysisGroupingParser.parse("""
                {"version":1,"dimensions":[{"field":"builtin:serviceName","limit":5},{"field":"attribute:status","limit":4}]}
                """);
        assertEquals(20, grouping.limit());
        assertEquals(List.of("builtin:serviceName", "attribute:status"), grouping.dimensions().stream().map(item -> item.field()).toList());
        assertEquals(4, LogAnalysisGroupingParser.parse(descriptor(4)).dimensions().size());
    }

    @Test
    void ambiguousMalformedAndUnboundedDescriptorsFailClosed() {
        for (String invalid : List.of("", "null", "[]", "{}", "{} {}", " ".repeat(2049),
                "{\"version\":1,\"version\":1,\"dimensions\":[]}",
                "{\"version\":1.0,\"dimensions\":[]}", "{\"version\":2,\"dimensions\":[]}",
                "{\"version\":1,\"dimensions\":[],\"extra\":0}", descriptor(5))) {
            assertThrows(IllegalArgumentException.class, () -> LogAnalysisGroupingParser.parse(invalid));
        }
        for (String dimension : List.of("{}", "null", "{\"field\":\"attribute:x\",\"limit\":1.0}",
                "{\"field\":\"attribute:x\",\"limit\":\"1\"}", "{\"field\":\"attribute:x\",\"limit\":0}",
                "{\"field\":\"attribute:x\",\"limit\":101}", "{\"field\":\"unknown:x\",\"limit\":1}",
                "{\"field\":\"attribute:x\",\"limit\":1,\"extra\":0}")) {
            assertThrows(IllegalArgumentException.class, () -> LogAnalysisGroupingParser.parse(
                    "{\"version\":1,\"dimensions\":[" + dimension + "]}"));
        }
        String dimension = "{\"field\":\"attribute:x\",\"limit\":20}";
        assertThrows(IllegalArgumentException.class, () -> LogAnalysisGroupingParser.parse(
                "{\"version\":1,\"dimensions\":[" + dimension + "," + dimension + "]}"));
        assertThrows(IllegalArgumentException.class, () -> LogAnalysisGroupingParser.parse(
                "{\"version\":1,\"dimensions\":[" + dimension + "," + dimension.replace("attribute:x", "attribute:y") + "]}"));
    }

    private static String descriptor(int count) {
        return "{\"version\":1,\"dimensions\":[" + java.util.stream.IntStream.range(0, count)
                .mapToObj(i -> "{\"field\":\"attribute:k" + i + "\",\"limit\":1}")
                .collect(java.util.stream.Collectors.joining(",")) + "]}";
    }
}
