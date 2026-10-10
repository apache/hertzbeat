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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.json.JsonMapper;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

class GreptimeTableDiscoveryContractTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String TABLE_SCHEMA = "{\"column_schemas\":[{\"name\":\"Tables\",\"data_type\":\"String\"}]}";
    private final RestTemplate sqlRestTemplate = mock(RestTemplate.class);
    private final RestTemplate pipelineRestTemplate = mock(RestTemplate.class);

    @ParameterizedTest
    @MethodSource("malformedEmptyDiscoverySchemas")
    void malformedEmptyDiscoveryMustNotStartAnyMutation(String schema) throws Exception {
        when(sqlRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class))).thenReturn(ResponseEntity.ok(response(schema, List.of())));
        try (GreptimeQueryGuard guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ZERO)) {
            GreptimeSignalInitializer initializer = initializer(guard);
            assertThatThrownBy(initializer::initialize).hasMessageContaining("log ingestion is not ready");
        }
        assertEquals(List.of("SHOW TABLES"), requestedSql());
        verifyNoInteractions(pipelineRestTemplate);
    }

    private static Stream<String> malformedEmptyDiscoverySchemas() {
        return Stream.of("null", "{}", "{\"column_schemas\":[]}", "{\"column_schemas\":[null]}",
                "{\"column_schemas\":[{\"name\":\" \",\"data_type\":\"String\"}]}",
                "{\"column_schemas\":[{\"name\":\"Tables\",\"data_type\":\"Int32\"}]}",
                "{\"column_schemas\":[{\"name\":\"Tables\"}]}",
                "{\"column_schemas\":[{\"name\":\"Tables\",\"data_type\":\"String\"},"
                        + "{\"name\":\"Other\",\"data_type\":\"String\"}]}");
    }

    @Test
    void validEmptyDiscoveryStillInitializesFreshDatabase() throws Exception {
        GreptimeSqlQueryContent empty = response(TABLE_SCHEMA, List.of());
        GreptimeSqlQueryContent description = description(List.of(
                List.of("timestamp", "TimestampNanosecond", "TIMESTAMP")));
        for (String name : List.of("trace_id", "span_id", "hertzbeat_event_id", "log_record_uid", "hertzbeat_ingest_id",
                "hertzbeat_entity_id", "hertzbeat_workspace_id", "severity_text", "body")) {
            description.getOutput().getFirst().getRecords().getRows().add(List.of(name, "String", "FIELD"));
        }
        description.getOutput().getFirst().getRecords().getRows().addAll(List.of(
                List.of("service_name", "String", "TAG"), List.of("severity_number", "Int32", "FIELD"),
                List.of("log_attributes", "Json", "FIELD"), List.of("resource_attributes", "Json", "FIELD")));
        when(sqlRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class))).thenAnswer(invocation -> {
                    HttpEntity<?> entity = invocation.getArgument(2);
                    return ResponseEntity.ok(decodeSql(entity).startsWith("DESCRIBE") ? description : empty);
                });
        when(pipelineRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("ok"));
        try (GreptimeQueryGuard guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ZERO)) {
            initializer(guard).initialize();
        }
        List<String> requests = requestedSql();
        assertEquals("SHOW TABLES", requests.getFirst());
        assertEquals(2, requests.stream().filter(sql -> sql.contains("CREATE TABLE")).count());
        assertEquals(2, requests.stream().filter(sql -> sql.startsWith("ALTER TABLE")).count());
        verify(pipelineRestTemplate).exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void legacyTableStillFailsAfterOnlyTwoReadQueries() throws Exception {
        when(sqlRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class))).thenReturn(
                        ResponseEntity.ok(response(TABLE_SCHEMA, List.of(List.of("hertzbeat_logs")))),
                        ResponseEntity.ok(description(List.of(List.of("time_unix_nano", "TimestampNanosecond", "TIMESTAMP")))));
        try (GreptimeQueryGuard guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ZERO)) {
            assertThatThrownBy(initializer(guard)::initialize).hasMessageContaining("hertzbeat_logs requires an upgrade");
        }
        assertEquals(List.of("SHOW TABLES", "DESCRIBE TABLE hertzbeat_logs"), requestedSql());
        verifyNoInteractions(pipelineRestTemplate);
    }

    private GreptimeSignalInitializer initializer(GreptimeQueryGuard guard) {
        GreptimeProperties properties = new GreptimeProperties(true, "127.0.0.1:4001", "http://127.0.0.1:4000",
                "public", "", "", "90d");
        return new GreptimeSignalInitializer(properties,
                new GreptimeSqlQueryExecutor(properties, sqlRestTemplate, guard), pipelineRestTemplate);
    }

    private static GreptimeSqlQueryContent response(String schema, List<List<Object>> rows) throws Exception {
        return JSON.readValue("{\"output\":[{\"records\":{\"schema\":" + schema + ",\"rows\":"
                + JSON.writeValueAsString(rows) + "}}]}", GreptimeSqlQueryContent.class);
    }

    private static GreptimeSqlQueryContent description(List<List<Object>> rows) throws Exception {
        String schema = JSON.writeValueAsString(Map.of("column_schemas", List.of(
                Map.of("name", "Column", "data_type", "String"), Map.of("name", "Type", "data_type", "String"),
                Map.of("name", "Semantic Type", "data_type", "String"))));
        return response(schema, rows);
    }

    @SuppressWarnings("unchecked")
    private List<String> requestedSql() {
        ArgumentCaptor<HttpEntity<String>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(sqlRestTemplate, times(org.mockito.Mockito.mockingDetails(sqlRestTemplate).getInvocations().size()))
                .exchange(anyString(), eq(HttpMethod.POST), captor.capture(), eq(GreptimeSqlQueryContent.class));
        return captor.getAllValues().stream().map(GreptimeTableDiscoveryContractTest::decodeSql).toList();
    }

    private static String decodeSql(HttpEntity<?> entity) {
        return URLDecoder.decode(String.valueOf(entity.getBody()).substring(4), StandardCharsets.UTF_8);
    }
}
