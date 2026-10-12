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

package org.apache.hertzbeat.manager.service.impl;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PersesMetricFormulaValidatorTest {
    @ParameterizedTest
    @ValueSource(strings = {"a+b*2", "minimum(a,maximum(b, .5))", "-a / (+b + 1.)", "a/0", "1", "  a "})
    void acceptsPinnedArithmeticWithoutEvaluatingValues(String expression) {
        assertDoesNotThrow(() -> PersesMetricFormulaValidator.validate(expression, Set.of("a", "b")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "a+", "a b", "a**b", "sum(a,b)", "a+z", "f1+a", "a;1", "1e2", "minimum(a)", "(a", "a)", "NaN"})
    void rejectsNonGrammarAndUndefinedReferences(String expression) {
        assertThrows(IllegalArgumentException.class, () -> PersesMetricFormulaValidator.validate(expression, Set.of("a", "b")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"abs(a)", "log2(a)", "log10(a)", "pow(a, 2)", "pow(2,b)",
            "log10(maximum(a,b))", "pow(abs(a),2)", "minimum(abs(a),log2(pow(b,2)))", "abs(a / 0)"})
    void acceptsPointwiseFunctionsAndNestedComposition(String expression) {
        assertDoesNotThrow(() -> PersesMetricFormulaValidator.validate(expression, Set.of("a", "b")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"abs()", "abs(a,b)", "log2()", "log2(a,b)", "log10(a,b)",
            "pow(a)", "pow(a,b,2)", "pow(,a)", "pow(a,)", "abs(z)", "log20(a)", "Abs(a)",
            "log2(a);a", "pow(a, f1)", "pow(a,NaN)", "log2(a).__proto__", "a\u0000+b"})
    void rejectsWrongAritiesNamesReferencesAndTrailingCode(String expression) {
        assertThrows(IllegalArgumentException.class, () -> PersesMetricFormulaValidator.validate(expression, Set.of("a", "b")));
    }

    @Test
    void preservesDocumentErrorTokenThroughSharedValidator() {
        var error = assertThrows(IllegalArgumentException.class,
                () -> PersesMetricFormulaValidator.validate("a+z", Set.of("a", "b")));
        org.junit.jupiter.api.Assertions.assertEquals("signal_dashboard_document_invalid", error.getMessage());
    }

    @Test
    void preservesFrontendRecursionBound() {
        assertThrows(IllegalArgumentException.class,
                () -> PersesMetricFormulaValidator.validate("(".repeat(24) + "a" + ")".repeat(24), Set.of("a")));
        assertThrows(IllegalArgumentException.class,
                () -> PersesMetricFormulaValidator.validate("abs(".repeat(24) + "a" + ")".repeat(24), Set.of("a")));
    }
}
