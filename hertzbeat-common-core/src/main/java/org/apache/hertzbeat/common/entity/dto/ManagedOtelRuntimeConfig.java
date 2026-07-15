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

package org.apache.hertzbeat.common.entity.dto;

import java.net.URI;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Versioned product intent for the managed OpenTelemetry runtime.
 *
 * <p>This contract deliberately contains no rendered YAML, local paths, or credentials.</p>
 */
public record ManagedOtelRuntimeConfig(int schemaVersion, long revision, boolean hostMetricsEnabled,
                                       Duration hostMetricsInterval, List<PrometheusTarget> prometheusTargets,
                                       List<FileLogSource> fileLogSources) {

    public static final int CURRENT_SCHEMA_VERSION = 1;
    private static final int MAXIMUM_PROMETHEUS_TARGETS = 32;
    private static final int MAXIMUM_FILE_LOG_SOURCES = 16;
    private static final Duration MINIMUM_HOST_METRICS_INTERVAL = Duration.ofSeconds(10);
    private static final Duration MAXIMUM_HOST_METRICS_INTERVAL = Duration.ofMinutes(5);
    private static final Pattern SOURCE_NAME = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");

    public ManagedOtelRuntimeConfig(int schemaVersion, long revision, boolean hostMetricsEnabled,
                                    Duration hostMetricsInterval) {
        this(schemaVersion, revision, hostMetricsEnabled, hostMetricsInterval, List.of(), List.of());
    }

    public ManagedOtelRuntimeConfig {
        if (schemaVersion != CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("Unsupported managed runtime config schema: " + schemaVersion);
        }
        if (revision < 1) {
            throw new IllegalArgumentException("Managed runtime config revision must be positive");
        }
        hostMetricsInterval = Objects.requireNonNull(hostMetricsInterval, "hostMetricsInterval");
        if (hostMetricsInterval.compareTo(MINIMUM_HOST_METRICS_INTERVAL) < 0
                || hostMetricsInterval.compareTo(MAXIMUM_HOST_METRICS_INTERVAL) > 0
                || hostMetricsInterval.getNano() != 0) {
            throw new IllegalArgumentException("Host metrics interval must be between 10 seconds and 5 minutes");
        }
        prometheusTargets = immutableSources(prometheusTargets, MAXIMUM_PROMETHEUS_TARGETS, "Prometheus target");
        fileLogSources = immutableSources(fileLogSources, MAXIMUM_FILE_LOG_SOURCES, "file log source");
        requireUniqueNames(prometheusTargets.stream().map(PrometheusTarget::name).toList(), "Prometheus target");
        requireUniqueNames(fileLogSources.stream().map(FileLogSource::name).toList(), "file log source");
    }

    private static <T> List<T> immutableSources(List<T> sources, int maximum, String label) {
        List<T> copy = List.copyOf(Objects.requireNonNull(sources, label + "s"));
        if (copy.size() > maximum) {
            throw new IllegalArgumentException("Too many " + label + "s; maximum is " + maximum);
        }
        return copy;
    }

    private static void requireUniqueNames(List<String> names, String label) {
        Set<String> uniqueNames = new HashSet<>(names);
        if (uniqueNames.size() != names.size()) {
            throw new IllegalArgumentException("Duplicate " + label + " name");
        }
    }

    private static String requireSourceName(String name, String label) {
        if (name == null || !SOURCE_NAME.matcher(name).matches()) {
            throw new IllegalArgumentException(label + " must contain 1 to 64 safe characters");
        }
        return name;
    }

    /**
     * One explicitly managed Prometheus scrape endpoint.
     */
    public record PrometheusTarget(String name, URI endpoint, Duration interval) {

        public PrometheusTarget {
            name = requireSourceName(name, "Prometheus target name");
            endpoint = Objects.requireNonNull(endpoint, "endpoint");
            String scheme = endpoint.getScheme();
            if (!("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                    || endpoint.getHost() == null
                    || endpoint.getUserInfo() != null
                    || endpoint.getRawQuery() != null
                    || endpoint.getFragment() != null) {
                throw new IllegalArgumentException("Prometheus endpoint must be an HTTP(S) URI without credentials");
            }
            interval = Objects.requireNonNull(interval, "interval");
            if (interval.compareTo(MINIMUM_HOST_METRICS_INTERVAL) < 0
                    || interval.compareTo(MAXIMUM_HOST_METRICS_INTERVAL) > 0
                    || interval.getNano() != 0) {
                throw new IllegalArgumentException("Prometheus interval must be between 10 seconds and 5 minutes");
            }
        }
    }

    /**
     * One file source referring to a locally approved path profile.
     */
    public record FileLogSource(String name, String pathProfile) {

        public FileLogSource {
            name = requireSourceName(name, "File log source name");
            pathProfile = requireSourceName(pathProfile, "File log path profile");
        }
    }
}
