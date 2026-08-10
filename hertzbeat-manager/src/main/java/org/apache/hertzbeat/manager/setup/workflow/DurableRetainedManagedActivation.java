/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.ActivationOutcome;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;

/** Activates an exact managed candidate between two durable journal transitions. */
final class DurableRetainedManagedActivation implements RetainedManagedActivation {

    private final DurableCutoverDraft draft;
    private final FileMigrationOperationStore store;
    private final ManagedMigrationConfigurationTransaction configuration;

    DurableRetainedManagedActivation(
            DurableCutoverDraft draft,
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration) {
        this.draft = Objects.requireNonNull(draft, "draft");
        this.store = Objects.requireNonNull(store, "store");
        this.configuration = Objects.requireNonNull(configuration, "configuration");
        if (draft.applyMode() != ApplyMode.MANAGED_WRITE) {
            throw new IllegalArgumentException("Managed activation requires a managed cutover draft");
        }
    }

    @Override
    public RetainedManagedActivationDisposition activate(
            RetainedManagedActivationContext context) {
        Objects.requireNonNull(context, "context");
        try {
            return activateDurably(context);
        } catch (RetainedManagedActivationException failure) {
            throw failure;
        } catch (MigrationOperationStoreException failure) {
            throw new RetainedManagedActivationException(failure.errorCode());
        } catch (IOException failure) {
            throw recoveryRequired();
        } catch (RuntimeException failure) {
            throw recoveryRequired();
        }
    }

    private RetainedManagedActivationDisposition activateDurably(
            RetainedManagedActivationContext context) throws IOException {
        MigrationOperationSnapshot current = store.find(context.operationId())
                .orElseThrow(() -> new RetainedManagedActivationException(
                        SetupErrorCode.OPERATION_NOT_FOUND));
        requireExactIdentity(current, context);
        RetainedManagedActivationSnapshots snapshots =
                new RetainedManagedActivationSnapshots(current);
        if (snapshots.awaitingRestart()) {
            confirmExact(current);
            return RetainedManagedActivationDisposition.ALREADY_AWAITING_RESTART;
        }
        MigrationOperationSnapshot activating;
        if (snapshots.ready()) {
            activating = snapshots.activatingSnapshot();
            store.compareAndTransitionOrConfirmDisposition(
                    context.operationId(), MigrationOperationState.READY_TO_ACTIVATE, activating);
        } else if (snapshots.activating()) {
            activating = current;
            confirmExact(current);
        } else {
            throw new RetainedManagedActivationException(SetupErrorCode.OPERATION_CONFLICT);
        }
        ActivationOutcome outcome = activateCandidate(context);
        if (outcome != ActivationOutcome.ACTIVATED && outcome != ActivationOutcome.ALREADY_ACTIVE) {
            throw recoveryRequired();
        }
        MigrationOperationSnapshot awaiting =
                new RetainedManagedActivationSnapshots(activating).awaitingRestartSnapshot();
        store.compareAndTransitionOrConfirmDisposition(
                context.operationId(), MigrationOperationState.RUNNING, awaiting);
        return RetainedManagedActivationDisposition.ACTIVATED;
    }

    private ActivationOutcome activateCandidate(
            RetainedManagedActivationContext context) throws IOException {
        CandidateRef candidate = new CandidateRef(
                context.operationId(), draft.candidateGeneration());
        return configuration.activateExact(candidate, context.targetIdentityHash());
    }

    private void requireExactIdentity(
            MigrationOperationSnapshot current, RetainedManagedActivationContext context) {
        if (!draft.operationId().equals(context.operationId())
                || !current.operationId().equals(draft.operationId())
                || current.target() != draft.target()
                || current.applyMode() != draft.applyMode()
                || !current.createdAt().equals(draft.createdAt())
                || !Objects.equals(current.startedAt(), draft.startedAt())
                || !current.targetIdentityHash().equals(context.targetIdentityHash())
                || !Objects.equals(current.managedCandidateGeneration(), draft.candidateGeneration())) {
            throw new RetainedManagedActivationException(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    private void confirmExact(MigrationOperationSnapshot current) {
        FileMigrationOperationStore.ExactTransitionDisposition disposition =
                store.compareAndTransitionOrConfirmDisposition(
                        current.operationId(), current.state(), current);
        if (disposition != FileMigrationOperationStore.ExactTransitionDisposition.ALREADY_CONFIRMED) {
            throw recoveryRequired();
        }
    }

    private RetainedManagedActivationException recoveryRequired() {
        return new RetainedManagedActivationException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
    }
}
