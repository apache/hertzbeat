/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Arrays;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ManagedMigrationActivationTest {

    private static final String OPERATION = "migration-operation";
    private static final String CANDIDATE = "candidate-generation";
    private static final String IDENTITY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @TempDir
    private Path installationRoot;

    @Test
    void activatesAndRollsBackTheExactCandidateWithoutRemovingMigrationMaterial() throws Exception {
        ManagedConfigurationTransaction setup = new ManagedConfigurationTransaction(installationRoot);
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED, setup.apply(bundle("base")));
        String baseGeneration = activeGeneration(installationRoot);
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction.CandidateRef reference =
                migration.stage(OPERATION, CANDIDATE, baseGeneration, IDENTITY, bundle("next"));

        assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED,
                migration.activate(reference));
        assertEquals(CANDIDATE, activeGeneration(installationRoot));
        assertEquals(baseGeneration, new FileManagedApplicationConfigStore(installationRoot)
                .readLastKnownGood().generation().orElseThrow());
        assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.READY,
                migration.inspect(reference).state());
        assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ALREADY_ACTIVE,
                migration.activate(reference));

        assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.ROLLED_BACK,
                migration.rollback(reference));
        assertEquals(baseGeneration, activeGeneration(installationRoot));
        assertEquals(ManagedMigrationConfigurationTransaction.CandidateState.READY,
                migration.inspect(reference).state());
        assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.ALREADY_ROLLED_BACK,
                migration.rollback(reference));
    }

    @Test
    void laterActiveGenerationMakesActivationAndRollbackStaleWithoutWriting() throws Exception {
        ManagedConfigurationTransaction setup = new ManagedConfigurationTransaction(installationRoot);
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED, setup.apply(bundle("base")));
        String baseGeneration = activeGeneration(installationRoot);
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction.CandidateRef reference =
                migration.stage(OPERATION, CANDIDATE, baseGeneration, IDENTITY, bundle("next"));
        assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED,
                migration.activate(reference));
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED, setup.apply(bundle("later")));
        String laterGeneration = activeGeneration(installationRoot);

        assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.STALE,
                migration.activate(reference));
        assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.STALE,
                migration.rollback(reference));
        assertEquals(laterGeneration, activeGeneration(installationRoot));
    }

    @Test
    void unrelatedSetupCandidateBlocksActivationAndIsNeverDeleted() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String baseGeneration = activeGeneration(installationRoot);
        ManagedMigrationConfigurationTransaction migration =
                new ManagedMigrationConfigurationTransaction(installationRoot);
        ManagedMigrationConfigurationTransaction.CandidateRef reference =
                migration.stage(OPERATION, CANDIDATE, baseGeneration, IDENTITY, bundle("next"));
        FileManagedApplicationConfigStore applications = new FileManagedApplicationConfigStore(installationRoot);
        applications.stageCandidate(configuration("foreign"), "foreign-generation");

        assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED,
                migration.activate(reference));
        assertEquals("foreign-generation", applications.readCandidate().generation().orElseThrow());
        assertEquals(baseGeneration, applications.readActive().generation().orElseThrow());
    }

    @ParameterizedTest
    @MethodSource("activationPublicationFailures")
    void reconcilesActivationWhenPublicationCommitsBeforeReportingFailure(
            String fileName, Operation operation) throws Exception {
        Path root = installationRoot.resolve(fileName.replace('.', '-'));
        new ManagedConfigurationTransaction(root).apply(bundle("base"));
        String baseGeneration = activeGeneration(root);
        CommitThenFailPublisher publisher = new CommitThenFailPublisher(fileName, operation);
        ManagedMigrationActivation activation = new ManagedMigrationActivation(
                new FileManagedApplicationConfigStore(root, publisher),
                new FileManagedSecretStore(root, publisher));

        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED,
                    activation.activate(material));
            ManagedMigrationActivation retry = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(root), new FileManagedSecretStore(root));
            assertTrue(retry.activate(material)
                    != ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED);
        }

        assertTrue(publisher.failed());
        assertEquals(CANDIDATE, activeGeneration(root));
        assertEquals(CANDIDATE, new FileManagedSecretStore(root).readActive().generation().orElseThrow());
        assertEquals(baseGeneration, new FileManagedApplicationConfigStore(root)
                .readLastKnownGood().generation().orElseThrow());
    }

    @ParameterizedTest
    @MethodSource("rollbackPublicationFailures")
    void reconcilesRollbackWhenActiveReplaceCommitsBeforeReportingFailure(String fileName) throws Exception {
        Path root = installationRoot.resolve(fileName.replace('.', '-'));
        new ManagedConfigurationTransaction(root).apply(bundle("base"));
        String baseGeneration = activeGeneration(root);
        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            ManagedMigrationActivation initial = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(root), new FileManagedSecretStore(root));
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED,
                    initial.activate(material));
            CommitThenFailPublisher publisher = new CommitThenFailPublisher(fileName, Operation.PUBLISH);
            ManagedMigrationActivation rollback = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(root, publisher),
                    new FileManagedSecretStore(root, publisher));

            assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED,
                    rollback.rollback(material));
            assertTrue(publisher.failed());
            ManagedMigrationActivation retry = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(root), new FileManagedSecretStore(root));
            assertTrue(retry.rollback(material)
                    != ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED);
        }

        assertEquals(baseGeneration, activeGeneration(root));
        assertEquals(baseGeneration, new FileManagedSecretStore(root).readActive().generation().orElseThrow());
    }

    @Test
    void preCommitFailureStopsActivationUntilAnExplicitRetry() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String baseGeneration = activeGeneration(installationRoot);
        CommitThenFailPublisher publisher = new CommitThenFailPublisher(
                "managed-application.yml.candidate", Operation.PUBLISH, false);
        ManagedMigrationActivation activation = new ManagedMigrationActivation(
                new FileManagedApplicationConfigStore(installationRoot, publisher),
                new FileManagedSecretStore(installationRoot, publisher));

        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED,
                    activation.activate(material));
            assertEquals(CandidateState.MISSING,
                    new FileManagedApplicationConfigStore(installationRoot).readCandidate().state());
            assertEquals(baseGeneration, activeGeneration(installationRoot));
            ManagedMigrationActivation retry = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(installationRoot),
                    new FileManagedSecretStore(installationRoot));
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED,
                    retry.activate(material));
        }
    }

    @Test
    void setupRecoveryRollsBackAnInterruptedExactStageToTheCompleteBasePair() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String baseGeneration = activeGeneration(installationRoot);
        CommitThenFailPublisher publisher = new CommitThenFailPublisher(
                "managed-application.yml.candidate", Operation.PUBLISH);
        ManagedMigrationActivation activation = new ManagedMigrationActivation(
                new FileManagedApplicationConfigStore(installationRoot, publisher),
                new FileManagedSecretStore(installationRoot, publisher));
        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED,
                    activation.activate(material));
        }

        assertEquals(ManagedConfigurationTransaction.Outcome.ROLLED_BACK,
                new ManagedConfigurationTransaction(installationRoot).recover());
        assertEquals(baseGeneration, activeGeneration(installationRoot));
        assertEquals(baseGeneration, new FileManagedSecretStore(installationRoot)
                .readActive().generation().orElseThrow());
    }

    @Test
    void setupRecoveryCompletesAnInterruptedExactPromotionAsOneTargetPair() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String baseGeneration = activeGeneration(installationRoot);
        CommitThenFailPublisher publisher = new CommitThenFailPublisher(
                "managed-application.yml", Operation.PUBLISH);
        ManagedMigrationActivation activation = new ManagedMigrationActivation(
                new FileManagedApplicationConfigStore(installationRoot, publisher),
                new FileManagedSecretStore(installationRoot, publisher));
        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED,
                    activation.activate(material));
        }

        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                new ManagedConfigurationTransaction(installationRoot).recover());
        assertEquals(CANDIDATE, activeGeneration(installationRoot));
        assertEquals(CANDIDATE, new FileManagedSecretStore(installationRoot)
                .readActive().generation().orElseThrow());
    }

    @Test
    void setupRecoveryCompletesAnInterruptedExactRollbackAsOneBasePair() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String baseGeneration = activeGeneration(installationRoot);
        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            ManagedMigrationActivation activation = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(installationRoot),
                    new FileManagedSecretStore(installationRoot));
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED,
                    activation.activate(material));
            CommitThenFailPublisher publisher = new CommitThenFailPublisher(
                    "managed-secrets.properties", Operation.PUBLISH);
            ManagedMigrationActivation rollback = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(installationRoot, publisher),
                    new FileManagedSecretStore(installationRoot, publisher));
            assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED,
                    rollback.rollback(material));
        }

        assertEquals(ManagedConfigurationTransaction.Outcome.ROLLED_BACK,
                new ManagedConfigurationTransaction(installationRoot).recover());
        assertEquals(baseGeneration, activeGeneration(installationRoot));
        assertEquals(baseGeneration, new FileManagedSecretStore(installationRoot)
                .readActive().generation().orElseThrow());
    }

    @Test
    void retryConfirmsDurabilityAfterFinalRollbackRenameReportedDirectoryForceFailure() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String baseGeneration = activeGeneration(installationRoot);
        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            ManagedMigrationActivation activation = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(installationRoot),
                    new FileManagedSecretStore(installationRoot));
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED,
                    activation.activate(material));
            FailRollbackAndFirstConfirmationOperations operations =
                    new FailRollbackAndFirstConfirmationOperations();
            NioManagedFilePublisher publisher = new NioManagedFilePublisher(operations);
            ManagedMigrationActivation rollback = new ManagedMigrationActivation(
                    new FileManagedApplicationConfigStore(installationRoot, publisher),
                    new FileManagedSecretStore(installationRoot, publisher));

            assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED,
                    rollback.rollback(material));
            assertEquals(baseGeneration, activeGeneration(installationRoot));
            assertEquals(baseGeneration, new FileManagedSecretStore(installationRoot)
                    .readActive().generation().orElseThrow());
            assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED,
                    rollback.rollback(material));
            assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.ALREADY_ROLLED_BACK,
                    rollback.rollback(material));
            assertEquals(5, operations.forces());
        }
    }

    @Test
    void corruptFixedCandidateBlocksActivationWithoutOverwriteOrDeletion() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String baseGeneration = activeGeneration(installationRoot);
        Path fixedCandidate = installationRoot.resolve("data/config/managed-application.yml.candidate");
        Files.writeString(fixedCandidate, "not-a-managed-document");
        byte[] original = Files.readAllBytes(fixedCandidate);
        ManagedMigrationActivation activation = new ManagedMigrationActivation(
                new FileManagedApplicationConfigStore(installationRoot),
                new FileManagedSecretStore(installationRoot));

        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED,
                    activation.activate(material));
        }

        assertArrayEquals(original, Files.readAllBytes(fixedCandidate));
        assertEquals(baseGeneration, activeGeneration(installationRoot));
    }

    @ParameterizedTest
    @MethodSource("invalidRollbackLastKnownGood")
    void rollbackRejectsIncompleteOrCorruptLastKnownGood(String fileName, boolean remove) throws Exception {
        Path root = installationRoot.resolve(fileName.replace('.', '-') + remove);
        new ManagedConfigurationTransaction(root).apply(bundle("base"));
        String baseGeneration = activeGeneration(root);
        ManagedMigrationActivation activation = new ManagedMigrationActivation(
                new FileManagedApplicationConfigStore(root), new FileManagedSecretStore(root));
        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED,
                    activation.activate(material));
            Path lkg = root.resolve("data/config/" + fileName);
            if (remove) {
                Files.delete(lkg);
            } else {
                Files.writeString(lkg, "corrupt");
            }
            assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED,
                    activation.rollback(material));
        }
        assertEquals(CANDIDATE, activeGeneration(root));
    }

    @Test
    void rollbackRejectsAnAggregateInvalidLastKnownGoodPair() throws Exception {
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("base"));
        String baseGeneration = activeGeneration(installationRoot);
        ManagedMigrationActivation activation = new ManagedMigrationActivation(
                new FileManagedApplicationConfigStore(installationRoot),
                new FileManagedSecretStore(installationRoot));
        try (MigrationCandidateMaterial material = material(baseGeneration)) {
            assertEquals(ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED,
                    activation.activate(material));
            try (ManagedSecrets incomplete = new ManagedSecrets(
                    SecretValue.of("database-base"), Optional.empty(), Optional.empty())) {
                byte[] encoded = new SecretConfigDocumentCodec().encode(incomplete, baseGeneration);
                try {
                    new NioManagedFilePublisher().publish(installationRoot.resolve(
                            "data/config/managed-secrets.properties.last-known-good"), encoded, true);
                } finally {
                    Arrays.fill(encoded, (byte) 0);
                }
            }

            assertEquals(ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED,
                    activation.rollback(material));
        }
        assertEquals(CANDIDATE, activeGeneration(installationRoot));
    }

    @ParameterizedTest
    @MethodSource("rejectedExactOutcomes")
    void exactStepNeverIgnoresStaleOrRecoveryOutcome(ExactSnapshotOutcome outcome) {
        assertThrows(IOException.class, () -> MigrationActivationStepExecutor.requireApplied(outcome));
    }

    private static Stream<Arguments> activationPublicationFailures() {
        return Stream.of(
                Arguments.of("managed-application.yml.candidate", Operation.PUBLISH),
                Arguments.of("managed-secrets.properties.candidate", Operation.PUBLISH),
                Arguments.of("managed-application.yml.last-known-good", Operation.PUBLISH),
                Arguments.of("managed-application.yml", Operation.PUBLISH),
                Arguments.of("managed-secrets.properties.last-known-good", Operation.PUBLISH),
                Arguments.of("managed-secrets.properties", Operation.PUBLISH),
                Arguments.of("managed-application.yml.candidate", Operation.REMOVE),
                Arguments.of("managed-secrets.properties.candidate", Operation.REMOVE));
    }

    private static Stream<String> rollbackPublicationFailures() {
        return Stream.of("managed-secrets.properties", "managed-application.yml");
    }

    private static Stream<Arguments> invalidRollbackLastKnownGood() {
        return Stream.of(
                Arguments.of("managed-application.yml.last-known-good", true),
                Arguments.of("managed-secrets.properties.last-known-good", true),
                Arguments.of("managed-application.yml.last-known-good", false),
                Arguments.of("managed-secrets.properties.last-known-good", false));
    }

    private static Stream<ExactSnapshotOutcome> rejectedExactOutcomes() {
        return Stream.of(ExactSnapshotOutcome.STALE, ExactSnapshotOutcome.RECOVERY_REQUIRED);
    }

    private static MigrationCandidateMaterial material(String baseGeneration) {
        MigrationCandidateManifest manifest = new MigrationCandidateManifest(
                OPERATION, CANDIDATE, baseGeneration, IDENTITY);
        ManagedConfigurationBundle bundle = bundle("next");
        return MigrationCandidateMaterial.ready(manifest, bundle.application(), bundle.secrets());
    }

    private static String activeGeneration(Path root) {
        return new FileManagedApplicationConfigStore(root).readActive().generation().orElseThrow();
    }

    private static ManagedConfigurationBundle bundle(String suffix) {
        return new ManagedConfigurationBundle(configuration(suffix),
                new ManagedSecrets(SecretValue.of("database-" + suffix),
                        Optional.of(SecretValue.of("telemetry-" + suffix)),
                        Optional.of(SecretValue.of("mail-" + suffix))));
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

    private enum Operation { PUBLISH, REMOVE }

    private static final class CommitThenFailPublisher implements ManagedFileIo.Publisher {
        private final ManagedFileIo.Publisher delegate = new NioManagedFilePublisher();
        private final String fileName;
        private final Operation operation;
        private final AtomicBoolean failed = new AtomicBoolean();

        private final boolean commitBeforeFailure;

        private CommitThenFailPublisher(String fileName, Operation operation) {
            this(fileName, operation, true);
        }

        private CommitThenFailPublisher(String fileName, Operation operation, boolean commitBeforeFailure) {
            this.fileName = fileName;
            this.operation = operation;
            this.commitBeforeFailure = commitBeforeFailure;
        }

        @Override
        public void publish(Path target, byte[] content, boolean ownerOnly) throws IOException {
            failBeforeCommit(target, Operation.PUBLISH);
            delegate.publish(target, content, ownerOnly);
            failOnce(target, Operation.PUBLISH);
        }

        @Override
        public void remove(Path target) throws IOException {
            failBeforeCommit(target, Operation.REMOVE);
            delegate.remove(target);
            failOnce(target, Operation.REMOVE);
        }

        @Override
        public void confirmDurability(Path target) throws IOException {
            delegate.confirmDurability(target);
        }

        private void failBeforeCommit(Path target, Operation actual) throws IOException {
            if (!commitBeforeFailure) {
                fail(target, actual);
            }
        }

        private void failOnce(Path target, Operation actual) throws IOException {
            if (commitBeforeFailure) {
                fail(target, actual);
            }
        }

        private void fail(Path target, Operation actual) throws IOException {
            if (operation == actual && target.getFileName().toString().equals(fileName)
                    && failed.compareAndSet(false, true)) {
                throw new IOException("simulated publication failure");
            }
        }

        private boolean failed() {
            return failed.get();
        }
    }

    private static final class FailRollbackAndFirstConfirmationOperations implements ManagedFileIo.Operations {
        private int forces;

        @Override
        public void atomicReplace(Path source, Path target) throws IOException {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        }

        @Override
        public void forceDirectory(Path directory) throws IOException {
            forces++;
            if (forces == 2 || forces == 3) {
                throw new IOException("simulated directory force failure");
            }
            if (Files.getFileStore(directory).supportsFileAttributeView("posix")) {
                try (FileChannel channel = FileChannel.open(directory, StandardOpenOption.READ)) {
                    channel.force(true);
                }
            }
        }

        private int forces() {
            return forces;
        }
    }
}
