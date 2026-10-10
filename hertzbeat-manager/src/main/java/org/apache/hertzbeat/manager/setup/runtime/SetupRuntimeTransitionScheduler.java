/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.runtime;

import java.io.IOException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.setup.runtime.SetupTransitionIntentStore.Intent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

/** Serializes durable setup transitions, including bounded retry and restart recovery. */
public final class SetupRuntimeTransitionScheduler implements AutoCloseable {
    private static final Logger LOGGER = LoggerFactory.getLogger(SetupRuntimeTransitionScheduler.class);
    private static final int MAX_TRANSITION_ATTEMPTS = 4;
    private static final int MAX_CLEAR_ATTEMPTS = 4;
    private static final int MAX_RECOVERY_ATTEMPTS = 4;
    private static final int MAX_DISPATCH_ATTEMPTS = 4;
    private static final long INITIAL_RETRY_MILLIS = 250;
    private final SetupRuntimeTransition transition;
    private final SetupTransitionIntentStore intents;
    private final TaskDispatcher dispatcher;
    private final ScheduledExecutorService executor;
    private boolean ready;
    private boolean recoveryFinished;
    private boolean closed;
    private Intent running;
    private Intent pending;
    private Intent completedUncleared;
    private int attempts;
    private int clearAttempts;
    private int recoveryAttempts;

    public SetupRuntimeTransitionScheduler(
            SetupRuntimeTransition transition, SetupTransitionIntentStore intents,
            ScheduledExecutorService executor) {
        this(transition, intents,
                (task, delayMillis) -> executor.schedule(task, delayMillis, TimeUnit.MILLISECONDS), executor);
    }

    SetupRuntimeTransitionScheduler(
            SetupRuntimeTransition transition, SetupTransitionIntentStore intents, TaskDispatcher dispatcher) {
        this(transition, intents, dispatcher, null);
    }

    private SetupRuntimeTransitionScheduler(
            SetupRuntimeTransition transition, SetupTransitionIntentStore intents,
            TaskDispatcher dispatcher, ScheduledExecutorService executor) {
        this.transition = transition;
        this.intents = intents;
        this.dispatcher = dispatcher;
        this.executor = executor;
    }

    public synchronized void configurationApplied() {
        request(Intent.CONFIGURATION_APPLIED);
    }

    public synchronized void installationCompleted() {
        request(Intent.INSTALLATION_COMPLETED);
    }

    @EventListener
    public synchronized void onApplicationReady(ApplicationReadyEvent ignored) {
        if (closed || recoveryFinished || recoveryAttempts > 0) {
            return;
        }
        recoverIntent();
    }

    private synchronized void recoverIntent() {
        if (closed || recoveryFinished) {
            return;
        }
        recoveryAttempts++;
        Intent recovered;
        try {
            recovered = intents.load().orElse(null);
        } catch (IOException | RuntimeException failure) {
            retryRecoveryLoad();
            return;
        }
        finishRecovery(recovered);
    }

    private void retryRecoveryLoad() {
        LOGGER.warn("Cannot recover the pending setup runtime transition");
        if (recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
            long delayMillis = INITIAL_RETRY_MILLIS << (recoveryAttempts - 1);
            if (submit(this::recoverIntent, delayMillis)) {
                return;
            }
            LOGGER.warn("Cannot dispatch setup runtime transition recovery");
        }
        finishRecovery(null);
    }

    private void finishRecovery(Intent recovered) {
        recoveryFinished = true;
        recoveryAttempts = 0;
        ready = true;
        if (recovered != null) {
            request(recovered);
        } else {
            dispatchIfReady();
        }
    }

    private void request(Intent requested) {
        if (closed || running == Intent.INSTALLATION_COMPLETED || running == requested) {
            return;
        }
        if (pending == Intent.INSTALLATION_COMPLETED) {
            dispatchIfReady();
            return;
        }
        if (completedUncleared == Intent.INSTALLATION_COMPLETED) {
            if (requested == Intent.INSTALLATION_COMPLETED) {
                running = requested;
                clearAttempts = 0;
                dispatchClear(requested, 0);
            }
            return;
        }
        if (requested == completedUncleared) {
            running = requested;
            clearAttempts = 0;
            dispatchClear(requested, 0);
            return;
        }
        if (pending == null || requested.supersedes(pending)) {
            pending = requested;
        }
        dispatchIfReady();
    }

    private void dispatchIfReady() {
        if (closed || !ready || running != null || pending == null) {
            return;
        }
        Intent selected = pending;
        pending = null;
        running = selected;
        attempts = 0;
        dispatchTransition(selected, 0);
    }

    private void dispatchTransition(Intent selected, long delayMillis) {
        if (!submit(() -> run(selected), delayMillis)) {
            LOGGER.warn("Cannot dispatch the pending setup runtime transition");
            running = null;
            attempts = 0;
            retainPending(selected);
        }
    }

    private boolean submit(Runnable task, long delayMillis) {
        for (int dispatchAttempt = 0; dispatchAttempt < MAX_DISPATCH_ATTEMPTS; dispatchAttempt++) {
            try {
                dispatcher.dispatch(task, delayMillis);
                return true;
            } catch (RuntimeException failure) {
                // A rejected task was not accepted; retry is bounded and does not create another thread.
            }
        }
        return false;
    }

    private void retainPending(Intent selected) {
        if (pending == null || selected.supersedes(pending)) {
            pending = selected;
        }
    }

    private void run(Intent selected) {
        synchronized (this) {
            if (closed || running != selected) {
                if (running == selected) {
                    running = null;
                    attempts = 0;
                }
                return;
            }
            attempts++;
        }
        try {
            execute(selected);
        } catch (RuntimeException failure) {
            retry(selected);
            return;
        }
        synchronized (this) {
            completedUncleared = selected;
            attempts = 0;
            clearAttempts = 0;
        }
        clearAfterSuccess(selected);
    }

    private void execute(Intent selected) {
        if (selected == Intent.INSTALLATION_COMPLETED) {
            transition.completeSetup();
        } else {
            transition.configurationApplied();
        }
    }

    private void retry(Intent selected) {
        synchronized (this) {
            LOGGER.warn("Setup runtime transition failed; its durable intent remains pending");
            if (!closed && attempts < MAX_TRANSITION_ATTEMPTS) {
                dispatchTransition(selected, INITIAL_RETRY_MILLIS << (attempts - 1));
                return;
            }
            running = null;
            attempts = 0;
            dispatchIfReady();
        }
    }

    private void clearAfterSuccess(Intent selected) {
        try {
            intents.clear(selected);
        } catch (IOException | RuntimeException failure) {
            retryClear(selected);
            return;
        }
        synchronized (this) {
            completedUncleared = null;
            running = null;
            clearAttempts = 0;
            dispatchIfReady();
        }
    }

    private void retryClear(Intent selected) {
        synchronized (this) {
            LOGGER.warn("Cannot clear the completed setup runtime transition intent");
            clearAttempts++;
            if (!closed && clearAttempts < MAX_CLEAR_ATTEMPTS) {
                dispatchClear(selected, INITIAL_RETRY_MILLIS << (clearAttempts - 1));
                return;
            }
            running = null;
            clearAttempts = 0;
            dispatchIfReady();
        }
    }

    private void dispatchClear(Intent selected, long delayMillis) {
        if (!submit(() -> clearAfterSuccess(selected), delayMillis)) {
            LOGGER.warn("Cannot dispatch the completed setup runtime transition clear");
            running = null;
            clearAttempts = 0;
            dispatchIfReady();
        }
    }

    @Override
    public synchronized void close() {
        closed = true;
        pending = null;
        if (executor != null) {
            executor.shutdown();
        }
    }

    @FunctionalInterface
    interface TaskDispatcher {
        void dispatch(Runnable task, long delayMillis);
    }
}
