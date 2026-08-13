/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class ManagedMetadataTargetStageOwnershipTest {

    private static final ManagedMigrationConfigurationTransaction.CandidateRef REFERENCE =
            new ManagedMigrationConfigurationTransaction.CandidateRef("metadata-migration", "target-generation");
    private static final String IDENTITY =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @AfterEach
    void clearInterrupt() {
        Thread.interrupted();
    }

    @ParameterizedTest
    @MethodSource("storeOutcomes")
    void clearsEveryOwnedSecretForEveryStoreOutcome(
            ManagedMigrationConfigurationTransaction.StageOutcome storeOutcome) throws Exception {
        Fixture fixture = fixture(MetadataDatabaseKind.H2);
        MetadataDatabaseSettings target = target();
        AtomicReference<ManagedConfigurationBundle> candidate = new AtomicReference<>();
        ManagedMetadataTargetStage stage = new ManagedMetadataTargetStage(
                fixture.applications(), fixture.secretStore(), (reference, base, identity, bundle) -> {
                    candidate.set(bundle);
                    assertNotSame(target, bundle.application().metadataDatabase());
                    assertNotSame(fixture.application().telemetryStore(), bundle.application().telemetryStore());
                    assertNotSame(fixture.application().optional(), bundle.application().optional());
                    assertNotSame(fixture.application().optional().publicAccess().orElseThrow(),
                            bundle.application().optional().publicAccess().orElseThrow());
                    assertNotSame(fixture.application().optional().retention().orElseThrow(),
                            bundle.application().optional().retention().orElseThrow());
                    assertNotSame(fixture.application().optional().mail().orElseThrow(),
                            bundle.application().optional().mail().orElseThrow());
                    assertEquals("telemetry-password",
                            new String(bundle.secrets().telemetryPassword().orElseThrow().copy()));
                    assertEquals("mail-password",
                            new String(bundle.secrets().mailPassword().orElseThrow().copy()));
                    return storeOutcome;
                });

        try (SecretValue borrowed = SecretValue.of("target-password")) {
            ManagedMigrationConfigurationTransaction.MetadataTargetStageResult result =
                    stage.stage(REFERENCE, IDENTITY, target, borrowed);

            assertEquals(storeOutcome, result.outcome());
            assertEquals("target-password", new String(borrowed.copy()));
        }
        assertCleared(fixture.sourceSecrets().metadataDatabasePassword());
        assertCleared(fixture.sourceSecrets().telemetryPassword().orElseThrow());
        assertCleared(fixture.sourceSecrets().mailPassword().orElseThrow());
        assertCleared(candidate.get().secrets().metadataDatabasePassword());
        assertCleared(candidate.get().secrets().telemetryPassword().orElseThrow());
        assertCleared(candidate.get().secrets().mailPassword().orElseThrow());
    }

    @Test
    void clearsOwnedSecretsWhenPersistenceThrowsUncheckedFailure() {
        Fixture fixture = fixture(MetadataDatabaseKind.H2);
        AtomicReference<ManagedConfigurationBundle> candidate = new AtomicReference<>();
        ManagedMetadataTargetStage stage = new ManagedMetadataTargetStage(
                fixture.applications(), fixture.secretStore(), (reference, base, identity, bundle) -> {
                    candidate.set(bundle);
                    throw new IllegalStateException("stop");
                });

        try (SecretValue borrowed = SecretValue.of("target-password")) {
            assertThrows(IllegalStateException.class,
                    () -> stage.stage(REFERENCE, IDENTITY, target(), borrowed));
            assertEquals("target-password", new String(borrowed.copy()));
        }
        assertCleared(fixture.sourceSecrets().metadataDatabasePassword());
        assertCleared(candidate.get().secrets().metadataDatabasePassword());
    }

    @Test
    void clearsOwnedSecretsWhenPersistenceThrowsFatalFailure() {
        Fixture fixture = fixture(MetadataDatabaseKind.H2);
        AtomicReference<ManagedConfigurationBundle> candidate = new AtomicReference<>();
        ManagedMetadataTargetStage stage = new ManagedMetadataTargetStage(
                fixture.applications(), fixture.secretStore(), (reference, base, identity, bundle) -> {
                    candidate.set(bundle);
                    throw new AssertionError("stop");
                });

        try (SecretValue borrowed = SecretValue.of("target-password")) {
            assertThrows(AssertionError.class,
                    () -> stage.stage(REFERENCE, IDENTITY, target(), borrowed));
            assertEquals("target-password", new String(borrowed.copy()));
        }
        assertCleared(fixture.sourceSecrets().metadataDatabasePassword());
        assertCleared(candidate.get().secrets().metadataDatabasePassword());
    }

    @Test
    void clearsOwnedSecretsAndPreservesInterruptWhenPersistenceFails() {
        Fixture fixture = fixture(MetadataDatabaseKind.H2);
        AtomicReference<ManagedConfigurationBundle> candidate = new AtomicReference<>();
        ManagedMetadataTargetStage stage = new ManagedMetadataTargetStage(
                fixture.applications(), fixture.secretStore(), (reference, base, identity, bundle) -> {
                    candidate.set(bundle);
                    Thread.currentThread().interrupt();
                    throw new IOException("write failed");
                });

        try (SecretValue borrowed = SecretValue.of("target-password")) {
            assertThrows(IOException.class, () -> stage.stage(REFERENCE, IDENTITY, target(), borrowed));
            assertEquals("target-password", new String(borrowed.copy()));
            assertTrue(Thread.currentThread().isInterrupted());
        }
        assertCleared(fixture.sourceSecrets().metadataDatabasePassword());
        assertCleared(candidate.get().secrets().metadataDatabasePassword());
    }

    private static Stream<ManagedMigrationConfigurationTransaction.StageOutcome> storeOutcomes() {
        return Stream.of(
                ManagedMigrationConfigurationTransaction.StageOutcome.STAGED,
                ManagedMigrationConfigurationTransaction.StageOutcome.ALREADY_STAGED,
                ManagedMigrationConfigurationTransaction.StageOutcome.STALE,
                ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED);
    }

    private static Fixture fixture(MetadataDatabaseKind kind) {
        ManagedApplicationConfigStore applications = mock(ManagedApplicationConfigStore.class);
        ManagedSecretStore secrets = mock(ManagedSecretStore.class);
        ManagedApplicationConfig application = application(kind);
        ManagedSecrets sourceSecrets = new ManagedSecrets(SecretValue.of("source-password"),
                Optional.of(SecretValue.of("telemetry-password")),
                Optional.of(SecretValue.of("mail-password")));
        when(applications.readActive()).thenReturn(CandidateRead.valid(application, "base-generation"));
        when(secrets.readActive()).thenReturn(CandidateRead.valid(sourceSecrets, "base-generation"));
        return new Fixture(applications, secrets, application, sourceSecrets);
    }

    private static ManagedApplicationConfig application(MetadataDatabaseKind kind) {
        ManagedOptionalConfiguration.PublicAccessSettings publicAccess =
                new ManagedOptionalConfiguration.PublicAccessSettings(
                        Optional.of("https://monitor.example"), Optional.of("https://monitor.example/api/otlp"),
                        Optional.of("https://monitor.example:4317"));
        ManagedOptionalConfiguration.MailSettings mail = new ManagedOptionalConfiguration.MailSettings(
                "smtp.example", 587, MailSecurity.STARTTLS, Optional.of("mailer"), "alerts@example.org");
        return new ManagedApplicationConfig(
                new MetadataDatabaseSettings(kind, "jdbc:h2:file:./data/hertzbeat", "source-user"),
                new GreptimeSettings(new GreptimeEndpoints("greptime:4001", "http://greptime:4000"),
                        "public", Optional.of("telemetry-user")),
                new ManagedOptionalConfiguration(Optional.of(publicAccess),
                        Optional.of(new ManagedOptionalConfiguration.RetentionSettings(30)), Optional.of(mail)));
    }

    private static MetadataDatabaseSettings target() {
        return new MetadataDatabaseSettings(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "target-user");
    }

    private static void assertCleared(SecretValue secret) {
        assertTrue(new String(secret.copy()).chars().allMatch(value -> value == 0));
    }

    private record Fixture(ManagedApplicationConfigStore applications, ManagedSecretStore secretStore,
                           ManagedApplicationConfig application, ManagedSecrets sourceSecrets) {
    }
}
