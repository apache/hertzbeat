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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

/**
 * Resolves the runtime binary shipped for the local operating system and architecture.
 */
public class OtelRuntimeBinaryResolver {

    private final OtelRuntimeProperties properties;
    private final String osName;
    private final String osArch;

    public OtelRuntimeBinaryResolver(OtelRuntimeProperties properties) {
        this(properties, System.getProperty("os.name"), System.getProperty("os.arch"));
    }

    OtelRuntimeBinaryResolver(OtelRuntimeProperties properties, String osName, String osArch) {
        this.properties = properties;
        this.osName = osName;
        this.osArch = osArch;
    }

    /**
     * Resolve and validate the configured or packaged executable.
     *
     * @return canonical executable path
     */
    public Path resolve() {
        Path candidate = properties.getBinary();
        if (candidate == null || candidate.toString().isBlank()) {
            String platform = normalizeOs(osName) + "-" + normalizeArch(osArch);
            String executable = normalizeOs(osName).equals("windows")
                    ? "hertzbeat-otel-runtime.exe" : "hertzbeat-otel-runtime";
            candidate = properties.getHome().resolve("runtime").resolve(platform).resolve(executable);
        } else if (!candidate.isAbsolute()) {
            candidate = properties.getHome().resolve(candidate);
        }
        Path normalized = candidate.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalized) || !Files.isExecutable(normalized)) {
            throw new IllegalStateException("HertzBeat telemetry runtime is unavailable at " + normalized
                    + ". Reinstall the Collector for this platform or set HERTZBEAT_OTEL_RUNTIME_BINARY.");
        }
        try {
            return normalized.toRealPath();
        } catch (IOException error) {
            throw new IllegalStateException("Cannot resolve HertzBeat telemetry runtime at " + normalized, error);
        }
    }

    private static String normalizeOs(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.contains("mac") || normalized.contains("darwin")) {
            return "macos";
        }
        if (normalized.contains("win")) {
            return "windows";
        }
        if (normalized.contains("linux")) {
            return "linux";
        }
        throw new IllegalStateException("Unsupported operating system for HertzBeat telemetry runtime: " + value);
    }

    private static String normalizeArch(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.equals("aarch64") || normalized.equals("arm64")) {
            return "arm64";
        }
        if (normalized.equals("amd64") || normalized.equals("x86_64")) {
            return "amd64";
        }
        throw new IllegalStateException("Unsupported architecture for HertzBeat telemetry runtime: " + value);
    }
}
