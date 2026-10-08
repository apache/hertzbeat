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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
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
                .thenReturn(ResponseEntity.ok("{}"), ResponseEntity.ok("{}"), ResponseEntity.ok(identitySchema()));

        initializer.initialize();

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(3)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        String sql = decodeSql(entityCaptor.getAllValues().getFirst());
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS hzb_traces"));
        assertTrue(sql.contains("\"timestamp\" TIMESTAMP(9) NOT NULL TIME INDEX"));
        assertTrue(sql.contains("\"trace_id\" STRING NULL SKIPPING INDEX"));
        assertTrue(sql.contains("WITH (append_mode = true, table_data_model = 'greptime_trace_v1')"));
        assertEquals(MediaType.APPLICATION_FORM_URLENCODED, entityCaptor.getValue().getHeaders().getContentType());
        assertEquals("Basic " + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                entityCaptor.getValue().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void completesIdentityColumnsWhenNativeIngestionCreatedTheTableFirst() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"), eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"), ResponseEntity.ok("{}"), ResponseEntity.ok(identitySchema()));

        initializer.initialize();

        ArgumentCaptor<HttpEntity<String>> requests = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(3)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"), eq(HttpMethod.POST), requests.capture(), eq(String.class));
        var statements = requests.getAllValues().stream().map(this::decodeSql).toList();
        assertTrue(statements.get(0).startsWith("CREATE TABLE IF NOT EXISTS"));
        assertTrue(statements.get(1).contains("ADD COLUMN IF NOT EXISTS \"resource_attributes.hertzbeat.workspace_id\" STRING NULL"));
        assertTrue(statements.get(1).contains("ADD COLUMN IF NOT EXISTS \"resource_attributes.service.instance.id\" STRING NULL"));
        assertTrue(statements.get(2).startsWith("SELECT "));
        assertTrue(statements.get(2).endsWith(" FROM hzb_traces LIMIT 0"));
        assertFalse(String.join(" ", statements).contains("DROP "));
    }

    @Test
    void bundledTraceTableResourceUsesGreptimeTraceDataModel() throws Exception {
        String sql = bundledTraceTableSql();

        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS hzb_traces"));
        assertTrue(sql.contains("\"timestamp\" TIMESTAMP(9) NOT NULL TIME INDEX"));
        assertTrue(sql.contains("\"duration_nano\" BIGINT UNSIGNED NULL"));
        assertTrue(sql.contains("\"trace_id\" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM')"));
        assertTrue(sql.contains("\"parent_span_id\" STRING NULL SKIPPING INDEX"));
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.workspace_id\" STRING NULL SKIPPING INDEX "
                + "WITH(granularity = '10240', type = 'BLOOM')"));
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.entity_id\" STRING NULL SKIPPING INDEX"));
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.entity_type\" STRING NULL SKIPPING INDEX "
                + "WITH(granularity = '10240', type = 'BLOOM')"));
        assertTrue(sql.contains("\"resource_attributes.service.namespace\" STRING NULL SKIPPING INDEX "
                + "WITH(granularity = '10240', type = 'BLOOM')"));
        assertTrue(sql.contains("\"resource_attributes.service.instance.id\" STRING NULL SKIPPING INDEX"));
        assertTrue(sql.contains("\"resource_attributes.deployment.environment.name\" STRING NULL SKIPPING INDEX "
                + "WITH(granularity = '10240', type = 'BLOOM')"));
        assertTrue(sql.contains("\"resource_attributes.hertzbeat.collector.id\" STRING NULL SKIPPING INDEX"));
        assertTrue(sql.contains("\"span_events\" JSON NULL"));
        assertTrue(sql.contains("\"span_links\" JSON NULL"));
        assertFalse(sql.contains("\"resource_attributes\" JSON"));
        assertFalse(sql.contains("\"span_attributes\" JSON"));
        assertEquals("PRIMARY KEY(\"service_name\")", primaryKeyClause(sql));
        assertFalse(primaryKeyClause(sql).contains("resource_attributes.hertzbeat.workspace_id"));
        assertFalse(primaryKeyClause(sql).contains("resource_attributes.service.namespace"));
        assertFalse(primaryKeyClause(sql).contains("resource_attributes.deployment.environment.name"));
        assertFalse(primaryKeyClause(sql).contains("resource_attributes.hertzbeat.entity_type"));
        assertFalse(primaryKeyClause(sql).contains("resource_attributes.service.instance.id"));
        assertFalse(primaryKeyClause(sql).contains("resource_attributes.hertzbeat.collector.id"));
        assertFalse(primaryKeyClause(sql).contains("resource_attributes.hertzbeat.entity_id"));
        assertTrue(sql.contains("WITH (append_mode = true, table_data_model = 'greptime_trace_v1')"));
    }

    @Test
    void richTraceSeedUsesProductionSchemaAndNativeFlattenedPipeline() throws Exception {
        String script = Files.readString(repositoryRoot().resolve("script/dev/seed-trace-rich-demo.sh"));

        assertTrue(script.contains("greptime/tables/hzb_traces.sql"));
        assertTrue(script.contains("X-Greptime-Trace-Table-Name: hzb_traces"));
        assertTrue(script.contains("X-Greptime-Pipeline-Name: greptime_trace_v1"));
        assertTrue(script.contains("hertzbeat.workspace_id"));
        assertTrue(script.contains("hertzbeat.entity_id"));
        assertTrue(script.contains("hertzbeat.entity_type"));
        assertTrue(script.contains("service.namespace"));
        assertTrue(script.contains("deployment.environment.name"));
        assertTrue(script.contains("service.version"));
        assertTrue(script.contains("db.system"));
        assertFalse(script.contains("\"resource_attributes\" JSON"));
        assertFalse(script.contains("\"span_attributes\" JSON"));
        assertFalse(script.contains("INSERT INTO hzb_traces"));
    }

    private Path repositoryRoot() {
        Path candidate = Path.of("").toAbsolutePath();
        while (candidate != null) {
            if (Files.isRegularFile(candidate.resolve("script/dev/seed-trace-rich-demo.sh"))) {
                return candidate;
            }
            candidate = candidate.getParent();
        }
        throw new IllegalStateException("Could not locate HertzBeat repository root");
    }

    @Test
    void trimsAndNormalizesGreptimeEndpointAndDatabaseBeforeExecutingTraceTableSql() {
        configureGreptimeProperties(true, "  http://greptime:4000///  ", " public ");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"), ResponseEntity.ok("{}"), ResponseEntity.ok(identitySchema()));

        initializer.initialize();

        verify(restTemplate, times(3)).exchange(
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
                .thenReturn(ResponseEntity.ok("{}"), ResponseEntity.ok("{}"), ResponseEntity.ok(identitySchema()));

        initializer.initialize();

        verify(restTemplate, times(3)).exchange(
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
                .thenReturn(ResponseEntity.ok("{}"), ResponseEntity.ok("{}"), ResponseEntity.ok(identitySchema()));

        initializer.initialize();

        verify(restTemplate, org.mockito.Mockito.times(4)).exchange(
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

    @Test
    void rejectsIncompatibleOrMissingIdentityColumnsInsteadOfClaimingInitialization() {
        assertDoesNotThrow(() -> GreptimeTraceTableInitializer.requireIdentitySchema(identitySchema()));
        assertThrows(IllegalStateException.class, () -> GreptimeTraceTableInitializer.requireIdentitySchema(
                identitySchema().replace("String", "Int64")));
        assertThrows(IllegalStateException.class, () -> GreptimeTraceTableInitializer.requireIdentitySchema("{}"));
    }

    private static String identitySchema() {
        String columns = List.of("hertzbeat.workspace_id", "hertzbeat.entity_id", "hertzbeat.entity_type",
                        "service.namespace", "service.instance.id", "deployment.environment.name", "hertzbeat.collector.id")
                .stream().map(column -> "{\"name\":\"resource_attributes." + column + "\",\"data_type\":\"String\"}")
                .collect(java.util.stream.Collectors.joining(","));
        return "{\"output\":[{\"records\":{\"schema\":{\"column_schemas\":[" + columns + "]},\"rows\":[]}}]}";
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

    private String primaryKeyClause(String sql) {
        int start = sql.indexOf("PRIMARY KEY(");
        assertTrue(start >= 0);
        int end = sql.indexOf(')', start);
        assertTrue(end > start);
        return sql.substring(start, end + 1);
    }
}
