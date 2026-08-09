/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.component.sd;

import java.time.Duration;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;
import org.apache.hertzbeat.manager.maintenance.MaintenanceDeadline;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenancePhase;

/** Admission and drain state for the single service-discovery consumer loop. */
final class ServiceDiscoveryMaintenanceGate {

    private final ReentrantLock lock = new ReentrantLock();
    private final Condition stateChanged = lock.newCondition();
    private MetadataMaintenancePhase phase = MetadataMaintenancePhase.RUNNING;
    private Thread pollingThread;
    private boolean polling;
    private boolean processing;
    private boolean maintenanceWakeup;
    private boolean terminal;

    void beforePoll() throws InterruptedException {
        lock.lockInterruptibly();
        try {
            while (phase != MetadataMaintenancePhase.RUNNING && !terminal) {
                stateChanged.await();
            }
            if (terminal) {
                throw new InterruptedException();
            }
            polling = true;
            pollingThread = Thread.currentThread();
        } finally {
            lock.unlock();
        }
    }

    /** Finish acquisition and promote a returned message to in-flight work. */
    boolean pollCompleted(boolean messageReturned) {
        lock.lock();
        try {
            polling = false;
            pollingThread = null;
            if (messageReturned) {
                processing = true;
            }
            boolean clearMaintenanceInterrupt = maintenanceWakeup && !terminal;
            maintenanceWakeup = false;
            stateChanged.signalAll();
            return clearMaintenanceInterrupt;
        } finally {
            lock.unlock();
        }
    }

    boolean pollInterrupted() {
        lock.lock();
        try {
            polling = false;
            pollingThread = null;
            boolean expected = maintenanceWakeup && !terminal;
            maintenanceWakeup = false;
            stateChanged.signalAll();
            return expected;
        } finally {
            lock.unlock();
        }
    }

    void workCompleted() {
        lock.lock();
        try {
            processing = false;
            stateChanged.signalAll();
        } finally {
            lock.unlock();
        }
    }

    void quiesce(Duration timeout) {
        MaintenanceDeadline deadline = MaintenanceDeadline.start(timeout);
        try {
            lock.lockInterruptibly();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw MetadataMaintenanceException.quiesceInterrupted();
        }
        try {
            if (phase == MetadataMaintenancePhase.QUIESCED) {
                return;
            }
            if (phase == MetadataMaintenancePhase.RUNNING) {
                phase = MetadataMaintenancePhase.QUIESCING;
                if (pollingThread != null) {
                    maintenanceWakeup = true;
                    pollingThread.interrupt();
                }
            }
            while (polling || processing) {
                long remainingNanos = deadline.remainingNanos();
                if (remainingNanos <= 0) {
                    reopen();
                    throw MetadataMaintenanceException.quiesceTimeout();
                }
                try {
                    stateChanged.awaitNanos(remainingNanos);
                } catch (InterruptedException exception) {
                    reopen();
                    Thread.currentThread().interrupt();
                    throw MetadataMaintenanceException.quiesceInterrupted();
                }
            }
            phase = MetadataMaintenancePhase.QUIESCED;
            stateChanged.signalAll();
        } finally {
            lock.unlock();
        }
    }

    void resume() {
        lock.lock();
        try {
            if (terminal) {
                return;
            }
            if (phase != MetadataMaintenancePhase.RUNNING) {
                reopen();
            }
        } finally {
            lock.unlock();
        }
    }

    void stop() {
        lock.lock();
        try {
            if (terminal) {
                return;
            }
            terminal = true;
            if (pollingThread != null) {
                pollingThread.interrupt();
            }
            stateChanged.signalAll();
        } finally {
            lock.unlock();
        }
    }

    MetadataMaintenancePhase phase() {
        lock.lock();
        try {
            return phase;
        } finally {
            lock.unlock();
        }
    }

    private void reopen() {
        phase = MetadataMaintenancePhase.RUNNING;
        stateChanged.signalAll();
    }
}
