/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract;
import org.junit.jupiter.api.Test;

class MigrationActivationClassifierTest {

    private final MigrationActivationClassifier classifier = new MigrationActivationClassifier();

    @Test
    void splitLaterAndBaseActivePairRequiresRecovery() {
        try (MigrationActivationSnapshots snapshots = snapshots(
                CandidateRead.valid(configuration("later"), "later-generation"),
                CandidateRead.valid(secrets("base"), "base-generation"))) {
            assertRecovery(snapshots);
        }
    }

    @Test
    void twoDifferentLaterGenerationsRequireRecovery() {
        try (MigrationActivationSnapshots snapshots = snapshots(
                CandidateRead.valid(configuration("later"), "later-application"),
                CandidateRead.valid(secrets("later"), "later-secrets"))) {
            assertRecovery(snapshots);
        }
    }

    @Test
    void aggregateInvalidLaterPairRequiresRecovery() {
        ManagedSecrets incomplete = new ManagedSecrets(
                SecretValue.of("database-later"), Optional.empty(), Optional.empty());
        try (MigrationActivationSnapshots snapshots = snapshots(
                CandidateRead.valid(configuration("later"), "later-generation"),
                CandidateRead.valid(incomplete, "later-generation"))) {
            assertRecovery(snapshots);
        }
    }

    @Test
    void completeAggregateValidLaterPairIsStale() {
        try (MigrationActivationSnapshots snapshots = snapshots(
                CandidateRead.valid(configuration("later"), "later-generation"),
                CandidateRead.valid(secrets("later"), "later-generation"));
             ManagedSecrets targetSecrets = secrets("target")) {
            MigrationActivationCandidate candidate = new MigrationActivationCandidate(
                    "candidate-generation", "base-generation", configuration("target"), targetSecrets);
            assertEquals(MigrationActivationClassifier.Decision.STALE,
                    classifier.activation(candidate, snapshots));
            assertEquals(MigrationActivationClassifier.Decision.STALE,
                    classifier.rollback(candidate, snapshots));
        }
    }

    @Test
    void rollbackRequiresTheBaseSideToMatchItsLastKnownGoodSnapshot() {
        try (ManagedSecrets targetSecrets = secrets("target");
             MigrationActivationSnapshots snapshots = new MigrationActivationSnapshots(
                     CandidateRead.valid(configuration("target"), "candidate-generation"),
                     CandidateRead.missing(), CandidateRead.valid(configuration("base"), "base-generation"),
                     CandidateRead.valid(secrets("different"), "base-generation"),
                     CandidateRead.missing(), CandidateRead.valid(secrets("base"), "base-generation"))) {
            MigrationActivationCandidate candidate = new MigrationActivationCandidate(
                    "candidate-generation", "base-generation", configuration("target"), targetSecrets);
            assertEquals(MigrationActivationClassifier.Decision.RECOVERY_REQUIRED,
                    classifier.rollback(candidate, snapshots));
        }
    }

    private void assertRecovery(MigrationActivationSnapshots snapshots) {
        try (ManagedSecrets targetSecrets = secrets("target")) {
            MigrationActivationCandidate candidate = new MigrationActivationCandidate(
                    "candidate-generation", "base-generation", configuration("target"), targetSecrets);
            assertEquals(MigrationActivationClassifier.Decision.RECOVERY_REQUIRED,
                    classifier.activation(candidate, snapshots));
            assertEquals(MigrationActivationClassifier.Decision.RECOVERY_REQUIRED,
                    classifier.rollback(candidate, snapshots));
        }
    }

    private static MigrationActivationSnapshots snapshots(
            CandidateRead<ManagedApplicationConfig> activeApplication,
            CandidateRead<ManagedSecrets> activeSecrets) {
        return new MigrationActivationSnapshots(activeApplication, CandidateRead.missing(), CandidateRead.missing(),
                activeSecrets, CandidateRead.missing(), CandidateRead.missing());
    }

    private static ManagedSecrets secrets(String suffix) {
        return new ManagedSecrets(SecretValue.of("database-" + suffix),
                Optional.of(SecretValue.of("telemetry-" + suffix)),
                Optional.of(SecretValue.of("mail-" + suffix)));
    }

    private static ManagedApplicationConfig configuration(String suffix) {
        ManagedOptionalConfiguration.MailSettings mail = new ManagedOptionalConfiguration.MailSettings(
                "smtp.example", 587, SetupApiContract.MailSecurity.STARTTLS,
                Optional.of("mailer"), "alerts@example.org");
        return new ManagedApplicationConfig(
                new MetadataDatabaseSettings(SetupApiContract.MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db/" + suffix, "hertzbeat"),
                new GreptimeSettings(new GreptimeEndpoints("greptime:4001", "http://greptime:4000"),
                        "public", Optional.of("telemetry-user")),
                new ManagedOptionalConfiguration(Optional.empty(), Optional.empty(), Optional.of(mail)));
    }
}
