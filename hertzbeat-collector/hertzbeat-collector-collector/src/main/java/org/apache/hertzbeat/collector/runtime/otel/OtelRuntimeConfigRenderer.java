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

import java.io.IOException;
import java.net.URI;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermission;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;

/**
 * Renders the version-bound Phase 0 runtime configuration without embedding credentials.
 */
public class OtelRuntimeConfigRenderer {

    private static final Set<PosixFilePermission> OWNER_ONLY = Set.of(
            PosixFilePermission.OWNER_READ,
            PosixFilePermission.OWNER_WRITE
    );
    private static final Set<PosixFilePermission> OWNER_DIRECTORY_ONLY = Set.of(
            PosixFilePermission.OWNER_READ,
            PosixFilePermission.OWNER_WRITE,
            PosixFilePermission.OWNER_EXECUTE
    );
    private final OtelRuntimeSourcePolicy sourcePolicy = new OtelRuntimeSourcePolicy();

    /**
     * Render and atomically publish the active runtime configuration.
     *
     * @param properties runtime properties
     * @return absolute active configuration path
     * @throws IOException when the configuration cannot be written
     */
    public Path render(OtelRuntimeProperties properties) throws IOException {
        Path target = activePath(properties);
        Path temporary = renderCandidate(properties);
        try {
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING);
        }
        setOwnerOnlyWhenSupported(target);
        return target;
    }

    Path renderCandidate(OtelRuntimeProperties properties) throws IOException {
        Path target = activePath(properties);
        Files.createDirectories(target.getParent());
        ManagedOtelRuntimeConfig desiredConfig = properties.desiredConfig();
        OtelRuntimeSourcePolicy.ResolvedSources sources = sourcePolicy.resolve(desiredConfig, properties);
        prepareFileStorage(sources);
        Path candidate = Files.createTempFile(target.getParent(), "otel-runtime-", ".yaml.candidate");
        Files.writeString(candidate, template(properties, desiredConfig, sources), StandardCharsets.UTF_8);
        try (FileChannel channel = FileChannel.open(candidate, StandardOpenOption.WRITE)) {
            channel.force(true);
        }
        setOwnerOnlyWhenSupported(candidate);
        return candidate;
    }

    Path activePath(OtelRuntimeProperties properties) {
        return resolve(properties.getHome(), properties.getConfig());
    }

    static Path resolve(Path home, Path path) {
        Path resolved = path.isAbsolute() ? path : home.resolve(path);
        return resolved.toAbsolutePath().normalize();
    }

    static void setOwnerOnlyWhenSupported(Path file) throws IOException {
        if (Files.getFileStore(file).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(file, OWNER_ONLY);
        }
    }

    private static void prepareFileStorage(OtelRuntimeSourcePolicy.ResolvedSources sources) throws IOException {
        if (sources.fileLogSources().isEmpty()) {
            return;
        }
        Files.createDirectories(sources.storageDirectory());
        if (Files.getFileStore(sources.storageDirectory()).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(sources.storageDirectory(), OWNER_DIRECTORY_ONLY);
        }
    }

    private static String template(OtelRuntimeProperties properties, ManagedOtelRuntimeConfig desiredConfig,
                                   OtelRuntimeSourcePolicy.ResolvedSources sources) {
        if (!desiredConfig.hostMetricsEnabled()) {
            throw new IllegalArgumentException("The current runtime requires the host metrics capability");
        }
        StringBuilder yaml = new StringBuilder("""
                receivers:
                  hostmetrics:
                    collection_interval: %ds
                    scrapers:
                      cpu:
                      disk:
                      filesystem:
                      load:
                      memory:
                      network:
                      paging:
                      processes:
                """.formatted(desiredConfig.hostMetricsInterval().toSeconds()));
        appendPrometheusReceivers(yaml, sources.prometheusTargets());
        appendFileLogReceivers(yaml, sources.fileLogSources());
        yaml.append("""
                processors:
                  memory_limiter:
                    check_interval: 1s
                    limit_mib: 256
                    spike_limit_mib: 64
                  resource:
                    attributes:
                      - key: service.name
                        value: hertzbeat-otel-runtime
                        action: insert
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
                  batch:
                    send_batch_size: 1024
                    timeout: 5s
                exporters:
                  otlphttp:
                    endpoint: ${env:HERTZBEAT_OTLP_HTTP_ENDPOINT}
                    headers:
                      Authorization: Bearer ${env:HERTZBEAT_OTLP_TOKEN}
                    compression: gzip
                    retry_on_failure:
                      enabled: true
                extensions:
                  health_check:
                    endpoint: 127.0.0.1:%d
                """.formatted(
                desiredConfig.schemaVersion(),
                desiredConfig.revision(),
                properties.getHealthPort()
        ));
        if (!sources.fileLogSources().isEmpty()) {
            yaml.append("""
                  file_storage:
                    directory: ${env:HERTZBEAT_OTEL_FILE_STORAGE_DIR}
                """);
        }
        yaml.append("""
                service:
                  extensions: [%s]
                  pipelines:
                    metrics:
                      receivers: [%s]
                      processors: [memory_limiter, resource, batch]
                      exporters: [otlphttp]
                """.formatted(
                sources.fileLogSources().isEmpty() ? "health_check" : "health_check, file_storage",
                metricsReceivers(sources.prometheusTargets())
        ));
        if (!sources.fileLogSources().isEmpty()) {
            yaml.append("    logs:\n")
                    .append("      receivers: [")
                    .append(fileLogReceivers(sources.fileLogSources())).append("]\n")
                    .append("      processors: [memory_limiter, resource, batch]\n")
                    .append("      exporters: [otlphttp]\n");
        }
        return yaml.toString();
    }

    private static void appendPrometheusReceivers(
            StringBuilder yaml, List<ManagedOtelRuntimeConfig.PrometheusTarget> targets) {
        for (ManagedOtelRuntimeConfig.PrometheusTarget target : targets) {
            URI endpoint = target.endpoint();
            String path = endpoint.getRawPath() == null || endpoint.getRawPath().isBlank()
                    ? "/metrics"
                    : endpoint.getRawPath();
            yaml.append("  prometheus/").append(target.name()).append(":\n")
                    .append("    config:\n")
                    .append("      scrape_configs:\n")
                    .append("        - job_name: ").append(yamlScalar(target.name())).append('\n')
                    .append("          scrape_interval: ").append(target.interval().toSeconds()).append("s\n")
                    .append("          scheme: ").append(endpoint.getScheme().toLowerCase(Locale.ROOT)).append('\n')
                    .append("          metrics_path: ").append(yamlScalar(path)).append('\n')
                    .append("          static_configs:\n")
                    .append("            - targets: [")
                    .append(yamlScalar(endpoint.getRawAuthority())).append("]\n");
        }
    }

    private static void appendFileLogReceivers(
            StringBuilder yaml, List<OtelRuntimeSourcePolicy.ResolvedFileLogSource> sources) {
        for (OtelRuntimeSourcePolicy.ResolvedFileLogSource source : sources) {
            yaml.append("  filelog/").append(source.name()).append(":\n")
                    .append("    include:\n");
            for (String pattern : source.includePatterns()) {
                yaml.append("      - ").append(yamlScalar(pattern)).append('\n');
            }
            yaml.append("    start_at: end\n")
                    .append("    storage: file_storage\n")
                    .append("    include_file_path: true\n")
                    .append("    max_log_size: 1MiB\n")
                    .append("    max_concurrent_files: 32\n")
                    .append("    resource:\n")
                    .append("      service.name: ").append(yamlScalar(source.name())).append('\n');
        }
    }

    private static String metricsReceivers(List<ManagedOtelRuntimeConfig.PrometheusTarget> targets) {
        List<String> receivers = new ArrayList<>(targets.size() + 1);
        receivers.add("hostmetrics");
        targets.forEach(target -> receivers.add("prometheus/" + target.name()));
        return String.join(", ", receivers);
    }

    private static String fileLogReceivers(List<OtelRuntimeSourcePolicy.ResolvedFileLogSource> sources) {
        return String.join(", ", sources.stream().map(source -> "filelog/" + source.name()).toList());
    }

    private static String yamlScalar(String value) {
        return "'" + value.replace("'", "''") + "'";
    }
}
