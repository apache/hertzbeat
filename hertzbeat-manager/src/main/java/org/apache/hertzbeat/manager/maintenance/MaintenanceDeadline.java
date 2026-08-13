/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.time.Duration;
import java.util.function.LongSupplier;

/** Shared monotonic deadline for one process-local maintenance transition. */
public final class MaintenanceDeadline {

    private final long timeoutNanos;
    private final long startedNanos;
    private final LongSupplier ticker;

    private MaintenanceDeadline(long timeoutNanos, long startedNanos, LongSupplier ticker) {
        this.timeoutNanos = timeoutNanos;
        this.startedNanos = startedNanos;
        this.ticker = ticker;
    }

    public static MaintenanceDeadline start(Duration timeout) {
        return start(timeout, System::nanoTime);
    }

    static MaintenanceDeadline start(Duration timeout, LongSupplier ticker) {
        if (timeout == null || timeout.isNegative()) {
            throw MetadataMaintenanceException.invalidRequest();
        }
        try {
            long timeoutNanos = timeout.toNanos();
            return new MaintenanceDeadline(timeoutNanos, ticker.getAsLong(), ticker);
        } catch (ArithmeticException exception) {
            throw MetadataMaintenanceException.invalidRequest();
        }
    }

    public long remainingNanos() {
        long elapsedNanos = ticker.getAsLong() - startedNanos;
        if (elapsedNanos <= 0) {
            return timeoutNanos;
        }
        if (elapsedNanos >= timeoutNanos) {
            return 0;
        }
        return timeoutNanos - elapsedNanos;
    }

    public Duration remaining() {
        return Duration.ofNanos(remainingNanos());
    }
}
