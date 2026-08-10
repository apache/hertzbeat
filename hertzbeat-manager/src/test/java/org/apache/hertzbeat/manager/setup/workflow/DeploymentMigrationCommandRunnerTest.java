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
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;

@Timeout(15)
class DeploymentMigrationCommandRunnerTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final Instant NOW = Instant.parse("2026-08-10T04:00:00Z");

    @TempDir
    private Path root;

    @Test
    void returnsOnlyAfterDurableRunningBarrierAndBeforeCopyCompletion() throws Exception {
        Fixture fixture = fixture();
        CountDownLatch preparationReturned = new CountDownLatch(1);
        CountDownLatch releaseCopy = new CountDownLatch(1);
        when(fixture.coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    RetainedCutoverPreparation preparation = invocation.getArgument(5);
                    preparation.prepare(
                            new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                            invocation.getArgument(1), invocation.getArgument(2));
                    preparationReturned.countDown();
                    assertThat(releaseCopy.await(5, SECONDS)).isTrue();
                    return new RetainedCutoverResult(
                            OPERATION, IDENTITY, RetainedCutoverResult.Status.RETAINED_SUCCESS);
                });

        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            try {
                MigrationView view = runner.start(request(OPERATION, ApplyMode.MANAGED_WRITE, "password-a"));

                assertThat(preparationReturned.getCount()).isZero();
                assertThat(view.state()).isEqualTo(MigrationOperationState.RUNNING);
                assertThat(view.stage()).isEqualTo(MigrationStage.COPYING);
                assertThat(view.progressPercent()).isZero();
                assertThat(fixture.store.find(OPERATION).orElseThrow().managedCandidateGeneration())
                        .isEqualTo(generation(OPERATION));
            } finally {
                releaseCopy.countDown();
            }
        }
    }

    @Test
    void sameActiveOperationJoinsOneBarrierWithoutDereferencingReplacementPassword() throws Exception {
        Fixture fixture = fixture();
        CountDownLatch releaseCopy = new CountDownLatch(1);
        when(fixture.coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    RetainedCutoverPreparation preparation = invocation.getArgument(5);
                    preparation.prepare(
                            new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                            invocation.getArgument(1), invocation.getArgument(2));
                    assertThat(releaseCopy.await(5, SECONDS)).isTrue();
                    return new RetainedCutoverResult(
                            OPERATION, IDENTITY, RetainedCutoverResult.Status.RETAINED_SUCCESS);
                });

        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            try {
                MigrationView first = runner.start(request(OPERATION, ApplyMode.MANAGED_WRITE, "password-a"));
                MigrationView joined = runner.start(request(OPERATION, ApplyMode.MANAGED_WRITE, null));

                assertThat(joined).isEqualTo(first);
                assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                        () -> runner.start(mysqlRequest(
                                OPERATION, "jdbc:mysql://other.example/hertzbeat", "migration", null)));
                verify(fixture.coordinator).execute(any(), any(), any(), any(), any(), any(), any());
            } finally {
                releaseCopy.countDown();
            }
        }
    }

    @Test
    void persistedRunningAndReadyReplayWithoutCredentialOrCoordinatorAccess() {
        assertPersistedReplay(running(27));
        assertPersistedReplay(ready());
    }

    @Test
    void externalApplyIsRejectedBeforeSlotSecretAndCorruptStoreAccess() throws Exception {
        Path journal = root.resolve(FileMigrationOperationStore.RELATIVE_PATH);
        java.nio.file.Files.createDirectories(journal.getParent());
        java.nio.file.Files.writeString(journal, "schema=99\n");
        Fixture fixture = fixture();

        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            assertStoreError(SetupErrorCode.INVALID_REQUEST, () -> runner.start(
                    request(OPERATION, ApplyMode.EXTERNAL_APPLY, null)));
        }
        verify(fixture.coordinator, never()).execute(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void foreignActiveAndPersistedTargetOrApplyMismatchConflict() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        store.create(pending("operation-b", MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE));
        Fixture foreign = fixture(store);
        try (DeploymentMigrationCommandRunner runner = foreign.runner()) {
            assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                    () -> runner.start(request(OPERATION, ApplyMode.MANAGED_WRITE, "password-a")));
        }

        Path secondRoot = root.resolve("second");
        FileMigrationOperationStore mismatchStore = new FileMigrationOperationStore(secondRoot);
        mismatchStore.create(pending(OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE));
        mismatchStore.compareAndTransition(
                OPERATION, MigrationOperationState.PENDING, running(0));
        Fixture mismatch = fixture(mismatchStore);
        try (DeploymentMigrationCommandRunner runner = mismatch.runner()) {
            assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                    () -> runner.start(postgresRequest(OPERATION)));
        }

        FileMigrationOperationStore applyStore = new FileMigrationOperationStore(root.resolve("apply"));
        applyStore.create(pending(OPERATION, MigrationTarget.MYSQL, ApplyMode.EXTERNAL_APPLY));
        Fixture applyMismatch = fixture(applyStore);
        try (DeploymentMigrationCommandRunner runner = applyMismatch.runner()) {
            assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                    () -> runner.start(request(OPERATION, ApplyMode.MANAGED_WRITE, "password-a")));
        }
    }

    @Test
    void preparationErrorStillPublishesAuthoritativeTerminalViewBeforeWorkerPropagates() throws Exception {
        Fixture fixture = fixture();
        doReturn(new MetadataTargetStageResult(StageOutcome.SOURCE_UNSUPPORTED, Optional.empty()))
                .when(fixture.configuration).stageMetadataTarget(any(), any(), any(), any(), any());
        when(fixture.coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    RetainedCutoverPreparation preparation = invocation.getArgument(5);
                    preparation.prepare(
                            new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                            invocation.getArgument(1), invocation.getArgument(2));
                    throw new AssertionError("unreachable");
                });

        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            MigrationView view = runner.start(request(OPERATION, ApplyMode.MANAGED_WRITE, "password-a"));
            assertThat(view.state()).isEqualTo(MigrationOperationState.FAILED);
            assertThat(view.errorCode()).isEqualTo(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
        }
    }

    @Test
    void preparationErrorWinsAfterAuthoritativeJournalValidation() throws Exception {
        Fixture fixture = fixture();
        AssertionError fatal = new AssertionError("fatal-preparation");
        doThrow(fatal).when(fixture.configuration)
                .stageMetadataTarget(any(), any(), any(), any(), any());
        when(fixture.coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    RetainedCutoverPreparation preparation = invocation.getArgument(5);
                    preparation.prepare(
                            new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                            invocation.getArgument(1), invocation.getArgument(2));
                    throw new AssertionError("unreachable");
                });

        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            assertThatThrownBy(() -> runner.start(
                    request(OPERATION, ApplyMode.MANAGED_WRITE, "password-a")))
                    .isSameAs(fatal);
        }
        assertThat(fixture.store.find(OPERATION).orElseThrow().state())
                .isEqualTo(MigrationOperationState.PENDING);
    }

    @Test
    void workerStartTimeDoesNotReusePersistedPendingCreationTime() throws Exception {
        Instant createdAt = NOW.minusSeconds(300);
        FileMigrationOperationStore store = new FileMigrationOperationStore(root.resolve("started-at"));
        store.create(pendingAt(createdAt));
        Fixture fixture = fixture(store);
        when(fixture.coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    RetainedCutoverPreparation preparation = invocation.getArgument(5);
                    preparation.prepare(
                            new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                            invocation.getArgument(1), invocation.getArgument(2));
                    return new RetainedCutoverResult(
                            OPERATION, IDENTITY, RetainedCutoverResult.Status.RETAINED_SUCCESS);
                });
        AtomicReference<Instant> currentTime = new AtomicReference<>(NOW);
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenAnswer(ignored -> currentTime.get());
        ExecutorService worker = Executors.newSingleThreadExecutor();
        CountDownLatch workerOccupied = new CountDownLatch(1);
        CountDownLatch releaseWorker = new CountDownLatch(1);
        worker.execute(() -> {
            workerOccupied.countDown();
            try {
                assertThat(releaseWorker.await(5, SECONDS)).isTrue();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
        });
        assertThat(workerOccupied.await(5, SECONDS)).isTrue();
        DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                store, fixture.configuration, fixture.coordinator, clock,
                Duration.ofSeconds(30), worker);
        CompletableFuture<MigrationView> started = CompletableFuture.supplyAsync(() -> runner.start(
                request(OPERATION, ApplyMode.MANAGED_WRITE, "password-a")));
        try {
            awaitActive(runner);
            Instant workerStartedAt = NOW.plusSeconds(45);
            currentTime.set(workerStartedAt);
            releaseWorker.countDown();

            assertThat(started.get(5, SECONDS).startedAt()).isEqualTo(workerStartedAt);
            assertThat(store.find(OPERATION).orElseThrow().startedAt()).isEqualTo(workerStartedAt);
        } finally {
            releaseWorker.countDown();
            runner.close();
        }
    }

    @Test
    void taskOwnsCopiedSecretAndNeverRetainsTheRequestDto() throws Exception {
        Fixture fixture = fixture();
        AtomicReference<SecretValue> captured = new AtomicReference<>();
        CountDownLatch workerExited = new CountDownLatch(1);
        when(fixture.coordinator.execute(any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    captured.set(invocation.getArgument(2));
                    RetainedCutoverPreparation preparation = invocation.getArgument(5);
                    preparation.prepare(
                            new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                            invocation.getArgument(1), invocation.getArgument(2));
                    workerExited.countDown();
                    throw new AssertionError("fatal-after-preparation");
                });

        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            runner.start(request(OPERATION, ApplyMode.MANAGED_WRITE, "password-a"));
            assertThat(workerExited.await(5, SECONDS)).isTrue();
        }
        assertThat(captured.get().copy()).containsOnly('\0');
        assertThat(MigrationCommandTask.class.getDeclaredFields())
                .allSatisfy(field -> assertThat(field.getType()).isNotEqualTo(MetadataMigrationRequest.class));
    }

    private void assertPersistedReplay(MigrationOperationSnapshot snapshot) {
        Path replayRoot = root.resolve(snapshot.stage().name());
        FileMigrationOperationStore store = new FileMigrationOperationStore(replayRoot);
        store.create(pending(OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE));
        store.compareAndTransition(OPERATION, MigrationOperationState.PENDING, running(0));
        if (!snapshot.equals(running(0))) {
            if (snapshot.stage() == MigrationStage.COPYING) {
                store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING, snapshot);
            } else {
                store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING, verifying());
                store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING, snapshot);
            }
        }
        Fixture fixture = fixture(store);
        try (DeploymentMigrationCommandRunner runner = fixture.runner()) {
            MigrationView view = runner.start(request(OPERATION, ApplyMode.MANAGED_WRITE, null));
            assertThat(view.state()).isEqualTo(snapshot.state());
            assertThat(view.stage()).isEqualTo(snapshot.stage());
        }
        verify(fixture.coordinator, never()).execute(any(), any(), any(), any(), any(), any(), any());
    }

    private Fixture fixture() {
        return fixture(new FileMigrationOperationStore(root));
    }

    private Fixture fixture(FileMigrationOperationStore store) {
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
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
        return new Fixture(store, coordinator, configuration);
    }

    private record Fixture(
            FileMigrationOperationStore store,
            RetainedCutoverCoordinator coordinator,
            ManagedMigrationConfigurationTransaction configuration) {

        DeploymentMigrationCommandRunner runner() {
            ExecutorService worker = Executors.newSingleThreadExecutor();
            return new DeploymentMigrationCommandRunner(
                    store, configuration, coordinator, Clock.fixed(NOW, ZoneOffset.UTC),
                    Duration.ofSeconds(30), worker);
        }
    }

    private static MetadataMigrationRequest request(
            String operationId, ApplyMode applyMode, String password) {
        return mysqlRequest(
                operationId, "jdbc:mysql://db.example/hertzbeat", "migration", password, applyMode);
    }

    private static MetadataMigrationRequest mysqlRequest(
            String operationId, String jdbcUrl, String username, String password) {
        return mysqlRequest(operationId, jdbcUrl, username, password, ApplyMode.MANAGED_WRITE);
    }

    private static MetadataMigrationRequest mysqlRequest(
            String operationId, String jdbcUrl, String username, String password, ApplyMode applyMode) {
        return new MetadataMigrationRequest(
                operationId, MigrationTarget.MYSQL,
                new MetadataDatabaseConfiguration(
                        MetadataDatabaseKind.MYSQL, jdbcUrl, username, password),
                applyMode);
    }

    private static MetadataMigrationRequest postgresRequest(String operationId) {
        return new MetadataMigrationRequest(
                operationId, MigrationTarget.POSTGRESQL,
                new MetadataDatabaseConfiguration(
                        MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat", "migration", null),
                ApplyMode.MANAGED_WRITE);
    }

    private static MigrationOperationSnapshot pending(
            String operationId, MigrationTarget target, ApplyMode applyMode) {
        return snapshot(operationId, target, applyMode, MigrationOperationState.PENDING,
                MigrationStage.QUEUED, 0, null, VerificationState.PENDING, null, 1000);
    }

    private static MigrationOperationSnapshot pendingAt(Instant createdAt) {
        return new MigrationOperationSnapshot(
                OPERATION, MigrationOperationState.PENDING, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0, createdAt,
                null, null, VerificationState.PENDING, null, null, 1000,
                false, false, false, IDENTITY, generation(OPERATION));
    }

    private static MigrationOperationSnapshot running(int progress) {
        return snapshot(OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                MigrationOperationState.RUNNING, MigrationStage.COPYING, progress, NOW,
                VerificationState.PENDING, null, 1000);
    }

    private static MigrationOperationSnapshot verifying() {
        return snapshot(OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                MigrationOperationState.RUNNING, MigrationStage.VERIFYING, 100, NOW,
                VerificationState.RUNNING, null, 1000);
    }

    private static MigrationOperationSnapshot ready() {
        return snapshot(OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                MigrationOperationState.READY_TO_ACTIVATE, MigrationStage.READY_TO_ACTIVATE, 100, NOW,
                VerificationState.SUCCEEDED, null, 0);
    }

    private static MigrationOperationSnapshot snapshot(
            String operationId, MigrationTarget target, ApplyMode applyMode,
            MigrationOperationState state, MigrationStage stage, int progress,
            Instant startedAt, VerificationState verification, SetupErrorCode error, long poll) {
        return new MigrationOperationSnapshot(
                operationId, state, target, applyMode, stage, progress, NOW, startedAt, null,
                verification, error, null, poll,
                state == MigrationOperationState.READY_TO_ACTIVATE, false, false,
                IDENTITY, applyMode == ApplyMode.MANAGED_WRITE ? generation(operationId) : null);
    }

    private static String generation(String operationId) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(operationId.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new AssertionError(impossible);
        }
    }

    private static void assertStoreError(SetupErrorCode code, ThrowingAction action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                        failure -> assertThat(failure.errorCode()).isEqualTo(code));
    }

    private static void awaitActive(DeploymentMigrationCommandRunner runner) {
        long deadline = System.nanoTime() + SECONDS.toNanos(5);
        while (runner.activeOperationId().isEmpty() && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(runner.activeOperationId()).contains(OPERATION);
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run();
    }
}
