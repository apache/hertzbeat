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

package org.apache.hertzbeat.common.observability.dto.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class LogTransactionsTest {
    private static final LogTransactions.Request REQUEST = new LogTransactions.Request(1,
            LogFacets.Field.parse("attribute:order.id"), 20, "related-count-desc");

    @Test
    void preservesExactStringIdentityAndRejectsInvalidBounds() {
        assertEquals("  id  ", new LogTransactions.Detail("  id  ", null,
                new LogSearchExpression.And(List.of()), 0, 20, "oldest").identity());
        for (String invalid : List.of("", "x".repeat(1025), "\ud800")) {
            assertThrows(IllegalArgumentException.class, () -> new LogTransactions.Detail(invalid, null,
                    new LogSearchExpression.And(List.of()), 0, 20, "oldest"));
        }
        assertThrows(IllegalArgumentException.class, () -> new LogTransactions.Detail("id", null,
                new LogSearchExpression.And(List.of()), Integer.MAX_VALUE, 1, "oldest"));
        for (String field : List.of("builtin:serviceName", "attribute:hertzbeat.entity.id", "resource:workspace_id")) {
            assertThrows(IllegalArgumentException.class, () -> new LogTransactions.Request(1, LogFacets.Field.parse(field), 20, "related-count-desc"));
        }
    }

    @Test
    void separatesTrustedScopeFromLiteralSeedWithoutWeakeningStructuredQuery() {
        var population = scope("w", null, Map.of("hertzbeat.entity.id", "42"));
        var seed = new LogComparison.Source(scope("w", "ERROR OR literal", Map.of("hertzbeat.entity.id", "42", "outcome", "failed")),
                new LogSearchExpression.And(List.of()), null);
        assertEquals("ERROR OR literal", new LogTransactions.Query(population, seed, REQUEST).seed().scope().search());
        assertThrows(IllegalArgumentException.class, () -> new LogTransactions.Query(population,
                new LogComparison.Source(scope("other", null, Map.of("hertzbeat.entity.id", "42")), new LogSearchExpression.And(List.of()), null), REQUEST));
        assertThrows(IllegalArgumentException.class, () -> new LogTransactions.Query(population,
                new LogComparison.Source(scope("w", null, Map.of()), new LogSearchExpression.And(List.of()), null), REQUEST));
    }

    @Test
    void distinguishesUnqualifiedFromSuccessfulEmptyDetailAndChecksPopulationCounters() {
        var window = new LogFacets.Window(1000, 2000);
        assertEquals(null, new LogTransactions.DetailResult(window, REQUEST.field(), "id", false, null, List.of(), 0, 20, "oldest").total());
        assertEquals(0L, new LogTransactions.DetailResult(window, REQUEST.field(), "id", true, 0L, List.of(), 0, 20, "oldest").total());
        assertThrows(IllegalArgumentException.class, () -> new LogTransactions.DetailResult(window, REQUEST.field(), "id", false, 0L, List.of(), 0, 20, "oldest"));
        assertThrows(IllegalArgumentException.class, () -> new LogTransactions.Result(window, REQUEST, 9, 4, 2, 2, 0, 0, false, List.of()));
    }

    private static LogFacets.Scope scope(String workspace, String literal, Map<String, String> resources) {
        return new LogFacets.Scope(workspace, 1000, 2000, null, null, null, null, literal,
                "checkout", "ns", "env", resources, Map.of(), Set.of(), false, null);
    }
}
