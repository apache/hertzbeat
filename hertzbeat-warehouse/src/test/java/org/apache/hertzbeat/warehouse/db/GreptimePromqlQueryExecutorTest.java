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
 * KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

/**
 * Test case for {@link GreptimePromqlQueryExecutor}.
 */
@ExtendWith(MockitoExtension.class)
class GreptimePromqlQueryExecutorTest {

    @Mock
    private GreptimeProperties greptimeProperties;

    @Mock
    private RestTemplate restTemplate;

    private GreptimePromqlQueryExecutor greptimePromqlQueryExecutor;
    private GreptimeQueryGuard queryGuard;

    @BeforeEach
    void setUp() {
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(greptimeProperties.username()).thenReturn("greptime");
        when(greptimeProperties.password()).thenReturn("greptime");
        when(greptimeProperties.database()).thenReturn("public");
        queryGuard = new GreptimeQueryGuard(2, Duration.ofSeconds(2), Duration.ofMillis(10));
        greptimePromqlQueryExecutor = new GreptimePromqlQueryExecutor(greptimeProperties, restTemplate, queryGuard);
    }

    @AfterEach
    void tearDown() {
        queryGuard.close();
    }

    @Test
    void distinguishesStructuredInvalidQueryFromUnclassifiedBadRequestAndTransport() {
        var query = DatasourceQuery.builder().refId("invalid-regex").expr("metric{label=~\"[\"}")
                .timeType("range").start(1000L).end(2000L).step("10s").build();
        var invalid = org.springframework.web.client.HttpClientErrorException.create(HttpStatus.BAD_REQUEST,
                "Bad Request", org.springframework.http.HttpHeaders.EMPTY,
                "{\"status\":\"error\",\"errorType\":\"InvalidArguments\",\"error\":\"private expression\"}"
                        .getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        var unknown = org.springframework.web.client.HttpClientErrorException.create(HttpStatus.BAD_REQUEST,
                "Bad Request", org.springframework.http.HttpHeaders.EMPTY,
                "{\"status\":\"error\",\"errorType\":\"Internal\"}".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(PromQlQueryContent.class)))
                .thenThrow(invalid).thenThrow(unknown).thenThrow(new ResourceAccessException("unreachable"));
        assertEquals("promql_query_invalid", greptimePromqlQueryExecutor.query(query).getMsg());
        assertFalse("promql_query_invalid".equals(greptimePromqlQueryExecutor.query(query).getMsg()));
        assertFalse("promql_query_invalid".equals(greptimePromqlQueryExecutor.query(query).getMsg()));
    }

    @Test
    void queryRangeNormalizesMillisecondTimestampsToSeconds() {
        PromQlQueryContent response = new PromQlQueryContent();
        PromQlQueryContent.ContentData data = new PromQlQueryContent.ContentData();
        PromQlQueryContent.ContentData.Content content = new PromQlQueryContent.ContentData.Content();
        content.setMetric(java.util.Map.of("__name__", "dotnet_assembly_count"));
        List<Object[]> values = new ArrayList<>();
        values.add(new Object[]{1_775_037_880.0d, "105"});
        content.setValues(values);
        data.setResult(List.of(content));
        response.setData(data);

        when(restTemplate.exchange(
                argThat((URI uri) -> uri.toString().contains("start=1775034288")
                        && uri.toString().contains("end=1775037888")
                        && uri.toString().contains("db=public")
                        && uri.toString().contains("/v1/prometheus/api/v1/query_range")),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(PromQlQueryContent.class)
        )).thenReturn(new ResponseEntity<>(response, HttpStatus.OK));

        DatasourceQuery query = DatasourceQuery.builder()
                .refId("metrics-console")
                .datasource("Greptime-promql")
                .expr("sum(dotnet_assembly_count{service_name=\"accounting\"})")
                .exprType("promql")
                .timeType("range")
                .start(1_775_034_288_092L)
                .end(1_775_037_888_092L)
                .step("30s")
                .limit(32)
                .build();

        DatasourceQueryData result = greptimePromqlQueryExecutor.query(query);

        assertEquals(200, result.getStatus());
        assertEquals(1, result.getFrames().size());
        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).exchange(
                uriCaptor.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(PromQlQueryContent.class));
        assertTrue(uriCaptor.getValue().getQuery().contains("limit=32"));
    }

    @Test
    void queryRangeWithLimitDoesNotDoubleEncodePromql() {
        PromQlQueryContent response = new PromQlQueryContent();
        PromQlQueryContent.ContentData data = new PromQlQueryContent.ContentData();
        data.setResult(List.of());
        response.setData(data);
        when(restTemplate.exchange(
                any(URI.class),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(PromQlQueryContent.class)
        )).thenReturn(new ResponseEntity<>(response, HttpStatus.OK));
        String promql = "sum by (service_name) (rate(http_server_requests_seconds_count{uri=\"/api/monitor\"}[5m]))";
        DatasourceQuery query = DatasourceQuery.builder()
                .refId("metrics-console")
                .datasource("Greptime-promql")
                .expr(promql)
                .exprType("promql")
                .timeType("range")
                .start(1_775_034_288_092L)
                .end(1_775_037_888_092L)
                .step("30s")
                .limit(32)
                .build();

        greptimePromqlQueryExecutor.query(query);

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).exchange(
                uriCaptor.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(PromQlQueryContent.class));
        URI queryUri = uriCaptor.getValue();
        assertFalse(queryUri.getRawQuery().contains("%25"));
        String decodedQuery = UriUtils.decode(queryUri.getRawQuery(), StandardCharsets.UTF_8);
        assertEquals(promql, UriComponentsBuilder.fromUriString("?" + decodedQuery).build()
                .getQueryParams().getFirst("query"));
    }

    @Test
    void strictAlertPreviewDoesNotConvertTransportFailureIntoEmptyData() {
        when(restTemplate.exchange(
                any(URI.class),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(PromQlQueryContent.class)
        )).thenThrow(new ResourceAccessException("preview backend unavailable"));

        assertTrue(greptimePromqlQueryExecutor.execute("up").isEmpty());
        assertThrows(ResourceAccessException.class, () -> greptimePromqlQueryExecutor.executeStrict("up"));
    }

    @Test
    void strictAlertPreviewLimitsSeriesWithoutChangingRegularQueries() {
        PromQlQueryContent response = new PromQlQueryContent();
        PromQlQueryContent.ContentData data = new PromQlQueryContent.ContentData();
        data.setResult(List.of());
        response.setData(data);
        when(restTemplate.exchange(
                any(URI.class),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(PromQlQueryContent.class)
        )).thenReturn(new ResponseEntity<>(response, HttpStatus.OK));

        greptimePromqlQueryExecutor.execute("up");
        greptimePromqlQueryExecutor.executeStrict("up");
        greptimePromqlQueryExecutor.executePreview("up");

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate, times(3)).exchange(
                uriCaptor.capture(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(PromQlQueryContent.class));
        assertFalse(uriCaptor.getAllValues().get(0).getQuery().contains("limit="));
        assertFalse(uriCaptor.getAllValues().get(1).getQuery().contains("limit="));
        assertTrue(uriCaptor.getAllValues().get(2).getQuery().contains("limit=100"));
    }
}
