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

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class MaintenanceDeadlineTest {

    @Test
    void negativeTickerOriginDoesNotSaturateOrExpirePositiveTimeout() {
        AtomicLong ticker = new AtomicLong(-1_000);
        MaintenanceDeadline deadline = MaintenanceDeadline.start(Duration.ofNanos(50), ticker::get);

        assertThat(deadline.remainingNanos()).isEqualTo(50);
        ticker.addAndGet(20);
        assertThat(deadline.remainingNanos()).isEqualTo(30);
        ticker.addAndGet(30);
        assertThat(deadline.remainingNanos()).isZero();
    }

    @Test
    void tickerWrapUsesMonotonicElapsedDifference() {
        AtomicLong ticker = new AtomicLong(Long.MAX_VALUE - 5);
        MaintenanceDeadline deadline = MaintenanceDeadline.start(Duration.ofNanos(20), ticker::get);

        ticker.set(Long.MIN_VALUE + 5);

        assertThat(deadline.remainingNanos()).isEqualTo(9);
    }
}
