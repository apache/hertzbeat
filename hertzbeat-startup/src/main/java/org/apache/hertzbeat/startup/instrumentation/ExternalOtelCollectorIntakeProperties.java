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

package org.apache.hertzbeat.startup.instrumentation;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Optional deployment-owned external OpenTelemetry Collector destination.
 *
 * <p>This binding deliberately contains only non-secret discovery data. Intake
 * credentials remain user-supplied at render execution time and must never be
 * placed in deployment properties or discovery responses.</p>
 */
@ConfigurationProperties(prefix = "hertzbeat.instrumentation.external-otel-collector")
public record ExternalOtelCollectorIntakeProperties(
        String profileId,
        String otlpHttpEndpoint,
        String otlpGrpcEndpoint) {

    boolean configured() {
        return hasText(profileId) || hasText(otlpHttpEndpoint) || hasText(otlpGrpcEndpoint);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
