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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * test case for {@link AlertExpressionEvalVisitor}
 */
class AlertExpressionEvalVisitorTest {

    private QueryExecutor mockExecutor;

    @BeforeEach
    void setUp() {
        mockExecutor = Mockito.mock(QueryExecutor.class);
    }

    @Test
    void testGreaterThan() {
        when(mockExecutor.execute("cpu")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 80.0))));
        when(mockExecutor.execute("select cpu from cpu_table where id = 1")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 80.0))));
        // promql
        List<Map<String, Object>> result = evaluate("cpu > 70");
        assertEquals(1, result.size());
        assertEquals(80.0, result.get(0).get("__value__"));
        //sql
        result = evaluate("(select cpu from cpu_table where id = 1) > 70");
        assertEquals(1, result.size());
        assertEquals(80.0, result.get(0).get("__value__"));
    }

    @Test
    void testGreaterThanWithInteger() {
        when(mockExecutor.execute("cpu")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 80))));
        when(mockExecutor.execute("select cpu_usage from system_metrics where host = 'server1'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 80))));
        // promql
        List<Map<String, Object>> result = evaluate("cpu > 70");
        assertEquals(1, result.size());
        assertEquals(80, result.get(0).get("__value__"));
        // sql
        result = evaluate("(select cpu_usage from system_metrics where host = 'server1') > 70");
        assertEquals(1, result.size());
        assertEquals(80, result.get(0).get("__value__"));
    }

    @Test
    void testLessThan() {
        when(mockExecutor.execute("memory")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 65.0))));
        when(mockExecutor.execute("select memory_usage from memory_table where instance = 'web1'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 65.0))));
        // promql
        List<Map<String, Object>> result = evaluate("memory < 70");
        assertEquals(1, result.size());
        assertEquals(65.0, result.get(0).get("__value__"));
        // sql
        result = evaluate("(select memory_usage from memory_table where instance = 'web1') < 70");
        assertEquals(1, result.size());
        assertEquals(65.0, result.get(0).get("__value__"));
    }

    @Test
    void testEqualWithTolerance() {
        when(mockExecutor.execute("disk")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 99.999))));
        when(mockExecutor.execute("select disk_usage from storage_metrics where partition = '/'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 99.999))));
        // promql
        List<Map<String, Object>> result = evaluate("disk == 100");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
        // sql
        result = evaluate("(select disk_usage from storage_metrics where partition = '/') == 100");
        assertEquals(1, result.size());
        assertNull(result.get(0).get("__value__"));
    }

    @Test
    void testNotEqual() {
        when(mockExecutor.execute("network")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 50.0))));
        when(mockExecutor.execute("select bandwidth from network_stats where interface = 'eth0'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 50.0))));
        // promql
        List<Map<String, Object>> result = evaluate("network != 60");
        assertEquals(1, result.size());
        assertEquals(50.0, result.get(0).get("__value__"));
        // sql
        result = evaluate("(select bandwidth from network_stats where interface = 'eth0') != 60");
        assertEquals(1, result.size());
        assertEquals(50.0, result.get(0).get("__value__"));
    }

    @Test
    void testExactlyEqual() {
        when(mockExecutor.execute("threshold")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 100.0))));
        when(mockExecutor.execute("select alert_threshold from alert_config where rule_id = 'cpu_high'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 100.0))));
        // promql
        List<Map<String, Object>> result = evaluate("threshold == 100");
        assertEquals(1, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
        // sql
        result = evaluate("(select alert_threshold from alert_config where rule_id = 'cpu_high') == 100");
        assertEquals(1, result.size());
        assertEquals(100.0, result.get(0).get("__value__"));
    }

    @Test
    void testMaxValueBoundary() {
        when(mockExecutor.execute("max_val")).thenReturn(List.of(new HashMap<>(Map.of("__value__", Double.MAX_VALUE))));
        when(mockExecutor.execute("select max_value from boundary_test where test_case = 'extreme'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", Double.MAX_VALUE))));
        // promql
        List<Map<String, Object>> result = evaluate("max_val > 100");
        assertEquals(1, result.size());
        assertEquals(Double.MAX_VALUE, result.get(0).get("__value__"));
        // sql
        result = evaluate("(select max_value from boundary_test where test_case = 'extreme') > 100");
        assertEquals(1, result.size());
        assertEquals(Double.MAX_VALUE, result.get(0).get("__value__"));
    }

    @Test
    void testMinValueBoundary() {
        when(mockExecutor.execute("min_val")).thenReturn(List.of(new HashMap<>(Map.of("__value__", Double.MIN_VALUE))));
        when(mockExecutor.execute("select min_value from boundary_test where test_case = 'minimal'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", Double.MIN_VALUE))));
        // promql
        List<Map<String, Object>> result = evaluate("min_val > 0");
        assertEquals(1, result.size());
        assertEquals(Double.MIN_VALUE, result.get(0).get("__value__"));
        // sql
        result = evaluate("(select min_value from boundary_test where test_case = 'minimal') > 0");
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
        when(mockExecutor.execute("multi_val")).thenReturn(List.of(new HashMap<>(Map.of("__value__", List.of(10.0, 20.0, 30.0)))));
        when(mockExecutor.execute("select values from multi_metrics where group_id = 'test_group'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", List.of(10.0, 20.0, 30.0)))));
        // promql
        List<Map<String, Object>> result = evaluate("multi_val > 25");
        assertEquals(0, result.size());
        // sql
        result = evaluate("(select values from multi_metrics where group_id = 'test_group') > 25");
        assertEquals(0, result.size());
    }

    @Test
    void testListValueWithMin() {
        when(mockExecutor.execute("multi_val")).thenReturn(List.of(new HashMap<>(Map.of("__value__", List.of(10.0, 20.0, 30.0)))));
        when(mockExecutor.execute("select response_times from performance_data where service = 'api'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", List.of(10.0, 20.0, 30.0)))));
        // promql
        List<Map<String, Object>> result = evaluate("multi_val < 15");
        assertEquals(0, result.size());
        // sql
        result = evaluate("(select response_times from performance_data where service = 'api') < 15");
        assertEquals(0, result.size());
    }

    @Test
    void testEmptyListValue() {
        when(mockExecutor.execute("empty_list")).thenReturn(List.of(new HashMap<>(Map.of("__value__", List.of()))));
        when(mockExecutor.execute("select error_codes from error_log where date = '2024-01-01'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", List.of()))));
        // promql
        List<Map<String, Object>> result = evaluate("empty_list > 50");
        assertEquals(0, result.size());
        // sql
        result = evaluate("(select error_codes from error_log where date = '2024-01-01') > 50");
        assertEquals(0, result.size());
    }

    @Test
    void testNestedParentheses() {
        when(mockExecutor.execute("a")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 10.0))));
        when(mockExecutor.execute("b")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 20.0))));
        when(mockExecutor.execute("c")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 30.0))));
        when(mockExecutor.execute("select cpu from server_a where region = 'us-east'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 10.0))));
        when(mockExecutor.execute("select memory from server_b where region = 'us-west'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 20.0))));
        when(mockExecutor.execute("select disk from server_c where region = 'eu-central'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 30.0))));
        // promql
        List<Map<String, Object>> result = evaluate("(a > 5) and (b > 15 or c < 25)");
        assertEquals(1, result.size());
        assertEquals(10.0, result.get(0).get("__value__"));
        // sql
        result = evaluate("((select cpu from server_a where region = 'us-east') > 5)"
                + " and ((select memory from server_b where region = 'us-west') > 15"
                + " or (select disk from server_c where region = 'eu-central') < 25)");
        assertEquals(1, result.size());
        assertEquals(10.0, result.get(0).get("__value__"));
    }

    @Test
    void testUnlessOpPromql() {
        String promql = "http_server_requests_seconds_count > 10 unless http_server_requests_seconds_max > 0";

        Map<String, Object> countValue1 = new HashMap<>() {
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
        };

        Map<String, Object> maxValue1 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 10.007799125);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_max");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/actuator/health");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        when(mockExecutor.execute("http_server_requests_seconds_count")).thenReturn(List.of(countValue1));
        when(mockExecutor.execute("http_server_requests_seconds_max")).thenReturn(List.of(maxValue1));
        List<Map<String, Object>> result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(1307, result.get(0).get("__value__"));

        maxValue1.put("uri", "/actuator/prometheus");
        result = evaluate(promql);
        assertEquals(0, result.size());

        Map<String, Object> sumValue1 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 20.018);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_sum");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/**");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        maxValue1.put("uri", "/actuator/health");
        when(mockExecutor.execute("http_server_requests_seconds_sum")).thenReturn(List.of(sumValue1));
        promql = "(http_server_requests_seconds_count > 10 unless http_server_requests_seconds_max > 0) unless http_server_requests_seconds_sum > 10";
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(1307, result.get(0).get("__value__"));
    }

    @Test
    void testOrOpPromql() {
        String promql = "http_server_requests_seconds_count > 10 or jvm_threads_states_threads > 0";

        Map<String, Object> countValue1 = new HashMap<>() {
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
        };

        Map<String, Object> countValue2 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 16);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/**");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        Map<String, Object> countValue3 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 7);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/actuator/health");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        Map<String, Object> threadsValue1 = new HashMap<>() {
            {
                put("instance", "host.docker.internal:8989");
                put("__value__", 10.007799125);
                put("__name__", "jvm_threads_states_threads");
                put("__timestamp__", "1.750320922467E9");
                put("job", "spring-boot-app");
                put("state=", "runnable");
            }
        };

        Map<String, Object> threadsValue2 = new HashMap<>() {
            {
                put("instance", "host.docker.internal:8989");
                put("__value__", 1);
                put("__name__", "jvm_threads_states_threads");
                put("__timestamp__", "1.750320922467E9");
                put("job", "spring-boot-app");
                put("state=", "timed-waiting");
            }
        };

        Map<String, Object> threadsValue3 = new HashMap<>() {
            {
                put("instance", "host.docker.internal:8989");
                put("__value__", 19.02);
                put("__name__", "jvm_threads_states_threads");
                put("__timestamp__", "1.750320922467E9");
                put("job", "spring-boot-app");
                put("state=", "waiting");
            }
        };

        when(mockExecutor.execute("http_server_requests_seconds_count")).thenReturn(List.of(countValue1, countValue2, countValue3));
        when(mockExecutor.execute("jvm_threads_states_threads")).thenReturn(List.of(threadsValue1, threadsValue2, threadsValue3));
        List<Map<String, Object>> result = evaluate(promql);
        assertEquals(5, result.size());
        assertTrue(result.stream().allMatch(t -> null != t.get("__value__")));


        when(mockExecutor.execute("jvm_threads_states_threads")).thenReturn(new ArrayList<>());
        result = evaluate(promql);
        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(t -> null != t.get("__value__")));
        assertEquals(1307, result.get(0).get("__value__"));

        when(mockExecutor.execute("http_server_requests_seconds_count")).thenReturn(new ArrayList<>());
        when(mockExecutor.execute("jvm_threads_states_threads")).thenReturn(List.of(threadsValue1, threadsValue2, threadsValue3));
        result = evaluate(promql);
        assertEquals(3, result.size());
        assertTrue(result.stream().allMatch(t -> null != t.get("__value__")));
        assertEquals(10.007799125, result.get(0).get("__value__"));
    }

    @Test
    void testMultipleUnlessConditions() {
        when(mockExecutor.execute("metric1")).thenReturn(List.of(new HashMap<>(Map.of("job", "api", "__value__", 40.0))));
        when(mockExecutor.execute("metric2")).thenReturn(List.of(new HashMap<>(Map.of("job", "web", "__value__", 50.0))));
        when(mockExecutor.execute("metric3")).thenReturn(List.of(new HashMap<>(Map.of("job", "api", "__value__", 60.0))));
        when(mockExecutor.execute("select cpu_usage from metrics where service = 'web'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 40.0))));
        when(mockExecutor.execute("select memory_usage from metrics where service = 'db'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 50.0))));
        when(mockExecutor.execute("select disk_usage from metrics where service = 'cache'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 60.0))));
        // promql
        List<Map<String, Object>> result = evaluate("(metric1 > 30 unless metric2 > 45) unless metric3 > 50");
        assertEquals(0, result.size());
        // sql
        result = evaluate("((select cpu_usage from metrics where service = 'web') > 30"
                + " unless (select memory_usage from metrics where service = 'db') > 55)"
                + " unless (select disk_usage from metrics where service = 'cache') > 50");
        assertEquals(0, result.size());
    }

    @Test
    void testComplexExpressionWithMixedOperators() {
        when(mockExecutor.execute("cpu_temp")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 75.0))));
        when(mockExecutor.execute("gpu_temp")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 85.0))));
        when(mockExecutor.execute("fan_speed")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 2000.0))));
        when(mockExecutor.execute("select cpu_temperature from hardware_metrics where component = 'cpu'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 75.0))));
        when(mockExecutor.execute("select gpu_temperature from hardware_metrics where component = 'gpu'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 85.0))));
        when(mockExecutor.execute("select fan_rpm from hardware_metrics where component = 'fan'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 2000.0))));

        // promql
        List<Map<String, Object>> result = evaluate("(cpu_temp > 70 and gpu_temp < 90) or fan_speed > 1500");
        assertEquals(1, result.size());
        assertEquals(75.0, result.get(0).get("__value__"));
        // sql
        result = evaluate("((select cpu_temperature from hardware_metrics where component = 'cpu') > 70"
                + " and (select gpu_temperature from hardware_metrics where component = 'gpu') < 90)"
                + " or (select fan_rpm from hardware_metrics where component = 'fan') > 1500");
        assertEquals(1, result.size());
        assertEquals(75.0, result.get(0).get("__value__"));
    }

    @Test
    void testSqlAggregateCount() {
        when(mockExecutor.execute("select count(*) from cpu_metrics where host = 'server1'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 150))));
        List<Map<String, Object>> result = evaluate("(select count(*) from cpu_metrics where host = 'server1') > 100");
        assertEquals(1, result.size());
        assertEquals(150, result.get(0).get("__value__"));
    }

    @Test
    void testSqlAggregateAvg() {
        when(mockExecutor.execute("select avg(cpu_usage) from system_metrics where region = 'us-east'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 75.5))));
        List<Map<String, Object>> result = evaluate("(select avg(cpu_usage) from system_metrics where region = 'us-east') > 70");
        assertEquals(1, result.size());
        assertEquals(75.5, result.get(0).get("__value__"));
    }

    @Test
    void testSqlAggregateSum() {
        when(mockExecutor.execute("select sum(memory_used) from memory_stats where service = 'web'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 2048.0))));
        List<Map<String, Object>> result = evaluate("(select sum(memory_used) from memory_stats where service = 'web') < 3000");
        assertEquals(1, result.size());
        assertEquals(2048.0, result.get(0).get("__value__"));
    }

    @Test
    void testSqlAggregateMaxMin() {
        when(mockExecutor.execute("select max(response_time) from api_metrics where endpoint = '/api/users'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 250.0))));
        when(mockExecutor.execute("select min(response_time) from api_metrics where endpoint = '/api/users'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 50.0))));

        List<Map<String, Object>> result = evaluate("(select max(response_time) from api_metrics where endpoint = '/api/users') > 200");
        assertEquals(1, result.size());
        assertEquals(250.0, result.get(0).get("__value__"));

        result = evaluate("(select min(response_time) from api_metrics where endpoint = '/api/users') < 100");
        assertEquals(1, result.size());
        assertEquals(50.0, result.get(0).get("__value__"));
    }

    @Test
    void testSqlGroupBy() {
        when(mockExecutor.execute("select avg(cpu_usage) from system_metrics where timestamp > '2024-01-01' group by host")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 80.5))));
        List<Map<String, Object>> result = evaluate("(select avg(cpu_usage) from system_metrics where timestamp > '2024-01-01' group by host) > 75");
        assertEquals(1, result.size());
        assertEquals(80.5, result.get(0).get("__value__"));
    }

    @Test
    void testSqlGroupByHaving() {
        when(mockExecutor.execute("select count(*) from error_logs where level = 'ERROR' group by service having count(*) > 10")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 25))));
        List<Map<String, Object>> result = evaluate("(select count(*) from error_logs where level = 'ERROR' group by service having count(*) > 10) > 20");
        assertEquals(1, result.size());
        assertEquals(25, result.get(0).get("__value__"));
    }

    @Test
    void testSqlOrderByLimit() {
        when(mockExecutor.execute("select cpu_usage from system_metrics where host like 'web%' order by cpu_usage desc limit 1")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 95.2))));
        List<Map<String, Object>> result = evaluate("(select cpu_usage from system_metrics where host like 'web%' order by cpu_usage desc limit 1) > 90");
        assertEquals(1, result.size());
        assertEquals(95.2, result.get(0).get("__value__"));
    }

    @Test
    void testSqlMultipleColumns() {
        when(mockExecutor.execute("select avg(cpu_usage), max(memory_usage) from system_metrics where region = 'us-west'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 65.8))));
        List<Map<String, Object>> result = evaluate("(select avg(cpu_usage), max(memory_usage) from system_metrics where region = 'us-west') < 70");
        assertEquals(1, result.size());
        assertEquals(65.8, result.get(0).get("__value__"));
    }

    @Test
    void testSqlSubquery() {
        when(mockExecutor.execute("select avg(cpu_usage) from system_metrics where host in (select host from active_servers where status = 'running')")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 72.3))));
        List<Map<String, Object>> result = evaluate("(select avg(cpu_usage) from system_metrics where host in (select host from active_servers where status = 'running')) > 70");
        assertEquals(1, result.size());
        assertEquals(72.3, result.get(0).get("__value__"));
    }

    @Test
    void testSqlComplexSubquery() {
        when(mockExecutor.execute("select count(*) from alerts where severity = 'HIGH' and service_id in (select id from services where category = 'critical')")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 8))));
        List<Map<String, Object>> result = evaluate("(select count(*) from alerts where severity = 'HIGH' and service_id in (select id from services where category = 'critical')) >= 5");
        assertEquals(1, result.size());
        assertEquals(8, result.get(0).get("__value__"));
    }

    @Test
    void testSqlWithJoins() {
        when(mockExecutor.execute("select avg(m.cpu_usage) from metrics m, servers s where m.server_id = s.id and s.environment = 'production'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 78.9))));
        List<Map<String, Object>> result = evaluate("(select avg(m.cpu_usage) from metrics m, servers s where m.server_id = s.id and s.environment = 'production') < 80");
        assertEquals(1, result.size());
        assertEquals(78.9, result.get(0).get("__value__"));
    }

    @Test
    void testSqlBetweenCondition() {
        when(mockExecutor.execute("select count(*) from performance_logs where response_time between 100 and 500")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 1200))));
        List<Map<String, Object>> result = evaluate("(select count(*) from performance_logs where response_time between 100 and 500) > 1000");
        assertEquals(1, result.size());
        assertEquals(1200, result.get(0).get("__value__"));
    }

    @Test
    void testSqlComplexGroupByOrderBy() {
        when(mockExecutor.execute("select service, avg(response_time) from api_metrics where timestamp > '2024-01-01'"
                + " group by service order by avg(response_time) desc limit 5")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 180.5))));
        List<Map<String, Object>> result = evaluate("(select service, avg(response_time) from api_metrics where timestamp > '2024-01-01'"
                + " group by service order by avg(response_time) desc limit 5) > 150");
        assertEquals(1, result.size());
        assertEquals(180.5, result.get(0).get("__value__"));
    }

    @Test
    void testSqlVarianceStddev() {
        when(mockExecutor.execute("select stddev(cpu_usage) from system_metrics where host = 'db-server' and timestamp > '2024-01-01'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 12.5))));
        List<Map<String, Object>> result = evaluate("(select stddev(cpu_usage) from system_metrics where host = 'db-server' and timestamp > '2024-01-01') < 15");
        assertEquals(1, result.size());
        assertEquals(12.5, result.get(0).get("__value__"));
    }

    @Test
    void testSqlNestedAggregation() {
        when(mockExecutor.execute("select max(daily_avg) from (select date, avg(cpu_usage) as daily_avg from system_metrics group by date) as daily_stats")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 88.7))));
        List<Map<String, Object>> result = evaluate("(select max(daily_avg) from (select date, avg(cpu_usage) as daily_avg from system_metrics group by date) as daily_stats) > 85");
        assertEquals(1, result.size());
        assertEquals(88.7, result.get(0).get("__value__"));
    }

    @Test
    void testSqlComplexWhereConditions() {
        when(mockExecutor.execute("select count(*) from alerts where (severity = 'HIGH' or severity = 'CRITICAL') and status = 'ACTIVE' and created_at > '2024-01-01'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 42))));
        List<Map<String, Object>> result = evaluate("(select count(*) from alerts where (severity = 'HIGH' or severity = 'CRITICAL') and status = 'ACTIVE' and created_at > '2024-01-01') != 50");
        assertEquals(1, result.size());
        assertEquals(42, result.get(0).get("__value__"));
    }

    @Test
    void testSqlWithNullChecks() {
        when(mockExecutor.execute("select count(*) from system_metrics where cpu_usage is not null and memory_usage is not null")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 9876))));
        List<Map<String, Object>> result = evaluate("(select count(*) from system_metrics where cpu_usage is not null and memory_usage is not null) > 9000");
        assertEquals(1, result.size());
        assertEquals(9876, result.get(0).get("__value__"));
    }

    @Test
    void testSqlMultipleAggregatesWithAlias() {
        when(mockExecutor.execute("select max(cpu_usage) as max_cpu, min(cpu_usage) as min_cpu, avg(cpu_usage) as avg_cpu from system_metrics where region = 'asia'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 92.1))));
        List<Map<String, Object>> result = evaluate("(select max(cpu_usage) as max_cpu, min(cpu_usage) as min_cpu, avg(cpu_usage) as avg_cpu from system_metrics where region = 'asia') > 90");
        assertEquals(1, result.size());
        assertEquals(92.1, result.get(0).get("__value__"));
    }

    @Test
    void testSqlAndPromqlCallExpr() {
        when(mockExecutor.execute("sum(rate(http_requests_total{job='your-service'}[1m]))")).thenReturn(List.of(new HashMap<>(Map.of("__value__", 80))));
        when(mockExecutor.execute("select cpu_usage from system_metrics where host = 'server1'")).thenReturn(
                List.of(new HashMap<>(Map.of("__value__", 80))));
        // promql
        List<Map<String, Object>> result = evaluate("promql(\"sum(rate(http_requests_total{job='your-service'}[1m]))\") > 70");
        assertEquals(1, result.size());
        assertEquals(80, result.get(0).get("__value__"));
        // sql
        result = evaluate("sql(\"select cpu_usage from system_metrics where host = 'server1'\") > 70");
        assertEquals(1, result.size());
        assertEquals(80, result.get(0).get("__value__"));
    }

    @Test
    void testAndOpPromql() {
        String promql = "http_server_requests_seconds_count > 10 and http_server_requests_seconds_max > 5";

        Map<String, Object> countValue1 = new HashMap<>() {
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
        };

        Map<String, Object> countValue2 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 16);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/**");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        Map<String, Object> countValue3 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 7);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/actuator/health");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        Map<String, Object> maxValue1 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 10.007799125);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_max");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/actuator/prometheus");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        Map<String, Object> maxValue2 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 10);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/**");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        Map<String, Object> maxValue3 = new HashMap<>() {
            {
                put("exception", "none");
                put("instance", "host.docker.internal:8989");
                put("__value__", 0);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("error", "none");
                put("job", "spring-boot-app");
                put("uri", "/actuator/health");
                put("outcome", "SUCCESS");
                put("status", "200");
            }
        };

        when(mockExecutor.execute("http_server_requests_seconds_count")).thenReturn(List.of(countValue1, countValue2, countValue3));
        when(mockExecutor.execute("http_server_requests_seconds_max")).thenReturn(List.of(maxValue1, maxValue2, maxValue3));
        List<Map<String, Object>> result = evaluate(promql);
        assertEquals(2, result.size());
        assertEquals(1307, result.get(0).get("__value__"));
        assertEquals(16, result.get(1).get("__value__"));
    }

    @Test
    void testComparisonExpr() {
        String promql = "3 > bool 2";

        // scalar and scalar
        List<Map<String, Object>> result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(1, result.get(0).get("__value__"));

        // scalar and vector
        promql = "0 < http_server_requests_seconds_count";
        Map<String, Object> vector = new HashMap<>() {
            {
                put("instance", "host.docker.internal:8989");
                put("__value__", 1307);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("uri", "/actuator/prometheus");
                put("status", "200");
            }
        };
        when(mockExecutor.execute("http_server_requests_seconds_count")).thenReturn(List.of(vector));
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(1307, result.get(0).get("__value__"));

        // scalar and vector bool
        promql = "0 < bool http_server_requests_seconds_count";
        // true
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(1, result.get(0).get("__value__"));

        // false
        vector.put("__value__", -1);
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(0, result.get(0).get("__value__"));

        // vector and scalar
        promql = "http_server_requests_seconds_sum > 0";
        vector = new HashMap<>() {
            {
                put("instance", "host.docker.internal:8989");
                put("__value__", 13);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("uri", "/actuator/prometheus");
                put("status", "200");
            }
        };
        when(mockExecutor.execute("http_server_requests_seconds_sum")).thenReturn(List.of(vector));
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(13, result.get(0).get("__value__"));

        // vector and scalar bool
        promql = "http_server_requests_seconds_sum > bool 0";
        // true
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(1, result.get(0).get("__value__"));
        // false
        vector.put("__value__", -1);
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(0, result.get(0).get("__value__"));

        // vector and vector
        promql = "http_server_requests_seconds_count > http_server_requests_seconds_sum";
        Map<String, Object> vectorCount = new HashMap<>() {
            {
                put("instance", "host.docker.internal:8989");
                put("__value__", 13);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("uri", "/actuator/prometheus");
                put("status", "200");
            }
        };
        Map<String, Object> vectorSum = new HashMap<>() {
            {
                put("instance", "host.docker.internal:8989");
                put("__value__", 10);
                put("method", "GET");
                put("__name__", "http_server_requests_seconds_count");
                put("__timestamp__", "1.750320922467E9");
                put("uri", "/actuator/prometheus");
                put("status", "200");
            }
        };
        when(mockExecutor.execute("http_server_requests_seconds_count")).thenReturn(List.of(vectorCount));
        when(mockExecutor.execute("http_server_requests_seconds_sum")).thenReturn(List.of(vectorSum));
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(13, result.get(0).get("__value__"));

        // vector and vector bool
        promql = "http_server_requests_seconds_count > bool http_server_requests_seconds_sum";
        // true
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(1, result.get(0).get("__value__"));
        // false
        vectorCount.put("__value__", 1);
        result = evaluate(promql);
        assertEquals(1, result.size());
        assertEquals(0, result.get(0).get("__value__"));
    }

    private List<Map<String, Object>> evaluate(String expression) {
        AlertExpressionLexer lexer = new AlertExpressionLexer(CharStreams.fromString(expression));
        CommonTokenStream tokens = new CommonTokenStream(lexer);
        AlertExpressionParser parser = new AlertExpressionParser(tokens);
        return new AlertExpressionEvalVisitor(mockExecutor, tokens).visit(parser.expression());
    }
}