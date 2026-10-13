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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.time.Duration;
import java.util.List;

/**
 * Plans a bounded, human-readable PromQL resolution for metric history queries.
 */
final class MetricQueryResolutionPlanner {

    private static final int DEFAULT_MAX_DATA_POINTS = 1200;

    private static final List<Resolution> RESOLUTIONS = List.of(
            new Resolution(60, "1m"),
            new Resolution(120, "2m"),
            new Resolution(300, "5m"),
            new Resolution(600, "10m"),
            new Resolution(900, "15m"),
            new Resolution(1800, "30m"),
            new Resolution(3600, "1h"),
            new Resolution(7200, "2h"),
            new Resolution(14400, "4h"),
            new Resolution(21600, "6h"),
            new Resolution(43200, "12h"),
            new Resolution(86400, "1d"),
            new Resolution(172800, "2d"),
            new Resolution(604800, "7d"),
            new Resolution(2592000, "30d"));

    private final int maxDataPoints;

    private MetricQueryResolutionPlanner(int maxDataPoints) {
        this.maxDataPoints = maxDataPoints;
    }

    static MetricQueryResolutionPlanner defaults() {
        return new MetricQueryResolutionPlanner(DEFAULT_MAX_DATA_POINTS);
    }

    String resolveStep(long startSeconds, long endSeconds, String requestedStep) {
        if (requestedStep != null && !requestedStep.isBlank()) {
            return requestedStep;
        }
        if (endSeconds <= startSeconds) {
            return RESOLUTIONS.getFirst().label();
        }

        long rangeSeconds = endSeconds - startSeconds;
        long targetSeconds = Math.max(
                minimumExistingResolution(rangeSeconds),
                Math.ceilDiv(rangeSeconds, maxDataPoints));
        return RESOLUTIONS.stream()
                .filter(resolution -> resolution.seconds() >= targetSeconds)
                .findFirst()
                .map(Resolution::label)
                .orElseGet(() -> Math.ceilDiv(targetSeconds, Duration.ofDays(1).toSeconds()) + "d");
    }

    private long minimumExistingResolution(long rangeSeconds) {
        if (rangeSeconds >= Duration.ofDays(7).toSeconds()) {
            return Duration.ofHours(4).toSeconds();
        }
        if (rangeSeconds > Duration.ofDays(1).toSeconds()) {
            return Duration.ofHours(1).toSeconds();
        }
        return RESOLUTIONS.getFirst().seconds();
    }

    private record Resolution(long seconds, String label) {
    }
}
