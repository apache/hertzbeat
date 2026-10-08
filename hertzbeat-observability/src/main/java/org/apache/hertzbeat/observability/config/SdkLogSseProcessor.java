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

import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.common.KeyValue;
import io.opentelemetry.api.common.Value;
import io.opentelemetry.api.trace.SpanContext;
import io.opentelemetry.context.Context;
import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.logs.LogRecordProcessor;
import io.opentelemetry.sdk.logs.ReadWriteLogRecord;
import io.opentelemetry.sdk.logs.data.LogRecordData;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;

/** Bridges SDK log records to the existing filtered live-log stream. */
final class SdkLogSseProcessor implements LogRecordProcessor {

    private static final String SSE_SCOPE = "org.apache.hertzbeat.observability.logs.sse";

    private final LogSseManager sseManager;
    private final OtlpIngestionRedactionService redaction;

    SdkLogSseProcessor(LogSseManager sseManager, OtlpIngestionRedactionService redaction) {
        this.sseManager = sseManager;
        this.redaction = redaction;
    }

    @Override
    public void onEmit(Context context, ReadWriteLogRecord logRecord) {
        LogRecordData data = logRecord.toLogRecordData();
        String scopeName = data.getInstrumentationScopeInfo().getName();
        if (scopeName.equals(SSE_SCOPE) || scopeName.startsWith(SSE_SCOPE + ".")) {
            return;
        }

        SpanContext span = data.getSpanContext();
        LogEntry.InstrumentationScope scope = LogEntry.InstrumentationScope.builder()
                .name(scopeName)
                .version(data.getInstrumentationScopeInfo().getVersion())
                .attributes(redaction.redactObjectMap(attributes(data.getInstrumentationScopeInfo().getAttributes())))
                .build();
        LogEntry entry = LogEntry.builder()
                .timeUnixNano(data.getTimestampEpochNanos())
                .observedTimeUnixNano(data.getObservedTimestampEpochNanos())
                .severityNumber(data.getSeverity().getSeverityNumber())
                .severityText(data.getSeverityText())
                .body(redaction.redactObject(null, data.getBodyValue() == null
                        ? null : value(data.getBodyValue())))
                .attributes(redaction.redactObjectMap(attributes(data.getAttributes())))
                .droppedAttributesCount(data.getTotalAttributeCount() - data.getAttributes().size())
                .traceId(span.isValid() ? span.getTraceId() : null)
                .spanId(span.isValid() ? span.getSpanId() : null)
                .traceFlags(span.isValid() ? Byte.toUnsignedInt(span.getTraceFlags().asByte()) : null)
                .resource(redaction.redactObjectMap(attributes(data.getResource().getAttributes())))
                .resourceSchemaUrl(data.getResource().getSchemaUrl())
                .instrumentationScope(scope)
                .scopeSchemaUrl(data.getInstrumentationScopeInfo().getSchemaUrl())
                .build();
        sseManager.broadcast(entry);
    }

    @Override
    public CompletableResultCode forceFlush() {
        return CompletableResultCode.ofSuccess();
    }

    private Map<String, Object> attributes(Attributes attributes) {
        Map<String, Object> result = new LinkedHashMap<>();
        attributes.forEach((key, value) -> result.put(key.getKey(), value));
        return result;
    }

    @SuppressWarnings("unchecked")
    private Object value(Value<?> value) {
        return switch (value.getType()) {
            case STRING, BOOLEAN, LONG, DOUBLE -> value.getValue();
            case ARRAY -> ((List<?>) value.getValue()).stream()
                    .map(item -> value((Value<?>) item)).toList();
            case KEY_VALUE_LIST -> {
                Map<String, Object> map = new LinkedHashMap<>();
                for (KeyValue pair : (List<KeyValue>) value.getValue()) {
                    map.put(pair.getKey(), value(pair.getValue()));
                }
                yield map;
            }
            case BYTES -> value.asString();
            case EMPTY -> null;
        };
    }
}
