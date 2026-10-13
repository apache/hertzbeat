/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.common.Value;
import io.opentelemetry.api.logs.Severity;
import io.opentelemetry.api.trace.SpanContext;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.TraceFlags;
import io.opentelemetry.api.trace.TraceState;
import io.opentelemetry.context.Context;
import io.opentelemetry.sdk.logs.SdkLoggerProvider;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import io.opentelemetry.sdk.common.InstrumentationScopeInfo;
import io.opentelemetry.sdk.logs.ReadWriteLogRecord;
import io.opentelemetry.sdk.logs.data.LogRecordData;
import io.opentelemetry.sdk.resources.Resource;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;
import org.junit.jupiter.api.Test;

class SdkLogSseProcessorTest {

    private final LogSseManager sseManager = mock(LogSseManager.class);
    private final SdkLogSseProcessor processor = new SdkLogSseProcessor(
            sseManager, new OtlpIngestionRedactionService(), true);

    @Test
    void mapsAndRedactsSdkLogBeforeBroadcast() {
        LogRecordData data = logRecord("org.apache.hertzbeat.manager", "password=hunter2");
        ReadWriteLogRecord record = mock(ReadWriteLogRecord.class);
        when(record.toLogRecordData()).thenReturn(data);

        processor.onEmit(null, record);

        var captor = org.mockito.ArgumentCaptor.forClass(LogEntry.class);
        verify(sseManager).broadcastSelf(captor.capture());
        LogEntry entry = captor.getValue();
        assertEquals(123L, entry.getTimeUnixNano());
        assertEquals("ERROR", entry.getSeverityText());
        assertEquals("password=[REDACTED]", entry.getBody());
        assertEquals("[REDACTED]", entry.getAttributes().get("api_key"));
        assertEquals("HertzBeat", entry.getResource().get("service.name"));
        assertEquals("org.apache.hertzbeat.manager", entry.getInstrumentationScope().getName());
    }

    @Test
    void skipsSseInstrumentationScopeToPreventRecursiveFeedback() {
        ReadWriteLogRecord record = mock(ReadWriteLogRecord.class);
        LogRecordData data = logRecord("org.apache.hertzbeat.observability.logs.sse.LogSseManager", "internal");
        when(record.toLogRecordData()).thenReturn(data);

        processor.onEmit(null, record);

        verify(sseManager, never()).broadcastSelf(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void preservesStructuredSdkBodyAndTraceContext() {
        SpanContext span = SpanContext.create("0123456789abcdef0123456789abcdef", "0123456789abcdef",
                TraceFlags.getSampled(), TraceState.getDefault());
        try (SdkLoggerProvider provider = SdkLoggerProvider.builder()
                .setResource(Resource.builder().put("service.name", "HertzBeat").build())
                .addLogRecordProcessor(processor).build()) {
            provider.get("collector").logRecordBuilder()
                    .setTimestamp(123, TimeUnit.NANOSECONDS)
                    .setSeverity(Severity.INFO)
                    .setContext(Context.root().with(Span.wrap(span)))
                    .setBody(Value.of(Map.of("api_key", Value.of("secret"), "items",
                            Value.of(Value.of(42L), Value.of(true), Value.empty()))))
                    .emit();
        }
        var captor = org.mockito.ArgumentCaptor.forClass(LogEntry.class);
        verify(sseManager).broadcastSelf(captor.capture());
        LogEntry entry = captor.getValue();
        assertEquals(Map.of("api_key", "[REDACTED]", "items", java.util.Arrays.asList(42L, true, null)), entry.getBody());
        assertEquals(span.getTraceId(), entry.getTraceId());
        assertEquals(span.getSpanId(), entry.getSpanId());
        assertEquals(1, entry.getTraceFlags());
    }

    @Test
    void disabledSelfRetainsLegacyExternalBroadcast() {
        SdkLogSseProcessor legacy = new SdkLogSseProcessor(sseManager, new OtlpIngestionRedactionService());
        ReadWriteLogRecord record = mock(ReadWriteLogRecord.class);
        LogRecordData data = logRecord("collector", "legacy");
        when(record.toLogRecordData()).thenReturn(data);
        legacy.onEmit(null, record);
        verify(sseManager).broadcast(org.mockito.ArgumentMatchers.any());
        verify(sseManager, never()).broadcastSelf(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void realSdkWithoutExplicitTimestampUsesObservedTimeForLiveFiltering() {
        try (var provider = SdkLoggerProvider.builder().addLogRecordProcessor(processor).build()) {
            provider.get("internal-service").logRecordBuilder().setBody("observed timestamp sample").emit();
        }
        var captor = org.mockito.ArgumentCaptor.forClass(LogEntry.class);
        verify(sseManager).broadcastSelf(captor.capture());
        LogEntry entry = captor.getValue();
        org.junit.jupiter.api.Assertions.assertTrue(entry.getTimeUnixNano() > 0);
        assertEquals(entry.getObservedTimeUnixNano(), entry.getTimeUnixNano());
    }

    private LogRecordData logRecord(String scopeName, String body) {
        InstrumentationScopeInfo scope = mock(InstrumentationScopeInfo.class);
        when(scope.getName()).thenReturn(scopeName);
        when(scope.getVersion()).thenReturn("1.0");
        when(scope.getAttributes()).thenReturn(Attributes.empty());
        LogRecordData data = mock(LogRecordData.class);
        when(data.getTimestampEpochNanos()).thenReturn(123L);
        when(data.getObservedTimestampEpochNanos()).thenReturn(456L);
        when(data.getSeverity()).thenReturn(Severity.ERROR);
        when(data.getSeverityText()).thenReturn("ERROR");
        when(data.getBodyValue()).thenAnswer(ignored -> Value.of(body));
        when(data.getAttributes()).thenReturn(Attributes.builder().put("api_key", "secret").build());
        when(data.getTotalAttributeCount()).thenReturn(1);
        when(data.getResource()).thenReturn(Resource.builder().put("service.name", "HertzBeat").build());
        when(data.getInstrumentationScopeInfo()).thenReturn(scope);
        when(data.getSpanContext()).thenReturn(SpanContext.getInvalid());
        return data;
    }
}
