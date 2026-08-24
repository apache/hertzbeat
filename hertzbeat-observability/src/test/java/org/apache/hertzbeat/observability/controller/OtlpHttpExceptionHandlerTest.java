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

package org.apache.hertzbeat.observability.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.google.protobuf.util.JsonFormat;
import com.google.rpc.Code;
import com.google.rpc.Status;
import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.common.support.exception.StorageUnavailableException;
import org.apache.hertzbeat.observability.service.OtlpLogIngestionService;
import org.apache.hertzbeat.observability.service.SignalQueryRejectedException;
import org.apache.hertzbeat.observability.service.SignalWorkloadGuard;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.method.HandlerMethod;

/** OTLP/HTTP failure response contract tests. */
class OtlpHttpExceptionHandlerTest {

    private final OtlpHttpExceptionHandler handler = new OtlpHttpExceptionHandler();

    @Test
    void shouldEncodeRpcStatusAsJsonForJsonRequests() throws Exception {
        ResponseEntity<byte[]> response = handler.handleInvalidPayload(
                new IllegalArgumentException("Malformed OTLP metrics JSON payload"),
                request(MediaType.APPLICATION_JSON_VALUE), null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(MediaType.APPLICATION_JSON, response.getHeaders().getContentType());
        assertNull(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        Status status = parseJson(response.getBody());
        assertEquals(Code.INVALID_ARGUMENT.getNumber(), status.getCode());
        assertEquals("Malformed OTLP metrics JSON payload", status.getMessage());
    }

    @Test
    void shouldEncodeRpcStatusAsProtobufForProtobufRequests() throws Exception {
        ResponseEntity<byte[]> response = handler.handleInvalidPayload(
                new IllegalArgumentException("Malformed OTLP metrics protobuf payload"),
                request("application/x-protobuf"), null);

        assertEquals(OtlpHttpExceptionHandler.PROTOBUF, response.getHeaders().getContentType());
        Status status = Status.parseFrom(response.getBody());
        assertEquals(Code.INVALID_ARGUMENT.getNumber(), status.getCode());
        assertEquals("Malformed OTLP metrics protobuf payload", status.getMessage());
    }

    @Test
    void shouldFallBackToProtobufWhenContentTypeIsMissingOrUnparseable() throws Exception {
        for (String contentType : new String[] {null, "not a media type"}) {
            ResponseEntity<byte[]> response = handler.handleInvalidPayload(
                    new IllegalArgumentException("bad"), request(contentType), null);

            assertEquals(OtlpHttpExceptionHandler.PROTOBUF, response.getHeaders().getContentType());
            assertEquals("bad", Status.parseFrom(response.getBody()).getMessage());
        }
    }

    @Test
    void shouldNotFailWhenExceptionMessageIsNull() throws Exception {
        ResponseEntity<byte[]> response = handler.handleInvalidPayload(
                new IllegalArgumentException(), request(MediaType.APPLICATION_JSON_VALUE), null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Unknown error", parseJson(response.getBody()).getMessage());
    }

    @Test
    void shouldReturnRetryableTooManyRequestsWhenOverloaded() throws Exception {
        ResponseEntity<byte[]> response = handler.handleOverloaded(
                new SignalQueryRejectedException("OTLP_WRITE"), request(MediaType.APPLICATION_JSON_VALUE), null);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("1", response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        assertEquals(Code.RESOURCE_EXHAUSTED.getNumber(), parseJson(response.getBody()).getCode());
    }

    @Test
    void shouldReturnRetryableServiceUnavailableWhenStorageIsDown() throws Exception {
        ResponseEntity<byte[]> response = handler.handleStorageUnavailable(
                new StorageUnavailableException("GreptimeDB log storage is unavailable", new RuntimeException()),
                request(MediaType.APPLICATION_JSON_VALUE), null);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("1", response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        Status status = parseJson(response.getBody());
        assertEquals(Code.UNAVAILABLE.getNumber(), status.getCode());
        assertEquals("GreptimeDB log storage is unavailable", status.getMessage());
    }

    @Test
    void shouldHideTransportDetailsForGreptimeClientFailures() throws Exception {
        ResponseEntity<byte[]> response = handler.handleStorageClientFailure(
                new HttpServerErrorException(HttpStatus.BAD_GATEWAY, "upstream http://greptime:4000 exploded"),
                request(MediaType.APPLICATION_JSON_VALUE), null);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("1", response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        assertEquals("GreptimeDB storage is unavailable", parseJson(response.getBody()).getMessage());
    }

    @Test
    void shouldReturnInternalErrorStatusForUnexpectedFailures() throws Exception {
        ResponseEntity<byte[]> response = handler.handleUnexpected(
                new NullPointerException("boom"), request(MediaType.APPLICATION_JSON_VALUE), null);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNull(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        Status status = parseJson(response.getBody());
        assertEquals(Code.INTERNAL.getNumber(), status.getCode());
        // The exporter gets a fixed phrase; the real cause only reaches the server log.
        assertEquals("Unexpected OTLP ingestion failure", status.getMessage());
        assertFalse(status.getMessage().contains("boom"));
    }

    /**
     * A missing body is raised while spring resolves the arguments, so it never reaches the
     * controller and is not an {@code ErrorResponse}. It must still answer 400 rather than 500:
     * OTLP exporters replay 5xx, so a permanently malformed client would retry forever.
     */
    @Test
    void shouldRejectUnreadableBodyAsNonRetryableClientError() throws Exception {
        HttpMessageNotReadableException exception = new HttpMessageNotReadableException(
                "Required request body is missing: public org.springframework.http.ResponseEntity<byte[]> "
                        + "org.apache.hertzbeat.observability.controller.OtlpLogController.logs(byte[])",
                new MockHttpInputMessage(new byte[0]));

        ResponseEntity<byte[]> response = handler.handleUnreadableBody(
                exception, request(MediaType.APPLICATION_JSON_VALUE), null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNull(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        Status status = parseJson(response.getBody());
        assertEquals(Code.INVALID_ARGUMENT.getNumber(), status.getCode());
        assertEquals("Malformed or missing OTLP request body", status.getMessage());
        // The framework message names the handler method; that must not travel back to the caller.
        assertFalse(status.getMessage().contains("org.apache.hertzbeat"));
    }

    @Test
    void shouldKeepSpringMvcClientErrorStatusInsteadOfInternalError() throws Exception {
        ResponseEntity<byte[]> response = handler.handleUnexpected(
                new HttpRequestMethodNotSupportedException("GET"), request(MediaType.APPLICATION_JSON_VALUE), null);

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertEquals(Code.INVALID_ARGUMENT.getNumber(), parseJson(response.getBody()).getCode());
    }

    @Test
    void shouldKeepDeprecationHeadersOnLegacyRouteErrors() throws Exception {
        LegacyOtlpLogRouteController legacy = new LegacyOtlpLogRouteController(
                mock(OtlpLogIngestionService.class), new SignalWorkloadGuard());
        HandlerMethod legacyHandler = new HandlerMethod(legacy,
                LegacyOtlpLogRouteController.class.getMethod("legacyOtlpLogs", byte[].class, HttpHeaders.class));

        ResponseEntity<byte[]> response = handler.handleInvalidPayload(
                new IllegalArgumentException("bad"), request(MediaType.APPLICATION_JSON_VALUE), legacyHandler);

        assertEquals("true", response.getHeaders().getFirst("Deprecation"));
        assertTrue(response.getHeaders().getFirst("Link").contains(LegacyOtlpLogRouteController.CANONICAL_LOGS_ROUTE));
    }

    private static MockHttpServletRequest request(String contentType) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/otlp/v1/metrics");
        if (contentType != null) {
            request.setContentType(contentType);
        }
        return request;
    }

    private static Status parseJson(byte[] body) throws Exception {
        Status.Builder builder = Status.newBuilder();
        JsonFormat.parser().merge(new String(body, StandardCharsets.UTF_8), builder);
        return builder.build();
    }
}
