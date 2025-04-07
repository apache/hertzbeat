/*
 *   Licensed to the Apache Software Foundation (ASF) under one or more
 *   contributor license agreements.  See the NOTICE file distributed with
 *   this work for additional information regarding copyright ownership.
 *   The ASF licenses this file to You under the Apache License, Version 2.0
 *   (the "License"); you may not use this file except in compliance with
 *   the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package org.apache.hertzbeat.log.config;

import static io.opentelemetry.semconv.ServiceAttributes.SERVICE_NAME;
import static io.opentelemetry.semconv.ServiceAttributes.SERVICE_VERSION;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.exporter.otlp.http.logs.OtlpHttpLogRecordExporter;
import io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.logs.SdkLoggerProvider;
import io.opentelemetry.sdk.logs.export.BatchLogRecordProcessor;
import io.opentelemetry.sdk.resources.Resource;

import jakarta.annotation.PostConstruct;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.warehouse.store.history.greptime.GreptimeProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * OpenTelemetryConfig is responsible for initializing OpenTelemetry with the specified service name and GrepTimeDB endpoint.
 * It ensures that the initialization is done in a thread-safe manner and includes authentication for GrepTimeDB.
 */
@Configuration
public class OpenTelemetryConfig {

    private static final Logger log = LoggerFactory.getLogger(OpenTelemetryConfig.class);

    @Value("${hzb.version}")
    private String version;

    @Autowired
    private GreptimeProperties greptimeProperties;

    /**
     * Initializes OpenTelemetry with the given service name and GrepTimeDB endpoint.
     * Includes authentication if configured in GreptimeProperties.
     */
    @PostConstruct
    public void initializeOpenTelemetry() {
        if (greptimeProperties == null || !greptimeProperties.enabled()) {
            log.info("GrepTimeDB logging is disabled, skipping OpenTelemetry configuration.");
            return;
        }

        try {
            Resource resource = Resource.getDefault()
                    .merge(Resource.builder()
                            .put(SERVICE_NAME, "HertzBeat")
                            .put(SERVICE_VERSION, version)
                            .build());

            Map<String, String> headers = new HashMap<>();

            headers.put("X-Greptime-DB-Name", "public");
            headers.put("X-Greptime-Log-Table-Name", "HertzBeat");
            headers.put("X-Greptime-Log-Extract-Keys", version);

            addAuthenticationHeaders(headers);

            OtlpHttpLogRecordExporter logExporter = OtlpHttpLogRecordExporter.builder()
                    .setEndpoint(greptimeProperties.httpEndpoint() + "/v1/otlp/v1/logs")
                    .setHeaders(()-> headers)
                    .setTimeout(10, TimeUnit.SECONDS)
                    .build();

            SdkLoggerProvider loggerProvider = SdkLoggerProvider.builder()
                    .setResource(resource)
                    .addLogRecordProcessor(
                            BatchLogRecordProcessor.builder(logExporter)
                                    .setScheduleDelay(1000, TimeUnit.MILLISECONDS)
                                    .setMaxExportBatchSize(512)
                                    .build())
                    .build();

            OpenTelemetry openTelemetry = OpenTelemetrySdk.builder()
                    .setLoggerProvider(loggerProvider)
                    .build();

            OpenTelemetryAppender.install(openTelemetry);
            log.info("OpenTelemetry successfully configured with GrepTimeDB exporter.");
        } catch (Exception e) {
            log.error("Failed to initialize OpenTelemetry with GrepTimeDB", e);
        }
    }

    /**
     * Adds authentication headers to the provided map if username and password are configured.
     *
     * @param headers the map to which authentication headers will be added
     */
    private void addAuthenticationHeaders(Map<String, String> headers) {
        if (StringUtils.isNotBlank(greptimeProperties.username()) &&
                StringUtils.isNotBlank(greptimeProperties.password())) {
            String credentials = greptimeProperties.username() + ":" + greptimeProperties.password();
            String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes());
            headers.put("Authorization", "Basic " + encodedCredentials);
        }

    }
}