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
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.junit.jupiter.api.Test;

class LogSearchParserTest {
    @Test
    void booleanGroupsRangesAndRepeatedFieldsRemainStructured() {
        var expression = LogSearchParser.parse("(service:checkout OR service:billing) AND @http.status_code:[500 TO 599]");
        var and = assertInstanceOf(LogSearchExpression.And.class, expression);
        assertInstanceOf(LogSearchExpression.Or.class, and.children().getFirst());
        assertEquals(2, and.children().size());
    }

    @Test
    void resolvesDatadogHostAliasToTheCanonicalResourceField() {
        var term = assertInstanceOf(LogSearchExpression.Term.class, LogSearchParser.parse("host:node-7"));
        assertEquals(LogSearchExpression.Domain.RESOURCE, term.field().domain());
        assertEquals("host.name", term.field().key());
        assertEquals(LogSearchExpression.Operator.EQUALS, term.operator());
    }

    @Test
    void bareWordSearchesMessageAndDatadogTextAttributes() {
        var expression = assertInstanceOf(LogSearchExpression.Or.class, LogSearchParser.parse("timeout"));
        assertEquals(List.of("message", "title", "error.message", "error.stack"),
                expression.children().stream().map(child -> {
                    var term = assertInstanceOf(LogSearchExpression.Term.class, child);
                    assertEquals(LogSearchExpression.Operator.FULL_TEXT_TERM, term.operator());
                    return term.field().key();
                }).toList());
        assertEquals(LogSearchExpression.Domain.BUILTIN,
                assertInstanceOf(LogSearchExpression.Term.class, expression.children().getFirst()).field().domain());
        assertEquals(LogSearchExpression.Domain.ATTRIBUTE,
                assertInstanceOf(LogSearchExpression.Term.class, expression.children().get(1)).field().domain());
        assertInstanceOf(LogSearchExpression.Term.class, LogSearchParser.parse("@title:\"timeout\""));
        var phrase = assertInstanceOf(LogSearchExpression.Or.class, LogSearchParser.parse("\"connection timeout\""));
        assertEquals(LogSearchExpression.Operator.FULL_TEXT_TERM,
                assertInstanceOf(LogSearchExpression.Term.class, phrase.children().getFirst()).operator());
    }

    @Test
    void historicalFullTextSearchRetainsTermPhraseAndGlobIntent() {
        var term = assertInstanceOf(LogSearchExpression.Term.class, LogSearchParser.parse("*:needle"));
        assertEquals(LogSearchExpression.Domain.FULL_TEXT, term.field().domain());
        assertEquals(LogSearchExpression.Operator.FULL_TEXT_TERM, term.operator());
        var glob = assertInstanceOf(LogSearchExpression.Term.class, LogSearchParser.parse("*:*needle*"));
        assertEquals(LogSearchExpression.Operator.FULL_TEXT_GLOB, glob.operator());
        assertEquals("*needle*", glob.value());
        var phrase = assertInstanceOf(LogSearchExpression.Term.class, LogSearchParser.parse("*:\"hello world\""));
        assertEquals(LogSearchExpression.Operator.FULL_TEXT_TERM, phrase.operator());
        var escaped = assertInstanceOf(LogSearchExpression.Term.class, LogSearchParser.parse("*:\\*"));
        assertEquals(LogSearchExpression.Operator.FULL_TEXT_TERM, escaped.operator());
        assertEquals("*", escaped.value());
        var grouped = assertInstanceOf(LogSearchExpression.Or.class, LogSearchParser.parse("*:(needle OR timeout)"));
        assertEquals(2, grouped.children().size());
        assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse("*:>2"));
        var freeGlob = assertInstanceOf(LogSearchExpression.Or.class, LogSearchParser.parse("needle*"));
        assertEquals(4, freeGlob.children().size());
        freeGlob.children().forEach(child -> {
            var item = assertInstanceOf(LogSearchExpression.Term.class, child);
            assertEquals(LogSearchExpression.Operator.FULL_TEXT_GLOB, item.operator());
        });
    }

    @Test
    void invalidSyntaxFailsClosed() {
        for (String query : List.of("service:a OR", "@missing", "@key!=value", "()", "service:(a OR)", "@n:[9 TO 1]",
                "@n:>NaN", "@n:>Infinity", "@n:>9007199254740993", "service:a )", "@a:\"unterminated",
                "resource.hertzbeat.workspace_id:other", "service:", "a".repeat(8193), " ".repeat(8193), "\t".repeat(8193), "@n:>9.007199254740993e15", "@n:>-9007199254740993")) {
            assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse(query), query);
        }
        assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse("(".repeat(17) + "a" + ")".repeat(17)));
        assertThrows(LogFilterQueryException.class, () -> LogSearchParser.validateSyntax("future"));
    }
}
