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

package org.apache.hertzbeat.alert.service;

import com.github.benmanes.caffeine.cache.Cache;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.tree.ParseTree;
import org.apache.hertzbeat.alert.service.impl.DataSourceServiceImpl;
import org.apache.hertzbeat.common.support.exception.AlertExpressionException;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * test case for {@link DataSourceService}
 */
class DataSourceServiceTest {

    private DataSourceServiceImpl dataSourceService;

    @BeforeEach
    void setUp() {
        dataSourceService = new DataSourceServiceImpl(null);
    }

    @Test
    void calculate1() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total > 150");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));
        assertEquals(200.0, result.get(1).get("__value__"));
    }

    @Test
    void calculate2() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total <= 100");
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }

    @Test
    void calculate3() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total >= 200");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));
        assertEquals(200.0, result.get(1).get("__value__"));
    }

    @Test
    void calculate4() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total > 250");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }

    @Test
    void calculate5() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total < 100");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }

    @Test
    void calculate6() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total > 200");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }

    @Test
    void calculate7() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "(node_cpu_seconds_total <= 100)");
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }

    @Test
    void calculate8() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"}[4m] <= 100");
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }

    @Test
    void calculate9() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} == 100");
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }

    @Test
    void calculate10() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} != 100");
        assertEquals(2, result.size());
        assertNull(result.get(0).get("__value__"));
        assertEquals(200.0, result.get(1).get("__value__"));
    }

    @Test
    void calculate11() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 50 and node_cpu_seconds_total{mode=\"idle\"} < 120");
        assertEquals(1, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
    }

    @Test
    void calculate12() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "(node_cpu_seconds_total{mode=\"user\"} > 50) and (node_cpu_seconds_total{mode=\"idle\"} < 120)");
        assertEquals(1, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
    }

    @Test
    void calculate13() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 150 and node_cpu_seconds_total{mode=\"idle\"} < 220");
        assertEquals(1, result.size());
        assertEquals(200.0, result.get(0).get("__value__"));
    }

    @Test
    void calculate14() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "(node_cpu_seconds_total{mode=\"user\"} > 150) and (node_cpu_seconds_total{mode=\"idle\"} < 220)");
        assertEquals(1, result.size());
        assertEquals(200.0, result.get(0).get("__value__"));
    }

    @Test
    void calculate15() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 1))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("count(node_cpu_seconds_total{mode=\"user\"} > 250)")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("count(node_cpu_seconds_total{mode=\"idle\"} < 220 )")).thenReturn(new ArrayList<>());
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "count(node_cpu_seconds_total{mode=\"user\"} > 250) > 0 and count(node_cpu_seconds_total{mode=\"idle\"} < 220 ) > 0");
        assertEquals(0, result.size());
    }

    @Test
    void calculate16() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 1))
        );
        List<Map<String, Object>> prometheusData2 = List.of(
                new HashMap<>(Map.of("__value__", 1))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("count(node_cpu_seconds_total{mode=\"user\"} > 250)")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("count(node_cpu_seconds_total{mode=\"idle\"} < 220 )")).thenReturn(prometheusData2);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "count(node_cpu_seconds_total{mode=\"user\"} > 250) > 0 and count(node_cpu_seconds_total{mode=\"idle\"} < 220 ) > 0");
        assertEquals(1, result.size());
        assertNotNull(result.get(0).get("__value__"));
    }

    @Test
    void calculate17() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        List<Map<String, Object>> prometheusData2 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"user\"}")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"idle\"}")).thenReturn(prometheusData2);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 150 or node_cpu_seconds_total{mode=\"idle\"} < 20");
        assertEquals(1, result.size());
        assertEquals(200.0, result.get(0).get("__value__"));
    }

    @Test
    void calculate18() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        List<Map<String, Object>> prometheusData2 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"user\"}")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"idle\"}")).thenReturn(prometheusData2);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 250 or node_cpu_seconds_total{mode=\"idle\"} < 120");
        assertEquals(1, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
    }

    @Test
    void calculate19() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        List<Map<String, Object>> prometheusData2 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"user\"}")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"idle\"}")).thenReturn(prometheusData2);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 250 or node_cpu_seconds_total{mode=\"idle\"} < 20");
        assertEquals(0, result.size());
    }

    @Test
    void calculate20() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        List<Map<String, Object>> prometheusData2 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "key", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "book", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"user\"}")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"idle\"}")).thenReturn(prometheusData2);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 50 or node_cpu_seconds_total{mode=\"idle\"} < 320");
        assertEquals(4, result.size());
    }

    @Test
    void calculate21() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        List<Map<String, Object>> prometheusData2 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "key", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "book", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"user\"}")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"idle\"}")).thenReturn(prometheusData2);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 50 unless node_cpu_seconds_total{mode=\"idle\"} < 320");
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
    }

    @Test
    void calculate22() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        List<Map<String, Object>> prometheusData2 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "key", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "book", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"user\"}")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"idle\"}")).thenReturn(prometheusData2);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 50 unless node_cpu_seconds_total{mode=\"idle\"} < 20");
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
    }

    @Test
    void calculate23() {
        List<Map<String, Object>> prometheusData1 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "instance", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        List<Map<String, Object>> prometheusData2 = List.of(
                new HashMap<>(Map.of("__value__", 100.0, "timestamp", 1343554, "key", "node1")),
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "book", "node2"))
        );

        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"user\"}")).thenReturn(prometheusData1);
        Mockito.when(mockExecutor.execute("node_cpu_seconds_total{mode=\"idle\"}")).thenReturn(prometheusData2);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 250 unless node_cpu_seconds_total{mode=\"idle\"} < 20");
        assertEquals(0, result.size());
    }

    @Test
    void calculate24() {
        List<Map<String, Object>> prometheusData = List.of();
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total > 150");
        assertEquals(0, result.size());
    }

    @Test
    void calculate25() {
        List<Map<String, Object>> prometheusData = List.of();
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 250 unless node_cpu_seconds_total{mode=\"idle\"} < 20");
        assertEquals(0, result.size());
    }

    @Test
    void calculate26() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total > 150");
        assertEquals(1, result.size());
        assertEquals(200.0, result.get(0).get("__value__"));
    }

    @Test
    void expressionCacheShouldHitForSameExpression() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));
        String expr = "node_cpu_seconds_total > 50";
        Cache<String, ParseTree> expressionCache = dataSourceService.getExpressionCache();
        expressionCache.invalidateAll();
        long beforeHits = expressionCache.stats().hitCount();
        dataSourceService.calculate("promql", expr); //first execution miss cache
        dataSourceService.calculate("promql", expr); //second execution hits cache
        long actualHits = expressionCache.stats().hitCount() - beforeHits;
        assertEquals(1, actualHits, "expression cache should hit but miss");
    }

    @Test
    void tokenCacheShouldHitForSameExpression() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));
        String expr = "node_cpu_seconds_total > 50";
        Cache<String, ParseTree> expressionCache = dataSourceService.getExpressionCache();
        Cache<String, CommonTokenStream> tokenStreamCache = dataSourceService.getTokenStreamCache();
        expressionCache.invalidateAll();
        tokenStreamCache.invalidateAll();
        long beforeHits = tokenStreamCache.stats().hitCount();
        dataSourceService.calculate("promql", expr);
        dataSourceService.calculate("promql", expr);
        long actualHits = tokenStreamCache.stats().hitCount() - beforeHits;
        assertEquals(1, actualHits, "expression cache should hit but miss");
    }

    @Test
    void expressCacheShouldNotHitForDifferentExpressions() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));
        dataSourceService.calculate("promql", "node_cpu_seconds_total > 50");
        Cache<String, ParseTree> expressionCache = dataSourceService.getExpressionCache();
        Cache<String, CommonTokenStream> tokenStreamCache = dataSourceService.getTokenStreamCache();
        expressionCache.invalidateAll();
        tokenStreamCache.invalidateAll();
        String expr1 = "node_cpu_seconds_total > 30";
        String expr2 = "node_cpu_seconds_total > 50";
        long beforeHits = expressionCache.stats().hitCount();
        dataSourceService.calculate("promql", expr1);
        dataSourceService.calculate("promql", expr2);
        long actualHits = expressionCache.stats().hitCount() - beforeHits;
        assertEquals(0, actualHits, "expression cache should miss but hit");
    }

    @Test
    void tokenCacheShouldNotHitForDifferentExpressions() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 200.0, "timestamp", 1343555, "instance", "node2"))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        Mockito.when(mockExecutor.support("promql")).thenReturn(true);
        Mockito.when(mockExecutor.execute(Mockito.anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));
        dataSourceService.calculate("promql", "node_cpu_seconds_total > 50");
        Cache<String, ParseTree> expressionCache = dataSourceService.getExpressionCache();
        Cache<String, CommonTokenStream> tokenStreamCache = dataSourceService.getTokenStreamCache();
        expressionCache.invalidateAll();
        tokenStreamCache.invalidateAll();
        String expr1 = "node_cpu_seconds_total > 30";
        String expr2 = "node_cpu_seconds_total > 50";
        long beforeHits = tokenStreamCache.stats().hitCount();
        dataSourceService.calculate("promql", expr1);
        dataSourceService.calculate("promql", expr2);
        long actualHits = tokenStreamCache.stats().hitCount() - beforeHits;
        assertEquals(0, actualHits, "expression cache should miss but hit");
    }

    @Test
    void testAlertExpressionException() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>() {
                    {
                        put("exception", "none");
                        put("instance", "host.docker.internal:8989");
                        put("__value__", 1307);
                        put("method", "GET");
                        put("__name__", "http_server_requests_seconds_count");
                        put("__timestamp__", "1.750320922467E9");
                        put("error", "none");
                        put("job", "spring-boot-app");
                        put("uri", "/actuator/prometheus");
                        put("outcome", "SUCCESS");
                        put("status", "200");
                    }
                });
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support(eq("promql"))).thenReturn(true);
        when(mockExecutor.execute(eq("http_server_requests_seconds_count"))).thenReturn(prometheusData);

        dataSourceService.setExecutors(List.of(mockExecutor));
        List<Map<String, Object>> result = dataSourceService.calculate("promql", "http_server_requests_seconds_count > 10");
        assertNotNull(result);
        assertEquals(1307, result.get(0).get("__value__"));

        assertThrows(AlertExpressionException.class, () -> dataSourceService.calculate("promql", "http_server_requests_seconds_count{!@~!!#$%^&}"));
    }

    @Test
    void query1() {
        List<Map<String, Object>> sqlData = List.of(
                new HashMap<>(Map.of("count", 10, "severity_text", "ERROR"))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        when(mockExecutor.execute(anyString())).thenReturn(sqlData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        String validSql = "SELECT count(*) FROM hertzbeat_logs WHERE severity_text = 'ERROR'";
        List<Map<String, Object>> result = dataSourceService.query("sql", validSql);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(mockExecutor).execute(anyString());
    }

    @Test
    void query2() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "INSERT INTO hertzbeat_logs (body) VALUES ('test')"));
        verify(mockExecutor, never()).execute(anyString());
    }

    @Test
    void query3() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "DELETE FROM hertzbeat_logs WHERE id = 1"));
        verify(mockExecutor, never()).execute(anyString());
    }

    @Test
    void query4() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "UPDATE hertzbeat_logs SET body = 'hacked' WHERE id = 1"));
        verify(mockExecutor, never()).execute(anyString());
    }

    @Test
    void query5() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "DROP TABLE hertzbeat_logs"));
        verify(mockExecutor, never()).execute(anyString());
    }

    @Test
    void query6() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "SELECT * FROM hertzbeat_logs UNION SELECT * FROM users"));
        verify(mockExecutor, never()).execute(anyString());
    }

    @Test
    void query7() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "SELECT * FROM hertzbeat_logs WHERE id IN (SELECT id FROM other_table)"));
        verify(mockExecutor, never()).execute(anyString());
    }

    @Test
    void query8() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "SELECT * FROM users"));
        verify(mockExecutor, never()).execute(anyString());
    }

    @Test
    void query9() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "WITH cte AS (SELECT * FROM hertzbeat_logs) SELECT * FROM cte"));
        verify(mockExecutor, never()).execute(anyString());
    }

    @Test
    void query10() {
        List<Map<String, Object>> sqlData = List.of(
                new HashMap<>(Map.of("errorCount", 5))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        when(mockExecutor.execute(anyString())).thenReturn(sqlData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        String complexSql = "SELECT count(*) AS errorCount FROM hertzbeat_logs "
                + "WHERE time_unix_nano >= NOW() AND severity_text = 'ERROR' "
                + "GROUP BY severity_text HAVING count(*) > 2 ORDER BY errorCount LIMIT 10";

        List<Map<String, Object>> result = dataSourceService.query("sql", complexSql);
        assertNotNull(result);
        verify(mockExecutor).execute(anyString());
    }

    @Test
    void query11() {
        List<Map<String, Object>> prometheusData = List.of(
                new HashMap<>(Map.of("__value__", 100.0))
        );
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("promql")).thenReturn(true);
        when(mockExecutor.execute(anyString())).thenReturn(prometheusData);
        dataSourceService.setExecutors(List.of(mockExecutor));

        List<Map<String, Object>> result = dataSourceService.query("promql", "node_cpu_seconds_total > 50");

        assertNotNull(result);
        verify(mockExecutor).execute(anyString());
    }

    @Test
    void query12() {
        QueryExecutor mockExecutor = Mockito.mock(QueryExecutor.class);
        when(mockExecutor.support("sql")).thenReturn(true);
        dataSourceService.setExecutors(List.of(mockExecutor));

        assertThrows(AlertExpressionException.class,
                () -> dataSourceService.query("sql", "SELEC * FORM hertzbeat_logs"));
        verify(mockExecutor, never()).execute(anyString());
    }
}
