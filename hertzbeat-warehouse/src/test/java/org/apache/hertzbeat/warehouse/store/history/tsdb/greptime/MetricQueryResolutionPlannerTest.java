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

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class MetricQueryResolutionPlannerTest {

    private static final long START_SECONDS = 1_712_730_000L;

    @Test
    void keepsAnExplicitCallerResolution() {
        MetricQueryResolutionPlanner planner = MetricQueryResolutionPlanner.defaults();

        assertEquals("75s", planner.resolveStep(
                START_SECONDS, START_SECONDS + Duration.ofDays(30).toSeconds(), "75s"));
    }

    @Test
    void boundsImplicitQueriesWithReadableResolutions() {
        MetricQueryResolutionPlanner planner = MetricQueryResolutionPlanner.defaults();

        assertEquals("1m", planner.resolveStep(
                START_SECONDS, START_SECONDS + Duration.ofHours(6).toSeconds(), null));
        assertEquals("2m", planner.resolveStep(
                START_SECONDS, START_SECONDS + Duration.ofDays(1).toSeconds(), null));
        assertEquals("1h", planner.resolveStep(
                START_SECONDS, START_SECONDS + Duration.ofDays(6).toSeconds(), null));
        assertEquals("4h", planner.resolveStep(
                START_SECONDS, START_SECONDS + Duration.ofDays(7).toSeconds(), null));
        assertEquals("4h", planner.resolveStep(
                START_SECONDS, START_SECONDS + Duration.ofDays(30).toSeconds(), null));
        assertEquals("12h", planner.resolveStep(
                START_SECONDS, START_SECONDS + Duration.ofDays(365).toSeconds(), null));
        assertEquals("31d", planner.resolveStep(
                START_SECONDS, START_SECONDS + Duration.ofDays(36500).toSeconds(), null));
    }

    @Test
    void fallsBackToTheMinimumResolutionForInvalidRanges() {
        MetricQueryResolutionPlanner planner = MetricQueryResolutionPlanner.defaults();

        assertEquals("1m", planner.resolveStep(START_SECONDS, START_SECONDS, null));
        assertEquals("1m", planner.resolveStep(START_SECONDS, START_SECONDS - 1, " "));
    }
}
