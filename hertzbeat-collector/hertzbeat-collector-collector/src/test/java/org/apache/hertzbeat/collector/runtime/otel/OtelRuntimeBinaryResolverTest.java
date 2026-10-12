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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeBinaryResolverTest {

    @TempDir
    private Path tempDir;

    @Test
    void resolvesExplicitExecutableWithoutGuessingPlatform() throws Exception {
        Path executable = Files.createFile(tempDir.resolve("custom-runtime"));
        assertTrue(executable.toFile().setExecutable(true));
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setBinary(executable);

        Path resolved = new OtelRuntimeBinaryResolver(properties, "Mac OS X", "aarch64").resolve();

        assertEquals(executable.toRealPath(), resolved);
    }

    @Test
    void resolvesPackagedRuntimeForNormalizedPlatform() throws Exception {
        Path executable = tempDir.resolve("runtime/macos-arm64/hertzbeat-otel-runtime");
        Files.createDirectories(executable.getParent());
        Files.createFile(executable);
        assertTrue(executable.toFile().setExecutable(true));
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);

        Path resolved = new OtelRuntimeBinaryResolver(properties, "Mac OS X", "aarch64").resolve();

        assertEquals(executable.toRealPath(), resolved);
    }

    @Test
    void reportsActionableErrorWhenPackagedRuntimeIsMissing() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> new OtelRuntimeBinaryResolver(properties, "Linux", "amd64").resolve());

        assertTrue(error.getMessage().contains("linux-amd64"));
        assertTrue(error.getMessage().contains("HERTZBEAT_OTEL_RUNTIME_BINARY"));
    }
}
