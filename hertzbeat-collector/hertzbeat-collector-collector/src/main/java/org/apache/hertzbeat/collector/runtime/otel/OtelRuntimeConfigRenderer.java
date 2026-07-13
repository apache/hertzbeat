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
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Set;

/**
 * Renders the version-bound Phase 0 runtime configuration without embedding credentials.
 */
public class OtelRuntimeConfigRenderer {

    private static final Set<PosixFilePermission> OWNER_ONLY = Set.of(
            PosixFilePermission.OWNER_READ,
            PosixFilePermission.OWNER_WRITE
    );

    /**
     * Render and atomically publish the active runtime configuration.
     *
     * @param properties runtime properties
     * @return absolute active configuration path
     * @throws IOException when the configuration cannot be written
     */
    public Path render(OtelRuntimeProperties properties) throws IOException {
        Path target = resolve(properties.getHome(), properties.getConfig());
        Files.createDirectories(target.getParent());
        Path temporary = Files.createTempFile(target.getParent(), "otel-runtime-", ".yaml.tmp");
        Files.writeString(temporary, template(properties.getHealthPort()), StandardCharsets.UTF_8);
        setOwnerOnlyWhenSupported(temporary);
        try {
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING);
        }
        setOwnerOnlyWhenSupported(target);
        return target;
    }

    static Path resolve(Path home, Path path) {
        Path resolved = path.isAbsolute() ? path : home.resolve(path);
        return resolved.toAbsolutePath().normalize();
    }

    private static void setOwnerOnlyWhenSupported(Path file) throws IOException {
        if (Files.getFileStore(file).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(file, OWNER_ONLY);
        }
    }

    private static String template(int healthPort) {
        return """
                receivers:
                  hostmetrics:
                    collection_interval: 10s
                    scrapers:
                      cpu:
                      disk:
                      filesystem:
                      load:
                      memory:
                      network:
                      paging:
                      processes:
                processors:
                  memory_limiter:
                    check_interval: 1s
                    limit_mib: 256
                    spike_limit_mib: 64
                  resource:
                    attributes:
                      - key: service.name
                        value: hertzbeat-otel-runtime
                        action: upsert
                      - key: hertzbeat.collector.id
                        value: ${env:HERTZBEAT_COLLECTOR_ID}
                        action: upsert
                      - key: hertzbeat.runtime
                        value: otel
                        action: upsert
                      - key: hertzbeat.workspace_id
                        value: ${env:HERTZBEAT_WORKSPACE_ID}
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
                service:
                  extensions: [health_check]
                  pipelines:
                    metrics:
                      receivers: [hostmetrics]
                      processors: [memory_limiter, resource, batch]
                      exporters: [otlphttp]
                """.formatted(healthPort);
    }
}
