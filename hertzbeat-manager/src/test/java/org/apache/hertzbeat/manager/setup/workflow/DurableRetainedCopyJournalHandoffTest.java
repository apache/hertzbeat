/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
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

class DurableRetainedCopyJournalHandoffTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final String GENERATION = "candidate-generation";
    private static final Instant CREATED = Instant.parse("2026-08-10T03:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);

    @TempDir
    private Path root;

    @Test
    void managedCopyPersistsVerificationBeforeReady() {
        FileMigrationOperationStore store = seeded(ApplyMode.MANAGED_WRITE, 35);
        DurableRetainedCopyJournalHandoff handoff = handoff(store, ApplyMode.MANAGED_WRITE);

        assertThat(handoff.handoff(context())).isEqualTo(RetainedCopyJournalDisposition.TRANSITIONED);

        MigrationOperationSnapshot current = store.find(OPERATION).orElseThrow();
        assertThat(current.state()).isEqualTo(MigrationOperationState.READY_TO_ACTIVATE);
        assertThat(current.stage()).isEqualTo(MigrationStage.READY_TO_ACTIVATE);
        assertThat(current.verificationState()).isEqualTo(VerificationState.SUCCEEDED);
        assertThat(current.progressPercent()).isEqualTo(100);
        assertThat(current.activationAvailable()).isTrue();
    }

    @Test
    void externalCopyPersistsAwaitingExternalApply() {
        FileMigrationOperationStore store = seeded(ApplyMode.EXTERNAL_APPLY, 0);

        assertThat(handoff(store, ApplyMode.EXTERNAL_APPLY).handoff(context()))
                .isEqualTo(RetainedCopyJournalDisposition.TRANSITIONED);

        MigrationOperationSnapshot current = store.find(OPERATION).orElseThrow();
        assertThat(current.state()).isEqualTo(MigrationOperationState.AWAITING_EXTERNAL_APPLY);
        assertThat(current.externalApplyRequired()).isTrue();
    }

    @Test
    void retryFromExactVerifyingOnlyPersistsTheFinalState() {
        FileMigrationOperationStore store = seeded(ApplyMode.MANAGED_WRITE, 10);
        MigrationOperationSnapshot copying = store.find(OPERATION).orElseThrow();
        store.compareAndTransitionOrConfirm(
                OPERATION, MigrationOperationState.RUNNING, verifying(copying));

        assertThat(handoff(store, ApplyMode.MANAGED_WRITE).handoff(context()))
                .isEqualTo(RetainedCopyJournalDisposition.TRANSITIONED);
        assertThat(store.find(OPERATION).orElseThrow().state())
                .isEqualTo(MigrationOperationState.READY_TO_ACTIVATE);
    }

    @Test
    void exactFinalReplayOnlyConfirmsDurability() {
        FileMigrationOperationStore store = seeded(ApplyMode.MANAGED_WRITE, 10);
        DurableRetainedCopyJournalHandoff handoff = handoff(store, ApplyMode.MANAGED_WRITE);
        assertThat(handoff.handoff(context())).isEqualTo(RetainedCopyJournalDisposition.TRANSITIONED);

        assertThat(handoff.handoff(context())).isEqualTo(RetainedCopyJournalDisposition.ALREADY_CONFIRMED);
        assertThat(store.find(OPERATION).orElseThrow().state())
                .isEqualTo(MigrationOperationState.READY_TO_ACTIVATE);
    }

    @Test
    void failedFinalPublishLeavesVerifyingForJournalOnlyRetry() {
        FileMigrationOperationStore seed = seeded(ApplyMode.MANAGED_WRITE, 25);
        MigrationOperationFilePublisher delegate = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore failing = new FileMigrationOperationStore(root, (target, content) -> {
            if (publications.incrementAndGet() == 2) {
                throw new IOException("private path");
            }
            delegate.publish(target, content);
        });
        DurableRetainedCopyJournalHandoff handoff = handoff(failing, ApplyMode.MANAGED_WRITE);

        assertSafeFailure(SetupErrorCode.CONFIG_WRITE_FAILED, () -> handoff.handoff(context()));
        assertThat(seed.find(OPERATION).orElseThrow().stage()).isEqualTo(MigrationStage.VERIFYING);

        assertThat(handoff(seed, ApplyMode.MANAGED_WRITE).handoff(context()))
                .isEqualTo(RetainedCopyJournalDisposition.TRANSITIONED);
    }

    @Test
    void failedVerificationPublishLeavesCopyingForJournalOnlyRetry() {
        FileMigrationOperationStore seed = seeded(ApplyMode.MANAGED_WRITE, 25);
        MigrationOperationFilePublisher delegate = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore failing = new FileMigrationOperationStore(root, (target, content) -> {
            if (publications.incrementAndGet() == 1) {
                throw new IOException("private path");
            }
            delegate.publish(target, content);
        });

        assertSafeFailure(SetupErrorCode.CONFIG_WRITE_FAILED,
                () -> handoff(failing, ApplyMode.MANAGED_WRITE).handoff(context()));
        assertThat(seed.find(OPERATION).orElseThrow().stage()).isEqualTo(MigrationStage.COPYING);

        assertThat(handoff(seed, ApplyMode.MANAGED_WRITE).handoff(context()))
                .isEqualTo(RetainedCopyJournalDisposition.TRANSITIONED);
    }

    @Test
    void committedUncertainVerificationIsConfirmedBeforeFinalState() {
        seeded(ApplyMode.MANAGED_WRITE, 25);
        MigrationOperationFilePublisher delegate = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) -> {
            delegate.publish(target, content);
            if (publications.incrementAndGet() == 1) {
                throw new CommittedSetupFileDurabilityException();
            }
        });

        assertThat(handoff(uncertain, ApplyMode.MANAGED_WRITE).handoff(context()))
                .isEqualTo(RetainedCopyJournalDisposition.TRANSITIONED);
        assertThat(uncertain.find(OPERATION).orElseThrow().state())
                .isEqualTo(MigrationOperationState.READY_TO_ACTIVATE);
        assertThat(publications).hasValue(3);
    }

    @Test
    void committedUncertainFinalStateIsConfirmedBeforeSuccess() {
        seeded(ApplyMode.MANAGED_WRITE, 25);
        MigrationOperationFilePublisher delegate = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) -> {
            delegate.publish(target, content);
            if (publications.incrementAndGet() == 2) {
                throw new CommittedSetupFileDurabilityException();
            }
        });

        assertThat(handoff(uncertain, ApplyMode.MANAGED_WRITE).handoff(context()))
                .isEqualTo(RetainedCopyJournalDisposition.TRANSITIONED);
        assertThat(uncertain.find(OPERATION).orElseThrow().state())
                .isEqualTo(MigrationOperationState.READY_TO_ACTIVATE);
        assertThat(publications).hasValue(3);
    }

    @Test
    void mismatchedIdentityAndUnexpectedStateFailClosed() {
        FileMigrationOperationStore store = seeded(ApplyMode.MANAGED_WRITE, 10);
        DurableRetainedCopyJournalHandoff handoff = handoff(store, ApplyMode.MANAGED_WRITE);

        assertSafeFailure(SetupErrorCode.OPERATION_CONFLICT, () -> handoff.handoff(
                new RetainedCopyJournalContext(OPERATION, "b".repeat(64))));
        assertSafeFailure(SetupErrorCode.OPERATION_NOT_FOUND, () -> handoff.handoff(
                new RetainedCopyJournalContext("missing-operation", IDENTITY)));
    }

    @Test
    void immutableDraftMismatchNeverMutatesTheJournal() {
        FileMigrationOperationStore store = seeded(ApplyMode.MANAGED_WRITE, 10);
        MigrationOperationSnapshot before = store.find(OPERATION).orElseThrow();
        byte[] encodedBefore = readJournal();
        DurableCutoverDraft wrongGeneration = new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                CREATED, STARTED, "other-generation");
        DurableCutoverDraft wrongCreatedAt = new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                CREATED.minusSeconds(1), STARTED, GENERATION);
        DurableCutoverDraft wrongApplyMode = new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.EXTERNAL_APPLY,
                CREATED, STARTED, null);

        assertSafeFailure(SetupErrorCode.OPERATION_CONFLICT,
                () -> new DurableRetainedCopyJournalHandoff(wrongGeneration, store).handoff(context()));
        assertSafeFailure(SetupErrorCode.OPERATION_CONFLICT,
                () -> new DurableRetainedCopyJournalHandoff(wrongCreatedAt, store).handoff(context()));
        assertSafeFailure(SetupErrorCode.OPERATION_CONFLICT,
                () -> new DurableRetainedCopyJournalHandoff(wrongApplyMode, store).handoff(context()));

        assertThat(store.find(OPERATION)).contains(before);
        assertThat(readJournal()).containsExactly(encodedBefore);
    }

    @Test
    void handoffSurfaceIsCredentialFreeAndRedacted() {
        DurableRetainedCopyJournalHandoff handoff = handoff(
                seeded(ApplyMode.MANAGED_WRITE, 10), ApplyMode.MANAGED_WRITE);

        assertThat(handoff.toString())
                .doesNotContain("jdbc:", "password", "username", IDENTITY, GENERATION);
        assertThat(DurableRetainedCopyJournalHandoff.class.getDeclaredFields())
                .allMatch(field -> field.getType() == FileMigrationOperationStore.class
                        || field.getType() == DurableCutoverDraft.class);
    }

    private FileMigrationOperationStore seeded(ApplyMode applyMode, int progress) {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        String generation = applyMode == ApplyMode.MANAGED_WRITE ? GENERATION : null;
        MigrationOperationSnapshot pending = snapshot(
                applyMode, MigrationOperationState.PENDING, MigrationStage.QUEUED, 0,
                null, VerificationState.PENDING, false, false, generation);
        store.create(pending);
        store.compareAndTransition(OPERATION, MigrationOperationState.PENDING, snapshot(
                applyMode, MigrationOperationState.RUNNING, MigrationStage.COPYING, progress,
                STARTED, VerificationState.PENDING, false, false, generation));
        return store;
    }

    private static MigrationOperationSnapshot verifying(MigrationOperationSnapshot current) {
        return snapshot(current.applyMode(), MigrationOperationState.RUNNING, MigrationStage.VERIFYING,
                100, STARTED, VerificationState.RUNNING, false, false,
                current.managedCandidateGeneration());
    }

    private static MigrationOperationSnapshot snapshot(
            ApplyMode applyMode,
            MigrationOperationState state,
            MigrationStage stage,
            int progress,
            Instant startedAt,
            VerificationState verification,
            boolean activationAvailable,
            boolean externalApplyRequired,
            String generation) {
        return new MigrationOperationSnapshot(
                OPERATION, state, MigrationTarget.MYSQL, applyMode, stage, progress,
                CREATED, startedAt, null, verification, null, null,
                state == MigrationOperationState.RUNNING || state == MigrationOperationState.PENDING ? 1000 : 0,
                activationAvailable, false, externalApplyRequired, IDENTITY, generation);
    }

    private static RetainedCopyJournalContext context() {
        return new RetainedCopyJournalContext(OPERATION, IDENTITY);
    }

    private byte[] readJournal() {
        try {
            return Files.readAllBytes(root.resolve(FileMigrationOperationStore.RELATIVE_PATH));
        } catch (IOException failure) {
            throw new AssertionError(failure);
        }
    }

    private static DurableRetainedCopyJournalHandoff handoff(
            FileMigrationOperationStore store, ApplyMode applyMode) {
        String generation = applyMode == ApplyMode.MANAGED_WRITE ? GENERATION : null;
        DurableCutoverDraft draft = new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, applyMode, CREATED, STARTED, generation);
        return new DurableRetainedCopyJournalHandoff(draft, store);
    }

    private static void assertSafeFailure(SetupErrorCode code, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(RetainedCopyJournalHandoffException.class,
                        failure -> assertThat(failure.errorCode()).isEqualTo(code))
                .hasNoCause()
                .hasMessageNotContaining("private path")
                .hasMessageNotContaining("jdbc:")
                .hasMessageNotContaining("password")
                .hasMessageNotContaining("username");
    }
}
