/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.util.Objects;

/** Executes one exact snapshot mutation selected from an authoritative read. */
final class MigrationActivationStepExecutor {

    private final FileManagedApplicationConfigStore applications;
    private final FileManagedSecretStore secrets;

    MigrationActivationStepExecutor(FileManagedApplicationConfigStore applications,
                                    FileManagedSecretStore secrets) {
        this.applications = Objects.requireNonNull(applications, "applications");
        this.secrets = Objects.requireNonNull(secrets, "secrets");
    }

    MigrationActivationSnapshots readSnapshots() {
        return new MigrationActivationSnapshots(applications.readActive(), applications.readCandidate(),
                applications.readLastKnownGood(), secrets.readActive(), secrets.readCandidate(),
                secrets.readLastKnownGood());
    }

    void confirmDurability() throws IOException {
        applications.confirmDurability();
        secrets.confirmDurability();
    }

    void activate(MigrationActivationClassifier.Decision decision,
                  MigrationActivationCandidate candidate) throws IOException {
        ExactSnapshotOutcome outcome = switch (decision) {
            case STAGE_APPLICATION -> applications.stageCandidateExact(
                    candidate.application(), candidate.generation());
            case STAGE_SECRET -> secrets.stageCandidateExact(candidate.secrets(), candidate.generation());
            case PROMOTE_APPLICATION -> applications.promoteCandidateExact(
                    candidate.application(), candidate.generation(), candidate.baseGeneration());
            case PROMOTE_SECRET -> secrets.promoteCandidateExact(
                    candidate.secrets(), candidate.generation(), candidate.baseGeneration());
            case DISCARD_APPLICATION -> applications.discardCandidateExact(
                    candidate.application(), candidate.generation());
            case DISCARD_SECRET -> secrets.discardCandidateExact(candidate.secrets(), candidate.generation());
            default -> throw new IllegalStateException("Not an activation step");
        };
        requireApplied(outcome);
    }

    void rollback(MigrationActivationClassifier.Decision decision,
                  MigrationActivationCandidate candidate) throws IOException {
        ExactSnapshotOutcome outcome = switch (decision) {
            case RESTORE_SECRET -> secrets.restoreActiveExact(
                    candidate.secrets(), candidate.generation(), candidate.baseGeneration());
            case RESTORE_APPLICATION -> applications.restoreActiveExact(
                    candidate.application(), candidate.generation(), candidate.baseGeneration());
            case DISCARD_APPLICATION -> applications.discardCandidateExact(
                    candidate.application(), candidate.generation());
            case DISCARD_SECRET -> secrets.discardCandidateExact(candidate.secrets(), candidate.generation());
            default -> throw new IllegalStateException("Not a rollback step");
        };
        requireApplied(outcome);
    }

    static void requireApplied(ExactSnapshotOutcome outcome) throws IOException {
        if (outcome != ExactSnapshotOutcome.APPLIED && outcome != ExactSnapshotOutcome.ALREADY_APPLIED) {
            throw new IOException("Exact managed snapshot mutation was not applied");
        }
    }
}
