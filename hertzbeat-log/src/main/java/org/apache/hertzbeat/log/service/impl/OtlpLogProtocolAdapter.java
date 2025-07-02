package org.apache.hertzbeat.log.service.impl;

import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.log.service.LogProtocolAdapter;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Adapter for OpenTelemetry OTLP/HTTP JSON log ingestion.
 */
@Slf4j
@Service
public class OtlpLogProtocolAdapter implements LogProtocolAdapter {

    private static final String SOURCE_NAME = "otlp";

    @Override
    public void ingest(String content) {
        if (content == null || content.isEmpty()) {
            log.warn("Received empty OTLP log payload - skip processing.");
            return;
        }
        ExportLogsServiceRequest.Builder builder = ExportLogsServiceRequest.newBuilder();
        try {
            JsonFormat.parser().ignoringUnknownFields().merge(content, builder);
            ExportLogsServiceRequest request = builder.build();
            
            // Extract LogEntry instances from the request
            List<LogEntry> logEntries = extractLogEntries(request);
            log.info("Successfully extracted {} log entries from OTLP payload", logEntries.size());
            
            // TODO: Persist / forward processed logs to data warehouse / queue
            // For now, just log the entries for debugging
            logEntries.forEach(entry -> log.info("Extracted log entry: {}", entry));
            
        } catch (InvalidProtocolBufferException e) {
            log.error("Failed to parse OTLP log payload: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid OTLP log content", e);
        }
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
        Map<String, Object> attributes = new HashMap<>();
        for (KeyValue kv : keyValueList) {
            attributes.put(kv.getKey(), extractAnyValue(kv.getValue()));
        }
        return attributes;
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
                    kvMap.put(kv.getKey(), extractAnyValue(kv.getValue()));
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

    @Override
    public String supportSource() {
        return SOURCE_NAME;
    }
} 