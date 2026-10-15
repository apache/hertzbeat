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

class LogNumericRangeParserTest {
    @Test
    void strictFiniteNativeDescriptor() {
        assertEquals(null, LogNumericRangeParser.parse(null));
        for (String version : new String[] {"1", "1.0", "1e0"}) {
            var value = LogNumericRangeParser.parse("{\"version\":" + version + ",\"field\":\"attribute:x\",\"min\":2,\"max\":6}");
            assertEquals(2, value.min());
            assertEquals(6, value.max());
        }
        for (String invalid : new String[] {"", "null", "{}", " ".repeat(2049),
                "{\"version\":1,\"field\":\"attribute:x\",\"min\":\"2\",\"max\":6}",
                "{\"version\":1,\"field\":\"attribute:x\",\"min\":7,\"max\":6}",
                "{\"version\":1,\"field\":\"attribute:x\",\"min\":2,\"max\":1e999}",
                "{\"version\":1,\"field\":\"builtin:serviceName\",\"min\":2,\"max\":6}",
                "{\"version\":1,\"field\":\"attribute:x\",\"min\":2,\"max\":6,\"extra\":1}",
                "{\"version\":1,\"field\":\"attribute:x\",\"min\":2,\"min\":3,\"max\":6}"}) {
            assertThrows(IllegalArgumentException.class, () -> LogNumericRangeParser.parse(invalid));
        }
    }
}
