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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeOtlpSignalStorageTest {

    @Mock
    private RestTemplate restTemplate;

    private GreptimeOtlpSignalStorage storage;

    @BeforeEach
    void setUp() {
        storage = new GreptimeOtlpSignalStorage(
                new GreptimeProperties(true, "127.0.0.1:4001", "http://127.0.0.1:4000/",
                        "public", "greptime", "secret"),
                restTemplate);
    }

    @Test
    void shouldWriteMetricsWithResourcePromotionAndAuthentication() {
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(byte[].class)))
                .thenReturn(ResponseEntity.ok("response".getBytes(StandardCharsets.UTF_8)));

        byte[] response = storage.writeProtobuf("metrics", new byte[] {1, 2});

        ArgumentCaptor<HttpEntity<byte[]>> request = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(eq("http://127.0.0.1:4000/v1/otlp/v1/metrics"), eq(HttpMethod.POST),
                request.capture(), eq(byte[].class));
        assertThat(request.getValue().getHeaders().getFirst(
                "X-Greptime-OTLP-Metric-Promote-Resource-Attrs"))
                .contains("service.name", "deployment.environment.name");
        assertThat(request.getValue().getHeaders().getFirst("Authorization")).startsWith("Basic ");
        assertThat(request.getValue().getBody()).containsExactly(1, 2);
        assertThat(response).isEqualTo("response".getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void shouldSelectWarehouseOwnedTraceAndLogSchemas() {
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(byte[].class)))
                .thenReturn(ResponseEntity.ok(new byte[0]));

        storage.writeProtobuf("traces", new byte[0]);
        storage.writeProtobuf("logs", new byte[0]);

        ArgumentCaptor<HttpEntity<byte[]>> requests = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(eq("http://127.0.0.1:4000/v1/otlp/v1/traces"), eq(HttpMethod.POST),
                requests.capture(), eq(byte[].class));
        verify(restTemplate).exchange(eq("http://127.0.0.1:4000/v1/otlp/v1/logs"), eq(HttpMethod.POST),
                requests.capture(), eq(byte[].class));
        assertThat(requests.getAllValues().get(0).getHeaders().getFirst("X-Greptime-Trace-Table-Name"))
                .isEqualTo("hertzbeat_traces");
        assertThat(requests.getAllValues().get(0).getHeaders().getFirst("X-Greptime-Pipeline-Name"))
                .isEqualTo("greptime_trace_v1");
        assertThat(requests.getAllValues().get(1).getHeaders().getFirst("X-Greptime-Log-Table-Name"))
                .isEqualTo("hertzbeat_logs");
        assertThat(requests.getAllValues().get(1).getHeaders().getFirst("X-Greptime-Log-Pipeline-Name"))
                .isEqualTo("hertzbeat_otlp_log_v1");
    }

    @Test
    void shouldRejectUnsupportedSignalBeforeStorageCall() {
        assertThatThrownBy(() -> storage.writeProtobuf("profiles", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unsupported OTLP signal");
    }

    @Test
    void shouldSurfaceGreptimeRejectionAsClientErrorWithResponseBody() {
        byte[] body = "{\"error\":\"pipeline hertzbeat_otlp_log_v1 not found\"}".getBytes(StandardCharsets.UTF_8);
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(byte[].class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request",
                        new HttpHeaders(), body, StandardCharsets.UTF_8));

        assertThatThrownBy(() -> storage.writeProtobuf("logs", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("GreptimeDB rejected OTLP logs (400): "
                        + "{\"error\":\"pipeline hertzbeat_otlp_log_v1 not found\"}")
                .hasCauseInstanceOf(HttpClientErrorException.class);
    }

    @Test
    void shouldFallBackToStatusTextWhenGreptimeRejectionHasNoBody() {
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(byte[].class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.UNAUTHORIZED, "Unauthorized",
                        new HttpHeaders(), new byte[0], StandardCharsets.UTF_8));

        assertThatThrownBy(() -> storage.writeProtobuf("metrics", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("GreptimeDB rejected OTLP metrics (401): Unauthorized");
    }

    @Test
    void shouldKeepServerErrorsRetryable() {
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(byte[].class)))
                .thenThrow(HttpServerErrorException.create(HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable",
                        new HttpHeaders(), new byte[0], StandardCharsets.UTF_8));

        assertThatThrownBy(() -> storage.writeProtobuf("traces", new byte[0]))
                .isInstanceOf(HttpServerErrorException.class);
    }
}
