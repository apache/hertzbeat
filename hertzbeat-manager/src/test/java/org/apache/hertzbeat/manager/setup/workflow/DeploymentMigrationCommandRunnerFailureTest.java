/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
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

@Timeout(15)
class DeploymentMigrationCommandRunnerFailureTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "b".repeat(64);
    private static final Instant NOW = Instant.parse("2026-08-10T05:00:00Z");

    @TempDir
    private Path root;

    @Test
    void knownCleanupCopyAndVerificationFailuresBecomeDurableTerminalStates() throws Exception {
        assertKnownFailure(MetadataMigrationStage.COPYING, 43,
                MetadataMigrationErrorCode.COPY, SetupErrorCode.MIGRATION_COPY_FAILED, 43);
        assertKnownFailure(MetadataMigrationStage.COPYING, 43,
                MetadataMigrationErrorCode.SCHEMA, SetupErrorCode.MIGRATION_COPY_FAILED, 43);
        assertKnownFailure(MetadataMigrationStage.VERIFYING, 65,
                MetadataMigrationErrorCode.VERIFICATION,
                SetupErrorCode.MIGRATION_VERIFICATION_FAILED, 100);
        assertKnownFailure(MetadataMigrationStage.VERIFYING, 65,
                MetadataMigrationErrorCode.SEQUENCE,
                SetupErrorCode.MIGRATION_VERIFICATION_FAILED, 100);
    }

    @Test
    void timeoutOutcomeUnknownReleaseRequiredHandoffAndErrorRemainNonterminal() throws Exception {
        assertNonterminal(new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT));
        assertNonterminal(new MetadataMigrationException(MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN));
        assertNonterminal(new MetadataMigrationException(MetadataMigrationErrorCode.ROLLBACK_OUTCOME_UNKNOWN));
        assertNonterminal(new RetainedCutoverReleaseRequiredException());
        assertNonterminal(new RetainedCopyJournalHandoffException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        assertNonterminal(new TargetSchemaProvisioningException(
                MetadataDatabaseKind.MYSQL,
                new TargetSchemaProvisioningFailure(
                        TargetSchemaProvisioningFailure.Phase.PRECONDITION, "B206", null, 0)));
        assertNonterminal(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.UNAVAILABLE));
        assertNonterminal(MigrationMaintenanceException.maintenanceFailure());
        assertNonterminal(new RetainedCutoverException(RetainedCutoverErrorCode.EXECUTION_FAILED));
        assertNonterminal(new AssertionError("fatal-copy"));
    }

    @Test
    void progressJournalIsMonotonicAndUsesOnlyCoarseCopyAndVerificationStates() {
        FileMigrationOperationStore store = preparedStore();
        MigrationProgressJournal progress = new MigrationProgressJournal(OPERATION, store);

        progress.report(MetadataMigrationStage.COPYING, 12);
        progress.report(MetadataMigrationStage.COPYING, 47);
        progress.report(MetadataMigrationStage.COPYING, 30);
        assertThat(store.find(OPERATION).orElseThrow().progressPercent()).isEqualTo(47);

        progress.report(MetadataMigrationStage.VERIFYING, 65);
        MigrationOperationSnapshot verifying = store.find(OPERATION).orElseThrow();
        assertThat(verifying.stage()).isEqualTo(MigrationStage.VERIFYING);
        assertThat(verifying.progressPercent()).isEqualTo(100);
        assertThat(verifying.verificationState()).isEqualTo(VerificationState.RUNNING);

        progress.report(MetadataMigrationStage.REPAIRING, 90);
        progress.report(MetadataMigrationStage.COMPLETE, 100);
        assertThat(store.find(OPERATION)).contains(verifying);
    }

    @Test
    void workerRejectionClearsTheSlotAndClosesTaskSecret() {
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        ManagedMigrationConfigurationTransaction configuration = configuration();
        ExecutorService rejected = mock(ExecutorService.class);
        when(rejected.isShutdown()).thenReturn(false);
        when(rejected.isTerminated()).thenReturn(true);
        org.mockito.Mockito.doThrow(new RejectedExecutionException("private executor detail"))
                .when(rejected).execute(any());
        DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                new FileMigrationOperationStore(root), configuration, coordinator,
                Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofSeconds(30), rejected);

        assertThatThrownBy(() -> runner.start(request()))
                .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                        failure -> assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.MIGRATION_UNAVAILABLE))
                .hasNoCause()
                .hasMessageNotContaining("private");
        assertThat(runner.activeOperationId()).isEmpty();
        runner.close();
    }

    @Test
    void defaultWorkerIsSingleDaemonWithZeroQueue() throws Exception {
        java.util.concurrent.ThreadPoolExecutor worker = MigrationCommandWorker.create();
        try {
            assertThat(worker.getCorePoolSize()).isOne();
            assertThat(worker.getMaximumPoolSize()).isOne();
            assertThat(worker.getQueue()).isInstanceOf(java.util.concurrent.SynchronousQueue.class);
            CountDownLatch observed = new CountDownLatch(1);
            java.util.concurrent.atomic.AtomicBoolean daemon = new java.util.concurrent.atomic.AtomicBoolean();
            worker.execute(() -> {
                daemon.set(Thread.currentThread().isDaemon());
                observed.countDown();
            });
            assertThat(observed.await(5, SECONDS)).isTrue();
            assertThat(daemon).isTrue();
        } finally {
            worker.shutdownNow();
        }
    }

    @Test
    void closeRejectsNewCommandsWaitsForWorkerAndDoesNotReleaseRetainedFence() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("close"));
        ManagedMigrationConfigurationTransaction configuration = configuration();
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        CountDownLatch releaseCopy = new CountDownLatch(1);
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    RetainedCutoverPreparation preparation = invocation.getArgument(5);
                    preparation.prepare(
                            new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                            invocation.getArgument(1), invocation.getArgument(2));
                    assertThat(releaseCopy.await(5, SECONDS)).isTrue();
                    return new RetainedCutoverResult(
                            OPERATION, IDENTITY, RetainedCutoverResult.Status.RETAINED_SUCCESS);
                });
        DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                store, configuration, coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                Duration.ofSeconds(30), Executors.newSingleThreadExecutor());
        runner.start(request());
        Thread closer = Thread.ofPlatform().unstarted(runner::close);
        closer.start();
        try {
            awaitWaiting(closer);
            assertThatThrownBy(() -> runner.start(request()))
                    .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                            failure -> assertThat(failure.errorCode())
                                    .isEqualTo(SetupErrorCode.MIGRATION_UNAVAILABLE));
            assertThat(closer.isAlive()).isTrue();
            verify(coordinator, never()).releaseRetained(any());
        } finally {
            releaseCopy.countDown();
            closer.join(5000);
        }
        assertThat(closer.isAlive()).isFalse();
    }

    private void assertKnownFailure(
            MetadataMigrationStage stage,
            int percent,
            MetadataMigrationErrorCode copyFailure,
            SetupErrorCode expected,
            int expectedProgress) throws Exception {
        Path caseRoot = root.resolve(copyFailure.name());
        Fixture fixture = fixture(caseRoot, new MetadataMigrationException(copyFailure), stage, percent);
        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            runner.start(request());
            assertThat(fixture.workerDone.await(5, SECONDS)).isTrue();
        }
        MigrationOperationSnapshot terminal = fixture.store.find(OPERATION).orElseThrow();
        assertThat(terminal.state()).isEqualTo(MigrationOperationState.FAILED);
        assertThat(terminal.errorCode()).isEqualTo(expected);
        assertThat(terminal.progressPercent()).isEqualTo(expectedProgress);
    }

    private void assertNonterminal(Throwable failure) throws Exception {
        Path caseRoot = root.resolve(failure.getClass().getSimpleName()
                + (failure instanceof MetadataMigrationException metadata ? metadata.code().name() : ""));
        Fixture fixture = fixture(caseRoot, failure, MetadataMigrationStage.COPYING, 31);
        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            runner.start(request());
            assertThat(fixture.workerDone.await(5, SECONDS)).isTrue();
        }
        MigrationOperationSnapshot current = fixture.store.find(OPERATION).orElseThrow();
        assertThat(current.state()).isEqualTo(MigrationOperationState.RUNNING);
        assertThat(current.stage()).isEqualTo(MigrationStage.COPYING);
        assertThat(current.progressPercent()).isEqualTo(31);
    }

    private Fixture fixture(
            Path caseRoot, Throwable failure, MetadataMigrationStage stage, int percent) {
        FileMigrationOperationStore store = new FileMigrationOperationStore(caseRoot);
        ManagedMigrationConfigurationTransaction configuration = configuration();
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        CountDownLatch workerDone = new CountDownLatch(1);
        when(coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    try {
                        RetainedCutoverPreparation preparation = invocation.getArgument(5);
                        preparation.prepare(
                                new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                                invocation.getArgument(1), invocation.getArgument(2));
                        MetadataMigrationProgressSink progress = invocation.getArgument(4);
                        progress.report(stage, percent);
                        if (failure instanceof Error error) {
                            throw error;
                        }
                        throw (RuntimeException) failure;
                    } finally {
                        workerDone.countDown();
                    }
                });
        return new Fixture(store, configuration, coordinator, workerDone);
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
        } catch (java.io.IOException impossible) {
            throw new AssertionError(impossible);
        }
        return configuration;
    }

    private FileMigrationOperationStore preparedStore() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("progress"));
        Instant created = NOW;
        String generation = MigrationCandidateGeneration.fromOperationId(OPERATION);
        MigrationOperationSnapshot pending = new MigrationOperationSnapshot(
                OPERATION, MigrationOperationState.PENDING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0, created, null, null,
                VerificationState.PENDING, null, null, 1000, false, false, false,
                IDENTITY, generation);
        MigrationOperationSnapshot running = new MigrationOperationSnapshot(
                OPERATION, MigrationOperationState.RUNNING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.COPYING, 0, created, created, null,
                VerificationState.PENDING, null, null, 1000, false, false, false,
                IDENTITY, generation);
        store.create(pending);
        store.compareAndTransition(OPERATION, MigrationOperationState.PENDING, running);
        return store;
    }

    private record Fixture(
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration,
            RetainedCutoverCoordinator coordinator,
            CountDownLatch workerDone) {

        DeploymentMigrationCommandRunner runner() {
            return new DeploymentMigrationCommandRunner(
                    store, configuration, coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                    Duration.ofSeconds(30), Executors.newSingleThreadExecutor());
        }
    }

    private static MetadataMigrationRequest request() {
        return new MetadataMigrationRequest(
                OPERATION, MigrationTarget.MYSQL,
                new MetadataDatabaseConfiguration(
                        MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat", "migration", "password-a"),
                ApplyMode.MANAGED_WRITE);
    }

    private static void awaitWaiting(Thread thread) {
        long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(5);
        while (thread.getState() != Thread.State.WAITING
                && thread.getState() != Thread.State.TIMED_WAITING
                && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(thread.getState()).isIn(Thread.State.WAITING, Thread.State.TIMED_WAITING);
    }
}
