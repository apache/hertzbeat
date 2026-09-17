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

import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.INSTANT;
import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.RANGE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

class PromqlQueryExecutorTest {

    @ParameterizedTest
    @ValueSource(strings = {"execute", INSTANT, RANGE})
    void preservesQueryExpression(String operation) {
        String expression = "sum(up{job=~\"api.+\",label=\"a&b=50%\"}) + 1";
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(PromQlQueryContent.class))).thenReturn(ResponseEntity.ok(new PromQlQueryContent()));
        PromqlQueryExecutor executor = new PromqlQueryExecutor(restTemplate,
                new PromqlQueryExecutor.HttpPromqlProperties("http://localhost:8428", null, null)) {
            @Override
            public String getDatasource() {
                return "test";
            }
        };

        if ("execute".equals(operation)) {
            executor.execute(expression);
        } else {
            executor.query(DatasourceQuery.builder().refId("A").timeType(operation)
                    .expr(expression).start(1712300000L).end(1712300300L).step("60s").build());
        }

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).exchange(uriCaptor.capture(), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(PromQlQueryContent.class));
        URI uri = uriCaptor.getValue();
        Map<String, String> parameters = Arrays.stream(uri.getRawQuery().split("&"))
                .map(pair -> pair.split("=", 2))
                .collect(Collectors.toMap(pair -> pair[0],
                        pair -> URLDecoder.decode(pair[1], StandardCharsets.UTF_8)));
        assertEquals(expression, parameters.get("query"));
        assertEquals(RANGE.equals(operation) ? "/api/v1/query_range" : "/api/v1/query", uri.getPath());
        if (RANGE.equals(operation)) {
            assertEquals(Map.of("query", expression, "start", "1712300000", "end", "1712300300", "step", "60s"), parameters);
        } else {
            assertEquals(Map.of("query", expression), parameters);
        }
    }
}
