/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.ActivateMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;

/** Spring-free managed migration command facade over one exact retained-cutover graph. */
final class ManagedDeploymentMigrationCommands implements AutoCloseable {

    private final DeploymentMigrationCommandRunner runner;
    private final FileMigrationOperationStore store;
    private final ManagedMigrationConfigurationTransaction configuration;
    private final RetainedCutoverCoordinator coordinator;
    private volatile boolean closed;

    ManagedDeploymentMigrationCommands(
            DeploymentMigrationCommandRunner runner,
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration,
            RetainedCutoverCoordinator coordinator) {
        this.runner = Objects.requireNonNull(runner, "runner");
        this.store = Objects.requireNonNull(store, "store");
        this.configuration = Objects.requireNonNull(configuration, "configuration");
        this.coordinator = Objects.requireNonNull(coordinator, "coordinator");
    }

    MigrationView migrate(MetadataMigrationRequest request) {
        requireOpen();
        Objects.requireNonNull(request, "request");
        if (request.applyMode() != ApplyMode.MANAGED_WRITE) {
            throw failure(SetupErrorCode.INVALID_REQUEST);
        }
        return runner.start(request);
    }

    MigrationView migration(String operationId) {
        requireOpen();
        requireOperationId(operationId);
        RetainedCutoverStatus retained = coordinator.status();
        if (retained.owns(operationId) && liveCopyPhase(retained.phase())) {
            Optional<MigrationOperationSnapshot> proof = runner.inFlightSnapshot(operationId);
            if (proof.isPresent()) {
                return liveProjection(operationId, proof.orElseThrow());
            }
            retained = coordinator.status();
        }
        Optional<MigrationView> stored = retained.owns(operationId)
                && confirmedRetainedPhase(retained.phase())
                ? store.find(operationId).map(MigrationOperationProjection::view)
                : runner.find(operationId);
        retained = coordinator.status();
        if (retained.owns(operationId) && !matchesRetainedShape(stored, retained.phase())) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        return stored.orElseThrow(() -> failure(SetupErrorCode.OPERATION_NOT_FOUND));
    }

    MigrationView activate(String operationId, ActivateMigrationRequest request) {
        requireOpen();
        requireOperationId(operationId);
        Objects.requireNonNull(request, "request");
        if (request.expectedState() != MigrationOperationState.READY_TO_ACTIVATE) {
            throw failure(SetupErrorCode.OPERATION_CONFLICT);
        }
        Optional<MigrationOperationSnapshot> stored = store.find(operationId);
        RetainedCutoverStatus retained = coordinator.status();
        if (stored.isEmpty()) {
            if (retained.owns(operationId)) {
                throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
            }
            throw failure(SetupErrorCode.OPERATION_NOT_FOUND);
        }
        requireOwned(retained, operationId);
        MigrationOperationSnapshot current = stored.orElseThrow(
                () -> failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        activate(current, retained.phase());
        return confirmedAwaitingRestart(operationId);
    }

    Optional<String> activeOperationId() {
        requireOpen();
        Optional<String> durable = runner.activeOperationId();
        RetainedCutoverStatus retained = coordinator.status();
        if (retained.phase() == RetainedCutoverStatus.Phase.NONE) {
            return durable;
        }
        if (durable.isPresent() && !durable.get().equals(retained.operationId())) {
            throw failure(SetupErrorCode.OPERATION_CONFLICT);
        }
        return Optional.of(retained.operationId());
    }

    Optional<MigrationView> joinExecuting(MetadataMigrationRequest request) {
        requireOpen();
        Objects.requireNonNull(request, "request");
        return runner.joinExecuting(request);
    }

    @Override
    public synchronized void close() {
        closed = true;
        runner.close();
        RetainedCutoverStatus retained = coordinator.status();
        if (retained.phase() != RetainedCutoverStatus.Phase.NONE) {
            coordinator.shutdownOperation(retained.operationId());
        }
    }

    private void activate(
            MigrationOperationSnapshot current, RetainedCutoverStatus.Phase phase) {
        switch (phase) {
            case RETAINED -> activateReady(current);
            case ACTIVATION_PENDING, AWAITING_RESTART_RETAINED ->
                    coordinator.retryActivation(current.operationId());
            default -> throw failure(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    private void activateReady(MigrationOperationSnapshot current) {
        if (current.state() != MigrationOperationState.READY_TO_ACTIVATE) {
            throw failure(SetupErrorCode.MIGRATION_ACTIVATION_NOT_AVAILABLE);
        }
        DurableCutoverDraft draft = DurableCutoverDraftFactory.from(current);
        coordinator.activateRetained(current.operationId(),
                new DurableRetainedManagedActivation(draft, store, configuration));
    }

    private MigrationView confirmedAwaitingRestart(String operationId) {
        MigrationOperationSnapshot current = store.find(operationId)
                .orElseThrow(() -> failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        RetainedCutoverStatus retained = coordinator.status();
        if (!retained.owns(operationId)
                || retained.phase() != RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED
                || current.state() != MigrationOperationState.AWAITING_RESTART) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        return MigrationOperationProjection.view(current);
    }

    private static boolean matchesRetainedShape(
            Optional<MigrationView> stored, RetainedCutoverStatus.Phase phase) {
        return stored.filter(view -> switch (phase) {
            case RETAINED -> view.state() == MigrationOperationState.READY_TO_ACTIVATE;
            case AWAITING_RESTART_RETAINED ->
                    view.state() == MigrationOperationState.AWAITING_RESTART;
            case EXECUTING, HANDOFFING ->
                    view.state() == MigrationOperationState.RUNNING;
            default -> false;
        }).isPresent();
    }

    private static boolean liveCopyPhase(RetainedCutoverStatus.Phase phase) {
        return phase == RetainedCutoverStatus.Phase.EXECUTING
                || phase == RetainedCutoverStatus.Phase.HANDOFFING;
    }

    private static boolean confirmedRetainedPhase(RetainedCutoverStatus.Phase phase) {
        return phase == RetainedCutoverStatus.Phase.RETAINED
                || phase == RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED;
    }

    private MigrationView liveProjection(
            String operationId, MigrationOperationSnapshot proof) {
        FileMigrationOperationStore.NonblockingSnapshotRead read = store.tryFind(operationId);
        return switch (read.state()) {
            case BUSY -> MigrationOperationProjection.view(proof);
            case MISSING -> throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
            case PRESENT -> {
                MigrationOperationSnapshot current = read.snapshot();
                if (!compatibleLiveSnapshot(proof, current)) {
                    throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
                }
                yield current.state() == MigrationOperationState.READY_TO_ACTIVATE
                        ? finalLiveProjection(proof, current)
                        : MigrationOperationProjection.view(current);
            }
        };
    }

    private MigrationView finalLiveProjection(
            MigrationOperationSnapshot proof, MigrationOperationSnapshot current) {
        RetainedCutoverStatus retained = coordinator.status();
        if (retained.owns(current.operationId())
                && retained.phase() == RetainedCutoverStatus.Phase.RETAINED) {
            return MigrationOperationProjection.view(current);
        }
        if (retained.owns(current.operationId()) && liveCopyPhase(retained.phase())) {
            return MigrationOperationProjection.view(proof);
        }
        throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
    }

    private static boolean compatibleLiveSnapshot(
            MigrationOperationSnapshot proof, MigrationOperationSnapshot current) {
        boolean compatibleState = proof.state() == MigrationOperationState.PENDING
                ? current.equals(proof)
                : current.state() == MigrationOperationState.RUNNING
                        || current.state() == MigrationOperationState.READY_TO_ACTIVATE;
        return compatibleState
                && current.operationId().equals(proof.operationId())
                && current.target() == proof.target()
                && current.applyMode() == proof.applyMode()
                && current.createdAt().equals(proof.createdAt())
                && Objects.equals(current.startedAt(), proof.startedAt())
                && current.targetIdentityHash().equals(proof.targetIdentityHash())
                && Objects.equals(current.managedCandidateGeneration(),
                        proof.managedCandidateGeneration());
    }

    private static void requireOwned(RetainedCutoverStatus retained, String operationId) {
        if (!retained.owns(operationId)) {
            throw failure(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    private void requireOpen() {
        if (closed) {
            throw failure(SetupErrorCode.MIGRATION_UNAVAILABLE);
        }
    }

    private static void requireOperationId(String operationId) {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw failure(SetupErrorCode.INVALID_REQUEST);
        }
    }

    private static MigrationOperationStoreException failure(SetupErrorCode code) {
        return new MigrationOperationStoreException(code);
    }
}
