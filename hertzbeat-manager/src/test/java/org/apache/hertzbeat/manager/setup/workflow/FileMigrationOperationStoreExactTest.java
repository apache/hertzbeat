/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileMigrationOperationStoreExactTest {

    private static final String IDENTITY = "a".repeat(64);
    private static final String GENERATION = "candidate-generation";
    private static final Instant CREATED = Instant.parse("2026-08-10T01:00:00Z");

    @TempDir
    private Path root;

    @Test
    void exactCreateAndTransitionRetriesAreIdempotent() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        MigrationOperationSnapshot running = running(pending);

        assertThat(store.createOrConfirm(pending)).isEqualTo(pending);
        assertThat(store.createOrConfirm(pending)).isEqualTo(pending);
        assertThat(store.compareAndTransitionOrConfirm(
                pending.operationId(), MigrationOperationState.PENDING, running)).isEqualTo(running);
        assertThat(store.compareAndTransitionOrConfirm(
                pending.operationId(), MigrationOperationState.PENDING, running)).isEqualTo(running);
    }

    @Test
    void rejectsDifferingIdentityAndGeneration() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        store.createOrConfirm(pending);

        assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                () -> store.createOrConfirm(pending("operation-a", "b".repeat(64), GENERATION)));
        assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                () -> store.createOrConfirm(pending("operation-a", IDENTITY, "other-generation")));
    }

    @Test
    void differentActiveOperationAndAdvancedNonExactStateRemainConflicts() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        store.createOrConfirm(pending);

        assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                () -> store.createOrConfirm(pending("operation-b", IDENTITY, GENERATION)));

        MigrationOperationSnapshot running = running(pending);
        store.compareAndTransitionOrConfirm(pending.operationId(), MigrationOperationState.PENDING, running);
        MigrationOperationSnapshot later = new MigrationOperationSnapshot(
                running.operationId(), running.state(), running.target(), running.applyMode(), running.stage(),
                20, running.createdAt(), running.startedAt(), running.completedAt(), running.verificationState(),
                running.errorCode(), running.rollbackOrigin(), running.nextPollAfterMillis(),
                running.activationAvailable(), running.restartRequired(), running.externalApplyRequired(),
                running.targetIdentityHash(), running.managedCandidateGeneration());
        assertStoreError(SetupErrorCode.OPERATION_CONFLICT, () -> store.compareAndTransitionOrConfirm(
                pending.operationId(), MigrationOperationState.PENDING, later));
    }

    @Test
    void committedCreateIsConfirmedByAuthoritativeReadBack() {
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        MigrationOperationFilePublisher committed = new MigrationOperationFilePublisher(root);
        AtomicBoolean first = new AtomicBoolean(true);
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) -> {
            committed.publish(target, content);
            if (first.getAndSet(false)) {
                throw new CommittedSetupFileDurabilityException();
            }
        });

        assertThat(uncertain.createOrConfirm(pending)).isEqualTo(pending);
    }

    @Test
    void committedTransitionIsConfirmedByAuthoritativeReadBack() {
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        new FileMigrationOperationStore(root).create(pending);
        MigrationOperationSnapshot running = running(pending);
        MigrationOperationFilePublisher committed = new MigrationOperationFilePublisher(root);
        AtomicBoolean first = new AtomicBoolean(true);
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) -> {
            committed.publish(target, content);
            if (first.getAndSet(false)) {
                throw new CommittedSetupFileDurabilityException();
            }
        });

        assertThat(uncertain.compareAndTransitionOrConfirm(
                pending.operationId(), MigrationOperationState.PENDING, running)).isEqualTo(running);
    }

    @Test
    void exactReplayMustConfirmDurabilityBeforeReturningSuccess() {
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        MigrationOperationFilePublisher committed = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) -> {
            committed.publish(target, content);
            if (publications.incrementAndGet() <= 4) {
                throw new CommittedSetupFileDurabilityException();
            }
        });

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> uncertain.createOrConfirm(pending));
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> uncertain.createOrConfirm(pending));
        assertThat(uncertain.createOrConfirm(pending)).isEqualTo(pending);
        assertThat(publications).hasValue(5);
    }

    @Test
    void exactTransitionReplayMustConfirmDurabilityBeforeReturningSuccess() {
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        MigrationOperationSnapshot running = running(pending);
        new FileMigrationOperationStore(root).create(pending);
        MigrationOperationFilePublisher committed = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) -> {
            committed.publish(target, content);
            if (publications.incrementAndGet() <= 4) {
                throw new CommittedSetupFileDurabilityException();
            }
        });

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> uncertain.compareAndTransitionOrConfirm(
                        pending.operationId(), MigrationOperationState.PENDING, running));
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> uncertain.compareAndTransitionOrConfirm(
                        pending.operationId(), MigrationOperationState.PENDING, running));
        assertThat(uncertain.compareAndTransitionOrConfirm(
                pending.operationId(), MigrationOperationState.PENDING, running)).isEqualTo(running);
        assertThat(publications).hasValue(5);
    }

    @Test
    void uncertainCreateMissingOrCorruptFailsClosed() {
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        FileMigrationOperationStore missing = new FileMigrationOperationStore(root, (target, content) -> {
            throw new CommittedSetupFileDurabilityException();
        });
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> missing.createOrConfirm(pending));

        FileMigrationOperationStore corrupt = new FileMigrationOperationStore(root, (target, content) -> {
            Files.createDirectories(target.getParent());
            Files.writeString(target, "schema=99\n", StandardCharsets.UTF_8);
            throw new CommittedSetupFileDurabilityException();
        });
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> corrupt.createOrConfirm(pending));
    }

    @Test
    void uncertainTransitionMissingOrCorruptFailsClosed() {
        MigrationOperationSnapshot pending = pending("operation-a", IDENTITY, GENERATION);
        MigrationOperationSnapshot running = running(pending);
        new FileMigrationOperationStore(root).create(pending);
        FileMigrationOperationStore missing = new FileMigrationOperationStore(root, (target, content) -> {
            Files.delete(target);
            throw new CommittedSetupFileDurabilityException();
        });
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> missing.compareAndTransitionOrConfirm(
                        pending.operationId(), MigrationOperationState.PENDING, running));

        new FileMigrationOperationStore(root).create(pending);
        FileMigrationOperationStore corrupt = new FileMigrationOperationStore(root, (target, content) -> {
            Files.writeString(target, "schema=99\n", StandardCharsets.UTF_8);
            throw new CommittedSetupFileDurabilityException();
        });
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> corrupt.compareAndTransitionOrConfirm(
                        pending.operationId(), MigrationOperationState.PENDING, running));
    }

    @Test
    void exactMethodSurfaceContainsNoMigrationPayloadOrCredentialFields() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        assertThat(store.toString())
                .doesNotContain("jdbc:", "password", "username", IDENTITY, GENERATION);
    }

    private static MigrationOperationSnapshot pending(String operation, String identity, String generation) {
        return new MigrationOperationSnapshot(operation, MigrationOperationState.PENDING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0, CREATED, null, null,
                VerificationState.PENDING, null, null, 1000, false, false, false,
                identity, generation);
    }

    private static MigrationOperationSnapshot running(MigrationOperationSnapshot pending) {
        return new MigrationOperationSnapshot(
                pending.operationId(), MigrationOperationState.RUNNING, pending.target(), pending.applyMode(),
                MigrationStage.COPYING, 10, pending.createdAt(), pending.createdAt().plusSeconds(1), null,
                VerificationState.PENDING, null, null, 1000, false, false, false,
                pending.targetIdentityHash(), pending.managedCandidateGeneration());
    }

    private static void assertStoreError(SetupErrorCode code, ThrowingAction action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                        failure -> assertThat(failure.errorCode()).isEqualTo(code))
                .hasNoCause()
                .hasMessageNotContaining("jdbc")
                .hasMessageNotContaining("password")
                .hasMessageNotContaining("username")
                .hasMessageNotContaining("schema=99");
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run() throws Exception;
    }
}
