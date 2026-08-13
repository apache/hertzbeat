/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;

/** Owns the single in-memory retained-cutover slot and its exact capability. */
final class RetainedCutoverState {

    private Execution active;

    synchronized RetainedCutoverStatus status() {
        if (active == null) {
            return RetainedCutoverStatus.empty();
        }
        return new RetainedCutoverStatus(active.operationId, switch (active.phase) {
                case EXECUTING -> RetainedCutoverStatus.Phase.EXECUTING;
                case HANDOFFING -> RetainedCutoverStatus.Phase.HANDOFFING;
                case HANDOFF_PENDING -> RetainedCutoverStatus.Phase.HANDOFF_PENDING;
                case RETAINED -> RetainedCutoverStatus.Phase.RETAINED;
                case ACTIVATING -> RetainedCutoverStatus.Phase.ACTIVATING;
                case ACTIVATION_PENDING -> RetainedCutoverStatus.Phase.ACTIVATION_PENDING;
                case AWAITING_RESTART_RETAINED ->
                        RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED;
                case RELEASING -> RetainedCutoverStatus.Phase.RELEASING;
                case RELEASE_PENDING -> RetainedCutoverStatus.Phase.RELEASE_PENDING;
            });
    }

    synchronized Execution reserve(String operationId, RetainedCopyJournalHandoff handoff) {
        if (active != null) {
            throw MigrationMaintenanceException.operationConflict();
        }
        active = new Execution(operationId, handoff);
        return active;
    }

    synchronized RetainedCutoverResult retained(String operationId) {
        Execution execution = require(operationId, Phase.RETAINED);
        return execution.result(RetainedCutoverResult.Status.ALREADY_RETAINED);
    }

    synchronized Execution claimRetainedRelease(String operationId) {
        Execution execution = require(operationId, Phase.RETAINED);
        execution.phase = Phase.RELEASING;
        execution.release = RetainedCutoverRelease.resources(
                null, execution.maintenanceLease, RetainedCutoverOutcome.success(), false);
        execution.maintenanceLease = null;
        return execution;
    }

    synchronized Execution claimPendingRelease(String operationId) {
        Execution execution = require(operationId, Phase.RELEASE_PENDING);
        execution.phase = Phase.RELEASING;
        return execution;
    }

    synchronized Execution claimPendingHandoff(String operationId) {
        Execution execution = require(operationId, Phase.HANDOFF_PENDING);
        execution.phase = Phase.HANDOFFING;
        return execution;
    }

    synchronized RetainedManagedActivationClaim claimManagedActivation(
            String operationId, RetainedManagedActivation activation) {
        Execution execution = requireActive(operationId);
        if (execution.phase == Phase.AWAITING_RESTART_RETAINED) {
            return RetainedManagedActivationClaim.replay(execution.activationResult(
                    RetainedManagedActivationResult.Status.ALREADY_AWAITING_RESTART));
        }
        requirePhase(execution, Phase.RETAINED);
        execution.activation = Objects.requireNonNull(activation, "activation");
        execution.phase = Phase.ACTIVATING;
        return RetainedManagedActivationClaim.execute(execution);
    }

    synchronized RetainedManagedActivationClaim claimPendingActivation(String operationId) {
        Execution execution = requireActive(operationId);
        if (execution.phase == Phase.AWAITING_RESTART_RETAINED) {
            return RetainedManagedActivationClaim.replay(execution.activationResult(
                    RetainedManagedActivationResult.Status.ALREADY_AWAITING_RESTART));
        }
        requirePhase(execution, Phase.ACTIVATION_PENDING);
        execution.phase = Phase.ACTIVATING;
        return RetainedManagedActivationClaim.execute(execution);
    }

    synchronized void releasePending(Execution execution, RetainedCutoverRelease release) {
        if (active == execution) {
            execution.release = release;
            execution.phase = Phase.RELEASE_PENDING;
        }
    }

    synchronized void beginHandoff(
            Execution execution, MigrationMaintenanceLease maintenanceLease) {
        if (active != execution
                || (execution.phase != Phase.EXECUTING && execution.phase != Phase.RELEASING)) {
            throw MigrationMaintenanceException.operationConflict();
        }
        execution.maintenanceLease = Objects.requireNonNull(maintenanceLease, "maintenanceLease");
        execution.release = null;
        execution.phase = Phase.HANDOFFING;
    }

    synchronized RetainedCutoverResult completeHandoff(
            Execution execution, RetainedCopyJournalDisposition disposition) {
        if (active != execution || execution.phase != Phase.HANDOFFING) {
            throw MigrationMaintenanceException.operationConflict();
        }
        execution.phase = Phase.RETAINED;
        RetainedCutoverResult.Status status = disposition == RetainedCopyJournalDisposition.TRANSITIONED
                ? RetainedCutoverResult.Status.RETAINED_SUCCESS
                : RetainedCutoverResult.Status.ALREADY_RETAINED;
        return execution.result(status);
    }

    synchronized void handoffPending(Execution execution) {
        if (active != execution || execution.phase != Phase.HANDOFFING) {
            throw MigrationMaintenanceException.operationConflict();
        }
        execution.phase = Phase.HANDOFF_PENDING;
    }

    synchronized RetainedManagedActivationResult completeActivation(
            Execution execution, RetainedManagedActivationDisposition disposition) {
        if (active != execution || execution.phase != Phase.ACTIVATING) {
            throw MigrationMaintenanceException.operationConflict();
        }
        RetainedManagedActivationResult.Status status =
                disposition == RetainedManagedActivationDisposition.ACTIVATED
                        ? RetainedManagedActivationResult.Status.ACTIVATED
                        : RetainedManagedActivationResult.Status.ALREADY_AWAITING_RESTART;
        RetainedManagedActivationResult result = execution.activationResult(status);
        execution.phase = Phase.AWAITING_RESTART_RETAINED;
        return result;
    }

    synchronized void activationPending(Execution execution) {
        if (active != execution || execution.phase != Phase.ACTIVATING) {
            throw MigrationMaintenanceException.operationConflict();
        }
        execution.phase = Phase.ACTIVATION_PENDING;
    }

    synchronized void clear(Execution execution) {
        if (active == execution) {
            active = null;
        }
    }

    synchronized RetainedCutoverRecoveryPhase recoveryPhase(String operationId) {
        if (active == null) {
            return RetainedCutoverRecoveryPhase.NONE;
        }
        if (!active.operationId.equals(operationId)) {
            throw MigrationMaintenanceException.operationConflict();
        }
        return switch (active.phase) {
            case RELEASE_PENDING -> RetainedCutoverRecoveryPhase.RELEASE_PENDING;
            case HANDOFF_PENDING -> RetainedCutoverRecoveryPhase.HANDOFF_PENDING;
            default -> RetainedCutoverRecoveryPhase.NONE;
        };
    }

    private Execution require(String operationId, Phase phase) {
        Execution execution = requireActive(operationId);
        requirePhase(execution, phase);
        return execution;
    }

    private Execution requireActive(String operationId) {
        if (active == null || !active.operationId.equals(operationId)) {
            throw MigrationMaintenanceException.operationConflict();
        }
        return active;
    }

    private void requirePhase(Execution execution, Phase phase) {
        if (execution.phase != phase) {
            throw MigrationMaintenanceException.operationConflict();
        }
    }

    static final class Execution {

        private final String operationId;
        private final RetainedCopyJournalHandoff handoff;
        private RetainedManagedActivation activation;
        private String targetIdentityHash;
        private MigrationMaintenanceLease maintenanceLease;
        private RetainedCutoverRelease release;
        private Phase phase = Phase.EXECUTING;

        private Execution(String operationId, RetainedCopyJournalHandoff handoff) {
            this.operationId = operationId;
            this.handoff = Objects.requireNonNull(handoff, "handoff");
        }

        void targetIdentityHash(String targetIdentityHash) {
            this.targetIdentityHash = targetIdentityHash;
        }

        RetainedCutoverRelease release() {
            return release;
        }

        RetainedCopyJournalContext handoffContext() {
            return new RetainedCopyJournalContext(operationId, targetIdentityHash);
        }

        RetainedCopyJournalHandoff handoff() {
            return handoff;
        }

        RetainedManagedActivationContext activationContext() {
            return new RetainedManagedActivationContext(operationId, targetIdentityHash);
        }

        RetainedManagedActivation activation() {
            return activation;
        }

        RetainedCutoverResult result(RetainedCutoverResult.Status status) {
            return new RetainedCutoverResult(operationId, targetIdentityHash, status);
        }

        RetainedManagedActivationResult activationResult(RetainedManagedActivationResult.Status status) {
            return new RetainedManagedActivationResult(operationId, targetIdentityHash, status);
        }
    }

    private enum Phase {
        EXECUTING,
        HANDOFFING,
        HANDOFF_PENDING,
        RETAINED,
        ACTIVATING,
        ACTIVATION_PENDING,
        AWAITING_RESTART_RETAINED,
        RELEASING,
        RELEASE_PENDING
    }
}
