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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class LogSubqueryParserTest {
    private static final String VALID = """
            {"version":1,"parameters":{"start":"1000","end":"2000","searchSyntax":"structured-v1",
            "search":"service:api"},"subquery":{"version":1,"mainField":"builtin:serviceName",
            "operator":"not_in","child":{"field":"builtin:serviceName","searchSyntax":"structured-v1",
            "search":"service:worker"},"rank":{"direction":"bottom","limit":2,
            "measure":{"function":"count_all"}}},"operation":{"kind":"page","pageIndex":0,
            "pageSize":20,"sort":{"field":"timestamp","direction":"desc"}}}
            """;

    @Test
    void keepsMainAndChildSearchIndependentAndRejectsChildScope() {
        var parsed = LogSubqueryParser.parse(VALID);
        assertEquals("not_in", parsed.filter().descriptor().operator());
        assertEquals("service:worker", parsed.filter().descriptor().child().search());
        assertThrows(IllegalArgumentException.class, () -> LogSubqueryParser.parse(
                VALID.replace("\"search\":\"service:worker\"", "\"search\":\"service:worker\",\"workspaceId\":\"other\"")));
        assertThrows(IllegalArgumentException.class,
                () -> LogSubqueryParser.parse(VALID.replace("\"limit\":2", "\"limit\":1001")));
        assertThrows(IllegalArgumentException.class,
                () -> LogSubqueryParser.parse(VALID.replace("service:worker", "service:(")));
        assertThrows(IllegalArgumentException.class,
                () -> LogSubqueryParser.parse(VALID.replace("\"function\":\"count_all\"", "\"function\":\"sum\"")));
        assertThrows(IllegalArgumentException.class,
                () -> LogSubqueryParser.parse(VALID.replace("\"mainField\":\"builtin:serviceName\"",
                        "\"mainField\":\"builtin:body\"")));
    }

    @Test
    void acceptsDistinctCountSortByField() {
        String distinct = VALID.replace("\"measure\":{\"function\":\"count_all\"}",
                "\"measure\":{\"function\":\"count_distinct\",\"field\":\"resource:host.name\"}");
        assertDoesNotThrow(() -> LogSubqueryParser.parse(distinct));
    }
}
