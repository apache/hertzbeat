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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.PathMatcher;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;

/**
 * Applies local file-system ceilings to server-owned telemetry source intent.
 */
public class OtelRuntimeSourcePolicy {

    private static final int MAXIMUM_PATTERNS_PER_PROFILE = 16;
    private static final int MAXIMUM_PATTERN_LENGTH = 1024;
    private static final int MAXIMUM_FILES_PER_SOURCE = 256;
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
            List<ResolvedPrometheusTarget> prometheusTargets = resolvePrometheusTargets(
                    config.prometheusTargets(), properties, home);
            Path storageDirectory = OtelRuntimeConfigRenderer.resolve(home, properties.getFileStorageDirectory());
            return new ResolvedSources(prometheusTargets, fileLogSources, storageDirectory);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Managed telemetry source policy cannot be resolved", exception);
        }
    }

    private List<ResolvedPrometheusTarget> resolvePrometheusTargets(
            List<ManagedOtelRuntimeConfig.PrometheusTarget> targets,
            OtelRuntimeProperties properties,
            Path home) throws IOException {
        Map<String, String> secrets = properties.getPrometheusHeaderSecrets() == null
                ? Map.of() : properties.getPrometheusHeaderSecrets();
        Map<String, Path> tlsProfiles = properties.getPrometheusTlsCaProfiles() == null
                ? Map.of() : properties.getPrometheusTlsCaProfiles();
        List<ResolvedPrometheusTarget> resolved = new ArrayList<>(targets.size());
        for (ManagedOtelRuntimeConfig.PrometheusTarget target : targets) {
            Map<String, String> headerEnvironment = new LinkedHashMap<>();
            target.headerSecretRefs().forEach((header, secretRef) -> {
                String secret = secrets.get(secretRef);
                if (secret == null || secret.isBlank()) {
                    throw new IllegalArgumentException("Unknown or empty Prometheus header secret reference: "
                            + secretRef);
                }
                headerEnvironment.put(header, prometheusSecretEnvironmentName(secretRef));
            });
            Path tlsCaFile = null;
            if (!target.tlsCaProfile().isEmpty()) {
                Path configured = tlsProfiles.get(target.tlsCaProfile());
                if (configured == null) {
                    throw new IllegalArgumentException("Unknown Prometheus TLS CA profile: " + target.tlsCaProfile());
                }
                tlsCaFile = OtelRuntimeConfigRenderer.resolve(home, configured).toRealPath();
                if (!Files.isRegularFile(tlsCaFile)) {
                    throw new IllegalArgumentException("Prometheus TLS CA profile is not a regular file");
                }
            }
            resolved.add(new ResolvedPrometheusTarget(
                    target.name(), target.endpoint(), target.interval(), target.timeout(),
                    headerEnvironment, tlsCaFile));
        }
        return List.copyOf(resolved);
    }

    static String prometheusSecretEnvironmentName(String secretRef) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(secretRef.getBytes(StandardCharsets.UTF_8));
            return "HERTZBEAT_PROM_SECRET_"
                    + HexFormat.of().formatHex(digest, 0, 8).toUpperCase(Locale.ROOT);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java runtime", impossible);
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
            Set<Path> matchedFiles = new HashSet<>();
            for (String pattern : patterns) {
                resolvedPatterns.add(validatePattern(pattern, allowRoots, denyPaths, matchedFiles));
            }
            resolved.add(new ResolvedFileLogSource(source.name(), resolvedPatterns));
        }
        return List.copyOf(resolved);
    }

    private String validatePattern(String pattern, List<Path> allowRoots, List<Path> denyPaths,
                                   Set<Path> matchedFiles) throws IOException {
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
        Path configuredBase = pathBeforeGlob(value);
        Path realBase = configuredBase.toRealPath();
        if (allowRoots.stream().noneMatch(realBase::startsWith)) {
            throw new IllegalArgumentException("File log path escapes local allow roots");
        }
        if (denyPaths.stream().anyMatch(realBase::startsWith)) {
            throw new IllegalArgumentException("File log path is denied by local policy");
        }
        matchedFiles.addAll(matchedFiles(value, configuredBase, realBase, allowRoots, denyPaths));
        if (matchedFiles.size() > MAXIMUM_FILES_PER_SOURCE) {
            throw new IllegalArgumentException("File log source matches too many existing files; maximum is 256");
        }
        return value.replace('\\', '/');
    }

    private List<Path> matchedFiles(String pattern, Path configuredBase, Path realBase, List<Path> allowRoots,
                                    List<Path> denyPaths) throws IOException {
        if (firstGlobIndex(pattern) < 0) {
            if (!Files.isRegularFile(realBase)) {
                throw new IllegalArgumentException("File log path must select a regular file");
            }
            return List.of(realBase);
        }
        String relativePattern = pattern.substring(configuredBase.toString().length());
        while (relativePattern.startsWith("/") || relativePattern.startsWith("\\")) {
            relativePattern = relativePattern.substring(1);
        }
        PathMatcher matcher = realBase.getFileSystem().getPathMatcher("glob:" + relativePattern);
        int depth = Math.max(1, Path.of(relativePattern).getNameCount());
        try (var paths = Files.walk(realBase, depth)) {
            List<Path> matches = paths.filter(path -> matcher.matches(realBase.relativize(path)))
                    .filter(Files::isRegularFile)
                    .limit(MAXIMUM_FILES_PER_SOURCE + 1L)
                    .toList();
            if (matches.size() > MAXIMUM_FILES_PER_SOURCE) {
                throw new IllegalArgumentException("File log source matches too many existing files; maximum is 256");
            }
            List<Path> realMatches = new ArrayList<>(matches.size());
            for (Path match : matches) {
                Path realMatch = match.toRealPath();
                if (allowRoots.stream().noneMatch(realMatch::startsWith)
                        || denyPaths.stream().anyMatch(realMatch::startsWith)) {
                    throw new IllegalArgumentException("File log match escapes local path policy");
                }
                realMatches.add(realMatch);
            }
            return List.copyOf(realMatches);
        }
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
    public record ResolvedSources(List<ResolvedPrometheusTarget> prometheusTargets,
                                  List<ResolvedFileLogSource> fileLogSources,
                                  Path storageDirectory) {

        public ResolvedSources {
            prometheusTargets = List.copyOf(prometheusTargets);
            fileLogSources = List.copyOf(fileLogSources);
            storageDirectory = storageDirectory.toAbsolutePath().normalize();
        }
    }

    /**
     * Prometheus source after all remote references have been resolved against local policy.
     */
    public record ResolvedPrometheusTarget(String name, URI endpoint, Duration interval, Duration timeout,
                                           Map<String, String> headerSecretEnvironment, Path tlsCaFile) {

        public ResolvedPrometheusTarget {
            headerSecretEnvironment = Map.copyOf(headerSecretEnvironment);
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
