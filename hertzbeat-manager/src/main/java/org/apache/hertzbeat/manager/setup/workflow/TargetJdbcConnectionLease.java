/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Objects;

/** Exclusive scoped ownership of one verified target JDBC connection. */
final class TargetJdbcConnectionLease implements AutoCloseable {

    private final Connection connection;
    private final String targetIdentityHash;
    private boolean callbackActive;
    private Thread callbackOwner;
    private boolean closing;
    private boolean closeInProgress;
    private boolean closed;

    TargetJdbcConnectionLease(Connection connection, String targetIdentityHash) {
        this.connection = Objects.requireNonNull(connection, "connection");
        if (targetIdentityHash == null || !targetIdentityHash.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Invalid target JDBC identity");
        }
        this.targetIdentityHash = targetIdentityHash;
    }

    String targetIdentityHash() {
        return targetIdentityHash;
    }

    void withConnection(TargetJdbcConnectionAction action) {
        Objects.requireNonNull(action, "action");
        beginCallback();
        try {
            action.execute(connection);
        } finally {
            endCallback();
        }
    }

    @Override
    public void close() {
        boolean interrupted = Thread.interrupted();
        boolean claimed = false;
        boolean success = false;
        try {
            CloseClaim claim = claimClose();
            interrupted |= claim.interrupted();
            if (!claim.execute()) {
                return;
            }
            claimed = true;
            interrupted |= Thread.interrupted();
            try {
                connection.close();
                success = true;
            } catch (SQLException | RuntimeException cleanupFailure) {
                throw new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
            }
        } finally {
            interrupted |= Thread.interrupted();
            if (claimed) {
                completeClose(success);
            }
            restoreInterrupt(interrupted);
        }
    }

    @Override
    public String toString() {
        return "TargetJdbcConnectionLease[targetIdentityHash=" + targetIdentityHash + ']';
    }

    private synchronized void beginCallback() {
        if (closed || closing || callbackActive) {
            throw conflict();
        }
        callbackActive = true;
        callbackOwner = Thread.currentThread();
    }

    private synchronized void endCallback() {
        callbackActive = false;
        callbackOwner = null;
        notifyAll();
    }

    private synchronized CloseClaim claimClose() {
        if (closed) {
            return new CloseClaim(false, false);
        }
        if (callbackActive && callbackOwner == Thread.currentThread()) {
            throw conflict();
        }
        closing = true;
        boolean interrupted = false;
        while (callbackActive || closeInProgress) {
            try {
                wait();
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (closed) {
            return new CloseClaim(false, interrupted);
        }
        closeInProgress = true;
        return new CloseClaim(true, interrupted);
    }

    private synchronized void completeClose(boolean success) {
        closeInProgress = false;
        if (success) {
            closed = true;
        }
        notifyAll();
    }

    private static void restoreInterrupt(boolean interrupted) {
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private static TargetJdbcConnectionException conflict() {
        return new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.OPERATION_CONFLICT);
    }

    private record CloseClaim(boolean execute, boolean interrupted) {
    }
}
