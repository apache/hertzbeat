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

package org.apache.hertzbeat.observability.ingestion.enricher;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.zip.GZIPInputStream;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

/**
 * Injects HertzBeat correlation attributes into OTLP log payloads without consulting durable storage.
 */
@Service
public class OtlpCorrelationEnricher {

    public static final String EVENT_ID_ATTRIBUTE = "hertzbeat.event_id";
    public static final String LOG_RECORD_UID_ATTRIBUTE = "log.record.uid";
    public static final String INGEST_ID_ATTRIBUTE = "hertzbeat.ingest_id";
    public static final String ENTITY_ID_ATTRIBUTE = "hertzbeat.entity_id";
    public static final String WORKSPACE_ID_ATTRIBUTE = "hertzbeat.workspace_id";

    private static final String CONTENT_ENCODING_GZIP = "gzip";
    private static final Set<String> OTLP_HEX_ID_FIELDS = Set.of("traceId", "spanId", "parentSpanId");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public byte[] enrichLogsHttp(byte[] content, HttpHeaders requestHeaders, OtlpCorrelationContext context) {
        MediaType contentType = requestHeaders == null ? null : requestHeaders.getContentType();
        byte[] normalizedContent = maybeDecompress(content, requestHeaders);
        try {
            ExportLogsServiceRequest request;
            if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
                ExportLogsServiceRequest.Builder builder = ExportLogsServiceRequest.newBuilder();
                JsonFormat.parser().ignoringUnknownFields()
                        .merge(normalizeOtlpJson(new String(normalizedContent, StandardCharsets.UTF_8)), builder);
                request = builder.build();
            } else {
                request = ExportLogsServiceRequest.parseFrom(normalizedContent);
            }
            return enrichLogs(request, context).toByteArray();
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP logs payload.")
                    .withCause(ex)
                    .asRuntimeException();
        }
    }

    public byte[] enrichLogsGrpc(ExportLogsServiceRequest request, OtlpCorrelationContext context) {
        return enrichLogs(request, context).toByteArray();
    }

    public ExportLogsServiceRequest enrichLogs(ExportLogsServiceRequest request, OtlpCorrelationContext context) {
        ExportLogsServiceRequest source = request == null ? ExportLogsServiceRequest.getDefaultInstance() : request;
        OtlpCorrelationContext resolvedContext = (context == null ? OtlpCorrelationContext.empty() : context)
                .withIngestId();
        ExportLogsServiceRequest.Builder requestBuilder = source.toBuilder().clearResourceLogs();
        for (int resourceIndex = 0; resourceIndex < source.getResourceLogsCount(); resourceIndex++) {
            ResourceLogs resourceLogs = source.getResourceLogs(resourceIndex);
            ResourceLogs.Builder resourceBuilder = resourceLogs.toBuilder().clearScopeLogs();
            resourceBuilder.setResource(enrichResource(resourceLogs.getResource(), resolvedContext));
            for (int scopeIndex = 0; scopeIndex < resourceLogs.getScopeLogsCount(); scopeIndex++) {
                ScopeLogs scopeLogs = resourceLogs.getScopeLogs(scopeIndex);
                ScopeLogs.Builder scopeBuilder = scopeLogs.toBuilder().clearLogRecords();
                for (int recordIndex = 0; recordIndex < scopeLogs.getLogRecordsCount(); recordIndex++) {
                    LogRecord logRecord = scopeLogs.getLogRecords(recordIndex);
                    scopeBuilder.addLogRecords(enrichLogRecord(logRecord, resolvedContext,
                            resourceIndex, scopeIndex, recordIndex));
                }
                resourceBuilder.addScopeLogs(scopeBuilder.build());
            }
            requestBuilder.addResourceLogs(resourceBuilder.build());
        }
        return requestBuilder.build();
    }

    public byte[] enrichTracesHttp(byte[] content, HttpHeaders requestHeaders, OtlpCorrelationContext context) {
        MediaType contentType = requestHeaders == null ? null : requestHeaders.getContentType();
        byte[] normalizedContent = maybeDecompress(content, requestHeaders);
        try {
            ExportTraceServiceRequest request;
            if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
                ExportTraceServiceRequest.Builder builder = ExportTraceServiceRequest.newBuilder();
                JsonFormat.parser().ignoringUnknownFields()
                        .merge(normalizeOtlpJson(new String(normalizedContent, StandardCharsets.UTF_8)), builder);
                request = builder.build();
            } else {
                request = ExportTraceServiceRequest.parseFrom(normalizedContent);
            }
            return enrichTraces(request, context).toByteArray();
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP trace payload.")
                    .withCause(ex)
                    .asRuntimeException();
        }
    }

    public byte[] enrichTracesGrpc(ExportTraceServiceRequest request, OtlpCorrelationContext context) {
        return enrichTraces(request, context).toByteArray();
    }

    public ExportTraceServiceRequest enrichTraces(ExportTraceServiceRequest request, OtlpCorrelationContext context) {
        ExportTraceServiceRequest source = request == null ? ExportTraceServiceRequest.getDefaultInstance() : request;
        OtlpCorrelationContext resolvedContext = context == null ? OtlpCorrelationContext.empty() : context;
        if (StringUtils.isBlank(resolvedContext.entityId()) && StringUtils.isBlank(resolvedContext.workspaceId())) {
            return source;
        }
        ExportTraceServiceRequest.Builder requestBuilder = source.toBuilder().clearResourceSpans();
        for (ResourceSpans resourceSpans : source.getResourceSpansList()) {
            ResourceSpans.Builder resourceBuilder = resourceSpans.toBuilder();
            resourceBuilder.setResource(enrichTraceResource(resourceSpans.getResource(), resolvedContext));
            requestBuilder.addResourceSpans(resourceBuilder.build());
        }
        return requestBuilder.build();
    }

    private Resource enrichResource(Resource resource, OtlpCorrelationContext context) {
        if (StringUtils.isBlank(context.entityId()) && StringUtils.isBlank(context.workspaceId())) {
            return resource;
        }
        List<KeyValue> attributes = new ArrayList<>(resource.getAttributesList());
        upsertStringAttributeIfPresent(attributes, ENTITY_ID_ATTRIBUTE, context.entityId());
        upsertStringAttributeIfPresent(attributes, WORKSPACE_ID_ATTRIBUTE, context.workspaceId());
        return resource.toBuilder()
                .clearAttributes()
                .addAllAttributes(attributes)
                .build();
    }

    private Resource enrichTraceResource(Resource resource, OtlpCorrelationContext context) {
        List<KeyValue> attributes = new ArrayList<>(resource.getAttributesList());
        addStringAttributeIfMissing(attributes, ENTITY_ID_ATTRIBUTE, context.entityId());
        addStringAttributeIfMissing(attributes, WORKSPACE_ID_ATTRIBUTE, context.workspaceId());
        return resource.toBuilder()
                .clearAttributes()
                .addAllAttributes(attributes)
                .build();
    }

    private LogRecord enrichLogRecord(LogRecord logRecord, OtlpCorrelationContext context,
                                      int resourceIndex, int scopeIndex, int recordIndex) {
        List<KeyValue> attributes = new ArrayList<>(logRecord.getAttributesList());
        String eventId = findStringAttribute(attributes, EVENT_ID_ATTRIBUTE);
        String logRecordUid = findStringAttribute(attributes, LOG_RECORD_UID_ATTRIBUTE);
        if (StringUtils.isBlank(eventId)) {
            eventId = StringUtils.defaultIfBlank(logRecordUid,
                    generateEventId(logRecord, attributes, resourceIndex, scopeIndex, recordIndex));
        }
        if (StringUtils.isBlank(logRecordUid)) {
            logRecordUid = eventId;
        }
        upsertStringAttribute(attributes, EVENT_ID_ATTRIBUTE, eventId);
        upsertStringAttribute(attributes, LOG_RECORD_UID_ATTRIBUTE, logRecordUid);
        upsertStringAttribute(attributes, INGEST_ID_ATTRIBUTE, context.ingestId());
        return logRecord.toBuilder()
                .clearAttributes()
                .addAllAttributes(attributes)
                .build();
    }

    private String generateEventId(LogRecord logRecord, List<KeyValue> attributes,
                                   int resourceIndex, int scopeIndex, int recordIndex) {
        MessageDigest digest = sha256();
        update(digest, String.valueOf(resourceIndex));
        update(digest, String.valueOf(scopeIndex));
        update(digest, String.valueOf(recordIndex));
        update(digest, String.valueOf(logRecord.getTimeUnixNano()));
        update(digest, String.valueOf(logRecord.getObservedTimeUnixNano()));
        update(digest, HexFormat.of().formatHex(logRecord.getTraceId().toByteArray()));
        update(digest, HexFormat.of().formatHex(logRecord.getSpanId().toByteArray()));
        update(digest, String.valueOf(logRecord.getSeverityNumberValue()));
        update(digest, logRecord.getSeverityText());
        digest.update(logRecord.getBody().toByteArray());
        attributes.stream()
                .sorted(Comparator.comparing(KeyValue::getKey))
                .filter(attribute -> !StringUtils.startsWith(attribute.getKey(), "hertzbeat."))
                .forEach(attribute -> {
                    update(digest, attribute.getKey());
                    if (attribute.hasValue()) {
                        digest.update(attribute.getValue().toByteArray());
                    }
                });
        return HexFormat.of().formatHex(digest.digest()).substring(0, 32);
    }

    private MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 digest is not available", ex);
        }
    }

    private void update(MessageDigest digest, String value) {
        if (value == null) {
            digest.update((byte) 0);
            return;
        }
        digest.update(value.getBytes(StandardCharsets.UTF_8));
        digest.update((byte) 0);
    }

    private String findStringAttribute(List<KeyValue> attributes, String key) {
        return attributes.stream()
                .filter(attribute -> key.equals(attribute.getKey()))
                .filter(KeyValue::hasValue)
                .map(KeyValue::getValue)
                .filter(value -> value.getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .map(AnyValue::getStringValue)
                .filter(StringUtils::isNotBlank)
                .findFirst()
                .orElse(null);
    }

    private void upsertStringAttributeIfPresent(List<KeyValue> attributes, String key, String value) {
        if (StringUtils.isBlank(value)) {
            return;
        }
        upsertStringAttribute(attributes, key, value);
    }

    private void addStringAttributeIfMissing(List<KeyValue> attributes, String key, String value) {
        if (StringUtils.isBlank(value) || hasAttribute(attributes, key)) {
            return;
        }
        attributes.add(stringAttribute(key, value));
    }

    private boolean hasAttribute(List<KeyValue> attributes, String key) {
        return attributes.stream().anyMatch(attribute -> key.equals(attribute.getKey()));
    }

    private void upsertStringAttribute(List<KeyValue> attributes, String key, String value) {
        KeyValue replacement = stringAttribute(key, value);
        for (int i = 0; i < attributes.size(); i++) {
            if (key.equals(attributes.get(i).getKey())) {
                attributes.set(i, replacement);
                return;
            }
        }
        attributes.add(replacement);
    }

    private KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(StringUtils.defaultString(value)).build())
                .build();
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
                    .withCause(ex)
                    .asRuntimeException();
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
}
