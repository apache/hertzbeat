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

package org.apache.hertzbeat.log.service.impl;

import com.google.protobuf.ByteString;
import com.google.protobuf.util.JsonFormat;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.common.v1.InstrumentationScope;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.log.notice.LogSseManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Unit tests for OtlpLogProtocolAdapter.
 */
@ExtendWith(MockitoExtension.class)
class OtlpLogProtocolAdapterTest {

    @Mock
    private CommonDataQueue commonDataQueue;

    @Mock
    private LogSseManager logSseManager;

    private OtlpLogProtocolAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new OtlpLogProtocolAdapter(commonDataQueue, logSseManager);
    }

    @Test
    void testIngestWithNullContent() {
        adapter.ingest(null);
        verifyNoInteractions(commonDataQueue, logSseManager);
    }

    @Test
    void testIngestWithEmptyContent() {
        adapter.ingest("");
        verifyNoInteractions(commonDataQueue, logSseManager);
    }

    @Test
    void testIngestWithValidOtlpLogData() throws Exception {
        String otlpPayload = createValidOtlpLogPayload();
        
        adapter.ingest(otlpPayload);
        
        ArgumentCaptor<List<LogEntry>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(commonDataQueue, times(1)).sendLogEntryToStorageBatch(listCaptor.capture());
        verify(commonDataQueue, times(1)).sendLogEntryToAlertBatch(anyList());
        verify(logSseManager, times(1)).broadcast(any(LogEntry.class));
        
        List<LogEntry> capturedList = listCaptor.getValue();
        assertNotNull(capturedList);
        assertEquals(1, capturedList.size());
        
        LogEntry capturedEntry = capturedList.get(0);
        assertEquals("test-service", capturedEntry.getResource().get("service_name"));
        assertEquals("test-version", capturedEntry.getResource().get("service_version"));
        assertEquals("test-scope", capturedEntry.getInstrumentationScope().getName());
        assertEquals("1.0.0", capturedEntry.getInstrumentationScope().getVersion());
        assertEquals("test log message", capturedEntry.getBody());
        assertEquals("INFO", capturedEntry.getSeverityText());
        assertEquals(9, capturedEntry.getSeverityNumber());
    }

    @Test
    void testIngestWithMultipleLogRecords() throws Exception {
        String otlpPayload = createOtlpPayloadWithMultipleLogs();
        
        adapter.ingest(otlpPayload);
        
        ArgumentCaptor<List<LogEntry>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(commonDataQueue, times(1)).sendLogEntryToStorageBatch(listCaptor.capture());
        verify(commonDataQueue, times(1)).sendLogEntryToAlertBatch(anyList());
        verify(logSseManager, times(2)).broadcast(any(LogEntry.class));
        
        List<LogEntry> capturedList = listCaptor.getValue();
        assertEquals(2, capturedList.size());
    }

    @Test
    void testIngestWithComplexAttributes() throws Exception {
        String otlpPayload = createOtlpPayloadWithComplexAttributes();
        
        adapter.ingest(otlpPayload);
        
        ArgumentCaptor<List<LogEntry>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(commonDataQueue, times(1)).sendLogEntryToStorageBatch(listCaptor.capture());
        verify(commonDataQueue, times(1)).sendLogEntryToAlertBatch(anyList());
        verify(logSseManager, times(1)).broadcast(any(LogEntry.class));
        
        List<LogEntry> capturedList = listCaptor.getValue();
        assertNotNull(capturedList);
        assertEquals(1, capturedList.size());
        
        LogEntry capturedEntry = capturedList.get(0);
        Map<String, Object> attributes = capturedEntry.getAttributes();
        assertEquals("string_value", attributes.get("string_attr"));
        assertEquals(true, attributes.get("bool_attr"));
        assertEquals(42L, attributes.get("int_attr"));
        assertEquals(3.14, attributes.get("double_attr"));
        
        List<Object> arrayAttr = (List<Object>) attributes.get("array_attr");
        assertNotNull(arrayAttr);
        assertEquals(3, arrayAttr.size());
        assertEquals("item1", arrayAttr.get(0));
        assertEquals("item2", arrayAttr.get(1));
        assertEquals("item3", arrayAttr.get(2));
    }

    @Test
    void testIngestWithTraceAndSpanIds() throws Exception {
        String otlpPayload = createOtlpPayloadWithTraceSpanIds();
        
        adapter.ingest(otlpPayload);
        
        ArgumentCaptor<List<LogEntry>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(commonDataQueue, times(1)).sendLogEntryToStorageBatch(listCaptor.capture());
        verify(commonDataQueue, times(1)).sendLogEntryToAlertBatch(anyList());
        verify(logSseManager, times(1)).broadcast(any(LogEntry.class));
        
        List<LogEntry> capturedList = listCaptor.getValue();
        assertEquals(1, capturedList.size());
        
        LogEntry capturedEntry = capturedList.get(0);
        assertEquals("1234567890abcdef1234567890abcdef", capturedEntry.getTraceId());
        assertEquals("1234567890abcdef", capturedEntry.getSpanId());
        assertEquals(1, capturedEntry.getTraceFlags());
    }

    @Test
    void testIngestWithInvalidJsonContent() {
        String invalidJson = "{ invalid json content }";
        
        assertThrows(IllegalArgumentException.class, () -> adapter.ingest(invalidJson));
        verifyNoInteractions(commonDataQueue, logSseManager);
    }

    @Test
    void testIngestWithEmptyResourceLogs() throws Exception {
        String otlpPayload = createEmptyResourceLogsPayload();
        
        adapter.ingest(otlpPayload);
        
        ArgumentCaptor<List<LogEntry>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(commonDataQueue, times(1)).sendLogEntryToStorageBatch(listCaptor.capture());
        verify(commonDataQueue, times(1)).sendLogEntryToAlertBatch(anyList());
        
        List<LogEntry> capturedList = listCaptor.getValue();
        assertNotNull(capturedList);
        assertEquals(0, capturedList.size());
        
        verifyNoInteractions(logSseManager);
    }

    private String createValidOtlpLogPayload() throws Exception {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
            .addResourceLogs(ResourceLogs.newBuilder()
                .setResource(Resource.newBuilder()
                    .addAttributes(KeyValue.newBuilder()
                        .setKey("service.name")
                        .setValue(AnyValue.newBuilder().setStringValue("test-service").build())
                        .build())
                    .addAttributes(KeyValue.newBuilder()
                        .setKey("service.version")
                        .setValue(AnyValue.newBuilder().setStringValue("test-version").build())
                        .build())
                    .build())
                .addScopeLogs(ScopeLogs.newBuilder()
                    .setScope(InstrumentationScope.newBuilder()
                        .setName("test-scope")
                        .setVersion("1.0.0")
                        .build())
                    .addLogRecords(LogRecord.newBuilder()
                        .setTimeUnixNano(System.currentTimeMillis() * 1_000_000)
                        .setObservedTimeUnixNano(System.currentTimeMillis() * 1_000_000)
                        .setSeverityNumberValue(9)
                        .setSeverityText("INFO")
                        .setBody(AnyValue.newBuilder().setStringValue("test log message").build())
                        .build())
                    .build())
                .build())
            .build();
        
        return JsonFormat.printer().print(request);
    }

    private String createOtlpPayloadWithMultipleLogs() throws Exception {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
            .addResourceLogs(ResourceLogs.newBuilder()
                .setResource(Resource.newBuilder().build())
                .addScopeLogs(ScopeLogs.newBuilder()
                    .setScope(InstrumentationScope.newBuilder().build())
                    .addLogRecords(LogRecord.newBuilder()
                        .setTimeUnixNano(System.currentTimeMillis() * 1_000_000)
                        .setBody(AnyValue.newBuilder().setStringValue("first log").build())
                        .build())
                    .addLogRecords(LogRecord.newBuilder()
                        .setTimeUnixNano(System.currentTimeMillis() * 1_000_000)
                        .setBody(AnyValue.newBuilder().setStringValue("second log").build())
                        .build())
                    .build())
                .build())
            .build();
        
        return JsonFormat.printer().print(request);
    }

    private String createOtlpPayloadWithComplexAttributes() throws Exception {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
            .addResourceLogs(ResourceLogs.newBuilder()
                .setResource(Resource.newBuilder().build())
                .addScopeLogs(ScopeLogs.newBuilder()
                    .setScope(InstrumentationScope.newBuilder().build())
                    .addLogRecords(LogRecord.newBuilder()
                        .setTimeUnixNano(System.currentTimeMillis() * 1_000_000)
                        .setBody(AnyValue.newBuilder().setStringValue("complex attributes test").build())
                        .addAttributes(KeyValue.newBuilder()
                            .setKey("string.attr")
                            .setValue(AnyValue.newBuilder().setStringValue("string_value").build())
                            .build())
                        .addAttributes(KeyValue.newBuilder()
                            .setKey("bool.attr")
                            .setValue(AnyValue.newBuilder().setBoolValue(true).build())
                            .build())
                        .addAttributes(KeyValue.newBuilder()
                            .setKey("int.attr")
                            .setValue(AnyValue.newBuilder().setIntValue(42).build())
                            .build())
                        .addAttributes(KeyValue.newBuilder()
                            .setKey("double.attr")
                            .setValue(AnyValue.newBuilder().setDoubleValue(3.14).build())
                            .build())
                        .addAttributes(KeyValue.newBuilder()
                            .setKey("array.attr")
                            .setValue(AnyValue.newBuilder()
                                .setArrayValue(io.opentelemetry.proto.common.v1.ArrayValue.newBuilder()
                                    .addValues(AnyValue.newBuilder().setStringValue("item1").build())
                                    .addValues(AnyValue.newBuilder().setStringValue("item2").build())
                                    .addValues(AnyValue.newBuilder().setStringValue("item3").build())
                                    .build())
                                .build())
                            .build())
                        .build())
                    .build())
                .build())
            .build();
        
        return JsonFormat.printer().print(request);
    }

    private String createOtlpPayloadWithTraceSpanIds() throws Exception {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
            .addResourceLogs(ResourceLogs.newBuilder()
                .setResource(Resource.newBuilder().build())
                .addScopeLogs(ScopeLogs.newBuilder()
                    .setScope(InstrumentationScope.newBuilder().build())
                    .addLogRecords(LogRecord.newBuilder()
                        .setTimeUnixNano(System.currentTimeMillis() * 1_000_000)
                        .setBody(AnyValue.newBuilder().setStringValue("trace test").build())
                        .setTraceId(ByteString.fromHex("1234567890abcdef1234567890abcdef"))
                        .setSpanId(ByteString.fromHex("1234567890abcdef"))
                        .setFlags(1)
                        .build())
                    .build())
                .build())
            .build();
        
        return JsonFormat.printer().print(request);
    }

    private String createEmptyResourceLogsPayload() throws Exception {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder().build();
        return JsonFormat.printer().print(request);
    }
}
