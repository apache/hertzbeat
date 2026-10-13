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

package org.apache.hertzbeat.observability.logs.query;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class LogQuerySetParserTest {
    private static final String BODY = """
            {"version":2,"parameters":{"start":"1","end":"1000","view":"groups"},
            "queries":[
              {"refId":"a","alias":"Current","visible":false,"search":"status:ERROR",
               "searchSyntax":"structured-v1","analysis":{"field":"builtin:serviceName","limit":25,"order":"count-desc","minCount":1}},
              {"refId":"c","alias":"Earlier","visible":true,"timeShiftMs":3600000,
               "analysis":{"field":"builtin:serviceName","limit":25,"order":"count-desc","minCount":1}}],
            "formulas":[{"refId":"f1","alias":"Difference","visible":true,"expression":"a-c"},
                        {"refId":"f2","alias":"Double","visible":true,"expression":"a*2"}]}
            """;

    @Test
    void preservesSparseStableSourceReferencesAndIndependentFormulas() {
        var parsed = LogQuerySetParser.parse(BODY);
        assertEquals(2, parsed.queries().size());
        assertEquals("c", parsed.queries().getLast().refId());
        assertEquals(3600000L, parsed.queries().getLast().timeShiftMs());
        assertEquals("a-c", parsed.formulas().getFirst().expression());
        assertEquals(false, parsed.queries().getFirst().visible());
    }

    @Test
    void rejectsFormulaReferencesAndCyclesRatherThanInventingThem() {
        assertThrows(IllegalArgumentException.class, () -> LogQuerySetParser.parse(BODY.replace("a*2", "f1*2")));
        assertThrows(IllegalArgumentException.class, () -> LogQuerySetParser.parse(BODY.replace("a*2", "f2*2")));
        assertThrows(IllegalArgumentException.class, () -> LogQuerySetParser.parse(BODY.replace("a*2", "b*2")));
    }

    @Test
    void acceptsConstantFormulaWithNoDependencies() {
        var parsed = LogQuerySetParser.parse(BODY.replace("a*2", "2"));
        assertEquals(0, parsed.formulas().getLast().dependsOn().size());
    }

    @Test
    void rejectsUnexpectedScopeAndMalformedMembers() {
        assertThrows(IllegalArgumentException.class, () -> LogQuerySetParser.parse(BODY.replace("\"view\":\"groups\"", "\"search\":\"x\"")));
        assertThrows(IllegalArgumentException.class, () -> LogQuerySetParser.parse(BODY.replace("\"refId\":\"c\"", "\"refId\":\"a\"")));
        assertThrows(IllegalArgumentException.class, () -> LogQuerySetParser.parse(BODY.replace("\"visible\":false", "\"visible\":\"false\"")));
        assertThrows(IllegalArgumentException.class, () -> LogQuerySetParser.parse(BODY.replace("\"limit\":25", "\"limit\":26")));
    }
}
