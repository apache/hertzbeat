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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.HashMap;
import java.util.Map;

import org.apache.commons.jexl3.JexlExpression;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link JexlExpressionRunner}
 */
public class JexlExpressionRunnerTest {
    @Test
    void evaluate() {
        Map<String, Object> context = new HashMap<String, Object>();
        context.put("age", 2);
        context.put("__age__", 2);

        String expression = "1 + 2";
        String expressionWithParam = "1 + age";
        String expressionWithName = "1 + __age__";

        assertEquals(3, JexlExpressionRunner.evaluate(expression));
        assertEquals(3, JexlExpressionRunner.evaluate(expression, context));
        assertEquals(3, JexlExpressionRunner.evaluate(expressionWithParam, context));
        assertEquals(3, JexlExpressionRunner.evaluate(expressionWithName, context));

        assertThrows(NullPointerException.class, () -> {
            JexlExpressionRunner.evaluate(expression, null);
        });

        JexlExpression expObj = JexlExpressionRunner.compile(expression);
        assertNotNull(expObj);
        assertEquals(3, JexlExpressionRunner.evaluate(expObj, context));
    }

    @Test
    void commonFuncs() {
        assertEquals(true, JexlExpressionRunner.evaluate("equals(1, 1)"));
        assertEquals(true, JexlExpressionRunner.evaluate("equals(null, null)"));
        assertEquals(false, JexlExpressionRunner.evaluate("equals(null, 1)")); 
        assertEquals(true, JexlExpressionRunner.evaluate("""
                contains("abc", "a")
                """)); 
        assertEquals(true, JexlExpressionRunner.evaluate("""
                contains("Abc", "a")
                """)); 
    }
}
