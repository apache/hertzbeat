/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.observability.dto.investigation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class InvestigationLogRecordTest {

    @Test
    void oldConstructorDefaultsTruncationMetadataToEmpty() {
        assertEquals(Map.of(), record(Map.of("arguments", "x"), Map.of()).truncatedFields());
    }

    @Test
    void truncatedMetadataMustReferToBoundedExistingValues() {
        var record = new InvestigationLogRecord(
                "event-1", "1", null, null, null, null, null, null, null,
                Map.of("arguments", "x".repeat(4_095)), Map.of(), Map.of("attributes", List.of("arguments")));
        assertEquals(List.of("arguments"), record.truncatedFields().get("attributes"));
        assertThrows(IllegalArgumentException.class, () -> new InvestigationLogRecord(
                "event-1", "1", null, null, null, null, null, null, null,
                Map.of("arguments", "x".repeat(4_094)), Map.of(), Map.of("attributes", List.of("arguments"))));
        assertThrows(IllegalArgumentException.class, () -> new InvestigationLogRecord(
                "event-1", "1", null, null, null, null, null, null, null,
                Map.of("arguments", "x".repeat(4_095)), Map.of(), Map.of("resourceAttributes", List.of("arguments"))));
    }

    private InvestigationLogRecord record(Map<String, String> attributes, Map<String, String> resourceAttributes) {
        return new InvestigationLogRecord(
                "event-1", "1", null, null, null, null, null, null, null, attributes, resourceAttributes);
    }
}
