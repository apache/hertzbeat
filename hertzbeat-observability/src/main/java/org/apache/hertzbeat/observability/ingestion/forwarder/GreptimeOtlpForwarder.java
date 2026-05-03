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
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
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
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
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

    public GreptimeOtlpForwarder(RestTemplate restTemplate,
                                 ObjectProvider<GreptimeProperties> greptimePropertiesProvider) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
    }

    public ResponseEntity<byte[]> forwardLogsHttp(byte[] content, HttpHeaders requestHeaders) {
        MediaType requestContentType = requestHeaders == null ? null : requestHeaders.getContentType();
        byte[] upstreamContent = normalizeLogsRequestBody(content, requestContentType, requestHeaders);
        return forwardLogsProtobuf(upstreamContent);
    }

    public ResponseEntity<byte[]> forwardLogsProtobuf(byte[] protobufContent) {
        return post(LOGS_PATH, sanitizeLogsForGreptimeNative(protobufContent), logHeaders());
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
        GreptimeProperties greptimeProperties = greptimePropertiesProvider.getIfAvailable();
        if (greptimeProperties == null || !greptimeProperties.enabled()
                || StringUtils.isBlank(greptimeProperties.httpEndpoint())) {
            throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend is not configured.")
                    .asRuntimeException();
        }
        addGreptimeCommonHeaders(headers, greptimeProperties);
        addAuthenticationHeader(headers, greptimeProperties);
        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    endpoint(greptimeProperties.httpEndpoint(), path),
                    HttpMethod.POST,
                    new HttpEntity<>(content, headers),
                    byte[].class
            );
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend returned " + response.getStatusCode())
                        .asRuntimeException();
            }
            return response;
        } catch (RestClientException ex) {
            log.error("Failed to forward OTLP payload to Greptime path {}: {}", path, ex.getMessage(), ex);
            throw io.grpc.Status.UNAVAILABLE
                    .withDescription(StringUtils.defaultIfBlank(ex.getMessage(), "OTLP backend request failed."))
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
        headers.set(GREPTIME_DB_NAME_HEADER,
                StringUtils.defaultIfBlank(greptimeProperties.database(), DEFAULT_GREPTIME_DB_NAME));
    }

    private void addAuthenticationHeader(HttpHeaders headers, GreptimeProperties greptimeProperties) {
        if (StringUtils.isBlank(greptimeProperties.username()) || StringUtils.isBlank(greptimeProperties.password())) {
            return;
        }
        String credentials = greptimeProperties.username() + ":" + greptimeProperties.password();
        String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + encodedCredentials);
    }

    private byte[] normalizeLogsRequestBody(byte[] content, MediaType contentType, HttpHeaders requestHeaders) {
        byte[] normalizedContent = maybeDecompress(content, requestHeaders);
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
        }
        return changed;
    }

    private byte[] maybeDecompress(byte[] content, HttpHeaders headers) {
        if (content == null || content.length == 0 || headers == null) {
            return content;
        }
        String contentEncoding = headers.getFirst(HttpHeaders.CONTENT_ENCODING);
        if (!StringUtils.equalsIgnoreCase(contentEncoding, CONTENT_ENCODING_GZIP)) {
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
        return StringUtils.removeEnd(baseEndpoint, "/") + path;
    }
}
