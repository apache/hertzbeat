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
    private final OtelRuntimeGatewayPolicy gatewayPolicy = new OtelRuntimeGatewayPolicy();

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
        OtelRuntimeGatewayPolicy.ResolvedGateway gateway = gatewayPolicy.resolve(properties);
        prepareFileStorage(sources.storageDirectory());
        Path candidate = Files.createTempFile(target.getParent(), "otel-runtime-", ".yaml.candidate");
        Files.writeString(candidate, template(properties, desiredConfig, sources, gateway), StandardCharsets.UTF_8);
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

    private static void prepareFileStorage(Path directory) throws IOException {
        Files.createDirectories(directory);
        if (Files.getFileStore(directory).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(directory, OWNER_DIRECTORY_ONLY);
        }
    }

    private static String template(OtelRuntimeProperties properties, ManagedOtelRuntimeConfig desiredConfig,
                                   OtelRuntimeSourcePolicy.ResolvedSources sources,
                                   OtelRuntimeGatewayPolicy.ResolvedGateway gateway) {
        int maxRequestMiB = properties.getOtlpMaxRequestMiB();
        if (maxRequestMiB < 1 || maxRequestMiB > 64) {
            throw new IllegalArgumentException("OTLP maximum request size must be between 1 and 64 MiB");
        }
        if (properties.getInternalTelemetryPort() < 1 || properties.getInternalTelemetryPort() > 65535) {
            throw new IllegalArgumentException("Runtime internal telemetry port is invalid");
        }
        long exporterTimeoutSeconds = OtelRuntimeGatewayPolicy.boundedTimeout(
                properties.getOtlpHttpExporterTimeout(), "HTTP exporter request").toSeconds();
        long exporterTimeoutMillis = properties.getOtlpHttpExporterTimeout().toMillis();
        StringBuilder yaml = new StringBuilder("receivers:\n  otlp:\n    protocols:\n")
                .append("      grpc:\n")
                .append("        endpoint: ").append(yamlScalar(gateway.grpcEndpoint())).append('\n')
                .append("        max_recv_msg_size_mib: ").append(maxRequestMiB).append('\n');
        appendGatewayProtocolSecurity(yaml, gateway);
        yaml.append("      http:\n")
                .append("        endpoint: ").append(yamlScalar(gateway.httpEndpoint())).append('\n')
                .append("        max_request_body_size: ").append(maxRequestMiB * 1024 * 1024).append('\n')
                .append("        read_timeout: ").append(gateway.readTimeout().toSeconds()).append("s\n")
                .append("        read_header_timeout: ").append(gateway.readTimeout().toSeconds()).append("s\n")
                .append("        write_timeout: ").append(gateway.writeTimeout().toSeconds()).append("s\n")
                .append("        idle_timeout: ").append(gateway.idleTimeout().toSeconds()).append("s\n");
        appendGatewayProtocolSecurity(yaml, gateway);
        appendHostMetricsReceiver(yaml, desiredConfig);
        appendPrometheusReceivers(yaml, sources.prometheusTargets());
        appendFileLogReceivers(yaml, sources.fileLogSources());
        OtelRuntimeGovernance.appendProcessors(yaml, desiredConfig, properties);
        yaml.append("""
                exporters:
                  otlphttp:
                    endpoint: ${env:HERTZBEAT_OTLP_HTTP_ENDPOINT}
                    headers:
                      Authorization: Bearer ${env:HERTZBEAT_OTLP_TOKEN}
                    compression: gzip
                    timeout: %ds
                    retry_on_failure:
                      enabled: true
                      initial_interval: 1s
                      max_interval: 30s
                      max_elapsed_time: 0s
                    sending_queue:
                      enabled: true
                      num_consumers: 4
                      block_on_overflow: false
                      sizer: requests
                      queue_size: 2048
                      storage: file_storage
                """.formatted(exporterTimeoutSeconds));
        yaml.append("""
                extensions:
                  health_check:
                    endpoint: 127.0.0.1:%d
                  file_storage:
                    directory: ${env:HERTZBEAT_OTEL_FILE_STORAGE_DIR}
                    timeout: 1s
                    max_size: 67108864
                    fsync: true
                    create_directory: false
                    recreate: false
                """.formatted(properties.getHealthPort()));
        appendGatewayExtension(yaml, gateway);
        String commonProcessors = OtelRuntimeGovernance.pipelineProcessors(desiredConfig, false);
        yaml.append("""
                service:
                  telemetry:
                    resource:
                      attributes:
                        - name: service.name
                          value: hertzbeat-otel-runtime
                        - name: service.namespace
                          value: hertzbeat
                        - name: hertzbeat.collector.id
                          value: ${env:HERTZBEAT_COLLECTOR_ID}
                        - name: hertzbeat.workspace_id
                          value: ${env:HERTZBEAT_WORKSPACE_ID}
                    metrics:
                      level: basic
                      readers:
                        - pull:
                            exporter:
                              prometheus:
                                host: '127.0.0.1'
                                port: %d
                                without_type_suffix: true
                                without_units: true
                        - periodic:
                            interval: 10000
                            timeout: %d
                            exporter:
                              otlp:
                                protocol: http/protobuf
                                endpoint: ${env:HERTZBEAT_OTLP_HTTP_ENDPOINT}/v1/metrics
                                headers:
                                  - name: Authorization
                                    value: Bearer ${env:HERTZBEAT_OTLP_TOKEN}
                                compression: gzip
                                timeout: %d
                  extensions: [%s]
                  pipelines:
                    metrics:
                      receivers: [%s]
                      processors: [%s]
                      exporters: [otlphttp]
                    logs:
                      receivers: [%s]
                      processors: [%s]
                      exporters: [otlphttp]
                    traces:
                      receivers: [otlp]
                      processors: [%s]
                      exporters: [otlphttp]
                """.formatted(
                properties.getInternalTelemetryPort(),
                exporterTimeoutMillis,
                exporterTimeoutMillis,
                gateway.enabled() ? "health_check, file_storage, bearertokenauth" : "health_check, file_storage",
                metricsReceivers(desiredConfig.hostMetricsEnabled(), sources.prometheusTargets()),
                commonProcessors,
                logReceivers(sources.fileLogSources()),
                commonProcessors,
                OtelRuntimeGovernance.pipelineProcessors(desiredConfig, true)
        ));
        return yaml.toString();
    }

    private static void appendGatewayProtocolSecurity(
            StringBuilder yaml, OtelRuntimeGatewayPolicy.ResolvedGateway gateway) {
        if (!gateway.enabled()) {
            return;
        }
        if (gateway.certificateFile() != null) {
            yaml.append("        tls:\n")
                    .append("          cert_file: ").append(yamlScalar(gateway.certificateFile().toString())).append('\n')
                    .append("          key_file: ").append(yamlScalar(gateway.privateKeyFile().toString())).append('\n')
                    .append("          min_version: '1.2'\n")
                    .append("          reload_interval: 1m\n");
            if (gateway.clientCaFile() != null) {
                yaml.append("          client_ca_file: ")
                        .append(yamlScalar(gateway.clientCaFile().toString())).append('\n')
                        .append("          client_ca_file_reload: true\n");
            }
        }
        yaml.append("        auth:\n")
                .append("          authenticator: bearertokenauth\n");
    }

    private static void appendGatewayExtension(
            StringBuilder yaml, OtelRuntimeGatewayPolicy.ResolvedGateway gateway) {
        if (!gateway.enabled()) {
            return;
        }
        yaml.append("  bearertokenauth:\n");
        if (gateway.bearerTokenFile() != null) {
            yaml.append("    filename: ").append(yamlScalar(gateway.bearerTokenFile().toString())).append('\n');
        } else {
            yaml.append("    token: ${env:HERTZBEAT_OTLP_GATEWAY_TOKEN}\n");
        }
    }

    private static void appendHostMetricsReceiver(StringBuilder yaml, ManagedOtelRuntimeConfig config) {
        if (!config.hostMetricsEnabled()) {
            return;
        }
        yaml.append("  hostmetrics:\n")
                .append("    collection_interval: ").append(config.hostMetricsInterval().toSeconds()).append("s\n")
                .append("    scrapers:\n");
        config.hostMetricsScrapers().stream()
                .sorted()
                .forEach(scraper -> yaml.append("      ").append(scraper.configName()).append(":\n"));
    }

    private static void appendPrometheusReceivers(
            StringBuilder yaml, List<OtelRuntimeSourcePolicy.ResolvedPrometheusTarget> targets) {
        for (OtelRuntimeSourcePolicy.ResolvedPrometheusTarget target : targets) {
            URI endpoint = target.endpoint();
            String path = endpoint.getRawPath() == null || endpoint.getRawPath().isBlank()
                    ? "/metrics"
                    : endpoint.getRawPath();
            yaml.append("  prometheus/").append(target.name()).append(":\n")
                    .append("    config:\n")
                    .append("      scrape_configs:\n")
                    .append("        - job_name: ").append(yamlScalar(target.name())).append('\n')
                    .append("          scrape_interval: ").append(target.interval().toSeconds()).append("s\n")
                    .append("          scrape_timeout: ").append(target.timeout().toSeconds()).append("s\n")
                    .append("          sample_limit: 50000\n")
                    .append("          label_limit: 64\n")
                    .append("          label_name_length_limit: 256\n")
                    .append("          label_value_length_limit: 1024\n")
                    .append("          body_size_limit: 32MiB\n")
                    .append("          scheme: ").append(endpoint.getScheme().toLowerCase(Locale.ROOT)).append('\n')
                    .append("          metrics_path: ").append(yamlScalar(path)).append('\n')
                    .append("          static_configs:\n")
                    .append("            - targets: [")
                    .append(yamlScalar(endpoint.getRawAuthority())).append("]\n");
            if (!target.headerSecretEnvironment().isEmpty()) {
                yaml.append("          http_headers:\n");
                target.headerSecretEnvironment().forEach((header, environment) -> yaml
                        .append("            ").append(yamlScalar(header)).append(":\n")
                        .append("              secrets: [")
                        .append(yamlScalar("${env:" + environment + "}"))
                        .append("]\n"));
            }
            if (target.tlsCaFile() != null) {
                yaml.append("          tls_config:\n")
                        .append("            ca_file: ").append(yamlScalar(target.tlsCaFile().toString())).append('\n')
                        .append("            min_version: TLS12\n");
            }
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
                    .append("    poll_interval: 500ms\n")
                    .append("    max_log_size: 1MiB\n")
                    .append("    max_log_size_behavior: truncate\n")
                    .append("    max_concurrent_files: 32\n")
                    .append("    max_batches: 2\n")
                    .append("    resource:\n")
                    .append("      service.name: ").append(yamlScalar(source.name())).append('\n');
        }
    }

    private static String metricsReceivers(
            boolean hostMetricsEnabled, List<OtelRuntimeSourcePolicy.ResolvedPrometheusTarget> targets) {
        List<String> receivers = new ArrayList<>(targets.size() + 2);
        if (hostMetricsEnabled) {
            receivers.add("hostmetrics");
        }
        receivers.add("otlp");
        targets.forEach(target -> receivers.add("prometheus/" + target.name()));
        return String.join(", ", receivers);
    }

    private static String logReceivers(List<OtelRuntimeSourcePolicy.ResolvedFileLogSource> sources) {
        List<String> receivers = new ArrayList<>(sources.size() + 1);
        receivers.add("otlp");
        sources.forEach(source -> receivers.add("filelog/" + source.name()));
        return String.join(", ", receivers);
    }

    private static String yamlScalar(String value) {
        return "'" + value.replace("'", "''") + "'";
    }
}
