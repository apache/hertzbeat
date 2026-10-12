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

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.Test;

class OtelRuntimeTelemetryClientTest {

    @Test
    void parsesBoundedOperationalMetricsAndPreservesMissingVersusZero() {
        String metrics = """
                otelcol_receiver_accepted_metric_points{receiver="otlp"} 0
                otelcol_receiver_accepted_log_records{receiver="otlp"} 7
                otelcol_receiver_accepted_spans{receiver="otlp"} 3
                otelcol_receiver_refused_metric_points{receiver="otlp"} 0
                otelcol_receiver_refused_log_records{receiver="otlp"} 1
                otelcol_exporter_sent_metric_points{exporter="otlphttp"} 11
                otelcol_exporter_sent_log_records{exporter="otlphttp"} 6
                otelcol_exporter_sent_spans{exporter="otlphttp"} 3
                otelcol_exporter_enqueue_failed_metric_points{exporter="otlphttp"} 2
                otelcol_exporter_send_failed_metric_points{exporter="otlphttp"} 4
                otelcol_exporter_queue_size{data_type="metrics",exporter="otlphttp"} 1
                otelcol_exporter_queue_size{data_type="logs",exporter="otlphttp"} 2
                otelcol_exporter_queue_size{data_type="traces",exporter="otlphttp"} 3
                otelcol_exporter_queue_capacity{data_type="metrics",exporter="otlphttp"} 2048
                otelcol_exporter_queue_capacity{data_type="logs",exporter="otlphttp"} 2048
                otelcol_exporter_queue_capacity{data_type="traces",exporter="otlphttp"} 2048
                otelcol_fileconsumer_open_files{receiver="filelog/payments"} 2
                otelcol_fileconsumer_reading_files{receiver="filelog/payments"} 1
                """;

        ManagedOtelRuntimeStatus.RuntimeTelemetry telemetry =
                new OtelRuntimeTelemetryClient().parse(metrics, true);

        assertObserved(telemetry.accepted().metrics(), 0);
        assertObserved(telemetry.accepted().logs(), 7);
        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE,
                telemetry.refused().traces().state());
        assertObserved(telemetry.failed().metrics(), 6);
        assertObserved(telemetry.enqueueFailed().metrics(), 2);
        assertObserved(telemetry.sendFailed().metrics(), 4);
        assertObserved(telemetry.queueSize(), 6);
        assertObserved(telemetry.queueCapacity(), 6144);
        assertObserved(telemetry.queueSizeBySignal().metrics(), 1);
        assertObserved(telemetry.queueSizeBySignal().logs(), 2);
        assertObserved(telemetry.queueSizeBySignal().traces(), 3);
        assertObserved(telemetry.queueCapacityBySignal().metrics(), 2048);
        assertObserved(telemetry.queueCapacityBySignal().logs(), 2048);
        assertObserved(telemetry.queueCapacityBySignal().traces(), 2048);
        assertObserved(telemetry.fileConsumer().openFiles(), 2);
        assertObserved(telemetry.fileConsumer().readingFiles(), 1);
    }

    @Test
    void marksEveryValueUnavailableWhenScrapeDataIsAbsent() {
        ManagedOtelRuntimeStatus.RuntimeTelemetry telemetry =
                new OtelRuntimeTelemetryClient().parse("", true);

        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE,
                telemetry.accepted().metrics().state());
        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE, telemetry.queueSize().state());
        assertEquals(ManagedOtelRuntimeStatus.ValueState.UNAVAILABLE,
                telemetry.fileConsumer().openFiles().state());
    }

    @Test
    void marksFileConsumerNotApplicableWhenNoManagedFileSourceExists() {
        ManagedOtelRuntimeStatus.RuntimeTelemetry telemetry =
                new OtelRuntimeTelemetryClient().parse("otelcol_exporter_queue_size 0", false);

        assertEquals(ManagedOtelRuntimeStatus.ValueState.NOT_APPLICABLE,
                telemetry.fileConsumer().openFiles().state());
    }

    private void assertObserved(ManagedOtelRuntimeStatus.ObservedLong observed, long value) {
        assertEquals(ManagedOtelRuntimeStatus.ValueState.AVAILABLE, observed.state());
        assertEquals(value, observed.value());
    }
}
