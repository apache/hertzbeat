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

import java.net.URI;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the managed OpenTelemetry runtime.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "collector.otel-runtime")
public class OtelRuntimeProperties {

    private boolean enabled;

    private Path home = Path.of(".").toAbsolutePath().normalize();

    private Path binary;

    private Path config = Path.of("config", "otel-runtime.yaml");

    private Path log = Path.of("logs", "otel-runtime.log");

    private URI exportEndpoint = URI.create("http://127.0.0.1:1157/api/otlp");

    private String token = "";

    private String collectorId = "";

    private String workspaceId = "default";

    private int configSchema = ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION;

    private long configRevision = 1;

    private boolean hostMetricsEnabled = true;

    private Duration hostMetricsInterval = Duration.ofSeconds(10);

    private List<ManagedOtelRuntimeConfig.PrometheusTarget> prometheusTargets = List.of();

    private List<ManagedOtelRuntimeConfig.FileLogSource> fileLogSources = List.of();

    private List<Path> fileLogAllowRoots = List.of(Path.of("logs"));

    private List<Path> fileLogDenyPaths = List.of();

    private Map<String, List<String>> fileLogProfiles = Map.of();

    private Path fileStorageDirectory = Path.of("data", "otel-runtime");

    private String otlpGrpcEndpoint = "127.0.0.1:4317";

    private String otlpHttpEndpoint = "127.0.0.1:4318";

    private int otlpMaxRequestMiB = 4;

    private int healthPort = 13133;

    private Duration healthTimeout = Duration.ofSeconds(2);

    private Duration validateTimeout = Duration.ofSeconds(15);

    private Duration startupTimeout = Duration.ofSeconds(20);

    private Duration shutdownTimeout = Duration.ofSeconds(10);

    private Duration restartDelay = Duration.ofSeconds(5);

    private Duration restartWindow = Duration.ofMinutes(10);

    private int maxRestarts = 5;

    public ManagedOtelRuntimeConfig desiredConfig() {
        return new ManagedOtelRuntimeConfig(
                configSchema,
                configRevision,
                hostMetricsEnabled,
                hostMetricsInterval,
                prometheusTargets,
                fileLogSources
        );
    }
}
