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

package org.apache.hertzbeat.alert.expr;

import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

/**
 * test case for {@link AlertExpressionEvalVisitor}
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
    void testGreaterThan() {
        when(mockExecutor.execute("cpu")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 80.0))));
        when(mockExecutor.execute("select cpu from cpu_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 80.0))));
        // promql
        List<Map<String, Object>> result = evaluate("cpu > 70");
        assertEquals(1, result.size());
        assertEquals(80.0, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"cpu\") > 70");
        assertEquals(1, result.size());
        assertEquals(80.0, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select cpu from cpu_table\") > 70");
        assertEquals(1, result.size());
        assertEquals(80.0, result.get(0).get("__value__"));
    }

    @Test
    void testGreaterThanWithInteger() {
        when(mockExecutor.execute("cpu")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 80))));
        when(mockExecutor.execute("select cpu from cpu_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 80))));
        // promql
        List<Map<String, Object>> result = evaluate("cpu > 70");
        assertEquals(1, result.size());
        assertEquals(80, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"cpu\") > 70");
        assertEquals(1, result.size());
        assertEquals(80, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select cpu from cpu_table\") > 70");
        assertEquals(1, result.size());
        assertEquals(80, result.get(0).get("__value__"));
    }

    @Test
    void testLessThan() {
        when(mockExecutor.execute("memory")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 65.0))));
        when(mockExecutor.execute("select memory from memory_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 65.0))));
        // promql
        List<Map<String, Object>> result = evaluate("memory < 70");
        assertEquals(1, result.size());
        assertEquals(65.0, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"memory\") < 70");
        assertEquals(1, result.size());
        assertEquals(65.0, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select memory from memory_table\") < 70");
        assertEquals(1, result.size());
        assertEquals(65.0, result.get(0).get("__value__"));
    }

    @Test
    void testEqualWithTolerance() {
        when(mockExecutor.execute("disk")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 99.999))));
        when(mockExecutor.execute("select disk from disk_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 99.999))));
        // promql
        List<Map<String, Object>> result = evaluate("disk == 100");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"disk\") == 100");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select disk from disk_table\") == 100");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
    }

    @Test
    void testNotEqual() {
        when(mockExecutor.execute("network")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 50.0))));
        when(mockExecutor.execute("select network from network_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 50.0))));
        // promql
        List<Map<String, Object>> result = evaluate("network != 60");
        assertEquals(1, result.size());
        assertEquals(50.0, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"network\") != 60");
        assertEquals(1, result.size());
        assertEquals(50.0, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select network from network_table\") != 60");
        assertEquals(1, result.size());
        assertEquals(50.0, result.get(0).get("__value__"));
    }

    @Test
    void testExactlyEqual() {
        when(mockExecutor.execute("threshold")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 100.0))));
        when(mockExecutor.execute("select threshold from threshold_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 100.0))));
        // promql
        List<Map<String, Object>> result = evaluate("threshold == 100");
        assertEquals(1, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"threshold\") == 100");
        assertEquals(1, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select threshold from threshold_table\") == 100");
        assertEquals(1, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
    }

    @Test
    void testMaxValueBoundary() {
        when(mockExecutor.execute("max_val")).thenReturn(List.of(new HashMap<>(Map.of("__value__", Double.MAX_VALUE))));
        when(mockExecutor.execute("select max_val from max_val_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", Double.MAX_VALUE))));
        // promql
        List<Map<String, Object>> result = evaluate("max_val > 100");
        assertEquals(1, result.size());
        assertEquals(Double.MAX_VALUE, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"max_val\") > 100");
        assertEquals(1, result.size());
        assertEquals(Double.MAX_VALUE, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select max_val from max_val_table\") > 100");
        assertEquals(1, result.size());
        assertEquals(Double.MAX_VALUE, result.get(0).get("__value__"));
    }

    @Test
    void testMinValueBoundary() {
        when(mockExecutor.execute("min_val")).thenReturn(List.of(new HashMap<>(Map.of("__value__", Double.MIN_VALUE))));
        when(mockExecutor.execute("select min_val from min_val_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", Double.MIN_VALUE))));
        // promql
        List<Map<String, Object>> result = evaluate("min_val > 0");
        assertEquals(1, result.size());
        assertEquals(Double.MIN_VALUE, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"min_val\") > 0");
        assertEquals(1, result.size());
        assertEquals(Double.MIN_VALUE, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select min_val from min_val_table\") > 0");
        assertEquals(1, result.size());
        assertEquals(Double.MIN_VALUE, result.get(0).get("__value__"));
    }

    @Test
    void testEmptyMetricName() {
        when(mockExecutor.execute("")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 50.0))));
        List<Map<String, Object>> result = evaluate(" > 40");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
    }

    @Test
    void testListValueWithMax() {
        List<Double> values = List.of(10.0, 20.0, 30.0);
        when(mockExecutor.execute("multi_val")).thenReturn(List.of(new HashMap<>(Map.of("__value__", values))));
        when(mockExecutor.execute("select multi_val from multi_val_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", values))));
        // promql
        List<Map<String, Object>> result = evaluate("multi_val > 25");
        assertEquals(1, result.size());
        assertEquals(30.0, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"multi_val\") > 25");
        assertEquals(1, result.size());
        assertEquals(30.0, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select multi_val from multi_val_table\") > 25");
        assertEquals(1, result.size());
        assertEquals(30.0, result.get(0).get("__value__"));
    }

    @Test
    void testListValueWithMin() {
        List<Double> values = List.of(10.0, 20.0, 30.0);
        when(mockExecutor.execute("multi_val")).thenReturn(List.of(new HashMap<>(Map.of("__value__", values))));
        when(mockExecutor.execute("select multi_val from multi_val_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", values))));
        // promql
        List<Map<String, Object>> result = evaluate("multi_val < 15");
        assertEquals(1, result.size());
        assertEquals(10.0, result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"multi_val\") < 15");
        assertEquals(1, result.size());
        assertEquals(10.0, result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select multi_val from multi_val_table\") < 15");
        assertEquals(1, result.size());
        assertEquals(10.0, result.get(0).get("__value__"));
    }

    @Test
    void testEmptyListValue() {
        when(mockExecutor.execute("empty_list")).thenReturn(List.of(new HashMap<>(Map.of("__value__", List.of()))));
        when(mockExecutor.execute("select empty_list from empty_list_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", List.of()))));
        // promql
        List<Map<String, Object>> result = evaluate("empty_list > 50");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"empty_list\") > 50");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select empty_list from empty_list_table\") > 50");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
    }

    @Test
    void testNestedParentheses() {
        when(mockExecutor.execute("a")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 10.0))));
        when(mockExecutor.execute("b")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 20.0))));
        when(mockExecutor.execute("c")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 30.0))));
        when(mockExecutor.execute("select a from table_a")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 10.0))));
        when(mockExecutor.execute("select b from table_b")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 20.0))));
        when(mockExecutor.execute("select c from table_c")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 30.0))));
        
        // promql
        List<Map<String, Object>> result = evaluate("(a > 5) and (b > 15 or c < 25)");
        assertEquals(1, result.size());
        assertEquals(10.0, result.get(0).get("__value__"));
        // script promql
        result = evaluate("(__script__(\"a\") > 5) and (__script__(\"b\") > 15 or __script__(\"c\") < 25)");
        assertEquals(1, result.size());
        assertEquals(10.0, result.get(0).get("__value__"));
        // script sql
        result = evaluate("(__script__(\"select a from table_a\") > 5) and (__script__(\"select b from table_b\") > 15 or __script__(\"select c from table_c\") < 25)");
        assertEquals(1, result.size());
        assertEquals(10.0, result.get(0).get("__value__"));
    }

    @Test
    void testMultipleUnlessConditions() {
        when(mockExecutor.execute("metric1")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 40.0))));
        when(mockExecutor.execute("metric2")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 50.0))));
        when(mockExecutor.execute("metric3")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 60.0))));
        when(mockExecutor.execute("select metric1 from metrics_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 40.0))));
        when(mockExecutor.execute("select metric2 from metrics_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 50.0))));
        when(mockExecutor.execute("select metric3 from metrics_table")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 60.0))));
        
        // promql
        List<Map<String, Object>> result = evaluate("metric1 > 30 unless metric2 > 45 unless metric3 < 70");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
        // script promql
        result = evaluate("__script__(\"metric1\") > 30 unless __script__(\"metric2\") > 45 unless __script__(\"metric3\") < 70");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
        // script sql
        result = evaluate("__script__(\"select metric1 from metrics_table\") > 30 unless __script__(\"select metric2 from metrics_table\") > 45 unless __script__(\"select metric3 from metrics_table\") < 70");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
    }

    @Test
    void testComplexExpressionWithMixedOperators() {
        when(mockExecutor.execute("cpu_temp")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 75.0))));
        when(mockExecutor.execute("gpu_temp")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 85.0))));
        when(mockExecutor.execute("fan_speed")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 2000.0))));
        when(mockExecutor.execute("select cpu_temp from sensors")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 75.0))));
        when(mockExecutor.execute("select gpu_temp from sensors")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 85.0))));
        when(mockExecutor.execute("select fan_speed from sensors")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 2000.0))));
        
        // promql
        List<Map<String, Object>> result = evaluate("(cpu_temp > 70 and gpu_temp < 90) or fan_speed > 1500");
        assertEquals(1, result.size());
        assertEquals(75.0, result.get(0).get("__value__"));
        // script promql
        result = evaluate("(__script__(\"cpu_temp\") > 70 and __script__(\"gpu_temp\") < 90) or __script__(\"fan_speed\") > 1500");
        assertEquals(1, result.size());
        assertEquals(75.0, result.get(0).get("__value__"));
        // script sql
        result = evaluate("(__script__(\"select cpu_temp from sensors\") > 70 and __script__(\"select gpu_temp from sensors\") < 90) or __script__(\"select fan_speed from sensors\") > 1500");
        assertEquals(1, result.size());
        assertEquals(75.0, result.get(0).get("__value__"));
    }

    private List<Map<String, Object>> evaluate(String expression) {
        AlertExpressionLexer lexer = new AlertExpressionLexer(CharStreams.fromString(expression));
        AlertExpressionParser parser = new AlertExpressionParser(new CommonTokenStream(lexer));
        return visitor.visit(parser.expression());
    }
}