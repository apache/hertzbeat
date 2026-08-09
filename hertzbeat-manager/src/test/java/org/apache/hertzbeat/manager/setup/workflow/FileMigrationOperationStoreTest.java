/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileMigrationOperationStoreTest {

    private static final String TARGET_IDENTITY_HASH =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String MANAGED_CANDIDATE_GENERATION = "migration-generation-1";
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @TempDir
    private Path root;

    @Test
    void createsAdvancesAndRecoversWithoutSecrets() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot pending = pending("migration-1", Instant.parse("2026-08-09T01:00:00Z"));
        assertThat(store.create(pending)).isEqualTo(pending);

        MigrationOperationSnapshot running = running(pending, 25);
        assertThat(store.compareAndTransition(pending.operationId(), MigrationOperationState.PENDING, running))
                .isEqualTo(running);
        assertThat(new FileMigrationOperationStore(root).find(pending.operationId())).contains(running);
        assertThat(SecureSetupFile.isOwnerOnlyRegularFile(root.resolve(FileMigrationOperationStore.RELATIVE_PATH)))
                .isTrue();

        String persisted = Files.readString(root.resolve(FileMigrationOperationStore.RELATIVE_PATH));
        assertThat(persisted).startsWith("schema=2\n")
                .contains("targetIdentityHash=" + TARGET_IDENTITY_HASH)
                .contains("managedCandidateGeneration=" + MANAGED_CANDIDATE_GENERATION);
        assertThat(persisted).doesNotContain("jdbc:", "username", "password", "SELECT", "secret-value");
        assertThat(running.toString())
                .doesNotContain(TARGET_IDENTITY_HASH, MANAGED_CANDIDATE_GENERATION,
                        "targetIdentityHash", "managedCandidateGeneration");
        assertThat(objectMapper.writeValueAsString(running))
                .doesNotContain(TARGET_IDENTITY_HASH, MANAGED_CANDIDATE_GENERATION,
                        "targetIdentityHash", "managedCandidateGeneration");
    }

    @Test
    void roundTripsManagedAndExternalVersionTwoManifests() {
        MigrationOperationSnapshot managed = succeeded(
                pending("managed", Instant.parse("2026-08-09T01:00:00Z")));
        MigrationOperationSnapshot external = externalPending(
                "external", Instant.parse("2026-08-09T02:00:00Z"));

        MigrationOperationFileCodec codec = new MigrationOperationFileCodec();
        byte[] encoded = codec.encode(List.of(managed, external));

        assertThat(new String(encoded, StandardCharsets.UTF_8)).startsWith("schema=2\n");
        assertThat(codec.decode(encoded)).containsExactly(managed, external);
    }

    @Test
    void rejectsInvalidIdentityAndCandidateCouplingBeforePersistence() {
        Instant createdAt = Instant.parse("2026-08-09T01:00:00Z");

        assertThatThrownBy(() -> pending("invalid-hash", createdAt,
                TARGET_IDENTITY_HASH.toUpperCase(), MANAGED_CANDIDATE_GENERATION))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pending("missing-candidate", createdAt, TARGET_IDENTITY_HASH, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pending("unsafe-candidate", createdAt,
                TARGET_IDENTITY_HASH, "candidate/../secret"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pending("reserved-candidate", createdAt, TARGET_IDENTITY_HASH, "-"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> externalPending(
                "external-with-candidate", createdAt, MANAGED_CANDIDATE_GENERATION))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsStaleAndNonMonotonicTransitions() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot pending = pending("migration-1", Instant.parse("2026-08-09T01:00:00Z"));
        store.create(pending);
        MigrationOperationSnapshot running = running(pending, 25);
        store.compareAndTransition(pending.operationId(), MigrationOperationState.PENDING, running);

        assertStoreError(SetupErrorCode.OPERATION_CONFLICT, () -> store.compareAndTransition(
                pending.operationId(), MigrationOperationState.PENDING, running(pending, 50)));
        assertStoreError(SetupErrorCode.OPERATION_CONFLICT, () -> store.compareAndTransition(
                pending.operationId(), MigrationOperationState.RUNNING, running(pending, 10)));
    }

    @Test
    void permitsOnlyOneActiveOperationAndTrimsTerminalHistory() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot active = pending("active", Instant.parse("2026-08-09T01:00:00Z"));
        store.create(active);
        assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                () -> store.create(pending("other", active.createdAt().plusSeconds(1))));
        complete(store, active);

        for (int index = 0; index < FileMigrationOperationStore.HISTORY_LIMIT + 3; index++) {
            MigrationOperationSnapshot item = pending("history-" + index, active.createdAt().plusSeconds(index + 2));
            store.create(item);
            complete(store, item);
        }
        assertThat(store.history()).hasSize(FileMigrationOperationStore.HISTORY_LIMIT);
        assertThat(store.find("active")).isEmpty();
    }

    @Test
    void failsClosedForCorruptionUnknownVersionAndUnsafeFiles() throws Exception {
        Path file = root.resolve(FileMigrationOperationStore.RELATIVE_PATH);
        Files.createDirectories(file.getParent());
        Files.writeString(file, "schema=99\n", StandardCharsets.UTF_8);
        ownerOnly(file);
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());

        MigrationOperationSnapshot pending = pending("old-schema", Instant.parse("2026-08-09T01:00:00Z"));
        String oldSchema = new String(
                new MigrationOperationFileCodec().encode(List.of(pending)), StandardCharsets.UTF_8)
                .replaceFirst("schema=2", "schema=1");
        Files.writeString(file, oldSchema, StandardCharsets.UTF_8);
        ownerOnly(file);
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());

        Files.delete(file);
        Path outside = Files.createTempFile("migration-operations", ".outside");
        Files.createSymbolicLink(file, outside);
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());
    }

    @Test
    void rejectsNonOwnerOnlyFileAndSymlinkedConfigurationDirectory() throws Exception {
        Path file = root.resolve(FileMigrationOperationStore.RELATIVE_PATH);
        Files.createDirectories(file.getParent());
        Files.writeString(file, "schema=2\ncount=0\n", StandardCharsets.UTF_8);
        if (Files.getFileStore(file).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-r--r--"));
            assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                    () -> new FileMigrationOperationStore(root).history());
        }

        Path symlinkRoot = root.resolve("symlink-root");
        Path symlinkConfig = symlinkRoot.resolve("data/config");
        Files.createDirectories(symlinkConfig.getParent());
        Path outsideDirectory = Files.createTempDirectory("migration-config-outside");
        Files.createSymbolicLink(symlinkConfig, outsideDirectory);
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(symlinkRoot).history());
    }

    @Test
    void rejectsPersistedCollectionWithDuplicateOperationIds() throws Exception {
        MigrationOperationSnapshot first = pending("duplicate", Instant.parse("2026-08-09T01:00:00Z"));
        writePersisted(List.of(succeeded(first), succeeded(first)));

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());
    }

    @Test
    void rejectsPersistedCollectionWithTwoActiveOperations() throws Exception {
        Instant created = Instant.parse("2026-08-09T01:00:00Z");
        writePersisted(List.of(pending("first", created), pending("second", created.plusSeconds(1))));

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());
    }

    @Test
    void rejectsPersistedCollectionBeyondTerminalHistoryLimit() throws Exception {
        Instant created = Instant.parse("2026-08-09T01:00:00Z");
        List<MigrationOperationSnapshot> terminal = new ArrayList<>();
        for (int index = 0; index < FileMigrationOperationStore.HISTORY_LIMIT + 1; index++) {
            terminal.add(succeeded(pending("terminal-" + index, created.plusSeconds(index))));
        }
        writePersisted(terminal);

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());
    }

    @Test
    void rollbackOriginRoundTripsAndCrossSourceCorruptionRequiresRecovery() throws Exception {
        MigrationOperationSnapshot rolledBack = rolledBack(
                pending("rolled-back", Instant.parse("2026-08-09T01:00:00Z")),
                MigrationRollbackOrigin.ACTIVATION_FAILURE);
        writePersisted(List.of(rolledBack));
        assertThat(new FileMigrationOperationStore(root).history()).containsExactly(rolledBack);

        Path file = root.resolve(FileMigrationOperationStore.RELATIVE_PATH);
        String corrupted = Files.readString(file).replace(
                "rollbackOrigin=ACTIVATION_FAILURE", "rollbackOrigin=RESTART_FAILURE");
        Files.writeString(file, corrupted, StandardCharsets.UTF_8);
        ownerOnly(file);

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());
    }

    @Test
    void previousFieldSetWithoutRollbackOriginRequiresRecovery() throws Exception {
        MigrationOperationSnapshot pending = pending("legacy-fields", Instant.parse("2026-08-09T01:00:00Z"));
        String previousFieldSet = new String(
                new MigrationOperationFileCodec().encode(List.of(pending)), StandardCharsets.UTF_8)
                .replace("0.rollbackOrigin=-\n", "");
        Path file = root.resolve(FileMigrationOperationStore.RELATIVE_PATH);
        SecureSetupFile.create(root, file, previousFieldSet.getBytes(StandardCharsets.UTF_8));

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());
    }

    @Test
    void missingOrTamperedVersionTwoIdentityFieldsRequireRecovery() throws Exception {
        MigrationOperationSnapshot pending = pending("tampered", Instant.parse("2026-08-09T01:00:00Z"));
        String encoded = new String(
                new MigrationOperationFileCodec().encode(List.of(pending)), StandardCharsets.UTF_8);
        Path file = root.resolve(FileMigrationOperationStore.RELATIVE_PATH);

        SecureSetupFile.create(root, file, encoded
                .replace("0.targetIdentityHash=" + TARGET_IDENTITY_HASH + "\n", "")
                .getBytes(StandardCharsets.UTF_8));
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());

        Files.writeString(file, encoded.replace(TARGET_IDENTITY_HASH, TARGET_IDENTITY_HASH.toUpperCase()),
                StandardCharsets.UTF_8);
        ownerOnly(file);
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());

        Files.writeString(file, encoded.replace(
                "0.managedCandidateGeneration=" + MANAGED_CANDIDATE_GENERATION,
                "0.managedCandidateGeneration=-"), StandardCharsets.UTF_8);
        ownerOnly(file);
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());

        Files.writeString(file, encoded.replace(
                "0.applyMode=MANAGED_WRITE", "0.applyMode=EXTERNAL_APPLY"), StandardCharsets.UTF_8);
        ownerOnly(file);
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> new FileMigrationOperationStore(root).history());
    }

    @Test
    void failedAtomicPublicationPreservesPreviousState() throws Exception {
        FileMigrationOperationStore initial = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot pending = pending("migration-1", Instant.parse("2026-08-09T01:00:00Z"));
        initial.create(pending);
        FileMigrationOperationStore failing = new FileMigrationOperationStore(root, (target, content) -> {
            throw new AtomicMoveNotSupportedException(
                    "provider path jdbc:secret", "password=secret-value", "SELECT private");
        });

        assertStoreError(SetupErrorCode.CONFIG_WRITE_FAILED, () -> failing.compareAndTransition(
                pending.operationId(), MigrationOperationState.PENDING, running(pending, 10)));
        assertThat(new FileMigrationOperationStore(root).find(pending.operationId())).contains(pending);
    }

    @Test
    void committedPublicationWithUncertainDirectoryDurabilityRequiresRecovery() throws Exception {
        FileMigrationOperationStore initial = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot pending = pending("migration-1", Instant.parse("2026-08-09T01:00:00Z"));
        initial.create(pending);
        MigrationOperationSnapshot running = running(pending, 10);
        MigrationOperationFilePublisher committed = new MigrationOperationFilePublisher(root);
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) -> {
            committed.publish(target, content);
            throw new CommittedSetupFileDurabilityException();
        });

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, () -> uncertain.compareAndTransition(
                pending.operationId(), MigrationOperationState.PENDING, running));
        assertThat(new FileMigrationOperationStore(root).find(pending.operationId())).contains(running);
    }

    @Test
    void twoInstancesSerializeCompareAndTransition() throws Exception {
        FileMigrationOperationStore first = new FileMigrationOperationStore(root);
        FileMigrationOperationStore second = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot pending = pending("migration-1", Instant.parse("2026-08-09T01:00:00Z"));
        first.create(pending);
        List<Callable<Boolean>> attempts = List.of(
                () -> transition(first, pending, 20), () -> transition(second, pending, 30));
        List<Future<Boolean>> results;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            results = new ArrayList<>(executor.invokeAll(attempts));
        }
        assertThat(results.get(0).get() ^ results.get(1).get()).isTrue();
        assertThat(new FileMigrationOperationStore(root).find(pending.operationId()).orElseThrow().progressPercent())
                .isIn(20, 30);
    }

    private boolean transition(FileMigrationOperationStore store, MigrationOperationSnapshot pending, int progress) {
        try {
            store.compareAndTransition(pending.operationId(), MigrationOperationState.PENDING,
                    running(pending, progress));
            return true;
        } catch (MigrationOperationStoreException conflict) {
            assertThat(conflict.errorCode()).isEqualTo(SetupErrorCode.OPERATION_CONFLICT);
            return false;
        }
    }

    private static MigrationOperationSnapshot pending(String id, Instant createdAt) {
        return pending(id, createdAt, TARGET_IDENTITY_HASH, MANAGED_CANDIDATE_GENERATION);
    }

    private static MigrationOperationSnapshot pending(
            String id, Instant createdAt, String targetIdentityHash, String managedCandidateGeneration) {
        return new MigrationOperationSnapshot(id, MigrationOperationState.PENDING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0, createdAt, null, null,
                VerificationState.PENDING, null, null, 1000, false, false, false,
                targetIdentityHash, managedCandidateGeneration);
    }

    private static MigrationOperationSnapshot externalPending(String id, Instant createdAt) {
        return externalPending(id, createdAt, null);
    }

    private static MigrationOperationSnapshot externalPending(
            String id, Instant createdAt, String managedCandidateGeneration) {
        return new MigrationOperationSnapshot(id, MigrationOperationState.PENDING, MigrationTarget.POSTGRESQL,
                ApplyMode.EXTERNAL_APPLY, MigrationStage.QUEUED, 0, createdAt, null, null,
                VerificationState.PENDING, null, null, 1000, false, false, false,
                TARGET_IDENTITY_HASH, managedCandidateGeneration);
    }

    private static MigrationOperationSnapshot running(MigrationOperationSnapshot pending, int progress) {
        return new MigrationOperationSnapshot(pending.operationId(), MigrationOperationState.RUNNING, pending.target(),
                pending.applyMode(), MigrationStage.COPYING, progress, pending.createdAt(),
                pending.createdAt().plusSeconds(1), null, VerificationState.PENDING, null, null, 1000,
                false, false, false, pending.targetIdentityHash(), pending.managedCandidateGeneration());
    }

    private static MigrationOperationSnapshot succeeded(MigrationOperationSnapshot pending) {
        Instant started = pending.createdAt().plusSeconds(1);
        return new MigrationOperationSnapshot(pending.operationId(), MigrationOperationState.SUCCEEDED, pending.target(),
                pending.applyMode(), MigrationStage.COMPLETED, 100, pending.createdAt(), started,
                started.plusSeconds(1), VerificationState.SUCCEEDED, null, null, 0, false, false, false,
                pending.targetIdentityHash(), pending.managedCandidateGeneration());
    }

    private static MigrationOperationSnapshot rolledBack(
            MigrationOperationSnapshot pending, MigrationRollbackOrigin origin) {
        Instant started = pending.createdAt().plusSeconds(1);
        return new MigrationOperationSnapshot(pending.operationId(), MigrationOperationState.ROLLED_BACK,
                pending.target(), pending.applyMode(), MigrationStage.ROLLED_BACK, 100,
                pending.createdAt(), started, started.plusSeconds(1), origin.verificationState(),
                origin.errorCode(), origin, 0, false, false, false,
                pending.targetIdentityHash(), pending.managedCandidateGeneration());
    }

    private static void complete(FileMigrationOperationStore store, MigrationOperationSnapshot pending) {
        MigrationOperationSnapshot running = running(pending, 25);
        store.compareAndTransition(pending.operationId(), MigrationOperationState.PENDING, running);
        MigrationOperationSnapshot verifying = new MigrationOperationSnapshot(
                pending.operationId(), MigrationOperationState.RUNNING, pending.target(), pending.applyMode(),
                MigrationStage.VERIFYING, 100, pending.createdAt(), pending.createdAt().plusSeconds(1), null,
                VerificationState.RUNNING, null, null, 1000, false, false, false,
                pending.targetIdentityHash(), pending.managedCandidateGeneration());
        store.compareAndTransition(pending.operationId(), MigrationOperationState.RUNNING, verifying);
        MigrationOperationSnapshot ready = new MigrationOperationSnapshot(
                pending.operationId(), MigrationOperationState.READY_TO_ACTIVATE, pending.target(), pending.applyMode(),
                MigrationStage.READY_TO_ACTIVATE, 100, pending.createdAt(), pending.createdAt().plusSeconds(1), null,
                VerificationState.SUCCEEDED, null, null, 0, true, false, false,
                pending.targetIdentityHash(), pending.managedCandidateGeneration());
        store.compareAndTransition(pending.operationId(), MigrationOperationState.RUNNING, ready);
        MigrationOperationSnapshot activating = new MigrationOperationSnapshot(
                pending.operationId(), MigrationOperationState.RUNNING, pending.target(), pending.applyMode(),
                MigrationStage.ACTIVATING, 100, pending.createdAt(), pending.createdAt().plusSeconds(1), null,
                VerificationState.SUCCEEDED, null, null, 1000, false, false, false,
                pending.targetIdentityHash(), pending.managedCandidateGeneration());
        store.compareAndTransition(pending.operationId(), MigrationOperationState.READY_TO_ACTIVATE, activating);
        store.compareAndTransition(pending.operationId(), MigrationOperationState.RUNNING, succeeded(pending));
    }

    private static void assertStoreError(SetupErrorCode expected, ThrowingAction action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(MigrationOperationStoreException.class,
                failure -> assertThat(failure.errorCode()).isEqualTo(expected))
                .hasMessageNotContaining("jdbc")
                .hasMessageNotContaining("password")
                .hasMessageNotContaining("SELECT")
                .hasMessageNotContaining("/");
    }

    private static void ownerOnly(Path file) throws IOException {
        if (Files.getFileStore(file).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
        }
    }

    private void writePersisted(List<MigrationOperationSnapshot> snapshots) throws IOException {
        byte[] encoded = new MigrationOperationFileCodec().encode(snapshots);
        SecureSetupFile.create(root, root.resolve(FileMigrationOperationStore.RELATIVE_PATH), encoded);
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run() throws Exception;
    }
}
