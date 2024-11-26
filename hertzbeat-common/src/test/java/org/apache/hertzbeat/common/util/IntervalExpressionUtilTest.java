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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link IntervalExpressionUtil}
 */
class IntervalExpressionUtilTest {

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
