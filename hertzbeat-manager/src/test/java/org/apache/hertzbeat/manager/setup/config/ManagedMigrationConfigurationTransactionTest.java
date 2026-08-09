/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Arrays;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFileLock;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ManagedMigrationConfigurationTransactionTest {

    private static final String OPERATION = "migration-operation";
    private static final String BASE = "base-generation";
    private static final String CANDIDATE = "candidate-generation";
    private static final String IDENTITY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @TempDir
    private Path installationRoot;

    @TempDir
    private Path outsideRoot;

    @Test
    void stagesCompleteOwnerOnlyCandidateWithoutChangingManagedSnapshots() throws Exception {
        ManagedConfigurationTransaction setup = new ManagedConfigurationTransaction(installationRoot);
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED, setup.apply(bundle("base")));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);

        ManagedMigrationConfigurationTransaction.CandidateRef ref =
                migration.stage(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next"));

        assertEquals(new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, CANDIDATE), ref);
        assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.READY,
                migration.inspect(ref).state());
        assertEquals(actualBase, migration.inspect(ref).baseGeneration().orElseThrow());
        assertEquals(IDENTITY, migration.inspect(ref).targetIdentityHash().orElseThrow());
        assertEquals(configuration("base"), new FileManagedApplicationConfigStore(installationRoot)
                .readActive().value().orElseThrow());
        assertEquals(CandidateState.MISSING, new FileManagedApplicationConfigStore(installationRoot)
                .readCandidate().state());
        Path directory = installationRoot.resolve("data/config/migration-candidates")
                .resolve(OPERATION).resolve(CANDIDATE);
        try (Stream<Path> files = Files.list(directory)) {
            assertEquals(Set.of("application", "manifest", "secrets"),
                    files.map(path -> path.getFileName().toString()).collect(java.util.stream.Collectors.toSet()));
        }
        if (Files.getFileStore(directory.resolve("manifest")).supportsFileAttributeView("posix")) {
            for (String file : Set.of("application", "manifest", "secrets")) {
                assertEquals(Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE),
                        Files.getPosixFilePermissions(directory.resolve(file)));
            }
        }
        String applicationDocument = Files.readString(directory.resolve("application"));
        String manifestDocument = Files.readString(directory.resolve("manifest"));
        assertTrue(!applicationDocument.contains("database-next"));
        assertTrue(!applicationDocument.contains("mail-next"));
        assertTrue(!manifestDocument.contains("jdbc:postgresql"));
        assertTrue(!manifestDocument.contains("telemetry-user"));
        assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.ALREADY_STAGED,
                migration.stageOutcome(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next")));
    }

    @Test
    void rejectsStageWhenTheActivePairDoesNotMatchTheDeclaredBase() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);

        assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.STALE,
                migration.stageOutcome(OPERATION, CANDIDATE, BASE, IDENTITY, bundle("next")));
        assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.MISSING,
                migration.inspect(new ManagedMigrationConfigurationTransaction.CandidateRef(
                        OPERATION, CANDIDATE)).state());
    }

    @Test
    void readsOnlyTheExactCandidateAndClosesDecodedSecretsAfterCallback() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction.CandidateRef ref =
                migration.stage(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next"));
        AtomicReference<ManagedSecrets> observed = new AtomicReference<>();

        assertEquals("jdbc:postgresql://db/next", migration.readExact(ref, bundle -> {
            observed.set(bundle.secrets());
            assertEquals("smtp.example", bundle.application().optional().mail().orElseThrow().host());
            assertEquals("mail-next", new String(bundle.secrets().mailPassword().orElseThrow().copy()));
            return bundle.application().metadataDatabase().jdbcUrl();
        }));

        assertTrue(new String(observed.get().metadataDatabasePassword().copy()).chars().allMatch(value -> value == 0));
        assertThrows(IOException.class, () -> migration.readExact(
                new ManagedMigrationConfigurationTransaction.CandidateRef("wrong-operation", CANDIDATE),
                candidate -> "unreachable"));
    }

    @Test
    void closesDecodedSecretsWhenTheSynchronousReaderFails() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction.CandidateRef ref =
                migration.stage(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next"));
        AtomicReference<ManagedSecrets> observed = new AtomicReference<>();

        assertThrows(IllegalStateException.class, () -> migration.readExact(ref, bundle -> {
            observed.set(bundle.secrets());
            Thread.currentThread().interrupt();
            throw new IllegalStateException("stop");
        }));

        assertTrue(new String(observed.get().metadataDatabasePassword().copy()).chars().allMatch(value -> value == 0));
        assertTrue(Thread.interrupted());
    }

    @Test
    void exactDiscardCannotRemoveAnotherGenerationAndSetupRecoveryLeavesMigrationCandidateAlone()
            throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction.CandidateRef ref =
                migration.stage(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next"));

        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                new ManagedConfigurationTransaction(installationRoot).recover());
        assertEquals(ManagedMigrationConfigurationTransaction.DiscardOutcome.NOT_FOUND,
                migration.discardExact(new ManagedMigrationConfigurationTransaction.CandidateRef(
                        OPERATION, "later-generation")));
        assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.READY,
                migration.inspect(ref).state());
        assertEquals(ManagedMigrationConfigurationTransaction.DiscardOutcome.DISCARDED,
                migration.discardExact(ref));
        assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.MISSING,
                migration.inspect(ref).state());
    }

    @Test
    void partialOrTamperedCandidateFailsClosedAndCanOnlyBeDiscardedByExactReference() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction.CandidateRef ref =
                migration.stage(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next"));
        Path manifest = installationRoot.resolve("data/config/migration-candidates")
                .resolve(OPERATION).resolve(CANDIDATE).resolve("manifest");
        Files.writeString(manifest, "tampered");

        assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.RECOVERY_REQUIRED,
                migration.inspect(ref).state());
        assertThrows(IOException.class, () -> migration.readExact(ref, bundle -> "unreachable"));
        assertEquals(ManagedMigrationConfigurationTransaction.DiscardOutcome.DISCARDED,
                migration.discardExact(ref));
    }

    @Test
    void crossDocumentCredentialMismatchFailsClosed() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction.CandidateRef ref =
                migration.stage(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next"));
        Path secretsFile = candidateDirectory(CANDIDATE).resolve("secrets");
        ManagedSecrets incomplete = ManagedSecrets.withoutTelemetryPassword(SecretValue.of("database-next"));
        byte[] encoded = new SecretConfigDocumentCodec().encode(incomplete, CANDIDATE);
        try {
            Files.write(secretsFile, encoded);
        } finally {
            Arrays.fill(encoded, (byte) 0);
            incomplete.close();
        }

        assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.RECOVERY_REQUIRED,
                migration.inspect(ref).state());
        assertThrows(IOException.class, () -> migration.readExact(ref, candidate -> "unreachable"));
    }

    @Test
    void missingSplitOrCorruptActivePairRequiresRecoveryInsteadOfReportingStale() throws Exception {
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                migration.stageOutcome(OPERATION, CANDIDATE, BASE, IDENTITY, bundle("next")));

        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        Path activeSecrets = installationRoot.resolve("data/config/managed-secrets.properties");
        Files.delete(activeSecrets);
        assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                migration.stageOutcome(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next")));

        Files.writeString(activeSecrets, "corrupt");
        assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                migration.stageOutcome(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next")));
    }

    @Test
    void crossDocumentCredentialMismatchInTheActivePairRequiresRecovery() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedSecrets incomplete = ManagedSecrets.withoutTelemetryPassword(SecretValue.of("database-base"));
        byte[] encoded = new SecretConfigDocumentCodec().encode(incomplete, actualBase);
        try {
            Files.write(installationRoot.resolve("data/config/managed-secrets.properties"), encoded);
        } finally {
            Arrays.fill(encoded, (byte) 0);
            incomplete.close();
        }

        assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                new ManagedMigrationConfigurationTransaction(installationRoot).stageOutcome(
                        OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next")));
    }

    @Test
    void finalCandidateFileSymlinksRequireRecoveryAndCannotBeDiscardedAsMissing() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        for (String fileName : Set.of("application", "secrets", "manifest")) {
            String generation = "symlink-" + fileName;
            ManagedMigrationConfigurationTransaction.CandidateRef ref =
                    new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, generation);
            Path candidateFile = candidateDirectory(generation).resolve(fileName);
            Path outsideFile = outsideRoot.resolve(generation + "-" + fileName);
            Files.createDirectories(candidateFile.getParent());
            Files.writeString(outsideFile, "outside");
            try {
                Files.createSymbolicLink(candidateFile, outsideFile);
            } catch (UnsupportedOperationException failure) {
                return;
            }

            assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.RECOVERY_REQUIRED,
                    migration.inspect(ref).state());
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    migration.stageOutcome(OPERATION, generation, actualBase, IDENTITY, bundle("next")));
            assertThrows(IOException.class, () -> migration.discardExact(ref));
            Files.delete(candidateFile);
        }
    }

    @Test
    void everyPreManifestStageWindowIsInspectableAndExactlyDiscardable() throws Exception {
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        for (int publishedFiles = 1; publishedFiles <= 2; publishedFiles++) {
            String generation = "partial-" + publishedFiles;
            ManagedMigrationConfigurationTransaction.CandidateRef ref =
                    new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, generation);
            Path directory = installationRoot.resolve("data/config/migration-candidates")
                    .resolve(OPERATION).resolve(generation);
            byte[] application = new ApplicationConfigDocumentCodec().encode(
                    configuration("partial"), generation);
            ManagedSecrets sourceSecrets = new ManagedSecrets(SecretValue.of("database-partial"),
                    java.util.Optional.of(SecretValue.of("telemetry-partial")),
                    java.util.Optional.of(SecretValue.of("mail-partial")));
            byte[] secrets = new SecretConfigDocumentCodec().encode(sourceSecrets, generation);
            try {
                SecureSetupFile.create(installationRoot, directory.resolve("application"), application);
                if (publishedFiles == 2) {
                    SecureSetupFile.create(installationRoot, directory.resolve("secrets"), secrets);
                }
            } finally {
                Arrays.fill(application, (byte) 0);
                Arrays.fill(secrets, (byte) 0);
                sourceSecrets.close();
            }

            assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.RECOVERY_REQUIRED,
                    migration.inspect(ref).state());
            assertEquals(ManagedMigrationConfigurationTransaction.DiscardOutcome.DISCARDED,
                    migration.discardExact(ref));
            assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.MISSING,
                    migration.inspect(ref).state());
        }
    }

    @Test
    void candidateReferencesAndOutcomesDoNotExposeIdentityOrPaths() {
        ManagedMigrationConfigurationTransaction.CandidateRef ref =
                new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, CANDIDATE);

        assertEquals("CandidateRef[operationId=migration-operation, candidateGeneration=candidate-generation]",
                ref.toString());
        assertTrue(Stream.of(ManagedMigrationConfigurationTransaction.StageOutcome.values())
                .map(Enum::name).noneMatch(value -> value.contains("/")));
        assertEquals("Inspection[state=READY, exactMetadata=true]",
                new ManagedMigrationConfigurationTransaction.Inspection(
                        ManagedMigrationConfigurationTransaction.CandidateState.READY,
                        java.util.Optional.of(BASE), java.util.Optional.of(IDENTITY)).toString());
    }

    @Test
    void rejectsTraversalAndSentinelIdentifiersBeforeTouchingTheFilesystem() {
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedMigrationConfigurationTransaction.CandidateRef("../escape", CANDIDATE));
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, "-"));
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, "../escape"));
        assertEquals("a.b_c-d", new ManagedMigrationConfigurationTransaction.CandidateRef(
                "a.b_c-d", CANDIDATE).operationId());
        assertEquals(128, new ManagedMigrationConfigurationTransaction.CandidateRef(
                "a" + "b".repeat(127), CANDIDATE).operationId().length());
    }

    @Test
    void symlinkedCandidateDirectoryFailsClosedWithoutWritingOutsideTheRoot() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        Path outside = Files.createDirectories(outsideRoot.resolve("outside-candidates"));
        Path candidateRoot = Files.createDirectories(
                installationRoot.resolve("data/config/migration-candidates"));
        try {
            Files.createSymbolicLink(candidateRoot.resolve(OPERATION), outside);
        } catch (UnsupportedOperationException failure) {
            return;
        }
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);

        assertThrows(IOException.class, () -> migration.stage(
                OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next")));
        try (Stream<Path> files = Files.list(outside)) {
            assertEquals(0, files.count());
        }
    }

    @Test
    void decodedMaterialAlwaysClearsItsOwnedSecrets() {
        ManagedSecrets decoded = new ManagedSecrets(SecretValue.of("database-owned"),
                java.util.Optional.of(SecretValue.of("telemetry-owned")),
                java.util.Optional.of(SecretValue.of("mail-owned")));
        MigrationCandidateManifest manifest = new MigrationCandidateManifest(
                OPERATION, CANDIDATE, BASE, IDENTITY);

        try (MigrationCandidateMaterial ignored = MigrationCandidateMaterial.ready(
                manifest, configuration("owned"), decoded)) {
            assertEquals("database-owned", new String(decoded.metadataDatabasePassword().copy()));
        }

        assertTrue(new String(decoded.metadataDatabasePassword().copy()).chars().allMatch(value -> value == 0));
        assertTrue(new String(decoded.telemetryPassword().orElseThrow().copy()).chars().allMatch(value -> value == 0));
        assertTrue(new String(decoded.mailPassword().orElseThrow().copy()).chars().allMatch(value -> value == 0));
    }

    @Test
    void setupAndMigrationShareTheSameSecureLockInode() throws Exception {
        ManagedConfigurationTransaction setup = new ManagedConfigurationTransaction(installationRoot);
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED, setup.apply(bundle("base")));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        SecureSetupFileLock held = new SecureSetupFileLock(
                installationRoot, "data/config/.managed-config-v2.lock");
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch callersStarted = new CountDownLatch(2);
        ExecutorService executor = Executors.newFixedThreadPool(3);
        try {
            Future<?> holder = executor.submit(() -> {
                held.execute(() -> {
                    locked.countDown();
                    try {
                        release.await();
                    } catch (InterruptedException failure) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Lock holder interrupted", failure);
                    }
                });
                return null;
            });
            locked.await();
            Future<?> setupWriter = executor.submit(() -> {
                callersStarted.countDown();
                return setup.apply(bundle("setup-next"));
            });
            Future<?> migrationWriter = executor.submit(() -> {
                callersStarted.countDown();
                return migration.stageOutcome(
                        OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("migration-next"));
            });
            callersStarted.await();

            assertTrue(!setupWriter.isDone());
            assertTrue(!migrationWriter.isDone());
            release.countDown();
            holder.get();
            setupWriter.get();
            migrationWriter.get();
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void legacyUnidentifiedLockFileDoesNotBlockTheVersionedSharedLock() throws Exception {
        Path configDirectory = Files.createDirectories(installationRoot.resolve("data/config"));
        Path legacyLock = configDirectory.resolve(".managed-config.lock");
        Files.write(legacyLock, new byte[0]);
        if (Files.getFileStore(legacyLock).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(legacyLock, Set.of(
                    PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE,
                    PosixFilePermission.GROUP_READ, PosixFilePermission.OTHERS_READ));
        }

        ManagedConfigurationTransaction setup = new ManagedConfigurationTransaction(installationRoot);
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED, setup.apply(bundle("base")));
        String actualBase = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.STAGED,
                migration.stageOutcome(OPERATION, CANDIDATE, actualBase, IDENTITY, bundle("next")));

        assertEquals(0, Files.size(legacyLock));
        assertTrue(SecureSetupFile.isOwnerOnlyRegularFile(
                configDirectory.resolve(".managed-config-v2.lock")));
    }

    private Path candidateDirectory(String generation) {
        return installationRoot.resolve("data/config/migration-candidates")
                .resolve(OPERATION).resolve(generation);
    }

    private static ManagedConfigurationBundle bundle(String suffix) {
        return new ManagedConfigurationBundle(configuration(suffix),
                new ManagedSecrets(SecretValue.of("database-" + suffix),
                        java.util.Optional.of(SecretValue.of("telemetry-" + suffix)),
                        java.util.Optional.of(SecretValue.of("mail-" + suffix))));
    }

    private static ManagedApplicationConfig configuration(String suffix) {
        return new ManagedApplicationConfig(
                new MetadataDatabaseSettings(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db/" + suffix, "hertzbeat"),
                new GreptimeSettings(new GreptimeEndpoints("greptime:4001", "http://greptime:4000"),
                        "public", java.util.Optional.of("telemetry-user")),
                optionalConfiguration());
    }

    private static ManagedOptionalConfiguration optionalConfiguration() {
        ManagedOptionalConfiguration.MailSettings mail = new ManagedOptionalConfiguration.MailSettings(
                "smtp.example", 587, org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity.STARTTLS,
                java.util.Optional.of("mailer"), "alerts@example.org");
        return new ManagedOptionalConfiguration(java.util.Optional.empty(), java.util.Optional.empty(),
                java.util.Optional.of(mail));
    }
}
