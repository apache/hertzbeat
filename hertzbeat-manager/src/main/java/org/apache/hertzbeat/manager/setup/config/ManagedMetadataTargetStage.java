/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Builds one metadata-only migration candidate from the exact active managed pair. */
final class ManagedMetadataTargetStage {

    private final ManagedApplicationConfigStore applications;
    private final ManagedSecretStore secrets;
    private final CandidateStager stager;

    ManagedMetadataTargetStage(ManagedApplicationConfigStore applications, ManagedSecretStore secrets,
                               CandidateStager stager) {
        this.applications = applications;
        this.secrets = secrets;
        this.stager = stager;
    }

    ManagedMigrationConfigurationTransaction.MetadataTargetStageResult stage(
            ManagedMigrationConfigurationTransaction.CandidateRef reference, String targetIdentityHash,
            MetadataDatabaseSettings target, SecretValue password) throws IOException {
        CandidateRead<ManagedApplicationConfig> activeApplication = applications.readActive();
        CandidateRead<ManagedSecrets> activeSecrets = secrets.readActive();
        try {
            if (!ManagedConfigurationTransaction.validPair(activeApplication, activeSecrets)) {
                return result(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED, reference);
            }
            ManagedApplicationConfig source = activeApplication.value().orElseThrow();
            ManagedSecrets sourceSecrets = activeSecrets.value().orElseThrow();
            try {
                new ManagedConfigurationBundle(source, sourceSecrets);
            } catch (IllegalArgumentException failure) {
                return result(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED, reference);
            }
            if (source.metadataDatabase().kind() != MetadataDatabaseKind.H2) {
                return result(ManagedMigrationConfigurationTransaction.StageOutcome.SOURCE_UNSUPPORTED, reference);
            }
            String baseGeneration = activeApplication.generation().orElseThrow();
            try (ManagedConfigurationBundle candidate = ManagedMetadataTargetCandidate.copyReplacingMetadata(
                    source, sourceSecrets, target, password)) {
                return result(stager.stage(reference, baseGeneration, targetIdentityHash, candidate), reference);
            }
        } finally {
            ManagedConfigurationTransaction.close(activeSecrets);
        }
    }

    private static ManagedMigrationConfigurationTransaction.MetadataTargetStageResult result(
            ManagedMigrationConfigurationTransaction.StageOutcome outcome,
            ManagedMigrationConfigurationTransaction.CandidateRef reference) {
        Optional<ManagedMigrationConfigurationTransaction.CandidateRef> candidate =
                outcome == ManagedMigrationConfigurationTransaction.StageOutcome.STAGED
                        || outcome == ManagedMigrationConfigurationTransaction.StageOutcome.ALREADY_STAGED
                        ? Optional.of(reference) : Optional.empty();
        return new ManagedMigrationConfigurationTransaction.MetadataTargetStageResult(outcome, candidate);
    }

    @FunctionalInterface
    interface CandidateStager {
        ManagedMigrationConfigurationTransaction.StageOutcome stage(
                ManagedMigrationConfigurationTransaction.CandidateRef reference, String baseGeneration,
                String targetIdentityHash, ManagedConfigurationBundle candidate) throws IOException;
    }
}
