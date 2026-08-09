/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.concurrent;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Process-local admission gate for work that must drain without owning its executor.
 */
public final class WorkAdmissionGate {

    private final Object lock = new Object();
    private boolean accepting = true;
    private boolean stopped;
    private int activeWork;
    private int waitingWork;

    /**
     * Returns a permit for admitted work, or {@code null} while admission is paused.
     */
    public Permit tryAcquire() {
        synchronized (lock) {
            if (!accepting) {
                return null;
            }
            activeWork++;
            return new Permit(this);
        }
    }

    /**
     * Reserves replay work while ordinary admission is still paused.
     */
    public Permit reserveReplay() {
        synchronized (lock) {
            if (stopped) {
                return null;
            }
            activeWork++;
            return new Permit(this);
        }
    }

    /**
     * Waits for resumed admission, or returns {@code null} after terminal stop.
     */
    public Permit awaitAcquire() throws InterruptedException {
        synchronized (lock) {
            while (!accepting && !stopped) {
                waitingWork++;
                try {
                    lock.wait();
                } finally {
                    waitingWork--;
                }
            }
            if (stopped) {
                return null;
            }
            activeWork++;
            return new Permit(this);
        }
    }

    public void pauseAdmission() {
        synchronized (lock) {
            accepting = false;
        }
    }

    public void awaitDrained(long timeoutNanos) throws InterruptedException, TimeoutException {
        synchronized (lock) {
            long remainingNanos = timeoutNanos;
            long startedNanos = System.nanoTime();
            while (activeWork > 0) {
                if (remainingNanos <= 0) {
                    throw new TimeoutException();
                }
                TimeUnit.NANOSECONDS.timedWait(lock, remainingNanos);
                long elapsedNanos = System.nanoTime() - startedNanos;
                if (elapsedNanos <= 0) {
                    remainingNanos = timeoutNanos;
                } else if (elapsedNanos >= timeoutNanos) {
                    remainingNanos = 0;
                } else {
                    remainingNanos = timeoutNanos - elapsedNanos;
                }
            }
        }
    }

    public void resumeAdmission() {
        synchronized (lock) {
            if (!stopped) {
                accepting = true;
            }
            lock.notifyAll();
        }
    }

    /**
     * Permanently rejects admission and wakes work waiting for a maintenance resume.
     */
    public void stop() {
        synchronized (lock) {
            stopped = true;
            accepting = false;
            lock.notifyAll();
        }
    }

    int waitingWork() {
        synchronized (lock) {
            return waitingWork;
        }
    }

    private void release() {
        synchronized (lock) {
            if (activeWork > 0) {
                activeWork--;
                lock.notifyAll();
            }
        }
    }

    /**
     * Idempotent ownership token for one admitted unit of work.
     */
    public static final class Permit implements AutoCloseable {

        private final WorkAdmissionGate gate;
        private boolean closed;

        private Permit(WorkAdmissionGate gate) {
            this.gate = gate;
        }

        @Override
        public synchronized void close() {
            if (!closed) {
                closed = true;
                gate.release();
            }
        }
    }
}
