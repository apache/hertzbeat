/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.util.Optional;

/** Closeable decoded material kept internal to one synchronous candidate operation. */
record MigrationCandidateMaterial(
        ManagedMigrationConfigurationTransaction.Inspection inspection,
        Optional<MigrationCandidateManifest> manifest,
        Optional<ManagedApplicationConfig> application,
        Optional<ManagedSecrets> secrets) implements AutoCloseable {

    static MigrationCandidateMaterial missing() {
        return empty(ManagedMigrationConfigurationTransaction.CandidateState.MISSING);
    }

    static MigrationCandidateMaterial recoveryRequired() {
        return empty(ManagedMigrationConfigurationTransaction.CandidateState.RECOVERY_REQUIRED);
    }

    static MigrationCandidateMaterial ready(MigrationCandidateManifest manifest,
                                            ManagedApplicationConfig application, ManagedSecrets secrets) {
        return new MigrationCandidateMaterial(new ManagedMigrationConfigurationTransaction.Inspection(
                ManagedMigrationConfigurationTransaction.CandidateState.READY,
                Optional.of(manifest.baseGeneration()), Optional.of(manifest.targetIdentityHash())),
                Optional.of(manifest), Optional.of(application), Optional.of(secrets));
    }

    private static MigrationCandidateMaterial empty(
            ManagedMigrationConfigurationTransaction.CandidateState state) {
        return new MigrationCandidateMaterial(new ManagedMigrationConfigurationTransaction.Inspection(
                state, Optional.empty(), Optional.empty()), Optional.empty(), Optional.empty(), Optional.empty());
    }

    @Override
    public void close() {
        secrets.ifPresent(ManagedSecrets::close);
    }
}
