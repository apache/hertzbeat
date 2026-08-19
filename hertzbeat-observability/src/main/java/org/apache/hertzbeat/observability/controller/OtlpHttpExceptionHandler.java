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

import com.fasterxml.jackson.core.io.JsonStringEncoder;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import com.google.rpc.Code;
import com.google.rpc.Status;
import jakarta.servlet.http.HttpServletRequest;

import java.nio.charset.StandardCharsets;
import java.util.Objects;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.support.exception.StorageUnavailableException;
import org.apache.hertzbeat.observability.service.SignalQueryRejectedException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;
import org.springframework.web.method.HandlerMethod;

/**
 * Maps OTLP/HTTP ingestion failures to the response shape the OTLP specification requires.
 *
 * <p>Every non-2xx response carries a {@code google.rpc.Status} body encoded in the same format the
 * client used for the request (JSON for {@code application/json}, binary protobuf otherwise), so OTLP
 * exporters and collectors can surface the rejection reason instead of an opaque status code. Retryable
 * failures (overload, storage unavailable) additionally carry {@code Retry-After}. Deprecated 1.8 alias
 * routes keep their {@code Deprecation} / {@code Link} headers on error responses too.
 *
 * <p>This advice is scoped to the OTLP ingestion controllers only and runs ahead of
 * {@link SignalWorkloadExceptionHandler}, whose {@code Message} JSON envelope is meant for the HertzBeat
 * query API rather than OTLP clients.
 *
 * @see <a href="https://opentelemetry.io/docs/specs/otlp/#failures-1">OTLP/HTTP failures</a>
 */
@Slf4j
@RestControllerAdvice(assignableTypes = {
    OtlpLogController.class,
    OtlpSignalController.class,
    LegacyOtlpLogRouteController.class
})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OtlpHttpExceptionHandler {

    static final MediaType PROTOBUF = MediaType.parseMediaType("application/x-protobuf");

    private static final String RETRY_AFTER_SECONDS = "1";
    private static final String UNKNOWN_ERROR = "Unknown error";
    private static final String STORAGE_UNAVAILABLE = "GreptimeDB storage is unavailable";

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<byte[]> handleInvalidPayload(IllegalArgumentException exception,
                                                       HttpServletRequest request,
                                                       HandlerMethod handlerMethod) {
        String message = messageOf(exception);
        // Covers both malformed payloads and GreptimeDB 4xx rejections; the message is the only place
        // the rejection reason survives, so record it server-side as well.
        log.warn("OTLP/HTTP {} rejected as invalid: {}", request.getRequestURI(), message);
        return respond(HttpStatus.BAD_REQUEST, Code.INVALID_ARGUMENT, message, request, handlerMethod, false);
    }

    @ExceptionHandler(SignalQueryRejectedException.class)
    public ResponseEntity<byte[]> handleOverloaded(SignalQueryRejectedException exception,
                                                   HttpServletRequest request,
                                                   HandlerMethod handlerMethod) {
        String message = messageOf(exception);
        // Back-pressure is expected under load; keep it below warn to avoid log storms.
        log.debug("OTLP/HTTP {} throttled: {}", request.getRequestURI(), message);
        return respond(HttpStatus.TOO_MANY_REQUESTS, Code.RESOURCE_EXHAUSTED, message, request, handlerMethod, true);
    }

    @ExceptionHandler(StorageUnavailableException.class)
    public ResponseEntity<byte[]> handleStorageUnavailable(StorageUnavailableException exception,
                                                           HttpServletRequest request,
                                                           HandlerMethod handlerMethod) {
        String message = messageOf(exception);
        log.error("OTLP/HTTP {} failed, storage unavailable: {}", request.getRequestURI(), message, exception);
        return respond(HttpStatus.SERVICE_UNAVAILABLE, Code.UNAVAILABLE, message, request, handlerMethod, true);
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<byte[]> handleStorageClientFailure(RestClientException exception,
                                                             HttpServletRequest request,
                                                             HandlerMethod handlerMethod) {
        log.error("OTLP/HTTP {} failed, GreptimeDB write error: {}", request.getRequestURI(),
            messageOf(exception), exception);
        // Do not echo transport details (endpoints, raw 5xx bodies) back to the exporter.
        return respond(HttpStatus.SERVICE_UNAVAILABLE, Code.UNAVAILABLE, STORAGE_UNAVAILABLE,
            request, handlerMethod, true);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<byte[]> handleUnexpected(Exception exception,
                                                   HttpServletRequest request,
                                                   HandlerMethod handlerMethod) {
        String message = messageOf(exception);
        if (exception instanceof ErrorResponse errorResponse) {
            // Spring MVC's own request-level failures (missing body, unsupported method, ...) already carry
            // the right status; keep it instead of degrading a client error into a 500.
            HttpStatus status = HttpStatus.valueOf(errorResponse.getStatusCode().value());
            log.warn("OTLP/HTTP {} rejected ({}): {}", request.getRequestURI(), status.value(), message);
            return respond(status, status.is4xxClientError() ? Code.INVALID_ARGUMENT : Code.INTERNAL,
                message, request, handlerMethod, false);
        }
        log.error("OTLP/HTTP {} failed unexpectedly: {}", request.getRequestURI(), message, exception);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, Code.INTERNAL, message, request, handlerMethod, false);
    }

    private static ResponseEntity<byte[]> respond(HttpStatus status, Code code, String message,
                                                  HttpServletRequest request, HandlerMethod handlerMethod,
                                                  boolean retryable) {
        Status rpcStatus = Status.newBuilder().setCode(code.getNumber()).setMessage(message).build();
        boolean json = isJsonRequest(request);
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(status)
            .contentType(json ? MediaType.APPLICATION_JSON : PROTOBUF);
        if (retryable) {
            builder.header(HttpHeaders.RETRY_AFTER, RETRY_AFTER_SECONDS);
        }
        if (handlerMethod != null
            && LegacyOtlpLogRouteController.class.isAssignableFrom(handlerMethod.getBeanType())) {
            LegacyOtlpLogRouteController.deprecated(builder);
        }
        return builder.body(json ? toJson(rpcStatus) : rpcStatus.toByteArray());
    }

    private static boolean isJsonRequest(HttpServletRequest request) {
        String contentType = request.getContentType();
        if (contentType == null) {
            return false;
        }
        try {
            return MediaType.APPLICATION_JSON.includes(MediaType.parseMediaType(contentType));
        } catch (InvalidMediaTypeException exception) {
            return false;
        }
    }

    private static byte[] toJson(Status status) {
        String json;
        try {
            json = JsonFormat.printer().omittingInsignificantWhitespace().print(status);
        } catch (InvalidProtocolBufferException exception) {
            json = "{\"code\":" + status.getCode() + ",\"message\":\""
                + new String(JsonStringEncoder.getInstance().quoteAsString(status.getMessage())) + "\"}";
        }
        return json.getBytes(StandardCharsets.UTF_8);
    }

    private static String messageOf(Throwable throwable) {
        return Objects.requireNonNullElse(throwable.getMessage(), UNKNOWN_ERROR);
    }
}
