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

import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

/** Prevents HertzBeat's own OTLP intake server spans from recursively exporting to that intake. */
final class OtlpIngressFilteringSpanExporter implements SpanExporter {

    private static final AttributeKey<String> HTTP_ROUTE = AttributeKey.stringKey("http.route");
    private static final AttributeKey<String> URL_PATH = AttributeKey.stringKey("url.path");
    private static final String OTLP_INGRESS_PREFIX = "/api/otlp/";

    private final SpanExporter delegate;

    OtlpIngressFilteringSpanExporter(SpanExporter delegate) {
        this.delegate = Objects.requireNonNull(delegate, "delegate");
    }

    @Override
    public CompletableResultCode export(Collection<SpanData> spans) {
        List<SpanData> filtered = spans.stream().filter(span -> !isIngressServerSpan(span)).toList();
        return filtered.isEmpty() ? CompletableResultCode.ofSuccess() : delegate.export(filtered);
    }

    @Override
    public CompletableResultCode flush() {
        return delegate.flush();
    }

    @Override
    public CompletableResultCode shutdown() {
        return delegate.shutdown();
    }

    private boolean isIngressServerSpan(SpanData span) {
        if (span == null || span.getKind() != SpanKind.SERVER) {
            return false;
        }
        return isIngressPath(span.getAttributes().get(HTTP_ROUTE))
                || isIngressPath(span.getAttributes().get(URL_PATH));
    }

    private boolean isIngressPath(String path) {
        return path != null && path.startsWith(OTLP_INGRESS_PREFIX);
    }
}
