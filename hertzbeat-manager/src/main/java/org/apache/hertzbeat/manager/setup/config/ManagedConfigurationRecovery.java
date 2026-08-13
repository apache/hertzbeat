/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;

/** Resolves explicit interrupted-publication shapes without inferring generation order. */
final class ManagedConfigurationRecovery {
    private final ManagedApplicationConfigStore applicationStore;
    private final ManagedSecretStore secretStore;
    private final RecoveryFailureReporter reporter;

    ManagedConfigurationRecovery(ManagedApplicationConfigStore applicationStore,
                                 ManagedSecretStore secretStore, RecoveryFailureReporter reporter) {
        this.applicationStore = applicationStore;
        this.secretStore = secretStore;
        this.reporter = reporter;
    }

    ManagedConfigurationTransaction.Outcome recover() {
        Snapshots<ManagedApplicationConfig> applications = new Snapshots<>(
                applicationStore.readActive(), applicationStore.readCandidate(),
                applicationStore.readLastKnownGood());
        Snapshots<ManagedSecrets> secrets = new Snapshots<>(
                secretStore.readActive(), secretStore.readCandidate(), secretStore.readLastKnownGood());
        try {
            if (ManagedConfigurationTransaction.formsPair(applications.active(), secrets.active())) {
                boolean interrupted = applications.candidate().state() != CandidateState.MISSING
                        || secrets.candidate().state() != CandidateState.MISSING;
                return discardCandidates()
                        ? (interrupted ? ManagedConfigurationTransaction.Outcome.ROLLED_BACK
                        : ManagedConfigurationTransaction.Outcome.APPLIED)
                        : ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED;
            }
            return recoverExplicitPair(applications, secrets);
        } finally {
            ManagedConfigurationTransaction.close(secrets.active());
            ManagedConfigurationTransaction.close(secrets.candidate());
            ManagedConfigurationTransaction.close(secrets.lastKnownGood());
        }
    }

    ManagedConfigurationTransaction.Outcome rollback(
            CandidateRead<ManagedApplicationConfig> application,
            CandidateRead<ManagedSecrets> secrets) {
        if (!restoreApplication(application) || !restoreSecrets(secrets)) {
            return ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED;
        }
        return discardCandidates() ? ManagedConfigurationTransaction.Outcome.ROLLED_BACK
                : ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED;
    }

    boolean discardCandidates() {
        boolean discarded = true;
        try {
            applicationStore.discardCandidate();
        } catch (IOException failure) {
            RecoveryFailureReporter.reportSafely(reporter, RecoveryFailureReporter.Stage.DISCARD_CANDIDATE,
                    RecoveryFailureReporter.Store.APPLICATION, failure);
            discarded = false;
        }
        try {
            secretStore.discardCandidate();
        } catch (IOException failure) {
            RecoveryFailureReporter.reportSafely(reporter, RecoveryFailureReporter.Stage.DISCARD_CANDIDATE,
                    RecoveryFailureReporter.Store.SECRET, failure);
            discarded = false;
        }
        return discarded;
    }

    private ManagedConfigurationTransaction.Outcome recoverExplicitPair(
            Snapshots<ManagedApplicationConfig> applications, Snapshots<ManagedSecrets> secrets) {
        if (ManagedConfigurationTransaction.validPair(applications.active(), secrets.candidate())) {
            return finish(promoteSecrets(secrets.candidate()), ManagedConfigurationTransaction.Outcome.APPLIED);
        }
        if (ManagedConfigurationTransaction.validPair(applications.candidate(), secrets.active())) {
            return finish(promoteApplication(applications.candidate()), ManagedConfigurationTransaction.Outcome.APPLIED);
        }
        if (ManagedConfigurationTransaction.validPair(applications.lastKnownGood(), secrets.active())) {
            return finish(restoreApplication(applications.lastKnownGood()),
                    ManagedConfigurationTransaction.Outcome.ROLLED_BACK);
        }
        if (ManagedConfigurationTransaction.validPair(applications.active(), secrets.lastKnownGood())) {
            return finish(restoreSecrets(secrets.lastKnownGood()),
                    ManagedConfigurationTransaction.Outcome.ROLLED_BACK);
        }
        if (ManagedConfigurationTransaction.validPair(applications.lastKnownGood(), secrets.lastKnownGood())) {
            boolean restored = restoreApplication(applications.lastKnownGood())
                    && restoreSecrets(secrets.lastKnownGood());
            return finish(restored, ManagedConfigurationTransaction.Outcome.ROLLED_BACK);
        }
        return ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED;
    }

    private ManagedConfigurationTransaction.Outcome finish(
            boolean recovered, ManagedConfigurationTransaction.Outcome outcome) {
        return recovered && discardCandidates()
                ? outcome : ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED;
    }

    private boolean promoteApplication(CandidateRead<ManagedApplicationConfig> candidate) {
        try {
            applicationStore.promoteCandidate(candidate.value().orElseThrow(), candidate.generation().orElseThrow());
            return true;
        } catch (IOException failure) {
            RecoveryFailureReporter.reportSafely(reporter, RecoveryFailureReporter.Stage.PROMOTE_CANDIDATE,
                    RecoveryFailureReporter.Store.APPLICATION, failure);
            return false;
        }
    }

    private boolean promoteSecrets(CandidateRead<ManagedSecrets> candidate) {
        try {
            secretStore.promoteCandidate(candidate.value().orElseThrow(), candidate.generation().orElseThrow());
            return true;
        } catch (IOException failure) {
            RecoveryFailureReporter.reportSafely(reporter, RecoveryFailureReporter.Stage.PROMOTE_CANDIDATE,
                    RecoveryFailureReporter.Store.SECRET, failure);
            return false;
        }
    }

    private boolean restoreApplication(CandidateRead<ManagedApplicationConfig> candidate) {
        try {
            applicationStore.restoreActive(candidate);
            return true;
        } catch (IOException failure) {
            RecoveryFailureReporter.reportSafely(reporter, RecoveryFailureReporter.Stage.RESTORE_ACTIVE,
                    RecoveryFailureReporter.Store.APPLICATION, failure);
            return false;
        }
    }

    private boolean restoreSecrets(CandidateRead<ManagedSecrets> candidate) {
        try {
            secretStore.restoreActive(candidate);
            return true;
        } catch (IOException failure) {
            RecoveryFailureReporter.reportSafely(reporter, RecoveryFailureReporter.Stage.RESTORE_ACTIVE,
                    RecoveryFailureReporter.Store.SECRET, failure);
            return false;
        }
    }

    private record Snapshots<T>(CandidateRead<T> active, CandidateRead<T> candidate,
                                CandidateRead<T> lastKnownGood) {
    }
}
