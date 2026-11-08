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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Test case for {@link IntervalExpressionUtil}
 */
class IntervalExpressionUtilTest {

    @Test
    void testAbsentConstraintPreservesOptionalValueSemantics() {
        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(null, null));
        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(null, ""));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(null, "[0,10]||[20,30]"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "[0,65535,]", "[0,65535,,]", "[0,,65535]", "[,65535]", "[0,]",
        "[0,65535]||", "||[0,65535]", "[0,65535]||||[0,65535]",
        "[0,65535]||invalid", "invalid||[0,65535]",
        "[0,65535]||[1]", "[1]||[0,65535]",
        "[0,65535]||{1,2}", "{1,2}||[0,65535]",
        "[0,65535]||[bad,2]", "[bad,2]||[0,65535]",
        "[0,65535]||[1,bad]", "[1,bad]||[0,65535]",
        "[0,65535]||[NaN,2]", "[NaN,2]||[0,65535]",
        "[0,65535]||[1,NaN]", "[1,NaN]||[0,65535]",
        "[0,65535]||[2,1]", "[2,1]||[0,65535]",
        "[0,65535]||[1,2,]", "[1,2,]||[0,65535]"
    })
    void testRejectMalformedCompleteExpression(String expression) {
        // A matching interval must not hide an invalid term before or after it.
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(8080.0, expression));
    }

    @ParameterizedTest
    @ValueSource(strings = {" ", "[", "[]", "[1]", "{0,10]", "[0,10}", "||", "||||", "[NaN,10]", "[0,NaN]"})
    void testRejectMalformedSingleInterval(String expression) {
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(5.0, expression));
    }

    @ParameterizedTest
    @MethodSource("validUnionCases")
    void testValidUnionMembership(double value, String expression, boolean expected) {
        assertEquals(expected,
                IntervalExpressionUtil.validNumberIntervalExpress(value, expression));
    }

    static Stream<Arguments> validUnionCases() {
        return Stream.of(
                Arguments.of(-1.0, "(-∞,0)||[10,+∞)", true),
                Arguments.of(0.0, "(-∞,0)||[10,+∞)", false),
                Arguments.of(5.0, "(-∞,0)||[10,+∞)", false),
                Arguments.of(10.0, "(-∞,0)||[10,+∞)", true),
                Arguments.of(100.0, "(-∞,0)||[10,+∞)", true),
                Arguments.of(5.0, "[0,10]||[20,30]", true),
                Arguments.of(25.0, "[0,10]||[20,30]", true),
                Arguments.of(15.0, "[0,10]||[20,30]", false),
                Arguments.of(5.0, "[20,30]||[0,10]", true),
                Arguments.of(25.0, "[20,30]||[0,10]", true),
                Arguments.of(15.0, "[20,30]||[0,10]", false),
                Arguments.of(5.0, "[0,10]||[3,7]||[20,30]", true),
                Arguments.of(5.0, "[5,5]", true),
                Arguments.of(5.0, "(5,5)", false),
                Arguments.of(5.0, "[5,5)", false),
                Arguments.of(5.0, "(5,5]", false),
                Arguments.of(5.0, "(5,5)||[0,10]", true),
                Arguments.of(5.0, "[0,10]||(5,5)", true),
                Arguments.of(0.5, "[-1e0,1e0]", true),
                Arguments.of(0.5, "[ 0, 1 ]", true),
                Arguments.of(Double.NaN, "(-∞,+∞)", false)
        );
    }

    @Test
    void testAllBracketCombinationsAtBoundaries() {
        for (String left : new String[] {"[", "("}) {
            for (String right : new String[] {"]", ")"}) {
                String expression = left + "0,10" + right;
                assertEquals("[".equals(left),
                        IntervalExpressionUtil.validNumberIntervalExpress(0.0, expression));
                assertEquals("]".equals(right),
                        IntervalExpressionUtil.validNumberIntervalExpress(10.0, expression));
                assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(5.0, expression));
                assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(-1.0, expression));
                assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(11.0, expression));
            }
        }
    }

    @Test
    public void testValidNumberIntervalExpress() {

        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(5.0, null));

        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(5.0, ""));

        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(null, "(3,7)"));

        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(5.0, "(3,7)"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(3.0, "(3,7)"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(7.0, "(3,7)"));

        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(3.0, "[3,7]"));
        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(7.0, "[3,7]"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(2.0, "[3,7]"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(8.0, "[3,7]"));

        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(3.0, "[3,7)"));
        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(6.9999, "[3,7)"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(7.0, "[3,7)"));

        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(4.0, "(3,7]"));
        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(7.0, "(3,7]"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(3.0, "(3,7]"));

        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(-1000.0, "(-∞,5)"));
        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(-1.0, "(-∞,5)"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(5.0, "(-∞,5)"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(10.0, "(-∞,5)"));

        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(1000.0, "(5,+∞)"));
        assertTrue(IntervalExpressionUtil.validNumberIntervalExpress(10.0, "(5,+∞)"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(5.0, "(5,+∞)"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(0.0, "(5,+∞)"));

        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(5.0, "(3,7"));
        assertFalse(IntervalExpressionUtil.validNumberIntervalExpress(5.0, "[3,7)3,7]"));
    }

}
