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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.MetadataTargetStageResult;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.StageOutcome;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.invocation.InvocationOnMock;

@Timeout(15)
class DeploymentMigrationCommandRunnerRecoveryTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "c".repeat(64);
    private static final Instant NOW = Instant.parse("2026-08-10T07:00:00Z");

    @TempDir
    private Path root;

    @Test
    void preparationWaitIsBoundedWithoutCancellingWorkerAndLaterJoinDoesNotRecopy() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("timeout"));
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        CountDownLatch allowPreparation = new CountDownLatch(1);
        AtomicInteger executions = new AtomicInteger();
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    executions.incrementAndGet();
                    assertThat(allowPreparation.await(5, SECONDS)).isTrue();
                    prepare(invocation);
                    return retained();
                });
        DeploymentMigrationCommandRunner runner = runner(
                store, coordinator, Duration.ofMillis(100));
        try {
            assertThatThrownBy(() -> runner.start(request()))
                    .isInstanceOfSatisfying(MetadataMigrationException.class,
                            failure -> assertThat(failure.code())
                                    .isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
            assertThat(runner.activeOperationId()).contains(OPERATION);

            allowPreparation.countDown();
            MigrationViewAssert.running(runner.start(request()));
            assertThat(executions).hasValue(1);
        } finally {
            allowPreparation.countDown();
            runner.close();
        }
    }

    @Test
    void releaseAndHandoffPendingRetrySameOperationWithoutRecopy() throws Exception {
        assertRetry(RetainedCutoverRecoveryPhase.RELEASE_PENDING);
        assertRetry(RetainedCutoverRecoveryPhase.HANDOFF_PENDING);
    }

    @Test
    void interruptedHandoffSubmissionPreservesTimeoutAndExactPendingOwnership() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("interrupted-handoff"));
        RetainedCutoverCoordinator coordinator = pendingCoordinator(
                RetainedCutoverRecoveryPhase.HANDOFF_PENDING);
        when(coordinator.recoveryPhase(OPERATION)).thenReturn(
                RetainedCutoverRecoveryPhase.HANDOFF_PENDING,
                RetainedCutoverRecoveryPhase.NONE);
        when(coordinator.retryHandoff(OPERATION)).thenReturn(retained());
        CountDownLatch workerUnwinding = new CountDownLatch(1);
        CountDownLatch releaseWorker = new CountDownLatch(1);
        ThreadPoolExecutor worker = blockingAfterExecute(workerUnwinding, releaseWorker);
        DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                store, configuration(), coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                Duration.ofSeconds(2), worker);
        try {
            MigrationViewAssert.running(runner.start(request()));
            assertThat(workerUnwinding.await(5, SECONDS)).isTrue();
            Thread.currentThread().interrupt();
            try {
                assertThatThrownBy(() -> runner.start(request()))
                        .isInstanceOfSatisfying(MetadataMigrationException.class,
                                failure -> assertThat(failure.code())
                                        .isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
                assertThat(Thread.currentThread().isInterrupted()).isTrue();
            } finally {
                Thread.interrupted();
            }
            assertThat(runner.activeRecoveryPhase())
                    .contains(RetainedCutoverRecoveryPhase.HANDOFF_PENDING);

            releaseWorker.countDown();
            MigrationViewAssert.running(runner.start(request()));
        } finally {
            releaseWorker.countDown();
            Thread.interrupted();
            runner.close();
        }
        verify(coordinator).retryHandoff(OPERATION);
        verify(coordinator).execute(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void closePreservesPendingReleaseForExactRetryAndFatalMarkerUsesSameOwnership() throws Exception {
        FileMigrationOperationStore retryStore = new FileMigrationOperationStore(root.resolve("close-retry"));
        RetainedCutoverCoordinator retryCoordinator = pendingCoordinator(
                RetainedCutoverRecoveryPhase.RELEASE_PENDING);
        when(retryCoordinator.recoveryPhase(OPERATION)).thenReturn(
                RetainedCutoverRecoveryPhase.RELEASE_PENDING,
                RetainedCutoverRecoveryPhase.RELEASE_PENDING,
                RetainedCutoverRecoveryPhase.NONE);
        when(retryCoordinator.retryRelease(OPERATION, Duration.ofSeconds(2)))
                .thenThrow(new RetainedCutoverReleaseRequiredException())
                .thenReturn(retained());
        DeploymentMigrationCommandRunner retryRunner = runner(
                retryStore, retryCoordinator, Duration.ofSeconds(2));
        retryRunner.start(request());
        awaitRecovery(retryRunner, RetainedCutoverRecoveryPhase.RELEASE_PENDING);
        assertThatThrownBy(retryRunner::close)
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);
        assertThat(retryRunner.activeOperationId()).contains(OPERATION);
        retryRunner.close();
        verify(retryCoordinator, times(2)).retryRelease(OPERATION, Duration.ofSeconds(2));

        FileMigrationOperationStore fatalStore = new FileMigrationOperationStore(root.resolve("fatal"));
        RetainedCutoverCoordinator fatalCoordinator = mock(RetainedCutoverCoordinator.class);
        AssertionError fatal = new AssertionError("fatal-copy");
        RetainedCutoverReleaseRequiredException.attach(fatal);
        when(fatalCoordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    prepare(invocation);
                    throw fatal;
                });
        when(fatalCoordinator.recoveryPhase(OPERATION)).thenReturn(
                RetainedCutoverRecoveryPhase.RELEASE_PENDING,
                RetainedCutoverRecoveryPhase.NONE);
        when(fatalCoordinator.retryRelease(OPERATION, Duration.ofSeconds(2))).thenThrow(fatal);
        DeploymentMigrationCommandRunner fatalRunner = runner(
                fatalStore, fatalCoordinator, Duration.ofSeconds(2));
        fatalRunner.start(request());
        awaitRecovery(fatalRunner, RetainedCutoverRecoveryPhase.RELEASE_PENDING);
        assertThatThrownBy(fatalRunner::close).isSameAs(fatal);
        assertThat(fatalRunner.activeRecoveryPhase()).isEmpty();
        fatalRunner.close();
    }

    @Test
    void swallowedVerifyingProgressFailureUsesAuthoritativeCopyingStage() throws Exception {
        Path caseRoot = root.resolve("progress-failure");
        MigrationOperationFilePublisher publisher = new MigrationOperationFilePublisher(caseRoot);
        AtomicBoolean failNext = new AtomicBoolean();
        FileMigrationOperationStore store = new FileMigrationOperationStore(caseRoot, (target, content) -> {
            if (failNext.compareAndSet(true, false)) {
                throw new IOException("private-progress-failure");
            }
            publisher.publish(target, content);
        });
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    prepare(invocation);
                    failNext.set(true);
                    MetadataMigrationProgressSink progress = invocation.getArgument(4);
                    try {
                        progress.report(MetadataMigrationStage.VERIFYING, 100);
                    } catch (MigrationOperationStoreException swallowedByJdbcBoundary) {
                        assertThat(swallowedByJdbcBoundary.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_WRITE_FAILED);
                    }
                    throw new MetadataMigrationException(MetadataMigrationErrorCode.VERIFICATION);
                });

        try (DeploymentMigrationCommandRunner runner = runner(
                store, coordinator, Duration.ofSeconds(2))) {
            MigrationViewAssert.running(runner.start(request()));
        }
        MigrationOperationSnapshot terminal = store.find(OPERATION).orElseThrow();
        assertThat(terminal.state()).isEqualTo(MigrationOperationState.FAILED);
        assertThat(terminal.stage()).isEqualTo(MigrationStage.FAILED);
        assertThat(terminal.errorCode()).isEqualTo(SetupErrorCode.MIGRATION_COPY_FAILED);
    }

    @Test
    void findCannotPublishReadyWhileHandoffFailureStillOwnsTheTask() throws Exception {
        Path caseRoot = root.resolve("find-handoff-race");
        MigrationOperationFilePublisher publisher = new MigrationOperationFilePublisher(caseRoot);
        AtomicBoolean failFinalHandoff = new AtomicBoolean();
        AtomicInteger handoffWrites = new AtomicInteger();
        CountDownLatch readyCommitted = new CountDownLatch(1);
        CountDownLatch releasePublisher = new CountDownLatch(1);
        FileMigrationOperationStore store = new FileMigrationOperationStore(caseRoot, (target, content) -> {
            publisher.publish(target, content);
            if (failFinalHandoff.get() && handoffWrites.incrementAndGet() == 2) {
                readyCommitted.countDown();
                try {
                    assertThat(releasePublisher.await(5, SECONDS)).isTrue();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new IOException("test publisher interrupted");
                }
                throw new IOException("private final handoff failure");
            }
        });
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        AtomicInteger copies = new AtomicInteger();
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    copies.incrementAndGet();
                    prepare(invocation);
                    MetadataMigrationProgressSink progress = invocation.getArgument(4);
                    progress.report(MetadataMigrationStage.VERIFYING, 100);
                    failFinalHandoff.set(true);
                    RetainedCopyJournalHandoff handoff = invocation.getArgument(6);
                    return handoff.handoff(new RetainedCopyJournalContext(OPERATION, IDENTITY));
                });
        when(coordinator.retryHandoff(OPERATION)).thenAnswer(ignored -> {
            MigrationOperationSnapshot current = store.find(OPERATION).orElseThrow();
            store.confirmExactForStartup(current);
            return retained();
        });
        DeploymentMigrationCommandRunner runner = runner(
                store, coordinator, Duration.ofSeconds(2));
        AtomicReference<Optional<MigrationView>> projected = new AtomicReference<>();
        AtomicReference<Throwable> projectionFailure = new AtomicReference<>();
        Thread find = null;
        try {
            MigrationViewAssert.running(runner.start(request()));
            assertThat(readyCommitted.await(5, SECONDS)).isTrue();
            find = Thread.ofPlatform().start(() -> {
                try {
                    projected.set(runner.find(OPERATION));
                } catch (RuntimeException | Error failure) {
                    projectionFailure.set(failure);
                }
            });
            awaitState(find, Thread.State.WAITING);
            releasePublisher.countDown();
            find.join(5000);

            assertThat(projected.get()).isNull();
            assertThat(projectionFailure.get())
                    .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                            failure -> assertThat(failure.errorCode())
                                    .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
            awaitRecovery(runner, RetainedCutoverRecoveryPhase.HANDOFF_PENDING);

            MigrationViewAssert.running(runner.start(request()));
            assertThat(awaitReadable(runner)).hasValueSatisfying(
                    view -> assertThat(view.state())
                            .isEqualTo(MigrationOperationState.READY_TO_ACTIVATE));
            assertThat(copies).hasValue(1);
        } finally {
            releasePublisher.countDown();
            if (find != null) {
                find.join(5000);
            }
            runner.close();
        }
    }

    @Test
    void owningConstructorUsesRealDaemonWorkerAndJournalFallbackFindsActiveOperation() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("owned"));
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        AtomicBoolean daemon = new AtomicBoolean();
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    daemon.set(Thread.currentThread().isDaemon());
                    prepare(invocation);
                    return retained();
                });
        try (DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                store, configuration(), coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                Duration.ofSeconds(2))) {
            MigrationViewAssert.running(runner.start(request()));
        }
        assertThat(daemon).isTrue();

        FileMigrationOperationStore fallbackStore = new FileMigrationOperationStore(root.resolve("fallback"));
        fallbackStore.create(pending());
        try (DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                fallbackStore, configuration(), mock(RetainedCutoverCoordinator.class),
                Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofSeconds(2))) {
            assertThat(runner.activeOperationId()).contains(OPERATION);
        }
    }

    private void assertRetry(RetainedCutoverRecoveryPhase phase) throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve(phase.name()));
        RetainedCutoverCoordinator coordinator = pendingCoordinator(phase);
        when(coordinator.recoveryPhase(OPERATION)).thenReturn(phase, RetainedCutoverRecoveryPhase.NONE);
        if (phase == RetainedCutoverRecoveryPhase.RELEASE_PENDING) {
            when(coordinator.retryRelease(OPERATION, Duration.ofSeconds(2))).thenReturn(retained());
        } else {
            when(coordinator.retryHandoff(OPERATION)).thenReturn(retained());
        }
        try (DeploymentMigrationCommandRunner runner = runner(
                store, coordinator, Duration.ofSeconds(2))) {
            MigrationViewAssert.running(runner.start(request()));
            awaitRecovery(runner, phase);
            assertThatThrownBy(() -> runner.find(OPERATION))
                    .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                            failure -> assertThat(failure.errorCode())
                                    .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
            MigrationViewAssert.running(runner.start(request()));
            if (phase == RetainedCutoverRecoveryPhase.HANDOFF_PENDING) {
                assertThat(awaitReadable(runner)).hasValueSatisfying(
                        view -> assertThat(view.state())
                                .isEqualTo(MigrationOperationState.READY_TO_ACTIVATE));
            }
        }
        verify(coordinator).execute(any(), any(), any(), any(), any(), any(), any());
        if (phase == RetainedCutoverRecoveryPhase.RELEASE_PENDING) {
            verify(coordinator).retryRelease(OPERATION, Duration.ofSeconds(2));
        } else {
            verify(coordinator).retryHandoff(OPERATION);
        }
    }

    private RetainedCutoverCoordinator pendingCoordinator(RetainedCutoverRecoveryPhase phase) {
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    prepare(invocation);
                    if (phase == RetainedCutoverRecoveryPhase.RELEASE_PENDING) {
                        throw new RetainedCutoverReleaseRequiredException();
                    }
                    MetadataMigrationProgressSink progress = invocation.getArgument(4);
                    progress.report(MetadataMigrationStage.VERIFYING, 100);
                    RetainedCopyJournalHandoff handoff = invocation.getArgument(6);
                    handoff.handoff(new RetainedCopyJournalContext(OPERATION, IDENTITY));
                    throw new RetainedCopyJournalHandoffException(
                            SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
                });
        return coordinator;
    }

    private static ThreadPoolExecutor blockingAfterExecute(
            CountDownLatch entered, CountDownLatch release) {
        return new ThreadPoolExecutor(1, 1, 0, MILLISECONDS, new SynchronousQueue<>()) {
            @Override
            protected void afterExecute(Runnable task, Throwable failure) {
                entered.countDown();
                try {
                    assertThat(release.await(5, SECONDS)).isTrue();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            }
        };
    }

    private DeploymentMigrationCommandRunner runner(
            FileMigrationOperationStore store,
            RetainedCutoverCoordinator coordinator,
            Duration timeout) {
        return new DeploymentMigrationCommandRunner(
                store, configuration(), coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                timeout, Executors.newSingleThreadExecutor());
    }

    private ManagedMigrationConfigurationTransaction configuration() {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        try {
            when(configuration.stageMetadataTarget(any(), any(), any(), any(), any()))
                    .thenAnswer(invocation -> new MetadataTargetStageResult(
                            StageOutcome.STAGED,
                            Optional.of(new CandidateRef(
                                    invocation.getArgument(0), invocation.getArgument(1)))));
        } catch (IOException impossible) {
            throw new AssertionError(impossible);
        }
        return configuration;
    }

    private static void prepare(InvocationOnMock invocation) {
        RetainedCutoverPreparation preparation = invocation.getArgument(5);
        preparation.prepare(
                new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                invocation.getArgument(1), invocation.getArgument(2));
    }

    private static RetainedCutoverResult retained() {
        return new RetainedCutoverResult(
                OPERATION, IDENTITY, RetainedCutoverResult.Status.RETAINED_SUCCESS);
    }

    private static void awaitRecovery(
            DeploymentMigrationCommandRunner runner, RetainedCutoverRecoveryPhase phase) {
        long deadline = System.nanoTime() + SECONDS.toNanos(5);
        while (!runner.activeRecoveryPhase().equals(Optional.of(phase))
                && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(runner.activeRecoveryPhase()).contains(phase);
    }

    private static Optional<MigrationView> awaitReadable(DeploymentMigrationCommandRunner runner) {
        long deadline = System.nanoTime() + SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            try {
                return runner.find(OPERATION);
            } catch (MigrationOperationStoreException pending) {
                assertThat(pending.errorCode()).isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
                Thread.onSpinWait();
            }
        }
        return runner.find(OPERATION);
    }

    private static void awaitState(Thread thread, Thread.State expected) {
        long deadline = System.nanoTime() + SECONDS.toNanos(5);
        while (thread.getState() != expected && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(thread.getState()).isEqualTo(expected);
    }

    private static MetadataMigrationRequest request() {
        return new MetadataMigrationRequest(
                OPERATION, MigrationTarget.MYSQL,
                new MetadataDatabaseConfiguration(
                        MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat", "migration", "password-a"),
                ApplyMode.MANAGED_WRITE);
    }

    private static MigrationOperationSnapshot pending() {
        return new MigrationOperationSnapshot(
                OPERATION, MigrationOperationState.PENDING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0, NOW, null, null,
                VerificationState.PENDING,
                null, null, 1000, false, false, false, IDENTITY,
                MigrationCandidateGeneration.fromOperationId(OPERATION));
    }

    private static final class MigrationViewAssert {

        private MigrationViewAssert() {
        }

        static void running(MigrationView view) {
            assertThat(view.state()).isEqualTo(MigrationOperationState.RUNNING);
            assertThat(view.stage()).isEqualTo(MigrationStage.COPYING);
        }
    }
}
