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

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;

/**
 * Renders the fixed resource and attribute governance shared by every telemetry pipeline.
 */
final class OtelRuntimeGovernance {

    private static final String SENSITIVE_ATTRIBUTE_PATTERN =
            "(?i)^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|"
                    + "access[-_]?token|refresh[-_]?token|http\\.request\\.header\\.(authorization|cookie)|"
                    + "http\\.response\\.header\\.set_cookie)$";

    private OtelRuntimeGovernance() {
    }

    static void appendProcessors(
            StringBuilder yaml, ManagedOtelRuntimeConfig desiredConfig, OtelRuntimeProperties properties) {
        MemoryBudget memoryBudget = memoryBudget(properties);
        // Incoming attributes win detection; HertzBeat ownership is authoritative; secrets are removed last.
        yaml.append("processors:\n");
        yaml.append("""
                  memory_limiter:
                    check_interval: %s
                    limit_mib: %d
                    spike_limit_mib: %d
                """.formatted(
                duration(memoryBudget.checkInterval()), memoryBudget.limitMiB(), memoryBudget.spikeLimitMiB()));
        appendResourceDetection(yaml, desiredConfig);
        appendResourceGovernance(yaml, desiredConfig);
        yaml.append("  attributes/sanitize:\n    actions:\n");
        appendSensitiveAttributeDeletion(yaml);
        appendFilterPreset(yaml, desiredConfig);
        yaml.append("""
                  batch:
                    send_batch_size: 1024
                    timeout: 5s
                """);
    }

    static String pipelineProcessors(ManagedOtelRuntimeConfig desiredConfig, boolean traces) {
        List<String> processors = new ArrayList<>();
        processors.add("memory_limiter");
        if (!desiredConfig.resourceDetectors().isEmpty()) {
            processors.add("resource_detection");
        }
        processors.add("resource");
        processors.add("attributes/sanitize");
        if (traces && desiredConfig.telemetryFilterPresets()
                .contains(ManagedOtelRuntimeConfig.TelemetryFilterPreset.HEALTH_CHECK_TRACES)) {
            processors.add("filter/health_checks");
        }
        processors.add("batch");
        return String.join(", ", processors);
    }

    private static MemoryBudget memoryBudget(OtelRuntimeProperties properties) {
        int limitMiB = properties.getRuntimeMemoryLimitMiB();
        int spikeLimitMiB = properties.getRuntimeMemorySpikeLimitMiB();
        Duration checkInterval = properties.getRuntimeMemoryCheckInterval();
        if (limitMiB < 64 || limitMiB > 4096) {
            throw new IllegalArgumentException("Runtime memory limit must be between 64 and 4096 MiB");
        }
        if (spikeLimitMiB < 1 || spikeLimitMiB >= limitMiB) {
            throw new IllegalArgumentException("Runtime memory spike limit must be below the memory limit");
        }
        if (checkInterval == null || checkInterval.compareTo(Duration.ofMillis(100)) < 0
                || checkInterval.compareTo(Duration.ofSeconds(10)) > 0
                || checkInterval.toMillis() * 1_000_000 != checkInterval.toNanos()) {
            throw new IllegalArgumentException("Runtime memory check interval must be 100ms to 10s in milliseconds");
        }
        return new MemoryBudget(limitMiB, spikeLimitMiB, checkInterval);
    }

    private static String duration(Duration value) {
        return value.toMillis() % 1000 == 0 ? value.toSeconds() + "s" : value.toMillis() + "ms";
    }

    private static void appendResourceDetection(
            StringBuilder yaml, ManagedOtelRuntimeConfig desiredConfig) {
        if (desiredConfig.resourceDetectors().isEmpty()) {
            return;
        }
        yaml.append("  resource_detection:\n")
                .append("    detectors: [").append(resourceDetectorNames(desiredConfig)).append("]\n")
                .append("    timeout: 2s\n")
                .append("    override: false\n");
        if (desiredConfig.resourceDetectors().contains(ManagedOtelRuntimeConfig.ResourceDetector.SYSTEM)) {
            yaml.append("    system:\n      hostname_sources: [os]\n");
        }
    }

    private static String resourceDetectorNames(ManagedOtelRuntimeConfig desiredConfig) {
        List<String> names = new ArrayList<>();
        for (ManagedOtelRuntimeConfig.ResourceDetector detector
                : ManagedOtelRuntimeConfig.ResourceDetector.values()) {
            if (desiredConfig.resourceDetectors().contains(detector)) {
                names.add(detector.configName());
            }
        }
        return String.join(", ", names);
    }

    private static void appendResourceGovernance(
            StringBuilder yaml, ManagedOtelRuntimeConfig desiredConfig) {
        yaml.append("""
                  resource:
                    attributes:
                      - key: service.name
                        value: hertzbeat-otel-runtime
                        action: insert
                """);
        if (!desiredConfig.environment().isEmpty()) {
            yaml.append("      - key: deployment.environment.name\n")
                    .append("        value: ").append(yamlScalar(desiredConfig.environment())).append('\n')
                    .append("        action: insert\n");
        }
        yaml.append("""
                      - key: hertzbeat.collector.id
                        value: ${env:HERTZBEAT_COLLECTOR_ID}
                        action: upsert
                      - key: hertzbeat.runtime
                        value: otel
                        action: upsert
                      - key: hertzbeat.workspace_id
                        value: ${env:HERTZBEAT_WORKSPACE_ID}
                        action: upsert
                      - key: hertzbeat.config.schema
                        value: "%d"
                        action: upsert
                      - key: hertzbeat.config.revision
                        value: "%d"
                        action: upsert
                """.formatted(desiredConfig.schemaVersion(), desiredConfig.revision()));
        appendSensitiveAttributeDeletion(yaml);
    }

    private static void appendSensitiveAttributeDeletion(StringBuilder yaml) {
        yaml.append("      - pattern: ").append(yamlScalar(SENSITIVE_ATTRIBUTE_PATTERN)).append('\n')
                .append("        action: delete\n");
    }

    private static void appendFilterPreset(StringBuilder yaml, ManagedOtelRuntimeConfig desiredConfig) {
        if (!desiredConfig.telemetryFilterPresets()
                .contains(ManagedOtelRuntimeConfig.TelemetryFilterPreset.HEALTH_CHECK_TRACES)) {
            return;
        }
        yaml.append("""
                  filter/health_checks:
                    error_mode: ignore
                    traces:
                      span:
                        - 'attributes["http.route"] == "/health"'
                        - 'attributes["http.route"] == "/healthz"'
                        - 'attributes["http.route"] == "/readyz"'
                        - 'attributes["http.route"] == "/livez"'
                """);
    }

    private static String yamlScalar(String value) {
        return "'" + value.replace("'", "''") + "'";
    }

    private record MemoryBudget(int limitMiB, int spikeLimitMiB, Duration checkInterval) {
    }
}
