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

package org.apache.hertzbeat.common.entity.dto;

import java.time.Duration;
import java.util.Objects;

/**
 * Versioned product intent for the managed OpenTelemetry runtime.
 *
 * <p>This contract deliberately contains no rendered YAML, local paths, or credentials.</p>
 */
public record ManagedOtelRuntimeConfig(int schemaVersion, long revision, boolean hostMetricsEnabled,
                                       Duration hostMetricsInterval) {

    public static final int CURRENT_SCHEMA_VERSION = 1;
    private static final Duration MINIMUM_HOST_METRICS_INTERVAL = Duration.ofSeconds(10);
    private static final Duration MAXIMUM_HOST_METRICS_INTERVAL = Duration.ofMinutes(5);

    public ManagedOtelRuntimeConfig {
        if (schemaVersion != CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("Unsupported managed runtime config schema: " + schemaVersion);
        }
        if (revision < 1) {
            throw new IllegalArgumentException("Managed runtime config revision must be positive");
        }
        hostMetricsInterval = Objects.requireNonNull(hostMetricsInterval, "hostMetricsInterval");
        if (hostMetricsInterval.compareTo(MINIMUM_HOST_METRICS_INTERVAL) < 0
                || hostMetricsInterval.compareTo(MAXIMUM_HOST_METRICS_INTERVAL) > 0
                || hostMetricsInterval.getNano() != 0) {
            throw new IllegalArgumentException("Host metrics interval must be between 10 seconds and 5 minutes");
        }
    }
}
