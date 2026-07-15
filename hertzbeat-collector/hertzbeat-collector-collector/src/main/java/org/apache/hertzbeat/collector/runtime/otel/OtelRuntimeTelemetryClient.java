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

package org.apache.hertzbeat.collector.runtime.otel;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FileConsumerStatus;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.ObservedLong;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.RuntimeTelemetry;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.SignalCounters;

/** Reads the bounded loopback Prometheus view of the official Runtime's internal telemetry. */
public class OtelRuntimeTelemetryClient {

    private static final int MAXIMUM_RESPONSE_BYTES = 1024 * 1024;
    private final HttpClient client;

    public OtelRuntimeTelemetryClient() {
        this(HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build());
    }

    OtelRuntimeTelemetryClient(HttpClient client) {
        this.client = client;
    }

    public RuntimeTelemetry scrape(OtelRuntimeProperties properties, boolean fileConsumerConfigured) {
        URI endpoint = URI.create("http://127.0.0.1:" + properties.getInternalTelemetryPort() + "/metrics");
        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(properties.getInternalTelemetryTimeout())
                .GET()
                .build();
        try {
            HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                close(response.body());
                return RuntimeTelemetry.unavailable(fileConsumerConfigured);
            }
            byte[] content;
            try (InputStream body = response.body()) {
                content = body.readNBytes(MAXIMUM_RESPONSE_BYTES + 1);
            }
            if (content.length > MAXIMUM_RESPONSE_BYTES) {
                return RuntimeTelemetry.unavailable(fileConsumerConfigured);
            }
            return parse(new String(content, StandardCharsets.UTF_8), fileConsumerConfigured);
        } catch (IOException error) {
            return RuntimeTelemetry.unavailable(fileConsumerConfigured);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return RuntimeTelemetry.unavailable(fileConsumerConfigured);
        } catch (RuntimeException error) {
            return RuntimeTelemetry.unavailable(fileConsumerConfigured);
        }
    }

    RuntimeTelemetry parse(String payload, boolean fileConsumerConfigured) {
        Map<String, Long> values = parseValues(payload);
        SignalCounters accepted = signals(values, "otelcol_receiver_accepted_");
        SignalCounters refused = signals(values, "otelcol_receiver_refused_");
        SignalCounters sent = signals(values, "otelcol_exporter_sent_");
        SignalCounters failed = failed(values);
        ObservedLong queueSize = observed(values, "otelcol_exporter_queue_size");
        ObservedLong queueCapacity = observed(values, "otelcol_exporter_queue_capacity");
        FileConsumerStatus fileConsumer = fileConsumerConfigured
                ? new FileConsumerStatus(
                        observed(values, "otelcol_fileconsumer_open_files"),
                        observed(values, "otelcol_fileconsumer_reading_files"))
                : FileConsumerStatus.notApplicable();
        return new RuntimeTelemetry(
                accepted, refused, sent, failed, queueSize, queueCapacity, fileConsumer);
    }

    private SignalCounters signals(Map<String, Long> values, String prefix) {
        return new SignalCounters(
                observed(values, prefix + "metric_points"),
                observed(values, prefix + "log_records"),
                observed(values, prefix + "spans"));
    }

    private SignalCounters failed(Map<String, Long> values) {
        return new SignalCounters(
                combined(values,
                        "otelcol_exporter_enqueue_failed_metric_points",
                        "otelcol_exporter_send_failed_metric_points"),
                combined(values,
                        "otelcol_exporter_enqueue_failed_log_records",
                        "otelcol_exporter_send_failed_log_records"),
                combined(values,
                        "otelcol_exporter_enqueue_failed_spans",
                        "otelcol_exporter_send_failed_spans"));
    }

    private ObservedLong combined(Map<String, Long> values, String first, String second) {
        Long firstValue = values.get(first);
        Long secondValue = values.get(second);
        if (firstValue == null && secondValue == null) {
            return ObservedLong.unavailable();
        }
        long firstCount = valueOrZero(firstValue);
        long secondCount = valueOrZero(secondValue);
        if (Long.MAX_VALUE - firstCount < secondCount) {
            return ObservedLong.unavailable();
        }
        return ObservedLong.available(firstCount + secondCount);
    }

    private long valueOrZero(Long value) {
        return value == null ? 0 : value;
    }

    private ObservedLong observed(Map<String, Long> values, String name) {
        Long value = values.get(name);
        return value == null ? ObservedLong.unavailable() : ObservedLong.available(value);
    }

    private Map<String, Long> parseValues(String payload) {
        Map<String, Long> values = new HashMap<>();
        if (payload == null || payload.isBlank()) {
            return values;
        }
        for (String line : payload.split("\\R")) {
            parseLine(line, values);
        }
        return values;
    }

    private void parseLine(String line, Map<String, Long> values) {
        String trimmed = line.trim();
        if (trimmed.isEmpty() || trimmed.startsWith("#")) {
            return;
        }
        int separator = trimmed.lastIndexOf(' ');
        if (separator <= 0 || separator == trimmed.length() - 1) {
            return;
        }
        String nameAndLabels = trimmed.substring(0, separator).trim();
        int labels = nameAndLabels.indexOf('{');
        String name = labels < 0 ? nameAndLabels : nameAndLabels.substring(0, labels);
        if (name.endsWith("_total")) {
            name = name.substring(0, name.length() - "_total".length());
        }
        try {
            double parsed = Double.parseDouble(trimmed.substring(separator + 1).trim());
            if (!Double.isFinite(parsed) || parsed < 0 || parsed != Math.rint(parsed) || parsed > Long.MAX_VALUE) {
                return;
            }
            values.merge(name, (long) parsed, Long::sum);
        } catch (NumberFormatException ignored) {
            // A malformed or unsupported sample is absent, never an observed zero.
        }
    }

    private void close(InputStream body) {
        try {
            body.close();
        } catch (IOException ignored) {
            // The response is already unavailable; closing it is best effort.
        }
    }
}
