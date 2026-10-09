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
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class LogSortParserTest {
    @Test
    void versionIsNumericMathematicalOne() {
        String template = "{\"version\":%s,\"field\":\"attribute:duration\",\"type\":\"number\",\"direction\":\"desc\"}";
        for (String value : new String[] {"1", "1.0", "1e0"}) {
            assertEquals(1, LogSortParser.parse(template.formatted(value)).version());
        }
        for (String value : new String[] {"\"1\"", "1.1", "0", "2", "1.00000000000000000001"}) {
            assertThrows(IllegalArgumentException.class, () -> LogSortParser.parse(template.formatted(value)));
        }
    }

    @Test
    void strictTypedDescriptorDoesNotGuessOrCoerce() {
        assertEquals(null, LogSortParser.parse(null));
        var sort = LogSortParser.parse("""
                {"version":1,"field":"attribute:duration","type":"number","direction":"desc"}
                """);
        assertEquals("attribute:duration", sort.field());
        for (String source : new String[] {"", "null", "{}", " ".repeat(1025),
                "{\"version\":1,\"field\":\"attribute:x\",\"type\":\"number\",\"direction\":\"desc\",\"unknown\":1}",
                "{\"version\":1,\"version\":1,\"field\":\"attribute:x\",\"type\":\"number\",\"direction\":\"desc\"}",
                "{\"version\":1,\"field\":\"builtin:serviceName\",\"type\":\"number\",\"direction\":\"desc\"}",
                "{\"version\":1,\"field\":\"attribute:x\",\"type\":\"auto\",\"direction\":\"desc\"}",
                "{\"version\":1,\"field\":\"attribute:x\",\"type\":\"text\",\"direction\":\"DESC\"}"}) {
            assertThrows(IllegalArgumentException.class, () -> LogSortParser.parse(source));
        }
    }
}
