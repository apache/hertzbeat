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

package org.apache.hertzbeat.observability.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.warehouse.service.OtlpSignalStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Greptime native OTLP forwarding tests. */
@ExtendWith(MockitoExtension.class)
class GreptimeOtlpSignalForwarderTest {

    @Mock
    private OtlpSignalStorage signalStorage;

    @Test
    void shouldConvertJsonBeforeWritingMetrics() {
        when(signalStorage.writeProtobuf(eq("metrics"), any())).thenReturn(new byte[0]);
        GreptimeOtlpSignalForwarder forwarder = new GreptimeOtlpSignalForwarder(signalStorage);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<byte[]> response = forwarder.forwardHttp("metrics", "{}".getBytes(StandardCharsets.UTF_8),
                headers);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        ArgumentCaptor<byte[]> content = ArgumentCaptor.forClass(byte[].class);
        verify(signalStorage).writeProtobuf(eq("metrics"), content.capture());
        assertThat(content.getValue()).isEqualTo(ExportMetricsServiceRequest.getDefaultInstance().toByteArray());
    }

    @Test
    void shouldAcceptStandardHexTraceIdsInOtlpJson() throws Exception {
        when(signalStorage.writeProtobuf(eq("traces"), any())).thenReturn(new byte[0]);
        GreptimeOtlpSignalForwarder forwarder = new GreptimeOtlpSignalForwarder(signalStorage);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"resourceSpans\":[{\"scopeSpans\":[{\"spans\":[{"
                + "\"traceId\":\"0123456789abcdef0123456789abcdef\","
                + "\"spanId\":\"0123456789abcdef\","
                + "\"parentSpanId\":\"fedcba9876543210\",\"name\":\"probe\"}]}]}]}";

        forwarder.forwardHttp("traces", json.getBytes(StandardCharsets.UTF_8), headers);

        ArgumentCaptor<byte[]> content = ArgumentCaptor.forClass(byte[].class);
        verify(signalStorage).writeProtobuf(eq("traces"), content.capture());
        ExportTraceServiceRequest parsed = ExportTraceServiceRequest.parseFrom(content.getValue());
        assertThat(parsed.getResourceSpans(0).getScopeSpans(0).getSpans(0).getTraceId().toByteArray())
                .containsExactly(java.util.HexFormat.of().parseHex("0123456789abcdef0123456789abcdef"));
        assertThat(parsed.getResourceSpans(0).getScopeSpans(0).getSpans(0).getParentSpanId().toByteArray())
                .containsExactly(java.util.HexFormat.of().parseHex("fedcba9876543210"));
    }

    @Test
    void shouldRejectMalformedJsonBeforeCallingGreptime() {
        GreptimeOtlpSignalForwarder forwarder = new GreptimeOtlpSignalForwarder(signalStorage);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        assertThatThrownBy(() -> forwarder.forwardHttp("metrics", "{".getBytes(StandardCharsets.UTF_8), headers))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Malformed OTLP JSON payload");
        verifyNoInteractions(signalStorage);
    }

    @Test
    void shouldRejectMalformedProtobufBeforeCallingGreptime() {
        GreptimeOtlpSignalForwarder forwarder = new GreptimeOtlpSignalForwarder(signalStorage);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        assertThatThrownBy(() -> forwarder.forwardHttp("traces", new byte[] {(byte) 0xff}, headers))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Malformed OTLP traces protobuf payload");
        verifyNoInteractions(signalStorage);
    }
}
