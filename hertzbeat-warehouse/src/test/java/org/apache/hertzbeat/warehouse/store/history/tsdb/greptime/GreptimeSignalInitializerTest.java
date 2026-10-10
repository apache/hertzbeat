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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeSignalInitializerTest {

    @Mock
    private GreptimeSqlQueryExecutor sqlQueryExecutor;
    @Mock
    private RestTemplate restTemplate;
    private GreptimeSignalInitializer initializer;

    @BeforeEach
    void setUp() {
        initializer = new GreptimeSignalInitializer(new GreptimeProperties(true, "127.0.0.1:4001",
                "http://127.0.0.1:4000", "public", "greptime", "secret", "90d"), sqlQueryExecutor, restTemplate);
    }

    @Test
    void shouldPrepareFreshSchemaOnlyAfterExistenceIsVerified() {
        when(sqlQueryExecutor.discoverTables()).thenReturn(List.of());
        when(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(canonicalSchema());
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("ok"));
        initializer.initialize();
        InOrder order = org.mockito.Mockito.inOrder(sqlQueryExecutor, restTemplate);
        order.verify(sqlQueryExecutor).discoverTables();
        order.verify(sqlQueryExecutor).execute(org.mockito.ArgumentMatchers.contains(
                "CREATE TABLE IF NOT EXISTS hertzbeat_traces"));
        order.verify(sqlQueryExecutor).execute(org.mockito.ArgumentMatchers.startsWith(
                "ALTER TABLE hertzbeat_traces ADD COLUMN IF NOT EXISTS \"resource_attributes.service.namespace\""));
        order.verify(sqlQueryExecutor).execute(org.mockito.ArgumentMatchers.startsWith(
                "ALTER TABLE hertzbeat_traces ADD COLUMN IF NOT EXISTS \"resource_attributes.deployment.environment.name\""));
        order.verify(sqlQueryExecutor).execute(org.mockito.ArgumentMatchers.contains(
                "CREATE TABLE IF NOT EXISTS hertzbeat_logs"));
        order.verify(sqlQueryExecutor).executeStrict("DESCRIBE TABLE hertzbeat_logs");
        order.verify(sqlQueryExecutor).executeStrict(org.mockito.ArgumentMatchers.startsWith("SELECT timestamp,"));
        order.verify(restTemplate).exchange(eq("http://127.0.0.1:4000/v1/pipelines/hertzbeat_otlp_log_v1?db=public"),
                eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class));
        verify(sqlQueryExecutor, never()).execute("SELECT 1 AS ready");
    }

    @Test
    void shouldRejectLegacyTimeIndexBeforeAnySchemaOrPipelineMutation() {
        existingTable();
        when(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(List.of(
                column("time_unix_nano", "TimestampNanosecond", "TIMESTAMP"),
                column("attributes", "Json", "FIELD"), column("resource", "Json", "FIELD")));
        assertThatThrownBy(initializer::initialize).hasMessageContaining("hertzbeat_logs requires an upgrade")
                .hasMessageContaining("time_unix_nano").hasMessageContaining("missing column timestamp")
                .hasMessageContaining("missing column hertzbeat_workspace_id")
                .hasMessageContaining("no automatic migration was attempted");
        verifyNoMutations();
    }

    @Test
    void shouldRejectLegacyTimeIndexEvenWhenNewNamedColumnsExist() {
        existingTable();
        List<Map<String, Object>> schema = new ArrayList<>(canonicalSchema());
        schema.set(0, column("timestamp", "TimestampNanosecond", "FIELD"));
        schema.add(column("time_unix_nano", "TimestampNanosecond", "TIMESTAMP"));
        when(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(schema);
        assertThatThrownBy(initializer::initialize).hasMessageContaining("expected sole time index timestamp");
        verifyNoMutations();
    }

    @Test
    void shouldRejectIncompatibleJsonTypeBeforeMutation() {
        existingTable();
        List<Map<String, Object>> schema = new ArrayList<>(canonicalSchema());
        schema.removeIf(row -> "resource_attributes".equals(row.get("Column")));
        schema.add(column("resource_attributes", "String", "FIELD"));
        when(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(schema);
        assertThatThrownBy(initializer::initialize).hasMessageContaining("resource_attributes must have type Json");
        verifyNoMutations();
    }

    @ParameterizedTest
    @MethodSource("unverifiableSchemas")
    void shouldNotTreatEmptyOrMalformedMetadataAsReady(List<Map<String, Object>> schema) {
        existingTable();
        when(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(schema);
        assertThatThrownBy(initializer::initialize).hasMessageContaining("schema metadata cannot be verified");
        verifyNoMutations();
    }

    private static Stream<List<Map<String, Object>>> unverifiableSchemas() {
        return Stream.of(List.of(), List.of(Map.of("Column", "timestamp", "Type", "TimestampNanosecond")),
                List.of(column("timestamp", "TimestampNanosecond", "TIMESTAMP"),
                        column("timestamp", "TimestampNanosecond", "TIMESTAMP")));
    }

    @Test
    void shouldFailClosedWhenTableDiscoveryIsUnreadable() {
        when(sqlQueryExecutor.discoverTables()).thenThrow(new IllegalStateException("schema read denied"));
        assertThatThrownBy(initializer::initialize).hasMessageContaining("hertzbeat_logs schema or backend could not be verified")
                .hasCauseInstanceOf(IllegalStateException.class);
        verifyNoMutations();
    }

    @Test
    void shouldFailClosedWhenReaderProjectionIsDenied() {
        existingTable();
        when(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(canonicalSchema());
        when(sqlQueryExecutor.executeStrict(org.mockito.ArgumentMatchers.startsWith("SELECT timestamp,")))
                .thenThrow(new IllegalStateException("log query permission denied"));
        assertThatThrownBy(initializer::initialize).hasMessageContaining("log ingestion is not ready");
        verifyNoMutations();
    }

    @Test
    void shouldFailClosedWhenSchemaReadIsDenied() {
        existingTable();
        when(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs"))
                .thenThrow(new IllegalStateException("describe permission denied"));
        assertThatThrownBy(initializer::initialize).hasMessageContaining("log ingestion is not ready");
        verifyNoMutations();
    }

    @Test
    void incompatibleTableMustFailContextInitializationBeforeReadiness() {
        existingTable();
        when(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(List.of(
                column("time_unix_nano", "TimestampNanosecond", "TIMESTAMP")));
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test",
                    Map.of("warehouse.store.greptime.enabled", "true")));
            context.registerBean(GreptimeSignalInitializer.class, () -> initializer);
            assertThatThrownBy(context::refresh).hasRootCauseInstanceOf(
                    GreptimeLogSchemaValidator.SchemaValidationException.class);
        }
        verifyNoMutations();
    }

    private void existingTable() {
        when(sqlQueryExecutor.discoverTables()).thenReturn(List.of(Map.of("Tables", "hertzbeat_logs")));
    }

    private void verifyNoMutations() {
        verify(sqlQueryExecutor, never()).execute(anyString());
        verifyNoInteractions(restTemplate);
    }

    private static List<Map<String, Object>> canonicalSchema() {
        List<Map<String, Object>> columns = new ArrayList<>();
        columns.add(column("timestamp", "TimestampNanosecond", "TIMESTAMP"));
        for (String name : List.of("trace_id", "span_id", "hertzbeat_event_id", "log_record_uid",
                "hertzbeat_ingest_id", "hertzbeat_entity_id", "hertzbeat_workspace_id", "severity_text", "body")) {
            columns.add(column(name, "String", "FIELD"));
        }
        columns.add(column("service_name", "String", "TAG"));
        columns.add(column("severity_number", "Int32", "FIELD"));
        columns.add(column("log_attributes", "Json", "FIELD"));
        columns.add(column("resource_attributes", "Json", "FIELD"));
        return columns;
    }

    private static Map<String, Object> column(String name, String type, String semanticType) {
        return Map.of("Column", name, "Type", type, "Semantic Type", semanticType);
    }
}
