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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeConfigRendererTest {

    @TempDir
    private Path tempDir;

    @Test
    void rendersHostMetricsPipelineWithoutWritingSecrets() throws Exception {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(tempDir.resolve("conf/runtime.yaml"));
        properties.setToken("secret-must-stay-in-environment");
        properties.setHealthPort(13247);
        properties.setConfigSchema(ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION);
        properties.setConfigRevision(42);
        properties.setHostMetricsInterval(Duration.ofSeconds(30));

        Path config = new OtelRuntimeConfigRenderer().render(properties);
        String yaml = Files.readString(config);

        assertTrue(yaml.contains("hostmetrics:"));
        assertTrue(yaml.contains("otlp:"));
        assertTrue(yaml.contains("endpoint: '127.0.0.1:4317'"));
        assertTrue(yaml.contains("endpoint: '127.0.0.1:4318'"));
        assertTrue(yaml.contains("max_recv_msg_size_mib: 4"));
        assertTrue(yaml.contains("max_request_body_size: 4194304"));
        assertTrue(yaml.contains("check_interval: 1s\n    limit_mib: 256\n    spike_limit_mib: 64"));
        assertTrue(yaml.contains("collection_interval: 30s"));
        assertTrue(yaml.contains("resource_detection:\n    detectors: [env, system]"));
        assertTrue(yaml.contains("timeout: 2s"));
        assertTrue(yaml.contains("override: false"));
        assertTrue(yaml.contains("hostname_sources: [os]"));
        assertFalse(yaml.contains("detectors: [docker"));
        assertFalse(yaml.contains("filter/health_checks:"));
        assertTrue(yaml.contains("attributes/sanitize:"));
        assertTrue(yaml.contains("action: delete"));
        assertTrue(yaml.contains("processors: [memory_limiter, resource_detection, resource, attributes/sanitize, batch]"));
        assertTrue(yaml.contains("endpoint: 127.0.0.1:13247"));
        assertTrue(yaml.contains("hertzbeat.config.schema"));
        assertTrue(yaml.contains("value: \"42\""));
        assertTrue(yaml.contains("${env:HERTZBEAT_OTLP_TOKEN}"));
        assertTrue(yaml.contains("    traces:\n      receivers: [otlp]"));
        assertTrue(yaml.contains("receivers: [hostmetrics, otlp]"));
        assertTrue(yaml.contains("    logs:\n      receivers: [otlp]"));
        assertTrue(yaml.contains("sending_queue:"));
        assertTrue(yaml.contains("num_consumers: 4"));
        assertTrue(yaml.contains("queue_size: 2048"));
        assertTrue(yaml.contains("storage: file_storage"));
        assertTrue(yaml.contains("initial_interval: 1s"));
        assertTrue(yaml.contains("max_interval: 30s"));
        assertTrue(yaml.contains("max_elapsed_time: 0s"));
        assertTrue(yaml.contains("  file_storage:\n    directory: ${env:HERTZBEAT_OTEL_FILE_STORAGE_DIR}"));
        assertTrue(yaml.contains("extensions: [health_check, file_storage]"));
        assertFalse(yaml.contains(properties.getToken()));
        assertTrue(Files.isDirectory(tempDir.resolve("data/otel-runtime")));
    }

    @Test
    void rendersOnlyBoundedSharedRuntimeMemoryBudget() throws Exception {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("conf/runtime.yaml"));
        properties.setRuntimeMemoryLimitMiB(64);
        properties.setRuntimeMemorySpikeLimitMiB(16);
        properties.setRuntimeMemoryCheckInterval(Duration.ofMillis(100));

        String yaml = Files.readString(new OtelRuntimeConfigRenderer().render(properties));

        assertTrue(yaml.contains("check_interval: 100ms\n    limit_mib: 64\n    spike_limit_mib: 16"));
        assertEquals(3, occurrences(yaml, "processors: [memory_limiter,"));

        properties.setRuntimeMemoryLimitMiB(63);
        assertThrows(IllegalArgumentException.class, () -> new OtelRuntimeConfigRenderer().render(properties));
        properties.setRuntimeMemoryLimitMiB(64);
        properties.setRuntimeMemorySpikeLimitMiB(64);
        assertThrows(IllegalArgumentException.class, () -> new OtelRuntimeConfigRenderer().render(properties));
    }

    @Test
    void rendersExplicitEnvironmentCloudDetectionAndFixedNoisePreset() throws Exception {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(tempDir.resolve("conf/runtime.yaml"));
        properties.useDesiredConfig(new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                43,
                true,
                Duration.ofSeconds(30),
                List.of(),
                List.of(),
                "staging",
                Set.of(
                        ManagedOtelRuntimeConfig.ResourceDetector.SYSTEM,
                        ManagedOtelRuntimeConfig.ResourceDetector.DOCKER,
                        ManagedOtelRuntimeConfig.ResourceDetector.EC2),
                Set.of(ManagedOtelRuntimeConfig.TelemetryFilterPreset.HEALTH_CHECK_TRACES)
        ));

        String yaml = Files.readString(new OtelRuntimeConfigRenderer().render(properties));

        assertTrue(yaml.contains("detectors: [system, docker, ec2]"));
        assertTrue(yaml.contains("key: deployment.environment.name\n        value: 'staging'"));
        assertTrue(yaml.contains("filter/health_checks:"));
        assertTrue(yaml.contains("error_mode: ignore"));
        assertTrue(yaml.contains("attributes[\"http.route\"] == \"/health\""));
        String filteredProcessors = "memory_limiter, resource_detection, resource, attributes/sanitize, "
                + "filter/health_checks, batch";
        assertTrue(yaml.contains("traces:\n      receivers: [otlp]\n      processors: [" + filteredProcessors + "]"));
        assertFalse(yaml.contains("metrics:\n      receivers: [hostmetrics, otlp]\n      processors: ["
                + filteredProcessors + "]"));
    }

    @Test
    void rendersPrometheusAndApprovedFileLogPipelinesWithPersistentOffsets() throws Exception {
        Path logs = Files.createDirectories(tempDir.resolve("logs/payments"));
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("conf/runtime.yaml"));
        properties.setPrometheusTargets(List.of(ManagedOtelRuntimeConfig.PrometheusTarget.basic(
                "payments", URI.create("https://payments.internal:9464/metrics"), Duration.ofSeconds(30))));
        properties.setFileLogAllowRoots(List.of(tempDir.resolve("logs")));
        properties.setFileLogProfiles(Map.of("payments-logs", List.of(logs.resolve("*.log").toString())));
        properties.setFileLogSources(List.of(
                new ManagedOtelRuntimeConfig.FileLogSource("payments", "payments-logs")));

        Path config = new OtelRuntimeConfigRenderer().render(properties);
        String yaml = Files.readString(config);

        assertTrue(yaml.contains("prometheus/payments:"));
        assertTrue(yaml.contains("targets: ['payments.internal:9464']"));
        assertTrue(yaml.contains("filelog/payments:"));
        assertTrue(yaml.contains("start_at: end"));
        assertTrue(yaml.contains("storage: file_storage"));
        assertTrue(yaml.contains("poll_interval: 500ms"));
        assertTrue(yaml.contains("max_batches: 2"));
        assertTrue(yaml.contains("max_log_size_behavior: truncate"));
        assertTrue(yaml.contains("max_concurrent_files: 32"));
        assertTrue(yaml.contains("directory: ${env:HERTZBEAT_OTEL_FILE_STORAGE_DIR}"));
        assertTrue(yaml.contains("    logs:\n      receivers: [otlp, filelog/payments]"));
        assertTrue(Files.isDirectory(tempDir.resolve("data/otel-runtime")));
    }

    @Test
    void rendersOnlySelectedHostScrapersAndOmitsDisabledHostReceiver() throws Exception {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("conf/runtime.yaml"));
        properties.setHostMetricsScrapers(Set.of(
                ManagedOtelRuntimeConfig.HostMetricsScraper.CPU,
                ManagedOtelRuntimeConfig.HostMetricsScraper.MEMORY));

        String selected = Files.readString(new OtelRuntimeConfigRenderer().render(properties));

        assertTrue(selected.contains("      cpu:\n      memory:"));
        assertFalse(selected.contains("      network:"));

        properties.setHostMetricsEnabled(false);
        properties.setHostMetricsScrapers(Set.of());
        String disabled = Files.readString(new OtelRuntimeConfigRenderer().render(properties));

        assertFalse(disabled.contains("  hostmetrics:"));
        assertTrue(disabled.contains("metrics:\n      receivers: [otlp]"));
    }

    @Test
    void rendersBoundedPrometheusTlsAndSecretReferencesWithoutSecretValues() throws Exception {
        Path caFile = Files.writeString(tempDir.resolve("internal-ca.pem"), "test-ca");
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("conf/runtime.yaml"));
        properties.setPrometheusHeaderSecrets(Map.of("payments-token", "must-not-enter-yaml"));
        properties.setPrometheusTlsCaProfiles(Map.of("internal-ca", caFile));
        properties.setPrometheusTargets(List.of(new ManagedOtelRuntimeConfig.PrometheusTarget(
                "payments",
                URI.create("https://payments.internal:9464/metrics"),
                Duration.ofSeconds(30),
                Duration.ofSeconds(5),
                Map.of("X-Scrape-Token", "payments-token"),
                "internal-ca")));

        String yaml = Files.readString(new OtelRuntimeConfigRenderer().render(properties));

        assertTrue(yaml.contains("scrape_timeout: 5s"));
        assertTrue(yaml.contains("sample_limit: 50000"));
        assertTrue(yaml.contains("label_limit: 64"));
        assertTrue(yaml.contains("body_size_limit: 32MiB"));
        assertTrue(yaml.contains("http_headers:"));
        assertTrue(yaml.contains("'X-Scrape-Token':"));
        assertTrue(yaml.contains("secrets: ['${env:HERTZBEAT_PROM_SECRET_"));
        assertTrue(yaml.contains("tls_config:"));
        assertTrue(yaml.contains("ca_file: '" + caFile.toRealPath() + "'"));
        assertTrue(yaml.contains("min_version: TLS12"));
        assertFalse(yaml.contains("must-not-enter-yaml"));
    }

    @Test
    void rejectsUnsafeOtlpListenerConfiguration() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("conf/runtime.yaml"));
        properties.setOtlpHttpEndpoint("0.0.0.0:4318");

        assertThrows(IllegalArgumentException.class, () -> new OtelRuntimeConfigRenderer().render(properties));

        properties.setOtlpHttpEndpoint("127.0.0.1:4318/injected");
        assertThrows(IllegalArgumentException.class, () -> new OtelRuntimeConfigRenderer().render(properties));

        properties.setOtlpHttpEndpoint("127.0.0.1:4318");
        properties.setOtlpMaxRequestMiB(65);
        assertThrows(IllegalArgumentException.class, () -> new OtelRuntimeConfigRenderer().render(properties));
    }

    @Test
    void requiresTlsAndBearerAuthenticationForExplicitGatewayMode() throws Exception {
        Path certificate = Files.writeString(tempDir.resolve("gateway-cert.pem"), "certificate");
        Path privateKey = Files.writeString(tempDir.resolve("gateway-key.pem"), "private-key");
        Path tokenFile = Files.writeString(tempDir.resolve("gateway.tokens"), "integration-secret-token");
        Path clientCa = Files.writeString(tempDir.resolve("gateway-client-ca.pem"), "client-ca");
        OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(privateKey);
        OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(tokenFile);
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("conf/runtime.yaml"));
        properties.setOtlpGatewayEnabled(true);
        properties.setOtlpGrpcEndpoint("0.0.0.0:4317");
        properties.setOtlpHttpEndpoint("0.0.0.0:4318");

        assertThrows(IllegalArgumentException.class, () -> new OtelRuntimeConfigRenderer().render(properties));

        properties.setOtlpGatewayCertificateFile(certificate);
        properties.setOtlpGatewayPrivateKeyFile(privateKey);
        properties.setOtlpGatewayBearerTokenFile(tokenFile);
        properties.setOtlpGatewayClientCaFile(clientCa);
        properties.setOtlpReadTimeout(Duration.ofSeconds(15));
        properties.setOtlpWriteTimeout(Duration.ofSeconds(15));
        properties.setOtlpIdleTimeout(Duration.ofSeconds(30));

        String yaml = Files.readString(new OtelRuntimeConfigRenderer().render(properties));

        assertTrue(yaml.contains("read_timeout: 15s"));
        assertTrue(yaml.contains("write_timeout: 15s"));
        assertTrue(yaml.contains("idle_timeout: 30s"));
        assertEquals(2, occurrences(yaml, "auth:\n          authenticator: bearertokenauth"));
        assertEquals(2, occurrences(yaml, "cert_file: '" + certificate.toRealPath() + "'"));
        assertEquals(2, occurrences(yaml, "key_file: '" + privateKey.toRealPath() + "'"));
        assertEquals(2, occurrences(yaml, "client_ca_file: '" + clientCa.toRealPath() + "'"));
        assertTrue(yaml.contains("bearertokenauth:\n    filename: '" + tokenFile.toRealPath() + "'"));
        assertTrue(yaml.contains("extensions: [health_check, file_storage, bearertokenauth]"));
        assertFalse(yaml.contains("integration-secret-token"));

        properties.setOtlpGatewayBearerTokenFile(null);
        properties.setOtlpGatewayBearerToken("strong-inline-secret-token");
        String inlineSecretYaml = Files.readString(new OtelRuntimeConfigRenderer().render(properties));
        assertTrue(inlineSecretYaml.contains("token: ${env:HERTZBEAT_OTLP_GATEWAY_TOKEN}"));
        assertFalse(inlineSecretYaml.contains("strong-inline-secret-token"));
    }

    @Test
    void replacingSourcesDoesNotLeaveStaleReceiverOrPipelineReferences() throws Exception {
        Path logs = Files.createDirectories(tempDir.resolve("logs/payments"));
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("conf/runtime.yaml"));
        properties.setPrometheusTargets(List.of(ManagedOtelRuntimeConfig.PrometheusTarget.basic(
                "payments", URI.create("http://127.0.0.1:9464/metrics"), Duration.ofSeconds(30))));
        properties.setFileLogAllowRoots(List.of(tempDir.resolve("logs")));
        properties.setFileLogProfiles(Map.of("payments-logs", List.of(logs.resolve("*.log").toString())));
        properties.setFileLogSources(List.of(
                new ManagedOtelRuntimeConfig.FileLogSource("payments", "payments-logs")));
        OtelRuntimeConfigRenderer renderer = new OtelRuntimeConfigRenderer();
        assertTrue(Files.readString(renderer.render(properties)).contains("prometheus/payments"));

        properties.setPrometheusTargets(List.of());
        properties.setFileLogSources(List.of());
        String replaced = Files.readString(renderer.render(properties));

        assertFalse(replaced.contains("prometheus/payments"));
        assertFalse(replaced.contains("filelog/payments"));
        assertTrue(replaced.contains("metrics:\n      receivers: [hostmetrics, otlp]"));
        assertTrue(replaced.contains("logs:\n      receivers: [otlp]"));
    }

    private static int occurrences(String value, String target) {
        return (value.length() - value.replace(target, "").length()) / target.length();
    }
}
