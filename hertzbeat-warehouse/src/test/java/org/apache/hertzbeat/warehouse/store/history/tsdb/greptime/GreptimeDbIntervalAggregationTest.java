/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import io.greptime.GreptimeDB;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeDbIntervalAggregationTest {

    private static final long START_SECONDS = 1_712_730_000L;

    @Mock
    private GreptimeProperties properties;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private GreptimeSqlQueryExecutor sqlQueryExecutor;

    @Mock
    private GreptimeDB greptimeDb;

    @BeforeEach
    void setUp() {
        when(properties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("username");
        when(properties.password()).thenReturn("password");
        when(properties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(properties.expireTime()).thenReturn(null);
    }

    @Test
    void alignsAggregateSeriesByTimestampWhenRawAndIntervalPointCountsDiffer() {
        ResponseEntity<PromQlQueryContent> raw = response(
                List.of(START_SECONDS, START_SECONDS + 12 * 60 * 60), List.of("151", "151"));
        List<Long> aggregateTimes = List.of(
                START_SECONDS,
                START_SECONDS + 4 * 60 * 60,
                START_SECONDS + 8 * 60 * 60,
                START_SECONDS + 12 * 60 * 60);
        ResponseEntity<PromQlQueryContent> max = response(aggregateTimes, List.of("154", "155", "156", "157"));
        ResponseEntity<PromQlQueryContent> min = response(aggregateTimes, List.of("148", "149", "150", "151"));
        ResponseEntity<PromQlQueryContent> mean = response(aggregateTimes, List.of("151", "152", "153", "154"));
        when(restTemplate.exchange(any(), eq(HttpMethod.GET), any(HttpEntity.class), eq(PromQlQueryContent.class)))
                .thenReturn(raw, max, min, mean);

        try (MockedStatic<GreptimeDB> mocked = mockStatic(GreptimeDB.class)) {
            mocked.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);
            GreptimeDbDataStorage storage = new GreptimeDbDataStorage(properties, restTemplate, sqlQueryExecutor);

            Map<String, List<Value>> result = storage.getHistoryIntervalMetricData(
                    "127.0.0.1:3306", "mysql", "basic", "max_connections", "1W",
                    START_SECONDS * 1000, (START_SECONDS + 16 * 60 * 60) * 1000, "4h");

            List<Value> values = result.get("{}");
            assertEquals(4, values.size());
            assertEquals(
                    aggregateTimes.stream().map(time -> time * 1000).toList(),
                    values.stream().map(Value::getTime).toList());
            assertEquals(List.of("154", "155", "156", "157"), values.stream().map(Value::getMax).toList());
            assertEquals(List.of("148", "149", "150", "151"), values.stream().map(Value::getMin).toList());
            assertEquals(List.of("151", "152", "153", "154"), values.stream().map(Value::getMean).toList());
        }
    }

    private ResponseEntity<PromQlQueryContent> response(List<Long> times, List<String> values) {
        PromQlQueryContent content = new PromQlQueryContent();
        PromQlQueryContent.ContentData data = new PromQlQueryContent.ContentData();
        PromQlQueryContent.ContentData.Content result = new PromQlQueryContent.ContentData.Content();
        Map<String, String> metric = new HashMap<>();
        metric.put("__name__", "mysql_basic");
        metric.put("instance", "127.0.0.1:3306");
        result.setMetric(metric);
        List<Object[]> points = new ArrayList<>();
        for (int index = 0; index < times.size(); index++) {
            points.add(new Object[]{times.get(index).doubleValue(), values.get(index)});
        }
        result.setValues(points);
        data.setResult(List.of(result));
        content.setData(data);
        return new ResponseEntity<>(content, HttpStatus.OK);
    }
}
