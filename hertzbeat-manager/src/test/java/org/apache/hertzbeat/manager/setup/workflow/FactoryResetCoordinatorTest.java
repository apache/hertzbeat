/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.FactoryResetRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.runtime.FactoryResetStateStore;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class FactoryResetCoordinatorTest {

    private final FactoryResetStateStore state = mock(FactoryResetStateStore.class);
    private final FactoryResetDataCleaner data = mock(FactoryResetDataCleaner.class);
    private final FactoryResetLocalStateCleaner local = mock(FactoryResetLocalStateCleaner.class);
    private final SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
    private final FactoryResetCoordinator coordinator = new FactoryResetCoordinator(
            state, data, local, transition, Runnable::run);

    @Test
    void admitsOnlyTheExactDestructiveConfirmationAndLeavesCleanupToTheGatedRuntime() throws Exception {
        assertThrows(SetupApiException.class,
                () -> coordinator.reset(new FactoryResetRequest("reset hertzbeat")));

        assertThat(coordinator.reset(new FactoryResetRequest("RESET HERTZBEAT")).accepted()).isTrue();

        verify(state).request();
        verify(transition).factoryResetRequested();
        verify(data, never()).clean();
    }

    @Test
    void requestedResetCleansDataAndLocalStateBeforeReturningToSetup() throws Exception {
        when(state.load()).thenReturn(Optional.of(FactoryResetStateStore.State.REQUESTED));

        coordinator.resumePendingReset();

        InOrder order = inOrder(data, local, state, transition);
        order.verify(data).clean();
        order.verify(local).clearManagedState();
        order.verify(state).markCleaned();
        order.verify(transition).factoryResetCompleted();
        order.verify(local).clearClosedDatabaseFiles();
        order.verify(state).clearCompleted();
    }

    @Test
    void cleanedResetOnlyFinishesTheContextAndFilesystemTransition() throws Exception {
        when(state.load()).thenReturn(Optional.of(FactoryResetStateStore.State.CLEANED));

        coordinator.resumePendingReset();

        verify(data, never()).clean();
        verify(local, never()).clearManagedState();
        verify(transition).factoryResetCompleted();
        verify(local).clearClosedDatabaseFiles();
        verify(state).clearCompleted();
    }

    @Test
    void failedCleanupRetainsTheDurableRequestForRestartRecovery() throws Exception {
        when(state.load()).thenReturn(Optional.of(FactoryResetStateStore.State.REQUESTED));
        org.mockito.Mockito.doThrow(new IllegalStateException("telemetry unavailable"))
                .when(data).clean();

        coordinator.resumePendingReset();

        verify(state, never()).markCleaned();
        verify(state, never()).clearCompleted();
        verify(transition, never()).factoryResetCompleted();
    }

    @Test
    void admissionFailureDoesNotDispatchContextReplacement() throws Exception {
        org.mockito.Mockito.doThrow(new IOException("disk full")).when(state).request();

        assertThrows(SetupApiException.class,
                () -> coordinator.reset(new FactoryResetRequest("RESET HERTZBEAT")));

        verify(transition, never()).factoryResetRequested();
    }
}
