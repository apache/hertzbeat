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

package org.apache.hertzbeat.observability.ingestion.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.apache.hertzbeat.observability.ingestion.retry.OtlpIngestionRetryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeOtlpIngestionAuditEventSinkTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    private GreptimeOtlpIngestionAuditEventSink sink;

    @BeforeEach
    void setUp() {
        sink = new GreptimeOtlpIngestionAuditEventSink(restTemplate, greptimePropertiesProvider);
    }

    @Test
    void createsTableAndWritesRedAuditEventWhenGreptimeIsEnabled() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "grpc",
                "rejected",
                "RESOURCE_EXHAUSTED",
                "workspace-'1",
                "entity-1",
                "ingest-1",
                2048L,
                42L,
                "policy '[REDACTED]' O'Reilly",
                17L,
                1710000000123L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        List<String> sqlStatements = entityCaptor.getAllValues().stream()
                .map(this::decodeSql)
                .toList();
        String createTableSql = sqlStatements.get(0);
        assertTrue(createTableSql.contains("CREATE TABLE IF NOT EXISTS hertzbeat_otlp_ingest_red"));
        assertTrue(createTableSql.contains("observed_at TIMESTAMP(3) TIME INDEX"));
        assertTrue(createTableSql.contains("signal_items BIGINT NULL"));
        assertTrue(createTableSql.contains("PRIMARY KEY(workspace_id, signal, protocol, outcome, status_code)"));

        String insertSql = sqlStatements.get(1);
        assertTrue(insertSql.startsWith("INSERT INTO hertzbeat_otlp_ingest_red"));
        assertTrue(insertSql.contains("to_timestamp_millis(1710000000123)"));
        assertTrue(insertSql.contains("'workspace-''1'"));
        assertTrue(insertSql.contains("'metrics'"));
        assertTrue(insertSql.contains("'grpc'"));
        assertTrue(insertSql.contains("'rejected'"));
        assertTrue(insertSql.contains("'RESOURCE_EXHAUSTED'"));
        assertTrue(insertSql.contains("2048"));
        assertTrue(insertSql.contains("42"));
        assertTrue(insertSql.contains("17"));
        assertTrue(insertSql.contains("'policy ''[REDACTED]'' O''Reilly'"));

        for (HttpEntity<String> entity : entityCaptor.getAllValues()) {
            assertEquals(MediaType.APPLICATION_FORM_URLENCODED, entity.getHeaders().getContentType());
            assertEquals("Basic " + Base64.getEncoder()
                            .encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                    entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        }
    }

    @Test
    void normalizesStatusCodeBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "grpc",
                "rejected",
                " resource_exhausted ",
                null,
                null,
                null,
                100L,
                1L,
                null,
                3L,
                1710000000456L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String insertSql = decodeSql(entityCaptor.getAllValues().get(1));
        assertTrue(insertSql.contains("'RESOURCE_EXHAUSTED'"));
    }

    @Test
    void normalizesStatusCodeSeparatorsBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "grpc",
                "rejected",
                " resource-exhausted ",
                null,
                null,
                null,
                100L,
                1L,
                null,
                3L,
                1710000000456L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String insertSql = decodeSql(entityCaptor.getAllValues().get(1));
        assertTrue(insertSql.contains("'RESOURCE_EXHAUSTED'"));
        assertFalse(insertSql.contains("'RESOURCE-EXHAUSTED'"));
    }

    @Test
    void normalizesStatusCodeEdgeSeparatorsBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "grpc",
                "rejected",
                " - resource exhausted - ",
                null,
                null,
                null,
                100L,
                1L,
                null,
                3L,
                1710000000456L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String insertSql = decodeSql(entityCaptor.getAllValues().get(1));
        assertTrue(insertSql.contains("'RESOURCE_EXHAUSTED'"));
        assertFalse(insertSql.contains("'_RESOURCE_EXHAUSTED_'"));
    }

    @Test
    void normalizesNumericGrpcStatusCodeBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "logs",
                "http",
                "rejected",
                "8.0",
                null,
                null,
                null,
                100L,
                1L,
                null,
                3L,
                1710000000456L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String insertSql = decodeSql(entityCaptor.getAllValues().get(1));
        assertTrue(insertSql.contains("'RESOURCE_EXHAUSTED'"));
        assertFalse(insertSql.contains("'8.0'"));
    }

    @Test
    void skipsWriteWhenNumericGrpcStatusCodeIsNotCanonical() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());

        sink.record(new OtlpIngestionAuditEvent(
                "logs",
                "http",
                "rejected",
                "8.5",
                null,
                null,
                null,
                100L,
                1L,
                null,
                3L,
                1710000000456L
        ));

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    @Test
    void skipsWriteWhenTextualStatusCodeIsNotCanonicalGrpcCode() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());

        sink.record(new OtlpIngestionAuditEvent(
                "logs",
                "http",
                "rejected",
                "backend-overloaded",
                null,
                null,
                null,
                100L,
                1L,
                null,
                3L,
                1710000000456L
        ));

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    @Test
    void skipsWriteWhenNormalizedStatusCodeHasNoToken() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());

        sink.record(new OtlpIngestionAuditEvent(
                "metrics", "grpc", "rejected", " - - ", null, null, null,
                100L, 1L, null, 3L, 1710000000456L));

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    @Test
    void trimsIdentityDimensionsBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "logs",
                "http",
                "accepted",
                "OK",
                " team-a ",
                " entity-a ",
                " ingest-a ",
                100L,
                1L,
                null,
                3L,
                1710000000456L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String insertSql = decodeSql(entityCaptor.getAllValues().get(1));
        assertTrue(insertSql.contains("'team-a'"));
        assertTrue(insertSql.contains("'entity-a'"));
        assertTrue(insertSql.contains("'ingest-a'"));
        assertFalse(insertSql.contains("' team-a '"));
        assertFalse(insertSql.contains("' entity-a '"));
        assertFalse(insertSql.contains("' ingest-a '"));
    }

    @Test
    void redactsReasonBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "grpc",
                "rejected",
                "UNAUTHENTICATED",
                "workspace-1",
                "entity-1",
                "ingest-secret",
                100L,
                1L,
                "quota rejected token=live-token",
                3L,
                1710000000456L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String insertSql = decodeSql(entityCaptor.getAllValues().get(1));
        assertTrue(insertSql.contains("'quota rejected token=[REDACTED]'"));
        assertFalse(insertSql.contains("live-token"));
    }

    @Test
    void retriesRetryableInsertStatusBeforePersistingRedAuditEvent() {
        GreptimeOtlpIngestionAuditEventSink retryingSink = new GreptimeOtlpIngestionAuditEventSink(
                restTemplate, greptimePropertiesProvider, new OtlpIngestionRetryService(2));
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"))
                .thenReturn(new ResponseEntity<>("{}", HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(ResponseEntity.ok("{}"));

        retryingSink.record(new OtlpIngestionAuditEvent(
                "logs",
                "http",
                "accepted",
                "OK",
                "workspace-1",
                "entity-1",
                "ingest-retry",
                1024L,
                3L,
                null,
                11L,
                1710000000999L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(3)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        List<String> sqlStatements = entityCaptor.getAllValues().stream()
                .map(this::decodeSql)
                .toList();
        assertTrue(sqlStatements.get(0).contains("CREATE TABLE IF NOT EXISTS hertzbeat_otlp_ingest_red"));
        assertTrue(sqlStatements.get(1).startsWith("INSERT INTO hertzbeat_otlp_ingest_red"));
        assertEquals(sqlStatements.get(1), sqlStatements.get(2));
    }

    @Test
    void trimsAndNormalizesGreptimeEndpointBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenReturn(enabledGreptime("  http://greptime:4000///  "));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "traces",
                "grpc",
                "accepted",
                "OK",
                null,
                null,
                "ingest-1",
                512L,
                1L,
                null,
                9L,
                1710000000789L
        ));

        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void trimsGreptimeDatabaseBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenReturn(enabledGreptime("http://greptime:4000", " public "));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "http",
                "accepted",
                "OK",
                null,
                null,
                "ingest-2",
                256L,
                1L,
                null,
                3L,
                1710000000790L
        ));

        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void trimsGreptimeBasicAuthCredentialsBeforeWritingRedAuditEvent() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenReturn(new GreptimeProperties(true, "127.0.0.1:4001", "http://greptime:4000",
                        "public", " demo ", " secret ", null));
        String expectedAuthorization = "Basic "
                + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>argThat(entity -> {
                    assertEquals(expectedAuthorization, entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
                    return true;
                }),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "http",
                "accepted",
                "OK",
                null,
                null,
                "ingest-2",
                256L,
                1L,
                null,
                3L,
                1710000000790L
        ));

        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void usesDefaultGreptimeDatabaseBeforeWritingRedAuditEventWhenDatabaseIsBlank() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenReturn(enabledGreptime("http://greptime:4000", "   "));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "http",
                "accepted",
                "OK",
                null,
                null,
                "ingest-3",
                128L,
                1L,
                null,
                2L,
                1710000000791L
        ));

        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void doesNotFailWhenGreptimePropertiesLookupThrowsRuntimeException() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenThrow(new IllegalStateException("greptime properties unavailable"));

        assertDoesNotThrow(() -> sink.record(new OtlpIngestionAuditEvent(
                "metrics",
                "http",
                "accepted",
                "OK",
                null,
                null,
                "ingest-provider-failure",
                128L,
                1L,
                null,
                2L,
                1710000000792L
        )));

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    @Test
    void writesNullForUnknownOptionalCountsInsteadOfFakeZero() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sink.record(new OtlpIngestionAuditEvent(
                "logs",
                "http",
                "accepted",
                "OK",
                null,
                null,
                null,
                100L,
                null,
                null,
                null,
                1710000000456L
        ));

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String insertSql = decodeSql(entityCaptor.getAllValues().get(1));
        assertTrue(insertSql.contains("NULL, NULL, NULL"));
        assertTrue(insertSql.contains("100, NULL, NULL, NULL"));
    }

    @Test
    void failsWithClearMessageWhenGreptimeSqlReturnsNullResponseAfterRetryBudget() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(null);

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> sink.record(
                new OtlpIngestionAuditEvent(
                        "logs",
                        "http",
                        "accepted",
                        "OK",
                        null,
                        null,
                        null,
                        100L,
                        null,
                        null,
                        null,
                        1710000000456L
                )));

        assertEquals("Greptime SQL returned no response", exception.getMessage());
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void skipsWriteForUnsupportedAuditClassification() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());

        sink.record(new OtlpIngestionAuditEvent(
                "profiles", "http", "accepted", "OK", null, null, null,
                100L, 1L, null, 1L, 1710000000456L));
        sink.record(new OtlpIngestionAuditEvent(
                "metrics", "http", "queued", "OK", null, null, null,
                100L, 1L, null, 1L, 1710000000457L));
        sink.record(new OtlpIngestionAuditEvent(
                "metrics", "http", "accepted", null, null, null, null,
                100L, 1L, null, 1L, 1710000000458L));

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    @Test
    void skipsWriteWhenGreptimeIsDisabled() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(new GreptimeProperties(
                false, "127.0.0.1:4001", "http://greptime:4000", "public", null, null, null));

        sink.record(new OtlpIngestionAuditEvent(
                "metrics", "http", "accepted", "OK", null, null, null,
                1L, 1L, null, 1L, 1710000000000L));

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    @Test
    void skipsWriteWhenObservedAtIsNotPositive() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(enabledGreptime());

        sink.record(new OtlpIngestionAuditEvent(
                "metrics", "http", "accepted", "OK", null, null, null,
                1L, 1L, null, 1L, 0L));

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    private GreptimeProperties enabledGreptime() {
        return enabledGreptime("http://greptime:4000/");
    }

    private GreptimeProperties enabledGreptime(String httpEndpoint) {
        return enabledGreptime(httpEndpoint, "public");
    }

    private GreptimeProperties enabledGreptime(String httpEndpoint, String database) {
        return new GreptimeProperties(true, "127.0.0.1:4001", httpEndpoint,
                database, "demo", "secret", null);
    }

    private String decodeSql(HttpEntity<String> entity) {
        assertNotNull(entity.getBody());
        assertTrue(entity.getBody().startsWith("sql="));
        return URLDecoder.decode(entity.getBody().substring("sql=".length()), StandardCharsets.UTF_8);
    }
}
