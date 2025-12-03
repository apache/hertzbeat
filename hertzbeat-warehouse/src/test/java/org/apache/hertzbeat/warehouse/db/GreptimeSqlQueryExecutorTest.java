/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

/**
 * Test case for {@link GreptimeSqlQueryExecutor}
 */
@ExtendWith(MockitoExtension.class)
class GreptimeSqlQueryExecutorTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;

    @BeforeEach
    void setUp() {
        // Use the constructor capable of dependency injection for mocking
        greptimeSqlQueryExecutor = new GreptimeSqlQueryExecutor(jdbcTemplate);
    }

    @Test
    void testExecuteSuccess() {
        // Mock successful response for queryForList
        List<Map<String, Object>> mockResult = new ArrayList<>();
        mockResult.add(Map.of("metric_name", "cpu", "value", 85.5));

        when(jdbcTemplate.queryForList(any(String.class))).thenReturn(mockResult);

        // Execute
        List<Map<String, Object>> result = greptimeSqlQueryExecutor.execute("SELECT * FROM metrics");

        // Verify
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("cpu", result.get(0).get("metric_name"));
        assertEquals(85.5, result.get(0).get("value"));
    }

    @Test
    void testExecuteError() {
        // Mock error response
        when(jdbcTemplate.queryForList(any(String.class))).thenThrow(new RuntimeException("Connection error"));

        // Execute and verify exception
        assertThrows(RuntimeException.class, () -> greptimeSqlQueryExecutor.execute("SELECT * FROM metrics"));
    }

    @Test
    void testQuerySuccess() {
        // Mock success response for query (using RowMapper)
        List<LogEntry> mockLogs = List.of(LogEntry.builder().traceId("123").build());
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), any(Object[].class)))
                .thenReturn(mockLogs);

        // Execute
        List<LogEntry> result = greptimeSqlQueryExecutor.query("SELECT * FROM logs WHERE id = ?", 1);

        // Verify
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("123", result.get(0).getTraceId());

        // Verify args passed
        verify(jdbcTemplate).query(eq("SELECT * FROM logs WHERE id = ?"), any(RowMapper.class), eq(1));
    }

    @Test
    void testCountSuccess() {
        // Mock success response for queryForObject (count)
        when(jdbcTemplate.queryForObject(any(String.class), eq(Long.class), any(Object[].class)))
                .thenReturn(10L);

        // Execute
        Long count = greptimeSqlQueryExecutor.count("SELECT COUNT(*) FROM logs");

        // Verify
        assertEquals(10L, count);
    }
}