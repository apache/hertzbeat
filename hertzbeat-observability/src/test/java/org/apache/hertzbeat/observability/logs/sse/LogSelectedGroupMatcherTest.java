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

package org.apache.hertzbeat.observability.logs.sse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.common.observability.dto.log.PreparedLogGroupSelection;
import org.junit.jupiter.api.Test;

class LogSelectedGroupMatcherTest {
    @Test
    void preservesNumericTypesBitsAndNativeInfinityAlternatives() {
        var integer = matcher("value", "2", 2L, null);
        assertTrue(integer.test(log(2L)));
        assertTrue(integer.test(log("2")));
        assertFalse(integer.test(log(2.0)));
        var negativeZero = matcher("value", "-0.0", null, Double.doubleToRawLongBits(-0.0));
        assertTrue(negativeZero.test(log(-0.0)));
        assertFalse(negativeZero.test(log(0.0)));
        for (double value : new double[] {Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertTrue(matcher("value", value > 0 ? "inf" : "-inf", null, Double.doubleToRawLongBits(value)).test(log(value)));
        }
    }

    @Test
    void distinguishesPresenceAndRustUtf8Replacement() {
        assertTrue(matcher("non_scalar", null, null, null).test(log(List.of(1L))));
        assertFalse(matcher("non_scalar", null, null, null).test(log(new byte[] {65})));
        assertTrue(matcher("value", "A", null, null).test(log(new byte[] {65})));
        assertEquals("\ufffd\ufffd\ufffd", LogUtf8Lossy.decode(new byte[] {(byte) 0xed, (byte) 0xa0, (byte) 0x80}));
        assertEquals("\ufffdA", LogUtf8Lossy.decode(new byte[] {(byte) 0xe1, (byte) 0x80, 65}));
        assertEquals("\ufffd", LogUtf8Lossy.decode(new byte[] {(byte) 0xf0, (byte) 0x90}));
    }

    @Test
    void exactKeysAndKindsDoNotBorrowAliasesOrMetadata() {
        var entry = new LogEntry();
        entry.setResource(new java.util.HashMap<>());
        entry.getResource().put("service_name", "alias");
        entry.getResource().put("deployment_environment_name", "alias");
        assertTrue(matcher("builtin:serviceName", "missing", null, null, null).test(entry));
        assertTrue(matcher("builtin:environment", "missing", null, null, null).test(entry));
        entry.getResource().put("service.name", "raw");
        assertTrue(matcher("builtin:serviceName", "value", "raw", null, null).test(entry));
        entry.setAttributes(new java.util.HashMap<>());
        entry.getAttributes().put("a_b", "alias");
        assertTrue(matcher("missing", null, null, null).test(entry));
        entry.getAttributes().put("a.b", null);
        assertTrue(matcher("null", null, null, null).test(entry));
        assertFalse(matcher("missing", null, null, null).test(entry));
        entry.getAttributes().put("a.b", Map.of("x", 1L));
        assertTrue(matcher("non_scalar", null, null, null).test(entry));
    }

    private static LogSelectedGroupMatcher matcher(String kind, String value, Long integer, Long bits) {
        return matcher("attribute:a.b", kind, value, integer, bits);
    }

    private static LogSelectedGroupMatcher matcher(String field, String kind, String value, Long integer, Long bits) {
        var key = new LogGroupSelection.Key(LogFacets.Field.parse(field), kind, value);
        var selection = new LogGroupSelection(1, List.of(key));
        return new LogSelectedGroupMatcher(new PreparedLogGroupSelection(selection,
                List.of(new PreparedLogGroupSelection.Target(key, integer, bits))));
    }

    private static LogEntry log(Object value) {
        var log = new LogEntry();
        log.setAttributes(Map.of("a.b", value));
        return log;
    }
}
