/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import java.time.Duration;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

/** Coordinates process-local writable transaction admission and maintenance drain. */
public final class MetadataWriteAdmissionCoordinator {

    private final ReentrantLock lock = new ReentrantLock();
    private final Condition noActiveWrites = lock.newCondition();
    private MetadataWriteAdmissionPhase phase = MetadataWriteAdmissionPhase.OPEN;
    private String operationId;
    private long epoch;
    private Object leaseToken;
    private int activeWrites;

    /** Drain admitted writes and enter maintenance for one operation. */
    public MetadataWriteMaintenanceLease acquire(String requestedOperationId, Duration timeout) {
        requireValid(requestedOperationId, timeout);
        long timeoutNanos = toNanos(timeout);
        lock.lock();
        try {
            if (phase != MetadataWriteAdmissionPhase.OPEN) {
                throw MetadataWriteAdmissionException.operationConflict();
            }
            phase = MetadataWriteAdmissionPhase.DRAINING;
            operationId = requestedOperationId;
            long currentEpoch = ++epoch;
            Object currentToken = new Object();
            leaseToken = currentToken;
            long remainingNanos = timeoutNanos;
            while (activeWrites > 0) {
                if (remainingNanos <= 0) {
                    reopen(currentEpoch, currentToken);
                    throw MetadataWriteAdmissionException.drainTimeout();
                }
                try {
                    remainingNanos = noActiveWrites.awaitNanos(remainingNanos);
                } catch (InterruptedException exception) {
                    reopen(currentEpoch, currentToken);
                    Thread.currentThread().interrupt();
                    throw MetadataWriteAdmissionException.acquisitionInterrupted();
                }
            }
            phase = MetadataWriteAdmissionPhase.ACTIVE;
            return new MetadataWriteMaintenanceLease(this, requestedOperationId, currentEpoch, currentToken);
        } finally {
            lock.unlock();
        }
    }

    /** Return a consistent view without exposing the lease capability. */
    public MetadataWriteAdmissionSnapshot snapshot() {
        lock.lock();
        try {
            return new MetadataWriteAdmissionSnapshot(phase, operationId, epoch, activeWrites);
        } finally {
            lock.unlock();
        }
    }

    TransactionPermit admitWritableTransaction() {
        lock.lock();
        try {
            if (phase != MetadataWriteAdmissionPhase.OPEN) {
                throw MetadataWriteAdmissionException.metadataWritesPaused();
            }
            activeWrites++;
            return new TransactionPermit(this);
        } finally {
            lock.unlock();
        }
    }

    void release(String releasedOperationId, long releasedEpoch, Object releasedToken) {
        lock.lock();
        try {
            if (phase == MetadataWriteAdmissionPhase.ACTIVE
                    && epoch == releasedEpoch
                    && operationId.equals(releasedOperationId)
                    && leaseToken == releasedToken) {
                phase = MetadataWriteAdmissionPhase.OPEN;
                operationId = null;
                leaseToken = null;
            }
        } finally {
            lock.unlock();
        }
    }

    private void releaseWritableTransaction() {
        lock.lock();
        try {
            activeWrites--;
            if (activeWrites == 0) {
                noActiveWrites.signalAll();
            }
        } finally {
            lock.unlock();
        }
    }

    private void reopen(long failedEpoch, Object failedToken) {
        if (epoch == failedEpoch && leaseToken == failedToken && phase == MetadataWriteAdmissionPhase.DRAINING) {
            phase = MetadataWriteAdmissionPhase.OPEN;
            operationId = null;
            leaseToken = null;
        }
    }

    private void requireValid(String requestedOperationId, Duration timeout) {
        if (requestedOperationId == null || requestedOperationId.isBlank()
                || timeout == null || timeout.isNegative()) {
            throw MetadataWriteAdmissionException.invalidRequest();
        }
    }

    private long toNanos(Duration timeout) {
        try {
            return timeout.toNanos();
        } catch (ArithmeticException exception) {
            throw MetadataWriteAdmissionException.invalidRequest();
        }
    }

    static final class TransactionPermit implements AutoCloseable {

        private final MetadataWriteAdmissionCoordinator coordinator;
        private boolean closed;

        private TransactionPermit(MetadataWriteAdmissionCoordinator coordinator) {
            this.coordinator = coordinator;
        }

        @Override
        public void close() {
            if (!closed) {
                closed = true;
                coordinator.releaseWritableTransaction();
            }
        }
    }
}
