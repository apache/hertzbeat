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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.protobuf.InvalidProtocolBufferException;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.resource.v1.Resource;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.GZIPOutputStream;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class GreptimeOtlpForwarderTest {

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    @Mock
    private GreptimeProperties greptimeProperties;

    private GreptimeOtlpForwarder forwarder;

    @BeforeEach
    void setUp() {
        forwarder = new GreptimeOtlpForwarder(restTemplate, greptimePropertiesProvider);
    }

    @Test
    void forwardsLogsGrpcToGreptimeNativeOtlpEndpointWithRequiredHeaders() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertArrayEquals(request.toByteArray(), entity.getBody());
                    assertLogForwardHeaders(entity.getHeaders());
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(upstreamResponse, HttpStatus.OK));

        byte[] response = forwarder.forwardLogsGrpc(request);

        assertArrayEquals(upstreamResponse, response);
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void normalizesGzipJsonLogsHttpToProtobufBeforeForwardingToGreptime() throws Exception {
        byte[] jsonPayload = gzip("{\"resourceLogs\":[]}".getBytes(StandardCharsets.UTF_8));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.APPLICATION_JSON);
        requestHeaders.set(HttpHeaders.CONTENT_ENCODING, "gzip");
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertLogForwardHeaders(entity.getHeaders());
                    assertEquals(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF), entity.getHeaders().getContentType());
                    assertForwardedBodyIsValidLogsProtobuf(entity.getBody());
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(),
                        HttpStatus.OK));

        ResponseEntity<byte[]> response = forwarder.forwardLogsHttp(jsonPayload, requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void renamesReservedTimestampLogAttributeBeforeGreptimeNativeForwarding() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(stringAttribute("timestamp", "2026-04-29T12:00:00Z")))
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1L)
                                        .addAttributes(stringAttribute("timestamp", "2026-04-29T12:00:00Z"))
                                        .addAttributes(stringAttribute("event.name", "checkout")))))
                .build();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    ExportLogsServiceRequest forwarded = parseLogs(entity.getBody());
                    ResourceLogs forwardedResourceLogs = forwarded.getResourceLogs(0);
                    LogRecord forwardedLog = forwardedResourceLogs.getScopeLogs(0).getLogRecords(0);
                    assertEquals("log.timestamp", forwardedResourceLogs.getResource().getAttributes(0).getKey());
                    assertEquals("log.timestamp", forwardedLog.getAttributes(0).getKey());
                    assertEquals("event.name", forwardedLog.getAttributes(1).getKey());
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(),
                        HttpStatus.OK));

        forwarder.forwardLogsProtobuf(request.toByteArray());

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    private void configureGreptimeProperties() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(greptimeProperties.username()).thenReturn("demo");
        when(greptimeProperties.password()).thenReturn("secret");
    }

    private void assertLogForwardHeaders(HttpHeaders headers) {
        assertEquals(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF), headers.getContentType());
        assertEquals("public", headers.getFirst("X-Greptime-DB-Name"));
        assertEquals("hertzbeat_logs", headers.getFirst("X-Greptime-Log-Table-Name"));
        assertEquals("hertzbeat_otlp_log_v1", headers.getFirst("X-Greptime-Log-Pipeline-Name"));
        assertEquals("Basic " + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                headers.getFirst(HttpHeaders.AUTHORIZATION));
    }

    private void assertForwardedBodyIsValidLogsProtobuf(byte[] body) {
        try {
            ExportLogsServiceRequest.parseFrom(body);
        } catch (InvalidProtocolBufferException ex) {
            throw new AssertionError("Forwarded body is not an OTLP logs protobuf payload", ex);
        }
    }

    private ExportLogsServiceRequest parseLogs(byte[] body) {
        try {
            return ExportLogsServiceRequest.parseFrom(body);
        } catch (InvalidProtocolBufferException ex) {
            throw new AssertionError("Forwarded body is not an OTLP logs protobuf payload", ex);
        }
    }

    private KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value))
                .build();
    }

    private byte[] gzip(byte[] content) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try (GZIPOutputStream gzipOutputStream = new GZIPOutputStream(outputStream)) {
            gzipOutputStream.write(content);
        }
        return outputStream.toByteArray();
    }
}
