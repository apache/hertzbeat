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

package org.apache.hertzbeat.collector.collect.http;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * String-only validation tests: no XML parsing, XPath evaluation or HTTP requests.
 */
class HttpCollectImplXpathValidationTest {

    private HttpCollectImpl collector;
    private Method validateExpressions;

    @BeforeEach
    void setUp() throws Exception {
        collector = new HttpCollectImpl();
        validateExpressions = HttpCollectImpl.class.getDeclaredMethod(
                "validateXmlPathExpressions", String.class, List.class);
        validateExpressions.setAccessible(true);
    }

    @Test
    void allowsOrdinaryAliasesAndBuiltInSummaryFields() {
        assertDoesNotThrow(() -> validate("//server",
                List.of("name", "metrics/cpu", "@id", "port[id='1']/speed", "responseTime", "KeYwOrD")));
    }

    @Test
    void keepsParseScriptValidation() {
        assertRejected("//* | name", List.of("name"));
    }

    @Test
    void rejectsBlockedAliasWithSafeParseScript() {
        assertRejected("//server", List.of("//* | name"));
    }

    @Test
    void validatesAliasesAfterOrdinaryAndBuiltInFields() {
        assertRejected("//server", List.of("name", "responseTime", "KEYWORD", "//* | name"));
    }

    @Test
    void handlesEmptyAliasListsWithoutChangingParseScriptValidation() {
        assertDoesNotThrow(() -> validate("//server", null));
        assertDoesNotThrow(() -> validate("//server", Collections.emptyList()));
        assertRejected("//* | name", Collections.emptyList());
    }

    @Test
    void preservesExistingEmptyExpressionValidationSemantics() {
        // Required parseScript and valid XPath syntax remain the caller's responsibility.
        assertDoesNotThrow(() -> validate("", Arrays.asList(null, "", " ")));
    }

    @Test
    void appliesExistingCharacterLimitsToAliases() {
        assertDoesNotThrow(() -> validate("//server", List.of("/".repeat(10), "*".repeat(5))));
        assertRejected("//server", List.of("/".repeat(11)));
        assertRejected("//server", List.of("*".repeat(6)));
    }

    @Test
    void preservesCaseInsensitiveMultilinePatternChecksForAliases() {
        assertRejected("//server", List.of("//NoDe()\n | name"));
    }

    @Test
    void documentsExistingLiteralFalsePositivesNowAlsoAppliedToAliases() {
        // Compatibility decision: the existing guard scans raw text, not an XPath AST.
        assertRejected("//server", List.of("concat('//* | ', @id)"));
        assertRejected("//server", List.of("concat('******', @id)"));
        assertRejected("//server", List.of("concat('https://a/b/c/d/e/f/g/h/i/j/k', @id)"));
        assertRejected("//server", List.of("a/b/c/d/e/f/g/h/i/j/k/l"));
    }

    private void validate(String expression, List<String> aliases) throws Exception {
        validateExpressions.invoke(collector, expression, aliases);
    }

    private void assertRejected(String expression, List<String> aliases) {
        InvocationTargetException exception = assertThrows(
                InvocationTargetException.class, () -> validate(expression, aliases));
        assertInstanceOf(IllegalArgumentException.class, exception.getCause());
    }
}
