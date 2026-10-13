/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

/** Monotonic budget used for query timeouts and cooperative statement-loop cancellation. */
final class MigrationDeadline {

    private final long deadlineNanos;

    MigrationDeadline(Duration timeout) {
        Objects.requireNonNull(timeout, "timeout");
        if (timeout.isZero() || timeout.isNegative()) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        long durationNanos;
        try {
            durationNanos = timeout.toNanos();
        } catch (ArithmeticException exception) {
            durationNanos = Long.MAX_VALUE;
        }
        long now = System.nanoTime();
        deadlineNanos = durationNanos > Long.MAX_VALUE - now ? Long.MAX_VALUE : now + durationNanos;
    }

    void apply(Statement statement) throws SQLException {
        statement.setQueryTimeout(remainingSeconds());
    }

    void check() {
        if (Thread.currentThread().isInterrupted() || deadlineNanos - System.nanoTime() <= 0) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
    }

    int remainingSeconds() {
        long remaining = deadlineNanos - System.nanoTime();
        if (remaining <= 0) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        long seconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(remaining));
        return (int) Math.min(Integer.MAX_VALUE, seconds);
    }
}
