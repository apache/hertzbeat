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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.MetadataTargetStageResult;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.StageOutcome;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;

@Timeout(15)
class DurableCutoverPreparationTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final String GENERATION = "candidate-generation";
    private static final Instant CREATED = Instant.parse("2026-08-10T02:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);
    private static final MetadataDatabaseSettings MYSQL = new MetadataDatabaseSettings(
            MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat", "migration");

    @TempDir
    private Path root;

    @Test
    void managedStageIsDurableBeforeExactRunningAndDoesNotRetainBorrowedSecret() throws Exception {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        when(configuration.stageMetadataTarget(eq(OPERATION), eq(GENERATION), eq(IDENTITY),
                same(MYSQL), any(SecretValue.class)))
                .thenReturn(staged(StageOutcome.STAGED));
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        DurableCutoverPreparation preparation = managed(store, configuration);

        try (SecretValue borrowed = password(); SecretValue expected = password()) {
            preparation.prepare(context(), MYSQL, borrowed);

            assertThat(borrowed).isEqualTo(expected);
        }
        assertThat(store.find(OPERATION)).contains(running(ApplyMode.MANAGED_WRITE));
        assertThat(store.find(OPERATION).orElseThrow().progressPercent()).isZero();
        ArgumentCaptor<SecretValue> owned = ArgumentCaptor.forClass(SecretValue.class);
        verify(configuration).stageMetadataTarget(
                eq(OPERATION), eq(GENERATION), eq(IDENTITY), same(MYSQL), owned.capture());
        char[] cleared = owned.getValue().copy();
        try {
            assertThat(cleared).containsOnly('\0');
        } finally {
            Arrays.fill(cleared, '\0');
        }
    }

    @Test
    void exactAlreadyStagedRetryConvergesWithoutChangingTheDraft() throws Exception {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        when(configuration.stageMetadataTarget(eq(OPERATION), eq(GENERATION), eq(IDENTITY),
                same(MYSQL), any(SecretValue.class)))
                .thenReturn(staged(StageOutcome.ALREADY_STAGED));
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);

        try (SecretValue borrowed = password()) {
            managed(store, configuration).prepare(context(), MYSQL, borrowed);
        }

        assertThat(store.find(OPERATION)).contains(running(ApplyMode.MANAGED_WRITE));
    }

    @Test
    void blockedPendingRetainsOwnershipAndCanResumeWithTheSameDraft() throws Exception {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        when(configuration.stageMetadataTarget(eq(OPERATION), eq(GENERATION), eq(IDENTITY),
                same(MYSQL), any(SecretValue.class)))
                .thenReturn(new MetadataTargetStageResult(StageOutcome.RECOVERY_REQUIRED, Optional.empty()))
                .thenReturn(staged(StageOutcome.STAGED));
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        DurableCutoverPreparation preparation = managed(store, configuration);

        try (SecretValue borrowed = password()) {
            assertPreparationError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                    () -> preparation.prepare(context(), MYSQL, borrowed));
            assertThat(store.find(OPERATION)).contains(blocked(ApplyMode.MANAGED_WRITE));
            preparation.prepare(context(), MYSQL, borrowed);
        }

        assertThat(store.find(OPERATION)).contains(running(ApplyMode.MANAGED_WRITE));
    }

    @Test
    void sourceUnsupportedAndStaleBecomeTruthfulPreCopyTerminalRecords() throws Exception {
        assertTerminalOutcome(StageOutcome.SOURCE_UNSUPPORTED,
                SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
        assertTerminalOutcome(StageOutcome.STALE, SetupErrorCode.OPERATION_CONFLICT);
    }

    @Test
    void unknownConfigurationFailureBlocksPendingWithoutLeakingCause() throws Exception {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        when(configuration.stageMetadataTarget(eq(OPERATION), eq(GENERATION), eq(IDENTITY),
                same(MYSQL), any(SecretValue.class)))
                .thenThrow(new IOException("private candidate path"));
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        DurableCutoverPreparation preparation = managed(store, configuration);

        try (SecretValue borrowed = password(); SecretValue expected = password()) {
            assertThatThrownBy(() -> preparation.prepare(context(), MYSQL, borrowed))
                    .isInstanceOfSatisfying(DurableCutoverPreparationException.class, failure -> {
                        assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
                        assertThat(failure).hasNoCause();
                        assertThat(failure.getMessage()).doesNotContain("private", "path", "jdbc:");
                    });
            assertThat(borrowed).isEqualTo(expected);
        }
        assertThat(store.find(OPERATION)).contains(blocked(ApplyMode.MANAGED_WRITE));
    }

    @Test
    void externalPreparationSkipsManagedCandidateAndTransitionsExactlyToRunning() {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        DurableCutoverDraft draft = new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.EXTERNAL_APPLY,
                CREATED, STARTED, null);
        DurableCutoverPreparation preparation = new DurableCutoverPreparation(
                draft, store, configuration);

        try (SecretValue borrowed = password()) {
            preparation.prepare(context(), MYSQL, borrowed);
        }

        assertThat(store.find(OPERATION)).contains(running(ApplyMode.EXTERNAL_APPLY));
        verifyNoInteractions(configuration);
    }

    @Test
    void existingExactRunningIsConfirmedButNeverRestagedOrAllowedToRecopy() {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        store.createOrConfirm(clean(ApplyMode.MANAGED_WRITE));
        store.compareAndTransitionOrConfirm(
                OPERATION, MigrationOperationState.PENDING, running(ApplyMode.MANAGED_WRITE));
        DurableCutoverPreparation preparation = managed(store, configuration);

        try (SecretValue borrowed = password()) {
            assertPreparationError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                    () -> preparation.prepare(context(), MYSQL, borrowed));
        }

        verifyNoInteractions(configuration);
        assertThat(store.find(OPERATION)).contains(running(ApplyMode.MANAGED_WRITE));
    }

    @Test
    void progressedRunningIsConfirmedButNeverRestagedOrAllowedToRecopy() {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot running = running(ApplyMode.MANAGED_WRITE);
        MigrationOperationSnapshot progressed = snapshot(
                ApplyMode.MANAGED_WRITE, MigrationOperationState.RUNNING, MigrationStage.COPYING,
                35, STARTED, null, null, 1000);
        store.createOrConfirm(clean(ApplyMode.MANAGED_WRITE));
        store.compareAndTransitionOrConfirm(OPERATION, MigrationOperationState.PENDING, running);
        store.compareAndTransitionOrConfirm(OPERATION, MigrationOperationState.RUNNING, progressed);

        try (SecretValue borrowed = password()) {
            assertPreparationError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                    () -> managed(store, configuration).prepare(context(), MYSQL, borrowed));
        }

        verifyNoInteractions(configuration);
        assertThat(store.find(OPERATION)).contains(progressed);
    }

    @Test
    void terminalReplayIsDurablyConfirmedAndReportedAsStopWithoutRestaging() {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot terminal = failed(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
        store.createOrConfirm(clean(ApplyMode.MANAGED_WRITE));
        store.compareAndTransitionOrConfirm(OPERATION, MigrationOperationState.PENDING, terminal);

        try (SecretValue borrowed = password()) {
            assertPreparationError(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED,
                    () -> managed(store, configuration).prepare(context(), MYSQL, borrowed));
        }

        verifyNoInteractions(configuration);
        assertThat(store.find(OPERATION)).contains(terminal);
    }

    @Test
    void concurrentPreparationsAllowOnlyTheExactTransitionWinnerToContinue() throws Exception {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        CountDownLatch bothStaging = new CountDownLatch(2);
        CountDownLatch releaseStage = new CountDownLatch(1);
        when(configuration.stageMetadataTarget(eq(OPERATION), eq(GENERATION), eq(IDENTITY),
                same(MYSQL), any(SecretValue.class))).thenAnswer(invocation -> {
                    bothStaging.countDown();
                    assertThat(bothStaging.await(5, SECONDS)).isTrue();
                    assertThat(releaseStage.await(5, SECONDS)).isTrue();
                    return staged(StageOutcome.ALREADY_STAGED);
                });
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        DurableCutoverPreparation first = managed(store, configuration);
        DurableCutoverPreparation second = managed(store, configuration);

        try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
            Future<Throwable> firstResult = workers.submit(() -> invoke(first));
            Future<Throwable> secondResult = workers.submit(() -> invoke(second));
            assertThat(bothStaging.await(5, SECONDS)).isTrue();
            releaseStage.countDown();

            assertThat(Arrays.asList(
                    firstResult.get(5, SECONDS), secondResult.get(5, SECONDS)))
                    .satisfiesExactlyInAnyOrder(
                            result -> assertThat(result).isNull(),
                            result -> assertThat(result)
                                    .isInstanceOfSatisfying(
                                            DurableCutoverPreparationException.class,
                                            failure -> assertThat(failure.errorCode())
                                                    .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED)));
        } finally {
            releaseStage.countDown();
        }
        assertThat(store.find(OPERATION)).contains(running(ApplyMode.MANAGED_WRITE));
    }

    @Test
    void identityAndGenerationConflictsNeverTouchManagedConfiguration() throws Exception {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        when(configuration.stageMetadataTarget(eq(OPERATION), eq(GENERATION), eq(IDENTITY),
                same(MYSQL), any(SecretValue.class)))
                .thenReturn(new MetadataTargetStageResult(StageOutcome.RECOVERY_REQUIRED, Optional.empty()));
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        DurableCutoverPreparation original = managed(store, configuration);
        try (SecretValue borrowed = password()) {
            assertPreparationError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                    () -> original.prepare(context(), MYSQL, borrowed));
        }

        DurableCutoverPreparation conflicting = new DurableCutoverPreparation(
                new DurableCutoverDraft(OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                        CREATED, STARTED, "other-generation"), store, configuration);
        try (SecretValue borrowed = password()) {
            assertThatThrownBy(() -> conflicting.prepare(context(), MYSQL, borrowed))
                    .isInstanceOfSatisfying(DurableCutoverPreparationException.class, failure ->
                            assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.OPERATION_CONFLICT));
        }

        verify(configuration, never()).stageMetadataTarget(
                eq(OPERATION), eq("other-generation"), eq(IDENTITY), same(MYSQL), any(SecretValue.class));
    }

    @Test
    void targetKindMismatchIsRejectedBeforeJournalOrCandidateAndDraftHasNoSecretSurface() {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MetadataDatabaseSettings postgres = new MetadataDatabaseSettings(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "migration");

        try (SecretValue borrowed = password(); SecretValue expected = password()) {
            assertPreparationError(SetupErrorCode.OPERATION_CONFLICT,
                    () -> managed(store, configuration).prepare(context(), postgres, borrowed));
            assertThat(borrowed).isEqualTo(expected);
        }

        assertThat(store.history()).isEmpty();
        verifyNoInteractions(configuration);
        List<Class<?>> fieldTypes = Arrays.stream(DurableCutoverPreparation.class.getDeclaredFields())
                .map(Field::getType)
                .toList();
        assertThat(fieldTypes).doesNotContain(SecretValue.class);
        assertThat(fieldTypes).doesNotContain(MetadataDatabaseSettings.class);
        assertThatThrownBy(() -> new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                STARTED, CREATED, GENERATION)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                CREATED, STARTED, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.EXTERNAL_APPLY,
                CREATED, STARTED, GENERATION)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fatalRemainsPrimaryAndBorrowedSecretRemainsOwnedByCaller() throws Exception {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        AssertionError fatal = new AssertionError("fatal candidate write");
        when(configuration.stageMetadataTarget(eq(OPERATION), eq(GENERATION), eq(IDENTITY),
                same(MYSQL), any(SecretValue.class)))
                .thenThrow(fatal);
        DurableCutoverPreparation preparation = managed(
                new FileMigrationOperationStore(root), configuration);

        try (SecretValue borrowed = password(); SecretValue expected = password()) {
            assertThatThrownBy(() -> preparation.prepare(context(), MYSQL, borrowed)).isSameAs(fatal);
            assertThat(borrowed).isEqualTo(expected);
        }
    }

    private void assertTerminalOutcome(StageOutcome outcome, SetupErrorCode errorCode) throws Exception {
        Path operationRoot = root.resolve(outcome.name().toLowerCase());
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        when(configuration.stageMetadataTarget(eq(OPERATION), eq(GENERATION), eq(IDENTITY),
                same(MYSQL), any(SecretValue.class)))
                .thenReturn(new MetadataTargetStageResult(outcome, Optional.empty()));
        FileMigrationOperationStore store = new FileMigrationOperationStore(operationRoot);
        DurableCutoverPreparation preparation = managed(store, configuration);

        try (SecretValue borrowed = password()) {
            assertPreparationError(errorCode, () -> preparation.prepare(context(), MYSQL, borrowed));
            assertPreparationError(errorCode, () -> preparation.prepare(context(), MYSQL, borrowed));
        }

        assertThat(store.find(OPERATION)).contains(failed(errorCode));
        verify(configuration).stageMetadataTarget(
                eq(OPERATION), eq(GENERATION), eq(IDENTITY), same(MYSQL), any(SecretValue.class));
    }

    private static DurableCutoverPreparation managed(
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration) {
        DurableCutoverDraft draft = new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                CREATED, STARTED, GENERATION);
        return new DurableCutoverPreparation(draft, store, configuration);
    }

    private static MetadataTargetStageResult staged(StageOutcome outcome) {
        return new MetadataTargetStageResult(
                outcome, Optional.of(new CandidateRef(OPERATION, GENERATION)));
    }

    private static RetainedCutoverPreparationContext context() {
        return new RetainedCutoverPreparationContext(OPERATION, IDENTITY);
    }

    private static SecretValue password() {
        return SecretValue.of("target-password");
    }

    private static void assertPreparationError(SetupErrorCode code, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(DurableCutoverPreparationException.class, failure -> {
                    assertThat(failure.errorCode()).isEqualTo(code);
                    assertThat(failure).hasNoCause();
                });
    }

    private static MigrationOperationSnapshot clean(ApplyMode mode) {
        return snapshot(mode, MigrationOperationState.PENDING, MigrationStage.QUEUED,
                null, null, null, 1000);
    }

    private static MigrationOperationSnapshot blocked(ApplyMode mode) {
        return snapshot(mode, MigrationOperationState.PENDING, MigrationStage.QUEUED,
                null, null, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, 0);
    }

    private static MigrationOperationSnapshot running(ApplyMode mode) {
        return snapshot(mode, MigrationOperationState.RUNNING, MigrationStage.COPYING,
                STARTED, null, null, 1000);
    }

    private static MigrationOperationSnapshot failed(SetupErrorCode code) {
        return snapshot(ApplyMode.MANAGED_WRITE, MigrationOperationState.FAILED,
                MigrationStage.FAILED, null, STARTED, code, 0);
    }

    private static MigrationOperationSnapshot snapshot(
            ApplyMode mode, MigrationOperationState state, MigrationStage stage,
            Instant startedAt, Instant completedAt, SetupErrorCode error, long pollMillis) {
        return snapshot(mode, state, stage, 0,
                startedAt, completedAt, error, pollMillis);
    }

    private static MigrationOperationSnapshot snapshot(
            ApplyMode mode, MigrationOperationState state, MigrationStage stage, int progress,
            Instant startedAt, Instant completedAt, SetupErrorCode error, long pollMillis) {
        return new MigrationOperationSnapshot(OPERATION, state, MigrationTarget.MYSQL, mode, stage,
                progress, CREATED, startedAt, completedAt,
                VerificationState.PENDING, error, null, pollMillis, false, false, false,
                IDENTITY, mode == ApplyMode.MANAGED_WRITE ? GENERATION : null);
    }

    private static Throwable invoke(DurableCutoverPreparation preparation) {
        try (SecretValue borrowed = password()) {
            preparation.prepare(context(), MYSQL, borrowed);
            return null;
        } catch (Throwable failure) {
            return failure;
        }
    }
}
