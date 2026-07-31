/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.v2.guide;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.GuideBlock;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Authentication;
import org.apache.hertzbeat.observability.instrumentation.v2.guide.InstrumentationSourceGuideV2Registry.GuideContext;
import org.junit.jupiter.api.Test;

class InstrumentationSourceGuideV2TemplatesTest {

    private final InstrumentationSourceGuideV2Registry registry =
            InstrumentationSourceGuideV2Registry.official();
    private final GuideContext context = new GuideContext(
            "https://otel.example.test/api/otlp",
            "http/protobuf",
            new ServiceIdentity("checkout-api", "commerce", "prod", null, null),
            Authentication.BEARER_TOKEN);

    @Test
    void rendersHybridCollectorEnvironmentWithoutSecretMaterial() {
        List<GuideBlock> blocks = registry.render("hertzbeat_hybrid_collector", context);
        String content = content(blocks);

        assertTrue(content.contains("HERTZBEAT_OTEL_RUNTIME_ENABLED=true"));
        assertTrue(content.contains("HERTZBEAT_OTLP_HTTP_ENDPOINT=https://otel.example.test/api/otlp"));
        assertTrue(content.contains("HERTZBEAT_OTLP_TOKEN=${HERTZBEAT_TOKEN}"));
        assertTrue(content.contains("HERTZBEAT_OTLP_GRPC_LISTEN_ENDPOINT=127.0.0.1:4317"));
        assertTrue(content.contains("HERTZBEAT_OTLP_HTTP_LISTEN_ENDPOINT=127.0.0.1:4318"));
        assertDetectionResourceContext(content);
        assertCommonSteps(blocks);
    }

    @Test
    void rendersHonestCollectorLogstashAndVectorPipelines() {
        String otel = content(registry.render("opentelemetry_collector", context));
        assertTrue(otel.contains("otlphttp/hertzbeat"));
        assertTrue(otel.contains("HERTZBEAT_TOKEN=${HERTZBEAT_TOKEN}"));
        assertTrue(otel.contains("Authorization: \"Bearer ${env:HERTZBEAT_TOKEN}\""));
        assertTrue(otel.contains("resource/hertzbeat_context"));
        assertTrue(otel.contains("key: service.name"));
        assertTrue(otel.contains("value: \"checkout-api\""));
        assertTrue(otel.contains("key: service.namespace"));
        assertTrue(otel.contains("value: \"commerce\""));
        assertTrue(otel.contains("key: deployment.environment.name"));
        assertTrue(otel.contains("value: \"prod\""));
        assertTrue(otel.contains("processors: [<existing-processors>, resource/hertzbeat_context]"));
        assertTrue(otel.contains("exporters: [<existing-exporters>, otlphttp/hertzbeat]"));

        String logstash = content(registry.render("logstash", context));
        assertTrue(logstash.contains("tcplog/logstash"));
        assertTrue(logstash.contains("listen_address: 0.0.0.0:2256"));
        assertTrue(logstash.contains("codec => json_lines"));
        assertTrue(logstash.contains("LOGSTASH_OTEL_TCP_PORT=2256"));
        assertTrue(logstash.contains("port => \"${LOGSTASH_OTEL_TCP_PORT}\""));
        assertTrue(logstash.contains("transform/logstash_context"));
        assertTrue(logstash.contains("service.name"));
        assertTrue(logstash.contains("checkout-api"));
        assertTrue(logstash.contains("service.namespace"));
        assertTrue(logstash.contains("commerce"));
        assertTrue(logstash.contains("deployment.environment.name"));
        assertTrue(logstash.contains("prod"));
        assertTrue(logstash.contains("batch:"));
        assertFalse(logstash.contains("logstash_otlp"));

        String vector = content(registry.render("vector", context));
        assertTrue(vector.contains("type: opentelemetry"));
        assertTrue(vector.contains("protocol:"));
        assertTrue(vector.contains("type: http"));
        assertTrue(vector.contains("method: post"));
        assertTrue(vector.contains("codec: otlp"));
        assertTrue(vector.contains("resourceLogs"));
        assertTrue(vector.contains("type: remap"));
        assertTrue(vector.contains("service.name"));
        assertTrue(vector.contains("checkout-api"));
        assertTrue(vector.contains("${HERTZBEAT_TOKEN}"));
    }

    @Test
    void rendersExistingManagedSourceConfigurationNames() {
        String hostMetrics = content(registry.render("hertzbeat_host_metrics", context));
        assertTrue(hostMetrics.contains("HERTZBEAT_OTEL_HOST_METRICS_ENABLED=true"));
        assertTrue(hostMetrics.contains("HERTZBEAT_OTEL_HOST_METRICS_INTERVAL=<10s-to-5m>"));
        assertDetectionResourceContext(hostMetrics);

        String prometheus = content(registry.render("hertzbeat_prometheus", context));
        assertTrue(prometheus.contains("collector:"));
        assertTrue(prometheus.contains("otel-runtime:"));
        assertTrue(prometheus.contains("prometheus-targets:"));
        assertTrue(prometheus.contains("- name: \"checkout-api\""));
        assertFalse(prometheus.contains("<safe-target-name>"));
        assertTrue(prometheus.contains("endpoint: <http-or-https-metrics-endpoint>"));
        assertDetectionResourceContext(prometheus);

        String fileLogs = content(registry.render("hertzbeat_file_logs", context));
        assertTrue(fileLogs.contains("file-log-allow-roots:"));
        assertTrue(fileLogs.contains("file-log-profiles:"));
        assertTrue(fileLogs.contains("file-log-sources:"));
        assertTrue(fileLogs.contains("- name: \"checkout-api\""));
        assertFalse(fileLogs.contains("<safe-source-name>"));
        assertTrue(fileLogs.contains("path-profile: <administrator-approved-path-profile>"));
        assertDetectionResourceContext(fileLogs);
        String configuredPattern = fileLogs.lines()
                .dropWhile(line -> !line.trim().equals("<administrator-approved-path-profile>:"))
                .skip(1)
                .map(String::trim)
                .filter(line -> line.startsWith("- "))
                .map(line -> line.substring(2))
                .findFirst()
                .orElseThrow();
        assertTrue(Path.of(configuredPattern).isAbsolute());

        for (String recipeId : List.of(
                "hertzbeat_hybrid_collector",
                "opentelemetry_collector",
                "existing_otlp",
                "logstash",
                "vector",
                "hertzbeat_host_metrics",
                "hertzbeat_prometheus",
                "hertzbeat_file_logs")) {
            List<GuideBlock> blocks = registry.render(recipeId, context);
            assertCommonSteps(blocks);
            assertTrue(blocks.stream()
                    .filter(block -> block.content() != null && block.content().contains("${HERTZBEAT_TOKEN}"))
                    .allMatch(block -> block.placeholders().equals(List.of("authorizationToken"))));
        }
    }

    private void assertCommonSteps(List<GuideBlock> blocks) {
        assertTrue(blocks.stream().anyMatch(block -> block.type() == BlockType.ENVIRONMENT));
        assertTrue(blocks.stream().anyMatch(block -> block.type() == BlockType.CODE));
        assertTrue(blocks.stream().anyMatch(block -> block.type() == BlockType.NOTE));
        assertTrue(blocks.stream().anyMatch(block -> block.type() == BlockType.CHECK));
    }

    private void assertDetectionResourceContext(String content) {
        assertTrue(content.contains(
                "OTEL_RESOURCE_ATTRIBUTES=service.name=checkout-api,"
                        + "service.namespace=commerce,deployment.environment.name=prod"));
    }

    private String content(List<GuideBlock> blocks) {
        return blocks.stream()
                .map(GuideBlock::content)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.joining("\n"));
    }
}
