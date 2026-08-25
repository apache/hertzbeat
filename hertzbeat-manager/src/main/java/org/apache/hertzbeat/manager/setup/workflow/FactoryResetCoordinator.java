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

import java.io.IOException;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.FactoryResetRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.FactoryResetResponse;
import org.apache.hertzbeat.manager.setup.api.FactoryResetWorkflow;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.runtime.FactoryResetStateStore;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

/** Admits, resumes, and converges one restart-safe complete factory reset. */
public final class FactoryResetCoordinator implements FactoryResetWorkflow, AutoCloseable {

    public static final String CONFIRMATION = "RESET HERTZBEAT";
    private static final Logger LOGGER = LoggerFactory.getLogger(FactoryResetCoordinator.class);
    private final FactoryResetStateStore state;
    private final CleanerProvider cleanerProvider;
    private final FactoryResetLocalStateCleaner localState;
    private final SetupRuntimeTransition transition;
    private final TaskDispatcher dispatcher;
    private boolean closed;

    FactoryResetCoordinator(
            FactoryResetStateStore state,
            FactoryResetDataCleaner dataCleaner,
            FactoryResetLocalStateCleaner localState,
            SetupRuntimeTransition transition,
            TaskDispatcher dispatcher) {
        this(state, () -> dataCleaner, localState, transition, dispatcher);
    }

    public FactoryResetCoordinator(
            FactoryResetStateStore state,
            CleanerProvider cleanerProvider,
            FactoryResetLocalStateCleaner localState,
            SetupRuntimeTransition transition,
            TaskDispatcher dispatcher) {
        this.state = Objects.requireNonNull(state, "state");
        this.cleanerProvider = Objects.requireNonNull(cleanerProvider, "cleanerProvider");
        this.localState = Objects.requireNonNull(localState, "localState");
        this.transition = Objects.requireNonNull(transition, "transition");
        this.dispatcher = Objects.requireNonNull(dispatcher, "dispatcher");
    }

    @Override
    public synchronized FactoryResetResponse reset(FactoryResetRequest request) {
        if (request == null || !CONFIRMATION.equals(request.confirmation())) {
            throw new SetupApiException(SetupErrorCode.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
        }
        try {
            state.request();
        } catch (IOException | RuntimeException failure) {
            throw new SetupApiException(SetupErrorCode.CONFIG_WRITE_FAILED,
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
        dispatch(transition::factoryResetRequested);
        return new FactoryResetResponse(true);
    }

    public synchronized void resumePendingReset() {
        dispatch(this::converge);
    }

    @EventListener
    public void onApplicationReady(ApplicationReadyEvent ignored) {
        resumePendingReset();
    }

    private void converge() {
        try {
            FactoryResetStateStore.State phase = state.load().orElse(null);
            if (phase == null) {
                return;
            }
            if (phase == FactoryResetStateStore.State.REQUESTED) {
                FactoryResetDataCleaner cleaner = cleanerProvider.get();
                if (cleaner == null) {
                    throw new IllegalStateException("Factory reset data cleaner is unavailable");
                }
                cleaner.clean();
                localState.clearManagedState();
                state.markCleaned();
            }
            transition.factoryResetCompleted();
            localState.clearClosedDatabaseFiles();
            state.clearCompleted();
        } catch (IOException | RuntimeException failure) {
            LOGGER.error("Factory reset did not converge; the durable request will be retried", failure);
        }
    }

    private synchronized void dispatch(Runnable task) {
        if (closed) {
            return;
        }
        try {
            dispatcher.dispatch(task);
        } catch (RuntimeException failure) {
            LOGGER.error("Factory reset task could not be dispatched", failure);
        }
    }

    @Override
    public synchronized void close() {
        closed = true;
    }

    /** Resolves the destructive cleaner only inside the gated full runtime. */
    @FunctionalInterface
    public interface CleanerProvider {

        FactoryResetDataCleaner get();
    }

    /** Dispatches reset work outside the HTTP and application-ready threads. */
    @FunctionalInterface
    public interface TaskDispatcher {

        void dispatch(Runnable task);
    }
}
