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

import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.Message;
import com.google.protobuf.util.JsonFormat;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.GZIPInputStream;
import org.apache.hertzbeat.observability.service.OtlpSignalForwarder;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.service.OtlpSignalStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Greptime native OTLP forwarder for metrics, logs, and traces. */
@Service
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeOtlpSignalForwarder implements OtlpSignalForwarder {

    private static final String PROTOBUF = "application/x-protobuf";
    private static final Set<String> SIGNALS = Set.of("metrics", "logs", "traces");
    private final OtlpSignalStorage signalStorage;

    public GreptimeOtlpSignalForwarder(OtlpSignalStorage signalStorage) {
        this.signalStorage = signalStorage;
    }

    @Override
    public ResponseEntity<byte[]> forwardHttp(String signal, byte[] content, HttpHeaders requestHeaders) {
        HttpHeaders safeHeaders = requestHeaders == null ? new HttpHeaders() : requestHeaders;
        byte[] normalized = maybeDecompress(content, safeHeaders);
        MediaType contentType = safeHeaders.getContentType();
        byte[] protobuf = contentType != null && MediaType.APPLICATION_JSON.includes(contentType)
                ? jsonToProtobuf(signal, normalized) : validateProtobuf(signal, normalized);
        byte[] response = forwardProtobuf(signal, protobuf);
        if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
                    .body("{}".getBytes(StandardCharsets.UTF_8));
        }
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(PROTOBUF)).body(response);
    }

    @Override
    public byte[] forwardProtobuf(String signal, byte[] content) {
        byte[] validContent = validateProtobuf(signal, content);
        return signalStorage.writeProtobuf(signal, validContent);
    }

    private byte[] jsonToProtobuf(String signal, byte[] content) {
        Message.Builder builder = switch (normalizeSignal(signal)) {
            case "metrics" -> ExportMetricsServiceRequest.newBuilder();
            case "logs" -> ExportLogsServiceRequest.newBuilder();
            case "traces" -> ExportTraceServiceRequest.newBuilder();
            default -> throw new IllegalArgumentException("Unsupported OTLP signal");
        };
        try {
            JsonFormat.parser().ignoringUnknownFields().merge(normalizeOtlpJson(content), builder);
            return builder.build().toByteArray();
        } catch (InvalidProtocolBufferException exception) {
            throw new IllegalArgumentException("Malformed OTLP " + signal + " JSON payload", exception);
        }
    }

    private String normalizeOtlpJson(byte[] content) {
        String jsonText = new String(content, StandardCharsets.UTF_8);
        if (!JsonUtil.isJsonStr(jsonText)) {
            throw new IllegalArgumentException("Malformed OTLP JSON payload");
        }
        Object json = JsonUtil.fromJson(jsonText, Object.class);
        if (json == null) {
            throw new IllegalArgumentException("Malformed OTLP JSON payload");
        }
        normalizeIdBytes(json);
        return JsonUtil.toJson(json);
    }

    @SuppressWarnings("unchecked")
    private void normalizeIdBytes(Object value) {
        if (value instanceof Map<?, ?> rawMap) {
            Map<String, Object> map = (Map<String, Object>) rawMap;
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                Object child = entry.getValue();
                if (("traceId".equals(entry.getKey()) || "spanId".equals(entry.getKey())
                        || "parentSpanId".equals(entry.getKey()))
                        && child instanceof String id && id.matches("[0-9a-fA-F]+") && id.length() % 2 == 0) {
                    entry.setValue(Base64.getEncoder().encodeToString(HexFormat.of().parseHex(id)));
                } else {
                    normalizeIdBytes(child);
                }
            }
        } else if (value instanceof List<?> list) {
            list.forEach(this::normalizeIdBytes);
        }
    }

    private byte[] validateProtobuf(String signal, byte[] content) {
        byte[] safeContent = content == null ? new byte[0] : content;
        try {
            switch (normalizeSignal(signal)) {
                case "metrics" -> ExportMetricsServiceRequest.parseFrom(safeContent);
                case "logs" -> ExportLogsServiceRequest.parseFrom(safeContent);
                case "traces" -> ExportTraceServiceRequest.parseFrom(safeContent);
                default -> throw new IllegalArgumentException("Unsupported OTLP signal");
            }
            return safeContent;
        } catch (InvalidProtocolBufferException exception) {
            throw new IllegalArgumentException("Malformed OTLP " + signal + " protobuf payload", exception);
        }
    }

    private byte[] maybeDecompress(byte[] content, HttpHeaders headers) {
        byte[] safeContent = content == null ? new byte[0] : content;
        if (!"gzip".equalsIgnoreCase(headers.getFirst(HttpHeaders.CONTENT_ENCODING))) {
            return safeContent;
        }
        try (GZIPInputStream input = new GZIPInputStream(new ByteArrayInputStream(safeContent));
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            input.transferTo(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalArgumentException("Malformed gzip OTLP payload", exception);
        }
    }

    private String normalizeSignal(String signal) {
        String normalized = StringUtils.hasText(signal) ? signal.toLowerCase(Locale.ROOT) : "";
        if (!SIGNALS.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported OTLP signal");
        }
        return normalized;
    }

}
