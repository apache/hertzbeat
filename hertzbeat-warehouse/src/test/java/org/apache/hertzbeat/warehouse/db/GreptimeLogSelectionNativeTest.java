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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

class GreptimeLogSelectionNativeTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final GreptimeProperties PROPERTIES = new GreptimeProperties(true, "", "http://proof", "public", null, null, null);

    @Test
    void preservesNativeIntegerFloatZeroAndInfinityIdentities() throws Exception {
        var http = pipeline();
        var output = output("1.1.4", List.of("2", "2.0", "2", "2.0", "0", "-0.0", "NULL", "inf"));
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GreptimeSqlQueryContent.class))).thenReturn(ResponseEntity.ok(output));
        try (var guard = guard(Duration.ofSeconds(1))) {
            var prepared = new GreptimeSqlQueryExecutor(PROPERTIES, http, guard).prepareLogGroupSelection(selection(
                    "attribute:a", "2", "attribute:b", "2.0", "attribute:c", "-0.0", "attribute:d", "inf"));
            assertEquals(2L, prepared.targets().get(0).int64());
            assertNull(prepared.targets().get(0).float64Bits());
            assertNull(prepared.targets().get(1).int64());
            assertEquals(Double.doubleToRawLongBits(2.0), prepared.targets().get(1).float64Bits());
            assertEquals(Double.doubleToRawLongBits(-0.0), prepared.targets().get(2).float64Bits());
            assertEquals(Double.doubleToRawLongBits(Double.POSITIVE_INFINITY), prepared.targets().get(3).float64Bits());
        }
        verify(http, times(1)).exchange(anyString(), eq(HttpMethod.GET), any(), eq(String.class));
        verify(http, times(1)).exchange(anyString(), eq(HttpMethod.POST), any(), eq(GreptimeSqlQueryContent.class));
    }

    @Test
    void serviceUsesNativeDryRunAndSinglePermitForThreeRequests() throws Exception {
        var http = pipeline();
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GreptimeSqlQueryContent.class)))
                .thenReturn(ResponseEntity.ok(output("1.1.4", List.of("2", "2.0"))));
        JsonNode dryRun = JSON.readTree("[{\"rows\":[[{\"key\":\"service_name\",\"data_type\":\"STRING\",\"value\":\"2\"}],[{\"key\":\"service_name\",\"data_type\":\"STRING\",\"value\":\"2\"}]]}]");
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class))).thenReturn(ResponseEntity.ok(dryRun.toString()));
        try (var guard = guard(Duration.ofSeconds(1))) {
            var target = new GreptimeSqlQueryExecutor(PROPERTIES, http, guard).prepareLogGroupSelection(selection("builtin:serviceName", "2")).targets().get(0);
            assertEquals(2L, target.int64());
            assertEquals(Double.doubleToRawLongBits(2.0), target.float64Bits());
        }
        verify(http, times(1)).exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class));
    }

    @Test
    void rejectsChangedPipelineBeforeAnySql() throws Exception {
        var http = pipeline();
        when(http.exchange(anyString(), eq(HttpMethod.GET), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"pipelines\":[{\"pipeline\":\"arbitrary transformer\"}]}"));
        var calls = new AtomicInteger();
        var prep = new GreptimeLogSelectionPreparation(http, PROPERTIES, sql -> {
            calls.incrementAndGet();
            return List.of();
        }, Long.MAX_VALUE);
        assertThrows(UnsupportedOperationException.class, () -> prep.prepare(selection("attribute:a", "2")));
        assertEquals(0, calls.get());
    }

    @Test
    void rejectsUnknownVersionAndMalformedProjectionInsteadOfStringFallback() throws Exception {
        var http = pipeline();
        try (var guard = guard(Duration.ofSeconds(1))) {
            var executor = new GreptimeSqlQueryExecutor(PROPERTIES, http, guard);
            when(http.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GreptimeSqlQueryContent.class)))
                    .thenReturn(ResponseEntity.ok(output("2.0.0", List.of("2", "2.0"))));
            assertThrows(UnsupportedOperationException.class, () -> executor.prepareLogGroupSelection(selection("attribute:a", "2")));
            when(http.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GreptimeSqlQueryContent.class)))
                    .thenReturn(ResponseEntity.ok(output("1.1.4", List.of())));
            assertThrows(IllegalStateException.class, () -> executor.prepareLogGroupSelection(selection("attribute:a", "2")));
        }
    }

    @Test
    void metadataAndDryRunUseConfiguredDatabaseAndSkipBlankCredentials() throws Exception {
        var http = pipeline();
        var properties = new GreptimeProperties(true, "", "http://proof", "catalog-schema", " ", "\t", null);
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GreptimeSqlQueryContent.class)))
                .thenReturn(ResponseEntity.ok(output("1.1.4", List.of("2", "2.0"))));
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class))).thenReturn(ResponseEntity.ok(
                "[{\"rows\":[[{\"key\":\"service_name\",\"data_type\":\"STRING\",\"value\":\"2\"}],[{\"key\":\"service_name\",\"data_type\":\"STRING\",\"value\":\"2\"}]]}]"));
        try (var guard = guard(Duration.ofSeconds(1))) {
            new GreptimeSqlQueryExecutor(properties, http, guard).prepareLogGroupSelection(selection("builtin:serviceName", "2"));
        }
        var request = org.mockito.ArgumentCaptor.forClass(org.springframework.http.HttpEntity.class);
        verify(http, times(2)).exchange(anyString(), any(HttpMethod.class), request.capture(), eq(String.class));
        for (var entity : request.getAllValues()) {
            assertEquals("catalog-schema", entity.getHeaders().getFirst("X-Greptime-DB-Name"));
            assertNull(entity.getHeaders().getFirst("Authorization"));
        }
    }

    @Test
    void rejectsFractionalProjectionOrdinal() throws Exception {
        var http = pipeline();
        var response = output("1.1.4", List.of("2", "2.0"));
        response.getOutput().getFirst().getRecords().getRows().getFirst().set(0, 0.5);
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GreptimeSqlQueryContent.class)))
                .thenReturn(ResponseEntity.ok(response));
        try (var guard = guard(Duration.ofSeconds(1))) {
            var executor = new GreptimeSqlQueryExecutor(PROPERTIES, http, guard);
            assertThrows(IllegalStateException.class, () -> executor.prepareLogGroupSelection(selection("attribute:a", "2")));
        }
    }

    @Test
    void timedOutUncooperativeNativeReadRetainsPermitAndNeverStartsNextRequest() throws Exception {
        var http = pipeline();
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var ended = new CountDownLatch(1);
        when(http.exchange(anyString(), eq(HttpMethod.GET), any(), eq(String.class))).thenAnswer(call -> {
            entered.countDown();
            while (release.getCount() != 0) {
                try { release.await(); } catch (InterruptedException ignored) { /* Simulate an uncooperative native client. */ }
            }
            ended.countDown();
            return ResponseEntity.ok(pipelineBody().toString());
        });
        try (var guard = guard(Duration.ofMillis(100))) {
            var executor = new GreptimeSqlQueryExecutor(PROPERTIES, http, guard);
            assertThrows(GreptimeQueryGuard.QueryTimeoutException.class, () -> executor.prepareLogGroupSelection(selection("attribute:a", "2")));
            assertTrue(entered.await(1, TimeUnit.SECONDS));
            assertThrows(GreptimeQueryGuard.QueryRejectedException.class, () -> executor.prepareLogGroupSelection(selection("attribute:a", "2")));
            release.countDown();
            assertTrue(ended.await(1, TimeUnit.SECONDS));
            verify(http, times(0)).exchange(anyString(), eq(HttpMethod.POST), any(), eq(GreptimeSqlQueryContent.class));
        } finally { release.countDown(); }
    }

    private static RestTemplate pipeline() throws Exception {
        var http = mock(RestTemplate.class);
        when(http.exchange(anyString(), eq(HttpMethod.GET), any(), eq(String.class))).thenReturn(ResponseEntity.ok(pipelineBody().toString()));
        return http;
    }

    private static JsonNode pipelineBody() throws Exception {
        String yaml = new ClassPathResource("greptime/pipelines/hertzbeat_otlp_log_v1.yaml").getContentAsString(StandardCharsets.UTF_8);
        return JSON.valueToTree(Map.of("pipelines", List.of(Map.of("pipeline", yaml))));
    }

    private static GreptimeQueryGuard guard(Duration timeout) { return new GreptimeQueryGuard(1, timeout, Duration.ofMillis(5)); }

    private static LogGroupSelection selection(String... pairs) {
        var keys = new ArrayList<LogGroupSelection.Key>();
        for (int i = 0; i < pairs.length; i += 2) { keys.add(new LogGroupSelection.Key(LogFacets.Field.parse(pairs[i]), "value", pairs[i + 1])); }
        return new LogGroupSelection(1, keys);
    }

    private static GreptimeSqlQueryContent output(String version, List<String> candidates) {
        var values = new ArrayList<>(List.of("2", "2.0", "-0.0", "1e-8", "1e20", "inf", "-inf"));
        values.addAll(candidates);
        var rows = new ArrayList<List<Object>>();
        for (int i = 0; i < values.size(); i++) {
            var row = new ArrayList<Object>();
            row.add(i);
            row.add(version);
            row.add("NULL".equals(values.get(i)) ? null : values.get(i));
            rows.add(row);
        }
        return JSON.convertValue(Map.of("output", List.of(Map.of("records", Map.of("rows", rows, "schema", Map.of("column_schemas", List.of(
                Map.of("name", "id"), Map.of("name", "version"), Map.of("name", "value"))))))), GreptimeSqlQueryContent.class);
    }
}
