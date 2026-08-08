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

import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

/** Serializes deferred context transitions and never runs them before application readiness. */
public final class SetupRuntimeTransitionScheduler implements AutoCloseable {
    private final SetupRuntimeTransition transition;
    private final Executor executor;
    private boolean ready;
    private boolean closed;
    private Transition running;
    private Transition pending;

    public SetupRuntimeTransitionScheduler(SetupRuntimeTransition transition, Executor executor) {
        this.transition = transition;
        this.executor = executor;
    }

    public synchronized void configurationApplied() {
        request(Transition.CONFIGURATION);
    }

    public synchronized void installationCompleted() {
        request(Transition.COMPLETION);
    }

    @EventListener
    public synchronized void onApplicationReady(ApplicationReadyEvent ignored) {
        ready = true;
        dispatchIfReady();
    }

    private void dispatchIfReady() {
        if (closed || !ready || running != null || pending == null) {
            return;
        }
        Transition selected = pending;
        pending = null;
        running = selected;
        executor.execute(() -> run(selected));
    }

    private void request(Transition requested) {
        if (closed
                || running == Transition.COMPLETION
                || running == requested
                || pending == Transition.COMPLETION) {
            return;
        }
        pending = requested;
        dispatchIfReady();
    }

    private void run(Transition selected) {
        try {
            if (selected == Transition.COMPLETION) {
                transition.completeSetup();
            } else {
                transition.configurationApplied();
            }
        } finally {
            synchronized (this) {
                running = null;
                dispatchIfReady();
            }
        }
    }

    @Override
    public synchronized void close() {
        closed = true;
        pending = null;
        if (executor instanceof ExecutorService service) {
            service.shutdown();
        }
    }

    private enum Transition { CONFIGURATION, COMPLETION }
}
