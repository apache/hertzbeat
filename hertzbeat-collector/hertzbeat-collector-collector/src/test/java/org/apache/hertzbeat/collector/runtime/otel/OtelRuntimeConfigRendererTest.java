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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
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
        properties.setConfigSchema(1);
        properties.setConfigRevision(42);
        properties.setHostMetricsInterval(Duration.ofSeconds(30));

        Path config = new OtelRuntimeConfigRenderer().render(properties);
        String yaml = Files.readString(config);

        assertTrue(yaml.contains("hostmetrics:"));
        assertTrue(yaml.contains("collection_interval: 30s"));
        assertTrue(yaml.contains("processors: [memory_limiter, resource, batch]"));
        assertTrue(yaml.contains("endpoint: 127.0.0.1:13247"));
        assertTrue(yaml.contains("hertzbeat.config.schema"));
        assertTrue(yaml.contains("value: \"42\""));
        assertTrue(yaml.contains("${env:HERTZBEAT_OTLP_TOKEN}"));
        assertFalse(yaml.contains(properties.getToken()));
    }

    @Test
    void rendersPrometheusAndApprovedFileLogPipelinesWithPersistentOffsets() throws Exception {
        Path logs = Files.createDirectories(tempDir.resolve("logs/payments"));
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("conf/runtime.yaml"));
        properties.setPrometheusTargets(List.of(new ManagedOtelRuntimeConfig.PrometheusTarget(
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
        assertTrue(yaml.contains("max_concurrent_files: 32"));
        assertTrue(yaml.contains("directory: ${env:HERTZBEAT_OTEL_FILE_STORAGE_DIR}"));
        assertTrue(yaml.contains("    logs:\n      receivers: [filelog/payments]"));
        assertTrue(Files.isDirectory(tempDir.resolve("data/otel-runtime")));
    }
}
