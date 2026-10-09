/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.manager.service.impl;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class PersesLogQuerySetValidatorTest {
    private static final JsonMapper MAPPER = new JsonMapper();
    private static final String QUERY = """
            {"signal":"logs","queryKind":"analysis","analysis":{"version":1,"representation":"table",
             "limit":20,"order":"count-desc","minCount":1,
             "querySet":{"version":2,"nextSourceOrdinal":4,"nextFormulaSeq":2,
              "queries":[{"refId":"a","alias":"A","visible":true,
                "analysis":{"limit":25,"order":"count-desc","minCount":1}},
               {"refId":"c","alias":"C","visible":false,
                "analysis":{"limit":25,"order":"count-desc","minCount":1}}],
              "formulas":[{"refId":"f1","alias":"Sum","visible":true,"expression":"a+c"}]}}}
            """;

    @Test
    void keepsSparseIdsAndRejectsFormulaReferencesOrReusedCounters() {
        assertDoesNotThrow(() -> PersesLogAnalysisValidator.validate(MAPPER.readTree(QUERY), "LogsTable"));
        assertThrows(IllegalArgumentException.class, () -> PersesLogAnalysisValidator.validate(
                MAPPER.readTree(QUERY.replace("a+c", "f1*2")), "LogsTable"));
        assertThrows(IllegalArgumentException.class, () -> PersesLogAnalysisValidator.validate(
                MAPPER.readTree(QUERY.replace("nextSourceOrdinal\":4", "nextSourceOrdinal\":2")), "LogsTable"));
    }

    @Test
    void acceptsNextUnusedOrdinalForInitialAndPairedSources() {
        String initial = """
                {"signal":"logs","queryKind":"analysis","analysis":{"version":1,"representation":"table",
                "limit":20,"order":"count-desc","minCount":1,"querySet":{"version":2,
                "nextSourceOrdinal":1,"nextFormulaSeq":2,
                "queries":[{"refId":"a","alias":"A","visible":true,
                "analysis":{"limit":25,"order":"count-desc","minCount":1}}],
                "formulas":[{"refId":"f1","alias":"Constant","visible":true,"expression":"a"}]}}}
                """;
        assertDoesNotThrow(() -> PersesLogAnalysisValidator.validate(MAPPER.readTree(initial), "LogsTable"));
        String paired = QUERY.replace("nextSourceOrdinal\":4", "nextSourceOrdinal\":2")
                .replace("\"refId\":\"c\"", "\"refId\":\"b\"").replace("\"a+c\"", "\"a+b\"");
        assertDoesNotThrow(() -> PersesLogAnalysisValidator.validate(MAPPER.readTree(paired), "LogsTable"));
        assertDoesNotThrow(() -> PersesLogAnalysisValidator.validate(
                MAPPER.readTree(initial.replace("\"expression\":\"a\"", "\"expression\":\"2\"")), "LogsTable"));
    }
}
