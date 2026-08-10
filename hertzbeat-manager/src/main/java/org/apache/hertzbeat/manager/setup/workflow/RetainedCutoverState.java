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

    synchronized void clear(Execution execution) {
        if (active == execution) {
            active = null;
        }
    }

    private Execution require(String operationId, Phase phase) {
        if (active == null
                || active.phase != phase
                || !active.operationId.equals(operationId)) {
            throw MigrationMaintenanceException.operationConflict();
        }
        return active;
    }

    static final class Execution {

        private final String operationId;
        private final RetainedCopyJournalHandoff handoff;
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

        RetainedCutoverResult result(RetainedCutoverResult.Status status) {
            return new RetainedCutoverResult(operationId, targetIdentityHash, status);
        }
    }

    private enum Phase {
        EXECUTING,
        HANDOFFING,
        HANDOFF_PENDING,
        RETAINED,
        RELEASING,
        RELEASE_PENDING
    }
}
