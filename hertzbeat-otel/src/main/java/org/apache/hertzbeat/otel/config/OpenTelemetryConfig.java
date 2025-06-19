/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package org.apache.hertzbeat.otel.config;

import static io.opentelemetry.semconv.ServiceAttributes.SERVICE_NAME;
import static org.apache.http.HttpHeaders.CONTENT_TYPE;

import io.opentelemetry.exporter.otlp.http.logs.OtlpHttpLogRecordExporter;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporterBuilder;
import io.opentelemetry.sdk.autoconfigure.spi.AutoConfigurationCustomizerProvider;
import io.opentelemetry.sdk.logs.export.BatchLogRecordProcessor;
import io.opentelemetry.sdk.resources.Resource;

import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenTelemetryConfig provides customizations for the auto-configured OpenTelemetry SDK,
 * specifically for integrating with GrepTimeDB for logs and traces.
 */
@Configuration
@Slf4j
public class OpenTelemetryConfig {

    private static final String HERTZBEAT_SERVICE_NAME = "HertzBeat";
    private static final String DEFAULT_GREPTIME_DB_NAME = "public";
    private static final String DEFAULT_LOGS_TABLE_NAME = "hzb_logs";
    private static final String DEFAULT_TRACES_TABLE_NAME = "hzb_traces";
    private static final String GREPTIME_DB_NAME_HEADER = "X-Greptime-DB-Name";
    private static final String GREPTIME_LOG_TABLE_NAME_HEADER = "X-Greptime-Log-Table-Name";
    private static final String GREPTIME_TRACE_TABLE_NAME_HEADER = "X-Greptime-Trace-Table-Name";
    private static final String GREPTIME_PIPELINE_NAME_HEADER = "X-Greptime-Pipeline-Name";

    /**
     * Adds authentication headers if credentials are provided.
     */
    private void addAuthenticationHeaders(Map<String, String> headers, GreptimeProperties greptimeProps) {
        if (greptimeProps != null && StringUtils.isNotBlank(greptimeProps.username())
                && StringUtils.isNotBlank(greptimeProps.password())) {
            String credentials = greptimeProps.username() + ":" + greptimeProps.password();
            String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes());
            headers.put("Authorization", "Basic " + encodedCredentials);
            log.debug("Added Basic Authentication header for GreptimeDB.");
        } else {
            log.debug("GreptimeDB username/password not configured, skipping Authentication header.");
        }
    }

    /**
     * Builds HTTP Log headers for OTLP communication with GreptimeDB.
     */
    private Map<String, String> buildGreptimeOtlpLogHeaders(GreptimeProperties greptimeProps) {
        Map<String, String> headers = new HashMap<>();
        headers.put(GREPTIME_DB_NAME_HEADER, DEFAULT_GREPTIME_DB_NAME);
        headers.put(GREPTIME_LOG_TABLE_NAME_HEADER, DEFAULT_LOGS_TABLE_NAME);
        addAuthenticationHeaders(headers, greptimeProps);
        return Collections.unmodifiableMap(headers);
    }

    /**
     * Builds HTTP Trace headers for OTLP communication with GreptimeDB.
     */
    private Map<String, String> buildGreptimeOtlpTraceHeaders(GreptimeProperties greptimeProps) {
        Map<String, String> headers = new HashMap<>();
        headers.put(GREPTIME_DB_NAME_HEADER, DEFAULT_GREPTIME_DB_NAME);
        headers.put(GREPTIME_TRACE_TABLE_NAME_HEADER, DEFAULT_TRACES_TABLE_NAME);
        headers.put(CONTENT_TYPE, "application/x-protobuf");
        headers.put(GREPTIME_PIPELINE_NAME_HEADER, "greptime_trace_v1");
        addAuthenticationHeaders(headers, greptimeProps);
        return Collections.unmodifiableMap(headers);
    }

    /**
     * Provides default OpenTelemetry configuration that always executes.
     */
    @Bean
    public AutoConfigurationCustomizerProvider defaultOtelCustomizer() {
        log.info("Applying default OpenTelemetry SDK customizations.");
        return providerCustomizer -> providerCustomizer
                .addPropertiesCustomizer(sdkConfigProperties -> {
                    Map<String, String> newProperties = new HashMap<>();
                    newProperties.put("otel.metrics.exporter", "none");
                    newProperties.put("otel.traces.exporter", "none");
                    newProperties.put("otel.logs.exporter", "none");
                    return newProperties;
                })
                .addResourceCustomizer((resource, configProperties) -> {
                    log.info("Customizing auto-configured OpenTelemetry Resource with service name: {}.", HERTZBEAT_SERVICE_NAME);
                    return resource.merge(Resource.builder().put(SERVICE_NAME, HERTZBEAT_SERVICE_NAME).build());
                });
    }

    /**
     * Provides GrepTimeDB-specific OpenTelemetry configuration when enabled.
     */
    @Bean
    @ConditionalOnProperty(name = "warehouse.store.greptime.enabled", havingValue = "true")
    public AutoConfigurationCustomizerProvider greptimeOtelCustomizer(GreptimeProperties greptimeProperties) {
        log.info("GreptimeDB is enabled. Applying additional OpenTelemetry SDK customizations for GrepTimeDB.");
        return providerCustomizer -> providerCustomizer
                .addPropertiesCustomizer(sdkConfigProperties -> {
                    Map<String, String> newProperties = new HashMap<>();
                    newProperties.put("otel.traces.exporter", "otlp");
                    return newProperties;
                })
                .addSpanExporterCustomizer((originalSpanExporter, configProperties) -> {
                    String traceEndpoint = greptimeProperties.httpEndpoint() + "/v1/otlp/v1/traces";
                    log.info("Programmatically configuring OtlpHttpSpanExporter for GreptimeDB traces. Endpoint: {}", traceEndpoint);
                    Map<String, String> traceHeaders = buildGreptimeOtlpTraceHeaders(greptimeProperties);
                    log.info("Trace Headers for GreptimeDB (programmatic HTTP config): {}", traceHeaders);

                    OtlpHttpSpanExporterBuilder httpExporterBuilder = OtlpHttpSpanExporter.builder()
                            .setEndpoint(traceEndpoint)
                            .setHeaders(() -> traceHeaders)
                            .setTimeout(10000, TimeUnit.MILLISECONDS);
                    return httpExporterBuilder.build();
                })
                .addLoggerProviderCustomizer((sdkLoggerProviderBuilder, configProperties) -> {
                    log.info("Customizing auto-configured SdkLoggerProviderBuilder for GrepTimeDB logs.");

                    OtlpHttpLogRecordExporter logExporter = OtlpHttpLogRecordExporter.builder()
                            .setEndpoint(greptimeProperties.httpEndpoint() + "/v1/otlp/v1/logs")
                            .setHeaders(() -> buildGreptimeOtlpLogHeaders(greptimeProperties))
                            .setTimeout(10000, TimeUnit.MILLISECONDS)
                            .build();

                    BatchLogRecordProcessor batchLogProcessor = BatchLogRecordProcessor.builder(logExporter)
                            .setScheduleDelay(1000, TimeUnit.MILLISECONDS)
                            .setMaxExportBatchSize(512)
                            .build();

                    return sdkLoggerProviderBuilder.addLogRecordProcessor(batchLogProcessor);
                });
    }
}