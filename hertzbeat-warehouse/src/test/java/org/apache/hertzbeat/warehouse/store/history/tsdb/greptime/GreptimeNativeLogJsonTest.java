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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertSame;
import org.junit.jupiter.api.Test;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;

class GreptimeNativeLogJsonTest {
    @Test
    void quotedEscapesAreNotNormalizedAndApiRepresentationIsExplicit() {
        String literal = "quoted \"inf\" slash \\ -inf";
        String encoded = org.apache.hertzbeat.common.util.JsonUtil.toJson(java.util.Map.of("text", literal));
        assertEquals(literal, GreptimeNativeLogJson.decode(encoded).get("text"));
        var decoded = GreptimeNativeLogJson.decode("{\"positive\":inf,\"negative\":-inf}");
        String response = org.apache.hertzbeat.common.util.JsonUtil.toJson(decoded);
        var api = org.apache.hertzbeat.common.util.JsonUtil.fromJson(response, java.util.Map.class);
        assertEquals("Infinity", api.get("positive"));
        assertEquals("-Infinity", api.get("negative"));
    }

    @Test
    void nativeNulEscapeIsDecodedWithoutChangingLiteralBackslashZero() {
        for (int slashes = 1; slashes <= 6; slashes++) {
            String nativeText = "{\"text\":\"" + "\\".repeat(slashes) + "0\",\"number\":inf}";
            String expected = "\\".repeat(slashes / 2) + (slashes % 2 == 0 ? "0" : String.valueOf((char) 0));
            var decoded = GreptimeNativeLogJson.decode(nativeText);
            assertEquals(expected, decoded.get("text"));
            assertEquals(Double.POSITIVE_INFINITY, decoded.get("number"));
        }
        assertEquals("before" + (char) 0 + "after", GreptimeNativeLogJson.decode("{\"text\":\"before\\0after\"}").get("text"));
        assertThrows(TelemetryStorageUnavailableException.class, () -> GreptimeNativeLogJson.decode("{\"text\":\"\\q\"}"));
    }

    @Test
    void retainsNativeScalarTypesAndNestedValues() {
        var value = GreptimeNativeLogJson.decode("{\"positive\":inf,\"negative\":-inf,\"int\":2,\"float\":2.0,\"zero\":-0.0,\"text\":\"inf -inf\",\"nested\":[null,{\"value\":inf}]}");
        assertEquals(Double.POSITIVE_INFINITY, value.get("positive"));
        assertEquals(Double.NEGATIVE_INFINITY, value.get("negative"));
        assertEquals(2L, value.get("int"));
        assertEquals(2.0, value.get("float"));
        assertEquals(Double.doubleToRawLongBits(-0.0), Double.doubleToRawLongBits((Double) value.get("zero")));
        assertEquals("inf -inf", value.get("text"));
        assertInstanceOf(java.util.List.class, value.get("nested"));
        assertNull(GreptimeNativeLogJson.decode(null));
    }

    @Test
    void rejectsMalformedInsteadOfDiscardingAttributes() {
        for (String value : java.util.List.of("{\"x\":invalid}", "{\"x\":infinite}", "{\"x\":inf} garbage", "[]", "{", "")) {
            assertThrows(TelemetryStorageUnavailableException.class, () -> GreptimeNativeLogJson.decode(value));
        }
        var original = java.util.Map.<String, Object>of("x", 2L);
        assertSame(original, GreptimeNativeLogJson.decode(original));
    }
}
