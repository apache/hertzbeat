/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.time.Clock;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.ActivationOutcome;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.RollbackOutcome;

/** Reconciles one managed restart journal without Spring, JPA, or the current datasource. */
final class ManagedMigrationStartupReconciler {

    private final DurableCutoverDraft draft;
    private final FileMigrationOperationStore store;
    private final ManagedMigrationConfigurationTransaction configuration;
    private final MigrationStartupTargetVerifier verifier;
    private final Clock clock;

    ManagedMigrationStartupReconciler(
            DurableCutoverDraft draft,
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration,
            MigrationStartupTargetVerifier verifier,
            Clock clock) {
        this.draft = Objects.requireNonNull(draft, "draft");
        this.store = Objects.requireNonNull(store, "store");
        this.configuration = Objects.requireNonNull(configuration, "configuration");
        this.verifier = Objects.requireNonNull(verifier, "verifier");
        this.clock = Objects.requireNonNull(clock, "clock");
        if (draft.applyMode() != ApplyMode.MANAGED_WRITE) {
            throw new IllegalArgumentException("Startup reconciliation requires a managed migration");
        }
    }

    MigrationStartupReconciliation reconcile() {
        try {
            return reconcileSafely();
        } catch (MigrationStartupReconciliationException failure) {
            throw failure;
        } catch (MigrationOperationStoreException failure) {
            throw failure(failure.errorCode());
        } catch (IOException failure) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        } catch (RuntimeException failure) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private MigrationStartupReconciliation reconcileSafely() throws IOException {
        MigrationOperationSnapshot current = store.selectForStartup(draft.operationId()).orElse(null);
        if (current == null) {
            return MigrationStartupReconciliation.NO_MIGRATION;
        }
        requireExactDraft(current);
        if (current.state() == MigrationOperationState.SUCCEEDED) {
            confirm(current);
            return MigrationStartupReconciliation.ALREADY_SUCCEEDED;
        }
        if (current.state() == MigrationOperationState.ROLLED_BACK) {
            confirm(current);
            return MigrationStartupReconciliation.ALREADY_ROLLED_BACK_RESTART_REQUIRED;
        }
        current = convergeActivation(current);
        if (isRestartRollback(current)) {
            return rollback(current);
        }
        if (!new RetainedManagedActivationSnapshots(current).awaitingRestart()) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        CandidateRef candidate = candidate();
        MigrationStartupTargetVerification verification =
                Objects.requireNonNull(verifier.verify(candidate, current.targetIdentityHash()),
                        "target verification");
        return switch (verification) {
            case CONFIRMED -> succeed(current);
            case DETERMINISTIC_MISMATCH -> beginRollback(current);
            case TRANSIENT_UNAVAILABLE -> MigrationStartupReconciliation.GATED;
        };
    }

    private MigrationOperationSnapshot convergeActivation(MigrationOperationSnapshot current)
            throws IOException {
        RetainedManagedActivationSnapshots snapshots = new RetainedManagedActivationSnapshots(current);
        if (!snapshots.activating()) {
            return current;
        }
        ActivationOutcome outcome = configuration.activateExact(candidate(), current.targetIdentityHash());
        if (outcome != ActivationOutcome.ACTIVATED && outcome != ActivationOutcome.ALREADY_ACTIVE) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        MigrationOperationSnapshot awaiting = snapshots.awaitingRestartSnapshot();
        store.compareAndTransitionOrConfirmDisposition(
                current.operationId(), MigrationOperationState.RUNNING, awaiting);
        return awaiting;
    }

    private MigrationStartupReconciliation succeed(MigrationOperationSnapshot current) {
        MigrationOperationSnapshot succeeded =
                new MigrationStartupSnapshots(current).succeeded(clock.instant());
        store.compareAndTransitionOrConfirmDisposition(
                current.operationId(), MigrationOperationState.AWAITING_RESTART, succeeded);
        return MigrationStartupReconciliation.SUCCEEDED;
    }

    private MigrationStartupReconciliation beginRollback(MigrationOperationSnapshot current)
            throws IOException {
        MigrationOperationSnapshot rollingBack = new MigrationStartupSnapshots(current).rollingBack();
        store.compareAndTransitionOrConfirmDisposition(
                current.operationId(), MigrationOperationState.AWAITING_RESTART, rollingBack);
        return rollback(rollingBack);
    }

    private MigrationStartupReconciliation rollback(MigrationOperationSnapshot current)
            throws IOException {
        RollbackOutcome outcome = configuration.rollbackExact(candidate(), current.targetIdentityHash());
        if (outcome != RollbackOutcome.ROLLED_BACK && outcome != RollbackOutcome.ALREADY_ROLLED_BACK) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        MigrationOperationSnapshot rolledBack =
                new MigrationStartupSnapshots(current).rolledBack(clock.instant());
        store.compareAndTransitionOrConfirmDisposition(
                current.operationId(), MigrationOperationState.RUNNING, rolledBack);
        return MigrationStartupReconciliation.ROLLED_BACK_RESTART_REQUIRED;
    }

    private boolean isRestartRollback(MigrationOperationSnapshot current) {
        return current.state() == MigrationOperationState.RUNNING
                && current.stage() == MigrationStage.ROLLING_BACK
                && current.rollbackOrigin() == MigrationRollbackOrigin.RESTART_FAILURE;
    }

    private void requireExactDraft(MigrationOperationSnapshot current) {
        if (!current.operationId().equals(draft.operationId())
                || current.target() != draft.target()
                || current.applyMode() != draft.applyMode()
                || !current.createdAt().equals(draft.createdAt())
                || !Objects.equals(current.startedAt(), draft.startedAt())
                || !Objects.equals(current.managedCandidateGeneration(), draft.candidateGeneration())) {
            throw failure(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    private void confirm(MigrationOperationSnapshot current) {
        FileMigrationOperationStore.ExactTransitionDisposition disposition =
                store.compareAndTransitionOrConfirmDisposition(
                        current.operationId(), current.state(), current);
        if (disposition != FileMigrationOperationStore.ExactTransitionDisposition.ALREADY_CONFIRMED) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private CandidateRef candidate() {
        return new CandidateRef(draft.operationId(), draft.candidateGeneration());
    }

    private MigrationStartupReconciliationException failure(SetupErrorCode code) {
        return new MigrationStartupReconciliationException(code);
    }
}
