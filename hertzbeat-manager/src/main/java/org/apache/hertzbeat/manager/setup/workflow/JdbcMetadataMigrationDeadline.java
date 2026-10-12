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

import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;

/** One monotonic budget shared by scheduling, network configuration, and copy execution. */
final class JdbcMetadataMigrationDeadline {

    private final long startedAtNanos;
    private final long timeoutNanos;
    private final LongSupplier ticker;

    private JdbcMetadataMigrationDeadline(long startedAtNanos, long timeoutNanos, LongSupplier ticker) {
        this.startedAtNanos = startedAtNanos;
        this.timeoutNanos = timeoutNanos;
        this.ticker = ticker;
    }

    static JdbcMetadataMigrationDeadline start(Duration timeout, LongSupplier ticker) {
        Objects.requireNonNull(timeout, "timeout");
        Objects.requireNonNull(ticker, "ticker");
        if (timeout.isZero() || timeout.isNegative()) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        long timeoutNanos;
        try {
            timeoutNanos = timeout.toNanos();
        } catch (ArithmeticException overflow) {
            timeoutNanos = Long.MAX_VALUE;
        }
        return new JdbcMetadataMigrationDeadline(ticker.getAsLong(), timeoutNanos, ticker);
    }

    long remainingNanos() {
        long elapsed = ticker.getAsLong() - startedAtNanos;
        if (elapsed <= 0) {
            return timeoutNanos;
        }
        return elapsed >= timeoutNanos ? 0 : timeoutNanos - elapsed;
    }

    Duration remainingDuration() {
        long remaining = remainingNanos();
        if (remaining <= 0) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        return Duration.ofNanos(remaining);
    }

    int remainingMillis() {
        long remaining = remainingNanos();
        if (remaining <= 0) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        long millis = TimeUnit.NANOSECONDS.toMillis(remaining);
        if (remaining % TimeUnit.MILLISECONDS.toNanos(1) != 0) {
            millis++;
        }
        return (int) Math.min(Integer.MAX_VALUE, Math.max(1, millis));
    }
}
