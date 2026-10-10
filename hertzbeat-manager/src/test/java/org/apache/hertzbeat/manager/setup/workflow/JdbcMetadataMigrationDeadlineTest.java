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

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class JdbcMetadataMigrationDeadlineTest {

    @Test
    void negativeMonotonicTickerDoesNotOverflowTheDeadline() {
        AtomicLong ticker = new AtomicLong(-100);
        JdbcMetadataMigrationDeadline deadline =
                JdbcMetadataMigrationDeadline.start(Duration.ofNanos(50), ticker::get);

        assertThat(deadline.remainingNanos()).isEqualTo(50);
        ticker.set(-75);
        assertThat(deadline.remainingNanos()).isEqualTo(25);
        ticker.set(-50);
        assertThat(deadline.remainingNanos()).isZero();
    }

    @Test
    void remainingBudgetSaturatesInsteadOfOverflowingAcrossTheSignedBoundary() {
        AtomicLong ticker = new AtomicLong(-10);
        JdbcMetadataMigrationDeadline deadline =
                JdbcMetadataMigrationDeadline.start(Duration.ofNanos(Long.MAX_VALUE), ticker::get);

        assertThat(deadline.remainingNanos()).isEqualTo(Long.MAX_VALUE);
    }

    @Test
    void elapsedTimeRemainsExactWhenTheTickerCrossesZero() {
        AtomicLong ticker = new AtomicLong(-10);
        JdbcMetadataMigrationDeadline deadline =
                JdbcMetadataMigrationDeadline.start(Duration.ofNanos(20), ticker::get);

        ticker.set(-5);
        assertThat(deadline.remainingNanos()).isEqualTo(15);
        ticker.set(5);
        assertThat(deadline.remainingNanos()).isEqualTo(5);
        ticker.set(10);
        assertThat(deadline.remainingNanos()).isZero();
    }
}
