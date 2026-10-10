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

import java.util.Map;
import org.junit.jupiter.api.Test;

class LogTransactionParserTest {
    @Test
    void parsesLiteralIdentityAndIndependentStructuredLocalSearch() {
        var request = LogTransactionParser.request(Map.of("transactionField", "attribute:request.id"));
        assertEquals(20, request.limit());
        var detail = LogTransactionParser.detail(Map.of("transactionId", "  exact  ", "localSearch", "a OR b"));
        assertEquals("  exact  ", detail.identity());
        assertEquals("a OR b", detail.literal());
        assertEquals("oldest", detail.sort());
        var structured = LogTransactionParser.detail(Map.of("transactionId", "exact", "localSearchSyntax", "structured-v1",
                "localSearch", "status:ERROR"));
        org.junit.jupiter.api.Assertions.assertNull(structured.literal());
        org.junit.jupiter.api.Assertions.assertNotNull(structured.expression());
    }

    @Test
    void rejectsMalformedPagingAndQueryBeforeAnyLookup() {
        for (String value : java.util.List.of("-1", "1.5", "2147483647", "", " 1")) {
            assertThrows(IllegalArgumentException.class, () -> LogTransactionParser.detail(
                    Map.of("transactionId", "id", "pageIndex", value)));
        }
        assertThrows(LogFilterQueryException.class, () -> LogTransactionParser.detail(
                Map.of("transactionId", "id", "localSearchSyntax", "structured-v1", "localSearch", "a OR")));
        assertThrows(IllegalArgumentException.class, () -> LogTransactionParser.request(
                Map.of("transactionField", "attribute:request.id", "transactionVersion", "2")));
    }
}
