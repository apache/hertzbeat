/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.ActivationOutcome;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class DurableRetainedManagedActivationTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final String GENERATION = "candidate-generation";
    private static final Instant CREATED = Instant.parse("2026-08-10T03:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);
    private static final CandidateRef CANDIDATE = new CandidateRef(OPERATION, GENERATION);

    @TempDir
    private Path root;

    private DurableCutoverDraft draft;
    private FileMigrationOperationStore store;
    private ManagedMigrationConfigurationTransaction configuration;

    @BeforeEach
    void setUp() {
        draft = new DurableCutoverDraft(OPERATION, MigrationTarget.POSTGRESQL,
                ApplyMode.MANAGED_WRITE, CREATED, STARTED, GENERATION);
        store = new FileMigrationOperationStore(root);
        DurableCutoverSnapshots preparation = new DurableCutoverSnapshots(draft, IDENTITY);
        store.create(preparation.cleanPending());
        store.compareAndTransition(OPERATION, MigrationOperationState.PENDING, preparation.running());
        new DurableRetainedCopyJournalHandoff(draft, store)
                .handoff(new RetainedCopyJournalContext(OPERATION, IDENTITY));
        configuration = mock(ManagedMigrationConfigurationTransaction.class);
    }

    @Test
    void persistsActivatingBeforeExactConfigAndAwaitingRestartAfterIt() throws Exception {
        when(configuration.activateExact(CANDIDATE, IDENTITY)).thenAnswer(invocation -> {
            assertThat(store.find(OPERATION).orElseThrow().stage()).isEqualTo(MigrationStage.ACTIVATING);
            return ActivationOutcome.ACTIVATED;
        });
        DurableRetainedManagedActivation activation =
                new DurableRetainedManagedActivation(draft, store, configuration);

        assertThat(activation.activate(new RetainedManagedActivationContext(OPERATION, IDENTITY)))
                .isEqualTo(RetainedManagedActivationDisposition.ACTIVATED);

        MigrationOperationSnapshot current = store.find(OPERATION).orElseThrow();
        assertThat(current.state()).isEqualTo(MigrationOperationState.AWAITING_RESTART);
        assertThat(current.stage()).isEqualTo(MigrationStage.AWAITING_RESTART);
        verify(configuration).activateExact(CANDIDATE, IDENTITY);
    }

    @ParameterizedTest
    @EnumSource(value = ActivationOutcome.class, names = {"RECOVERY_REQUIRED", "STALE"})
    void rejectedConfigOutcomeLeavesDurableActivatingForSameOperationRetry(
            ActivationOutcome rejected) throws Exception {
        when(configuration.activateExact(CANDIDATE, IDENTITY))
                .thenReturn(rejected)
                .thenReturn(ActivationOutcome.ALREADY_ACTIVE);
        DurableRetainedManagedActivation activation =
                new DurableRetainedManagedActivation(draft, store, configuration);

        assertThatThrownBy(() -> activation.activate(
                new RetainedManagedActivationContext(OPERATION, IDENTITY)))
                .isInstanceOfSatisfying(RetainedManagedActivationException.class, failure ->
                        assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .hasNoCause();
        assertThat(store.find(OPERATION).orElseThrow().stage()).isEqualTo(MigrationStage.ACTIVATING);

        assertThat(activation.activate(new RetainedManagedActivationContext(OPERATION, IDENTITY)))
                .isEqualTo(RetainedManagedActivationDisposition.ACTIVATED);
        verify(configuration, org.mockito.Mockito.times(2)).activateExact(CANDIDATE, IDENTITY);
    }

    @Test
    void alreadyAwaitingRestartConfirmsExactConfigWithoutJournalRegression() throws Exception {
        when(configuration.activateExact(CANDIDATE, IDENTITY)).thenReturn(ActivationOutcome.ACTIVATED);
        DurableRetainedManagedActivation first =
                new DurableRetainedManagedActivation(draft, store, configuration);
        first.activate(new RetainedManagedActivationContext(OPERATION, IDENTITY));
        when(configuration.activateExact(CANDIDATE, IDENTITY)).thenReturn(ActivationOutcome.ALREADY_ACTIVE);
        DurableRetainedManagedActivation replay =
                new DurableRetainedManagedActivation(draft, store, configuration);

        assertThat(replay.activate(new RetainedManagedActivationContext(OPERATION, IDENTITY)))
                .isEqualTo(RetainedManagedActivationDisposition.ALREADY_AWAITING_RESTART);
        assertThat(store.find(OPERATION).orElseThrow().stage()).isEqualTo(MigrationStage.AWAITING_RESTART);
        verify(configuration, org.mockito.Mockito.times(1)).activateExact(CANDIDATE, IDENTITY);
        verify(configuration, never()).rollback(CANDIDATE);
    }

    @Test
    void activatingJournalFailureStopsBeforeConfigurationAndRetryConverges() throws Exception {
        FileMigrationOperationStore failingStore = failPublication(1);
        when(configuration.activateExact(CANDIDATE, IDENTITY))
                .thenReturn(ActivationOutcome.ACTIVATED);
        DurableRetainedManagedActivation activation =
                new DurableRetainedManagedActivation(draft, failingStore, configuration);

        assertRecovery(() -> activation.activate(
                new RetainedManagedActivationContext(OPERATION, IDENTITY)));
        assertThat(store.find(OPERATION).orElseThrow().stage())
                .isEqualTo(MigrationStage.READY_TO_ACTIVATE);
        verify(configuration, never()).activateExact(CANDIDATE, IDENTITY);

        assertThat(activation.activate(new RetainedManagedActivationContext(OPERATION, IDENTITY)))
                .isEqualTo(RetainedManagedActivationDisposition.ACTIVATED);
    }

    @Test
    void finalJournalFailureLeavesActivatingAndRetryDoesNotRepeatConfigMutation() throws Exception {
        FileMigrationOperationStore failingStore = failPublication(2);
        when(configuration.activateExact(CANDIDATE, IDENTITY))
                .thenReturn(ActivationOutcome.ACTIVATED)
                .thenReturn(ActivationOutcome.ALREADY_ACTIVE);
        DurableRetainedManagedActivation activation =
                new DurableRetainedManagedActivation(draft, failingStore, configuration);

        assertRecovery(() -> activation.activate(
                new RetainedManagedActivationContext(OPERATION, IDENTITY)));
        assertThat(store.find(OPERATION).orElseThrow().stage()).isEqualTo(MigrationStage.ACTIVATING);

        assertThat(activation.activate(new RetainedManagedActivationContext(OPERATION, IDENTITY)))
                .isEqualTo(RetainedManagedActivationDisposition.ACTIVATED);
        verify(configuration, org.mockito.Mockito.times(2)).activateExact(CANDIDATE, IDENTITY);
    }

    @Test
    void committedFinalJournalWithFailedConfirmationRetriesWithoutReactivatingConfig()
            throws Exception {
        MigrationOperationFilePublisher delegate = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore uncertainStore = new FileMigrationOperationStore(
                root, (target, content) -> {
                    delegate.publish(target, content);
                    int publication = publications.incrementAndGet();
                    if (publication == 2 || publication == 3) {
                        throw new CommittedSetupFileDurabilityException();
                    }
                });
        when(configuration.activateExact(CANDIDATE, IDENTITY))
                .thenReturn(ActivationOutcome.ACTIVATED);
        DurableRetainedManagedActivation activation =
                new DurableRetainedManagedActivation(draft, uncertainStore, configuration);

        assertRecovery(() -> activation.activate(
                new RetainedManagedActivationContext(OPERATION, IDENTITY)));
        assertThat(store.find(OPERATION).orElseThrow().stage())
                .isEqualTo(MigrationStage.AWAITING_RESTART);

        assertThat(activation.activate(new RetainedManagedActivationContext(OPERATION, IDENTITY)))
                .isEqualTo(RetainedManagedActivationDisposition.ALREADY_AWAITING_RESTART);
        verify(configuration, org.mockito.Mockito.times(1)).activateExact(CANDIDATE, IDENTITY);
    }

    private FileMigrationOperationStore failPublication(int failureIndex) {
        MigrationOperationFilePublisher delegate = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        return new FileMigrationOperationStore(root, (target, content) -> {
            if (publications.incrementAndGet() == failureIndex) {
                throw new IOException("simulated journal publication failure");
            }
            delegate.publish(target, content);
        });
    }

    private static void assertRecovery(ThrowingAction action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(RetainedManagedActivationException.class, failure ->
                        assertThat(failure.errorCode()).isIn(
                                SetupErrorCode.CONFIG_WRITE_FAILED,
                                SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .hasNoCause()
                .hasMessageNotContaining("simulated");
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run() throws Exception;
    }
}
