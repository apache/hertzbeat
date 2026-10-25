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

package org.apache.hertzbeat.common.concurrent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mockStatic;

import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

/** Controlled producer/dispatcher interleavings, using only test-owned threads. */
class QueuedExecutorSaturationTest {

    @Test
    void acceptedTasksProgressWhenProducerFillsSlotBeforeRequeue() throws Exception {
        try (DispatchFixture fixture = new DispatchFixture()) {
            CountDownLatch completed = new CountDownLatch(1);
            fixture.executor.execute(completed::countDown);
            fixture.start();
            assertTrue(fixture.waiting.await(2, TimeUnit.SECONDS));
            fixture.permits.release();
            fixture.continueRequeue.countDown();
            assertTrue(completed.await(2, TimeUnit.SECONDS), "accepted task stranded behind a full requeue");
            if (fixture.producerAccepted) {
                assertTrue(fixture.producerCompleted.await(2, TimeUnit.SECONDS));
            }
        }
    }

    @Test
    void closeInterruptsSaturatedDispatcherAndRejectsFurtherTasks() throws Exception {
        try (DispatchFixture fixture = new DispatchFixture()) {
            fixture.executor.execute(() -> { });
            fixture.start();
            assertTrue(fixture.waiting.await(2, TimeUnit.SECONDS));
            fixture.continueRequeue.countDown();
            fixture.executor.close();
            fixture.thread.join(2000);
            assertFalse(fixture.thread.isAlive());
            assertTrue(fixture.queue.isEmpty());
            assertThrows(RejectedExecutionException.class, () -> fixture.executor.execute(() -> { }));
            fixture.executor.close();
        }
    }

    @Test
    void boundedQueueRejectsOverflowAndKeepsAcceptedTasksInOrder() throws Exception {
        ManagedExecutor executor = ManagedExecutors.newQueuedVirtualExecutor("capacity", "capacity-", 1, 1,
                (thread, failure) -> { });
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch finished = new CountDownLatch(1);
        StringBuilder order = new StringBuilder();
        try {
            executor.execute(() -> {
                started.countDown();
                try {
                    release.await();
                    order.append("first");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            assertTrue(started.await(2, TimeUnit.SECONDS));
            executor.execute(() -> {
                order.append("second");
                finished.countDown();
            });
            assertThrows(RejectedExecutionException.class, () -> executor.execute(() -> { }));
            release.countDown();
            assertTrue(finished.await(2, TimeUnit.SECONDS));
            assertEquals("firstsecond", order.toString());
        } finally {
            release.countDown();
            executor.close();
        }
    }

    @Test
    void failedTaskReturnsPermitAndIdleCloseStopsDispatcher() throws Exception {
        ManagedExecutor executor = ManagedExecutors.newQueuedVirtualExecutor("failure", "failure-", 1, 1,
                (worker, failure) -> { });
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch fail = new CountDownLatch(1);
        CountDownLatch next = new CountDownLatch(1);
        try {
            executor.execute(() -> {
                entered.countDown();
                try {
                    fail.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                throw new IllegalStateException("synthetic task failure");
            });
            assertTrue(entered.await(2, TimeUnit.SECONDS));
            executor.execute(next::countDown);
            fail.countDown();
            assertTrue(next.await(2, TimeUnit.SECONDS));
        } finally {
            fail.countDown();
            executor.close();
        }
        Field field = executor.getClass().getDeclaredField("dispatcher");
        field.setAccessible(true);
        assertTrue(((ExecutorService) field.get(executor)).awaitTermination(2, TimeUnit.SECONDS));
    }

    @Test
    void interruptWhileWaitingForEmptyQueueReturnsReservedPermit() throws Exception {
        try (DispatchFixture fixture = new DispatchFixture()) {
            fixture.permits.release();
            fixture.start();
            assertTrue(fixture.taking.await(2, TimeUnit.SECONDS));
            fixture.executor.close();
            fixture.thread.join(2000);
            assertFalse(fixture.thread.isAlive());
            assertEquals(1, fixture.permits.availablePermits());
        }
    }

    @Test
    void interruptWhileWaitingForCapacityDoesNotCreatePermit() throws Exception {
        try (DispatchFixture fixture = new DispatchFixture()) {
            fixture.start();
            assertTrue(fixture.waiting.await(2, TimeUnit.SECONDS));
            fixture.executor.close();
            fixture.thread.join(2000);
            assertFalse(fixture.thread.isAlive());
            assertEquals(0, fixture.permits.availablePermits());
        }
    }

    @Test
    void rejectedDelegateSubmissionReturnsExactlyOnePermit() throws Exception {
        try (DispatchFixture fixture = new DispatchFixture()) {
            Field field = fixture.executor.getClass().getDeclaredField("delegate");
            field.setAccessible(true);
            ((ExecutorService) field.get(fixture.executor)).shutdownNow();
            ExecutorService rejectingDelegate = mock(ExecutorService.class);
            doThrow(new RejectedExecutionException("synthetic delegate closure"))
                    .when(rejectingDelegate).execute(any(Runnable.class));
            fixture.replace("delegate", rejectingDelegate);
            AtomicReference<Throwable> failure = new AtomicReference<>();
            fixture.thread.setUncaughtExceptionHandler((thread, error) -> failure.set(error));
            fixture.executor.execute(() -> { });
            fixture.permits.release();
            fixture.start();
            fixture.thread.join(2000);
            assertFalse(fixture.thread.isAlive());
            assertTrue(failure.get() instanceof RejectedExecutionException);
            assertEquals(1, fixture.permits.availablePermits());
        }
    }

    private static final class DispatchFixture implements AutoCloseable {
        private final CountDownLatch waiting = new CountDownLatch(1);
        private final CountDownLatch taking = new CountDownLatch(1);
        private final CountDownLatch continueRequeue = new CountDownLatch(1);
        private final CountDownLatch producerCompleted = new CountDownLatch(1);
        private volatile boolean producerAccepted;
        private final Semaphore permits = new Semaphore(0) {
            @Override
            public void acquire() throws InterruptedException {
                waiting.countDown();
                super.acquire();
            }
        };
        private final LinkedBlockingDeque<Runnable> queue = new LinkedBlockingDeque<>(1) {
            @Override
            public Runnable takeFirst() throws InterruptedException {
                taking.countDown();
                return super.takeFirst();
            }

            @Override
            public void putFirst(Runnable task) throws InterruptedException {
                // A real producer can occupy the slot released by takeFirst before the requeue.
                producerAccepted = offerLast(producerCompleted::countDown);
                waiting.countDown();
                continueRequeue.await();
                super.putFirst(task);
            }
        };
        private final ManagedExecutor executor;
        private final Thread thread;

        private DispatchFixture() throws Exception {
            AtomicReference<Runnable> loop = new AtomicReference<>();
            ExecutorService dispatcher = mock(ExecutorService.class);
            doAnswer(invocation -> {
                loop.set(invocation.getArgument(0));
                return null;
            }).when(dispatcher).execute(any(Runnable.class));
            try (MockedStatic<Executors> factories = mockStatic(Executors.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
                factories.when(() -> Executors.newSingleThreadExecutor(any(java.util.concurrent.ThreadFactory.class)))
                        .thenReturn(dispatcher);
                executor = ManagedExecutors.newQueuedVirtualExecutor("interleave", "interleave-", 1, 1,
                        (worker, failure) -> { });
            }
            replace("queue", queue);
            replace("permits", permits);
            thread = Thread.ofPlatform().daemon(true).unstarted(loop.get());
            doAnswer(invocation -> {
                thread.interrupt();
                return java.util.List.of();
            }).when(dispatcher).shutdownNow();
        }

        private void replace(String name, Object value) throws Exception {
            Field field = executor.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(executor, value);
        }

        private void start() {
            thread.start();
        }

        @Override
        public void close() throws InterruptedException {
            continueRequeue.countDown();
            executor.close();
            thread.interrupt();
            thread.join(2000);
        }
    }
}
