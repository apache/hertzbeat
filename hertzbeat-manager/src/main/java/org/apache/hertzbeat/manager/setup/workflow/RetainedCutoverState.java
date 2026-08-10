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

    synchronized Execution reserve(String operationId) {
        if (active != null) {
            throw MigrationMaintenanceException.operationConflict();
        }
        active = new Execution(operationId);
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

    synchronized void releasePending(Execution execution, RetainedCutoverRelease release) {
        if (active == execution) {
            execution.release = release;
            execution.phase = Phase.RELEASE_PENDING;
        }
    }

    synchronized RetainedCutoverResult retain(
            Execution execution, MigrationMaintenanceLease maintenanceLease) {
        if (active != execution) {
            throw MigrationMaintenanceException.operationConflict();
        }
        execution.maintenanceLease = Objects.requireNonNull(maintenanceLease, "maintenanceLease");
        execution.release = null;
        execution.phase = Phase.RETAINED;
        return execution.result(RetainedCutoverResult.Status.RETAINED_SUCCESS);
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
        private String targetIdentityHash;
        private MigrationMaintenanceLease maintenanceLease;
        private RetainedCutoverRelease release;
        private Phase phase = Phase.EXECUTING;

        private Execution(String operationId) {
            this.operationId = operationId;
        }

        void targetIdentityHash(String targetIdentityHash) {
            this.targetIdentityHash = targetIdentityHash;
        }

        RetainedCutoverRelease release() {
            return release;
        }

        RetainedCutoverResult result(RetainedCutoverResult.Status status) {
            return new RetainedCutoverResult(operationId, targetIdentityHash, status);
        }
    }

    private enum Phase {
        EXECUTING,
        RETAINED,
        RELEASING,
        RELEASE_PENDING
    }
}
