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

package org.apache.hertzbeat.common.observability.dto.log;

import java.util.List;

/**
 * Log-count trend for an exact query window.
 */
public record LogTrend(long start, long end, long intervalMs, List<LogTrendBucket> buckets) {

    public static final int MAX_BUCKETS = 60;
    public static final List<Long> SUPPORTED_INTERVALS_MS = List.of(
            60_000L,
            300_000L,
            900_000L,
            1_800_000L,
            3_600_000L,
            21_600_000L,
            86_400_000L);

    public static final List<Long> EXPLICIT_INTERVALS_MS = List.of(
            1_000L, 5_000L, 10_000L, 30_000L, 60_000L, 300_000L, 900_000L,
            1_800_000L, 3_600_000L, 21_600_000L, 86_400_000L);

    public LogTrend {
        if (start > end) {
            throw new IllegalArgumentException("log trend start must not be after end");
        }
        if (!EXPLICIT_INTERVALS_MS.contains(intervalMs)) {
            throw new IllegalArgumentException("unsupported log trend interval: " + intervalMs);
        }
        buckets = buckets == null ? List.of() : List.copyOf(buckets);
        if (buckets.size() > MAX_BUCKETS) {
            throw new IllegalArgumentException("log trend must not contain more than sixty buckets");
        }
        long firstBucketIndex = Math.floorDiv(start, intervalMs);
        long lastBucketIndex = Math.floorDiv(end, intervalMs);
        if (lastBucketIndex - firstBucketIndex >= MAX_BUCKETS) {
            throw new IllegalArgumentException("log trend grid must not contain more than sixty buckets");
        }
        Long previousStart = null;
        for (LogTrendBucket bucket : buckets) {
            long bucketIndex = Math.floorDiv(bucket.start(), intervalMs);
            if (Math.floorMod(bucket.start(), intervalMs) != 0
                    || bucketIndex < firstBucketIndex
                    || bucketIndex > lastBucketIndex) {
                throw new IllegalArgumentException("log trend bucket is outside the query window");
            }
            if (previousStart != null && bucket.start() <= previousStart) {
                throw new IllegalArgumentException("log trend buckets must be unique and ordered");
            }
            if (bucket.count() < 0) {
                throw new IllegalArgumentException("log trend bucket count must not be negative");
            }
            previousStart = bucket.start();
        }
    }
}
