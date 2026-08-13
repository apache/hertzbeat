/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ManagedMigrationExactAccessTest {

    private static final String OPERATION = "operation-a";
    private static final String GENERATION = "candidate-generation";
    private static final String IDENTITY = "a".repeat(64);

    @TempDir
    private Path root;

    @Test
    void identityBoundReadExposesOnlyTheExactCandidateAndKeepsSecretsOwned() throws Exception {
        ManagedMigrationConfigurationTransaction migration = stagedAndActivated();
        ManagedMigrationConfigurationTransaction.CandidateRef candidate = candidate();

        String url = migration.readExact(candidate, IDENTITY,
                bundle -> bundle.application().metadataDatabase().jdbcUrl());

        assertThat(url).isEqualTo("jdbc:postgresql://db.example/hertzbeat");
    }

    @Test
    void identityMismatchDoesNotInvokeReaderOrRollbackActiveGeneration() throws Exception {
        ManagedMigrationConfigurationTransaction migration = stagedAndActivated();
        ManagedMigrationConfigurationTransaction.CandidateRef candidate = candidate();
        AtomicBoolean invoked = new AtomicBoolean();

        assertThatThrownBy(() -> migration.readExact(candidate, "f".repeat(64), bundle -> {
            invoked.set(true);
            return bundle.application();
        })).isInstanceOf(java.io.IOException.class).hasNoCause();
        assertThat(invoked).isFalse();
        assertThat(migration.rollbackExact(candidate, "f".repeat(64)))
                .isEqualTo(ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED);
        assertThat(activeGeneration()).isEqualTo(GENERATION);
    }

    private ManagedMigrationConfigurationTransaction stagedAndActivated() throws Exception {
        ManagedConfigurationTransaction setup = new ManagedConfigurationTransaction(root);
        assertThat(setup.apply(bundle(MetadataDatabaseKind.H2, "jdbc:h2:file:./data/hertzbeat", "sa")))
                .isEqualTo(ManagedConfigurationTransaction.Outcome.APPLIED);
        String base = activeGeneration();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(root);
        migration.stage(OPERATION, GENERATION, base, IDENTITY,
                bundle(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat", "hertzbeat"));
        assertThat(migration.activateExact(candidate(), IDENTITY))
                .isEqualTo(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED);
        return migration;
    }

    private ManagedConfigurationBundle bundle(
            MetadataDatabaseKind kind, String url, String username) {
        ManagedApplicationConfig application = new ManagedApplicationConfig(
                new MetadataDatabaseSettings(kind, url, username),
                GreptimeSettings.anonymous(
                        new GreptimeEndpoints("greptime.example:4001", "http://greptime.example:4000"),
                        "public"));
        return new ManagedConfigurationBundle(application,
                ManagedSecrets.withoutTelemetryPassword(SecretValue.of("database-password")));
    }

    private ManagedMigrationConfigurationTransaction.CandidateRef candidate() {
        return new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, GENERATION);
    }

    private String activeGeneration() {
        return new FileManagedApplicationConfigStore(root)
                .readActive().generation().orElseThrow();
    }
}
