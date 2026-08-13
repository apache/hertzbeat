/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.component.status;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.maintenance.MaintenanceDeadline;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceException;

/** Single-flight dispatch with pause, drain, and one coalesced due run. */
final class PausableDispatchTask {

    private final ExecutorService executorService;
    private final Runnable task;
    private final Object lock = new Object();
    private boolean running;
    private boolean pendingRun;
    private boolean paused;
    private boolean missedWhilePaused;
    private boolean cancelled;

    PausableDispatchTask(ExecutorService executorService, Runnable task) {
        this.executorService = executorService;
        this.task = task;
    }

    void dispatch() {
        synchronized (lock) {
            if (cancelled) {
                return;
            }
            if (paused) {
                missedWhilePaused = true;
                return;
            }
            if (running) {
                pendingRun = true;
                return;
            }
            running = true;
        }
        runOrSubmit();
    }

    void pauseAdmission() {
        synchronized (lock) {
            paused = true;
            missedWhilePaused |= pendingRun;
            pendingRun = false;
        }
    }

    void awaitDrained(MaintenanceDeadline deadline) {
        synchronized (lock) {
            while (running) {
                long remainingNanos = deadline.remainingNanos();
                if (remainingNanos <= 0) {
                    throw MetadataMaintenanceException.quiesceTimeout();
                }
                try {
                    TimeUnit.NANOSECONDS.timedWait(lock, remainingNanos);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw MetadataMaintenanceException.quiesceInterrupted();
                }
            }
        }
    }

    void resumeAdmission() {
        boolean shouldRun = false;
        synchronized (lock) {
            if (!paused) {
                return;
            }
            paused = false;
            if (missedWhilePaused) {
                missedWhilePaused = false;
                if (running) {
                    pendingRun = true;
                } else if (!cancelled) {
                    running = true;
                    shouldRun = true;
                }
            }
            lock.notifyAll();
        }
        if (shouldRun) {
            runOrSubmit();
        }
    }

    void cancel() {
        synchronized (lock) {
            cancelled = true;
            paused = true;
            pendingRun = false;
            missedWhilePaused = false;
            lock.notifyAll();
        }
    }

    private void runOrSubmit() {
        if (executorService == null) {
            try {
                task.run();
            } finally {
                onComplete();
            }
            return;
        }
        boolean submitted = false;
        try {
            executorService.execute(() -> {
                try {
                    task.run();
                } finally {
                    onComplete();
                }
            });
            submitted = true;
        } finally {
            if (!submitted) {
                synchronized (lock) {
                    running = false;
                    pendingRun = false;
                    lock.notifyAll();
                }
            }
        }
    }

    private void onComplete() {
        boolean shouldRunAgain;
        synchronized (lock) {
            if (cancelled || paused) {
                running = false;
                pendingRun = false;
                shouldRunAgain = false;
            } else if (pendingRun) {
                pendingRun = false;
                shouldRunAgain = true;
            } else {
                running = false;
                shouldRunAgain = false;
            }
            lock.notifyAll();
        }
        if (shouldRunAgain) {
            runOrSubmit();
        }
    }
}
