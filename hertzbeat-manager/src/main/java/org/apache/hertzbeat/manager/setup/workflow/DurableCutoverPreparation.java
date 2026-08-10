/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.MetadataTargetStageResult;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.workflow.FileMigrationOperationStore.ExactTransitionDisposition;

/** Implements the durable journal-and-candidate boundary before target provisioning. */
final class DurableCutoverPreparation implements RetainedCutoverPreparation {

    private final DurableCutoverDraft draft;
    private final FileMigrationOperationStore store;
    private final ManagedMigrationConfigurationTransaction configuration;

    DurableCutoverPreparation(
            DurableCutoverDraft draft,
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration) {
        this.draft = Objects.requireNonNull(draft, "draft");
        this.store = Objects.requireNonNull(store, "store");
        this.configuration = Objects.requireNonNull(configuration, "configuration");
    }

    @Override
    public void prepare(
            RetainedCutoverPreparationContext context,
            MetadataDatabaseSettings target,
            SecretValue borrowedPassword) {
        try {
            prepareDurably(context, target, borrowedPassword);
        } catch (MigrationOperationStoreException failure) {
            throw failure(failure.errorCode());
        }
    }

    private void prepareDurably(
            RetainedCutoverPreparationContext context,
            MetadataDatabaseSettings target,
            SecretValue borrowedPassword) {
        requireExactRequest(context, target, borrowedPassword);
        DurableCutoverSnapshots snapshots = new DurableCutoverSnapshots(
                draft, context.targetIdentityHash());
        MigrationOperationSnapshot clean = snapshots.cleanPending();
        MigrationOperationSnapshot blocked = snapshots.blockedPending();
        MigrationOperationSnapshot running = snapshots.running();
        Optional<MigrationOperationSnapshot> current = store.find(draft.operationId());
        if (current.filter(snapshots::compatibleRunning).isPresent()) {
            throw stopAfterConfirm(current.orElseThrow());
        }
        if (current.isPresent() && !current.get().equals(clean) && !current.get().equals(blocked)) {
            if (!snapshots.sameIdentity(current.get())) {
                throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
            }
            throw stopAfterConfirm(current.get());
        }
        confirmPending(current, clean, blocked);
        if (draft.applyMode() == ApplyMode.MANAGED_WRITE) {
            prepareManaged(context, target, borrowedPassword, snapshots, blocked, running);
        } else {
            transitionToRunning(running);
        }
    }

    private void confirmPending(
            Optional<MigrationOperationSnapshot> current,
            MigrationOperationSnapshot clean,
            MigrationOperationSnapshot blocked) {
        if (current.filter(blocked::equals).isPresent()) {
            store.compareAndTransitionOrConfirm(
                    draft.operationId(), MigrationOperationState.PENDING, blocked);
            return;
        }
        store.createOrConfirm(clean);
    }

    private void prepareManaged(
            RetainedCutoverPreparationContext context,
            MetadataDatabaseSettings target,
            SecretValue borrowedPassword,
            DurableCutoverSnapshots snapshots,
            MigrationOperationSnapshot blocked,
            MigrationOperationSnapshot running) {
        MetadataTargetStageResult result;
        try (SecretValue ownedPassword = SecretValue.copyOf(borrowedPassword)) {
            result = configuration.stageMetadataTarget(
                    draft.operationId(), draft.candidateGeneration(), context.targetIdentityHash(),
                    target, ownedPassword);
        } catch (IOException | RuntimeException failure) {
            transitionAndFail(blocked, SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
            return;
        }
        switch (result.outcome()) {
            case STAGED, ALREADY_STAGED -> {
                if (!exactCandidate(result)) {
                    transitionAndFail(blocked, SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
                }
                transitionToRunning(running);
            }
            case SOURCE_UNSUPPORTED -> transitionAndFail(
                    snapshots.failed(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED),
                    SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
            case STALE -> transitionAndFail(
                    snapshots.failed(SetupErrorCode.OPERATION_CONFLICT),
                    SetupErrorCode.OPERATION_CONFLICT);
            case RECOVERY_REQUIRED -> transitionAndFail(
                    blocked, SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
            default -> transitionAndFail(blocked, SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private boolean exactCandidate(MetadataTargetStageResult result) {
        return result.candidate().equals(Optional.of(
                new CandidateRef(draft.operationId(), draft.candidateGeneration())));
    }

    private void transitionAndFail(MigrationOperationSnapshot replacement, SetupErrorCode code) {
        transition(replacement);
        throw failure(code);
    }

    private void transitionToRunning(MigrationOperationSnapshot running) {
        ExactTransitionDisposition disposition = transition(running);
        if (disposition == ExactTransitionDisposition.ALREADY_CONFIRMED) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private ExactTransitionDisposition transition(MigrationOperationSnapshot replacement) {
        return store.compareAndTransitionOrConfirmDisposition(
                draft.operationId(), MigrationOperationState.PENDING, replacement);
    }

    private DurableCutoverPreparationException stopAfterConfirm(MigrationOperationSnapshot current) {
        ExactTransitionDisposition disposition = store.compareAndTransitionOrConfirmDisposition(
                draft.operationId(), current.state(), current);
        if (disposition != ExactTransitionDisposition.ALREADY_CONFIRMED) {
            throw new MigrationOperationStoreException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        if ((current.state() == MigrationOperationState.FAILED
                || current.state() == MigrationOperationState.ROLLED_BACK)
                && current.errorCode() != null) {
            return failure(current.errorCode());
        }
        return failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
    }

    private void requireExactRequest(
            RetainedCutoverPreparationContext context,
            MetadataDatabaseSettings target,
            SecretValue borrowedPassword) {
        Objects.requireNonNull(context, "context");
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(borrowedPassword, "borrowedPassword");
        if (!draft.operationId().equals(context.operationId())
                || targetKind() != target.kind()) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    private MetadataDatabaseKind targetKind() {
        return switch (draft.target()) {
            case MYSQL -> MetadataDatabaseKind.MYSQL;
            case POSTGRESQL -> MetadataDatabaseKind.POSTGRESQL;
        };
    }

    private static DurableCutoverPreparationException failure(SetupErrorCode code) {
        return new DurableCutoverPreparationException(code);
    }
}
