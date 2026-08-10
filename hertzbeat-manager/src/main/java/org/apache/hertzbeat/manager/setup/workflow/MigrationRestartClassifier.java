/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;

/**
 * Classifies durable migration state after a restart without performing recovery I/O.
 * Exact candidate evidence proves candidate identity, never the copy outcome.
 */
final class MigrationRestartClassifier {

    Plan classify(MigrationOperationSnapshot snapshot, CandidateEvidence evidence) {
        Objects.requireNonNull(snapshot, "snapshot");
        Objects.requireNonNull(evidence, "evidence");
        if (evidence == CandidateEvidence.INCONSISTENT
                || evidence == CandidateEvidence.RECOVERY_REQUIRED) {
            return Plan.RECOVERY_REQUIRED;
        }
        return snapshot.applyMode() == ApplyMode.MANAGED_WRITE
                ? managed(snapshot, evidence) : external(snapshot, evidence);
    }

    private Plan managed(MigrationOperationSnapshot snapshot, CandidateEvidence evidence) {
        if (evidence == CandidateEvidence.NOT_APPLICABLE) {
            return Plan.RECOVERY_REQUIRED;
        }
        if (snapshot.terminal()) {
            return evidence == CandidateEvidence.EXACT
                    ? Plan.CLEANUP_TERMINAL_CANDIDATE : Plan.NONE;
        }
        return switch (snapshot.state()) {
            case PENDING -> evidence == CandidateEvidence.EXACT
                    ? Plan.RESUME_PREPARATION : Plan.CREDENTIALS_REQUIRED_FOR_PREPARATION;
            case RUNNING -> managedRunning(snapshot.stage(), evidence);
            case READY_TO_ACTIVATE -> exact(evidence, Plan.HOLD_READY_UNDER_STARTUP_GATE);
            case AWAITING_RESTART -> exact(evidence, Plan.VERIFY_RESTART_CONVERGENCE);
            case AWAITING_EXTERNAL_APPLY -> Plan.RECOVERY_REQUIRED;
            case SUCCEEDED, FAILED, ROLLED_BACK -> Plan.RECOVERY_REQUIRED;
        };
    }

    private Plan managedRunning(MigrationStage stage, CandidateEvidence evidence) {
        if (evidence != CandidateEvidence.EXACT) {
            return Plan.RECOVERY_REQUIRED;
        }
        return switch (stage) {
            case COPYING, VERIFYING -> Plan.VERIFY_COPY_OUTCOME;
            case ACTIVATING -> Plan.RECOVER_ACTIVATION;
            case ROLLING_BACK -> Plan.RECOVER_ROLLBACK;
            default -> Plan.RECOVERY_REQUIRED;
        };
    }

    private Plan external(MigrationOperationSnapshot snapshot, CandidateEvidence evidence) {
        if (evidence != CandidateEvidence.NOT_APPLICABLE) {
            return Plan.RECOVERY_REQUIRED;
        }
        if (snapshot.terminal()) {
            return Plan.NONE;
        }
        return switch (snapshot.state()) {
            case PENDING -> Plan.CREDENTIALS_REQUIRED_FOR_PREPARATION;
            case RUNNING -> snapshot.stage() == MigrationStage.COPYING
                    || snapshot.stage() == MigrationStage.VERIFYING
                    ? Plan.CREDENTIALS_REQUIRED_FOR_COPY_VERIFICATION : Plan.RECOVERY_REQUIRED;
            case AWAITING_EXTERNAL_APPLY, AWAITING_RESTART -> Plan.VERIFY_RESTART_CONVERGENCE;
            case READY_TO_ACTIVATE -> Plan.RECOVERY_REQUIRED;
            case SUCCEEDED, FAILED, ROLLED_BACK -> Plan.RECOVERY_REQUIRED;
        };
    }

    private Plan exact(CandidateEvidence evidence, Plan plan) {
        return evidence == CandidateEvidence.EXACT ? plan : Plan.RECOVERY_REQUIRED;
    }

    enum CandidateEvidence {
        NOT_APPLICABLE,
        MISSING,
        EXACT,
        INCONSISTENT,
        RECOVERY_REQUIRED
    }

    enum Plan {
        NONE,
        CLEANUP_TERMINAL_CANDIDATE,
        RESUME_PREPARATION,
        CREDENTIALS_REQUIRED_FOR_PREPARATION,
        CREDENTIALS_REQUIRED_FOR_COPY_VERIFICATION,
        VERIFY_COPY_OUTCOME,
        HOLD_READY_UNDER_STARTUP_GATE,
        RECOVER_ACTIVATION,
        VERIFY_RESTART_CONVERGENCE,
        RECOVER_ROLLBACK,
        RECOVERY_REQUIRED
    }
}
