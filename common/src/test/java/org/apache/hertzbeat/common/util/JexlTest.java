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

import com.google.common.collect.Maps;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.apache.commons.jexl3.JexlBuilder;
import org.apache.commons.jexl3.JexlContext;
import org.apache.commons.jexl3.JexlEngine;
import org.apache.commons.jexl3.JexlException;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.jexl3.JexlFeatures;
import org.apache.commons.jexl3.MapContext;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * test case for java expression language
 */
public class JexlTest {

    private JexlBuilder jexlBuilder;

    @BeforeEach
    void setUp() {
        ClassLoader classLoader = new ClassLoader() {
            @Override
            public String getName() {
                return "jexl-class-loader";
            }
        };
        JexlFeatures features = new JexlFeatures();
        features.annotation(false).loops(false).pragma(false)
                .methodCall(false).lambda(false).newInstance(false).register(false);
        jexlBuilder = new JexlBuilder().charset(StandardCharsets.UTF_8).cache(256).loader(classLoader)
                .features(features).strict(true).silent(false).stackOverflow(40);

    }

    @Test
    void testMultiExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("x * y");
        Object o = e.evaluate(context);
        Assertions.assertEquals(8, o);
    }

    @Test
    void testDivisionExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("x / y");
        Object o = e.evaluate(context);
        Assertions.assertEquals(8, o);
    }

    @Test
    void testAdditionExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("x + y");
        Object o = e.evaluate(context);
        Assertions.assertEquals(9, o);
        context.set("x", "hello");
        context.set("y", 3.0);
        e = jexl.createExpression("x + y");
        o = e.evaluate(context);
        Assertions.assertEquals("hello3.0", o);
    }

    @Test
    void testSubtractionExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("x - y");
        Object o = e.evaluate(context);
        Assertions.assertEquals(7, o);
    }

    @Test
    void testModulusExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 3);
        JexlExpression e = jexl.createExpression("x % y");
        Object o = e.evaluate(context);
        Assertions.assertEquals(2, o);
    }

    @Test
    void testComplicatedExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("x * y + 2 * x - y");
        Object o = e.evaluate(context);
        Assertions.assertEquals(23, o);
    }

    @Test
    void testComplicatedExpressionWithParentheses() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("(x * y) + (2 * x) - y");
        Object o = e.evaluate(context);
        Assertions.assertEquals(23, o);
    }

    @Test
    void testComplicatedExpressionWithParenthesesAndSpaces() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression(" ( x * y ) + ( 2 * x ) - y ");
        Object o = e.evaluate(context);
        Assertions.assertEquals(23, o);
    }

    @Test
    void testComplicatedSpecialVariableNameExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x.y", 8);
        context.set("y", 1);
        context.set("$.os.cpu.load_average.1m", 23);
        context.set("$.os.load_average", 55);
        context.set("$.fs.total.total_in_bytes", 20.0);
        JexlExpression e = jexl.createExpression("x.y * y + 2 * x.y - y + $.os.cpu.load_average.1m + $.os.load_average + $.fs.total.total_in_bytes");
        Object o = e.evaluate(context);
        Assertions.assertEquals(121.0, o);
    }

    @Test
    void testComplicatedSpecialVariableNameExpressionWithParenthesesAndSpaces() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x.y", 8);
        context.set("y", 1);
        context.set("$.os.cpu.load_average.1m", 23);
        context.set("$.os.load_average", 55);
        context.set("$.fs.total.total_in_bytes", 20.0);
        JexlExpression e = jexl.createExpression(" ( x.y * y ) + ( 2 * x.y ) - y + $.os.cpu.load_average.1m + $.os.load_average + $.fs.total.total_in_bytes ");
        Object o = e.evaluate(context);
        Assertions.assertEquals(121.0, o);
    }

    @Test
    void testVariableAssignment() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("$.fs.total.total_in_bytes", 20.0);
        JexlExpression e = jexl.createExpression(" $.fs.total.total_in_bytes ");
        Object o = e.evaluate(context);
        Assertions.assertEquals(20.0, o);
    }

    @Test
    void testSpecialVariableNameWithoutSpacesExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("$.fs.total.free_in_bytes", 12.0);
        context.set("$.fs.total.total_in_bytes", 23.0);
        JexlExpression e = jexl.createExpression("(1-$.fs.total.free_in_bytes/$.fs.total.total_in_bytes)*100");
        Object o = e.evaluate(context);
        Assertions.assertEquals(47.82608695652174, o);
    }

    @Test
    void testSpecialVariableNameWithSpacesExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("$.fs.total.free_in_bytes", 12.0);
        context.set("$.fs.total.total_in_bytes", 23.0);
        JexlExpression e = jexl.createExpression("( 1 - $.fs.total.free_in_bytes / $.fs.total.total_in_bytes ) * 100");
        Object o = e.evaluate(context);
        Assertions.assertEquals(47.82608695652174, o);
    }

    @Test
    void testJudgmentExpression() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("x > y");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testJudgmentExpressionWithParentheses() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("(x > y)");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testJudgmentExpressionWithParenthesesAndSpaces() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression(" ( x > y ) ");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testJudgmentExpressionWithAndOperator() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        context.set("z", 2);
        JexlExpression e = jexl.createExpression("x > y && x < z");
        Object o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testJudgmentExpressionWithOrOperator() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        context.set("z", 2);
        JexlExpression e = jexl.createExpression("x > y || x < z");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testJudgmentExpressionWithNotOperator() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        JexlExpression e = jexl.createExpression("!(x == 8)");
        Object o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testJudgmentExpressionWithNotOperatorAndParentheses() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("$.fs.total.free_in_bytes", 8);
        JexlExpression e = jexl.createExpression("!($.fs.total.free_in_bytes == 8)");
        Object o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testCustomFunction() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("date", new DateFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 1);
        JexlExpression e = jexl.createExpression("date:now(x,y)");
        Object o = e.evaluate(context);
        String result = (String) o;
        Assertions.assertTrue(result.endsWith("2"));
    }

    @Test
    void testZeroThrowException() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", 0);
        JexlExpression e = jexl.createExpression("x / y");
        Assertions.assertThrows(JexlException.class, () -> e.evaluate(context));
    }

    @Test
    void testNullThrowException() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", null);
        JexlExpression e = jexl.createExpression("x / y");
        Assertions.assertThrows(JexlException.class, () -> e.evaluate(context));
    }

    @Test
    void testEmptyStringThrowException() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", 8);
        context.set("y", "");
        JexlExpression e = jexl.createExpression("x / y");
        Assertions.assertThrows(JexlException.class, () -> e.evaluate(context));
    }

    @Test
    void testEqualsFunction() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "hello");
        context.set("y", "hello");
        JexlExpression e = jexl.createExpression("sys:equals(x, y)");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testNotEqualsFunction() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "hellos");
        context.set("y", "hello");
        JexlExpression e = jexl.createExpression("sys:equals(x, y)");
        Object o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testContainsFunction() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put(null, new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "hello");
        context.set("y", "e");
        JexlExpression e = jexl.createExpression("contains(x, y)");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testExistsFunction() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "hello");
        JexlExpression e = jexl.createExpression("sys:exists(x)");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testExistsFunctionWithNull() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        JexlExpression e = jexl.createExpression("sys:exists(x)");
        Assertions.assertThrows(JexlException.class, () -> e.evaluate(context));
    }

    @Test
    void testExistsFunctionWithEmptyString() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "");
        JexlExpression e = jexl.createExpression("sys:exists(x)");
        Object o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testExistsFunctionWithEmptyStringAndSpace() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", " ");
        JexlExpression e = jexl.createExpression("sys:exists(x)");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testMatchesFunction() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "hello");
        JexlExpression e = jexl.createExpression("sys:matches(x, '.*')");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testMatchesFunctionWithNull() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", null);
        JexlExpression e = jexl.createExpression("sys:matches(x, '.*')");
        Object o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testMatchesFunctionWithEmptyString() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "");
        JexlExpression e = jexl.createExpression("sys:matches(x, '.*')");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testMatchesFunctionWithEmptyStringAndSpace() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", " ");
        JexlExpression e = jexl.createExpression("sys:matches(x, '.*')");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testMatchesFunctionWithRegex() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "hello");
        JexlExpression e = jexl.createExpression("sys:matches(x, 'he.*')");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
    }

    @Test
    void testMatchesFunctionWithRegexNotMatch() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "hello");
        JexlExpression e = jexl.createExpression("sys:matches(x, 'he')");
        Object o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testMatchesFunctionWithRegexAndSpace() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put("sys", new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "hello");
        JexlExpression e = jexl.createExpression("sys:matches(x, 'he.* ')");
        Object o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testMatchesFunctionWithRegexAndSpace2() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put(null, new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "Ubuntu50681269");
        JexlExpression e = jexl.createExpression("matches(x, '^[a-zA-Z0-9]+$')");
        Object o = e.evaluate(context);
        Assertions.assertTrue((Boolean) o);
        context.set("x", "Ubuntu_u50681269");
        o = e.evaluate(context);
        Assertions.assertFalse((Boolean) o);
    }

    @Test
    void testNowFunction() {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        functions.put(null, new JexlCommonFunction());
        jexlBuilder.namespaces(functions);
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        JexlExpression e = jexl.createExpression("now() + '-0'");
        Object o = e.evaluate(context);
        String result = (String) o;
        Assertions.assertTrue(result.endsWith("-0"));
    }

    @Test
    void testAddString() {
        JexlEngine jexl = jexlBuilder.create();
        JexlContext context = new MapContext();
        context.set("x", "Ubuntu");
        JexlExpression e = jexl.createExpression("x + \"-00000\"");
        Object o = e.evaluate(context);
        String result = (String) o;
        e = jexl.createExpression("x + '-00000'");
        Assertions.assertEquals("Ubuntu-00000", result);
        o = e.evaluate(context);
        result = (String) o;
        Assertions.assertEquals("Ubuntu-00000", result);
    }

    @Test
    void testUnconventionalMapping() {
        // database_pages=Database pages
        // name=User Commits Per Sec
        JexlEngine jexl = jexlBuilder.create();
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("Database pages"));
        Assertions.assertDoesNotThrow(() -> jexl.createExpression("Database_pages"));
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("User Commits Per Sec"));
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("System I/O"));
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("User I/O"));
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("Library Cache Hit Ratio"));
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("Buffer Cache Hit Ratio"));
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("Page reads/sec"));
    }

    @Test
    void testRecException() {
        JexlEngine jexl = jexlBuilder.create();
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("new java.util.Date()"));
    }

    @Test
    void testNewObjectException() {
        JexlEngine jexl = jexlBuilder.create();
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("new java.lang.StringBuilder()"));
    }

    @Test
    void testMethodCallException() {
        JexlEngine jexl = jexlBuilder.create();
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("'string'.length()"));
        Assertions.assertThrows(JexlException.class, () -> jexl.createExpression("System.currentTimeMillis()"));
    }

    /**
     * custom function
     */
    public static class DateFunction {
        public String now(Object... args) {
            return System.currentTimeMillis() + "-" + args.length;
        }
    }
}
