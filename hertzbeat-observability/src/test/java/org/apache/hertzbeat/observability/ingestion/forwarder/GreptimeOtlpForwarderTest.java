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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.protobuf.InvalidProtocolBufferException;
import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
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
import org.springframework.web.client.ResourceAccessException;
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
    void forwardLogsGrpcTrimsAndNormalizesGreptimeEndpointBeforeForwarding() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        configureGreptimeProperties("  http://greptime:4000///  ");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
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
    void logsGrpcGreptimePropertiesLookupFailureThrowsUnavailable() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenThrow(new IllegalStateException("greptime properties unavailable"));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(ExportLogsServiceRequest.getDefaultInstance()));

        assertEquals(Status.Code.UNAVAILABLE, exception.getStatus().getCode());
        assertEquals("OTLP backend is not configured.", exception.getStatus().getDescription());
        verify(restTemplate, org.mockito.Mockito.never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(byte[].class));
    }

    @Test
    void retriesTransientLogForwardFailureOnceBeforeReturningResponse() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenThrow(new ResourceAccessException("connection reset"))
                .thenReturn(new ResponseEntity<>(upstreamResponse, HttpStatus.OK));

        byte[] response = forwarder.forwardLogsGrpc(request);

        assertArrayEquals(upstreamResponse, response);
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void retriesRetryableLogForwardStatusOnceBeforeReturningResponse() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(new ResponseEntity<>(upstreamResponse, HttpStatus.OK));

        byte[] response = forwarder.forwardLogsGrpc(request);

        assertArrayEquals(upstreamResponse, response);
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void retriesNullLogForwardResponseBeforeReturningUnavailable() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(null)
                .thenReturn(null);

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.UNAVAILABLE, exception.getStatus().getCode());
        assertEquals("OTLP backend returned no response.", exception.getStatus().getDescription());
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendTooManyRequestsThrowsResourceExhaustedAfterRetries() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.TOO_MANY_REQUESTS))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.TOO_MANY_REQUESTS));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 429 TOO_MANY_REQUESTS", exception.getStatus().getDescription());
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendInternalServerErrorThrowsInternalWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.INTERNAL_SERVER_ERROR));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.INTERNAL, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 500 INTERNAL_SERVER_ERROR", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendNotFoundThrowsNotFoundWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.NOT_FOUND));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.NOT_FOUND, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 404 NOT_FOUND", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendConflictThrowsAbortedWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.CONFLICT));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.ABORTED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 409 CONFLICT", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendLockedThrowsAbortedWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.LOCKED));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.ABORTED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 423 LOCKED", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendTooEarlyThrowsUnavailableAndRetries() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.TOO_EARLY))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.TOO_EARLY));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.UNAVAILABLE, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 425 TOO_EARLY", exception.getStatus().getDescription());
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendMethodNotAllowedThrowsUnimplementedWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.METHOD_NOT_ALLOWED));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.UNIMPLEMENTED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 405 METHOD_NOT_ALLOWED", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendNotAcceptableThrowsInvalidArgumentWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.NOT_ACCEPTABLE));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.INVALID_ARGUMENT, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 406 NOT_ACCEPTABLE", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendRequestHeadersTooLargeThrowsResourceExhaustedWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.REQUEST_HEADER_FIELDS_TOO_LARGE));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 431 REQUEST_HEADER_FIELDS_TOO_LARGE",
                exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendInsufficientStorageThrowsResourceExhaustedWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.INSUFFICIENT_STORAGE));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 507 INSUFFICIENT_STORAGE", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendPreconditionFailedThrowsFailedPreconditionWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.PRECONDITION_FAILED));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.FAILED_PRECONDITION, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 412 PRECONDITION_FAILED", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendPreconditionRequiredThrowsFailedPreconditionWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.PRECONDITION_REQUIRED));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.FAILED_PRECONDITION, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 428 PRECONDITION_REQUIRED", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendRangeNotSatisfiableThrowsOutOfRangeWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.OUT_OF_RANGE, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 416 REQUESTED_RANGE_NOT_SATISFIABLE",
                exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendNotImplementedThrowsUnimplementedWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.NOT_IMPLEMENTED));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.UNIMPLEMENTED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 501 NOT_IMPLEMENTED", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendTooManyRequestsPropagatesRetryAfterTrailerAfterRetries() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], retryAfterHeaders("0"), HttpStatus.TOO_MANY_REQUESTS))
                .thenReturn(new ResponseEntity<>(new byte[0], retryAfterHeaders("0"), HttpStatus.TOO_MANY_REQUESTS));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, exception.getStatus().getCode());
        assertNotNull(exception.getTrailers());
        assertEquals("0", exception.getTrailers().get(
                Metadata.Key.of("retry-after", Metadata.ASCII_STRING_MARSHALLER)));
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendTooManyRequestsDropsMalformedRetryAfterTrailerAfterRetries() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], retryAfterHeaders("not-a-retry-after"),
                        HttpStatus.TOO_MANY_REQUESTS))
                .thenReturn(new ResponseEntity<>(new byte[0], retryAfterHeaders("not-a-retry-after"),
                        HttpStatus.TOO_MANY_REQUESTS));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, exception.getStatus().getCode());
        assertNull(exception.getTrailers());
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendRequestTimeoutThrowsDeadlineExceededAfterRetries() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.REQUEST_TIMEOUT))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.REQUEST_TIMEOUT));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.DEADLINE_EXCEEDED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 408 REQUEST_TIMEOUT", exception.getStatus().getDescription());
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendGatewayTimeoutThrowsDeadlineExceededAfterRetries() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.GATEWAY_TIMEOUT))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.GATEWAY_TIMEOUT));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.DEADLINE_EXCEEDED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 504 GATEWAY_TIMEOUT", exception.getStatus().getDescription());
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendBadRequestThrowsInvalidArgumentWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.BAD_REQUEST));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.INVALID_ARGUMENT, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 400 BAD_REQUEST", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendUnsupportedMediaTypeThrowsInvalidArgumentWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.UNSUPPORTED_MEDIA_TYPE));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.INVALID_ARGUMENT, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 415 UNSUPPORTED_MEDIA_TYPE", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendUnprocessableEntityThrowsInvalidArgumentWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.UNPROCESSABLE_ENTITY));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.INVALID_ARGUMENT, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 422 UNPROCESSABLE_ENTITY", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendForbiddenThrowsPermissionDeniedWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.FORBIDDEN));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.PERMISSION_DENIED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 403 FORBIDDEN", exception.getStatus().getDescription());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void logsGrpcBackendPayloadTooLargeThrowsResourceExhaustedWithoutRetry() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0], HttpStatus.PAYLOAD_TOO_LARGE));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> forwarder.forwardLogsGrpc(request));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, exception.getStatus().getCode());
        assertEquals("OTLP backend returned 413 PAYLOAD_TOO_LARGE", exception.getStatus().getDescription());
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
    void forwardLogsHttpGzipContentEncodingWithOptionalWhitespaceStillDecodesBeforeForwarding() throws Exception {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(stringAttribute("service.name", "checkout")))
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1L)
                                        .setBody(AnyValue.newBuilder().setStringValue("hello").build()))))
                .build();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF));
        requestHeaders.set(HttpHeaders.CONTENT_ENCODING, " gzip ");
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertLogForwardHeaders(entity.getHeaders());
                    assertEquals(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF), entity.getHeaders().getContentType());
                    ExportLogsServiceRequest forwarded = parseLogs(entity.getBody());
                    LogRecord forwardedLog = forwarded.getResourceLogs(0).getScopeLogs(0).getLogRecords(0);
                    assertEquals("hello", forwardedLog.getBody().getStringValue());
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(upstreamResponse, HttpStatus.OK));

        ResponseEntity<byte[]> response = forwarder.forwardLogsHttp(gzip(request.toByteArray()), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(upstreamResponse, response.getBody());
    }

    @Test
    void forwardLogsHttpGzipContentEncodingWithBlankFirstValueStillDecodesBeforeForwarding() throws Exception {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(stringAttribute("service.name", "checkout")))
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1L)
                                        .setBody(AnyValue.newBuilder().setStringValue("multi-value").build()))))
                .build();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, " ");
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, "gzip");
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertLogForwardHeaders(entity.getHeaders());
                    assertEquals(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF), entity.getHeaders().getContentType());
                    ExportLogsServiceRequest forwarded = parseLogs(entity.getBody());
                    LogRecord forwardedLog = forwarded.getResourceLogs(0).getScopeLogs(0).getLogRecords(0);
                    assertEquals("multi-value", forwardedLog.getBody().getStringValue());
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(upstreamResponse, HttpStatus.OK));

        ResponseEntity<byte[]> response = forwarder.forwardLogsHttp(gzip(request.toByteArray()), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(upstreamResponse, response.getBody());
    }

    @Test
    void forwardLogsHttpGzipContentEncodingWithCommaSeparatedBlankValueStillDecodesBeforeForwarding() throws Exception {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(stringAttribute("service.name", "checkout")))
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1L)
                                        .setBody(AnyValue.newBuilder().setStringValue("comma-value").build()))))
                .build();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, " , gzip ");
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertLogForwardHeaders(entity.getHeaders());
                    assertEquals(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF), entity.getHeaders().getContentType());
                    ExportLogsServiceRequest forwarded = parseLogs(entity.getBody());
                    LogRecord forwardedLog = forwarded.getResourceLogs(0).getScopeLogs(0).getLogRecords(0);
                    assertEquals("comma-value", forwardedLog.getBody().getStringValue());
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(upstreamResponse, HttpStatus.OK));

        ResponseEntity<byte[]> response = forwarder.forwardLogsHttp(gzip(request.toByteArray()), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(upstreamResponse, response.getBody());
    }

    @Test
    void forwardLogsHttpWithNullBodyUsesEmptyProtobufRequest() {
        HttpHeaders requestHeaders = new HttpHeaders();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        configureGreptimeProperties();
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertLogForwardHeaders(entity.getHeaders());
                    assertEquals(ExportLogsServiceRequest.getDefaultInstance(), parseLogs(entity.getBody()));
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(upstreamResponse, HttpStatus.OK));

        ResponseEntity<byte[]> response = forwarder.forwardLogsHttp(null, requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(upstreamResponse, response.getBody());
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(byte[].class));
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

    @Test
    void redactsSensitiveLogsBeforeGreptimeNativeForwarding() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(stringAttribute("service.name", "checkout"))
                                .addAttributes(stringAttribute("cloud.auth.token", "resource-token")))
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1L)
                                        .setBody(AnyValue.newBuilder()
                                                .setStringValue("failed login password=hunter2 token=abc123")
                                                .build())
                                        .addAttributes(stringAttribute(
                                                "http.request.header.authorization", "Bearer live-token"))
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
                    assertEquals("checkout",
                            forwardedResourceLogs.getResource().getAttributes(0).getValue().getStringValue());
                    assertEquals("[REDACTED]",
                            forwardedResourceLogs.getResource().getAttributes(1).getValue().getStringValue());
                    assertEquals("failed login password=[REDACTED] token=[REDACTED]",
                            forwardedLog.getBody().getStringValue());
                    assertEquals("[REDACTED]", forwardedLog.getAttributes(0).getValue().getStringValue());
                    assertEquals("checkout", forwardedLog.getAttributes(1).getValue().getStringValue());
                    assertFalse(forwarded.toString().contains("resource-token"));
                    assertFalse(forwarded.toString().contains("hunter2"));
                    assertFalse(forwarded.toString().contains("abc123"));
                    assertFalse(forwarded.toString().contains("live-token"));
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

    @Test
    void forwardLogsGrpcTrimsGreptimeDatabaseHeaderBeforeForwarding() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        configureGreptimeProperties("http://greptime:4000", " public ");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertEquals("public", entity.getHeaders().getFirst("X-Greptime-DB-Name"));
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
    void forwardLogsGrpcTrimsGreptimeBasicAuthCredentialsBeforeForwarding() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        byte[] upstreamResponse = ExportLogsServiceResponse.getDefaultInstance().toByteArray();
        configureGreptimeProperties();
        when(greptimeProperties.username()).thenReturn(" demo ");
        when(greptimeProperties.password()).thenReturn(" secret ");
        String expectedAuthorization = "Basic "
                + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/logs"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertEquals(expectedAuthorization, entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(upstreamResponse, HttpStatus.OK));

        byte[] response = forwarder.forwardLogsGrpc(request);

        assertArrayEquals(upstreamResponse, response);
    }

    private void configureGreptimeProperties() {
        configureGreptimeProperties("http://greptime:4000");
    }

    private void configureGreptimeProperties(String httpEndpoint) {
        configureGreptimeProperties(httpEndpoint, "public");
    }

    private void configureGreptimeProperties(String httpEndpoint, String database) {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn(httpEndpoint);
        when(greptimeProperties.database()).thenReturn(database);
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

    private HttpHeaders retryAfterHeaders(String retryAfter) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, retryAfter);
        return headers;
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
