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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
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
 * Test case for {@link GreptimePromqlQueryExecutor}.
 */
@ExtendWith(MockitoExtension.class)
class GreptimePromqlQueryExecutorTest {

    @Mock
    private GreptimeProperties greptimeProperties;

    @Mock
    private RestTemplate restTemplate;

    private GreptimePromqlQueryExecutor greptimePromqlQueryExecutor;

    @BeforeEach
    void setUp() {
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(greptimeProperties.username()).thenReturn("greptime");
        when(greptimeProperties.password()).thenReturn("greptime");
        greptimePromqlQueryExecutor = new GreptimePromqlQueryExecutor(greptimeProperties, restTemplate);
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
                .build();

        DatasourceQueryData result = greptimePromqlQueryExecutor.query(query);

        assertEquals(200, result.getStatus());
        assertEquals(1, result.getFrames().size());
    }
}
