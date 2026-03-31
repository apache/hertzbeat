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

import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.PROMQL;
import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.RANGE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.VictoriaMetricsClusterProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.VictoriaMetricsInsertProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.VictoriaMetricsSelectProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link VictoriaMetricsClusterQueryExecutor}
 */
@ExtendWith(MockitoExtension.class)
class VictoriaMetricsClusterQueryExecutorTest {

    @Mock
    private RestTemplate restTemplate;

    private VictoriaMetricsClusterQueryExecutor queryExecutor;

    @BeforeEach
    void setUp() {
        VictoriaMetricsClusterProperties properties = new VictoriaMetricsClusterProperties(
            true,
            "42",
            new VictoriaMetricsInsertProperties("http://vm-insert:8480", "insert-user", "insert-pass", 1000, 3),
            new VictoriaMetricsSelectProperties("http://vm-select:8481", "select-user", "select-pass")
        );
        queryExecutor = new VictoriaMetricsClusterQueryExecutor(properties, restTemplate);
    }

    @Test
    void testGetDatasource() {
        assertEquals("VictoriaMetricsCluster", queryExecutor.getDatasource());
    }

    @Test
    void testExecuteSuccess() {
        PromQlQueryContent mockResponse = createInstantResponse();
        ResponseEntity<PromQlQueryContent> responseEntity = new ResponseEntity<>(mockResponse, HttpStatus.OK);
        when(restTemplate.exchange(
            any(URI.class),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(PromQlQueryContent.class)
        )).thenReturn(responseEntity);

        List<Map<String, Object>> result = queryExecutor.execute("up");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("cpu_usage", result.getFirst().get("__name__"));
        assertEquals("server1", result.getFirst().get("instance"));
        assertEquals(1712300000.0d, result.getFirst().get("__timestamp__"));
        assertEquals("85.5", result.getFirst().get("__value__"));

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).exchange(
            uriCaptor.capture(),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(PromQlQueryContent.class)
        );
        assertEquals("http", uriCaptor.getValue().getScheme());
        assertEquals("vm-select", uriCaptor.getValue().getHost());
        assertEquals(8481, uriCaptor.getValue().getPort());
        assertEquals("/select/42/prometheus/api/v1/query", uriCaptor.getValue().getPath());
        assertTrue(uriCaptor.getValue().getQuery().contains("query=up"));
    }

    @Test
    void testExecuteErrorReturnsEmptyResult() {
        when(restTemplate.exchange(
            any(URI.class),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(PromQlQueryContent.class)
        )).thenThrow(new RuntimeException("Connection error"));

        List<Map<String, Object>> result = queryExecutor.execute("up");

        assertNotNull(result);
        assertEquals(0, result.size());
    }

    @Test
    void testQueryRangeSuccess() {
        PromQlQueryContent mockResponse = createRangeResponse();
        ResponseEntity<PromQlQueryContent> responseEntity = new ResponseEntity<>(mockResponse, HttpStatus.OK);
        when(restTemplate.exchange(
            any(URI.class),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(PromQlQueryContent.class)
        )).thenReturn(responseEntity);

        DatasourceQuery datasourceQuery = DatasourceQuery.builder()
            .refId("A")
            .datasource(queryExecutor.getDatasource())
            .expr("avg_over_time(up[5m])")
            .exprType(PROMQL)
            .timeType(RANGE)
            .start(1712300000L)
            .end(1712300300L)
            .step("60s")
            .build();

        DatasourceQueryData result = queryExecutor.query(datasourceQuery);

        assertNotNull(result);
        assertEquals("A", result.getRefId());
        assertEquals(200, result.getStatus());
        assertNotNull(result.getFrames());
        assertEquals(1, result.getFrames().size());
        assertEquals("cpu_usage", result.getFrames().getFirst().getSchema().getLabels().get("__name__"));
        assertEquals("server1", result.getFrames().getFirst().getSchema().getLabels().get("instance"));
        assertEquals(1712300000000L, result.getFrames().getFirst().getData().get(0)[0]);
        assertEquals("85.5", result.getFrames().getFirst().getData().get(0)[1]);
        assertEquals(1712300060000L, result.getFrames().getFirst().getData().get(1)[0]);
        assertEquals("86.1", result.getFrames().getFirst().getData().get(1)[1]);

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).exchange(
            uriCaptor.capture(),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            eq(PromQlQueryContent.class)
        );
        assertEquals("/select/42/prometheus/api/v1/query_range", uriCaptor.getValue().getPath());
        assertTrue(uriCaptor.getValue().getQuery().contains("query=avg_over_time"));
        assertTrue(uriCaptor.getValue().getQuery().contains("start=1712300000"));
        assertTrue(uriCaptor.getValue().getQuery().contains("end=1712300300"));
        assertTrue(uriCaptor.getValue().getQuery().contains("step=60s"));
    }

    private PromQlQueryContent createInstantResponse() {
        PromQlQueryContent response = new PromQlQueryContent();
        PromQlQueryContent.ContentData data = new PromQlQueryContent.ContentData();
        PromQlQueryContent.ContentData.Content content = new PromQlQueryContent.ContentData.Content();

        content.setMetric(Map.of("__name__", "cpu_usage", "instance", "server1"));
        content.setValue(new Object[] {1712300000.0d, "85.5"});

        data.setResult(List.of(content));
        response.setData(data);
        return response;
    }

    private PromQlQueryContent createRangeResponse() {
        PromQlQueryContent response = new PromQlQueryContent();
        PromQlQueryContent.ContentData data = new PromQlQueryContent.ContentData();
        PromQlQueryContent.ContentData.Content content = new PromQlQueryContent.ContentData.Content();

        content.setMetric(Map.of("__name__", "cpu_usage", "instance", "server1"));
        content.setValues(List.of(
            new Object[] {1712300000L, "85.5"},
            new Object[] {1712300060L, "86.1"}
        ));

        data.setResult(List.of(content));
        response.setData(data);
        return response;
    }
}
