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

package org.apache.hertzbeat.observability.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.junit.jupiter.api.Test;

class OtlpIngressFilteringSpanExporterTest {

    private static final AttributeKey<String> HTTP_ROUTE = AttributeKey.stringKey("http.route");
    private static final AttributeKey<String> URL_PATH = AttributeKey.stringKey("url.path");

    @Test
    void dropsOnlyServerSpansForTheLocalOtlpIngress() {
        RecordingSpanExporter delegate = new RecordingSpanExporter();
        OtlpIngressFilteringSpanExporter exporter = new OtlpIngressFilteringSpanExporter(delegate);
        SpanData ingressServer = span(SpanKind.SERVER, HTTP_ROUTE, "/api/otlp/v1/traces");
        SpanData fallbackPathServer = span(SpanKind.SERVER, URL_PATH, "/api/otlp/v1/metrics");
        SpanData businessServer = span(SpanKind.SERVER, HTTP_ROUTE, "/api/alerts");
        SpanData ingressClient = span(SpanKind.CLIENT, HTTP_ROUTE, "/api/otlp/v1/traces");

        CompletableResultCode result = exporter.export(
                List.of(ingressServer, fallbackPathServer, businessServer, ingressClient));

        assertSame(delegate.exportResult, result);
        assertEquals(List.of(businessServer, ingressClient), delegate.exported);
    }

    @Test
    void completesAnEmptyFilteredBatchWithoutCallingDelegate() {
        RecordingSpanExporter delegate = new RecordingSpanExporter();
        OtlpIngressFilteringSpanExporter exporter = new OtlpIngressFilteringSpanExporter(delegate);

        CompletableResultCode result = exporter.export(
                List.of(span(SpanKind.SERVER, HTTP_ROUTE, "/api/otlp/v1/traces")));

        assertTrue(result.isSuccess());
        assertTrue(delegate.exported.isEmpty());
        assertEquals(0, delegate.exportCalls);
    }

    @Test
    void completesAnEmptyInputBatchWithoutCallingDelegate() {
        RecordingSpanExporter delegate = new RecordingSpanExporter();
        OtlpIngressFilteringSpanExporter exporter = new OtlpIngressFilteringSpanExporter(delegate);

        CompletableResultCode result = exporter.export(List.of());

        assertTrue(result.isSuccess());
        assertEquals(0, delegate.exportCalls);
    }

    @Test
    void delegatesExporterLifecycle() {
        RecordingSpanExporter delegate = new RecordingSpanExporter();
        OtlpIngressFilteringSpanExporter exporter = new OtlpIngressFilteringSpanExporter(delegate);

        assertSame(delegate.flushResult, exporter.flush());
        assertSame(delegate.shutdownResult, exporter.shutdown());
        assertEquals(1, delegate.flushCalls);
        assertEquals(1, delegate.shutdownCalls);
    }

    private SpanData span(SpanKind kind, AttributeKey<String> key, String value) {
        SpanData span = mock(SpanData.class);
        when(span.getKind()).thenReturn(kind);
        when(span.getAttributes()).thenReturn(Attributes.of(key, value));
        return span;
    }

    private static final class RecordingSpanExporter implements SpanExporter {
        private final CompletableResultCode exportResult = new CompletableResultCode();
        private final CompletableResultCode flushResult = new CompletableResultCode();
        private final CompletableResultCode shutdownResult = new CompletableResultCode();
        private final List<SpanData> exported = new ArrayList<>();
        private int exportCalls;
        private int flushCalls;
        private int shutdownCalls;

        @Override
        public CompletableResultCode export(Collection<SpanData> spans) {
            exportCalls++;
            exported.addAll(spans);
            return exportResult;
        }

        @Override
        public CompletableResultCode flush() {
            flushCalls++;
            return flushResult;
        }

        @Override
        public CompletableResultCode shutdown() {
            shutdownCalls++;
            return shutdownResult;
        }
    }
}
