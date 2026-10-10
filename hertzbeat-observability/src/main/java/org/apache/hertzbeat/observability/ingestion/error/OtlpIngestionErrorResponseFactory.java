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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import io.grpc.StatusRuntimeException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Shared OTLP HTTP error response factory for all ingested signals.
 */
@Component
public class OtlpIngestionErrorResponseFactory {

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";
    private static final MediaType MEDIA_TYPE_PROTOBUF = MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF);
    private static final MediaType MEDIA_TYPE_PROTOBUF_ALT = MediaType.parseMediaType("application/protobuf");
    private static final String DEFAULT_ERROR_MESSAGE = "OTLP signal ingestion failed.";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public ResponseEntity<byte[]> httpErrorResponse(MediaType contentType, StatusRuntimeException exception) {
        return httpErrorResponse(contentType, List.of(), toHttpStatus(exception), statusCode(exception),
                statusDescription(exception), OtlpIngestionBackpressureHeaders.retryAfter(exception));
    }

    public ResponseEntity<byte[]> httpErrorResponse(MediaType contentType, List<MediaType> acceptTypes,
                                                    StatusRuntimeException exception) {
        return httpErrorResponse(contentType, acceptTypes, toHttpStatus(exception), statusCode(exception),
                statusDescription(exception), OtlpIngestionBackpressureHeaders.retryAfter(exception));
    }

    public ResponseEntity<byte[]> httpErrorResponse(MediaType contentType, HttpStatus status, String message) {
        return httpErrorResponse(contentType, status, grpcCode(status), message);
    }

    public ResponseEntity<byte[]> httpErrorResponse(MediaType contentType, List<MediaType> acceptTypes,
                                                    HttpStatus status, String message) {
        return httpErrorResponse(contentType, acceptTypes, status, grpcCode(status), message);
    }

    private ResponseEntity<byte[]> httpErrorResponse(MediaType contentType, HttpStatus status, int grpcCode,
                                                     String message) {
        return httpErrorResponse(contentType, List.of(), status, grpcCode, message, null);
    }

    private ResponseEntity<byte[]> httpErrorResponse(MediaType contentType, List<MediaType> acceptTypes,
                                                     HttpStatus status, int grpcCode, String message) {
        return httpErrorResponse(contentType, acceptTypes, status, grpcCode, message, null);
    }

    private ResponseEntity<byte[]> httpErrorResponse(MediaType contentType, List<MediaType> acceptTypes,
                                                     HttpStatus status, int grpcCode, String message,
                                                     String retryAfter) {
        if (expectsJson(contentType, acceptTypes)) {
            return withRetryAfter(ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_JSON), retryAfter)
                    .body(jsonErrorBody(grpcCode, message).getBytes(StandardCharsets.UTF_8));
        }
        return withRetryAfter(ResponseEntity.status(status)
                .contentType(MEDIA_TYPE_PROTOBUF), retryAfter)
                .body(binaryErrorBody(grpcCode, message));
    }

    private ResponseEntity.BodyBuilder withRetryAfter(ResponseEntity.BodyBuilder builder, String retryAfter) {
        String headerValue = StringUtils.trimToNull(retryAfter);
        return headerValue == null ? builder : builder.header(HttpHeaders.RETRY_AFTER, headerValue);
    }

    private boolean expectsJson(MediaType contentType, List<MediaType> acceptTypes) {
        double jsonQuality = negotiatedQuality(acceptTypes, true);
        double protobufQuality = negotiatedQuality(acceptTypes, false);
        if (jsonQuality >= 0 || protobufQuality >= 0) {
            double acceptableJsonQuality = Math.max(jsonQuality, 0.0d);
            double acceptableProtobufQuality = Math.max(protobufQuality, 0.0d);
            if (Double.compare(acceptableJsonQuality, acceptableProtobufQuality) == 0) {
                return acceptableJsonQuality > 0 && isExplicitJsonMediaType(contentType);
            }
            return acceptableJsonQuality > acceptableProtobufQuality;
        }
        return isExplicitJsonMediaType(contentType);
    }

    private double negotiatedQuality(List<MediaType> acceptTypes, boolean json) {
        if (acceptTypes == null || acceptTypes.isEmpty()) {
            return -1.0d;
        }
        double explicitQuality = acceptTypes.stream()
                .filter(json ? this::isExplicitJsonMediaType : this::isExplicitProtobufMediaType)
                .mapToDouble(MediaType::getQualityValue)
                .max()
                .orElse(-1.0d);
        if (explicitQuality >= 0) {
            return explicitQuality;
        }
        return acceptTypes.stream()
                .filter(json ? this::isJsonWildcardMediaType : this::isProtobufWildcardMediaType)
                .mapToDouble(MediaType::getQualityValue)
                .max()
                .orElse(-1.0d);
    }

    private boolean isJsonWildcardMediaType(MediaType mediaType) {
        return mediaType != null
                && !isExplicitJsonMediaType(mediaType)
                && mediaType.includes(MediaType.APPLICATION_JSON);
    }

    private boolean isProtobufWildcardMediaType(MediaType mediaType) {
        return mediaType != null
                && !isExplicitProtobufMediaType(mediaType)
                && (mediaType.includes(MEDIA_TYPE_PROTOBUF) || mediaType.includes(MEDIA_TYPE_PROTOBUF_ALT));
    }

    private boolean isExplicitJsonMediaType(MediaType mediaType) {
        if (mediaType == null || mediaType.isWildcardType() || mediaType.isWildcardSubtype()) {
            return false;
        }
        return "application".equalsIgnoreCase(mediaType.getType())
                && ("json".equalsIgnoreCase(mediaType.getSubtype())
                || mediaType.getSubtype().toLowerCase(Locale.ROOT).endsWith("+json"));
    }

    private boolean isExplicitProtobufMediaType(MediaType mediaType) {
        if (mediaType == null || mediaType.isWildcardType() || mediaType.isWildcardSubtype()) {
            return false;
        }
        return "application".equalsIgnoreCase(mediaType.getType())
                && ("x-protobuf".equalsIgnoreCase(mediaType.getSubtype())
                || "protobuf".equalsIgnoreCase(mediaType.getSubtype()));
    }

    public HttpStatus toHttpStatus(StatusRuntimeException exception) {
        if (exception == null || exception.getStatus() == null) {
            return HttpStatus.INTERNAL_SERVER_ERROR;
        }
        return switch (exception.getStatus().getCode()) {
            case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ALREADY_EXISTS, ABORTED -> HttpStatus.CONFLICT;
            case FAILED_PRECONDITION, OUT_OF_RANGE -> HttpStatus.BAD_REQUEST;
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
            case RESOURCE_EXHAUSTED -> HttpStatus.TOO_MANY_REQUESTS;
            case UNIMPLEMENTED -> HttpStatus.NOT_IMPLEMENTED;
            case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case DEADLINE_EXCEEDED -> HttpStatus.GATEWAY_TIMEOUT;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    public String jsonErrorBody(String message) {
        return jsonErrorBody(io.grpc.Status.Code.UNKNOWN.value(), message);
    }

    public String jsonErrorBody(int grpcCode, String message) {
        String errorMessage = defaultErrorMessage(message);
        try {
            return JsonFormat.printer().print(statusPayload(grpcCode, errorMessage));
        } catch (InvalidProtocolBufferException ex) {
            try {
                return OBJECT_MAPPER.writeValueAsString(Map.of("code", grpcCode, "message", errorMessage));
            } catch (Exception ignored) {
                return "{\"code\":" + grpcCode + ",\"message\":\"" + errorMessage + "\"}";
            }
        }
    }

    public byte[] binaryErrorBody(String message) {
        return binaryErrorBody(io.grpc.Status.Code.UNKNOWN.value(), message);
    }

    public byte[] binaryErrorBody(int grpcCode, String message) {
        return statusPayload(grpcCode, defaultErrorMessage(message)).toByteArray();
    }

    public String defaultErrorMessage(String message) {
        return StringUtils.defaultIfBlank(message, DEFAULT_ERROR_MESSAGE);
    }

    private String statusDescription(StatusRuntimeException exception) {
        return exception == null || exception.getStatus() == null
                ? DEFAULT_ERROR_MESSAGE
                : exception.getStatus().getDescription();
    }

    private int statusCode(StatusRuntimeException exception) {
        if (exception == null || exception.getStatus() == null) {
            return io.grpc.Status.Code.UNKNOWN.value();
        }
        return exception.getStatus().getCode().value();
    }

    private int grpcCode(HttpStatus status) {
        if (status == null) {
            return io.grpc.Status.Code.UNKNOWN.value();
        }
        return switch (status) {
            case BAD_REQUEST -> io.grpc.Status.Code.INVALID_ARGUMENT.value();
            case NOT_ACCEPTABLE -> io.grpc.Status.Code.INVALID_ARGUMENT.value();
            case UNSUPPORTED_MEDIA_TYPE -> io.grpc.Status.Code.INVALID_ARGUMENT.value();
            case UNPROCESSABLE_ENTITY -> io.grpc.Status.Code.INVALID_ARGUMENT.value();
            case NOT_FOUND -> io.grpc.Status.Code.NOT_FOUND.value();
            case CONFLICT -> io.grpc.Status.Code.ABORTED.value();
            case LOCKED -> io.grpc.Status.Code.ABORTED.value();
            case PRECONDITION_FAILED -> io.grpc.Status.Code.FAILED_PRECONDITION.value();
            case PRECONDITION_REQUIRED -> io.grpc.Status.Code.FAILED_PRECONDITION.value();
            case REQUESTED_RANGE_NOT_SATISFIABLE -> io.grpc.Status.Code.OUT_OF_RANGE.value();
            case UNAUTHORIZED -> io.grpc.Status.Code.UNAUTHENTICATED.value();
            case FORBIDDEN -> io.grpc.Status.Code.PERMISSION_DENIED.value();
            case REQUEST_TIMEOUT -> io.grpc.Status.Code.DEADLINE_EXCEEDED.value();
            case METHOD_NOT_ALLOWED -> io.grpc.Status.Code.UNIMPLEMENTED.value();
            case PAYLOAD_TOO_LARGE -> io.grpc.Status.Code.RESOURCE_EXHAUSTED.value();
            case REQUEST_HEADER_FIELDS_TOO_LARGE -> io.grpc.Status.Code.RESOURCE_EXHAUSTED.value();
            case TOO_MANY_REQUESTS -> io.grpc.Status.Code.RESOURCE_EXHAUSTED.value();
            case TOO_EARLY -> io.grpc.Status.Code.UNAVAILABLE.value();
            case BAD_GATEWAY -> io.grpc.Status.Code.UNAVAILABLE.value();
            case SERVICE_UNAVAILABLE -> io.grpc.Status.Code.UNAVAILABLE.value();
            case GATEWAY_TIMEOUT -> io.grpc.Status.Code.DEADLINE_EXCEEDED.value();
            case NOT_IMPLEMENTED -> io.grpc.Status.Code.UNIMPLEMENTED.value();
            case INSUFFICIENT_STORAGE -> io.grpc.Status.Code.RESOURCE_EXHAUSTED.value();
            case INTERNAL_SERVER_ERROR -> io.grpc.Status.Code.INTERNAL.value();
            default -> status.is5xxServerError()
                    ? io.grpc.Status.Code.INTERNAL.value()
                    : io.grpc.Status.Code.UNKNOWN.value();
        };
    }

    private com.google.rpc.Status statusPayload(int grpcCode, String message) {
        return com.google.rpc.Status.newBuilder()
                .setCode(Math.max(0, grpcCode))
                .setMessage(message)
                .build();
    }
}
