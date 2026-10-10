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

import static io.opentelemetry.semconv.ServiceAttributes.SERVICE_NAME;
import static org.apache.http.HttpHeaders.CONTENT_TYPE;

import io.opentelemetry.exporter.otlp.http.logs.OtlpHttpLogRecordExporter;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.sdk.autoconfigure.spi.AutoConfigurationCustomizerProvider;
import io.opentelemetry.sdk.logs.export.BatchLogRecordProcessor;
import io.opentelemetry.sdk.resources.Resource;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeOtlpForwarder;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenTelemetry SDK customization for Greptime-backed logs and traces.
 */
@Configuration
@EnableConfigurationProperties(OtelTraceIngressProperties.class)
@Slf4j
public class OpenTelemetryConfig {

    private static final String HERTZBEAT_SERVICE_NAME = "HertzBeat";
    private static final String DEFAULT_TRACES_TABLE_NAME = "hzb_traces";
    private static final String GREPTIME_DB_NAME_HEADER = "X-Greptime-DB-Name";
    private static final String GREPTIME_LOG_TABLE_NAME_HEADER = "X-Greptime-Log-Table-Name";
    private static final String GREPTIME_LOG_PIPELINE_NAME_HEADER = "X-Greptime-Log-Pipeline-Name";
    private static final String GREPTIME_TRACE_TABLE_NAME_HEADER = "X-Greptime-Trace-Table-Name";
    private static final String GREPTIME_PIPELINE_NAME_HEADER = "X-Greptime-Pipeline-Name";
    private static final String GREPTIME_LOGS_PATH = "/v1/otlp/v1/logs";
    private static final String GREPTIME_TRACES_PATH = "/v1/otlp/v1/traces";

    private void addAuthenticationHeaders(Map<String, String> headers, GreptimeProperties greptimeProps) {
        String username = greptimeProps == null ? null : StringUtils.trimToNull(greptimeProps.username());
        String password = greptimeProps == null ? null : StringUtils.trimToNull(greptimeProps.password());
        if (username != null && password != null) {
            String credentials = username + ":" + password;
            String encodedCredentials = Base64.getEncoder()
                    .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
            headers.put("Authorization", "Basic " + encodedCredentials);
            log.debug("Added Basic Authentication header for GreptimeDB.");
        } else {
            log.debug("GreptimeDB username/password not configured, skipping Authentication header.");
        }
    }

    private Map<String, String> buildGreptimeOtlpLogHeaders(GreptimeProperties greptimeProps, SelfTelemetryProperties self) {
        Map<String, String> headers = new HashMap<>();
        headers.put(GREPTIME_DB_NAME_HEADER, self.isEnabled() ? self.getDatabase()
                : StringUtils.defaultIfBlank(greptimeProps == null ? null : StringUtils.trim(greptimeProps.database()), "public"));
        headers.put(GREPTIME_LOG_TABLE_NAME_HEADER, WarehouseConstants.LOG_TABLE_NAME);
        headers.put(GREPTIME_LOG_PIPELINE_NAME_HEADER, GreptimeOtlpForwarder.LOG_PIPELINE_NAME);
        addAuthenticationHeaders(headers, greptimeProps);
        return Collections.unmodifiableMap(headers);
    }

    private Map<String, String> buildGreptimeOtlpTraceHeaders(GreptimeProperties greptimeProps, SelfTelemetryProperties self) {
        Map<String, String> headers = new HashMap<>();
        headers.put(GREPTIME_DB_NAME_HEADER, self.isEnabled() ? self.getDatabase()
                : StringUtils.defaultIfBlank(greptimeProps == null ? null : StringUtils.trim(greptimeProps.database()), "public"));
        headers.put(GREPTIME_TRACE_TABLE_NAME_HEADER, DEFAULT_TRACES_TABLE_NAME);
        headers.put(CONTENT_TYPE, "application/x-protobuf");
        headers.put(GREPTIME_PIPELINE_NAME_HEADER, "greptime_trace_v1");
        addAuthenticationHeaders(headers, greptimeProps);
        return Collections.unmodifiableMap(headers);
    }

    private String greptimeOtlpEndpoint(GreptimeProperties greptimeProps, String path) {
        String endpoint = greptimeProps == null ? null : greptimeProps.httpEndpoint();
        return StringUtils.stripEnd(StringUtils.trimToEmpty(endpoint), "/") + path;
    }

    private String traceEndpoint(GreptimeProperties greptimeProps, OtelTraceIngressProperties ingress) {
        return ingress.isEnabled() ? ingress.validatedEndpoint().toString()
                : greptimeOtlpEndpoint(greptimeProps, GREPTIME_TRACES_PATH);
    }

    private Map<String, String> traceHeaders(GreptimeProperties greptimeProps,
            OtelTraceIngressProperties ingress, SelfTelemetryProperties self) {
        return ingress.isEnabled() ? Map.of("Authorization", ingress.authorizationHeader())
                : buildGreptimeOtlpTraceHeaders(greptimeProps, self);
    }

    @Bean
    public AutoConfigurationCustomizerProvider defaultOtelCustomizer() {
        log.info("Applying default OpenTelemetry SDK customizations (logs & traces only).");
        return providerCustomizer -> providerCustomizer
                .addPropertiesCustomizer(sdkConfigProperties -> {
                    Map<String, String> newProperties = new HashMap<>();
                    newProperties.put("otel.metrics.exporter", "none");
                    newProperties.put("otel.traces.exporter", "none");
                    newProperties.put("otel.logs.exporter", "none");
                    newProperties.put("otel.instrumentation.jdbc.enabled", "false");
                    newProperties.put("otel.instrumentation.jdbc.experimental.datasource.enabled", "false");
                    log.info("OpenTelemetry exporters disabled. Metrics handled by Micrometer.");
                    return newProperties;
                })
                .addResourceCustomizer((resource, configProperties) ->
                        resource.merge(Resource.builder().put(SERVICE_NAME, HERTZBEAT_SERVICE_NAME).build()));
    }

    @Bean
    @ConditionalOnProperty(name = "warehouse.store.greptime.enabled", havingValue = "true")
    public AutoConfigurationCustomizerProvider greptimeOtelCustomizer(
            GreptimeProperties greptimeProperties, OtelTraceIngressProperties traceIngressProperties,
            LogSseManager logSseManager, OtlpIngestionRedactionService redactionService,
            SelfTelemetryProperties self, SelfTelemetryInitializer initializer) {
        if (self.isEnabled() && traceIngressProperties.isEnabled()) {
            self.markUnavailable("TRACE_INGRESS_CONFLICT");
        }
        if (self.isEnabled() && !self.isReady()) {
            return customizer -> customizer.addPropertiesCustomizer(properties -> Map.of(
                    "otel.traces.exporter", "none", "otel.logs.exporter", "none"));
        }
        return providerCustomizer -> providerCustomizer
                .addPropertiesCustomizer(properties -> Map.of("otel.traces.exporter", "otlp"))
                .addResourceCustomizer((resource, properties) -> self.isEnabled()
                        ? resource.merge(Resource.builder().put("hertzbeat.workspace_id", self.getWorkspaceId()).build())
                        : resource)
                .addSpanExporterCustomizer((original, properties) -> {
                    var exporter = OtlpHttpSpanExporter.builder()
                        .setEndpoint(traceEndpoint(greptimeProperties, traceIngressProperties))
                        .setHeaders(() -> traceHeaders(greptimeProperties, traceIngressProperties, self))
                        .setTimeout(10000, TimeUnit.MILLISECONDS).build();
                    return traceIngressProperties.isEnabled() ? new OtlpIngressFilteringSpanExporter(exporter) : exporter;
                })
                .addLoggerProviderCustomizer((builder, properties) -> builder
                        .addLogRecordProcessor(BatchLogRecordProcessor.builder(OtlpHttpLogRecordExporter.builder()
                                .setEndpoint(greptimeOtlpEndpoint(greptimeProperties, GREPTIME_LOGS_PATH))
                                .setHeaders(() -> buildGreptimeOtlpLogHeaders(greptimeProperties, self))
                                .setTimeout(10000, TimeUnit.MILLISECONDS).build())
                                .setScheduleDelay(1000, TimeUnit.MILLISECONDS)
                                .setMaxExportBatchSize(512).build())
                        .addLogRecordProcessor(new SdkLogSseProcessor(logSseManager, redactionService, self.isEnabled())));
    }
}
