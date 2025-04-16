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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.util.HashMap;

import com.github.benmanes.caffeine.cache.Cache;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.tree.ParseTree;
import org.apache.hertzbeat.alert.service.impl.DataSourceServiceImpl;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import org.mockito.Mockito;

/**
 * test case for {@link DataSourceService}
 */
class DataSourceServiceTest {
    
    private DataSourceServiceImpl dataSourceService;
    
    @BeforeEach
    void setUp() {
        dataSourceService = new DataSourceServiceImpl();
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

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 250 and node_cpu_seconds_total{mode=\"idle\"} < 220");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
    }

    @Test
    void calculate16() {
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

        List<Map<String, Object>> result = dataSourceService.calculate("promql", "node_cpu_seconds_total{mode=\"user\"} > 50 and node_cpu_seconds_total{mode=\"idle\"} < 20");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
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
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
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
        assertEquals(1, result.size());
        assertNotNull(result.get(0).get("__value__"));
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
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
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
        assertEquals(1, result.size());
        assertNotNull(result.get(0).get("__value__"));
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
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
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
        expressionCache.invalidateAll();
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
}
