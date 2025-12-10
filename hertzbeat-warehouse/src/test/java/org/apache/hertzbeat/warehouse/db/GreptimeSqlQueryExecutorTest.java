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

package org.apache.hertzbeat.warehouse.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link GreptimeSqlQueryExecutor}
 */
@ExtendWith(MockitoExtension.class)
class GreptimeSqlQueryExecutorTest {

    @Mock
    private GreptimeProperties greptimeProperties;

    @Mock
    private RestTemplate restTemplate;

    private GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;

    @BeforeEach
    void setUp() {
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(greptimeProperties.database()).thenReturn("hertzbeat");
        when(greptimeProperties.username()).thenReturn("username");
        when(greptimeProperties.password()).thenReturn("password");

        greptimeSqlQueryExecutor = new GreptimeSqlQueryExecutor(greptimeProperties, restTemplate);
    }

    @Test
    void testExecuteSuccess() {
        // Mock successful response
        GreptimeSqlQueryContent mockResponse = createMockResponse();
        ResponseEntity<GreptimeSqlQueryContent> responseEntity =
            new ResponseEntity<>(mockResponse, HttpStatus.OK);

        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

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
        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenThrow(new RuntimeException("Connection error"));

        // Execute
        assertThrows(RuntimeException.class, () -> greptimeSqlQueryExecutor.execute("SELECT * FROM metrics"));
    }

    private GreptimeSqlQueryContent createMockResponse() {
        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setCode(0);

        // Create simple schema
        List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columnSchemas = new ArrayList<>();
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("metric_name", "String"));
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("value", "Float64"));

        GreptimeSqlQueryContent.Output.Records.Schema schema =
            new GreptimeSqlQueryContent.Output.Records.Schema();
        schema.setColumnSchemas(columnSchemas);

        // Create simple row
        List<List<Object>> rows = new ArrayList<>();
        rows.add(List.of("cpu", 85.5));

        // Build response structure
        GreptimeSqlQueryContent.Output.Records records =
            new GreptimeSqlQueryContent.Output.Records();
        records.setSchema(schema);
        records.setRows(rows);

        GreptimeSqlQueryContent.Output output = new GreptimeSqlQueryContent.Output();
        output.setRecords(records);

        response.setOutput(List.of(output));
        return response;
    }
}
