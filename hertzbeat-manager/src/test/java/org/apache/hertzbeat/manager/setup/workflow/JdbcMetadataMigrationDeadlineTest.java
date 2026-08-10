/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
