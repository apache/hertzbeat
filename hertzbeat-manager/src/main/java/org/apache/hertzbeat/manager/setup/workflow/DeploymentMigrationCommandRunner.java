/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;

/** Single-slot, Spring-free command boundary for managed metadata migration. */
final class DeploymentMigrationCommandRunner implements AutoCloseable {

    private final FileMigrationOperationStore store;
    private final MigrationCommandTaskFactory taskFactory;
    private final Duration timeout;
    private final ExecutorService worker;
    private MigrationCommandTask active;
    private boolean closed;

    DeploymentMigrationCommandRunner(
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration,
            RetainedCutoverCoordinator coordinator,
            Clock clock,
            Duration timeout) {
        this(store, configuration, coordinator, clock, timeout, MigrationCommandWorker.create());
    }

    /** Test seam for deterministic worker scheduling and rejection. */
    DeploymentMigrationCommandRunner(
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration,
            RetainedCutoverCoordinator coordinator,
            Clock clock,
            Duration timeout,
            ExecutorService worker) {
        this.store = Objects.requireNonNull(store, "store");
        this.timeout = requirePositive(timeout);
        taskFactory = new MigrationCommandTaskFactory(
                store, configuration, coordinator, clock, this.timeout);
        this.worker = Objects.requireNonNull(worker, "worker");
    }

    MigrationView start(MetadataMigrationRequest request) {
        Objects.requireNonNull(request, "request");
        requireManaged(request.applyMode());
        MigrationTargetRequest target = taskFactory.request(request);
        MigrationPreparationBarrier barrier;
        synchronized (this) {
            requireOpen();
            if (active != null) {
                if (!active.operationId().equals(target.operationId()) || !active.matches(target)) {
                    throw failure(SetupErrorCode.OPERATION_CONFLICT);
                }
                barrier = active.barrier();
                RetainedCutoverRecoveryPhase recovery = active.claimRetry();
                if (recovery != null) {
                    submitRetry(active, recovery);
                }
            } else {
                Optional<MigrationOperationSnapshot> persisted = store.selectForStartup(target.operationId());
                if (persisted.isPresent() && persisted.get().state() != MigrationOperationState.PENDING) {
                    MigrationCommandTaskFactory.requireCompatible(persisted.get(), target);
                    return MigrationOperationProjection.view(
                            store.confirmExactForStartup(persisted.get()));
                }
                active = taskFactory.create(
                        this, target, persisted.orElse(null), request.targetDatabase().password());
                barrier = active.barrier();
                submit(active);
            }
        }
        return barrier.await(timeout);
    }

    Optional<MigrationView> joinExecuting(MetadataMigrationRequest request) {
        Objects.requireNonNull(request, "request");
        requireManaged(request.applyMode());
        MigrationTargetRequest target = taskFactory.request(request);
        MigrationPreparationBarrier barrier;
        synchronized (this) {
            requireOpen();
            if (active == null || !active.executing()) {
                return Optional.empty();
            }
            if (!active.operationId().equals(target.operationId()) || !active.matches(target)) {
                throw failure(SetupErrorCode.OPERATION_CONFLICT);
            }
            barrier = active.barrier();
        }
        return Optional.of(barrier.await(timeout));
    }

    Optional<MigrationView> find(String operationId) {
        Optional<MigrationOperationSnapshot> persisted = store.find(operationId);
        synchronized (this) {
            if (active != null && active.operationId().equals(operationId)
                    && projectionRequiresSettlement(active, persisted)) {
                throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
            }
        }
        return persisted.map(MigrationOperationProjection::view);
    }

    synchronized Optional<MigrationOperationSnapshot> inFlightSnapshot(String operationId) {
        if (active == null || !active.operationId().equals(operationId) || !active.executing()) {
            return Optional.empty();
        }
        return active.barrier().confirmedSnapshot();
    }

    synchronized Optional<String> activeOperationId() {
        if (active != null) {
            return Optional.of(active.operationId());
        }
        return store.selectUniqueNonterminalForStartup()
                .map(MigrationOperationSnapshot::operationId);
    }

    synchronized Optional<RetainedCutoverRecoveryPhase> activeRecoveryPhase() {
        if (active == null || active.executing()) {
            return Optional.empty();
        }
        return Optional.of(active.recoveryPhase());
    }

    synchronized void finished(
            MigrationCommandTask task, RetainedCutoverRecoveryPhase recoveryPhase) {
        task.completed(recoveryPhase);
        if (active == task && recoveryPhase == RetainedCutoverRecoveryPhase.NONE) {
            active = null;
        }
        notifyAll();
    }

    @Override
    public void close() {
        boolean interrupted = false;
        Throwable failure = null;
        while (failure == null) {
            MigrationCommandTask retryTask;
            RetainedCutoverRecoveryPhase recovery;
            synchronized (this) {
                closed = true;
                while (active != null && active.executing()) {
                    try {
                        wait();
                    } catch (InterruptedException waitInterrupted) {
                        interrupted = true;
                    }
                }
                if (active == null) {
                    break;
                }
                retryTask = active;
                recovery = retryTask.claimRetry();
            }
            try {
                retryTask.retry(recovery);
            } catch (RuntimeException | Error retryFailure) {
                failure = retryFailure;
            }
        }
        synchronized (this) {
            if (active == null) {
                worker.shutdown();
            }
        }
        if (activeOperationInMemory().isEmpty()) {
            while (!worker.isTerminated()) {
                try {
                    worker.awaitTermination(1, TimeUnit.DAYS);
                } catch (InterruptedException waitInterrupted) {
                    interrupted = true;
                }
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
        rethrow(failure);
    }

    private void submit(MigrationCommandTask task) {
        try {
            worker.execute(task);
        } catch (Error fatal) {
            reject(task);
            throw fatal;
        } catch (RejectedExecutionException rejected) {
            reject(task);
            throw failure(SetupErrorCode.MIGRATION_UNAVAILABLE);
        } catch (RuntimeException unexpected) {
            reject(task);
            throw failure(SetupErrorCode.MIGRATION_UNAVAILABLE);
        }
    }

    private void submitRetry(
            MigrationCommandTask task, RetainedCutoverRecoveryPhase recovery) {
        try {
            MigrationCommandSubmission.submitWhenAvailable(
                    worker, () -> task.retry(recovery), timeout);
        } catch (Error fatal) {
            task.restoreRetry(recovery);
            throw fatal;
        } catch (MetadataMigrationException knownFailure) {
            task.restoreRetry(recovery);
            throw knownFailure;
        } catch (RejectedExecutionException rejected) {
            task.restoreRetry(recovery);
            throw failure(SetupErrorCode.MIGRATION_UNAVAILABLE);
        } catch (RuntimeException unexpected) {
            task.restoreRetry(recovery);
            throw failure(SetupErrorCode.MIGRATION_UNAVAILABLE);
        }
    }

    private void reject(MigrationCommandTask task) {
        task.reject();
        if (active == task) {
            active = null;
            notifyAll();
        }
    }

    private void requireOpen() {
        if (closed) {
            throw failure(SetupErrorCode.MIGRATION_UNAVAILABLE);
        }
    }

    private static void requireManaged(ApplyMode applyMode) {
        if (applyMode != ApplyMode.MANAGED_WRITE) {
            throw failure(SetupErrorCode.INVALID_REQUEST);
        }
    }

    private static Duration requirePositive(Duration value) {
        if (value == null || value.isZero() || value.isNegative()) {
            throw new IllegalArgumentException("Migration timeout must be positive");
        }
        return value;
    }

    private static boolean projectionRequiresSettlement(
            MigrationCommandTask task, Optional<MigrationOperationSnapshot> persisted) {
        boolean actionableOrMissing = persisted.isEmpty() || persisted.filter(snapshot ->
                snapshot.terminal() || snapshot.state() != MigrationOperationState.PENDING
                        && snapshot.state() != MigrationOperationState.RUNNING).isPresent();
        return task.projectionRequiresSettlement(actionableOrMissing);
    }

    private synchronized Optional<String> activeOperationInMemory() {
        return Optional.ofNullable(active).map(MigrationCommandTask::operationId);
    }

    private static void rethrow(Throwable failure) {
        if (failure instanceof Error fatal) {
            throw fatal;
        }
        if (failure instanceof RuntimeException runtime) {
            throw runtime;
        }
    }

    private static MigrationOperationStoreException failure(SetupErrorCode code) {
        return new MigrationOperationStoreException(code);
    }
}
