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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.zip.GZIPInputStream;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionBackpressureHeaders;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.apache.hertzbeat.observability.ingestion.retry.OtlpIngestionRetryService;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Forwards normalized OTLP payloads to Greptime native OTLP endpoints.
 */
@Slf4j
@Service
public class GreptimeOtlpForwarder {

    public static final String LOG_PIPELINE_NAME = "hertzbeat_otlp_log_v1";

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";
    private static final String CONTENT_ENCODING_GZIP = "gzip";
    private static final String GREPTIME_DB_NAME_HEADER = "X-Greptime-DB-Name";
    private static final String GREPTIME_LOG_TABLE_NAME_HEADER = "X-Greptime-Log-Table-Name";
    private static final String GREPTIME_LOG_PIPELINE_NAME_HEADER = "X-Greptime-Log-Pipeline-Name";
    private static final String DEFAULT_GREPTIME_DB_NAME = "public";
    private static final String LOGS_PATH = "/v1/otlp/v1/logs";
    private static final String RESERVED_TIMESTAMP_ATTRIBUTE = "timestamp";
    private static final String SAFE_TIMESTAMP_ATTRIBUTE = "log.timestamp";
    private static final Set<String> OTLP_HEX_ID_FIELDS = Set.of("traceId", "spanId");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;
    private final ObjectProvider<GreptimeProperties> greptimePropertiesProvider;
    private final OtlpIngestionRedactionService redactionService;
    private final OtlpIngestionRetryService retryService;

    @Autowired
    public GreptimeOtlpForwarder(RestTemplate restTemplate,
                                 ObjectProvider<GreptimeProperties> greptimePropertiesProvider,
                                 OtlpIngestionRedactionService redactionService,
                                 OtlpIngestionRetryService retryService) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
        this.redactionService = redactionService;
        this.retryService = retryService;
    }

    public GreptimeOtlpForwarder(RestTemplate restTemplate,
                                 ObjectProvider<GreptimeProperties> greptimePropertiesProvider) {
        this(restTemplate, greptimePropertiesProvider, new OtlpIngestionRedactionService(),
                new OtlpIngestionRetryService());
    }

    public ResponseEntity<byte[]> forwardLogsHttp(byte[] content, HttpHeaders requestHeaders) {
        MediaType requestContentType = requestHeaders == null ? null : requestHeaders.getContentType();
        byte[] upstreamContent = normalizeLogsRequestBody(content, requestContentType, requestHeaders);
        return forwardLogsProtobuf(upstreamContent);
    }

    public ResponseEntity<byte[]> forwardLogsProtobuf(byte[] protobufContent) {
        return post(LOGS_PATH, sanitizeLogsForGreptimeNative(safeContent(protobufContent)), logHeaders());
    }

    public byte[] forwardLogsGrpc(ExportLogsServiceRequest request) {
        ExportLogsServiceRequest forwardRequest = request == null
                ? ExportLogsServiceRequest.getDefaultInstance()
                : request;
        ResponseEntity<byte[]> response = post(LOGS_PATH, sanitizeLogsForGreptimeNative(forwardRequest).toByteArray(),
                logHeaders());
        return response.getBody() == null ? new byte[0] : response.getBody();
    }

    private ResponseEntity<byte[]> post(String path, byte[] content, HttpHeaders headers) {
        GreptimeProperties greptimeProperties = greptimePropertiesOrUnavailable();
        if (greptimeProperties == null || !greptimeProperties.enabled()
                || StringUtils.isBlank(greptimeProperties.httpEndpoint())) {
            throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend is not configured.")
                    .asRuntimeException();
        }
        addGreptimeCommonHeaders(headers, greptimeProperties);
        addAuthenticationHeader(headers, greptimeProperties);
        try {
            ResponseEntity<byte[]> response = retryService.execute(() -> restTemplate.exchange(
                    endpoint(greptimeProperties.httpEndpoint(), path),
                    HttpMethod.POST,
                    new HttpEntity<>(content, headers),
                    byte[].class
            ), retryableResponse -> retryableResponse == null
                    || retryService.isRetryableStatus(retryableResponse.getStatusCode()));
            if (response == null) {
                throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend returned no response.")
                        .asRuntimeException();
            }
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw backendStatusException(response.getStatusCode(), response.getHeaders());
            }
            return response;
        } catch (HttpStatusCodeException ex) {
            log.error("Failed to forward OTLP payload to Greptime path {}: {}", path, ex.getMessage(), ex);
            throw backendStatusException(ex.getStatusCode(), ex.getResponseHeaders());
        } catch (RestClientException ex) {
            log.error("Failed to forward OTLP payload to Greptime path {}: {}", path, ex.getMessage(), ex);
            throw io.grpc.Status.UNAVAILABLE
                    .withDescription(StringUtils.defaultIfBlank(ex.getMessage(), "OTLP backend request failed."))
                    .withCause(ex)
                    .asRuntimeException();
        }
    }

    private GreptimeProperties greptimePropertiesOrUnavailable() {
        try {
            return greptimePropertiesProvider.getIfAvailable();
        } catch (RuntimeException ex) {
            log.warn("Failed to resolve Greptime OTLP log backend properties: {}", ex.toString());
            throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend is not configured.")
                    .withCause(ex)
                    .asRuntimeException();
        }
    }

    private HttpHeaders logHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF));
        headers.setAccept(List.of(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF)));
        headers.set(GREPTIME_LOG_TABLE_NAME_HEADER, WarehouseConstants.LOG_TABLE_NAME);
        headers.set(GREPTIME_LOG_PIPELINE_NAME_HEADER, LOG_PIPELINE_NAME);
        return headers;
    }

    private void addGreptimeCommonHeaders(HttpHeaders headers, GreptimeProperties greptimeProperties) {
        headers.set(GREPTIME_DB_NAME_HEADER, database(greptimeProperties.database()));
    }

    private void addAuthenticationHeader(HttpHeaders headers, GreptimeProperties greptimeProperties) {
        String username = StringUtils.trimToNull(greptimeProperties.username());
        String password = StringUtils.trimToNull(greptimeProperties.password());
        if (username == null || password == null) {
            return;
        }
        String credentials = username + ":" + password;
        String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + encodedCredentials);
    }

    private StatusRuntimeException backendStatusException(HttpStatusCode statusCode) {
        return backendStatusException(statusCode, null);
    }

    private StatusRuntimeException backendStatusException(HttpStatusCode statusCode, HttpHeaders responseHeaders) {
        Status status = backendGrpcStatus(statusCode);
        return OtlpIngestionBackpressureHeaders.statusRuntimeException(
                status, "OTLP backend returned " + statusCode, responseHeaders);
    }

    private Status backendGrpcStatus(HttpStatusCode statusCode) {
        if (statusCode == null) {
            return Status.UNAVAILABLE;
        }
        if (statusCode.value() == HttpStatus.UNAUTHORIZED.value()) {
            return Status.UNAUTHENTICATED;
        }
        if (statusCode.value() == HttpStatus.FORBIDDEN.value()) {
            return Status.PERMISSION_DENIED;
        }
        if (statusCode.value() == HttpStatus.BAD_REQUEST.value()) {
            return Status.INVALID_ARGUMENT;
        }
        if (statusCode.value() == HttpStatus.NOT_ACCEPTABLE.value()) {
            return Status.INVALID_ARGUMENT;
        }
        if (statusCode.value() == HttpStatus.UNSUPPORTED_MEDIA_TYPE.value()) {
            return Status.INVALID_ARGUMENT;
        }
        if (statusCode.value() == HttpStatus.UNPROCESSABLE_ENTITY.value()) {
            return Status.INVALID_ARGUMENT;
        }
        if (statusCode.value() == HttpStatus.NOT_FOUND.value()) {
            return Status.NOT_FOUND;
        }
        if (statusCode.value() == HttpStatus.CONFLICT.value()) {
            return Status.ABORTED;
        }
        if (statusCode.value() == HttpStatus.LOCKED.value()) {
            return Status.ABORTED;
        }
        if (statusCode.value() == HttpStatus.PRECONDITION_FAILED.value()) {
            return Status.FAILED_PRECONDITION;
        }
        if (statusCode.value() == HttpStatus.PRECONDITION_REQUIRED.value()) {
            return Status.FAILED_PRECONDITION;
        }
        if (statusCode.value() == HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE.value()) {
            return Status.OUT_OF_RANGE;
        }
        if (statusCode.value() == HttpStatus.METHOD_NOT_ALLOWED.value()) {
            return Status.UNIMPLEMENTED;
        }
        if (statusCode.value() == HttpStatus.NOT_IMPLEMENTED.value()) {
            return Status.UNIMPLEMENTED;
        }
        if (statusCode.value() == HttpStatus.PAYLOAD_TOO_LARGE.value()) {
            return Status.RESOURCE_EXHAUSTED;
        }
        if (statusCode.value() == HttpStatus.REQUEST_HEADER_FIELDS_TOO_LARGE.value()) {
            return Status.RESOURCE_EXHAUSTED;
        }
        if (statusCode.value() == HttpStatus.INSUFFICIENT_STORAGE.value()) {
            return Status.RESOURCE_EXHAUSTED;
        }
        if (statusCode.value() == HttpStatus.TOO_MANY_REQUESTS.value()) {
            return Status.RESOURCE_EXHAUSTED;
        }
        if (statusCode.value() == HttpStatus.TOO_EARLY.value()) {
            return Status.UNAVAILABLE;
        }
        if (statusCode.value() == HttpStatus.REQUEST_TIMEOUT.value()
                || statusCode.value() == HttpStatus.GATEWAY_TIMEOUT.value()) {
            return Status.DEADLINE_EXCEEDED;
        }
        if (statusCode.value() == HttpStatus.BAD_GATEWAY.value()
                || statusCode.value() == HttpStatus.SERVICE_UNAVAILABLE.value()) {
            return Status.UNAVAILABLE;
        }
        if (statusCode.is4xxClientError()) {
            return Status.INTERNAL;
        }
        if (statusCode.is5xxServerError()) {
            return Status.INTERNAL;
        }
        return Status.UNAVAILABLE;
    }

    private byte[] normalizeLogsRequestBody(byte[] content, MediaType contentType, HttpHeaders requestHeaders) {
        byte[] normalizedContent = maybeDecompress(safeContent(content), requestHeaders);
        if (contentType == null || !MediaType.APPLICATION_JSON.includes(contentType)) {
            return normalizedContent;
        }
        try {
            ExportLogsServiceRequest.Builder builder = ExportLogsServiceRequest.newBuilder();
            JsonFormat.parser().ignoringUnknownFields()
                    .merge(normalizeOtlpJson(new String(normalizedContent, StandardCharsets.UTF_8)), builder);
            return builder.build().toByteArray();
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP logs JSON request.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private byte[] sanitizeLogsForGreptimeNative(byte[] protobufContent) {
        try {
            return sanitizeLogsForGreptimeNative(ExportLogsServiceRequest.parseFrom(protobufContent)).toByteArray();
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP logs protobuf request.")
                    .withCause(ex)
                    .asRuntimeException();
        }
    }

    private ExportLogsServiceRequest sanitizeLogsForGreptimeNative(ExportLogsServiceRequest request) {
        ExportLogsServiceRequest.Builder requestBuilder = request.toBuilder();
        boolean changed = false;
        for (int resourceIndex = 0; resourceIndex < requestBuilder.getResourceLogsCount(); resourceIndex++) {
            var resourceLogsBuilder = requestBuilder.getResourceLogsBuilder(resourceIndex);
            changed |= sanitizeKeyValueAttributes(resourceLogsBuilder.getResourceBuilder().getAttributesBuilderList());
            for (int scopeIndex = 0; scopeIndex < resourceLogsBuilder.getScopeLogsCount(); scopeIndex++) {
                var scopeLogsBuilder = resourceLogsBuilder.getScopeLogsBuilder(scopeIndex);
                changed |= sanitizeKeyValueAttributes(scopeLogsBuilder.getScopeBuilder().getAttributesBuilderList());
                for (int logIndex = 0; logIndex < scopeLogsBuilder.getLogRecordsCount(); logIndex++) {
                    var logRecordBuilder = scopeLogsBuilder.getLogRecordsBuilder(logIndex);
                    changed |= sanitizeKeyValueAttributes(logRecordBuilder.getAttributesBuilderList());
                    changed |= redactLogBody(logRecordBuilder.getBodyBuilder());
                }
            }
        }
        return changed ? requestBuilder.build() : request;
    }

    private boolean sanitizeKeyValueAttributes(List<KeyValue.Builder> attributes) {
        boolean changed = false;
        for (KeyValue.Builder attributeBuilder : attributes) {
            if (RESERVED_TIMESTAMP_ATTRIBUTE.equals(attributeBuilder.getKey())) {
                attributeBuilder.setKey(SAFE_TIMESTAMP_ATTRIBUTE);
                changed = true;
            }
            if (redactionService.isSensitiveKey(attributeBuilder.getKey())) {
                attributeBuilder.setValue(redactedAnyValue());
                changed = true;
                continue;
            }
            changed |= redactAnyValue(attributeBuilder.getValueBuilder());
        }
        return changed;
    }

    private boolean redactLogBody(AnyValue.Builder bodyBuilder) {
        if (bodyBuilder == null) {
            return false;
        }
        return redactAnyValue(bodyBuilder);
    }

    private boolean redactAnyValue(AnyValue.Builder valueBuilder) {
        if (valueBuilder == null) {
            return false;
        }
        if (valueBuilder.getValueCase() == AnyValue.ValueCase.STRING_VALUE) {
            String original = valueBuilder.getStringValue();
            String redacted = redactionService.redactText(original);
            if (!StringUtils.equals(original, redacted)) {
                valueBuilder.setStringValue(redacted);
                return true;
            }
        }
        if (valueBuilder.getValueCase() == AnyValue.ValueCase.KVLIST_VALUE) {
            boolean changed = false;
            for (KeyValue.Builder nested : valueBuilder.getKvlistValueBuilder().getValuesBuilderList()) {
                if (redactionService.isSensitiveKey(nested.getKey())) {
                    nested.setValue(redactedAnyValue());
                    changed = true;
                    continue;
                }
                changed |= redactAnyValue(nested.getValueBuilder());
            }
            return changed;
        }
        if (valueBuilder.getValueCase() == AnyValue.ValueCase.ARRAY_VALUE) {
            boolean changed = false;
            for (AnyValue.Builder item : valueBuilder.getArrayValueBuilder().getValuesBuilderList()) {
                changed |= redactAnyValue(item);
            }
            return changed;
        }
        return false;
    }

    private AnyValue redactedAnyValue() {
        return AnyValue.newBuilder().setStringValue(OtlpIngestionRedactionService.REDACTED).build();
    }

    private byte[] maybeDecompress(byte[] content, HttpHeaders headers) {
        if (content == null || content.length == 0 || headers == null) {
            return content;
        }
        if (!isGzipEncoded(headers)) {
            return content;
        }
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(content);
             GZIPInputStream gzipInputStream = new GZIPInputStream(inputStream);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            gzipInputStream.transferTo(outputStream);
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed gzip-compressed OTLP logs payload.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private boolean isGzipContentEncoding(String contentEncoding) {
        String[] encodings = StringUtils.split(contentEncoding, ',');
        if (encodings == null || encodings.length == 0) {
            return false;
        }
        for (String encoding : encodings) {
            if (StringUtils.equalsIgnoreCase(StringUtils.trimToEmpty(encoding), CONTENT_ENCODING_GZIP)) {
                return true;
            }
        }
        return false;
    }

    private boolean isGzipEncoded(HttpHeaders headers) {
        List<String> contentEncodings = headers == null ? null : headers.get(HttpHeaders.CONTENT_ENCODING);
        return contentEncodings != null && contentEncodings.stream().anyMatch(this::isGzipContentEncoding);
    }

    private byte[] safeContent(byte[] content) {
        return content == null ? new byte[0] : content;
    }

    private String normalizeOtlpJson(String content) throws InvalidProtocolBufferException {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(content);
            normalizeOtlpHexEncodedIds(root);
            return OBJECT_MAPPER.writeValueAsString(root);
        } catch (Exception ex) {
            throw new InvalidProtocolBufferException("Failed to normalize OTLP JSON: " + ex.getMessage());
        }
    }

    private void normalizeOtlpHexEncodedIds(JsonNode node) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            objectNode.fieldNames().forEachRemaining(fieldName -> {
                JsonNode child = objectNode.get(fieldName);
                if (OTLP_HEX_ID_FIELDS.contains(fieldName) && child != null && child.isTextual()) {
                    String normalized = tryConvertHexToBase64(child.asText());
                    if (normalized != null) {
                        objectNode.put(fieldName, normalized);
                    }
                } else {
                    normalizeOtlpHexEncodedIds(child);
                }
            });
            return;
        }
        if (node.isArray()) {
            node.forEach(this::normalizeOtlpHexEncodedIds);
        }
    }

    private String tryConvertHexToBase64(String value) {
        if (StringUtils.isBlank(value) || (value.length() & 1) != 0) {
            return null;
        }
        for (int i = 0; i < value.length(); i++) {
            if (Character.digit(value.charAt(i), 16) < 0) {
                return null;
            }
        }
        try {
            return Base64.getEncoder().encodeToString(HexFormat.of().parseHex(value));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String endpoint(String baseEndpoint, String path) {
        return StringUtils.stripEnd(StringUtils.trim(baseEndpoint), "/") + path;
    }

    private String database(String configuredDatabase) {
        return StringUtils.defaultIfBlank(StringUtils.trim(configuredDatabase), DEFAULT_GREPTIME_DB_NAME);
    }
}
