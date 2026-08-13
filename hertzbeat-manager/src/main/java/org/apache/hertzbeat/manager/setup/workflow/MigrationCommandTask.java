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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Owns one command's copied password until the retained coordinator has fully returned. */
final class MigrationCommandTask implements Runnable {

    private final DeploymentMigrationCommandRunner owner;
    private final RetainedCutoverCoordinator coordinator;
    private final FileMigrationOperationStore store;
    private final ManagedMigrationConfigurationTransaction configuration;
    private final MigrationCommandDraft draft;
    private final MetadataDatabaseSettings target;
    private final SecretValue password;
    private final Duration timeout;
    private final Clock clock;
    private final MigrationPreparationBarrier barrier;
    private final MigrationFailureFinalization failureFinalization;
    private RetainedCutoverRecoveryPhase recoveryPhase = RetainedCutoverRecoveryPhase.NONE;
    private boolean executing = true;

    MigrationCommandTask(
            DeploymentMigrationCommandRunner owner,
            RetainedCutoverCoordinator coordinator,
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration,
            MigrationCommandDraft draft,
            MetadataDatabaseSettings target,
            SecretValue password,
            Duration timeout,
            Clock clock,
            MigrationPreparationBarrier barrier) {
        this.owner = Objects.requireNonNull(owner, "owner");
        this.coordinator = Objects.requireNonNull(coordinator, "coordinator");
        this.store = Objects.requireNonNull(store, "store");
        this.configuration = Objects.requireNonNull(configuration, "configuration");
        this.draft = Objects.requireNonNull(draft, "draft");
        this.target = Objects.requireNonNull(target, "target");
        this.password = Objects.requireNonNull(password, "password");
        this.timeout = Objects.requireNonNull(timeout, "timeout");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.barrier = Objects.requireNonNull(barrier, "barrier");
        failureFinalization = new MigrationFailureFinalization(draft.operationId(), store, clock);
    }

    @Override
    public void run() {
        Throwable failure = null;
        try {
            DurableCutoverDraft runningDraft = draft.start(clock.instant());
            barrier.bind(
                    runningDraft, new DurableCutoverPreparation(runningDraft, store, configuration));
            coordinator.execute(
                    draft.operationId(), target, password, timeout,
                    new MigrationProgressJournal(draft.operationId(), store), barrier,
                    new DurableRetainedCopyJournalHandoff(runningDraft, store));
        } catch (MetadataMigrationException knownFailure) {
            barrier.workerFailed(knownFailure);
            failure = knownFailure;
            try {
                failureFinalization.finalizeKnown(knownFailure);
            } catch (RuntimeException finalizationFailure) {
                failure = finalizationFailure;
            } catch (Error finalizationFatal) {
                failure = finalizationFatal;
            }
        } catch (Error fatal) {
            barrier.workerFailed(fatal);
            failure = fatal;
        } catch (RuntimeException runtimeFailure) {
            barrier.workerFailed(runtimeFailure);
            failure = runtimeFailure;
        } finally {
            password.close();
            failure = finish(failure);
        }
        rethrowFatal(failure);
    }

    void retry(RetainedCutoverRecoveryPhase expectedPhase) {
        Throwable failure = null;
        try {
            if (expectedPhase == RetainedCutoverRecoveryPhase.FAILURE_FINALIZATION_PENDING) {
                failureFinalization.retry();
            } else if (expectedPhase == RetainedCutoverRecoveryPhase.RELEASE_PENDING) {
                coordinator.retryRelease(draft.operationId(), timeout);
            } else if (expectedPhase == RetainedCutoverRecoveryPhase.HANDOFF_PENDING) {
                coordinator.retryHandoff(draft.operationId());
            } else {
                throw new MigrationOperationStoreException(
                        SetupErrorCode.OPERATION_CONFLICT);
            }
        } catch (MetadataMigrationException knownFailure) {
            failureFinalization.finalizeKnown(knownFailure);
            failure = knownFailure;
        } catch (RuntimeException | Error retryFailure) {
            failure = retryFailure;
        } finally {
            failure = finish(failure);
        }
        if (recoveryPhase() != RetainedCutoverRecoveryPhase.NONE || failure instanceof Error) {
            rethrow(failure);
        }
    }

    String operationId() {
        return draft.operationId();
    }

    boolean matches(MigrationTargetRequest request) {
        return draft.target() == request.target()
                && draft.applyMode() == request.applyMode()
                && target.equals(request.settings());
    }

    MigrationPreparationBarrier barrier() {
        return barrier;
    }

    synchronized RetainedCutoverRecoveryPhase claimRetry() {
        if (executing || recoveryPhase == RetainedCutoverRecoveryPhase.NONE) {
            return null;
        }
        executing = true;
        return recoveryPhase;
    }

    synchronized void restoreRetry(RetainedCutoverRecoveryPhase phase) {
        executing = false;
        recoveryPhase = Objects.requireNonNull(phase, "phase");
    }

    synchronized boolean executing() {
        return executing;
    }

    synchronized RetainedCutoverRecoveryPhase recoveryPhase() {
        return recoveryPhase;
    }

    synchronized boolean projectionRequiresSettlement(boolean actionableOrMissing) {
        return recoveryPhase != RetainedCutoverRecoveryPhase.NONE
                || failureFinalization.pending()
                || executing && actionableOrMissing;
    }

    synchronized void completed(RetainedCutoverRecoveryPhase phase) {
        recoveryPhase = Objects.requireNonNull(phase, "phase");
        executing = false;
    }

    void reject() {
        password.close();
    }

    private Throwable finish(Throwable primary) {
        return MigrationCommandCompletion.finish(
                coordinator, draft.operationId(), failureFinalization.pending(), primary,
                phase -> owner.finished(this, phase));
    }

    private static void rethrowFatal(Throwable failure) {
        if (failure instanceof Error fatal) {
            throw fatal;
        }
    }

    private static void rethrow(Throwable failure) {
        if (failure instanceof Error fatal) {
            throw fatal;
        }
        if (failure instanceof RuntimeException runtime) {
            throw runtime;
        }
    }
}
