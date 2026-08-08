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

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.event.ApplicationReadyEvent;

class SetupRuntimeTransitionSchedulerTest {
    @Test
    void runningConfigurationCoalescesDuplicatesAndQueuesOneHigherPriorityCompletion() {
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        List<Runnable> tasks = new ArrayList<>();
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(transition, tasks::add);
        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));

        scheduler.configurationApplied();
        scheduler.configurationApplied();
        scheduler.installationCompleted();
        scheduler.installationCompleted();

        assertThat(tasks).hasSize(1);
        tasks.removeFirst().run();
        verify(transition).configurationApplied();
        assertThat(tasks).hasSize(1);
        tasks.removeFirst().run();
        verify(transition).completeSetup();
        assertThat(tasks).isEmpty();
    }

    @Test
    void completionSupersedesConfigurationBeforeReadiness() {
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        List<Runnable> tasks = new ArrayList<>();
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(transition, tasks::add);
        scheduler.configurationApplied();
        scheduler.installationCompleted();

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        tasks.removeFirst().run();

        verify(transition).completeSetup();
        verify(transition, times(0)).configurationApplied();
        assertThat(tasks).isEmpty();
    }

    @Test
    void transitionCanCloseSchedulerFromItsExecutorWithoutInterruptingOrDispatchingPendingWork()
            throws InterruptedException {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        AtomicReference<SetupRuntimeTransitionScheduler> schedulerReference = new AtomicReference<>();
        CountDownLatch transitionStarted = new CountDownLatch(1);
        CountDownLatch allowClose = new CountDownLatch(1);
        CountDownLatch transitionFinished = new CountDownLatch(1);
        AtomicBoolean interrupted = new AtomicBoolean();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        AtomicInteger configurationCalls = new AtomicInteger();
        AtomicInteger completionCalls = new AtomicInteger();
        SetupRuntimeTransition transition = new SetupRuntimeTransition() {
            @Override
            public void configurationApplied() {
                configurationCalls.incrementAndGet();
                transitionStarted.countDown();
                try {
                    allowClose.await();
                    schedulerReference.get().close();
                    interrupted.set(Thread.currentThread().isInterrupted());
                } catch (Throwable error) {
                    failure.set(error);
                } finally {
                    transitionFinished.countDown();
                }
            }

            @Override
            public void completeSetup() {
                completionCalls.incrementAndGet();
            }
        };
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(transition, executor);
        schedulerReference.set(scheduler);
        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));

        scheduler.configurationApplied();
        assertThat(transitionStarted.await(5, TimeUnit.SECONDS)).isTrue();
        scheduler.installationCompleted();
        allowClose.countDown();

        assertThat(transitionFinished.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        assertThat(failure.get()).isNull();
        assertThat(interrupted).isFalse();
        assertThat(configurationCalls).hasValue(1);
        assertThat(completionCalls).hasValue(0);
    }
}
