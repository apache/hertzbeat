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

package org.apache.hertzbeat.otel.controller;

import io.opentelemetry.exporter.prometheus.PrometheusCollector;
import io.prometheus.client.exporter.common.TextFormat;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.Writer;

/**
 * A Spring MVC controller to expose Prometheus metrics.
 * This controller is enabled when `otel.exporter.prometheus.enabled` is set to `true`.
 * It provides a `/metrics` endpoint that scrapes the OpenTelemetry metrics
 * and returns them in the Prometheus text format.
 */
@RestController
@ConditionalOnProperty(name = "otel.exporter.prometheus.enabled", havingValue = "true")
public class PrometheusMetricsController {

    private final PrometheusCollector prometheusCollector;

    public PrometheusMetricsController(PrometheusCollector prometheusCollector) {
        this.prometheusCollector = prometheusCollector;
    }

    /**
     * Handles GET requests to the /metrics endpoint.
     *
     * @param response the HttpServletResponse to write the metrics to
     * @throws IOException if an I/O error occurs
     */
    @GetMapping(value = "/metrics", produces = TextFormat.CONTENT_TYPE_004)
    public void metrics(HttpServletResponse response) throws IOException {
        try (Writer writer = response.getWriter()) {
            TextFormat.write004(writer, prometheusCollector.collect());
        }
    }
}