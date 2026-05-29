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

package org.apache.hertzbeat.observability.ingestion.forwarder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
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
class GreptimeTraceTableInitializerTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    @Mock
    private GreptimeProperties greptimeProperties;

    private GreptimeTraceTableInitializer initializer;

    @BeforeEach
    void setUp() {
        initializer = new GreptimeTraceTableInitializer(restTemplate, greptimePropertiesProvider);
    }

    @Test
    void executesBundledTraceTableDdlWhenGreptimeEnabled() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String sql = decodeSql(entityCaptor.getValue());
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS hzb_traces"));
        assertTrue(sql.contains("\"timestamp\" TIMESTAMP(9) TIME INDEX"));
        assertTrue(sql.contains("\"trace_id\" STRING NULL SKIPPING INDEX"));
        assertTrue(sql.contains("WITH (append_mode = true, table_data_model = 'greptime_trace_v1')"));
        assertEquals(MediaType.APPLICATION_FORM_URLENCODED, entityCaptor.getValue().getHeaders().getContentType());
        assertEquals("Basic " + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                entityCaptor.getValue().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void bundledTraceTableResourceUsesGreptimeTraceDataModel() throws Exception {
        String sql = bundledTraceTableSql();

        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS hzb_traces"));
        assertTrue(sql.contains("\"timestamp\" TIMESTAMP(9) TIME INDEX"));
        assertTrue(sql.contains("\"duration_nano\" BIGINT UNSIGNED NULL"));
        assertTrue(sql.contains("\"trace_id\" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM')"));
        assertTrue(sql.contains("\"resource_attributes\" JSON NULL"));
        assertTrue(sql.contains("PRIMARY KEY(\"service_name\")"));
        assertTrue(sql.contains("WITH (append_mode = true, table_data_model = 'greptime_trace_v1')"));
    }

    @Test
    void trimsAndNormalizesGreptimeEndpointAndDatabaseBeforeExecutingTraceTableSql() {
        configureGreptimeProperties(true, "  http://greptime:4000///  ", " public ");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void trimsGreptimeBasicAuthCredentialsBeforeExecutingTraceTableSql() {
        configureGreptimeProperties(true);
        when(greptimeProperties.username()).thenReturn(" demo ");
        when(greptimeProperties.password()).thenReturn(" secret ");
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

        initializer.initialize();

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void doesNotFailStartupWhenGreptimeSqlReturnsNullResponseAfterRetryBudget() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(null);

        assertDoesNotThrow(() -> initializer.initialize());

        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void retriesRetryableTraceTableSqlStatusBeforeGivingUp() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("{}", HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void doesNotFailStartupWhenGreptimeSqlThrowsUnexpectedRuntimeException() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenThrow(new IllegalStateException("unexpected greptime client failure"));

        assertDoesNotThrow(() -> initializer.initialize());

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void doesNotFailStartupWhenGreptimePropertiesLookupThrowsRuntimeException() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenThrow(new IllegalStateException("greptime properties unavailable"));

        assertDoesNotThrow(() -> initializer.initialize());

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    @Test
    void skipsInitializationWhenGreptimeIsDisabled() {
        configureGreptimeProperties(false);

        initializer.initialize();

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    private void configureGreptimeProperties(boolean enabled) {
        configureGreptimeProperties(enabled, "http://greptime:4000/", "public");
    }

    private void configureGreptimeProperties(boolean enabled, String httpEndpoint, String database) {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(enabled);
        if (enabled) {
            when(greptimeProperties.httpEndpoint()).thenReturn(httpEndpoint);
            when(greptimeProperties.database()).thenReturn(database);
            when(greptimeProperties.username()).thenReturn("demo");
            when(greptimeProperties.password()).thenReturn("secret");
        }
    }

    private String decodeSql(HttpEntity<String> entity) {
        assertNotNull(entity.getBody());
        assertTrue(entity.getBody().startsWith("sql="));
        return URLDecoder.decode(entity.getBody().substring("sql=".length()), StandardCharsets.UTF_8);
    }

    private String bundledTraceTableSql() throws Exception {
        try (InputStream inputStream = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream(GreptimeTraceTableInitializer.TRACE_TABLE_RESOURCE)) {
            assertNotNull(inputStream);
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
