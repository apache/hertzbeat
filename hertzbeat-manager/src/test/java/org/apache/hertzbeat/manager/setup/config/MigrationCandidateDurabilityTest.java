/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.security.CommittedAtomicReplaceTestSupport;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class MigrationCandidateDurabilityTest {

    private static final String OPERATION = "migration-operation";
    private static final String CANDIDATE = "candidate-generation";
    private static final String IDENTITY = "a".repeat(64);

    @TempDir
    private Path installationRoot;

    @Test
    void cleanFirstStageConfirmsCandidateHierarchyBeforeReportingStaged() throws Exception {
        try (ManagedConfigurationBundle active = bundle("active")) {
            new ManagedConfigurationTransaction(installationRoot).apply(active);
        }
        String baseGeneration = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        RecordingCandidateFileIo fileIo = new RecordingCandidateFileIo(installationRoot);
        MigrationCandidateStore store = new MigrationCandidateStore(installationRoot, fileIo);
        ManagedMigrationConfigurationTransaction.CandidateRef reference =
                new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, CANDIDATE);

        try (ManagedConfigurationBundle candidate = bundle("candidate")) {
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.STAGED,
                    store.stage(reference, baseGeneration, IDENTITY, candidate));
        }

        assertEquals(1, fileIo.confirmations());
    }

    @Test
    void cleanFirstStageConfirmationFailureCannotReportStaged() throws Exception {
        try (ManagedConfigurationBundle active = bundle("active")) {
            new ManagedConfigurationTransaction(installationRoot).apply(active);
        }
        String baseGeneration = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        RecordingCandidateFileIo fileIo = new RecordingCandidateFileIo(installationRoot, 1);
        MigrationCandidateStore store = new MigrationCandidateStore(installationRoot, fileIo);
        ManagedMigrationConfigurationTransaction.CandidateRef reference =
                new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, CANDIDATE);

        try (ManagedConfigurationBundle candidate = bundle("candidate")) {
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    store.stage(reference, baseGeneration, IDENTITY, candidate));
            assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.READY,
                    store.inspect(reference).state());
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.ALREADY_STAGED,
                    store.stage(reference, baseGeneration, IDENTITY, candidate));
        }

        assertEquals(2, fileIo.confirmations());
    }

    @Test
    void secureConfirmationForcesEveryNewCandidateAncestorThroughTheConfigBoundary() throws Exception {
        Path root = SecureSetupFile.prepareTrustedRoot(installationRoot);
        Path candidateRoot = root.resolve("data/config/migration-candidates");
        Path operation = candidateRoot.resolve(OPERATION);
        Path generation = operation.resolve(CANDIDATE);
        Path manifest = generation.resolve("manifest");
        List<Path> confirmedTargets = new ArrayList<>();
        SecureMigrationCandidateFileIo fileIo = new SecureMigrationCandidateFileIo(
                root, (trustedRoot, target) -> {
                    assertEquals(root, trustedRoot);
                    confirmedTargets.add(target);
                });

        fileIo.confirmDurability(manifest);

        assertEquals(List.of(manifest, generation, operation, candidateRoot), confirmedTargets);
    }

    @Test
    void failureAtEveryCandidateAncestorNeverReportsStaged() throws Exception {
        for (int failureIndex = 0; failureIndex < 4; failureIndex++) {
            Path scenarioRoot = installationRoot.resolve("ancestor-failure-" + failureIndex);
            try (ManagedConfigurationBundle active = bundle("active-" + failureIndex)) {
                new ManagedConfigurationTransaction(scenarioRoot).apply(active);
            }
            String baseGeneration = new FileManagedApplicationConfigStore(scenarioRoot)
                    .readActive().generation().orElseThrow();
            Path root = SecureSetupFile.prepareTrustedRoot(scenarioRoot);
            AtomicInteger confirmations = new AtomicInteger();
            int failedAncestor = failureIndex;
            SecureMigrationCandidateFileIo fileIo = new SecureMigrationCandidateFileIo(
                    root, (trustedRoot, target) -> {
                        if (confirmations.getAndIncrement() == failedAncestor) {
                            throw new IOException("simulated ancestor confirmation failure");
                        }
                        SecureSetupFile.forceParentDirectoryIfSupported(trustedRoot, target);
                    });
            MigrationCandidateStore store = new MigrationCandidateStore(scenarioRoot, fileIo);
            String operationId = OPERATION + "-" + failureIndex;
            String candidateGeneration = CANDIDATE + "-" + failureIndex;
            ManagedMigrationConfigurationTransaction.CandidateRef reference =
                    new ManagedMigrationConfigurationTransaction.CandidateRef(
                            operationId, candidateGeneration);

            try (ManagedConfigurationBundle candidate = bundle("candidate-" + failureIndex)) {
                assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                        store.stage(reference, baseGeneration, IDENTITY, candidate));
            }

            assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.READY,
                    store.inspect(reference).state());
            assertEquals(failureIndex + 1, confirmations.get());
        }
    }

    @Test
    void exactReadyRetryConfirmsCandidateDirectoryBeforeReportingAlreadyStaged() throws Exception {
        try (ManagedConfigurationBundle active = bundle("active")) {
            assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                    new ManagedConfigurationTransaction(installationRoot).apply(active));
        }
        String baseGeneration = new FileManagedApplicationConfigStore(installationRoot)
                .readActive().generation().orElseThrow();
        Path candidateDirectory = installationRoot.resolve("data/config/migration-candidates")
                .resolve(OPERATION).resolve(CANDIDATE);
        FailingCandidateFileIo fileIo = new FailingCandidateFileIo(installationRoot);
        MigrationCandidateStore store = new MigrationCandidateStore(installationRoot, fileIo);
        ManagedMigrationConfigurationTransaction.CandidateRef reference =
                new ManagedMigrationConfigurationTransaction.CandidateRef(OPERATION, CANDIDATE);
        Map<Path, byte[]> managedBefore = nonMigrationConfigBytes();

        try (ManagedConfigurationBundle candidate = bundle("candidate")) {
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    store.stage(reference, baseGeneration, IDENTITY, candidate));
            assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.READY,
                    store.inspect(reference).state());
            Map<Path, byte[]> candidateBeforeRetry = fileBytes(candidateDirectory);
            Map<Path, FileTime> candidateTimes = fileTimes(candidateDirectory);

            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    store.stage(reference, baseGeneration, IDENTITY, candidate));
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED,
                    store.stage(reference, baseGeneration, IDENTITY, candidate));
            assertEquals(ManagedMigrationConfigurationTransaction.StageOutcome.ALREADY_STAGED,
                    store.stage(reference, baseGeneration, IDENTITY, candidate));

            assertBytesEqual(candidateBeforeRetry, fileBytes(candidateDirectory));
            assertEquals(candidateTimes, fileTimes(candidateDirectory));
        }

        assertEquals(1, fileIo.committedManifestFailures());
        assertEquals(3, fileIo.confirmations());
        assertBytesEqual(managedBefore, nonMigrationConfigBytes());
    }

    private Map<Path, byte[]> nonMigrationConfigBytes() throws IOException {
        Path config = installationRoot.resolve("data/config");
        Path candidates = config.resolve("migration-candidates");
        Map<Path, byte[]> bytes = new LinkedHashMap<>();
        try (Stream<Path> files = Files.walk(config)) {
            for (Path path : files.filter(candidate -> Files.isRegularFile(candidate, LinkOption.NOFOLLOW_LINKS))
                    .filter(candidate -> !candidate.startsWith(candidates)).sorted().toList()) {
                bytes.put(config.relativize(path), Files.readAllBytes(path));
            }
        }
        return bytes;
    }

    private static Map<Path, byte[]> fileBytes(Path directory) throws IOException {
        Map<Path, byte[]> bytes = new LinkedHashMap<>();
        try (Stream<Path> files = Files.list(directory)) {
            for (Path path : files.sorted().toList()) {
                bytes.put(path.getFileName(), Files.readAllBytes(path));
            }
        }
        return bytes;
    }

    private static Map<Path, FileTime> fileTimes(Path directory) throws IOException {
        Map<Path, FileTime> times = new LinkedHashMap<>();
        try (Stream<Path> files = Files.list(directory)) {
            for (Path path : files.sorted().toList()) {
                times.put(path.getFileName(), Files.getLastModifiedTime(path));
            }
        }
        return times;
    }

    private static void assertBytesEqual(Map<Path, byte[]> expected, Map<Path, byte[]> actual) {
        assertEquals(expected.keySet(), actual.keySet());
        expected.forEach((path, content) -> assertArrayEquals(content, actual.get(path), path.toString()));
    }

    private static ManagedConfigurationBundle bundle(String suffix) {
        ManagedOptionalConfiguration.MailSettings mail = new ManagedOptionalConfiguration.MailSettings(
                "smtp.example", 587, MailSecurity.STARTTLS, Optional.of("mailer"), "alerts@example.org");
        ManagedApplicationConfig application = new ManagedApplicationConfig(
                new MetadataDatabaseSettings(MetadataDatabaseKind.H2,
                        "jdbc:h2:file:./data/" + suffix, "hertzbeat"),
                new GreptimeSettings(new GreptimeEndpoints("greptime:4001", "http://greptime:4000"),
                        "public", Optional.of("telemetry-user")),
                new ManagedOptionalConfiguration(Optional.empty(), Optional.empty(), Optional.of(mail)));
        return new ManagedConfigurationBundle(application,
                new ManagedSecrets(SecretValue.of("database-" + suffix),
                        Optional.of(SecretValue.of("telemetry-" + suffix)),
                        Optional.of(SecretValue.of("mail-" + suffix))));
    }

    private static final class FailingCandidateFileIo implements MigrationCandidateFileIo {

        private final Path root;
        private final AtomicBoolean failManifest = new AtomicBoolean(true);
        private final AtomicInteger committedManifestFailures = new AtomicInteger();
        private final AtomicInteger confirmations = new AtomicInteger();

        private FailingCandidateFileIo(Path root) throws IOException {
            this.root = SecureSetupFile.prepareTrustedRoot(root);
        }

        @Override
        public void publish(Path target, byte[] content) throws IOException {
            Path temporary = target.resolveSibling("." + target.getFileName() + "-" + UUID.randomUUID() + ".tmp");
            try {
                SecureSetupFile.create(root, temporary, content);
                if (target.getFileName().toString().equals("manifest") && failManifest.compareAndSet(true, false)) {
                    committedManifestFailures.incrementAndGet();
                    CommittedAtomicReplaceTestSupport.replaceThenFailParentForce(
                            root, temporary, target);
                } else {
                    SecureSetupFile.atomicReplace(root, temporary, target);
                }
            } finally {
                if (Files.exists(temporary, LinkOption.NOFOLLOW_LINKS)) {
                    SecureSetupFile.deleteOwnerOnlyInsideRoot(root, temporary);
                }
            }
        }

        @Override
        public void confirmDurability(Path target) throws IOException {
            if (confirmations.incrementAndGet() <= 2) {
                throw new IOException("simulated candidate-directory confirmation failure");
            }
            SecureSetupFile.forceParentDirectoryIfSupported(root, target);
        }

        private int committedManifestFailures() {
            return committedManifestFailures.get();
        }

        private int confirmations() {
            return confirmations.get();
        }
    }

    private static final class RecordingCandidateFileIo implements MigrationCandidateFileIo {

        private final MigrationCandidateFileIo delegate;
        private final AtomicInteger confirmations = new AtomicInteger();
        private final AtomicInteger failuresRemaining;

        private RecordingCandidateFileIo(Path root) throws IOException {
            this(root, 0);
        }

        private RecordingCandidateFileIo(Path root, int failures) throws IOException {
            delegate = new SecureMigrationCandidateFileIo(SecureSetupFile.prepareTrustedRoot(root));
            failuresRemaining = new AtomicInteger(failures);
        }

        @Override
        public void publish(Path target, byte[] content) throws IOException {
            delegate.publish(target, content);
        }

        @Override
        public void confirmDurability(Path target) throws IOException {
            confirmations.incrementAndGet();
            if (failuresRemaining.getAndUpdate(remaining -> Math.max(0, remaining - 1)) > 0) {
                throw new IOException("simulated clean-stage confirmation failure");
            }
            delegate.confirmDurability(target);
        }

        private int confirmations() {
            return confirmations.get();
        }
    }
}
