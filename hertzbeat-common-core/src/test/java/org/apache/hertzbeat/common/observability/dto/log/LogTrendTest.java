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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;

class LogTrendTest {

    @Test
    void acceptsEverySupportedIntervalAndSparseObservedBuckets() {
        for (long intervalMs : List.of(60_000L, 300_000L, 900_000L, 1_800_000L,
                3_600_000L, 21_600_000L, 86_400_000L)) {
            assertDoesNotThrow(() -> new LogTrend(1L, intervalMs - 1, intervalMs, List.of()));
        }
        assertDoesNotThrow(() -> new LogTrend(120_001L, 299_999L, 60_000L,
                List.of(new LogTrendBucket(180_000L, 2L), new LogTrendBucket(240_000L, 1L))));
    }

    @Test
    void rejectsUnsupportedIntervalAndInvalidBuckets() {
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(0L, 1L, 120_000L, List.of()));
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(120_001L, 179_999L, 60_000L,
                List.of(new LogTrendBucket(60_000L, 1L))));
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(120_001L, 179_999L, 60_000L,
                List.of(new LogTrendBucket(180_000L, 1L))));
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(120_000L, 179_999L, 60_000L,
                List.of(new LogTrendBucket(120_001L, 1L))));
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(120_000L, 239_999L, 60_000L,
                List.of(new LogTrendBucket(180_000L, 1L), new LogTrendBucket(120_000L, 1L))));
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(120_000L, 239_999L, 60_000L,
                List.of(new LogTrendBucket(120_000L, 1L), new LogTrendBucket(120_000L, 2L))));
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(120_000L, 179_999L, 60_000L,
                List.of(new LogTrendBucket(120_000L, -1L))));
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(0L, 60 * 60_000L, 60_000L,
                java.util.stream.LongStream.rangeClosed(0, 60)
                        .mapToObj(index -> new LogTrendBucket(index * 60_000L, 1L))
                        .toList()));
    }
}
