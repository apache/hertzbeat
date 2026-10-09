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

package org.apache.hertzbeat.common.entity.job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link Job}.
 */
class JobTest {

    @Test
    void schedulesCoprimeIntervalsWithoutMaterializingTheirWholeCycle() {
        Job job = new Job();

        job.generateMetricsIntervals(List.of(1009L, 1013L));

        assertTrue(job.getIntervals() == null || job.getIntervals().size() <= 2);
        assertEquals(
                List.of(1009L, 4L, 1005L, 8L, 1001L, 12L, 997L, 16L),
                List.of(
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval()));
    }

    @Test
    void repeatsTheSameScheduleForOrdinaryIntervals() {
        Job job = new Job();

        job.generateMetricsIntervals(List.of(4L, 6L));

        assertEquals(
                List.of(4L, 2L, 2L, 4L, 4L, 2L, 2L, 4L),
                List.of(
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval(),
                        job.getInterval()));
    }

    @Test
    void explicitIntervalsReplaceGeneratedSchedule() {
        Job job = new Job();
        job.generateMetricsIntervals(List.of(4L, 6L));

        job.setIntervals(new ConcurrentLinkedDeque<>(List.of(0L)));

        assertEquals(0L, job.getInterval());
        assertEquals(0L, job.getInterval());
    }

    @Test
    void usesDefaultIntervalWhenNoValidMetricIntervalExists() {
        Job job = new Job();
        job.setDefaultInterval(15L);

        job.generateMetricsIntervals(List.of(0L, -1L));

        assertEquals(15L, job.getInterval());
        assertEquals(15L, job.getInterval());
    }

    @Test
    void rejectsLeastCommonMultipleOverflow() {
        assertThrows(
                ArithmeticException.class,
                () -> Job.lcm(List.of(Long.MAX_VALUE, Long.MAX_VALUE - 1)));
    }
}
