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

package org.apache.hertzbeat.observability.logs.service.impl;

import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.observability.logs.service.LogAnalysisIntervalTooSmallException;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.observability.logs.service.LogTrendWindowTooLargeException;

/** Shared epoch-aligned interval planning for log trends and analysis admission. */
public final class LogTrendIntervalPlanner {

    static final int MAX_BUCKETS = LogTrend.MAX_BUCKETS;
    static final long DEFAULT_WINDOW_MS = 30 * 60_000L;

    private LogTrendIntervalPlanner() {
    }

    /** Resolve a validated absolute window before query admission or storage access. */
    public static long resolve(long start, long end, Long requestedInterval) {
        new LogFacets.Window(start, end);
        if (requestedInterval == null) { return select(start, end); }
        if (!LogTrend.EXPLICIT_INTERVALS_MS.contains(requestedInterval)) {
            throw new IllegalArgumentException("Invalid analysis interval");
        }
        if (bucketCount(start, end, requestedInterval) > MAX_BUCKETS) {
            throw new LogAnalysisIntervalTooSmallException();
        }
        return requestedInterval;
    }

    static long select(long start, long end) {
        if (start > end) {
            throw new IllegalArgumentException("log trend start must not be after end");
        }
        for (long intervalMs : LogTrend.SUPPORTED_INTERVALS_MS) {
            if (bucketCount(start, end, intervalMs) <= MAX_BUCKETS) {
                return intervalMs;
            }
        }
        throw new LogTrendWindowTooLargeException();
    }

    static long bucketStart(long timestampMs, long intervalMs) {
        return Math.floorDiv(timestampMs, intervalMs) * intervalMs;
    }

    static long bucketCount(long start, long end, long intervalMs) {
        return Math.floorDiv(end, intervalMs) - Math.floorDiv(start, intervalMs) + 1;
    }
}
