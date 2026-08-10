/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.ActivationOutcome;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.RollbackOutcome;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ManagedMigrationStartupReconcilerTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final String GENERATION = "candidate-generation";
    private static final Instant CREATED = Instant.parse("2026-08-10T03:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);
    private static final Instant COMPLETED = CREATED.plusSeconds(20);
    private static final CandidateRef CANDIDATE = new CandidateRef(OPERATION, GENERATION);

    @TempDir
    private Path root;

    private DurableCutoverDraft draft;
    private FileMigrationOperationStore store;
    private ManagedMigrationConfigurationTransaction configuration;
    private MigrationStartupTargetVerifier verifier;

    @BeforeEach
    void setUp() {
        draft = new DurableCutoverDraft(OPERATION, MigrationTarget.POSTGRESQL,
                ApplyMode.MANAGED_WRITE, CREATED, STARTED, GENERATION);
        store = new FileMigrationOperationStore(root);
        configuration = mock(ManagedMigrationConfigurationTransaction.class);
        verifier = mock(MigrationStartupTargetVerifier.class);
        seedReady();
    }

    @Test
    void convergesActivatingBeforeReadOnlyTargetVerificationAndSuccessJournal() throws Exception {
        MigrationOperationSnapshot ready = current();
        store.compareAndTransition(OPERATION, MigrationOperationState.READY_TO_ACTIVATE,
                new RetainedManagedActivationSnapshots(ready).activatingSnapshot());
        when(configuration.activateExact(CANDIDATE, IDENTITY)).thenAnswer(invocation -> {
            assertThat(current().stage()).isEqualTo(MigrationStage.ACTIVATING);
            return ActivationOutcome.ALREADY_ACTIVE;
        });
        when(verifier.verify(CANDIDATE, IDENTITY)).thenAnswer(invocation -> {
            assertThat(current().state()).isEqualTo(MigrationOperationState.AWAITING_RESTART);
            return MigrationStartupTargetVerification.CONFIRMED;
        });

        assertThat(reconciler().reconcile())
                .isEqualTo(MigrationStartupReconciliation.SUCCEEDED);

        assertThat(current().state()).isEqualTo(MigrationOperationState.SUCCEEDED);
        assertThat(current().completedAt()).isEqualTo(COMPLETED);
        verify(configuration).activateExact(CANDIDATE, IDENTITY);
        verify(verifier).verify(CANDIDATE, IDENTITY);
    }

    @Test
    void awaitingRestartTargetConfirmationTransitionsDirectlyToSuccess() throws Exception {
        seedAwaitingRestart();
        when(verifier.verify(CANDIDATE, IDENTITY))
                .thenReturn(MigrationStartupTargetVerification.CONFIRMED);

        assertThat(reconciler().reconcile())
                .isEqualTo(MigrationStartupReconciliation.SUCCEEDED);

        assertThat(current().state()).isEqualTo(MigrationOperationState.SUCCEEDED);
        verify(configuration, never()).activateExact(CANDIDATE, IDENTITY);
    }

    @Test
    void deterministicMismatchRollsBackExactGenerationBeforeTerminalJournal() throws Exception {
        seedAwaitingRestart();
        when(verifier.verify(CANDIDATE, IDENTITY))
                .thenReturn(MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH);
        when(configuration.rollbackExact(CANDIDATE, IDENTITY)).thenAnswer(invocation -> {
            assertThat(current().stage()).isEqualTo(MigrationStage.ROLLING_BACK);
            return RollbackOutcome.ROLLED_BACK;
        });

        assertThat(reconciler().reconcile())
                .isEqualTo(MigrationStartupReconciliation.ROLLED_BACK_RESTART_REQUIRED);

        MigrationOperationSnapshot terminal = current();
        assertThat(terminal.state()).isEqualTo(MigrationOperationState.ROLLED_BACK);
        assertThat(terminal.errorCode()).isEqualTo(SetupErrorCode.RESTART_FAILED);
        assertThat(terminal.rollbackOrigin()).isEqualTo(MigrationRollbackOrigin.RESTART_FAILURE);
        verify(configuration).rollbackExact(CANDIDATE, IDENTITY);
    }

    @Test
    void transientTargetFailureKeepsAwaitingRestartGated() throws Exception {
        seedAwaitingRestart();
        when(verifier.verify(CANDIDATE, IDENTITY))
                .thenReturn(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);

        assertThat(reconciler().reconcile())
                .isEqualTo(MigrationStartupReconciliation.GATED);

        assertThat(current().state()).isEqualTo(MigrationOperationState.AWAITING_RESTART);
        verify(configuration, never()).rollbackExact(CANDIDATE, IDENTITY);
    }

    @Test
    void privateRuntimeFailureIsCauseFreeAndLeavesAwaitingRestartGated() throws Exception {
        seedAwaitingRestart();
        when(verifier.verify(CANDIDATE, IDENTITY))
                .thenThrow(new IllegalStateException("private jdbc endpoint"));

        assertThatThrownBy(() -> reconciler().reconcile())
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .hasNoCause()
                .hasMessageNotContaining("private")
                .hasMessageNotContaining("jdbc")
                .hasMessageNotContaining("endpoint");
        assertThat(current().state()).isEqualTo(MigrationOperationState.AWAITING_RESTART);
        verify(configuration, never()).rollbackExact(CANDIDATE, IDENTITY);
    }

    @Test
    void terminalSuccessReplayDoesNotVerifyOrMutateAgain() throws Exception {
        seedAwaitingRestart();
        when(verifier.verify(CANDIDATE, IDENTITY))
                .thenReturn(MigrationStartupTargetVerification.CONFIRMED);
        ManagedMigrationStartupReconciler reconciler = reconciler();
        assertThat(reconciler.reconcile()).isEqualTo(MigrationStartupReconciliation.SUCCEEDED);

        assertThat(reconciler.reconcile())
                .isEqualTo(MigrationStartupReconciliation.ALREADY_SUCCEEDED);

        verify(verifier, times(1)).verify(CANDIDATE, IDENTITY);
        verify(configuration, never()).rollbackExact(CANDIDATE, IDENTITY);
    }

    @Test
    void activationRecoveryRequiredKeepsActivatingJournalGated() throws Exception {
        MigrationOperationSnapshot ready = current();
        store.compareAndTransition(OPERATION, MigrationOperationState.READY_TO_ACTIVATE,
                new RetainedManagedActivationSnapshots(ready).activatingSnapshot());
        when(configuration.activateExact(CANDIDATE, IDENTITY))
                .thenReturn(ActivationOutcome.RECOVERY_REQUIRED);

        assertThatThrownBy(() -> reconciler().reconcile())
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));

        assertThat(current().stage()).isEqualTo(MigrationStage.ACTIVATING);
        verify(verifier, never()).verify(CANDIDATE, IDENTITY);
    }

    @Test
    void rollbackRecoveryRequiredReplaysOnlyExactRollback() throws Exception {
        seedAwaitingRestart();
        when(verifier.verify(CANDIDATE, IDENTITY))
                .thenReturn(MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH);
        when(configuration.rollbackExact(CANDIDATE, IDENTITY))
                .thenReturn(RollbackOutcome.RECOVERY_REQUIRED, RollbackOutcome.ALREADY_ROLLED_BACK);
        ManagedMigrationStartupReconciler reconciler = reconciler();

        assertThatThrownBy(reconciler::reconcile)
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        assertThat(current().stage()).isEqualTo(MigrationStage.ROLLING_BACK);

        assertThat(reconciler.reconcile())
                .isEqualTo(MigrationStartupReconciliation.ROLLED_BACK_RESTART_REQUIRED);
        assertThat(reconciler.reconcile())
                .isEqualTo(MigrationStartupReconciliation.ALREADY_ROLLED_BACK_RESTART_REQUIRED);
        verify(verifier, times(1)).verify(CANDIDATE, IDENTITY);
        verify(configuration, times(2)).rollbackExact(CANDIDATE, IDENTITY);
    }

    @Test
    void targetVerifierErrorRemainsPrimaryAndDoesNotChangeJournal() {
        seedAwaitingRestart();
        AssertionError fatal = new AssertionError("private target failure");
        when(verifier.verify(CANDIDATE, IDENTITY)).thenThrow(fatal);

        assertThatThrownBy(() -> reconciler().reconcile()).isSameAs(fatal);

        assertThat(current().state()).isEqualTo(MigrationOperationState.AWAITING_RESTART);
    }

    @Test
    void terminalDraftCannotHideForeignActiveOperation() throws Exception {
        seedAwaitingRestart();
        when(verifier.verify(CANDIDATE, IDENTITY))
                .thenReturn(MigrationStartupTargetVerification.CONFIRMED);
        ManagedMigrationStartupReconciler reconciler = reconciler();
        assertThat(reconciler.reconcile()).isEqualTo(MigrationStartupReconciliation.SUCCEEDED);
        store.create(foreignPending());
        clearInvocations(configuration, verifier);

        assertThatThrownBy(reconciler::reconcile)
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.OPERATION_CONFLICT));

        verifyNoInteractions(configuration, verifier);
    }

    @Test
    void missingDraftCannotHideForeignActiveOperation() {
        FileMigrationOperationStore foreignStore = new FileMigrationOperationStore(root.resolve("foreign"));
        foreignStore.create(foreignPending());
        ManagedMigrationStartupReconciler reconciler = new ManagedMigrationStartupReconciler(
                draft, foreignStore, configuration, verifier,
                Clock.fixed(COMPLETED, ZoneOffset.UTC));

        assertThatThrownBy(reconciler::reconcile)
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.OPERATION_CONFLICT));

        verifyNoInteractions(configuration, verifier);
    }

    private ManagedMigrationStartupReconciler reconciler() {
        return new ManagedMigrationStartupReconciler(
                draft, store, configuration, verifier,
                Clock.fixed(COMPLETED, ZoneOffset.UTC));
    }

    private void seedReady() {
        DurableCutoverSnapshots preparation = new DurableCutoverSnapshots(draft, IDENTITY);
        store.create(preparation.cleanPending());
        store.compareAndTransition(OPERATION, MigrationOperationState.PENDING, preparation.running());
        new DurableRetainedCopyJournalHandoff(draft, store)
                .handoff(new RetainedCopyJournalContext(OPERATION, IDENTITY));
    }

    private void seedAwaitingRestart() {
        if (current().state() == MigrationOperationState.AWAITING_RESTART) {
            return;
        }
        MigrationOperationSnapshot ready = current();
        MigrationOperationSnapshot activating =
                new RetainedManagedActivationSnapshots(ready).activatingSnapshot();
        store.compareAndTransition(OPERATION, MigrationOperationState.READY_TO_ACTIVATE, activating);
        store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING,
                new RetainedManagedActivationSnapshots(activating).awaitingRestartSnapshot());
    }

    private MigrationOperationSnapshot current() {
        return store.find(OPERATION).orElseThrow();
    }

    private MigrationOperationSnapshot foreignPending() {
        DurableCutoverDraft foreign = new DurableCutoverDraft(
                "operation-b", MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                CREATED.plusSeconds(30), STARTED.plusSeconds(30), "foreign-generation");
        return new DurableCutoverSnapshots(foreign, "b".repeat(64)).cleanPending();
    }
}
