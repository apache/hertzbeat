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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FileConsumerStatus;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.ObservedLong;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.RuntimeTelemetry;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.SignalCounters;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.SignalGauges;

/**
 * Reads the bounded loopback Prometheus view for Java heartbeat/status observation.
 *
 * <p>This local scrape does not forward telemetry. The Runtime's official periodic OTLP reader performs direct
 * internal-metrics export independently.</p>
 */
public class OtelRuntimeTelemetryClient {

    private static final int MAXIMUM_RESPONSE_BYTES = 1024 * 1024;
    private static final Pattern DATA_TYPE = Pattern.compile(
            "(?:^|,)\\s*data_type\\s*=\\s*\"(metrics|logs|traces)\"(?:\\s*,|$)");
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
        ParsedValues values = parseValues(payload);
        SignalCounters accepted = signals(values.aggregate(), "otelcol_receiver_accepted_");
        SignalCounters refused = signals(values.aggregate(), "otelcol_receiver_refused_");
        SignalCounters sent = signals(values.aggregate(), "otelcol_exporter_sent_");
        SignalCounters enqueueFailed = signals(values.aggregate(), "otelcol_exporter_enqueue_failed_");
        SignalCounters sendFailed = signals(values.aggregate(), "otelcol_exporter_send_failed_");
        SignalCounters failed = failed(values.aggregate());
        ObservedLong queueSize = observed(values.aggregate(), "otelcol_exporter_queue_size");
        ObservedLong queueCapacity = observed(values.aggregate(), "otelcol_exporter_queue_capacity");
        SignalGauges queueSizeBySignal = signalGauges(values, "otelcol_exporter_queue_size");
        SignalGauges queueCapacityBySignal = signalGauges(values, "otelcol_exporter_queue_capacity");
        FileConsumerStatus fileConsumer = fileConsumerConfigured
                ? new FileConsumerStatus(
                        observed(values.aggregate(), "otelcol_fileconsumer_open_files"),
                        observed(values.aggregate(), "otelcol_fileconsumer_reading_files"))
                : FileConsumerStatus.notApplicable();
        return new RuntimeTelemetry(
                accepted, refused, sent, failed, queueSize, queueCapacity, fileConsumer,
                queueSizeBySignal, queueCapacityBySignal, enqueueFailed, sendFailed);
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
        if (values == null) {
            return ObservedLong.unavailable();
        }
        Long value = values.get(name);
        return value == null ? ObservedLong.unavailable() : ObservedLong.available(value);
    }

    private SignalGauges signalGauges(ParsedValues values, String name) {
        return new SignalGauges(
                observed(values.byDataType().get("metrics"), name),
                observed(values.byDataType().get("logs"), name),
                observed(values.byDataType().get("traces"), name));
    }

    private ParsedValues parseValues(String payload) {
        ParsedValues values = new ParsedValues(new HashMap<>(), new HashMap<>());
        if (payload == null || payload.isBlank()) {
            return values;
        }
        for (String line : payload.split("\\R")) {
            parseLine(line, values);
        }
        return values;
    }

    private void parseLine(String line, ParsedValues values) {
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
            long value = (long) parsed;
            values.aggregate().merge(name, value, Long::sum);
            String dataType = dataType(nameAndLabels, labels);
            if (dataType != null) {
                values.byDataType().computeIfAbsent(dataType, ignored -> new HashMap<>())
                        .merge(name, value, Long::sum);
            }
        } catch (NumberFormatException ignored) {
            // A malformed or unsupported sample is absent, never an observed zero.
        }
    }

    private String dataType(String nameAndLabels, int labelsStart) {
        if (labelsStart < 0 || !nameAndLabels.endsWith("}")) {
            return null;
        }
        Matcher matcher = DATA_TYPE.matcher(nameAndLabels.substring(labelsStart + 1, nameAndLabels.length() - 1));
        return matcher.find() ? matcher.group(1) : null;
    }

    private void close(InputStream body) {
        try {
            body.close();
        } catch (IOException ignored) {
            // The response is already unavailable; closing it is best effort.
        }
    }

    private record ParsedValues(Map<String, Long> aggregate, Map<String, Map<String, Long>> byDataType) {
    }
}
