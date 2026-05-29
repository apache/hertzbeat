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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
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
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeApmFlowInitializerTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    @Mock
    private GreptimeProperties greptimeProperties;

    private GreptimeApmFlowInitializer initializer;

    @BeforeEach
    void setUp() {
        initializer = new GreptimeApmFlowInitializer(restTemplate, greptimePropertiesProvider);
    }

    @Test
    void executesBundledApmFlowStatementsWhenGreptimeEnabled() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        List<String> sqlStatements = entityCaptor.getAllValues().stream()
                .map(this::decodeSql)
                .toList();
        assertTrue(sqlStatements.get(0).contains("CREATE TABLE IF NOT EXISTS hertzbeat_apm_red_1m"));
        assertTrue(sqlStatements.get(1).contains("CREATE FLOW IF NOT EXISTS hertzbeat_apm_red_1m_flow"));
        assertTrue(sqlStatements.get(1).contains("SINK TO hertzbeat_apm_red_1m"));
        assertTrue(sqlStatements.get(1).contains("EXPIRE AFTER '6 hours'::INTERVAL"));

        for (HttpEntity<String> entity : entityCaptor.getAllValues()) {
            assertEquals(MediaType.APPLICATION_FORM_URLENCODED, entity.getHeaders().getContentType());
            assertEquals("Basic " + Base64.getEncoder()
                            .encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                    entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        }
    }

    @Test
    void trimsAndNormalizesGreptimeEndpointBeforeExecutingFlowSql() {
        configureGreptimeProperties(true, "  http://greptime:4000///  ");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void trimsGreptimeDatabaseBeforeExecutingFlowSql() {
        configureGreptimeProperties(true, "http://greptime:4000", " public ");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void trimsGreptimeBasicAuthCredentialsBeforeExecutingFlowSql() {
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

        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void usesDefaultGreptimeDatabaseBeforeExecutingFlowSqlWhenDatabaseIsBlank() {
        configureGreptimeProperties(true, "http://greptime:4000", "   ");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        verify(restTemplate, times(2)).exchange(
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

        verify(restTemplate, times(4)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void retriesRetryableApmFlowSqlStatusBeforeContinuingFlowStatements() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("{}", HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(ResponseEntity.ok("{}"))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        verify(restTemplate, times(3)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class));
    }

    @Test
    void retriesApmFlowWithFlattenedTraceResourceColumnsWhenGreptimeSchemaHasNoJsonColumn() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.BAD_REQUEST,
                        "Bad Request",
                        HttpHeaders.EMPTY,
                        ("{\"code\":3000,\"error\":\"Failed to plan SQL: No field named resource_attributes. "
                                + "Did you mean 'hzb_traces.resource_attributes.host.name'?\"}")
                                .getBytes(StandardCharsets.UTF_8),
                        StandardCharsets.UTF_8))
                .thenReturn(ResponseEntity.ok("""
                        {"output":[{"records":{"schema":{"column_schemas":[{"name":"Column","data_type":"String"}]},
                        "rows":[["timestamp"],["service_name"],["resource_attributes.host.name"]],"total_rows":3}}]}
                        """))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(4)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        List<String> sqlStatements = entityCaptor.getAllValues().stream()
                .map(this::decodeSql)
                .toList();
        assertTrue(sqlStatements.get(2).contains("DESC hzb_traces"));
        String adaptedFlowSql = sqlStatements.get(3);
        assertTrue(adaptedFlowSql.contains("CREATE FLOW IF NOT EXISTS hertzbeat_apm_red_1m_flow"));
        assertTrue(adaptedFlowSql.contains("NULL AS workspace_id"));
        assertTrue(adaptedFlowSql.contains("NULL AS entity_id"));
        assertTrue(adaptedFlowSql.contains("NULL AS deployment_environment"));
        assertTrue(adaptedFlowSql.contains("NULL AS service_namespace"));
        assertFalse(adaptedFlowSql.contains("json_get_string(resource_attributes"));
        assertFalse(adaptedFlowSql.contains("resource_attributes.host.name"));
    }

    @Test
    void stopsFlowInitializationWhenFirstSqlStatementReturnsNonRetryableStatus() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("bad ddl", HttpStatus.BAD_REQUEST));

        assertDoesNotThrow(() -> initializer.initialize());

        verify(restTemplate, times(1)).exchange(
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
    void bundledApmFlowResourceUsesSafeGreptimeTraceRollupSemantics() throws Exception {
        String sql = bundledFlowSql();
        String lowerSql = sql.toLowerCase();

        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS hertzbeat_apm_red_1m"));
        assertTrue(sql.contains("CREATE FLOW IF NOT EXISTS hertzbeat_apm_red_1m_flow"));
        assertTrue(sql.contains("date_bin('1 minute'::INTERVAL, \"timestamp\") AS time_window"));
        assertTrue(sql.contains("COALESCE(NULLIF(service_name, ''), 'unknown_service') AS service_name"));
        assertTrue(sql.contains("COALESCE(NULLIF(span_name, ''), 'unknown_operation') AS operation"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]')"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"hertzbeat.entity_id\"]')"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment.name\"]')"));
        assertFalse(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment\"]')"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]')"));
        assertTrue(sql.contains("span_status_code IN ('STATUS_CODE_ERROR', 'ERROR')"));
        assertTrue(sql.contains("CASE\n"
                + "    WHEN span_kind IN ('SPAN_KIND_SERVER', 'SERVER') THEN 'SERVER'\n"
                + "    WHEN span_kind IN ('SPAN_KIND_CONSUMER', 'CONSUMER') THEN 'CONSUMER'\n"
                + "    ELSE 'UNKNOWN'\n"
                + "  END AS span_kind"));
        assertTrue(sql.contains("COALESCE(SUM(duration_nano), 0) AS duration_sum_nano"));
        assertTrue(sql.contains("uddsketch_state(128, 0.01, duration_nano) AS duration_sketch"));
        assertTrue(sql.contains("span_kind IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER')"));
        assertTrue(sql.contains("PRIMARY KEY(service_name, operation, span_kind, workspace_id, entity_id, "
                + "deployment_environment, service_namespace)"));
        assertFalse(lowerSql.contains("drop flow"));
        assertFalse(lowerSql.contains("drop table"));
        assertFalse(lowerSql.contains("trace_id"));
        assertFalse(lowerSql.contains("span_id"));
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
        configureGreptimeProperties(enabled, "http://greptime:4000/");
    }

    private void configureGreptimeProperties(boolean enabled, String httpEndpoint) {
        configureGreptimeProperties(enabled, httpEndpoint, "public");
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

    private String bundledFlowSql() throws Exception {
        try (InputStream inputStream = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream(GreptimeApmFlowInitializer.APM_FLOW_RESOURCE)) {
            assertNotNull(inputStream);
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
