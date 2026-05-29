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

package org.apache.hertzbeat.observability.ingestion.error;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.rpc.Status;
import io.grpc.StatusRuntimeException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * Test case for {@link OtlpIngestionErrorResponseFactory}.
 */
class OtlpIngestionErrorResponseFactoryTest {

    private final OtlpIngestionErrorResponseFactory factory = new OtlpIngestionErrorResponseFactory();

    @Test
    void shouldMapGrpcStatusCodesToHttpStatusForAllOtlpSignals() {
        assertEquals(HttpStatus.BAD_REQUEST,
                factory.toHttpStatus(io.grpc.Status.INVALID_ARGUMENT.asRuntimeException()));
        assertEquals(HttpStatus.UNAUTHORIZED,
                factory.toHttpStatus(io.grpc.Status.UNAUTHENTICATED.asRuntimeException()));
        assertEquals(HttpStatus.FORBIDDEN,
                factory.toHttpStatus(io.grpc.Status.PERMISSION_DENIED.asRuntimeException()));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS,
                factory.toHttpStatus(io.grpc.Status.RESOURCE_EXHAUSTED.asRuntimeException()));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,
                factory.toHttpStatus(io.grpc.Status.UNAVAILABLE.asRuntimeException()));
        assertEquals(HttpStatus.GATEWAY_TIMEOUT,
                factory.toHttpStatus(io.grpc.Status.DEADLINE_EXCEEDED.asRuntimeException()));
    }

    @Test
    void shouldMapAdditionalGrpcClientStatusesToHttpStatusForOtlpHttpClients() {
        assertEquals(HttpStatus.NOT_FOUND,
                factory.toHttpStatus(io.grpc.Status.NOT_FOUND.asRuntimeException()));
        assertEquals(HttpStatus.CONFLICT,
                factory.toHttpStatus(io.grpc.Status.ALREADY_EXISTS.asRuntimeException()));
        assertEquals(HttpStatus.BAD_REQUEST,
                factory.toHttpStatus(io.grpc.Status.FAILED_PRECONDITION.asRuntimeException()));
        assertEquals(HttpStatus.CONFLICT,
                factory.toHttpStatus(io.grpc.Status.ABORTED.asRuntimeException()));
        assertEquals(HttpStatus.BAD_REQUEST,
                factory.toHttpStatus(io.grpc.Status.OUT_OF_RANGE.asRuntimeException()));
        assertEquals(HttpStatus.NOT_IMPLEMENTED,
                factory.toHttpStatus(io.grpc.Status.UNIMPLEMENTED.asRuntimeException()));
    }

    @Test
    void shouldBuildJsonGoogleRpcStatusForJsonOtlpHttpClients() {
        StatusRuntimeException exception = io.grpc.Status.UNAUTHENTICATED
                .withDescription("missing token")
                .asRuntimeException();

        ResponseEntity<byte[]> response = factory.httpErrorResponse(MediaType.APPLICATION_JSON, exception);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(MediaType.APPLICATION_JSON, response.getHeaders().getContentType());
        assertTrue(new String(response.getBody(), StandardCharsets.UTF_8).contains("missing token"));
        assertTrue(new String(response.getBody(), StandardCharsets.UTF_8).contains("\"code\": 16"));
    }

    @Test
    void shouldBuildBinaryGoogleRpcStatusForProtobufOtlpHttpClients() throws Exception {
        StatusRuntimeException exception = io.grpc.Status.RESOURCE_EXHAUSTED
                .withDescription("quota exceeded")
                .asRuntimeException();

        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), exception);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        Status status = Status.parseFrom(response.getBody());
        assertEquals(8, status.getCode());
        assertEquals("quota exceeded", status.getMessage());
    }

    @Test
    void shouldKeepBinaryGoogleRpcStatusForProtobufClientsWithWildcardAccept() throws Exception {
        StatusRuntimeException exception = io.grpc.Status.RESOURCE_EXHAUSTED
                .withDescription("quota exceeded")
                .asRuntimeException();

        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), List.of(MediaType.ALL), exception);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        Status status = Status.parseFrom(response.getBody());
        assertEquals(8, status.getCode());
        assertEquals("quota exceeded", status.getMessage());
    }

    @Test
    void shouldPreferHigherQualityProtobufAcceptOverJsonForErrors() throws Exception {
        StatusRuntimeException exception = io.grpc.Status.RESOURCE_EXHAUSTED
                .withDescription("quota exceeded")
                .asRuntimeException();

        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"),
                List.of(
                        MediaType.parseMediaType("application/json;q=0.1"),
                        MediaType.parseMediaType("application/x-protobuf;q=1.0")),
                exception);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        Status status = Status.parseFrom(response.getBody());
        assertEquals(8, status.getCode());
        assertEquals("quota exceeded", status.getMessage());
    }

    @Test
    void shouldPreserveJsonErrorResponseWhenAcceptQualityTiesRequestContentType() {
        StatusRuntimeException exception = io.grpc.Status.UNAUTHENTICATED
                .withDescription("missing token")
                .asRuntimeException();

        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.APPLICATION_JSON,
                List.of(
                        MediaType.parseMediaType("application/x-protobuf;q=1.0"),
                        MediaType.parseMediaType("application/json;q=1.0")),
                exception);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(MediaType.APPLICATION_JSON, response.getHeaders().getContentType());
        assertTrue(new String(response.getBody(), StandardCharsets.UTF_8).contains("missing token"));
        assertTrue(new String(response.getBody(), StandardCharsets.UTF_8).contains("\"code\": 16"));
    }

    @Test
    void shouldUseBinaryErrorWhenJsonAcceptRejectedButWildcardAllowsProtobuf() throws Exception {
        StatusRuntimeException exception = io.grpc.Status.UNAUTHENTICATED
                .withDescription("missing token")
                .asRuntimeException();

        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.APPLICATION_JSON,
                List.of(
                        MediaType.parseMediaType("application/json;q=0"),
                        MediaType.parseMediaType("*/*;q=1.0")),
                exception);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        Status status = Status.parseFrom(response.getBody());
        assertEquals(16, status.getCode());
        assertEquals("missing token", status.getMessage());
    }

    @Test
    void shouldMapExplicitHttpStatusErrorsToCanonicalGoogleRpcStatusCode() throws Exception {
        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), HttpStatus.BAD_REQUEST, "bad logs");

        Status status = Status.parseFrom(response.getBody());
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(3, status.getCode());
        assertEquals("bad logs", status.getMessage());
    }

    @Test
    void shouldMapExplicitRequestTimeoutToDeadlineExceededGoogleRpcStatusCode() throws Exception {
        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), HttpStatus.REQUEST_TIMEOUT,
                "backend request timeout");

        Status status = Status.parseFrom(response.getBody());
        assertEquals(HttpStatus.REQUEST_TIMEOUT, response.getStatusCode());
        assertEquals(4, status.getCode());
        assertEquals("backend request timeout", status.getMessage());
    }

    @Test
    void shouldMapExplicitPayloadTooLargeToResourceExhaustedGoogleRpcStatusCode() throws Exception {
        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), HttpStatus.PAYLOAD_TOO_LARGE,
                "payload too large");

        Status status = Status.parseFrom(response.getBody());
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, response.getStatusCode());
        assertEquals(8, status.getCode());
        assertEquals("payload too large", status.getMessage());
    }

    @Test
    void shouldMapExplicitBadGatewayToUnavailableGoogleRpcStatusCode() throws Exception {
        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), HttpStatus.BAD_GATEWAY,
                "backend gateway unavailable");

        Status status = Status.parseFrom(response.getBody());
        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertEquals(14, status.getCode());
        assertEquals("backend gateway unavailable", status.getMessage());
    }

    @Test
    void shouldMapExplicitOtlpClientPayloadErrorsToInvalidArgumentGoogleRpcStatusCode() throws Exception {
        ResponseEntity<byte[]> unsupportedMediaTypeResponse = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "unsupported content type");
        ResponseEntity<byte[]> unprocessableEntityResponse = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), HttpStatus.UNPROCESSABLE_ENTITY,
                "invalid otlp payload");

        Status unsupportedMediaTypeStatus = Status.parseFrom(unsupportedMediaTypeResponse.getBody());
        Status unprocessableEntityStatus = Status.parseFrom(unprocessableEntityResponse.getBody());
        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, unsupportedMediaTypeResponse.getStatusCode());
        assertEquals(3, unsupportedMediaTypeStatus.getCode());
        assertEquals("unsupported content type", unsupportedMediaTypeStatus.getMessage());
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, unprocessableEntityResponse.getStatusCode());
        assertEquals(3, unprocessableEntityStatus.getCode());
        assertEquals("invalid otlp payload", unprocessableEntityStatus.getMessage());
    }

    @Test
    void shouldMapExplicitBackendParityStatusesToCanonicalGoogleRpcStatusCode() throws Exception {
        assertExplicitStatusCode(HttpStatus.NOT_ACCEPTABLE, 3, "backend content negotiation failed");
        assertExplicitStatusCode(HttpStatus.NOT_FOUND, 5, "backend path missing");
        assertExplicitStatusCode(HttpStatus.CONFLICT, 10, "backend conflict");
        assertExplicitStatusCode(HttpStatus.LOCKED, 10, "backend locked");
        assertExplicitStatusCode(HttpStatus.PRECONDITION_FAILED, 9, "backend precondition failed");
        assertExplicitStatusCode(HttpStatus.PRECONDITION_REQUIRED, 9, "backend precondition required");
        assertExplicitStatusCode(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, 11, "backend range rejected");
        assertExplicitStatusCode(HttpStatus.METHOD_NOT_ALLOWED, 12, "backend method unsupported");
        assertExplicitStatusCode(HttpStatus.NOT_IMPLEMENTED, 12, "backend endpoint unimplemented");
        assertExplicitStatusCode(HttpStatus.TOO_EARLY, 14, "backend asks client to retry later");
        assertExplicitStatusCode(HttpStatus.REQUEST_HEADER_FIELDS_TOO_LARGE, 8, "backend metadata too large");
        assertExplicitStatusCode(HttpStatus.INSUFFICIENT_STORAGE, 8, "backend storage exhausted");
    }

    private void assertExplicitStatusCode(HttpStatus httpStatus, int expectedGrpcCode, String message)
            throws Exception {
        ResponseEntity<byte[]> response = factory.httpErrorResponse(
                MediaType.parseMediaType("application/x-protobuf"), httpStatus, message);

        Status status = Status.parseFrom(response.getBody());
        assertEquals(httpStatus, response.getStatusCode());
        assertEquals(expectedGrpcCode, status.getCode());
        assertEquals(message, status.getMessage());
    }
}
