/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.time.Duration;
import java.util.concurrent.locks.ReentrantLock;

/** Reserves migration operations beneath a live process-level standalone owner. */
public final class StandaloneDeploymentSingletonAuthority implements DeploymentSingletonAuthority {

    private final ReentrantLock lock = new ReentrantLock();
    private final StandaloneDeploymentOwnerView owner;
    private final InstallationConvergenceVerifier convergence;
    private Object operationToken;

    public StandaloneDeploymentSingletonAuthority(
            StandaloneDeploymentOwnerView owner, InstallationConvergenceVerifier convergence) {
        this.owner = owner;
        this.convergence = convergence;
    }

    @Override
    public DeploymentSingletonLease acquire(String operationId, Duration timeout) {
        requireRequest(operationId, timeout);
        lock.lock();
        try {
            if (operationToken != null) {
                throw MigrationMaintenanceException.operationConflict();
            }
            if (!owner.isValid() || !convergence.isFullyConverged()) {
                throw MigrationMaintenanceException.deploymentAuthorityUnavailable();
            }
            Object token = new Object();
            operationToken = token;
            return new OperationLease(token);
        } catch (MigrationMaintenanceException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw MigrationMaintenanceException.deploymentAuthorityUnavailable();
        } finally {
            lock.unlock();
        }
    }

    private void requireRequest(String operationId, Duration timeout) {
        if (operationId == null || operationId.isBlank() || timeout == null || timeout.isNegative()) {
            throw MigrationMaintenanceException.invalidRequest();
        }
        try {
            timeout.toNanos();
        } catch (ArithmeticException exception) {
            throw MigrationMaintenanceException.invalidRequest();
        }
    }

    private final class OperationLease implements DeploymentSingletonLease {

        private final Object token;
        private boolean closed;

        private OperationLease(Object token) {
            this.token = token;
        }

        @Override
        public synchronized void close() {
            if (closed) {
                return;
            }
            lock.lock();
            try {
                if (operationToken != token) {
                    throw MigrationMaintenanceException.operationConflict();
                }
                operationToken = null;
                closed = true;
            } finally {
                lock.unlock();
            }
        }
    }
}
