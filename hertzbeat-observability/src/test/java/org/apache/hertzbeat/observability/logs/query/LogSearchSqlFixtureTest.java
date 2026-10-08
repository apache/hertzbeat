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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;

class LogSearchSqlFixtureTest {
    record Row(String id, Object value) { }

    record Case(String operator, String value, List<String> expected) { }

    record Matrix(List<Row> rows, List<Case> cases) { }

    @Test
    void liveEvaluatorMatchesExactIdsFromPinnedNativeSqlFixtures() throws Exception {
        try (var input = getClass().getResourceAsStream("/log-structured-greptime-1.1.4.json")) {
            Matrix matrix = JsonUtil.fromJson(input, new TypeReference<>() { });
            assertEquals(16, matrix.rows().size());
            assertEquals(5, matrix.cases().size());
            for (Case fixture : matrix.cases()) {
                var predicate = LogSearchEvaluator.compile(new LogSearchExpression.Term(
                        new LogSearchExpression.Field(LogSearchExpression.Domain.ATTRIBUTE, "n"),
                        LogSearchExpression.Operator.valueOf(fixture.operator()), fixture.value()));
                var actual = matrix.rows().stream().filter(row -> {
                    Map<String, Object> attributes = new HashMap<>();
                    attributes.put("n", row.value());
                    return predicate.test(LogEntry.builder().attributes(attributes).build());
                }).map(Row::id).sorted().toList();
                assertEquals(fixture.expected(), actual, fixture.operator() + ":" + fixture.value());
            }
        }
    }
}
