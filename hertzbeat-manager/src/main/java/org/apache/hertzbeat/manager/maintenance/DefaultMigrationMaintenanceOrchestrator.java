/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.time.Duration;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.LongSupplier;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionCoordinator;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionErrorCode;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionException;
import org.apache.hertzbeat.common.transaction.MetadataWriteMaintenanceLease;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/** Composes deployment, source, producer, and transaction fences without owning their state machines. */
@Component
public final class DefaultMigrationMaintenanceOrchestrator implements MigrationMaintenanceOrchestrator {

    private final ReentrantLock lock = new ReentrantLock();
    private final DeploymentSingletonAuthority deploymentAuthority;
    private final MigrationSourceGuard sourceGuard;
    private final MetadataMaintenanceCoordinator producerCoordinator;
    private final MetadataWriteAdmissionCoordinator writeCoordinator;
    private final LongSupplier ticker;
    private String operationId;
    private Object ownerToken;
    private MetadataMaintenanceLease recoveryProducerLease;
    private boolean recoveryProducerCoordinatorRequired;
    private MigrationSourceLease recoverySourceLease;
    private DeploymentSingletonLease recoveryAuthorityLease;

    @Autowired
    public DefaultMigrationMaintenanceOrchestrator(
            DeploymentSingletonAuthority deploymentAuthority,
            MigrationSourceGuard sourceGuard,
            MetadataMaintenanceCoordinator producerCoordinator,
            MetadataWriteAdmissionCoordinator writeCoordinator) {
        this(deploymentAuthority, sourceGuard, producerCoordinator, writeCoordinator, System::nanoTime);
    }

    DefaultMigrationMaintenanceOrchestrator(
            DeploymentSingletonAuthority deploymentAuthority,
            MigrationSourceGuard sourceGuard,
            MetadataMaintenanceCoordinator producerCoordinator,
            MetadataWriteAdmissionCoordinator writeCoordinator,
            LongSupplier ticker) {
        this.deploymentAuthority = deploymentAuthority;
        this.sourceGuard = sourceGuard;
        this.producerCoordinator = producerCoordinator;
        this.writeCoordinator = writeCoordinator;
        this.ticker = ticker;
    }

    @Override
    public MigrationMaintenanceLease acquire(String requestedOperationId, Duration timeout) {
        requireRequest(requestedOperationId);
        MaintenanceDeadline deadline;
        try {
            deadline = MaintenanceDeadline.start(timeout, ticker);
        } catch (MetadataMaintenanceException exception) {
            throw MigrationMaintenanceException.invalidRequest();
        }
        Object token = reserve(requestedOperationId);
        DeploymentSingletonLease authorityLease = null;
        MigrationSourceLease sourceLease = null;
        MetadataMaintenanceLease producerLease = null;
        try {
            authorityLease = deploymentAuthority.acquire(requestedOperationId, deadline.remaining());
            sourceLease = sourceGuard.fence(requestedOperationId, deadline.remaining());
            producerLease = producerCoordinator.quiesce(requestedOperationId, deadline.remaining());
            MetadataWriteMaintenanceLease writeLease =
                    writeCoordinator.acquire(requestedOperationId, deadline.remaining());
            return new CompositeMigrationMaintenanceLease(
                    authorityLease, sourceLease, producerLease, writeLease, () -> releaseReservation(token));
        } catch (Error error) {
            if (cleanupFailedAcquisition(error, producerLease, sourceLease, authorityLease)) {
                releaseReservation(token);
            } else {
                retainRecovery(producerLease, sourceLease, authorityLease);
            }
            throw error;
        } catch (RuntimeException exception) {
            MigrationMaintenanceException primary = mapFailure(exception);
            if (cleanupFailedAcquisition(primary, producerLease, sourceLease, authorityLease)) {
                releaseReservation(token);
            } else {
                retainRecovery(producerLease, sourceLease, authorityLease);
            }
            throw primary;
        }
    }

    private Object reserve(String requestedOperationId) {
        lock.lock();
        try {
            if (ownerToken != null) {
                if (!requestedOperationId.equals(operationId)
                        || !hasRecovery()) {
                    throw MigrationMaintenanceException.operationConflict();
                }
                recoverFailedAcquisition();
            }
            Object token = new Object();
            ownerToken = token;
            operationId = requestedOperationId;
            return token;
        } finally {
            lock.unlock();
        }
    }

    private boolean cleanupFailedAcquisition(
            Throwable primary,
            MetadataMaintenanceLease producerLease,
            MigrationSourceLease sourceLease,
            DeploymentSingletonLease authorityLease) {
        boolean interrupted = Thread.currentThread().isInterrupted();
        boolean producerReleased = producerCoordinator.snapshot().phase() == MetadataMaintenancePhase.RUNNING;
        if (producerLease != null) {
            producerReleased = suppressCleanup(primary, producerLease::resume);
        }
        boolean sourceReleased = sourceLease == null;
        if (producerReleased && sourceLease != null) {
            sourceReleased = suppressCleanup(primary, sourceLease::close);
        }
        boolean authorityReleased = authorityLease == null;
        if (producerReleased && sourceReleased && authorityLease != null) {
            authorityReleased = suppressCleanup(primary, authorityLease::close);
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
        return producerReleased && sourceReleased && authorityReleased;
    }

    private boolean suppressCleanup(Throwable primary, Runnable cleanup) {
        try {
            cleanup.run();
            return true;
        } catch (RuntimeException exception) {
            primary.addSuppressed(MigrationMaintenanceException.resumeFailure());
            return false;
        }
    }

    private void retainRecovery(
            MetadataMaintenanceLease producerLease,
            MigrationSourceLease sourceLease,
            DeploymentSingletonLease authorityLease) {
        lock.lock();
        try {
            recoveryProducerLease = producerLease;
            recoveryProducerCoordinatorRequired = producerLease == null
                    && producerCoordinator.snapshot().phase() != MetadataMaintenancePhase.RUNNING;
            recoverySourceLease = sourceLease;
            recoveryAuthorityLease = authorityLease;
        } finally {
            lock.unlock();
        }
    }

    private void recoverFailedAcquisition() {
        try {
            if (recoveryProducerLease != null) {
                recoveryProducerLease.resume();
                recoveryProducerLease = null;
            }
            if (recoveryProducerCoordinatorRequired) {
                producerCoordinator.recover(operationId);
                recoveryProducerCoordinatorRequired = false;
            }
            if (recoverySourceLease != null) {
                recoverySourceLease.close();
                recoverySourceLease = null;
            }
            if (recoveryAuthorityLease != null) {
                recoveryAuthorityLease.close();
                recoveryAuthorityLease = null;
            }
            ownerToken = null;
            operationId = null;
        } catch (RuntimeException exception) {
            throw MigrationMaintenanceException.resumeFailure();
        }
    }

    private boolean hasRecovery() {
        return recoveryProducerLease != null
                || recoveryProducerCoordinatorRequired
                || recoverySourceLease != null
                || recoveryAuthorityLease != null;
    }

    private MigrationMaintenanceException mapFailure(RuntimeException exception) {
        if (exception instanceof MigrationMaintenanceException migrationFailure) {
            return migrationFailure;
        }
        if (exception instanceof MetadataMaintenanceException maintenanceFailure) {
            return switch (maintenanceFailure.code()) {
                case INVALID_REQUEST -> MigrationMaintenanceException.invalidRequest();
                case OPERATION_CONFLICT, STALE_LEASE -> MigrationMaintenanceException.operationConflict();
                case QUIESCE_TIMEOUT -> MigrationMaintenanceException.timeout();
                case QUIESCE_INTERRUPTED -> MigrationMaintenanceException.interrupted();
                case PARTICIPANT_FAILURE, RESUME_FAILURE -> MigrationMaintenanceException.maintenanceFailure();
            };
        }
        if (exception instanceof MetadataWriteAdmissionException writeFailure) {
            MetadataWriteAdmissionErrorCode code = writeFailure.code();
            return switch (code) {
                case INVALID_REQUEST -> MigrationMaintenanceException.invalidRequest();
                case OPERATION_CONFLICT, MAINTENANCE_ACTIVE -> MigrationMaintenanceException.operationConflict();
                case DRAIN_TIMEOUT -> MigrationMaintenanceException.timeout();
                case ACQUISITION_INTERRUPTED -> MigrationMaintenanceException.interrupted();
            };
        }
        return MigrationMaintenanceException.maintenanceFailure();
    }

    private void releaseReservation(Object token) {
        lock.lock();
        try {
            if (ownerToken == token) {
                ownerToken = null;
                operationId = null;
                recoveryProducerLease = null;
                recoveryProducerCoordinatorRequired = false;
                recoverySourceLease = null;
                recoveryAuthorityLease = null;
            }
        } finally {
            lock.unlock();
        }
    }

    private void requireRequest(String requestedOperationId) {
        if (requestedOperationId == null || requestedOperationId.isBlank()) {
            throw MigrationMaintenanceException.invalidRequest();
        }
    }

}
