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

import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.junit.jupiter.api.Test;

class RetainedCutoverStatusTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);

    @Test
    void queryIsTotalAndSecretFreeAcrossEveryOwnedPhase() {
        assertThat(new RetainedCutoverState().status()).isEqualTo(RetainedCutoverStatus.empty());
        assertThat(RetainedCutoverStatus.class.getRecordComponents())
                .extracting(component -> component.getName())
                .containsExactly("operationId", "phase");

        assertThat(executing().state().status().phase()).isEqualTo(RetainedCutoverStatus.Phase.EXECUTING);
        assertThat(handoffing().state().status().phase())
                .isEqualTo(RetainedCutoverStatus.Phase.HANDOFFING);
        assertThat(handoffPending().state().status().phase())
                .isEqualTo(RetainedCutoverStatus.Phase.HANDOFF_PENDING);
        assertThat(retained().state().status().phase()).isEqualTo(RetainedCutoverStatus.Phase.RETAINED);
        assertThat(activating().state().status().phase())
                .isEqualTo(RetainedCutoverStatus.Phase.ACTIVATING);
        assertThat(activationPending().state().status().phase())
                .isEqualTo(RetainedCutoverStatus.Phase.ACTIVATION_PENDING);
        assertThat(awaitingRestart().state().status().phase())
                .isEqualTo(RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED);
        assertThat(releasing().state().status().phase())
                .isEqualTo(RetainedCutoverStatus.Phase.RELEASING);
        assertThat(releasePending().state().status().phase())
                .isEqualTo(RetainedCutoverStatus.Phase.RELEASE_PENDING);
    }

    @Test
    void foreignOperationCannotUseStatusAsReleaseCapability() {
        RetainedCutoverState state = retained().state();

        assertThat(state.status().operationId()).isEqualTo(OPERATION);
        assertThatThrownBy(() -> state.claimRetainedRelease("operation-b"))
                .isInstanceOf(MigrationMaintenanceException.class)
                .hasNoCause();
    }

    private static TestState executing() {
        RetainedCutoverState state = new RetainedCutoverState();
        RetainedCutoverState.Execution execution =
                state.reserve(OPERATION, context -> RetainedCopyJournalDisposition.TRANSITIONED);
        execution.targetIdentityHash(IDENTITY);
        return new TestState(state, execution);
    }

    private static TestState handoffPending() {
        TestState test = handoffing();
        test.state().handoffPending(test.execution());
        return test;
    }

    private static TestState handoffing() {
        TestState test = executing();
        test.state().beginHandoff(test.execution(), mock(MigrationMaintenanceLease.class));
        return test;
    }

    private static TestState retained() {
        TestState test = executing();
        test.state().beginHandoff(test.execution(), mock(MigrationMaintenanceLease.class));
        test.state().completeHandoff(test.execution(), RetainedCopyJournalDisposition.TRANSITIONED);
        return test;
    }

    private static TestState activationPending() {
        TestState test = activating();
        test.state().activationPending(test.execution());
        return test;
    }

    private static TestState activating() {
        TestState test = retained();
        RetainedManagedActivationClaim claim = test.state().claimManagedActivation(
                OPERATION, context -> RetainedManagedActivationDisposition.ACTIVATED);
        return new TestState(test.state(), claim.execution());
    }

    private static TestState awaitingRestart() {
        TestState test = retained();
        RetainedManagedActivationClaim claim = test.state().claimManagedActivation(
                OPERATION, context -> RetainedManagedActivationDisposition.ACTIVATED);
        test.state().completeActivation(claim.execution(), RetainedManagedActivationDisposition.ACTIVATED);
        return test;
    }

    private static TestState releasePending() {
        TestState test = releasing();
        test.state().releasePending(test.execution(), test.execution().release());
        return test;
    }

    private static TestState releasing() {
        TestState test = retained();
        return new TestState(test.state(), test.state().claimRetainedRelease(OPERATION));
    }

    private record TestState(
            RetainedCutoverState state, RetainedCutoverState.Execution execution) { }
}
