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

package org.apache.hertzbeat.otel.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Installs the OpenTelemetryAppender for Logback once the auto-configured
 * OpenTelemetry SDK is available and GrepTimeDB integration is enabled.
 */
@Component
@ConditionalOnProperty(name = "warehouse.store.greptime.enabled", havingValue = "true")
@Slf4j
public class OpenTelemetryLogbackAppenderInstaller implements InitializingBean {

    private final OpenTelemetry openTelemetry;

    @Autowired
    public OpenTelemetryLogbackAppenderInstaller(OpenTelemetry openTelemetry) {
        this.openTelemetry = openTelemetry;
    }

    @Override
    public void afterPropertiesSet() {
        if (this.openTelemetry instanceof OpenTelemetrySdk) {
            log.info("Auto-configured OpenTelemetry SDK detected. Installing OpenTelemetryAppender for Logback.");
            OpenTelemetryAppender.install(this.openTelemetry);
        } else {
            log.warn("OpenTelemetry SDK is not an instance of OpenTelemetrySdk (type: {}). "
                            + "OpenTelemetryAppender for Logback will not be installed. "
                            + "Ensure OpenTelemetry auto-configuration is active and correctly providing an SDK.",
                    this.openTelemetry != null ? this.openTelemetry.getClass().getName() : "null");
        }
    }
}