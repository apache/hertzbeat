/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

/** Throwable-preserving cleanup arbitration used during pre-Spring startup and shutdown. */
final class StartupCleanup {

    private StartupCleanup() {
    }

    static Result runInterruptSafe(Throwable primary, Runnable cleanup) {
        boolean interrupted = Thread.interrupted();
        try {
            cleanup.run();
            return new Result(primary, interrupted | Thread.interrupted(), true);
        } catch (Throwable failure) {
            return new Result(merge(primary, failure), interrupted | Thread.interrupted(), false);
        }
    }

    static Throwable merge(Throwable primary, Throwable failure) {
        if (primary == null) {
            return failure;
        }
        if (failure instanceof Error && !(primary instanceof Error)) {
            if (failure != primary) {
                failure.addSuppressed(primary);
            }
            return failure;
        }
        if (failure != primary) {
            primary.addSuppressed(failure);
        }
        return primary;
    }

    static void rethrow(Throwable failure) {
        if (failure instanceof Error fatal) {
            throw fatal;
        }
        if (failure instanceof RuntimeException runtime) {
            throw runtime;
        }
        if (failure != null) {
            throw new IllegalStateException("Startup cleanup failed");
        }
    }

    record Result(Throwable failure, boolean interrupted, boolean completed) {
    }
}
