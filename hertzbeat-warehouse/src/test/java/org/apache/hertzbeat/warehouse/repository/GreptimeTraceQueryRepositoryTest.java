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

package org.apache.hertzbeat.warehouse.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeTraceQueryRepositoryTest {

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider;

    @Mock
    private GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;

    @Mock
    private GreptimeProperties greptimeProperties;

    @Mock
    private RestTemplate restTemplate;

    private GreptimeTraceQueryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new GreptimeTraceQueryRepository(greptimeSqlQueryExecutorProvider, greptimeProperties, restTemplate);
    }

    @Test
    void queryRecentTraceRowsUsesSqlExecutorWhenAvailable() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(20);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        assertEquals("trace-1", rows.getFirst().get("trace_id"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        assertTraceSqlProjectsAttribution(sqlCaptor.getValue());
        assertTrue(sqlCaptor.getValue().endsWith("FROM hzb_traces ORDER BY timestamp DESC LIMIT 20"));
    }

    @Test
    void queryRecentTraceRowsPushesServiceAndInternalFiltersIntoNarrowSql() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        List<Map<String, Object>> rows = repository.queryRecentTraceRows(30, "recommendation", true);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        assertTraceSqlProjectsAttribution(sqlCaptor.getValue());
        assertTrue(sqlCaptor.getValue().endsWith("FROM hzb_traces WHERE service_name = 'recommendation' "
                + "AND LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat') ORDER BY timestamp DESC LIMIT 30"));
    }

    @Test
    void queryTraceRowsFallsBackToGreptimeHttpWhenExecutorUnavailable() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(null);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(greptimeProperties.username()).thenReturn("greptime");
        when(greptimeProperties.password()).thenReturn("greptime");
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(new ResponseEntity<>(sqlResponse(), HttpStatus.OK));

        List<Map<String, Object>> rows = repository.queryTraceRows("trace-'1", 5);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        assertEquals("trace-1", rows.getFirst().get("trace_id"));

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(urlCaptor.capture(), eq(HttpMethod.POST), entityCaptor.capture(), eq(GreptimeSqlQueryContent.class));
        assertEquals("http://127.0.0.1:4000/v1/sql?db=public", urlCaptor.getValue());
        String requestBody = entityCaptor.getValue().getBody().toString();
        assertTrue(requestBody.startsWith("sql="));
        String sql = URLDecoder.decode(requestBody.substring("sql=".length()), StandardCharsets.UTF_8);
        assertTraceSqlProjectsAttribution(sql);
        assertTrue(sql.endsWith("FROM hzb_traces WHERE trace_id = 'trace-''1' ORDER BY timestamp ASC LIMIT 5"));
    }

    @Test
    void queryTraceRowsSelectsFlattenedOtlpColumnsForEntityAttribution() {
        when(greptimeSqlQueryExecutorProvider.getIfAvailable()).thenReturn(greptimeSqlQueryExecutor);
        when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(List.of(Map.of("trace_id", "trace-1")));

        repository.queryTraceRows("trace-1", 5);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTraceSqlProjectsAttribution(sql);
    }

    private void assertTraceSqlProjectsAttribution(String sql) {
        assertTrue(sql.startsWith("SELECT * FROM hzb_traces"));
        assertTrue(sql.contains("ORDER BY timestamp"));
    }

    private GreptimeSqlQueryContent sqlResponse() {
        List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columnSchemas = new ArrayList<>();
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("trace_id", "String"));
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("span_id", "String"));

        GreptimeSqlQueryContent.Output.Records.Schema schema =
                new GreptimeSqlQueryContent.Output.Records.Schema();
        schema.setColumnSchemas(columnSchemas);

        GreptimeSqlQueryContent.Output.Records records =
                new GreptimeSqlQueryContent.Output.Records();
        records.setSchema(schema);
        records.setRows(List.of(List.of("trace-1", "span-1")));

        GreptimeSqlQueryContent.Output output = new GreptimeSqlQueryContent.Output();
        output.setRecords(records);

        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setOutput(List.of(output));
        return response;
    }
}
