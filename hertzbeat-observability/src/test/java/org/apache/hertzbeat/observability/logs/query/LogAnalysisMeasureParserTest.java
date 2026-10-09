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

class LogAnalysisMeasureParserTest {
    @Test
    void additionalMeasuresRetainExactOrderAndAbsence() {
        assertNull(LogAnalysisMeasureParser.parseAdditional(null));
        var values = LogAnalysisMeasureParser.parseAdditional("[{\"function\":\"avg\",\"field\":\"attribute:duration\"},"
                + "{\"function\":\"p95\",\"field\":\"attribute:duration\"},{\"function\":\"unique\",\"field\":\"builtin:serviceName\"}]");
        assertEquals(List.of("avg", "p95", "unique"), values.stream().map(value -> value.function()).toList());
        assertThrows(UnsupportedOperationException.class, () -> values.clear());
    }

    @Test
    void invalidAdditionalMeasuresNeverBecomeAbsent() {
        String measure = "{\"function\":\"avg\",\"field\":\"attribute:duration\"}";
        for (String source : List.of("", "null", "[]", "{}", "[null]", " ".repeat(2049),
                "[" + measure + "," + measure + "]", "[" + String.join(",", java.util.Collections.nCopies(4, measure)) + "]",
                "[{\"function\":\"count\"}]", "[{\"function\":\"p96\",\"field\":\"attribute:x\"}]",
                "[{\"function\":\"p95\",\"field\":\"builtin:serviceName\"}]",
                "[{\"function\":\"avg\",\"function\":\"max\",\"field\":\"attribute:x\"}]",
                "[" + measure + "] []")) {
            assertThrows(IllegalArgumentException.class, () -> LogAnalysisMeasureParser.parseAdditional(source), source);
        }
    }

    @Test
    void countIsAbsentAndOneMeasurePreservesExactCanonicalField() {
        assertNull(LogAnalysisMeasureParser.parse(null));
        assertNull(LogAnalysisMeasureParser.parse("{\"function\":\"count\"}"));
        for (String function : List.of("sum", "avg", "min", "max", "unique", "p50", "p75", "p90", "p95", "p98", "p99")) {
            var measure = LogAnalysisMeasureParser.parse("{\"function\":\"" + function
                    + "\",\"field\":\"attribute:duration\"}");
            assertEquals(function, measure.function());
            assertEquals("attribute:duration", measure.field());
        }
        assertEquals("builtin:serviceName", LogAnalysisMeasureParser.parse(
                "{\"function\":\"unique\",\"field\":\"builtin:serviceName\"}").field());
    }

    @Test
    void malformedUnsupportedOrAmbiguousMeasureNeverNormalizesToCount() {
        for (String source : List.of("", " ", "null", "[]", "{}", " ".repeat(513),
                "{\"function\":\"count\",\"field\":\"attribute:x\"}",
                "{\"function\":\"count\",\"extra\":true}",
                "{\"function\":\"unsupported\",\"field\":\"attribute:x\"}",
                "{\"function\":\"p96\",\"field\":\"attribute:x\"}",
                "{\"function\":\"p95\",\"field\":\"builtin:serviceName\"}",
                "{\"function\":\"avg\",\"field\":\"builtin:serviceName\"}",
                "{\"function\":\"avg\",\"field\":null}",
                "{\"function\":\"avg\"}",
                "{\"function\":1,\"field\":\"attribute:x\"}",
                "{\"function\":\"avg\",\"field\":\" attribute:x\"}",
                "{\"function\":\"count\",\"function\":\"avg\"}",
                "{\"function\":\"count\"} {}")) {
            assertThrows(IllegalArgumentException.class, () -> LogAnalysisMeasureParser.parse(source), source);
        }
    }
}
