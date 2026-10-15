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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.observability.logs.service.LogTrendWindowTooLargeException;
import org.junit.jupiter.api.Test;

class LogTrendIntervalPlannerTest {

    @Test
    void explicitIntervalsUseInclusiveGridWithoutChangingAuto() {
        assertEquals(60_000L, LogTrendIntervalPlanner.resolve(1000, 3000, null));
        for (long interval : org.apache.hertzbeat.common.observability.dto.log.LogTrend.EXPLICIT_INTERVALS_MS) {
            assertEquals(interval, LogTrendIntervalPlanner.resolve(1000, 3000, interval));
        }
        assertEquals(1000L, LogTrendIntervalPlanner.resolve(1000, 60999, 1000L));
        assertThrows(org.apache.hertzbeat.observability.logs.service.LogAnalysisIntervalTooSmallException.class,
                () -> LogTrendIntervalPlanner.resolve(1000, 61000, 1000L));
        assertThrows(IllegalArgumentException.class, () -> LogTrendIntervalPlanner.resolve(1000, 2000, 2000L));
    }

    @Test
    void selectsTheSmallestCandidateThatKeepsAnInclusiveWindowWithinSixtyBuckets() {
        long alignedStart = 1_734_005_460_000L;

        assertEquals(60_000L, LogTrendIntervalPlanner.select(alignedStart, alignedStart + 30 * 60_000L));
        assertEquals(300_000L, LogTrendIntervalPlanner.select(alignedStart, alignedStart + 60 * 60_000L));
        assertEquals(1_800_000L, LogTrendIntervalPlanner.select(alignedStart, alignedStart + 24 * 60 * 60_000L));
    }

    @Test
    void alignsNegativeAndPositiveTimestampsToTheUnixEpoch() {
        assertEquals(120_000L, LogTrendIntervalPlanner.bucketStart(179_999L, 60_000L));
        assertEquals(-60_000L, LogTrendIntervalPlanner.bucketStart(-1L, 60_000L));
    }

    @Test
    void rejectsWindowBeyondLargestSupportedInterval() {
        long alignedStart = 1_728_000_000_000L;

        assertThrows(LogTrendWindowTooLargeException.class,
                () -> LogTrendIntervalPlanner.select(alignedStart, alignedStart + 60 * 86_400_000L));
    }
}
