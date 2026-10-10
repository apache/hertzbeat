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

package org.apache.hertzbeat.observability.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.mockito.ArgumentCaptor;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.http.ResponseEntity;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

class SelfTelemetryInitializerTest {
    private final GreptimeProperties external = new GreptimeProperties(true, "localhost:4001",
            "http://localhost:4000", "public", null, null, null);

    @Test
    void disabledSelfDoesNotTouchStorage() {
        RestTemplate client = mock(RestTemplate.class);
        SelfTelemetryProperties self = new SelfTelemetryProperties();
        try (GreptimeQueryGuard guard = guard()) {
            new SelfTelemetryInitializer(self, external, client, client, guard).initialize();
        }
        verifyNoInteractions(client);
        assertFalse(self.isReady());
    }

    @Test
    void missingDatabaseDoesNotCreateDatabaseOrUploadPipeline() {
        RestTemplate queryClient = mock(RestTemplate.class);
        RestTemplate initializationClient = mock(RestTemplate.class);
        when(queryClient.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(GreptimeSqlQueryContent.class)))
                .thenThrow(new RestClientException("Database not found"));
        SelfTelemetryProperties self = configured();
        try (GreptimeQueryGuard guard = guard()) {
            new SelfTelemetryInitializer(self, external, queryClient, initializationClient, guard).initialize();
        }
        verify(queryClient).exchange(eq("http://localhost:4000/v1/sql?db=hertzbeat_self"),
                eq(HttpMethod.POST), any(HttpEntity.class), eq(GreptimeSqlQueryContent.class));
        verifyNoInteractions(initializationClient);
        assertFalse(self.isReady());
    }

    @Test
    void equalDatabaseIsRejectedBeforeStorageAccess() {
        RestTemplate client = mock(RestTemplate.class);
        SelfTelemetryProperties self = configured();
        self.setDatabase("public");
        try (GreptimeQueryGuard guard = guard()) {
            new SelfTelemetryInitializer(self, external, client, client, guard).initialize();
        }
        verifyNoInteractions(client);
        assertFalse(self.isReady());
    }

    @Test
    void freshDatabaseCreatesActualSdkTraceTargetAndValidatesBeforeReady() {
        GreptimeSqlQueryExecutor executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.discoverTables()).thenReturn(List.of());
        when(executor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(schema(SelfTelemetrySchema.logColumns()));
        when(executor.executeStrict("DESCRIBE TABLE hzb_traces")).thenReturn(schema(SelfTelemetrySchema.traceColumns()));
        RestTemplate client = mock(RestTemplate.class);
        when(client.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));
        SelfTelemetryProperties self = configured();
        initializer(self, executor, client).initialize();
        ArgumentCaptor<String> statements = ArgumentCaptor.forClass(String.class);
        verify(executor, times(2)).execute(statements.capture());
        assertTrue(statements.getAllValues().stream().anyMatch(sql -> sql.contains("CREATE TABLE IF NOT EXISTS hzb_traces")));
        assertTrue(statements.getAllValues().stream().noneMatch(sql -> sql.contains("ALTER TABLE")
                || sql.contains("CREATE TABLE IF NOT EXISTS hertzbeat_traces")));
        verify(executor).executeStrict("DESCRIBE TABLE hzb_traces");
        verify(executor).executeStrict("SELECT " + SelfTelemetrySchema.projection(SelfTelemetrySchema.traceColumns())
                + " FROM hzb_traces LIMIT 0");
        assertTrue(self.isReady());
    }

    @Test
    void failedTraceCreateNeverMarksReadyOrUploadsPipeline() {
        GreptimeSqlQueryExecutor executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.discoverTables()).thenReturn(List.of());
        when(executor.executeStrict("DESCRIBE TABLE hertzbeat_logs")).thenReturn(schema(SelfTelemetrySchema.logColumns()));
        when(executor.executeStrict("DESCRIBE TABLE hzb_traces")).thenReturn(List.of());
        RestTemplate client = mock(RestTemplate.class);
        SelfTelemetryProperties self = configured();
        initializer(self, executor, client).initialize();
        assertFalse(self.isReady());
        verifyNoInteractions(client);
    }

    @Test
    void incompatibleExistingTraceTableIsReadOnlyAndUnavailable() {
        GreptimeSqlQueryExecutor executor = mock(GreptimeSqlQueryExecutor.class);
        when(executor.discoverTables()).thenReturn(List.of(Map.of("Tables", "hzb_traces")));
        when(executor.executeStrict("DESCRIBE TABLE hzb_traces")).thenReturn(List.of(
                Map.of("Column", "timestamp", "Type", "TimestampNanosecond", "Semantic Type", "TIMESTAMP")));
        RestTemplate client = mock(RestTemplate.class);
        SelfTelemetryProperties self = configured();
        initializer(self, executor, client).initialize();
        assertFalse(self.isReady());
        verify(executor, never()).execute(anyString());
        verifyNoInteractions(client);
    }

    private SelfTelemetryInitializer initializer(SelfTelemetryProperties self, GreptimeSqlQueryExecutor executor,
            RestTemplate client) {
        return new SelfTelemetryInitializer(self, external, client, client, null) {
            @Override
            GreptimeSqlQueryExecutor createExecutor(GreptimeProperties properties) {
                return executor;
            }
        };
    }

    private List<Map<String, Object>> schema(Map<String, String> columns) {
        return columns.entrySet().stream().map(column -> Map.<String, Object>of("Column", column.getKey(),
                "Type", column.getValue(), "Semantic Type", column.getKey().equals("timestamp") ? "TIMESTAMP"
                        : column.getKey().equals("service_name") ? "TAG" : "FIELD")).toList();
    }

    private SelfTelemetryProperties configured() {
        SelfTelemetryProperties self = new SelfTelemetryProperties();
        self.setEnabled(true);
        self.setDatabase("hertzbeat_self");
        self.setWorkspaceId("workspace-one");
        return self;
    }

    private GreptimeQueryGuard guard() {
        return new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ZERO);
    }
}
