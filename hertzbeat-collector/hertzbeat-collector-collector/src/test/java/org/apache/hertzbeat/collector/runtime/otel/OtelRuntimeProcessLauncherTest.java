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

import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeProcessLauncherTest {

    @TempDir
    private Path tempDir;

    @Test
    void buildsShellFreeRuntimeCommandAndKeepsTokenInEnvironment() {
        Path binary = tempDir.resolve("hertzbeat-otel-runtime").toAbsolutePath();
        Path config = tempDir.resolve("runtime.yaml").toAbsolutePath();
        Path log = tempDir.resolve("runtime.log").toAbsolutePath();
        Map<String, String> environment = Map.of("HERTZBEAT_OTLP_TOKEN", "secret-token");

        ProcessBuilder builder = new OtelRuntimeProcessLauncher()
                .processBuilder(binary, config, tempDir, log, environment, false);

        assertEquals(java.util.List.of(binary.toString(), "--config", config.toString()), builder.command());
        assertEquals(log.toFile(), builder.redirectOutput().file());
        assertEquals(ProcessBuilder.Redirect.appendTo(log.toFile()), builder.redirectError());
        assertEquals("secret-token", builder.environment().get("HERTZBEAT_OTLP_TOKEN"));
        assertFalse(String.join(" ", builder.command()).contains("secret-token"));
    }

    @Test
    void buildsPinnedValidateCommand() {
        Path binary = tempDir.resolve("hertzbeat-otel-runtime").toAbsolutePath();
        Path config = tempDir.resolve("runtime.yaml").toAbsolutePath();

        ProcessBuilder builder = new OtelRuntimeProcessLauncher()
                .processBuilder(binary, config, tempDir, tempDir.resolve("runtime.log"), Map.of(), true);

        assertEquals(java.util.List.of(binary.toString(), "validate", "--config", config.toString()), builder.command());
    }
}
