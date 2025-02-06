package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.util.HashMap;
import org.apache.hertzbeat.alert.service.impl.DataSourceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import org.mockito.Mockito;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;

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
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
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
        assertEquals(2, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        assertNull(result.get(1).get("__value__"));
    }
}
