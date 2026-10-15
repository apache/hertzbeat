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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySource;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link GreptimeSqlQueryExecutor}
 */
@ExtendWith(MockitoExtension.class)
class GreptimeSqlQueryExecutorTest {

    @Mock
    private GreptimeProperties greptimeProperties;

    @Mock
    private RestTemplate restTemplate;

    private GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;
    private GreptimeQueryGuard queryGuard;

    @BeforeEach
    void setUp() {
        when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        when(greptimeProperties.database()).thenReturn("hertzbeat");
        when(greptimeProperties.username()).thenReturn("username");
        when(greptimeProperties.password()).thenReturn("password");

        queryGuard = new GreptimeQueryGuard(2, Duration.ofSeconds(2), Duration.ofMillis(10));
        greptimeSqlQueryExecutor = new GreptimeSqlQueryExecutor(greptimeProperties, restTemplate, queryGuard);
    }

    @AfterEach
    void tearDown() {
        queryGuard.close();
        TelemetrySourceContext.clear();
    }

    @Test
    void selectsOnlyCapturedTrustedDatabaseAndReturnsToExternalAfterClear() {
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class))).thenReturn(ResponseEntity.ok(new GreptimeSqlQueryContent()));
        TelemetrySourceContext.bind(new TelemetrySourceContext.Route(TelemetrySource.SELF, "hertzbeat_self", "operations"));
        greptimeSqlQueryExecutor.execute("SELECT body FROM hertzbeat_logs WHERE trace_id = 'same-id'");
        TelemetrySourceContext.clear();
        greptimeSqlQueryExecutor.execute("SELECT body FROM hertzbeat_logs WHERE trace_id = 'same-id'");
        ArgumentCaptor<String> urls = ArgumentCaptor.forClass(String.class);
        verify(restTemplate, org.mockito.Mockito.times(2)).exchange(urls.capture(), eq(HttpMethod.POST),
                any(HttpEntity.class), eq(GreptimeSqlQueryContent.class));
        assertEquals(List.of("http://127.0.0.1:4000/v1/sql?db=hertzbeat_self",
                "http://127.0.0.1:4000/v1/sql?db=hertzbeat"), urls.getAllValues());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testRequestBodyIsFormEncoded() {
        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenReturn(new ResponseEntity<>(new GreptimeSqlQueryContent(), HttpStatus.OK));

        // SQL carrying form-urlencoded metacharacters that would pollute the request body
        // if concatenated raw: '&' would start a second sql= parameter and override the query.
        String sql = "SELECT * FROM t WHERE name = 'x&sql=DROP TABLE t'";
        greptimeSqlQueryExecutor.execute(sql);

        ArgumentCaptor<HttpEntity<String>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
            any(String.class),
            eq(HttpMethod.POST),
            captor.capture(),
            eq(GreptimeSqlQueryContent.class));

        String body = captor.getValue().getBody();
        assertNotNull(body);
        // The body must be a single sql= parameter; the '&' inside the SQL must be encoded.
        String encodedValue = body.substring("sql=".length());
        assertFalse(encodedValue.contains("&"), "raw '&' in body causes HTTP parameter pollution");
        // Decoding the value must yield exactly the original SQL, lossless round-trip.
        assertEquals(sql, URLDecoder.decode(encodedValue, StandardCharsets.UTF_8));
    }

    @Test
    void mutationAcknowledgementUsesTrustedSelfRouteAndEncodedBody() {
        GreptimeSqlMutationResponse payload = new GreptimeSqlMutationResponse(null, null,
                List.of(new GreptimeSqlMutationResponse.Output(2L, null, null)));
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(GreptimeSqlMutationResponse.class))).thenReturn(ResponseEntity.ok(payload));
        TelemetrySourceContext.bind(new TelemetrySourceContext.Route(TelemetrySource.SELF, "hertzbeat_self", "team-a"));
        String sql = "DELETE FROM hertzbeat_logs WHERE body = 'a&sql=DROP TABLE t'";

        assertEquals(2, greptimeSqlQueryExecutor.executeMutationStrict(sql));
        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<HttpEntity<String>> request = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(url.capture(), eq(HttpMethod.POST), request.capture(), eq(GreptimeSqlMutationResponse.class));
        assertEquals("http://127.0.0.1:4000/v1/sql?db=hertzbeat_self", url.getValue());
        assertEquals(sql, URLDecoder.decode(request.getValue().getBody().substring(4), StandardCharsets.UTF_8));
    }

    @ParameterizedTest
    @MethodSource("failedMutationResponses")
    void mutationDoesNotAcknowledgeHttpOrBodyFailure(ResponseEntity<GreptimeSqlMutationResponse> response) {
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(GreptimeSqlMutationResponse.class))).thenReturn(response);
        assertThrows(RuntimeException.class, () -> greptimeSqlQueryExecutor.executeMutationStrict("DELETE FROM hertzbeat_logs"));
    }

    private static Stream<Arguments> failedMutationResponses() {
        GreptimeSqlMutationResponse valid = new GreptimeSqlMutationResponse(0, null,
                List.of(new GreptimeSqlMutationResponse.Output(1L, null, null)));
        GreptimeSqlMutationResponse error = new GreptimeSqlMutationResponse(1004, "append mode", valid.output());
        return Stream.of(Arguments.of((Object) null),
                Arguments.of(new ResponseEntity<>(valid, HttpStatus.SERVICE_UNAVAILABLE)),
                Arguments.of(ResponseEntity.ok().build()), Arguments.of(ResponseEntity.ok(error)),
                Arguments.of(ResponseEntity.ok(new GreptimeSqlMutationResponse(0, null, List.of()))));
    }

    @Test
    void testExecuteSuccess() {
        // Mock successful response
        GreptimeSqlQueryContent mockResponse = createMockResponse();
        ResponseEntity<GreptimeSqlQueryContent> responseEntity =
            new ResponseEntity<>(mockResponse, HttpStatus.OK);

        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        // Execute
        List<Map<String, Object>> result = greptimeSqlQueryExecutor.execute("SELECT * FROM metrics");

        // Verify
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("cpu", result.get(0).get("metric_name"));
        assertEquals(85.5, result.get(0).get("value"));
    }

    @Test
    void testExecuteError() {
        // Mock error response
        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenThrow(new RuntimeException("Connection error"));

        // Execute
        assertThrows(RuntimeException.class, () -> greptimeSqlQueryExecutor.execute("SELECT * FROM metrics"));
    }

    @Test
    void testExecuteStrictRejectsGreptimeErrorCode() {
        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setCode(1004);
        ResponseEntity<GreptimeSqlQueryContent> responseEntity = new ResponseEntity<>(response, HttpStatus.OK);
        when(restTemplate.exchange(
                any(String.class),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        assertThrows(RuntimeException.class,
                () -> greptimeSqlQueryExecutor.executeStrict("SELECT MAX(timestamp) FROM hertzbeat_logs"));
    }

    @Test
    void testExecuteStrictRejectsMissingOutput() {
        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setCode(0);
        ResponseEntity<GreptimeSqlQueryContent> responseEntity = new ResponseEntity<>(response, HttpStatus.OK);
        when(restTemplate.exchange(
                any(String.class),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        assertThrows(RuntimeException.class,
                () -> greptimeSqlQueryExecutor.executeStrict("SELECT MAX(timestamp) FROM hertzbeat_logs"));
    }

    @Test
    void testExecuteStrictRejectsUnsuccessfulHttpResponse() {
        GreptimeSqlQueryContent response = createMockResponse();
        ResponseEntity<GreptimeSqlQueryContent> responseEntity =
                new ResponseEntity<>(response, HttpStatus.SERVICE_UNAVAILABLE);
        when(restTemplate.exchange(
                any(String.class),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        assertThrows(RuntimeException.class,
                () -> greptimeSqlQueryExecutor.executeStrict("SELECT MAX(timestamp) FROM hertzbeat_logs"));
    }

    @Test
    void testExecuteStrictPreservesValidNullAggregate() {
        ResponseEntity<GreptimeSqlQueryContent> responseEntity =
                new ResponseEntity<>(createNullAggregateResponse(), HttpStatus.OK);
        when(restTemplate.exchange(
                any(String.class),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        List<Map<String, Object>> rows = greptimeSqlQueryExecutor.executeStrict(
                "SELECT MAX(timestamp) AS last_received_at FROM hertzbeat_logs");

        assertEquals(1, rows.size());
        assertTrue(rows.getFirst().containsKey("last_received_at"));
        assertNull(rows.getFirst().get("last_received_at"));
    }

    @ParameterizedTest
    @MethodSource("malformedStrictSchemaResponses")
    void testExecuteStrictRejectsMalformedSchemaForNonEmptyRows(GreptimeSqlQueryContent response) {
        when(restTemplate.exchange(
                any(String.class),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(new ResponseEntity<>(response, HttpStatus.OK));

        assertThrows(IllegalStateException.class,
                () -> greptimeSqlQueryExecutor.executeStrict("SELECT value FROM hertzbeat_logs"));
    }

    @Test
    void testExecuteStrictAllowsTrulyEmptyRowsWithoutSchema() {
        GreptimeSqlQueryContent response = createResponse(null, List.of());
        when(restTemplate.exchange(
                any(String.class),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(GreptimeSqlQueryContent.class)
        )).thenReturn(new ResponseEntity<>(response, HttpStatus.OK));

        assertEquals(List.of(), greptimeSqlQueryExecutor.executeStrict("SELECT value FROM hertzbeat_logs"));
    }

    @Test
    void testExecuteReturnsEmptyWhenGreptimeSqlReturnsNullResponse() {
        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenReturn(null);

        List<Map<String, Object>> result = greptimeSqlQueryExecutor.execute(
                "SELECT * FROM hertzbeat_otlp_ingest_red");

        assertEquals(List.of(), result);
    }

    @Test
    void testExecuteSkipsNullOutputsAndRowsInGreptimeSqlResponse() {
        GreptimeSqlQueryContent mockResponse = createMockResponseWithNullOutputAndRow();
        ResponseEntity<GreptimeSqlQueryContent> responseEntity =
            new ResponseEntity<>(mockResponse, HttpStatus.OK);

        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        List<Map<String, Object>> result = greptimeSqlQueryExecutor.execute(
                "SELECT * FROM hertzbeat_otlp_ingest_red");

        assertEquals(1, result.size());
        assertEquals("cpu", result.getFirst().get("metric_name"));
        assertEquals(85.5, result.getFirst().get("value"));
    }

    @Test
    void testExecuteUsesSyntheticColumnNamesForMissingGreptimeSqlSchemaColumns() {
        GreptimeSqlQueryContent mockResponse = createMockResponseWithPartialSchema();
        ResponseEntity<GreptimeSqlQueryContent> responseEntity =
            new ResponseEntity<>(mockResponse, HttpStatus.OK);

        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        List<Map<String, Object>> result = greptimeSqlQueryExecutor.execute(
                "SELECT * FROM hertzbeat_otlp_ingest_red");

        assertEquals(1, result.size());
        assertEquals("cpu", result.getFirst().get("metric_name"));
        assertEquals(85.5, result.getFirst().get("col_1"));
        assertEquals("ok", result.getFirst().get("col_2"));
    }

    @Test
    void testExecuteEncodesSqlInFormBody() {
        GreptimeSqlQueryContent mockResponse = createMockResponse();
        ResponseEntity<GreptimeSqlQueryContent> responseEntity =
            new ResponseEntity<>(mockResponse, HttpStatus.OK);

        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        String sql = "SELECT COUNT(*) as count FROM hertzbeat_logs WHERE body LIKE '%Exporting failed%'";
        greptimeSqlQueryExecutor.execute(sql);

        ArgumentCaptor<HttpEntity> httpEntityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
            any(String.class),
            eq(HttpMethod.POST),
            httpEntityCaptor.capture(),
            eq(GreptimeSqlQueryContent.class)
        );
        assertEquals(
            "sql=" + URLEncoder.encode(sql, StandardCharsets.UTF_8),
            httpEntityCaptor.getValue().getBody()
        );
    }

    @Test
    void testExecuteTrimsEndpointDatabaseAndCredentialsBeforeReadback() {
        when(greptimeProperties.httpEndpoint()).thenReturn("  http://127.0.0.1:4000///  ");
        when(greptimeProperties.database()).thenReturn(" red audit ");
        when(greptimeProperties.username()).thenReturn(" demo ");
        when(greptimeProperties.password()).thenReturn(" secret ");
        GreptimeSqlQueryContent mockResponse = createMockResponse();
        ResponseEntity<GreptimeSqlQueryContent> responseEntity =
            new ResponseEntity<>(mockResponse, HttpStatus.OK);

        when(restTemplate.exchange(
            any(String.class),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(GreptimeSqlQueryContent.class)
        )).thenReturn(responseEntity);

        greptimeSqlQueryExecutor.execute("SELECT * FROM hertzbeat_otlp_ingest_red");

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<HttpEntity> httpEntityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
            urlCaptor.capture(),
            eq(HttpMethod.POST),
            httpEntityCaptor.capture(),
            eq(GreptimeSqlQueryContent.class)
        );
        assertEquals("http://127.0.0.1:4000/v1/sql?db=red%20audit", urlCaptor.getValue());
        assertEquals("Basic " + Base64.getEncoder()
                        .encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                httpEntityCaptor.getValue().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
    }

    private GreptimeSqlQueryContent createMockResponse() {
        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setCode(0);

        // Create simple schema
        List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columnSchemas = new ArrayList<>();
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("metric_name", "String"));
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("value", "Float64"));

        GreptimeSqlQueryContent.Output.Records.Schema schema =
            new GreptimeSqlQueryContent.Output.Records.Schema();
        schema.setColumnSchemas(columnSchemas);

        // Create simple row
        List<List<Object>> rows = new ArrayList<>();
        rows.add(List.of("cpu", 85.5));

        // Build response structure
        GreptimeSqlQueryContent.Output.Records records =
            new GreptimeSqlQueryContent.Output.Records();
        records.setSchema(schema);
        records.setRows(rows);

        GreptimeSqlQueryContent.Output output = new GreptimeSqlQueryContent.Output();
        output.setRecords(records);

        response.setOutput(List.of(output));
        return response;
    }

    private GreptimeSqlQueryContent createMockResponseWithNullOutputAndRow() {
        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setCode(0);

        List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columnSchemas = new ArrayList<>();
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("metric_name", "String"));
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("value", "Float64"));

        GreptimeSqlQueryContent.Output.Records.Schema schema =
            new GreptimeSqlQueryContent.Output.Records.Schema();
        schema.setColumnSchemas(columnSchemas);

        List<List<Object>> rows = new ArrayList<>();
        rows.add(null);
        rows.add(List.of("cpu", 85.5));

        GreptimeSqlQueryContent.Output.Records records =
            new GreptimeSqlQueryContent.Output.Records();
        records.setSchema(schema);
        records.setRows(rows);

        GreptimeSqlQueryContent.Output output = new GreptimeSqlQueryContent.Output();
        output.setRecords(records);

        List<GreptimeSqlQueryContent.Output> outputs = new ArrayList<>();
        outputs.add(null);
        outputs.add(output);
        response.setOutput(outputs);
        return response;
    }

    private GreptimeSqlQueryContent createMockResponseWithPartialSchema() {
        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setCode(0);

        List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columnSchemas = new ArrayList<>();
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema("metric_name", "String"));
        columnSchemas.add(null);
        columnSchemas.add(new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema(" ", "String"));

        GreptimeSqlQueryContent.Output.Records.Schema schema =
            new GreptimeSqlQueryContent.Output.Records.Schema();
        schema.setColumnSchemas(columnSchemas);

        List<List<Object>> rows = new ArrayList<>();
        rows.add(List.of("cpu", 85.5, "ok"));

        GreptimeSqlQueryContent.Output.Records records =
            new GreptimeSqlQueryContent.Output.Records();
        records.setSchema(schema);
        records.setRows(rows);

        GreptimeSqlQueryContent.Output output = new GreptimeSqlQueryContent.Output();
        output.setRecords(records);

        response.setOutput(List.of(output));
        return response;
    }

    private GreptimeSqlQueryContent createNullAggregateResponse() {
        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setCode(0);

        GreptimeSqlQueryContent.Output.Records.Schema schema =
                new GreptimeSqlQueryContent.Output.Records.Schema();
        schema.setColumnSchemas(List.of(
                new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema(
                        "last_received_at", "TimestampMillisecond")));

        List<Object> aggregateRow = new ArrayList<>();
        aggregateRow.add(null);
        GreptimeSqlQueryContent.Output.Records records = new GreptimeSqlQueryContent.Output.Records();
        records.setSchema(schema);
        records.setRows(List.of(aggregateRow));

        GreptimeSqlQueryContent.Output output = new GreptimeSqlQueryContent.Output();
        output.setRecords(records);
        response.setOutput(List.of(output));
        return response;
    }

    private static Stream<Arguments> malformedStrictSchemaResponses() {
        return Stream.of(
                Arguments.of(createResponse(null, List.of(List.of(1)))),
                Arguments.of(createResponse(List.of(column("only")), List.of(List.of(1, 2)))),
                Arguments.of(createResponse(Arrays.asList((GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema) null),
                        List.of(List.of(1)))),
                Arguments.of(createResponse(List.of(column(" ")), List.of(List.of(1)))),
                Arguments.of(createResponse(List.of(column("duplicate"), column("duplicate")),
                        List.of(List.of(1, 2)))));
    }

    private static GreptimeSqlQueryContent createResponse(
            List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columns,
            List<List<Object>> rows) {
        GreptimeSqlQueryContent.Output.Records records = new GreptimeSqlQueryContent.Output.Records();
        if (columns != null) {
            GreptimeSqlQueryContent.Output.Records.Schema schema =
                    new GreptimeSqlQueryContent.Output.Records.Schema();
            schema.setColumnSchemas(columns);
            records.setSchema(schema);
        }
        records.setRows(rows);
        GreptimeSqlQueryContent.Output output = new GreptimeSqlQueryContent.Output();
        output.setRecords(records);
        GreptimeSqlQueryContent response = new GreptimeSqlQueryContent();
        response.setCode(0);
        response.setOutput(List.of(output));
        return response;
    }

    private static GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema column(String name) {
        return new GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema(name, "String");
    }
}
