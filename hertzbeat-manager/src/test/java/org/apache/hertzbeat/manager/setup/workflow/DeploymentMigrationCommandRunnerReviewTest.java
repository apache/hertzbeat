/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static java.util.concurrent.TimeUnit.MILLISECONDS;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.MetadataTargetStageResult;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.StageOutcome;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFileLock;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.invocation.InvocationOnMock;

@Timeout(15)
class DeploymentMigrationCommandRunnerReviewTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "d".repeat(64);
    private static final Instant NOW = Instant.parse("2026-08-10T10:00:00Z");

    @TempDir
    private Path root;

    @Test
    void failedFinalizationPinsOutcomeAndSameOperationRetriesWithoutRecopy() throws Exception {
        Path caseRoot = root.resolve("finalization");
        MigrationOperationFilePublisher publisher = new MigrationOperationFilePublisher(caseRoot);
        AtomicBoolean rejectWrites = new AtomicBoolean();
        FileMigrationOperationStore store = new FileMigrationOperationStore(caseRoot, (target, content) -> {
            if (rejectWrites.get()) {
                throw new IOException("private-finalization-write");
            }
            publisher.publish(target, content);
        });
        AtomicReference<Instant> time = new AtomicReference<>(NOW);
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenAnswer(ignored -> time.get());
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        AtomicInteger copies = new AtomicInteger();
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    copies.incrementAndGet();
                    prepare(invocation);
                    rejectWrites.set(true);
                    throw new MetadataMigrationException(MetadataMigrationErrorCode.COPY);
                });

        DeploymentMigrationCommandRunner runner = runner(store, coordinator, clock,
                Executors.newSingleThreadExecutor());
        try {
            runner.start(request());
            awaitPhase(runner, RetainedCutoverRecoveryPhase.FAILURE_FINALIZATION_PENDING);
            time.set(NOW.plusSeconds(30));
            rejectWrites.set(false);

            runner.start(request());
            awaitTerminal(store);
            MigrationOperationSnapshot failed = store.find(OPERATION).orElseThrow();
            assertThat(failed.errorCode()).isEqualTo(SetupErrorCode.MIGRATION_COPY_FAILED);
            assertThat(failed.completedAt()).isEqualTo(NOW);
            assertThat(copies).hasValue(1);
        } finally {
            rejectWrites.set(false);
            runner.close();
        }
    }

    @Test
    void committedFinalizationRemainsOwnedUntilCloseConfirmsTheExactTerminalRecord() {
        Path caseRoot = root.resolve("committed-finalization");
        MigrationOperationFilePublisher publisher = new MigrationOperationFilePublisher(caseRoot);
        AtomicBoolean uncertain = new AtomicBoolean();
        FileMigrationOperationStore store = new FileMigrationOperationStore(caseRoot, (target, content) -> {
            publisher.publish(target, content);
            if (uncertain.get()) {
                throw new CommittedSetupFileDurabilityException();
            }
        });
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        AtomicInteger copies = new AtomicInteger();
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    copies.incrementAndGet();
                    prepare(invocation);
                    uncertain.set(true);
                    throw new MetadataMigrationException(MetadataMigrationErrorCode.COPY);
                });

        DeploymentMigrationCommandRunner runner = runner(
                store, coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                Executors.newSingleThreadExecutor());
        runner.start(request());
        awaitPhase(runner, RetainedCutoverRecoveryPhase.FAILURE_FINALIZATION_PENDING);
        assertThat(store.find(OPERATION)).hasValueSatisfying(
                snapshot -> assertThat(snapshot.errorCode())
                        .isEqualTo(SetupErrorCode.MIGRATION_COPY_FAILED));
        assertThatThrownBy(() -> runner.find(OPERATION))
                .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                        failure -> assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        uncertain.set(false);
        runner.close();

        assertThat(copies).hasValue(1);
        assertThat(store.find(OPERATION)).hasValueSatisfying(
                snapshot -> assertThat(snapshot.completedAt()).isEqualTo(NOW));
    }

    @Test
    void recoveryProbeFatalCannotHideOriginalFatalOrSkipOwnerCompletion() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("probe-fatal"));
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        AssertionError primary = new AssertionError("primary-copy-fatal");
        AssertionError probe = new AssertionError("private-recovery-probe");
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    prepare(invocation);
                    throw primary;
                });
        when(coordinator.recoveryPhase(OPERATION)).thenThrow(probe);
        CountDownLatch uncaught = new CountDownLatch(1);
        AtomicReference<Throwable> observed = new AtomicReference<>();
        ExecutorService worker = Executors.newSingleThreadExecutor(task -> {
            Thread thread = new Thread(task);
            thread.setUncaughtExceptionHandler((ignored, failure) -> {
                observed.set(failure);
                uncaught.countDown();
            });
            return thread;
        });

        DeploymentMigrationCommandRunner runner = runner(
                store, coordinator, Clock.fixed(NOW, ZoneOffset.UTC), worker);
        runner.start(request());
        assertThat(uncaught.await(5, SECONDS)).isTrue();
        assertThat(observed.get()).isSameAs(primary);
        assertThat(primary.getSuppressed())
                .singleElement()
                .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                        marker -> assertThat(marker.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        assertThat(runner.activeRecoveryPhase()).isEmpty();
        runner.close();
    }

    @Test
    void retryWaitsForZeroQueueWorkerToFinishAfterExecute() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("handoff"));
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        CountDownLatch afterExecute = new CountDownLatch(1);
        CountDownLatch releaseWorker = new CountDownLatch(1);
        ThreadPoolExecutor worker = blockingAfterExecute(afterExecute, releaseWorker);
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    prepare(invocation);
                    throw new RetainedCutoverReleaseRequiredException();
                });
        when(coordinator.recoveryPhase(OPERATION)).thenReturn(
                RetainedCutoverRecoveryPhase.RELEASE_PENDING,
                RetainedCutoverRecoveryPhase.NONE);
        when(coordinator.retryRelease(OPERATION, Duration.ofSeconds(2))).thenReturn(retained());
        DeploymentMigrationCommandRunner runner = runner(
                store, coordinator, Clock.fixed(NOW, ZoneOffset.UTC), worker);
        try {
            runner.start(request());
            assertThat(afterExecute.await(5, SECONDS)).isTrue();
            CompletableFuture<?> retry = CompletableFuture.runAsync(() -> runner.start(request()));
            assertThatThrownBy(() -> retry.get(100, MILLISECONDS))
                    .isInstanceOf(java.util.concurrent.TimeoutException.class);
            releaseWorker.countDown();
            retry.get(5, SECONDS);
            verify(coordinator).retryRelease(OPERATION, Duration.ofSeconds(2));
            verify(coordinator).execute(any(), any(), any(), any(), any(), any(), any());
        } finally {
            releaseWorker.countDown();
            runner.close();
        }
    }

    @Test
    void expiredWorkerHandoffRestoresExactPendingOwnershipForLaterRetry() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("handoff-expired"));
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        CountDownLatch afterExecute = new CountDownLatch(1);
        CountDownLatch releaseWorker = new CountDownLatch(1);
        ThreadPoolExecutor worker = blockingAfterExecute(afterExecute, releaseWorker);
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    prepare(invocation);
                    throw new RetainedCutoverReleaseRequiredException();
                });
        when(coordinator.recoveryPhase(OPERATION)).thenReturn(
                RetainedCutoverRecoveryPhase.RELEASE_PENDING,
                RetainedCutoverRecoveryPhase.NONE);
        when(coordinator.retryRelease(OPERATION, Duration.ofMillis(100))).thenReturn(retained());
        DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                store, configuration(), coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                Duration.ofMillis(100), worker);
        try {
            runner.start(request());
            assertThat(afterExecute.await(5, SECONDS)).isTrue();
            assertThatThrownBy(() -> runner.start(request()))
                    .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                            failure -> assertThat(failure.errorCode())
                                    .isEqualTo(SetupErrorCode.MIGRATION_UNAVAILABLE));
            assertThat(runner.activeRecoveryPhase())
                    .contains(RetainedCutoverRecoveryPhase.RELEASE_PENDING);

            releaseWorker.countDown();
            runner.start(request());
            verify(coordinator).retryRelease(OPERATION, Duration.ofMillis(100));
            verify(coordinator).execute(any(), any(), any(), any(), any(), any(), any());
        } finally {
            releaseWorker.countDown();
            runner.close();
        }
    }

    @Test
    void committedPreparationAndPersistedReplayRequireHealthyDurabilityConfirmation() {
        Path caseRoot = root.resolve("preparation-confirm");
        MigrationOperationFilePublisher publisher = new MigrationOperationFilePublisher(caseRoot);
        AtomicBoolean uncertain = new AtomicBoolean();
        FileMigrationOperationStore store = new FileMigrationOperationStore(caseRoot, (target, content) -> {
            publisher.publish(target, content);
            if (uncertain.get()) {
                throw new CommittedSetupFileDurabilityException();
            }
        });
        ManagedMigrationConfigurationTransaction configuration = configuration();
        try {
            org.mockito.Mockito.doAnswer(invocation -> {
                uncertain.set(true);
                return stage(invocation);
            }).when(configuration).stageMetadataTarget(any(), any(), any(), any(), any());
        } catch (IOException impossible) {
            throw new AssertionError(impossible);
        }
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    prepare(invocation);
                    throw new AssertionError("copy-must-not-start");
                });
        DeploymentMigrationCommandRunner uncertainRunner = new DeploymentMigrationCommandRunner(
                store, configuration, coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                Duration.ofSeconds(2), Executors.newSingleThreadExecutor());
        assertThatThrownBy(() -> uncertainRunner.start(request()))
                .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                        failure -> assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        uncertain.set(false);
        uncertainRunner.close();

        RetainedCutoverCoordinator healthyCoordinator = mock(RetainedCutoverCoordinator.class);
        try (DeploymentMigrationCommandRunner healthy = runner(
                store, healthyCoordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                Executors.newSingleThreadExecutor())) {
            assertThat(healthy.start(request()).state()).isEqualTo(MigrationOperationState.RUNNING);
        }
        verify(healthyCoordinator, times(0)).execute(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void activeOperationProjectionCannotMissTaskCreatedBeforeJournalWrite() throws Exception {
        Path caseRoot = root.resolve("active-linearized");
        FileMigrationOperationStore store = new FileMigrationOperationStore(caseRoot);
        SecureSetupFileLock fileLock = new SecureSetupFileLock(
                caseRoot, "data/config/.metadata-migration-operations.lock");
        CountDownLatch lockHeld = new CountDownLatch(1);
        CountDownLatch releaseLock = new CountDownLatch(1);
        CompletableFuture<Void> holder = CompletableFuture.runAsync(() -> {
            try {
                fileLock.execute(() -> {
                    lockHeld.countDown();
                    try {
                        assertThat(releaseLock.await(5, SECONDS)).isTrue();
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        throw new IOException("test lock interrupted");
                    }
                    return null;
                });
            } catch (IOException failure) {
                throw new AssertionError(failure);
            }
        });
        assertThat(lockHeld.await(5, SECONDS)).isTrue();
        DeploymentMigrationCommandRunner runner = runner(
                store, mock(RetainedCutoverCoordinator.class), Clock.fixed(NOW, ZoneOffset.UTC),
                Executors.newSingleThreadExecutor());
        AtomicReference<Optional<String>> projected = new AtomicReference<>();
        Thread projection = Thread.ofPlatform().start(
                () -> projected.set(runner.activeOperationId()));
        AtomicReference<Throwable> startFailure = new AtomicReference<>();
        Thread start = Thread.ofPlatform().start(() -> {
            try {
                runner.start(request());
            } catch (RuntimeException | Error failure) {
                startFailure.set(failure);
            }
        });
        try {
            awaitState(start, Thread.State.BLOCKED);
            releaseLock.countDown();
            projection.join(5000);
            assertThat(projected.get()).isEmpty();
        } finally {
            releaseLock.countDown();
            holder.get(5, SECONDS);
            start.join(5000);
            assertThat(startFailure.get()).isInstanceOf(MetadataMigrationException.class);
            runner.close();
        }
    }

    private DeploymentMigrationCommandRunner runner(
            FileMigrationOperationStore store,
            RetainedCutoverCoordinator coordinator,
            Clock clock,
            ExecutorService worker) {
        return new DeploymentMigrationCommandRunner(
                store, configuration(), coordinator, clock, Duration.ofSeconds(2), worker);
    }

    private static ThreadPoolExecutor blockingAfterExecute(
            CountDownLatch afterExecute, CountDownLatch releaseWorker) {
        return new ThreadPoolExecutor(1, 1, 0, MILLISECONDS, new SynchronousQueue<>()) {
            @Override
            protected void afterExecute(Runnable task, Throwable failure) {
                afterExecute.countDown();
                try {
                    assertThat(releaseWorker.await(5, SECONDS)).isTrue();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            }
        };
    }

    private static void prepare(InvocationOnMock invocation) {
        RetainedCutoverPreparation preparation = invocation.getArgument(5);
        preparation.prepare(new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                invocation.getArgument(1), invocation.getArgument(2));
    }

    private static RetainedCutoverResult retained() {
        return new RetainedCutoverResult(
                OPERATION, IDENTITY, RetainedCutoverResult.Status.RETAINED_SUCCESS);
    }

    private ManagedMigrationConfigurationTransaction configuration() {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        try {
            when(configuration.stageMetadataTarget(any(), any(), any(), any(), any()))
                    .thenAnswer(DeploymentMigrationCommandRunnerReviewTest::stage);
        } catch (IOException impossible) {
            throw new AssertionError(impossible);
        }
        return configuration;
    }

    private static MetadataTargetStageResult stage(InvocationOnMock invocation) {
        return new MetadataTargetStageResult(StageOutcome.STAGED,
                Optional.of(new CandidateRef(invocation.getArgument(0), invocation.getArgument(1))));
    }

    private static MetadataMigrationRequest request() {
        return new MetadataMigrationRequest(
                OPERATION, MigrationTarget.MYSQL,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat", "migration", "password-a"),
                ApplyMode.MANAGED_WRITE);
    }

    private static void awaitPhase(
            DeploymentMigrationCommandRunner runner, RetainedCutoverRecoveryPhase phase) {
        long deadline = System.nanoTime() + SECONDS.toNanos(5);
        while (!runner.activeRecoveryPhase().equals(Optional.of(phase))
                && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(runner.activeRecoveryPhase()).contains(phase);
    }

    private static void awaitTerminal(FileMigrationOperationStore store) {
        long deadline = System.nanoTime() + SECONDS.toNanos(5);
        while (store.find(OPERATION).filter(MigrationOperationSnapshot::terminal).isEmpty()
                && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(store.find(OPERATION)).hasValueSatisfying(
                snapshot -> assertThat(snapshot.terminal()).isTrue());
    }

    private static void awaitState(Thread thread, Thread.State expected) {
        long deadline = System.nanoTime() + SECONDS.toNanos(5);
        while (thread.getState() != expected && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(thread.getState()).isEqualTo(expected);
    }
}
