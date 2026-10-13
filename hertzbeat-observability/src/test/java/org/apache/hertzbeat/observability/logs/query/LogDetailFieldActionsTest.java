/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;

class LogDetailFieldActionsTest {
    record Fixture(String scope, String key, String value, List<String> children, String valueKind,
                   boolean collection, String include, String exclude, String remaining) { }

    @Test
    void productionDetailActionFixturesPreserveFieldValueAndBooleanStructure() throws Exception {
        try (var input = getClass().getResourceAsStream("/log-detail-field-actions.json")) {
            List<Fixture> fixtures = JsonUtil.fromJson(input, new TypeReference<>() { });
            assertEquals(5, fixtures.size());
            for (Fixture fixture : fixtures) {
                var original = LogSearchParser.parse(fixture.remaining());
                assertInstanceOf(LogSearchExpression.Or.class, original);
                for (boolean exclude : List.of(false, true)) {
                    String clause = exclude ? fixture.exclude() : fixture.include();
                    var result = assertInstanceOf(LogSearchExpression.And.class,
                            LogSearchParser.parse("(" + fixture.remaining() + ") AND " + clause));
                    assertEquals(2, result.children().size());
                    assertEquals(original, result.children().getFirst());
                    var leaf = result.children().get(1);
                    if (exclude) {
                        leaf = assertInstanceOf(LogSearchExpression.Not.class, leaf).child();
                    }
                    var domain = "resource".equals(fixture.scope())
                            ? LogSearchExpression.Domain.RESOURCE : LogSearchExpression.Domain.ATTRIBUTE;
                    var field = new LogSearchExpression.Field(domain, fixture.key());
                    if (!fixture.collection()) {
                        assertEquals(new LogSearchExpression.Term(field, LogSearchExpression.Operator.EQUALS,
                                fixture.value()), leaf);
                    } else if ("number".equals(fixture.valueKind())) {
                        long value = Long.parseLong(fixture.value());
                        assertEquals(new LogSearchExpression.NumericCollection(field, value, value,
                                fixture.children()), leaf);
                    } else {
                        assertEquals(new LogSearchExpression.TextCollection(field, fixture.value(),
                                fixture.children()), leaf);
                    }
                    // The frontend removal range leaves precisely this grouped original expression.
                    assertEquals(original, LogSearchParser.parse("(" + fixture.remaining() + ")"));
                }
            }
        }
    }

    @Test
    void unsupportedQuoteAndBackslashKeysRemainOutsideTheFieldContract() {
        for (String key : List.of("quote\"key", "back\\slash", "bad key")) {
            assertThrows(IllegalArgumentException.class,
                    () -> new LogSearchExpression.Field(LogSearchExpression.Domain.ATTRIBUTE, key));
        }
    }
}
