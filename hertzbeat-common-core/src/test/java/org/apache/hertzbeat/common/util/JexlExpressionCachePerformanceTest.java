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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.jexl3.JexlEngine;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.jexl3.MapContext;
import org.junit.jupiter.api.Test;

/**
 * Compares compile + evaluate cost of long expressions between the jexl default cache threshold (64)
 * and {@link JexlExpressionRunner#CACHE_THRESHOLD}, the same pattern used by alert calculation and collector filters.
 */
@Slf4j
class JexlExpressionCachePerformanceTest {

    private static final int DEFAULT_JEXL_CACHE_THRESHOLD = 64;
    private static final int WARMUP_ITERATIONS = 2_000;
    private static final int MEASURE_ITERATIONS = 5_000;
    private static final int ROUNDS = 3;
    /**
     * the measured speedup is two to three orders of magnitude, keep the assertion loose to stay stable on busy CI
     */
    private static final double MIN_EXPECTED_SPEEDUP = 3.0;

    @Test
    void longExpressionsShouldBeMuchFasterWithRaisedCacheThreshold() {
        JexlEngine before = JexlExpressionRunner.buildEngine(DEFAULT_JEXL_CACHE_THRESHOLD);
        JexlEngine after = JexlExpressionRunner.buildEngine(JexlExpressionRunner.CACHE_THRESHOLD);

        Map<String, Object> alertContext = new HashMap<>();
        alertContext.put("__app__", "linux");
        alertContext.put("__metrics__", "cpu");
        alertContext.put("__instance__", "3");
        alertContext.put("__labels__", "env:prod");
        alertContext.put("usage", 95);

        String singleInstanceRule = "equals(__app__,\"linux\") && equals(__metrics__,\"cpu\") "
                + "&& equals(__instance__, \"3\") && usage > 90";
        String multiInstanceRule = "equals(__app__,\"linux\") && equals(__metrics__,\"cpu\") && ("
                + IntStream.rangeClosed(1, 6).mapToObj(i -> "equals(__instance__, \"" + i + "\")")
                        .collect(Collectors.joining(" or "))
                + ") && (contains(__labels__, \"env:prod\") or contains(__labels__, \"team:ops\")) && usage > 90";
        // enum-mapping calculate like the ones in app-idrac.yml
        String enumMappingCalculate = IntStream.rangeClosed(1, 20)
                .mapToObj(i -> "(memoryDeviceTypeEnum == " + i + ") ? 'type" + i + "' : ")
                .collect(Collectors.joining()) + "'unknown'";
        Map<String, Object> calculateContext = Map.of("memoryDeviceTypeEnum", 15);

        StringBuilder report = new StringBuilder(String.format("%n%-24s %6s %14s %14s %10s%n",
                "expression", "length", "before(us/op)", "after(us/op)", "speedup"));
        report.append(measure("single-instance alert", singleInstanceRule, alertContext, true, before, after));
        report.append(measure("multi-instance alert", multiInstanceRule, alertContext, true, before, after));
        report.append(measure("enum-mapping calculate", enumMappingCalculate, calculateContext, "type15", before, after));
        log.info("jexl parse cache threshold {} -> {}:{}", DEFAULT_JEXL_CACHE_THRESHOLD,
                JexlExpressionRunner.CACHE_THRESHOLD, report);
    }

    private String measure(String name, String expression, Map<String, Object> context, Object expected,
                           JexlEngine before, JexlEngine after) {
        assertTrue(expression.length() >= DEFAULT_JEXL_CACHE_THRESHOLD
                && expression.length() < JexlExpressionRunner.CACHE_THRESHOLD, name + " length " + expression.length());
        assertEquals(expected, compileAndEvaluate(before, expression, context));
        assertEquals(expected, compileAndEvaluate(after, expression, context));

        double beforeNanos = bestNanosPerOp(before, expression, context);
        double afterNanos = bestNanosPerOp(after, expression, context);
        double speedup = beforeNanos / afterNanos;
        assertTrue(speedup >= MIN_EXPECTED_SPEEDUP,
                String.format("%s expected at least %.1fx faster but was %.1fx", name, MIN_EXPECTED_SPEEDUP, speedup));
        return String.format("%-24s %6d %14.2f %14.2f %9.1fx%n",
                name, expression.length(), beforeNanos / 1000, afterNanos / 1000, speedup);
    }

    /**
     * same as the alert calculator: compile on every evaluation, then evaluate
     */
    private static Object compileAndEvaluate(JexlEngine engine, String expression, Map<String, Object> context) {
        JexlExpression compiled = engine.createExpression(expression);
        return compiled.evaluate(new MapContext(new HashMap<>(context)));
    }

    private static double bestNanosPerOp(JexlEngine engine, String expression, Map<String, Object> context) {
        Object sink = null;
        for (int i = 0; i < WARMUP_ITERATIONS; i++) {
            sink = compileAndEvaluate(engine, expression, context);
        }
        long best = Long.MAX_VALUE;
        for (int round = 0; round < ROUNDS; round++) {
            long start = System.nanoTime();
            for (int i = 0; i < MEASURE_ITERATIONS; i++) {
                sink = compileAndEvaluate(engine, expression, context);
            }
            best = Math.min(best, System.nanoTime() - start);
        }
        assertTrue(sink != null);
        return (double) best / MEASURE_ITERATIONS;
    }
}
