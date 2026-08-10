/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFileLock;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ManagedMetadataTargetStageTest {

    private static final String OPERATION = "metadata-migration";
    private static final String CANDIDATE = "target-generation";
    private static final String IDENTITY =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @TempDir
    private Path installationRoot;

    @Test
    void stagesOnlyTheMetadataTargetAndPreservesEveryOtherManagedSetting() throws Exception {
        try (ManagedConfigurationBundle source = sourceBundle(MetadataDatabaseKind.H2)) {
            assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                    new ManagedConfigurationTransaction(installationRoot).apply(source));
        }
        Map<Path, byte[]> before = managedSnapshotBytes();
        ManagedMigrationConfigurationTransaction transaction =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        MetadataDatabaseSettings target = new MetadataDatabaseSettings(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "target-user");

        try (SecretValue borrowed = SecretValue.of("target-password")) {
            ManagedMigrationConfigurationTransaction.MetadataTargetStageResult result =
                    transaction.stageMetadataTarget(OPERATION, CANDIDATE, IDENTITY, target, borrowed);

            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.STAGED, result.outcome());
            assertEquals(new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, CANDIDATE),
                    result.candidate().orElseThrow());
            assertEquals("target-password", new String(borrowed.copy()));
            transaction.readExact(result.candidate().orElseThrow(), candidate -> {
                assertEquals(target, candidate.application().metadataDatabase());
                assertEquals(sourceApplication(MetadataDatabaseKind.H2).telemetryStore(),
                        candidate.application().telemetryStore());
                assertEquals(sourceApplication(MetadataDatabaseKind.H2).optional(),
                        candidate.application().optional());
                assertEquals("target-password",
                        new String(candidate.secrets().metadataDatabasePassword().copy()));
                assertEquals("telemetry-password",
                        new String(candidate.secrets().telemetryPassword().orElseThrow().copy()));
                assertEquals("mail-password",
                        new String(candidate.secrets().mailPassword().orElseThrow().copy()));
                return null;
            });

            Map<Path, byte[]> candidateBeforeRetry = candidateBytes(CANDIDATE);
            FileTime fixedTime = FileTime.fromMillis(1_000_000);
            for (Path path : candidateBeforeRetry.keySet()) {
                Files.setLastModifiedTime(path, fixedTime);
            }
            ManagedMigrationConfigurationTransaction.MetadataTargetStageResult repeated =
                    transaction.stageMetadataTarget(OPERATION, CANDIDATE, IDENTITY, target, borrowed);
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.ALREADY_STAGED,
                    repeated.outcome());
            assertEquals(result.candidate(), repeated.candidate());
            assertCandidateBytesUnchanged(candidateBeforeRetry);
            for (Path path : candidateBeforeRetry.keySet()) {
                assertEquals(fixedTime, Files.getLastModifiedTime(path));
            }
        }

        assertManagedSnapshotsUnchanged(before);
    }

    @Test
    void refusesUnsupportedSourceAndInvalidActivePairsWithoutCreatingCandidate() throws Exception {
        ManagedMigrationConfigurationTransaction transaction =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        MetadataDatabaseSettings target = new MetadataDatabaseSettings(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat", "target-user");
        try (ManagedConfigurationBundle source = sourceBundle(MetadataDatabaseKind.POSTGRESQL);
             SecretValue borrowed = SecretValue.of("target-password")) {
            new ManagedConfigurationTransaction(installationRoot).apply(source);
            ManagedMigrationConfigurationTransaction.MetadataTargetStageResult stale =
                    transaction.stageMetadataTarget(OPERATION, CANDIDATE, IDENTITY, target, borrowed);

            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.SOURCE_UNSUPPORTED,
                    stale.outcome());
            assertTrue(stale.candidate().isEmpty());
            assertEquals("target-password", new String(borrowed.copy()));
        }

        Files.delete(installationRoot.resolve("data/config/managed-secrets.properties"));
        try (SecretValue borrowed = SecretValue.of("target-password")) {
            ManagedMigrationConfigurationTransaction.MetadataTargetStageResult recovery =
                    transaction.stageMetadataTarget(OPERATION, "recovery-generation", IDENTITY, target, borrowed);

            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    recovery.outcome());
            assertTrue(recovery.candidate().isEmpty());
            assertEquals("target-password", new String(borrowed.copy()));
        }
    }

    @Test
    void rejectsH2TargetBeforeCreatingCandidateOrConsumingBorrowedPassword() {
        ManagedMigrationConfigurationTransaction transaction =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        MetadataDatabaseSettings target = new MetadataDatabaseSettings(
                MetadataDatabaseKind.H2, "jdbc:h2:file:./data/target", "target-user");
        try (SecretValue borrowed = SecretValue.of("target-password")) {
            assertThrows(IllegalArgumentException.class, () -> transaction.stageMetadataTarget(
                    OPERATION, CANDIDATE, IDENTITY, target, borrowed));
            assertEquals("target-password", new String(borrowed.copy()));
            assertFalse(Files.exists(candidateDirectory(CANDIDATE)));
        }
    }

    @Test
    void conflictingExactRetryNeverOverwritesTheFirstCandidate() throws Exception {
        try (ManagedConfigurationBundle source = sourceBundle(MetadataDatabaseKind.H2)) {
            new ManagedConfigurationTransaction(installationRoot).apply(source);
        }
        ManagedMigrationConfigurationTransaction transaction =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        MetadataDatabaseSettings first = new MetadataDatabaseSettings(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "target-user");
        MetadataDatabaseSettings different = new MetadataDatabaseSettings(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://other.example/hertzbeat", "other-user");
        try (SecretValue firstPassword = SecretValue.of("first-password");
             SecretValue otherPassword = SecretValue.of("other-password")) {
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.STAGED,
                    transaction.stageMetadataTarget(
                            OPERATION, CANDIDATE, IDENTITY, first, firstPassword).outcome());
            Map<Path, byte[]> original = candidateBytes(CANDIDATE);

            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    transaction.stageMetadataTarget(
                            OPERATION, CANDIDATE, "f".repeat(64), first, firstPassword).outcome());
            assertCandidateBytesUnchanged(original);
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    transaction.stageMetadataTarget(
                            OPERATION, CANDIDATE, IDENTITY, different, firstPassword).outcome());
            assertCandidateBytesUnchanged(original);
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    transaction.stageMetadataTarget(
                            OPERATION, CANDIDATE, IDENTITY, first, otherPassword).outcome());
            assertCandidateBytesUnchanged(original);
            assertEquals("first-password", new String(firstPassword.copy()));
            assertEquals("other-password", new String(otherPassword.copy()));
        }
    }

    @Test
    void partialExactCandidateAndLaterActiveGenerationAreNeverOverwritten() throws Exception {
        try (ManagedConfigurationBundle source = sourceBundle(MetadataDatabaseKind.H2)) {
            new ManagedConfigurationTransaction(installationRoot).apply(source);
        }
        ManagedMigrationConfigurationTransaction transaction =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        MetadataDatabaseSettings target = new MetadataDatabaseSettings(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "target-user");
        Path partialApplication = candidateDirectory("partial-generation").resolve("application");
        byte[] partial = "partial".getBytes(StandardCharsets.UTF_8);
        try {
            SecureSetupFile.create(installationRoot, partialApplication, partial);
        } finally {
            Arrays.fill(partial, (byte) 0);
        }
        byte[] partialBefore = Files.readAllBytes(partialApplication);

        try (SecretValue borrowed = SecretValue.of("target-password")) {
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    transaction.stageMetadataTarget(
                            OPERATION, "partial-generation", IDENTITY, target, borrowed).outcome());
            assertArrayEquals(partialBefore, Files.readAllBytes(partialApplication));
            assertFalse(Files.exists(partialApplication.resolveSibling("secrets")));
            assertFalse(Files.exists(partialApplication.resolveSibling("manifest")));
            Path partialSecrets = partialApplication.resolveSibling("secrets");
            byte[] secretBytes = "partial-secrets".getBytes(StandardCharsets.UTF_8);
            try {
                SecureSetupFile.create(installationRoot, partialSecrets, secretBytes);
            } finally {
                Arrays.fill(secretBytes, (byte) 0);
            }
            byte[] partialSecretsBefore = Files.readAllBytes(partialSecrets);
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    transaction.stageMetadataTarget(
                            OPERATION, "partial-generation", IDENTITY, target, borrowed).outcome());
            assertArrayEquals(partialBefore, Files.readAllBytes(partialApplication));
            assertArrayEquals(partialSecretsBefore, Files.readAllBytes(partialSecrets));
            assertFalse(Files.exists(partialApplication.resolveSibling("manifest")));

            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.STAGED,
                    transaction.stageMetadataTarget(
                            OPERATION, CANDIDATE, IDENTITY, target, borrowed).outcome());
            Map<Path, byte[]> original = candidateBytes(CANDIDATE);
            try (ManagedConfigurationBundle later = sourceBundle(MetadataDatabaseKind.POSTGRESQL)) {
                new ManagedConfigurationTransaction(installationRoot).apply(later);
            }
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.SOURCE_UNSUPPORTED,
                    transaction.stageMetadataTarget(
                            OPERATION, CANDIDATE, IDENTITY, target, borrowed).outcome());
            assertCandidateBytesUnchanged(original);
        }
    }

    @Test
    void aggregateInvalidActivePairRequiresRecoveryAndLeavesBorrowedPasswordAlone() throws Exception {
        try (ManagedConfigurationBundle source = sourceBundle(MetadataDatabaseKind.H2)) {
            new ManagedConfigurationTransaction(installationRoot).apply(source);
        }
        CandidateRead<ManagedSecrets> active = new FileManagedSecretStore(installationRoot).readActive();
        String generation;
        try {
            generation = active.generation().orElseThrow();
        } finally {
            ManagedConfigurationTransaction.close(active);
        }
        ManagedSecrets mismatched = new ManagedSecrets(SecretValue.of("source-password"), Optional.empty(),
                Optional.of(SecretValue.of("mail-password")));
        byte[] encoded = new SecretConfigDocumentCodec().encode(mismatched, generation);
        try {
            Files.write(installationRoot.resolve("data/config/managed-secrets.properties"), encoded);
        } finally {
            Arrays.fill(encoded, (byte) 0);
            mismatched.close();
        }
        MetadataDatabaseSettings target = new MetadataDatabaseSettings(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "target-user");

        try (SecretValue borrowed = SecretValue.of("target-password")) {
            ManagedMigrationConfigurationTransaction.MetadataTargetStageResult result =
                    new ManagedMigrationConfigurationTransaction(installationRoot).stageMetadataTarget(
                            OPERATION, CANDIDATE, IDENTITY, target, borrowed);

            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    result.outcome());
            assertTrue(result.candidate().isEmpty());
            assertEquals("target-password", new String(borrowed.copy()));
        }
    }

    @Test
    void resultDiagnosticsExposeNoConfigurationOrSecretMaterial() {
        ManagedMigrationConfigurationTransaction.MetadataTargetStageResult result =
                new ManagedMigrationConfigurationTransaction.MetadataTargetStageResult(
                        ManagedMigrationConfigurationTransaction.StageOutcome.STAGED,
                        Optional.of(new ManagedMigrationConfigurationTransaction.CandidateRef(
                                OPERATION, CANDIDATE)));

        String diagnostic = result.toString();
        assertFalse(diagnostic.contains("jdbc:"));
        assertFalse(diagnostic.contains("target-user"));
        assertFalse(diagnostic.contains("password"));
        assertFalse(diagnostic.contains("base"));
    }

    @Test
    void setupAndMultipleMigrationTransactionsShareTheVersionedLock() throws Exception {
        ManagedConfigurationTransaction setup = new ManagedConfigurationTransaction(installationRoot);
        try (ManagedConfigurationBundle source = sourceBundle(MetadataDatabaseKind.H2)) {
            setup.apply(source);
        }
        ManagedMigrationConfigurationTransaction first =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction second =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        MetadataDatabaseSettings target = new MetadataDatabaseSettings(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "target-user");
        SecureSetupFileLock held = new SecureSetupFileLock(
                installationRoot, "data/config/.managed-config-v2.lock");
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch callersStarted = new CountDownLatch(3);
        ExecutorService executor = Executors.newFixedThreadPool(4);
        try (SecretValue firstPassword = SecretValue.of("first-password");
             SecretValue secondPassword = SecretValue.of("second-password")) {
            Future<?> holder = executor.submit(() -> {
                held.execute(() -> {
                    locked.countDown();
                    try {
                        release.await();
                    } catch (InterruptedException failure) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Lock holder interrupted");
                    }
                });
                return null;
            });
            locked.await();
            Future<?> firstStage = executor.submit(() -> {
                callersStarted.countDown();
                return first.stageMetadataTarget(
                        OPERATION, CANDIDATE, IDENTITY, target, firstPassword);
            });
            Future<?> secondStage = executor.submit(() -> {
                callersStarted.countDown();
                return second.stageMetadataTarget(
                        "second-operation", "second-generation", "f".repeat(64), target, secondPassword);
            });
            Future<?> setupUpdate = executor.submit(() -> {
                callersStarted.countDown();
                try (ManagedConfigurationBundle update = sourceBundle(MetadataDatabaseKind.H2)) {
                    return setup.apply(update);
                }
            });
            callersStarted.await();

            assertFalse(firstStage.isDone());
            assertFalse(secondStage.isDone());
            assertFalse(setupUpdate.isDone());
            release.countDown();
            holder.get();
            firstStage.get();
            secondStage.get();
            setupUpdate.get();
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }

    private Map<Path, byte[]> managedSnapshotBytes() throws Exception {
        Path directory = installationRoot.resolve("data/config");
        Map<Path, byte[]> snapshots = new LinkedHashMap<>();
        for (String name : new String[] {
                "managed-application.yml", "managed-application.yml.candidate",
                "managed-application.yml.last-known-good", "managed-secrets.properties",
                "managed-secrets.properties.candidate", "managed-secrets.properties.last-known-good"}) {
            Path path = directory.resolve(name);
            if (Files.exists(path)) {
                snapshots.put(path, Files.readAllBytes(path));
            }
        }
        return snapshots;
    }

    private void assertManagedSnapshotsUnchanged(Map<Path, byte[]> before) throws Exception {
        assertEquals(before.keySet(), managedSnapshotBytes().keySet());
        for (Map.Entry<Path, byte[]> entry : before.entrySet()) {
            assertArrayEquals(entry.getValue(), Files.readAllBytes(entry.getKey()));
        }
    }

    private Map<Path, byte[]> candidateBytes(String generation) throws Exception {
        Map<Path, byte[]> snapshots = new LinkedHashMap<>();
        for (String name : new String[] {"application", "secrets", "manifest"}) {
            Path path = candidateDirectory(generation).resolve(name);
            snapshots.put(path, Files.readAllBytes(path));
        }
        return snapshots;
    }

    private void assertCandidateBytesUnchanged(Map<Path, byte[]> expected) throws Exception {
        for (Map.Entry<Path, byte[]> entry : expected.entrySet()) {
            assertArrayEquals(entry.getValue(), Files.readAllBytes(entry.getKey()));
        }
    }

    private Path candidateDirectory(String generation) {
        return installationRoot.resolve("data/config/migration-candidates")
                .resolve(OPERATION).resolve(generation);
    }

    private static ManagedConfigurationBundle sourceBundle(MetadataDatabaseKind kind) {
        return new ManagedConfigurationBundle(sourceApplication(kind),
                new ManagedSecrets(SecretValue.of("source-password"),
                        Optional.of(SecretValue.of("telemetry-password")),
                        Optional.of(SecretValue.of("mail-password"))));
    }

    private static ManagedApplicationConfig sourceApplication(MetadataDatabaseKind kind) {
        MetadataDatabaseSettings metadata = switch (kind) {
            case H2 -> new MetadataDatabaseSettings(kind, "jdbc:h2:file:./data/hertzbeat", "source-user");
            case MYSQL -> new MetadataDatabaseSettings(kind, "jdbc:mysql://source/hertzbeat", "source-user");
            case POSTGRESQL -> new MetadataDatabaseSettings(
                    kind, "jdbc:postgresql://source/hertzbeat", "source-user");
        };
        ManagedOptionalConfiguration.PublicAccessSettings publicAccess =
                new ManagedOptionalConfiguration.PublicAccessSettings(
                        Optional.of("https://monitor.example"),
                        Optional.of("https://monitor.example/api/otlp"),
                        Optional.of("https://monitor.example:4317"));
        ManagedOptionalConfiguration.MailSettings mail = new ManagedOptionalConfiguration.MailSettings(
                "smtp.example", 587, MailSecurity.STARTTLS, Optional.of("mailer"), "alerts@example.org");
        return new ManagedApplicationConfig(metadata,
                new GreptimeSettings(new GreptimeEndpoints("greptime:4001", "http://greptime:4000"),
                        "public", Optional.of("telemetry-user")),
                new ManagedOptionalConfiguration(Optional.of(publicAccess),
                        Optional.of(new ManagedOptionalConfiguration.RetentionSettings(30)), Optional.of(mail)));
    }
}
