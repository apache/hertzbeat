/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.apache.hertzbeat.manager.setup.workflow.DurableCutoverFailureFinalizer.Disposition;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;

class DurableCutoverFailureFinalizerTest {

    private static final String OPERATION_ID = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final String GENERATION = "candidate-generation";
    private static final Instant CREATED = Instant.parse("2026-08-10T01:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);
    private static final Instant COMPLETED = STARTED.plusSeconds(20);

    @TempDir
    private Path root;

    @Test
    void terminalizesKnownCopyFailureWhilePreservingObservedProgressAndIdentity() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot copying = copying(37);
        store.create(pending());
        store.compareAndTransition(OPERATION_ID, MigrationOperationState.PENDING, copying);

        Disposition result = new DurableCutoverFailureFinalizer(store).finalizeFailure(
                OPERATION_ID, DurableKnownFailure.COPY, COMPLETED);

        assertThat(result).isEqualTo(Disposition.TRANSITIONED);
        MigrationOperationSnapshot failed = store.find(OPERATION_ID).orElseThrow();
        assertThat(failed.state()).isEqualTo(MigrationOperationState.FAILED);
        assertThat(failed.stage()).isEqualTo(MigrationStage.FAILED);
        assertThat(failed.progressPercent()).isEqualTo(37);
        assertThat(failed.verificationState()).isEqualTo(VerificationState.PENDING);
        assertThat(failed.errorCode()).isEqualTo(SetupErrorCode.MIGRATION_COPY_FAILED);
        assertThat(failed.completedAt()).isEqualTo(COMPLETED);
        assertThat(failed.targetIdentityHash()).isEqualTo(IDENTITY);
        assertThat(failed.managedCandidateGeneration()).isEqualTo(GENERATION);
    }

    @Test
    void terminalizesKnownVerificationFailureAtCompletedVerificationProgress() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot verifying = verifying();
        store.create(pending());
        store.compareAndTransition(OPERATION_ID, MigrationOperationState.PENDING, copying(40));
        store.compareAndTransition(OPERATION_ID, MigrationOperationState.RUNNING, verifying);

        Disposition result = new DurableCutoverFailureFinalizer(store).finalizeFailure(
                OPERATION_ID, DurableKnownFailure.VERIFICATION, COMPLETED);

        assertThat(result).isEqualTo(Disposition.TRANSITIONED);
        MigrationOperationSnapshot failed = store.find(OPERATION_ID).orElseThrow();
        assertThat(failed.state()).isEqualTo(MigrationOperationState.FAILED);
        assertThat(failed.progressPercent()).isEqualTo(100);
        assertThat(failed.verificationState()).isEqualTo(VerificationState.FAILED);
        assertThat(failed.errorCode()).isEqualTo(SetupErrorCode.MIGRATION_VERIFICATION_FAILED);
    }

    @Test
    void acceptsOnlyTheClosedKnownCleanupFailureCapability() {
        assertThat(DurableKnownFailure.values())
                .containsExactly(DurableKnownFailure.COPY, DurableKnownFailure.VERIFICATION);
        assertThat(DurableCutoverFailureFinalizer.class.getDeclaredMethods())
                .filteredOn(method -> method.getName().equals("finalizeFailure"))
                .singleElement()
                .satisfies(method -> assertThat(method.getParameterTypes())
                        .containsExactly(String.class, DurableKnownFailure.class, Instant.class)
                        .doesNotContain(SetupErrorCode.class, Throwable.class));
    }

    @Test
    void rejectsWrongPhaseAndInvalidCompletionTimeWithoutChangingTheJournal() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot copying = copying(53);
        store.create(pending());
        store.compareAndTransition(OPERATION_ID, MigrationOperationState.PENDING, copying);
        DurableCutoverFailureFinalizer finalizer = new DurableCutoverFailureFinalizer(store);

        assertStoreError(SetupErrorCode.OPERATION_CONFLICT, () -> finalizer.finalizeFailure(
                OPERATION_ID, DurableKnownFailure.VERIFICATION, COMPLETED));
        assertThatThrownBy(() -> finalizer.finalizeFailure(
                OPERATION_ID, DurableKnownFailure.COPY, STARTED.minusNanos(1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThat(store.find(OPERATION_ID)).contains(copying);
    }

    @Test
    void exactTerminalReplayReturnsAlreadyConfirmedWithoutChangingCompletionIdentity() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        store.create(pending());
        store.compareAndTransition(OPERATION_ID, MigrationOperationState.PENDING, copying(61));
        DurableCutoverFailureFinalizer finalizer = new DurableCutoverFailureFinalizer(store);
        assertThat(finalizer.finalizeFailure(
                OPERATION_ID, DurableKnownFailure.COPY, COMPLETED))
                .isEqualTo(Disposition.TRANSITIONED);

        assertThat(finalizer.finalizeFailure(
                OPERATION_ID, DurableKnownFailure.COPY, COMPLETED))
                .isEqualTo(Disposition.ALREADY_CONFIRMED);
        assertStoreError(SetupErrorCode.OPERATION_CONFLICT, () -> finalizer.finalizeFailure(
                OPERATION_ID, DurableKnownFailure.COPY, COMPLETED.plusSeconds(1)));
    }

    @Test
    void preStartTerminalFailureAlwaysConflictsInsteadOfApplyingRunningTimeValidation() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        store.create(pending());
        MigrationOperationSnapshot unsupported = new MigrationOperationSnapshot(
                OPERATION_ID, MigrationOperationState.FAILED, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.FAILED, 0, CREATED, null, CREATED.plusSeconds(2),
                VerificationState.PENDING, SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED, null, 0,
                false, false, false, IDENTITY, GENERATION);
        store.compareAndTransition(OPERATION_ID, MigrationOperationState.PENDING, unsupported);

        assertStoreError(SetupErrorCode.OPERATION_CONFLICT, () ->
                new DurableCutoverFailureFinalizer(store).finalizeFailure(
                        OPERATION_ID, DurableKnownFailure.COPY, COMPLETED));
    }

    @Test
    void committedFailureAndUncertainConfirmationRequireExactReplay() {
        FileMigrationOperationStore initial = new FileMigrationOperationStore(root);
        initial.create(pending());
        initial.compareAndTransition(OPERATION_ID, MigrationOperationState.PENDING, copying(62));
        MigrationOperationFilePublisher committed = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) -> {
            committed.publish(target, content);
            if (publications.incrementAndGet() <= 2) {
                throw new CommittedSetupFileDurabilityException();
            }
        });
        DurableCutoverFailureFinalizer finalizer = new DurableCutoverFailureFinalizer(uncertain);

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, () -> finalizer.finalizeFailure(
                OPERATION_ID, DurableKnownFailure.COPY, COMPLETED));
        assertThat(initial.find(OPERATION_ID).orElseThrow().errorCode())
                .isEqualTo(SetupErrorCode.MIGRATION_COPY_FAILED);

        assertThat(finalizer.finalizeFailure(
                OPERATION_ID, DurableKnownFailure.COPY, COMPLETED))
                .isEqualTo(Disposition.ALREADY_CONFIRMED);
        assertThat(publications).hasValue(3);
    }

    @Test
    @Timeout(10)
    void progressTransitionAndFailureFinalizationSerializeUnderTheStoreLock() throws Exception {
        FileMigrationOperationStore initial = new FileMigrationOperationStore(root);
        initial.create(pending());
        initial.compareAndTransition(OPERATION_ID, MigrationOperationState.PENDING, copying(12));
        MigrationOperationFilePublisher committed = new MigrationOperationFilePublisher(root);
        CountDownLatch progressPublished = new CountDownLatch(1);
        CountDownLatch releaseProgress = new CountDownLatch(1);
        FileMigrationOperationStore updating = new FileMigrationOperationStore(root, (target, content) -> {
            committed.publish(target, content);
            progressPublished.countDown();
            try {
                releaseProgress.await();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new CommittedSetupFileDurabilityException();
            }
        });
        DurableCutoverFailureFinalizer finalizer = new DurableCutoverFailureFinalizer(
                new FileMigrationOperationStore(root));
        CountDownLatch finalizationStarted = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> progress = executor.submit(() -> updating.compareAndTransition(
                    OPERATION_ID, MigrationOperationState.RUNNING, copying(63)));
            assertThat(progressPublished.await(5, TimeUnit.SECONDS)).isTrue();
            Future<Disposition> failure = executor.submit(() -> {
                finalizationStarted.countDown();
                return finalizer.finalizeFailure(
                        OPERATION_ID, DurableKnownFailure.COPY, COMPLETED);
            });
            assertThat(finalizationStarted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(failure.isDone()).isFalse();
            releaseProgress.countDown();
            progress.get(5, TimeUnit.SECONDS);
            assertThat(failure.get(5, TimeUnit.SECONDS)).isEqualTo(Disposition.TRANSITIONED);
        } finally {
            releaseProgress.countDown();
        }

        assertThat(initial.find(OPERATION_ID).orElseThrow().progressPercent()).isEqualTo(63);
    }

    @Test
    void surfaceAndFailuresContainNoPayloadOrThrowableChannel() {
        assertThat(DurableCutoverFailureFinalizer.class.getDeclaredMethods())
                .allSatisfy(method -> assertThat(method.getParameterTypes())
                        .doesNotContain(Throwable.class, Exception.class, Error.class));
        assertThat(new DurableCutoverFailureFinalizer(new FileMigrationOperationStore(root)).toString())
                .doesNotContain("jdbc:", "password", "username", IDENTITY, GENERATION);
    }

    private static MigrationOperationSnapshot pending() {
        return new MigrationOperationSnapshot(
                OPERATION_ID, MigrationOperationState.PENDING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0, CREATED, null, null,
                VerificationState.PENDING, null, null, 1000, false, false, false,
                IDENTITY, GENERATION);
    }

    private static MigrationOperationSnapshot copying(int progress) {
        return new MigrationOperationSnapshot(
                OPERATION_ID, MigrationOperationState.RUNNING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.COPYING, progress, CREATED, STARTED, null,
                VerificationState.PENDING, null, null, 1000, false, false, false,
                IDENTITY, GENERATION);
    }

    private static MigrationOperationSnapshot verifying() {
        return new MigrationOperationSnapshot(
                OPERATION_ID, MigrationOperationState.RUNNING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.VERIFYING, 100, CREATED, STARTED, null,
                VerificationState.RUNNING, null, null, 1000, false, false, false,
                IDENTITY, GENERATION);
    }

    private static void assertStoreError(SetupErrorCode code, ThrowingAction action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                        failure -> assertThat(failure.errorCode()).isEqualTo(code))
                .hasNoCause();
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run();
    }
}
