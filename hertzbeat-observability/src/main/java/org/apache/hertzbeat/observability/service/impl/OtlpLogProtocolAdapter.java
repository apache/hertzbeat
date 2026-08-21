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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.common.v1.KeyValueList;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.observability.notice.LogSseManager;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Adapter for OpenTelemetry OTLP/HTTP log ingestion.
 * Supports both JSON-encoded and binary-encoded Protobuf formats.
 * 
 * @see <a href="https://opentelemetry.io/docs/specs/otlp/#otlphttp">OTLP/HTTP Specification</a>
 */
@Slf4j
@Service
public class OtlpLogProtocolAdapter {

    private static final Set<String> OTLP_HEX_ID_FIELDS = Set.of("traceId", "spanId");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final CommonDataQueue commonDataQueue;
    private final LogSseManager logSseManager;

    public OtlpLogProtocolAdapter(CommonDataQueue commonDataQueue, LogSseManager logSseManager) {
        this.commonDataQueue = commonDataQueue;
        this.logSseManager = logSseManager;
    }

    public void ingest(String content) {
        if (content == null || content.isEmpty()) {
            log.warn("Received empty OTLP JSON log payload - skip processing.");
            return;
        }
        ExportLogsServiceRequest.Builder builder = ExportLogsServiceRequest.newBuilder();
        try {
            JsonFormat.parser().ignoringUnknownFields().merge(normalizeOtlpJson(content), builder);
            ExportLogsServiceRequest request = builder.build();
            processLogsRequest(request, "JSON");
        } catch (InvalidProtocolBufferException e) {
            log.error("Failed to parse OTLP JSON log payload: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid OTLP JSON log content", e);
        }
    }

    /**
     * Ingest binary-encoded Protobuf log payload (OTLP-specific).
     *
     * @param content binary-encoded ExportLogsServiceRequest
     */
    public void ingestBinary(byte[] content) {
        if (content == null || content.length == 0) {
            log.warn("Received empty OTLP binary log payload - skip processing.");
            return;
        }
        try {
            ExportLogsServiceRequest request = ExportLogsServiceRequest.parseFrom(content);
            processLogsRequest(request, "binary");
        } catch (InvalidProtocolBufferException e) {
            log.error("Failed to parse OTLP binary log payload: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid OTLP binary log content", e);
        }
    }

    private void processLogsRequest(ExportLogsServiceRequest request, String format) {
        List<LogEntry> logEntries = extractLogEntries(request);
        log.debug("Successfully extracted {} log entries from OTLP {} payload", logEntries.size(), format);
        commonDataQueue.sendLogEntryToStorageBatch(logEntries);
        commonDataQueue.sendLogEntryToAlertBatch(logEntries);
        logEntries.forEach(logSseManager::broadcast);
    }

    /**
     * Extract LogEntry instances from ExportLogsServiceRequest.
     * 
     * @param request the OTLP export logs service request
     * @return list of extracted log entries
     */
    private List<LogEntry> extractLogEntries(ExportLogsServiceRequest request) {
        List<LogEntry> logEntries = new ArrayList<>();
        
        for (ResourceLogs resourceLogs : request.getResourceLogsList()) {
            // Extract resource attributes
            Map<String, Object> resourceAttributes = extractAttributes(
                resourceLogs.getResource().getAttributesList()
            );
            
            for (ScopeLogs scopeLogs : resourceLogs.getScopeLogsList()) {
                // Extract instrumentation scope information
                LogEntry.InstrumentationScope instrumentationScope = extractInstrumentationScope(scopeLogs);
                
                for (LogRecord logRecord : scopeLogs.getLogRecordsList()) {
                    LogEntry logEntry = convertLogRecordToLogEntry(
                        logRecord, 
                        resourceAttributes, 
                        instrumentationScope
                    );
                    logEntries.add(logEntry);
                }
            }
        }
        
        return logEntries;
    }

    /**
     * Convert OpenTelemetry LogRecord to LogEntry.
     */
    private LogEntry convertLogRecordToLogEntry(
            LogRecord logRecord, 
            Map<String, Object> resourceAttributes,
            LogEntry.InstrumentationScope instrumentationScope) {
        
        return LogEntry.builder()
            .timeUnixNano(logRecord.getTimeUnixNano())
            .observedTimeUnixNano(logRecord.getObservedTimeUnixNano())
            .severityNumber(logRecord.getSeverityNumberValue())
            .severityText(logRecord.getSeverityText())
            .body(extractBody(logRecord.getBody()))
            .attributes(extractAttributes(logRecord.getAttributesList()))
            .droppedAttributesCount(logRecord.getDroppedAttributesCount())
            .traceId(bytesToHex(logRecord.getTraceId().toByteArray()))
            .spanId(bytesToHex(logRecord.getSpanId().toByteArray()))
            .traceFlags(logRecord.getFlags())
            .resource(resourceAttributes)
            .instrumentationScope(instrumentationScope)
            .build();
    }

    /**
     * Extract instrumentation scope information from ScopeLogs.
     */
    private LogEntry.InstrumentationScope extractInstrumentationScope(ScopeLogs scopeLogs) {
        if (!scopeLogs.hasScope()) {
            return null;
        }
        
        var scope = scopeLogs.getScope();
        return LogEntry.InstrumentationScope.builder()
            .name(scope.getName())
            .version(scope.getVersion())
            .attributes(extractAttributes(scope.getAttributesList()))
            .droppedAttributesCount(scope.getDroppedAttributesCount())
            .build();
    }

    /**
     * Extract attributes from a list of KeyValue pairs.
     */
    private Map<String, Object> extractAttributes(List<KeyValue> keyValueList) {
        if (keyValueList == null || keyValueList.isEmpty()) {
            return new HashMap<>();
        }

        AnyValue anyValue = AnyValue.newBuilder()
                .setKvlistValue(KeyValueList.newBuilder()
                        .addAllValues(keyValueList)
                        .build())
                .build();
        Object extractedAnyValue = extractAnyValue(anyValue);
        if (extractedAnyValue instanceof Map<?, ?> genericMap) {
            Map<String, Object> resultMap = new HashMap<>();
            for (Map.Entry<?, ?> entry : genericMap.entrySet()) {
                if (entry.getKey() instanceof String) {
                    resultMap.put((String) entry.getKey(), entry.getValue());
                }
            }
            return resultMap;
        } else {
            return new HashMap<>();
        }
    }

    /**
     * Extract body content from AnyValue.
     */
    private Object extractBody(AnyValue body) {
        return extractAnyValue(body);
    }

    /**
     * Extract value from OpenTelemetry AnyValue.
     */
    private Object extractAnyValue(AnyValue anyValue) {
        switch (anyValue.getValueCase()) {
            case STRING_VALUE:
                return anyValue.getStringValue();
            case BOOL_VALUE:
                return anyValue.getBoolValue();
            case INT_VALUE:
                return anyValue.getIntValue();
            case DOUBLE_VALUE:
                return anyValue.getDoubleValue();
            case ARRAY_VALUE:
                List<Object> arrayList = new ArrayList<>();
                for (AnyValue item : anyValue.getArrayValue().getValuesList()) {
                    arrayList.add(extractAnyValue(item));
                }
                return arrayList;
            case KVLIST_VALUE:
                Map<String, Object> kvMap = new HashMap<>();
                for (KeyValue kv : anyValue.getKvlistValue().getValuesList()) {
                    kvMap.put(normalizeKey(kv.getKey()), extractAnyValue(kv.getValue()));
                }
                return kvMap;
            case BYTES_VALUE:
                return anyValue.getBytesValue().toByteArray();
            case VALUE_NOT_SET:
            default:
                return null;
        }
    }

    /**
     * Normalize key by replacing dots and spaces with underscores.
     * 
     * @param key the original key
     * @return normalized key with dots and spaces replaced by underscores
     */
    private String normalizeKey(String key) {
        if (key == null) {
            return null;
        }
        return key.replace(".", "_").replace(" ", "_");
    }

    /**
     * Convert byte array to hex string.
     */
    private String bytesToHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }

    /**
     * Accept the hexadecimal IDs emitted by the HertzBeat onboarding probe while preserving
     * standard base64-encoded OTLP/JSON IDs.
     */
    private String normalizeOtlpJson(String content) throws InvalidProtocolBufferException {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(content);
            normalizeOtlpHexEncodedIds(root);
            return OBJECT_MAPPER.writeValueAsString(root);
        } catch (Exception exception) {
            throw new InvalidProtocolBufferException("Failed to normalize OTLP JSON: " + exception.getMessage());
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
        if (value == null || value.isBlank() || (value.length() & 1) != 0) {
            return null;
        }
        for (int i = 0; i < value.length(); i++) {
            if (Character.digit(value.charAt(i), 16) < 0) {
                return null;
            }
        }
        try {
            return Base64.getEncoder().encodeToString(HexFormat.of().parseHex(value));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

}
