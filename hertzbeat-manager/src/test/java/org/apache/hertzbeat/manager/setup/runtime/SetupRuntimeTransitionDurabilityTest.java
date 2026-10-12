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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.setup.runtime.SetupTransitionIntentStore.Intent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.context.event.ApplicationReadyEvent;

class SetupRuntimeTransitionDurabilityTest {
    @TempDir
    private Path installationRoot;

    @Test
    void failedTransitionRetainsIntentAndRetriesBeforeClearingOnSuccess() throws Exception {
        MemoryIntentStore intents = new MemoryIntentStore(Intent.CONFIGURATION_APPLIED);
        ManualDispatcher dispatcher = new ManualDispatcher();
        AtomicInteger calls = new AtomicInteger();
        SetupRuntimeTransition transition = () -> {
            if (calls.getAndIncrement() == 0) {
                throw new IllegalStateException("controlled failure");
            }
        };
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                transition, intents, dispatcher::dispatch);

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        dispatcher.runNext();

        assertThat(intents.load()).contains(Intent.CONFIGURATION_APPLIED);
        assertThat(intents.clears).isZero();
        assertThat(dispatcher.delays()).containsExactly(0L, 250L);

        dispatcher.runNext();

        assertThat(calls).hasValue(2);
        assertThat(intents.load()).isEmpty();
        assertThat(intents.clears).isOne();
    }

    @Test
    void retryBackoffAndAttemptsAreBoundedWhileIntentRemainsDurable() throws Exception {
        MemoryIntentStore intents = new MemoryIntentStore(Intent.INSTALLATION_COMPLETED);
        ManualDispatcher dispatcher = new ManualDispatcher();
        SetupRuntimeTransition transition = () -> {
            throw new IllegalStateException("controlled failure");
        };
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                transition, intents, dispatcher::dispatch);

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        dispatcher.runAll();

        assertThat(dispatcher.delays()).containsExactly(0L, 250L, 500L, 1_000L);
        assertThat(intents.load()).contains(Intent.INSTALLATION_COMPLETED);
        assertThat(intents.clears).isZero();
    }

    @Test
    void newSchedulerRecoversPendingIntentAndDuplicateSignalsDoNotDoubleExecute() throws Exception {
        FileSetupTransitionIntentStore firstProcess = new FileSetupTransitionIntentStore(installationRoot);
        firstProcess.save(Intent.CONFIGURATION_APPLIED);
        ManualDispatcher dispatcher = new ManualDispatcher();
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        SetupRuntimeTransitionScheduler restarted = new SetupRuntimeTransitionScheduler(
                transition, new FileSetupTransitionIntentStore(installationRoot), dispatcher::dispatch);

        restarted.configurationApplied();
        restarted.configurationApplied();
        restarted.onApplicationReady(mock(ApplicationReadyEvent.class));
        restarted.configurationApplied();

        assertThat(dispatcher.tasks).hasSize(1);
        dispatcher.runNext();

        verify(transition, times(1)).configurationApplied();
        assertThat(firstProcess.load()).isEmpty();
        assertThat(dispatcher.tasks).isEmpty();
    }

    @Test
    void clearFailureRetriesWithoutRepeatingTransitionAndDuplicateWakeRetriesOnlyTheClear() throws Exception {
        MemoryIntentStore intents = new MemoryIntentStore(Intent.INSTALLATION_COMPLETED);
        intents.clearFailures = 4;
        ManualDispatcher dispatcher = new ManualDispatcher();
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                transition, intents, dispatcher::dispatch);

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        dispatcher.runAll();

        verify(transition, times(1)).completeSetup();
        assertThat(dispatcher.delays()).containsExactly(0L, 250L, 500L, 1_000L);
        assertThat(intents.load()).contains(Intent.INSTALLATION_COMPLETED);

        intents.clearFailures = 0;
        scheduler.installationCompleted();
        dispatcher.runAll();

        verify(transition, times(1)).completeSetup();
        assertThat(intents.load()).isEmpty();
    }

    @Test
    void dispatcherRejectionIsBoundedAndTransientRejectionRecoversInProcess() throws Exception {
        MemoryIntentStore intents = new MemoryIntentStore(Intent.CONFIGURATION_APPLIED);
        RejectingDispatcher dispatcher = new RejectingDispatcher(1);
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                transition, intents, dispatcher::dispatch);

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));

        assertThat(dispatcher.dispatchCalls).isEqualTo(2);
        assertThat(dispatcher.tasks).hasSize(1);
        dispatcher.tasks.removeFirst().run();
        verify(transition, times(1)).configurationApplied();
        assertThat(intents.load()).isEmpty();

        MemoryIntentStore retained = new MemoryIntentStore(Intent.CONFIGURATION_APPLIED);
        RejectingDispatcher unavailable = new RejectingDispatcher(4);
        SetupRuntimeTransition recoveredTransition = mock(SetupRuntimeTransition.class);
        SetupRuntimeTransitionScheduler bounded = new SetupRuntimeTransitionScheduler(
                recoveredTransition, retained, unavailable::dispatch);
        bounded.onApplicationReady(mock(ApplicationReadyEvent.class));

        assertThat(unavailable.dispatchCalls).isEqualTo(4);
        assertThat(retained.load()).contains(Intent.CONFIGURATION_APPLIED);

        bounded.configurationApplied();
        assertThat(unavailable.dispatchCalls).isEqualTo(5);
        assertThat(unavailable.tasks).hasSize(1);
        unavailable.tasks.removeFirst().run();

        verify(recoveredTransition, times(1)).configurationApplied();
        assertThat(retained.load()).isEmpty();
    }

    @Test
    void recoveryLoadRetriesCheckedAndRuntimeFailuresBeforeDispatchingTheRecoveredIntent() throws Exception {
        for (Throwable firstFailure : List.<Throwable>of(
                new IOException("controlled read failure"),
                new IllegalStateException("controlled provider failure"))) {
            MemoryIntentStore intents = new MemoryIntentStore(Intent.CONFIGURATION_APPLIED);
            intents.loadFailure = firstFailure;
            intents.loadFailures = 1;
            ManualDispatcher dispatcher = new ManualDispatcher();
            SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
            SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                    transition, intents, dispatcher::dispatch);

            scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));

            assertThat(intents.loads).isOne();
            assertThat(dispatcher.delays()).containsExactly(250L);
            dispatcher.runNext();
            assertThat(intents.loads).isEqualTo(2);
            assertThat(dispatcher.delays()).containsExactly(250L, 0L);
            dispatcher.runNext();

            verify(transition, times(1)).configurationApplied();
            assertThat(intents.current()).isNull();
        }
    }

    @Test
    void recoveryLoadRetryIsBoundedAndLeavesTheDiskIntentUntouched() {
        MemoryIntentStore intents = new MemoryIntentStore(Intent.INSTALLATION_COMPLETED);
        intents.loadFailure = new IOException("controlled persistent read failure");
        intents.loadFailures = Integer.MAX_VALUE;
        ManualDispatcher dispatcher = new ManualDispatcher();
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                transition, intents, dispatcher::dispatch);

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        dispatcher.runAll();

        assertThat(intents.loads).isEqualTo(4);
        assertThat(dispatcher.delays()).containsExactly(250L, 500L, 1_000L);
        assertThat(intents.current()).isEqualTo(Intent.INSTALLATION_COMPLETED);
        assertThat(intents.clears).isZero();
        verifyNoInteractions(transition);
    }

    @Test
    void recoveredConfigurationCannotStrandAnAlreadyPendingCompletion() throws Exception {
        MemoryIntentStore intents = new MemoryIntentStore(Intent.CONFIGURATION_APPLIED);
        intents.loadFailure = new IOException("controlled first read failure");
        intents.loadFailures = 1;
        ManualDispatcher dispatcher = new ManualDispatcher();
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                transition, intents, dispatcher::dispatch);

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        scheduler.installationCompleted();
        dispatcher.runNext();

        assertThat(dispatcher.delays()).containsExactly(250L, 0L);
        dispatcher.runNext();

        verify(transition, times(1)).completeSetup();
        verify(transition, times(0)).configurationApplied();
    }

    private static final class MemoryIntentStore implements SetupTransitionIntentStore {
        private Intent intent;
        private int clears;
        private int loads;
        private int loadFailures;
        private Throwable loadFailure;

        private MemoryIntentStore(Intent intent) {
            this.intent = intent;
        }

        @Override
        public Optional<Intent> load() throws IOException {
            loads++;
            if (loadFailures > 0) {
                loadFailures--;
                if (loadFailure instanceof IOException checked) {
                    throw checked;
                }
                throw (RuntimeException) loadFailure;
            }
            return Optional.ofNullable(intent);
        }

        @Override
        public void save(Intent requested) {
            intent = requested;
        }

        @Override
        public void clear(Intent completed) throws IOException {
            if (clearFailures > 0) {
                clearFailures--;
                throw new IOException("controlled clear failure");
            }
            if (intent == completed) {
                intent = null;
                clears++;
            }
        }

        private int clearFailures;

        private Intent current() {
            return intent;
        }
    }

    private static final class ManualDispatcher {
        private final List<ScheduledTask> tasks = new ArrayList<>();
        private final List<Long> dispatchedDelays = new ArrayList<>();

        private void dispatch(Runnable task, long delayMillis) {
            tasks.add(new ScheduledTask(task, delayMillis));
            dispatchedDelays.add(delayMillis);
        }

        private void runNext() {
            tasks.removeFirst().task().run();
        }

        private void runAll() {
            while (!tasks.isEmpty()) {
                runNext();
            }
        }

        private List<Long> delays() {
            return List.copyOf(dispatchedDelays);
        }
    }

    private record ScheduledTask(Runnable task, long delayMillis) {
    }

    private static final class RejectingDispatcher {
        private final List<Runnable> tasks = new ArrayList<>();
        private int remainingRejections;
        private int dispatchCalls;

        private RejectingDispatcher(int remainingRejections) {
            this.remainingRejections = remainingRejections;
        }

        private void dispatch(Runnable task, long ignored) {
            dispatchCalls++;
            if (remainingRejections > 0) {
                remainingRejections--;
                throw new RejectedExecutionException("controlled rejection");
            }
            tasks.add(task);
        }
    }
}
