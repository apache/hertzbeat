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

package org.apache.hertzbeat.alert.expr;

import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link AlertExpressionEvalVisitor}
 */
class AlertExpressionEvalVisitorTest {

    private QueryExecutor mockExecutor;
    private AlertExpressionEvalVisitor visitor;

    @BeforeEach
    void setUp() {
        mockExecutor = Mockito.mock(QueryExecutor.class);
        visitor = new AlertExpressionEvalVisitor(mockExecutor);
    }

    @Test
    void testComparisonOperators() {
        // Setup test data
        List<Map<String, Object>> testData = new ArrayList<>();
        Map<String, Object> item1 = new HashMap<>();
        item1.put("__value__", 100.0);
        testData.add(item1);

        Map<String, Object> item2 = new HashMap<>();
        item2.put("__value__", 200.0);
        testData.add(item2);

        // Test greater than
        when(mockExecutor.execute("test_metric")).thenReturn(testData);
        List<Map<String, Object>> result = evaluate("test_metric > 150");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));  // 100 <= 150
        assertEquals(200.0, result.get(1).get("__value__")); // 200 > 150

        // Test less than or equal
        result = evaluate("test_metric <= 150");
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__")); // 100 <= 150
        assertNull(result.get(1).get("__value__")); // 200 > 150

        // Test equals
        result = evaluate("test_metric == 100");
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));

        // Test not equals
        result = evaluate("test_metric != 100");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));
        assertEquals(200.0, result.get(1).get("__value__"));
    }

    @Test
    void testLogicalOperations() {
        // Setup test data for left operand
        List<Map<String, Object>> leftData = new ArrayList<>();
        Map<String, Object> leftItem = new HashMap<>();
        leftItem.put("__value__", 100.0);
        leftData.add(leftItem);

        // Setup test data for right operand
        List<Map<String, Object>> rightData = new ArrayList<>();
        Map<String, Object> rightItem = new HashMap<>();
        rightItem.put("__value__", 200.0);
        rightData.add(rightItem);

        // Test AND - both match
        when(mockExecutor.execute("left_metric")).thenReturn(leftData);
        when(mockExecutor.execute("right_metric")).thenReturn(rightData);
        List<Map<String, Object>> result = evaluate("left_metric > 50 and right_metric > 150");
        assertEquals(1, result.size());
        assertNotNull(result.get(0).get("__value__"));

        // Test AND - left doesn't match
        result = evaluate("left_metric > 150 and right_metric > 150");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));

        // Test OR - at least one matches
        result = evaluate("left_metric > 150 or right_metric > 150");
        assertEquals(1, result.size());
        assertEquals(200.0, result.get(0).get("__value__"));

        // Test OR - neither matches
        result = evaluate("left_metric > 200 or right_metric > 300");
        assertEquals(1, result.size()); // Still returns the merged result
        assertNull(result.get(0).get("__value__"));

        // Test UNLESS - unless condition is false
        result = evaluate("left_metric > 50 unless right_metric > 150");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));

        // Test UNLESS - unless condition is true
        result = evaluate("left_metric > 50 unless right_metric > 100");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
    }

    @Test
    void testListValueEvaluation() {
        // Setup test data with list values
        List<Map<String, Object>> testData = new ArrayList<>();
        Map<String, Object> item1 = new HashMap<>();
        item1.put("__value__", List.of(80.0, 120.0)); // Contains value > 100
        testData.add(item1);

        Map<String, Object> item2 = new HashMap<>();
        item2.put("__value__", List.of(70.0, 90.0)); // No values > 100
        testData.add(item2);

        when(mockExecutor.execute("list_metric")).thenReturn(testData);

        // Test with greater than operator - should find max value
        List<Map<String, Object>> result = evaluate("list_metric > 100");
        assertEquals(2, result.size());
        assertEquals(120.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));

        // Test with less than operator - should find min value
        result = evaluate("list_metric < 75");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));
        assertEquals(70.0, result.get(1).get("__value__"));

        // Test with equals operator - should check all values
        result = evaluate("list_metric == 80");
        assertEquals(2, result.size());
        assertEquals(80.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }

    @Test
    void testEmptyQueryResults() {
        // Setup empty result
        when(mockExecutor.execute("empty_metric")).thenReturn(new ArrayList<>());

        // Test with comparison
        List<Map<String, Object>> result = evaluate("empty_metric > 100");
        assertTrue(result.isEmpty());

        // Test with logical operation
        when(mockExecutor.execute("non_empty_metric")).thenReturn(List.of(Map.of("__value__", 200.0)));
        result = evaluate("empty_metric > 50 and non_empty_metric > 150");
        assertEquals(1, result.size()); // Still returns the merged result from non-empty metric
        assertEquals(200.0, result.get(0).get("__value__"));
    }

    @Test
    void testLiteralExpressions() {
        // Test that literal threshold works correctly
        when(mockExecutor.execute("test_metric")).thenReturn(List.of(Map.of("__value__", 75.0)));

        List<Map<String, Object>> result = evaluate("test_metric > 50");
        assertEquals(1, result.size());
        assertEquals(75.0, result.get(0).get("__value__"));
    }

    @Test
    void testParenthesesPriority() {
        // Setup test data
        List<Map<String, Object>> dataA = List.of(Map.of("__value__", 75.0));
        List<Map<String, Object>> dataB = List.of(Map.of("__value__", 85.0));
        List<Map<String, Object>> dataC = List.of(Map.of("__value__", 95.0));

        when(mockExecutor.execute("metric_a")).thenReturn(dataA);
        when(mockExecutor.execute("metric_b")).thenReturn(dataB);
        when(mockExecutor.execute("metric_c")).thenReturn(dataC);

        // Test with parentheses changing evaluation order
        List<Map<String, Object>> result = evaluate("metric_a > 80 or (metric_b > 80 and metric_c > 90)");
        assertEquals(1, result.size());
        assertEquals(85.0, result.get(0).get("__value__"));
    }

    @Test
    void testMultipleConditions() {
        // Setup test data for multiple metrics
        List<Map<String, Object>> cpuData = List.of(
                Map.of("__value__", 85.0, "instance", "node1"),
                Map.of("__value__", 95.0, "instance", "node2")
        );

        List<Map<String, Object>> memData = List.of(
                Map.of("__value__", 75.0, "instance", "node1"),
                Map.of("__value__", 85.0, "instance", "node2")
        );

        when(mockExecutor.execute("cpu_usage")).thenReturn(cpuData);
        when(mockExecutor.execute("mem_usage")).thenReturn(memData);

        // Test complex condition
        List<Map<String, Object>> result = evaluate("cpu_usage > 80 and mem_usage > 70 unless cpu_usage > 90");
        assertEquals(2, result.size());

        // Node1 should match (cpu=85 >80 and mem=75>70 unless cpu>90=false)
        assertEquals(85.0, result.get(0).get("__value__"));
        // Node2 should not match (unless condition is true)
        assertNull(result.get(1).get("__value__"));
    }

    private List<Map<String, Object>> evaluate(String expression) {
        AlertExpressionLexer lexer = new AlertExpressionLexer(CharStreams.fromString(expression));
        AlertExpressionParser parser = new AlertExpressionParser(new CommonTokenStream(lexer));
        return visitor.visit(parser.expression());
    }
}
