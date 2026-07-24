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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.time.Duration;
import org.apache.hertzbeat.collector.dispatch.CollectorRuntimeStatusProvider;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class OtelRuntimeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(OtelRuntimeConfiguration.class));

    @Test
    void remainsStoppedByDefaultWhileKeepingRuntimeEnablementAvailable() {
        contextRunner.run(context -> {
            assertTrue(context.isRunning());
            OtelRuntimeSupervisor supervisor = context.getBean(OtelRuntimeSupervisor.class);
            assertEquals(OtelRuntimeState.STOPPED, supervisor.snapshot().state());
            assertTrue(context.getBean(CollectorRuntimeStatusProvider.class) instanceof OtelRuntimeStatusProvider);
        });
    }

    @Test
    void missingOptionalRuntimeDegradesWithoutFailingJavaCollectorContext() {
        contextRunner
                .withPropertyValues(
                        "collector.otel-runtime.enabled=true",
                        "collector.otel-runtime.restart-delay=1h",
                        "collector.otel-runtime.collector-id=edge-test",
                        "collector.otel-runtime.token=test-intake-token",
                        "collector.otel-runtime.home=/path/that/does/not/exist"
                )
                .run(context -> {
                    assertTrue(context.isRunning());
                    assertTrue(context.containsBean("otelRuntimeSupervisor"));
                    OtelRuntimeSupervisor supervisor = context.getBean(OtelRuntimeSupervisor.class);
                    assertEquals(OtelRuntimeState.DEGRADED, supervisor.snapshot().state());
                });
    }

    @Test
    void bindsManagedPrometheusAndFileLogSourceIntent() {
        contextRunner
                .withPropertyValues(
                        "collector.otel-runtime.prometheus-targets[0].name=payments",
                        "collector.otel-runtime.prometheus-targets[0].endpoint=http://127.0.0.1:9464/metrics",
                        "collector.otel-runtime.prometheus-targets[0].interval=30s",
                        "collector.otel-runtime.prometheus-targets[0].timeout=5s",
                        "collector.otel-runtime.prometheus-targets[0].header-secret-refs.X-Scrape-Token=payments-token",
                        "collector.otel-runtime.prometheus-targets[0].tls-ca-profile=payments-ca",
                        "collector.otel-runtime.prometheus-header-secrets.payments-token=local-secret",
                        "collector.otel-runtime.prometheus-tls-ca-profiles.payments-ca=/etc/payments-ca.pem",
                        "collector.otel-runtime.host-metrics-scrapers[0]=CPU",
                        "collector.otel-runtime.host-metrics-scrapers[1]=MEMORY",
                        "collector.otel-runtime.file-log-sources[0].name=payments",
                        "collector.otel-runtime.file-log-sources[0].path-profile=payments-logs",
                        "collector.otel-runtime.file-log-allow-roots[0]=/var/log",
                        "collector.otel-runtime.file-log-profiles.payments-logs[0]=/var/log/payments/*.log"
                )
                .run(context -> {
                    assertTrue(context.isRunning());
                    OtelRuntimeProperties properties = context.getBean(OtelRuntimeProperties.class);
                    assertEquals("payments", properties.getPrometheusTargets().getFirst().name());
                    assertEquals(Duration.ofSeconds(5),
                            properties.getPrometheusTargets().getFirst().timeout());
                    assertEquals("payments-token",
                            properties.getPrometheusTargets().getFirst().headerSecretRefs().get("X-Scrape-Token"));
                    assertEquals("local-secret", properties.getPrometheusHeaderSecrets().get("payments-token"));
                    assertEquals(2, properties.getHostMetricsScrapers().size());
                    assertEquals("payments-logs", properties.getFileLogSources().getFirst().pathProfile());
                    assertEquals("/var/log/payments/*.log",
                            properties.getFileLogProfiles().get("payments-logs").getFirst());
                });
    }

    @Test
    void bindsExplicitGatewaySecurityAndTransportBounds() {
        contextRunner
                .withPropertyValues(
                        "collector.otel-runtime.otlp-gateway-enabled=true",
                        "collector.otel-runtime.otlp-grpc-endpoint=0.0.0.0:4317",
                        "collector.otel-runtime.otlp-http-endpoint=0.0.0.0:4318",
                        "collector.otel-runtime.otlp-max-request-mi-b=8",
                        "collector.otel-runtime.otlp-read-timeout=20s",
                        "collector.otel-runtime.otlp-write-timeout=25s",
                        "collector.otel-runtime.otlp-idle-timeout=45s",
                        "collector.otel-runtime.runtime-memory-limit-mi-b=512",
                        "collector.otel-runtime.runtime-memory-spike-limit-mi-b=128",
                        "collector.otel-runtime.runtime-memory-check-interval=500ms",
                        "collector.otel-runtime.otlp-gateway-certificate-file=/etc/hertzbeat/gateway.crt",
                        "collector.otel-runtime.otlp-gateway-private-key-file=/etc/hertzbeat/gateway.key",
                        "collector.otel-runtime.otlp-gateway-client-ca-file=/etc/hertzbeat/client-ca.crt",
                        "collector.otel-runtime.otlp-gateway-bearer-token-file=/etc/hertzbeat/gateway.tokens"
                )
                .run(context -> {
                    assertTrue(context.isRunning());
                    OtelRuntimeProperties properties = context.getBean(OtelRuntimeProperties.class);
                    assertTrue(properties.isOtlpGatewayEnabled());
                    assertEquals("0.0.0.0:4317", properties.getOtlpGrpcEndpoint());
                    assertEquals(8, properties.getOtlpMaxRequestMiB());
                    assertEquals(Duration.ofSeconds(20), properties.getOtlpReadTimeout());
                    assertEquals(512, properties.getRuntimeMemoryLimitMiB());
                    assertEquals(128, properties.getRuntimeMemorySpikeLimitMiB());
                    assertEquals(Duration.ofMillis(500), properties.getRuntimeMemoryCheckInterval());
                    assertEquals(Path.of("/etc/hertzbeat/gateway.crt"),
                            properties.getOtlpGatewayCertificateFile());
                    assertEquals(Path.of("/etc/hertzbeat/gateway.tokens"),
                            properties.getOtlpGatewayBearerTokenFile());
                    assertTrue(properties.getOtlpGatewayBearerToken().isBlank());
                });
    }
}
