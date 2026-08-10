/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Duration;
import java.util.Objects;
import java.util.function.LongSupplier;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/**
 * Composes one provision-and-copy attempt while retaining successful maintenance ownership.
 *
 * <p>The work deadline does not bound exact target cleanup or maintenance release. Those safety
 * operations may block, in which case this coordinator deliberately retains the single active
 * operation and its fence.
 */
final class RetainedCutoverCoordinator {

    private final RetainedCutoverState state = new RetainedCutoverState();
    private final TargetJdbcConnectionFactory targetFactory;
    private final RetainedCutoverSteps steps;
    private final LongSupplier ticker;

    RetainedCutoverCoordinator(
            TargetJdbcConnectionFactory targetFactory,
            FlywayTargetSchemaProvisioner provisioner,
            MigrationMaintenanceOrchestrator maintenance,
            JdbcMetadataMigrationExecutor executor,
            LongSupplier ticker) {
        this.targetFactory = Objects.requireNonNull(targetFactory, "targetFactory");
        this.steps = new RetainedCutoverSteps(
                targetFactory, provisioner, maintenance, executor);
        this.ticker = Objects.requireNonNull(ticker, "ticker");
    }

    RetainedCutoverResult execute(
            String operationId,
            MetadataDatabaseSettings target,
            SecretValue borrowedPassword,
            Duration timeout,
            MetadataMigrationProgressSink progress,
            RetainedCutoverPreparation preparation,
            RetainedCopyJournalHandoff handoff) {
        requireRequest(operationId, target, borrowedPassword, timeout, progress, preparation, handoff);
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(timeout, ticker);
        RetainedCutoverState.Execution execution = state.reserve(operationId, handoff);
        TargetJdbcConnectionLease provisionLease = acquire(execution, target, borrowedPassword, deadline);
        String provisionIdentity = targetIdentity(execution, provisionLease, deadline);
        execution.targetIdentityHash(provisionIdentity);
        RetainedCutoverOutcome preparationOutcome = steps.prepare(
                preparation,
                new RetainedCutoverPreparationContext(operationId, provisionIdentity),
                target,
                borrowedPassword,
                deadline);
        if (!preparationOutcome.successful()) {
            return finish(execution, RetainedCutoverRelease.resources(
                    provisionLease, null, preparationOutcome, false), deadline);
        }
        RetainedCutoverOutcome provisionOutcome = steps.provision(
                provisionLease, target, deadline);
        if (!provisionOutcome.successful()) {
            return finish(execution, RetainedCutoverRelease.resources(
                    provisionLease, null, provisionOutcome, false), deadline);
        }
        closeBeforeContinuation(execution, provisionLease);

        TargetJdbcConnectionLease copyLease = acquire(execution, target, borrowedPassword, deadline);
        String copyIdentity = targetIdentity(execution, copyLease, deadline);
        if (!provisionIdentity.equals(copyIdentity)) {
            return finish(execution, RetainedCutoverRelease.resources(
                    copyLease, null, RetainedCutoverOutcome.identityChanged(), false), deadline);
        }
        MigrationMaintenanceLease maintenanceLease;
        try {
            maintenanceLease = steps.acquireMaintenance(operationId, deadline);
        } catch (RuntimeException | Error failure) {
            return finish(execution, RetainedCutoverRelease.resources(
                    copyLease, null, RetainedCutoverOutcome.failure(failure), false), deadline);
        }
        RetainedCutoverOutcome copyOutcome = steps.copy(
                copyLease, maintenanceLease, target, deadline, progress);
        return finish(execution, RetainedCutoverRelease.resources(
                copyLease, maintenanceLease, copyOutcome, copyOutcome.successful()), deadline);
    }

    RetainedCutoverResult retained(String operationId) {
        requireOperationId(operationId);
        return state.retained(operationId);
    }

    void releaseRetained(String operationId) {
        requireOperationId(operationId);
        RetainedCutoverState.Execution execution = state.claimRetainedRelease(operationId);
        finish(execution, execution.release(), cleanupDeadline());
    }

    RetainedCutoverResult retryRelease(String operationId, Duration timeout) {
        requireOperationId(operationId);
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(timeout, ticker);
        RetainedCutoverState.Execution execution = state.claimPendingRelease(operationId);
        return finish(execution, execution.release(), deadline);
    }

    RetainedCutoverResult retryHandoff(String operationId) {
        requireOperationId(operationId);
        return runHandoff(state.claimPendingHandoff(operationId));
    }

    private TargetJdbcConnectionLease acquire(
            RetainedCutoverState.Execution execution,
            MetadataDatabaseSettings target,
            SecretValue password,
            JdbcMetadataMigrationDeadline deadline) {
        try {
            return steps.acquire(target, password, deadline);
        } catch (TargetJdbcConnectionException failure) {
            if (mayHaveAsynchronousOwnership(failure.code())) {
                RetainedCutoverOutcome outcome = RetainedCutoverOutcome.failure(failure);
                releasePending(execution, RetainedCutoverRelease.factoryCleanup(
                        targetFactory, outcome));
                outcome.releaseRequired();
            }
            state.clear(execution);
            throw failure;
        } catch (Error fatal) {
            RetainedCutoverOutcome outcome = RetainedCutoverOutcome.failure(fatal);
            releasePending(execution, RetainedCutoverRelease.factoryCleanup(targetFactory, outcome));
            outcome.releaseRequired();
            throw fatal;
        } catch (RuntimeException unexpected) {
            state.clear(execution);
            throw new RetainedCutoverException(RetainedCutoverErrorCode.EXECUTION_FAILED);
        }
    }

    private String targetIdentity(
            RetainedCutoverState.Execution execution,
            TargetJdbcConnectionLease lease,
            JdbcMetadataMigrationDeadline deadline) {
        try {
            return lease.targetIdentityHash();
        } catch (RuntimeException | Error failure) {
            finish(execution, RetainedCutoverRelease.resources(
                    lease, null, RetainedCutoverOutcome.failure(failure), false), deadline);
            throw new RetainedCutoverException(RetainedCutoverErrorCode.EXECUTION_FAILED);
        }
    }

    private void closeBeforeContinuation(
            RetainedCutoverState.Execution execution,
            TargetJdbcConnectionLease lease) {
        boolean interrupted = Thread.interrupted();
        try {
            lease.close();
        } catch (RuntimeException releaseFailure) {
            RetainedCutoverOutcome outcome = RetainedCutoverOutcome.retryExecution();
            releasePending(execution, RetainedCutoverRelease.resources(
                    lease, null, outcome, false));
            outcome.releaseRequired();
        } catch (Error releaseFatal) {
            RetainedCutoverRelease release = RetainedCutoverRelease.resources(
                    lease, null, RetainedCutoverOutcome.retryExecution(), false);
            releasePending(execution, release);
            RetainedCutoverOutcome.retryExecution().releaseFatal(releaseFatal);
        } finally {
            restoreInterrupt(interrupted | Thread.interrupted());
        }
    }

    private RetainedCutoverResult finish(
            RetainedCutoverState.Execution execution,
            RetainedCutoverRelease release,
            JdbcMetadataMigrationDeadline cleanupDeadline) {
        boolean interrupted = Thread.interrupted();
        RetainedCutoverRelease.Advance advance;
        try {
            advance = release.advance(cleanupDeadline);
        } catch (RuntimeException releaseFailure) {
            releasePending(execution, release);
            release.outcome().releaseRequired();
            throw releaseFailure;
        } catch (Error releaseFatal) {
            releasePending(execution, release);
            release.outcome().releaseFatal(releaseFatal);
            throw releaseFatal;
        } finally {
            restoreInterrupt(interrupted | Thread.interrupted());
        }
        if (advance == RetainedCutoverRelease.Advance.RETAINED) {
            state.beginHandoff(execution, release.takeRetainedMaintenance());
            return runHandoff(execution);
        }
        state.clear(execution);
        release.outcome().replay();
        return execution.result(RetainedCutoverResult.Status.RELEASED);
    }

    private RetainedCutoverResult runHandoff(RetainedCutoverState.Execution execution) {
        try {
            if (Thread.currentThread().isInterrupted()) {
                throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
            }
            RetainedCopyJournalDisposition disposition = Objects.requireNonNull(
                    execution.handoff().handoff(execution.handoffContext()), "handoff disposition");
            if (Thread.currentThread().isInterrupted()) {
                throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
            }
            return state.completeHandoff(execution, disposition);
        } catch (Error fatal) {
            state.handoffPending(execution);
            throw fatal;
        } catch (RuntimeException failure) {
            state.handoffPending(execution);
            if (failure instanceof RetainedCopyJournalHandoffException handoffFailure) {
                throw handoffFailure;
            }
            throw new RetainedCopyJournalHandoffException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private void releasePending(
            RetainedCutoverState.Execution execution, RetainedCutoverRelease release) {
        state.releasePending(execution, release);
    }

    private JdbcMetadataMigrationDeadline cleanupDeadline() {
        return JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(30), ticker);
    }

    private static void requireRequest(
            String operationId,
            MetadataDatabaseSettings target,
            SecretValue password,
            Duration timeout,
            MetadataMigrationProgressSink progress,
            RetainedCutoverPreparation preparation,
            RetainedCopyJournalHandoff handoff) {
        requireOperationId(operationId);
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(password, "password");
        Objects.requireNonNull(timeout, "timeout");
        Objects.requireNonNull(progress, "progress");
        Objects.requireNonNull(preparation, "preparation");
        Objects.requireNonNull(handoff, "handoff");
    }

    private static void requireOperationId(String operationId) {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw MigrationMaintenanceException.invalidRequest();
        }
    }

    private static void restoreInterrupt(boolean interrupted) {
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private static boolean mayHaveAsynchronousOwnership(TargetJdbcConnectionErrorCode code) {
        return code == TargetJdbcConnectionErrorCode.TIMEOUT
                || code == TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED
                || code == TargetJdbcConnectionErrorCode.FACTORY_CLOSED
                || code == TargetJdbcConnectionErrorCode.OPERATION_CONFLICT;
    }

}
