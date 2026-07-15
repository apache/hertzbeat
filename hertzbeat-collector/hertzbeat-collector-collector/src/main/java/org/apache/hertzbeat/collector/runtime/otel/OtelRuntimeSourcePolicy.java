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
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;

/**
 * Applies local file-system ceilings to server-owned telemetry source intent.
 */
public class OtelRuntimeSourcePolicy {

    private static final int MAXIMUM_PATTERNS_PER_PROFILE = 16;
    private static final int MAXIMUM_PATTERN_LENGTH = 1024;
    private static final String GLOB_CHARACTERS = "*?[{";

    public ResolvedSources resolve(ManagedOtelRuntimeConfig config, OtelRuntimeProperties properties) {
        try {
            Path home = properties.getHome().toAbsolutePath().normalize();
            boolean hasFileLogSources = !config.fileLogSources().isEmpty();
            List<Path> allowRoots = hasFileLogSources
                    ? realPaths(properties.getFileLogAllowRoots(), home, "allow root")
                    : List.of();
            List<Path> denyPaths = hasFileLogSources
                    ? realPaths(properties.getFileLogDenyPaths(), home, "deny path")
                    : List.of();
            List<ResolvedFileLogSource> fileLogSources = resolveFileLogSources(
                    config.fileLogSources(), properties.getFileLogProfiles(), allowRoots, denyPaths);
            Path storageDirectory = OtelRuntimeConfigRenderer.resolve(home, properties.getFileStorageDirectory());
            return new ResolvedSources(config.prometheusTargets(), fileLogSources, storageDirectory);
        } catch (IOException exception) {
            throw new IllegalArgumentException("File log path policy cannot be resolved", exception);
        }
    }

    private List<ResolvedFileLogSource> resolveFileLogSources(
            List<ManagedOtelRuntimeConfig.FileLogSource> sources,
            Map<String, List<String>> profiles,
            List<Path> allowRoots,
            List<Path> denyPaths) throws IOException {
        if (!sources.isEmpty() && allowRoots.isEmpty()) {
            throw new IllegalArgumentException("File log collection requires a local allow root");
        }
        Map<String, List<String>> safeProfiles = profiles == null ? Map.of() : profiles;
        List<ResolvedFileLogSource> resolved = new ArrayList<>(sources.size());
        for (ManagedOtelRuntimeConfig.FileLogSource source : sources) {
            List<String> patterns = safeProfiles.get(source.pathProfile());
            if (patterns == null || patterns.isEmpty()) {
                throw new IllegalArgumentException("Unknown or empty file log path profile: " + source.pathProfile());
            }
            if (patterns.size() > MAXIMUM_PATTERNS_PER_PROFILE) {
                throw new IllegalArgumentException("File log path profile contains too many patterns");
            }
            List<String> resolvedPatterns = new ArrayList<>(patterns.size());
            for (String pattern : patterns) {
                resolvedPatterns.add(validatePattern(pattern, allowRoots, denyPaths));
            }
            resolved.add(new ResolvedFileLogSource(source.name(), resolvedPatterns));
        }
        return List.copyOf(resolved);
    }

    private String validatePattern(String pattern, List<Path> allowRoots, List<Path> denyPaths) throws IOException {
        String value = StringUtils.trimToNull(pattern);
        if (value == null || value.length() > MAXIMUM_PATTERN_LENGTH || value.contains("\0")) {
            throw new IllegalArgumentException("File log path pattern is empty or too long");
        }
        if (value.contains("**") || hasTraversalSegment(value)) {
            throw new IllegalArgumentException("Recursive globs and path traversal are not allowed");
        }
        Path patternPath = Path.of(value);
        if (!patternPath.isAbsolute()) {
            throw new IllegalArgumentException("File log path pattern must be absolute");
        }
        Path realBase = pathBeforeGlob(value).toRealPath();
        if (allowRoots.stream().noneMatch(realBase::startsWith)) {
            throw new IllegalArgumentException("File log path escapes local allow roots");
        }
        if (denyPaths.stream().anyMatch(realBase::startsWith)) {
            throw new IllegalArgumentException("File log path is denied by local policy");
        }
        return value.replace('\\', '/');
    }

    private Path pathBeforeGlob(String pattern) {
        int firstGlob = firstGlobIndex(pattern);
        if (firstGlob < 0) {
            return Path.of(pattern);
        }
        int lastSeparator = Math.max(pattern.lastIndexOf('/', firstGlob), pattern.lastIndexOf('\\', firstGlob));
        if (lastSeparator < 0) {
            throw new IllegalArgumentException("File log path pattern has no absolute base directory");
        }
        return Path.of(pattern.substring(0, lastSeparator));
    }

    private int firstGlobIndex(String value) {
        int first = -1;
        for (int index = 0; index < GLOB_CHARACTERS.length(); index++) {
            int candidate = value.indexOf(GLOB_CHARACTERS.charAt(index));
            if (candidate >= 0 && (first < 0 || candidate < first)) {
                first = candidate;
            }
        }
        return first;
    }

    private boolean hasTraversalSegment(String value) {
        for (String segment : value.replace('\\', '/').split("/")) {
            if ("..".equals(segment)) {
                return true;
            }
        }
        return false;
    }

    private List<Path> realPaths(List<Path> paths, Path home, String label) throws IOException {
        if (paths == null || paths.isEmpty()) {
            return List.of();
        }
        List<Path> resolved = new ArrayList<>(paths.size());
        for (Path path : paths) {
            if (path == null) {
                throw new IllegalArgumentException("File log " + label + " is missing");
            }
            resolved.add(OtelRuntimeConfigRenderer.resolve(home, path).toRealPath());
        }
        return List.copyOf(resolved);
    }

    /**
     * Source intent after local policy enforcement.
     */
    public record ResolvedSources(List<ManagedOtelRuntimeConfig.PrometheusTarget> prometheusTargets,
                                  List<ResolvedFileLogSource> fileLogSources,
                                  Path storageDirectory) {

        public ResolvedSources {
            prometheusTargets = List.copyOf(prometheusTargets);
            fileLogSources = List.copyOf(fileLogSources);
            storageDirectory = storageDirectory.toAbsolutePath().normalize();
        }
    }

    /**
     * A file source containing only canonical, locally approved patterns.
     */
    public record ResolvedFileLogSource(String name, List<String> includePatterns) {

        public ResolvedFileLogSource {
            includePatterns = List.copyOf(includePatterns);
        }
    }
}
