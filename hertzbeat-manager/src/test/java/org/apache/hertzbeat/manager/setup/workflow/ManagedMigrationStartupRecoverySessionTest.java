/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ManagedMigrationStartupRecoverySessionTest {

    private static final String OPERATION = "operation-a";
    private static final String GENERATION = "candidate-generation";
    private static final String IDENTITY = "a".repeat(64);
    private static final Instant CREATED = Instant.parse("2026-08-10T08:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);

    @TempDir
    private Path root;

    @Test
    void bindsTheExactActionableDraftOnceAndReusesTheRuntimeAcrossRetries() {
        FileMigrationOperationStore store = seededAwaitingRestart(root);
        ManagedMigrationStartupRecoveryRuntime runtime = mock(ManagedMigrationStartupRecoveryRuntime.class);
        AtomicReference<DurableCutoverDraft> observed = new AtomicReference<>();
        when(runtime.reconcile(any())).thenAnswer(invocation -> {
            observed.compareAndSet(null, invocation.getArgument(0));
            assertThat(invocation.<DurableCutoverDraft>getArgument(0)).isEqualTo(observed.get());
            return MigrationStartupReconciliation.GATED;
        });

        try (ManagedMigrationStartupRecoverySession session =
                     new ManagedMigrationStartupRecoverySession(root, store, runtime)) {
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
        }

        assertThat(observed.get()).isEqualTo(draft());
        verify(runtime, times(2)).reconcile(observed.get());
        verify(runtime).close();
    }

    @Test
    void invokesRuntimeOnlyForTheThreeManagedRestartRecoveryShapes() {
        for (MigrationOperationSnapshot snapshot : new MigrationOperationSnapshot[] {
                activatingSnapshot(), awaitingRestartSnapshot(), rollingBackSnapshot(),
                activationRollbackSnapshot()
        }) {
            Path caseRoot = root.resolve(snapshot.stage().name() + '-' + snapshot.rollbackOrigin());
            FileMigrationOperationStore store = seedSnapshot(caseRoot, snapshot);
            ManagedMigrationStartupRecoveryRuntime runtime = mock(ManagedMigrationStartupRecoveryRuntime.class);
            when(runtime.reconcile(any())).thenReturn(MigrationStartupReconciliation.GATED);

            try (ManagedMigrationStartupRecoverySession session =
                         new ManagedMigrationStartupRecoverySession(caseRoot, store, runtime)) {
                assertThat(session.reconcile())
                        .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
            }

            verify(runtime).reconcile(draft());
        }
    }

    @Test
    void verificationFailureRollbackRemainsGatedWithoutRuntimeWork() {
        MigrationOperationSnapshot invalid = rollbackSnapshot(MigrationRollbackOrigin.VERIFICATION_FAILURE);
        FileMigrationOperationStore store = mock(FileMigrationOperationStore.class);
        when(store.selectUniqueNonterminalForStartup()).thenReturn(Optional.of(invalid));
        ManagedMigrationStartupRecoveryRuntime runtime = mock(ManagedMigrationStartupRecoveryRuntime.class);

        try (ManagedMigrationStartupRecoverySession session =
                     new ManagedMigrationStartupRecoverySession(root, store, runtime)) {
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
        }

        verify(runtime, never()).reconcile(any());
    }

    @Test
    void cachesManagedConvergenceAsFullGatedReloadWithoutFurtherRuntimeWork() {
        FileMigrationOperationStore store = seededAwaitingRestart(root);
        ManagedMigrationStartupRecoveryRuntime runtime = mock(ManagedMigrationStartupRecoveryRuntime.class);
        when(runtime.reconcile(any()))
                .thenReturn(MigrationStartupReconciliation.SUCCEEDED,
                        MigrationStartupReconciliation.NO_MIGRATION);

        try (ManagedMigrationStartupRecoverySession session =
                     new ManagedMigrationStartupRecoverySession(root, store, runtime)) {
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.RELOAD_FULL_GATED);
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.RELOAD_FULL_GATED);
        }

        verify(runtime, times(1)).reconcile(any());
    }

    @Test
    void boundRecordDisappearanceBeforeTerminalConvergenceRemainsGated() {
        FileMigrationOperationStore store = seededAwaitingRestart(root);
        ManagedMigrationStartupRecoveryRuntime runtime = mock(ManagedMigrationStartupRecoveryRuntime.class);
        when(runtime.reconcile(any())).thenReturn(MigrationStartupReconciliation.NO_MIGRATION);

        try (ManagedMigrationStartupRecoverySession session =
                     new ManagedMigrationStartupRecoverySession(root, store, runtime)) {
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
        }

        verify(runtime, times(2)).reconcile(any());
    }

    @Test
    void terminalHistoryIsPermanentlyNoMigrationForThisSession() {
        FileMigrationOperationStore store = seededAwaitingRestart(root);
        MigrationOperationSnapshot awaiting = store.find(OPERATION).orElseThrow();
        store.compareAndTransition(OPERATION, MigrationOperationState.AWAITING_RESTART,
                new MigrationStartupSnapshots(awaiting).succeeded(CREATED.plusSeconds(10)));
        ManagedMigrationStartupRecoveryRuntime runtime = mock(ManagedMigrationStartupRecoveryRuntime.class);

        try (ManagedMigrationStartupRecoverySession session =
                     new ManagedMigrationStartupRecoverySession(root, store, runtime)) {
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION);
            store.create(foreignPending());
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION);
        }

        verify(runtime, never()).reconcile(any());
    }

    @Test
    void gatesPendingCopyVerifyReadyAndExternalWithoutConstructingRuntimeWork() {
        for (MigrationOperationSnapshot snapshot : new MigrationOperationSnapshot[] {
                new DurableCutoverSnapshots(draft(), IDENTITY).cleanPending(),
                new DurableCutoverSnapshots(draft(), IDENTITY).running(),
                verifyingSnapshot(),
                readySnapshot(),
                externalPending()
        }) {
            Path caseRoot = root.resolve(snapshot.operationId() + '-' + snapshot.stage().name());
            FileMigrationOperationStore store = new FileMigrationOperationStore(caseRoot);
            store.createOrConfirm(snapshot.state() == MigrationOperationState.PENDING
                    ? snapshot : initialFor(snapshot));
            advance(store, snapshot);
            ManagedMigrationStartupRecoveryRuntime runtime = mock(ManagedMigrationStartupRecoveryRuntime.class);

            try (ManagedMigrationStartupRecoverySession session =
                         new ManagedMigrationStartupRecoverySession(caseRoot, store, runtime)) {
                assertThat(session.reconcile())
                        .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
                assertThat(session.reconcile())
                        .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
            }

            verify(runtime, never()).reconcile(any());
        }
    }

    @Test
    void gatesJournalConflictAndSafeRuntimeFailuresButPreservesFatalError() {
        FileMigrationOperationStore corrupt = mock(FileMigrationOperationStore.class);
        when(corrupt.selectUniqueNonterminalForStartup())
                .thenThrow(new MigrationOperationStoreException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        ManagedMigrationStartupRecoveryRuntime unused = mock(ManagedMigrationStartupRecoveryRuntime.class);
        try (ManagedMigrationStartupRecoverySession session =
                     new ManagedMigrationStartupRecoverySession(root, corrupt, unused)) {
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
        }
        verify(unused, never()).reconcile(any());

        ManagedMigrationStartupRecoveryRuntime failing = mock(ManagedMigrationStartupRecoveryRuntime.class);
        when(failing.reconcile(any()))
                .thenThrow(new MigrationStartupReconciliationException(
                        SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        try (ManagedMigrationStartupRecoverySession session = new ManagedMigrationStartupRecoverySession(
                root.resolve("failure"), seededAwaitingRestart(root.resolve("failure")), failing)) {
            assertThat(session.reconcile())
                    .isEqualTo(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
        }

        AssertionError fatal = new AssertionError("private fatal");
        ManagedMigrationStartupRecoveryRuntime fatalRuntime = mock(ManagedMigrationStartupRecoveryRuntime.class);
        when(fatalRuntime.reconcile(any())).thenThrow(fatal);
        try (ManagedMigrationStartupRecoverySession session = new ManagedMigrationStartupRecoverySession(
                root.resolve("fatal"), seededAwaitingRestart(root.resolve("fatal")), fatalRuntime)) {
            assertThatThrownBy(session::reconcile).isSameAs(fatal);
        }
    }

    @Test
    void closeRetriesRuntimeCleanupAndPreservesFatal() {
        ManagedMigrationStartupRecoveryRuntime runtime = mock(ManagedMigrationStartupRecoveryRuntime.class);
        AssertionError fatal = new AssertionError("private cleanup fatal");
        org.mockito.Mockito.doThrow(fatal).doNothing().when(runtime).close();
        ManagedMigrationStartupRecoverySession session =
                new ManagedMigrationStartupRecoverySession(root, new FileMigrationOperationStore(root), runtime);

        assertThatThrownBy(session::close).isSameAs(fatal);
        session.close();
        session.close();

        verify(runtime, times(2)).close();
    }

    @Test
    void publicDispositionAndSessionDoNotExposeCredentialsOrJdbcHandles() {
        assertThat(ManagedMigrationStartupRecoveryDisposition.values())
                .extracting(Enum::name)
                .containsExactly("NO_MIGRATION", "GATED_RECOVERY", "RELOAD_FULL_GATED");
        assertThat(ManagedMigrationStartupRecoverySession.class.getDeclaredFields())
                .extracting(field -> field.getType().getName())
                .noneMatch(name -> name.contains("SecretValue")
                        || name.contains("Connection")
                        || name.contains("DataSource"));
    }

    private static FileMigrationOperationStore seededAwaitingRestart(Path root) {
        FileMigrationOperationStore store = seededReady(root);
        MigrationOperationSnapshot ready = store.find(OPERATION).orElseThrow();
        MigrationOperationSnapshot activating = new RetainedManagedActivationSnapshots(ready).activatingSnapshot();
        store.compareAndTransition(OPERATION, MigrationOperationState.READY_TO_ACTIVATE, activating);
        store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING,
                new RetainedManagedActivationSnapshots(activating).awaitingRestartSnapshot());
        return store;
    }

    private static FileMigrationOperationStore seededReady(Path root) {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot ready = readySnapshot();
        MigrationOperationSnapshot pending = new DurableCutoverSnapshots(draft(), IDENTITY).cleanPending();
        store.createOrConfirm(pending);
        store.compareAndTransition(OPERATION, MigrationOperationState.PENDING,
                new DurableCutoverSnapshots(draft(), IDENTITY).running());
        MigrationOperationSnapshot running = store.find(OPERATION).orElseThrow();
        store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING,
                new RetainedCopyJournalSnapshots(running).verifyingSnapshot());
        store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING, ready);
        return store;
    }

    private static FileMigrationOperationStore seedSnapshot(
            Path root, MigrationOperationSnapshot target) {
        if (target.stage() == MigrationStage.ACTIVATING) {
            FileMigrationOperationStore store = seededReady(root);
            store.compareAndTransition(OPERATION, MigrationOperationState.READY_TO_ACTIVATE, target);
            return store;
        }
        if (target.stage() == MigrationStage.ROLLING_BACK
                && target.rollbackOrigin() == MigrationRollbackOrigin.ACTIVATION_FAILURE) {
            FileMigrationOperationStore store = seededReady(root);
            store.compareAndTransition(OPERATION, MigrationOperationState.READY_TO_ACTIVATE, target);
            return store;
        }
        FileMigrationOperationStore store = seededAwaitingRestart(root);
        if (target.stage() == MigrationStage.ROLLING_BACK) {
            store.compareAndTransition(OPERATION, MigrationOperationState.AWAITING_RESTART, target);
        }
        return store;
    }

    private static MigrationOperationSnapshot activatingSnapshot() {
        return new RetainedManagedActivationSnapshots(readySnapshot()).activatingSnapshot();
    }

    private static MigrationOperationSnapshot awaitingRestartSnapshot() {
        return new RetainedManagedActivationSnapshots(activatingSnapshot()).awaitingRestartSnapshot();
    }

    private static MigrationOperationSnapshot rollingBackSnapshot() {
        return new MigrationStartupSnapshots(awaitingRestartSnapshot()).rollingBack();
    }

    private static MigrationOperationSnapshot activationRollbackSnapshot() {
        return rollbackSnapshot(MigrationRollbackOrigin.ACTIVATION_FAILURE);
    }

    private static MigrationOperationSnapshot rollbackSnapshot(MigrationRollbackOrigin origin) {
        MigrationOperationSnapshot source = readySnapshot();
        return new MigrationOperationSnapshot(
                source.operationId(), MigrationOperationState.RUNNING, source.target(), source.applyMode(),
                MigrationStage.ROLLING_BACK, 100, source.createdAt(), source.startedAt(), null,
                origin.verificationState(), null, origin, 1000, false, false, false,
                source.targetIdentityHash(), source.managedCandidateGeneration());
    }

    private static MigrationOperationSnapshot readySnapshot() {
        MigrationOperationSnapshot running = new DurableCutoverSnapshots(draft(), IDENTITY).running();
        return new RetainedCopyJournalSnapshots(running).finalSnapshot();
    }

    private static MigrationOperationSnapshot initialFor(MigrationOperationSnapshot snapshot) {
        return snapshot.applyMode() == ApplyMode.EXTERNAL_APPLY
                ? externalPending() : new DurableCutoverSnapshots(draft(), IDENTITY).cleanPending();
    }

    private static void advance(FileMigrationOperationStore store, MigrationOperationSnapshot target) {
        MigrationOperationSnapshot current = store.find(target.operationId()).orElseThrow();
        if (current.equals(target)) {
            return;
        }
        if (target.state() == MigrationOperationState.RUNNING) {
            MigrationOperationSnapshot running = new DurableCutoverSnapshots(draft(), IDENTITY).running();
            store.compareAndTransition(target.operationId(), MigrationOperationState.PENDING, running);
            if (!running.equals(target)) {
                store.compareAndTransition(target.operationId(), MigrationOperationState.RUNNING, target);
            }
            return;
        }
        if (target.state() == MigrationOperationState.READY_TO_ACTIVATE) {
            MigrationOperationSnapshot running = new DurableCutoverSnapshots(draft(), IDENTITY).running();
            store.compareAndTransition(target.operationId(), MigrationOperationState.PENDING, running);
            MigrationOperationSnapshot verifying = new RetainedCopyJournalSnapshots(running).verifyingSnapshot();
            store.compareAndTransition(target.operationId(), MigrationOperationState.RUNNING, verifying);
            store.compareAndTransition(target.operationId(), MigrationOperationState.RUNNING, target);
        }
    }

    private static MigrationOperationSnapshot verifyingSnapshot() {
        MigrationOperationSnapshot running = new DurableCutoverSnapshots(draft(), IDENTITY).running();
        return new RetainedCopyJournalSnapshots(running).verifyingSnapshot();
    }

    private static DurableCutoverDraft draft() {
        return new DurableCutoverDraft(OPERATION, MigrationTarget.POSTGRESQL,
                ApplyMode.MANAGED_WRITE, CREATED, STARTED, GENERATION);
    }

    private static MigrationOperationSnapshot externalPending() {
        DurableCutoverDraft external = new DurableCutoverDraft(
                "operation-external", MigrationTarget.MYSQL, ApplyMode.EXTERNAL_APPLY,
                CREATED, STARTED, null);
        return new DurableCutoverSnapshots(external, "b".repeat(64)).cleanPending();
    }

    private static MigrationOperationSnapshot foreignPending() {
        DurableCutoverDraft foreign = new DurableCutoverDraft(
                "operation-b", MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                CREATED.plusSeconds(20), STARTED.plusSeconds(20), "foreign-generation");
        return new DurableCutoverSnapshots(foreign, "c".repeat(64)).cleanPending();
    }
}
