/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.CandidateEvidence.EXACT;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.CLEANUP_TERMINAL_CANDIDATE;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.CREDENTIALS_REQUIRED_FOR_COPY_VERIFICATION;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.CREDENTIALS_REQUIRED_FOR_PREPARATION;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.HOLD_READY_UNDER_STARTUP_GATE;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.NONE;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.RECOVER_ACTIVATION;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.RECOVER_ROLLBACK;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.RESUME_PREPARATION;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.VERIFY_COPY_OUTCOME;
import static org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan.VERIFY_RESTART_CONVERGENCE;

import java.time.Instant;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.CandidateEvidence;
import org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class MigrationRestartClassifierTest {

    private static final String TARGET_IDENTITY_HASH =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String CANDIDATE_GENERATION = "candidate-generation-1";
    private static final Instant CREATED = Instant.parse("2026-08-10T01:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);
    private static final Instant COMPLETED = STARTED.plusSeconds(1);
    private static final Plan R = Plan.RECOVERY_REQUIRED;
    private final MigrationRestartClassifier classifier = new MigrationRestartClassifier();

    @ParameterizedTest(name = "{0}-{1}-{2}-{3}")
    @MethodSource("restartCases")
    void classifiesEveryDurablePhaseAndEvidence(
            ApplyMode mode, MigrationOperationState state, MigrationStage stage,
            CandidateEvidence evidence, Plan expected) {
        assertThat(classifier.classify(snapshot(mode, state, stage, progress(stage)), evidence))
                .isEqualTo(expected);
    }

    @Test
    void copyProgressDoesNotChangeRecoveryPlan() {
        for (int progress : new int[] {0, 10, 99}) {
            MigrationOperationSnapshot snapshot = snapshot(
                    ApplyMode.MANAGED_WRITE, MigrationOperationState.RUNNING, MigrationStage.COPYING, progress);
            assertThat(classifier.classify(snapshot, EXACT)).isEqualTo(VERIFY_COPY_OUTCOME);
        }
    }

    @Test
    void classificationNamesExposeNoConfigurationOrDataIdentity() {
        Set<String> forbidden = Set.of("jdbc", "url", "user", "password", "table", "checksum");
        assertThat(Arrays.stream(Plan.values()).map(Enum::name).map(value -> value.toLowerCase(Locale.ROOT)))
                .allSatisfy(value -> assertThat(forbidden).noneMatch(value::contains));
        assertThat(Arrays.stream(CandidateEvidence.values()).map(Enum::name)
                .map(value -> value.toLowerCase(Locale.ROOT)))
                .allSatisfy(value -> assertThat(forbidden).noneMatch(value::contains));
    }

    @Test
    void credentialPlansCannotTurnVerificationRecoveryIntoCopyExecution() {
        assertThat(CREDENTIALS_REQUIRED_FOR_COPY_VERIFICATION)
                .isNotEqualTo(CREDENTIALS_REQUIRED_FOR_PREPARATION);
        assertThat(CREDENTIALS_REQUIRED_FOR_COPY_VERIFICATION.name())
                .contains("VERIFICATION")
                .doesNotContain("RESUME", "COPY_EXECUTION");
    }

    private static Stream<Arguments> restartCases() {
        return Stream.concat(managedCases(), externalCases());
    }

    private static Stream<Arguments> managedCases() {
        return Stream.of(
                phase(ApplyMode.MANAGED_WRITE, MigrationOperationState.PENDING, MigrationStage.QUEUED,
                        R, CREDENTIALS_REQUIRED_FOR_PREPARATION, RESUME_PREPARATION, R, R),
                phase(ApplyMode.MANAGED_WRITE, MigrationOperationState.RUNNING, MigrationStage.COPYING,
                        R, R, VERIFY_COPY_OUTCOME, R, R),
                phase(ApplyMode.MANAGED_WRITE, MigrationOperationState.RUNNING, MigrationStage.VERIFYING,
                        R, R, VERIFY_COPY_OUTCOME, R, R),
                phase(ApplyMode.MANAGED_WRITE, MigrationOperationState.READY_TO_ACTIVATE,
                        MigrationStage.READY_TO_ACTIVATE, R, R, HOLD_READY_UNDER_STARTUP_GATE, R, R),
                phase(ApplyMode.MANAGED_WRITE, MigrationOperationState.RUNNING, MigrationStage.ACTIVATING,
                        R, R, RECOVER_ACTIVATION, R, R),
                phase(ApplyMode.MANAGED_WRITE, MigrationOperationState.AWAITING_RESTART,
                        MigrationStage.AWAITING_RESTART, R, R, VERIFY_RESTART_CONVERGENCE, R, R),
                phase(ApplyMode.MANAGED_WRITE, MigrationOperationState.RUNNING, MigrationStage.ROLLING_BACK,
                        R, R, RECOVER_ROLLBACK, R, R),
                phase(ApplyMode.MANAGED_WRITE, MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                        MigrationStage.AWAITING_EXTERNAL_APPLY, R, R, R, R, R),
                terminal(ApplyMode.MANAGED_WRITE, MigrationOperationState.SUCCEEDED, MigrationStage.COMPLETED,
                        R, NONE, CLEANUP_TERMINAL_CANDIDATE, R, R),
                terminal(ApplyMode.MANAGED_WRITE, MigrationOperationState.FAILED, MigrationStage.FAILED,
                        R, NONE, CLEANUP_TERMINAL_CANDIDATE, R, R),
                terminal(ApplyMode.MANAGED_WRITE, MigrationOperationState.ROLLED_BACK,
                        MigrationStage.ROLLED_BACK, R, NONE, CLEANUP_TERMINAL_CANDIDATE, R, R))
                .flatMap(stream -> stream);
    }

    private static Stream<Arguments> externalCases() {
        return Stream.of(
                phase(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.PENDING, MigrationStage.QUEUED,
                        CREDENTIALS_REQUIRED_FOR_PREPARATION, R, R, R, R),
                phase(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.RUNNING, MigrationStage.COPYING,
                        CREDENTIALS_REQUIRED_FOR_COPY_VERIFICATION, R, R, R, R),
                phase(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.RUNNING, MigrationStage.VERIFYING,
                        CREDENTIALS_REQUIRED_FOR_COPY_VERIFICATION, R, R, R, R),
                phase(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                        MigrationStage.AWAITING_EXTERNAL_APPLY, VERIFY_RESTART_CONVERGENCE, R, R, R, R),
                phase(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.AWAITING_RESTART,
                        MigrationStage.AWAITING_RESTART, VERIFY_RESTART_CONVERGENCE, R, R, R, R),
                phase(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.READY_TO_ACTIVATE,
                        MigrationStage.READY_TO_ACTIVATE, R, R, R, R, R),
                phase(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.RUNNING, MigrationStage.ACTIVATING,
                        R, R, R, R, R),
                phase(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.RUNNING, MigrationStage.ROLLING_BACK,
                        R, R, R, R, R),
                terminal(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.SUCCEEDED, MigrationStage.COMPLETED,
                        NONE, R, R, R, R),
                terminal(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.FAILED, MigrationStage.FAILED,
                        NONE, R, R, R, R),
                terminal(ApplyMode.EXTERNAL_APPLY, MigrationOperationState.ROLLED_BACK,
                        MigrationStage.ROLLED_BACK, NONE, R, R, R, R))
                .flatMap(stream -> stream);
    }

    private static Stream<Arguments> phase(
            ApplyMode mode, MigrationOperationState state, MigrationStage stage, Plan... expected) {
        CandidateEvidence[] evidence = CandidateEvidence.values();
        return IntStream.range(0, evidence.length)
                .mapToObj(index -> Arguments.of(mode, state, stage, evidence[index], expected[index]));
    }

    private static Stream<Arguments> terminal(
            ApplyMode mode, MigrationOperationState state, MigrationStage stage, Plan... expected) {
        return phase(mode, state, stage, expected);
    }

    private static MigrationOperationSnapshot snapshot(
            ApplyMode mode, MigrationOperationState state, MigrationStage stage, int progress) {
        VerificationState verification = verification(stage);
        SetupErrorCode error = error(state);
        MigrationRollbackOrigin rollback = rollback(state, stage);
        return new MigrationOperationSnapshot(
                "migration-1", state, MigrationTarget.MYSQL, mode, stage, progress, CREATED,
                state == MigrationOperationState.PENDING ? null : STARTED,
                terminal(state) ? COMPLETED : null, verification, error, rollback,
                polling(state), state == MigrationOperationState.READY_TO_ACTIVATE,
                state == MigrationOperationState.AWAITING_RESTART,
                state == MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                TARGET_IDENTITY_HASH, mode == ApplyMode.MANAGED_WRITE ? CANDIDATE_GENERATION : null);
    }

    private static int progress(MigrationStage stage) {
        return switch (stage) {
            case QUEUED -> 0;
            case COPYING, FAILED -> 10;
            default -> 100;
        };
    }

    private static VerificationState verification(MigrationStage stage) {
        return switch (stage) {
            case QUEUED, COPYING, FAILED -> VerificationState.PENDING;
            case VERIFYING -> VerificationState.RUNNING;
            default -> VerificationState.SUCCEEDED;
        };
    }

    private static SetupErrorCode error(MigrationOperationState state) {
        return switch (state) {
            case FAILED -> SetupErrorCode.MIGRATION_COPY_FAILED;
            case ROLLED_BACK -> SetupErrorCode.MIGRATION_ACTIVATION_FAILED;
            default -> null;
        };
    }

    private static MigrationRollbackOrigin rollback(
            MigrationOperationState state, MigrationStage stage) {
        return state == MigrationOperationState.ROLLED_BACK || stage == MigrationStage.ROLLING_BACK
                ? MigrationRollbackOrigin.ACTIVATION_FAILURE : null;
    }

    private static long polling(MigrationOperationState state) {
        return state == MigrationOperationState.PENDING || state == MigrationOperationState.RUNNING
                || state == MigrationOperationState.AWAITING_RESTART ? 1000 : 0;
    }

    private static boolean terminal(MigrationOperationState state) {
        return state == MigrationOperationState.SUCCEEDED
                || state == MigrationOperationState.FAILED
                || state == MigrationOperationState.ROLLED_BACK;
    }
}
