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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Tests for {@link ManagedExecutors}.
 */
class ManagedExecutorsTest {

    @Test
    void shouldRunTaskOnVirtualThread() throws Exception {
        ManagedExecutor executor = ManagedExecutors.newVirtualExecutor("test", "test-vt-",
                AdmissionMode.UNBOUNDED_VT, 0, (thread, throwable) -> {
                });
        try {
            CountDownLatch latch = new CountDownLatch(1);
            AtomicBoolean virtualThread = new AtomicBoolean(false);

            executor.execute(() -> {
                virtualThread.set(Thread.currentThread().isVirtual());
                latch.countDown();
            });

            assertTrue(latch.await(5, TimeUnit.SECONDS));
            assertTrue(virtualThread.get());
        } finally {
            executor.close();
        }
    }

    @Test
    void shouldRejectTaskWhenAdmissionLimitReached() throws Exception {
        ManagedExecutor executor = ManagedExecutors.newVirtualExecutor("limited", "limited-vt-",
                AdmissionMode.LIMIT_AND_REJECT, 1, (thread, throwable) -> {
                });
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        try {
            executor.execute(() -> {
                started.countDown();
                try {
                    release.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            assertTrue(started.await(5, TimeUnit.SECONDS));
            assertThrows(RejectedExecutionException.class, () -> executor.execute(() -> {
            }));
        } finally {
            release.countDown();
            executor.close();
        }
    }

    @Test
    void shouldQueueTasksWhileKeepingVirtualThreadExecution() throws Exception {
        ManagedExecutor executor = ManagedExecutors.newQueuedVirtualExecutor("queued", "queued-vt-",
                1, 0, (thread, throwable) -> {
                });
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicBoolean firstVirtual = new AtomicBoolean(false);
        AtomicBoolean secondVirtual = new AtomicBoolean(false);
        try {
            executor.execute(() -> {
                firstVirtual.set(Thread.currentThread().isVirtual());
                firstStarted.countDown();
                try {
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

            executor.execute(() -> {
                secondVirtual.set(Thread.currentThread().isVirtual());
                secondStarted.countDown();
            });

            assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));
            releaseFirst.countDown();
            assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
            assertTrue(firstVirtual.get());
            assertTrue(secondVirtual.get());
        } finally {
            releaseFirst.countDown();
            executor.close();
        }
    }

    @Test
    void shouldRejectTaskWhenQueuedExecutorCapacityReached() throws Exception {
        ManagedExecutor executor = ManagedExecutors.newQueuedVirtualExecutor("queued", "queued-vt-",
                1, 1, (thread, throwable) -> {
                });
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        try {
            executor.execute(() -> {
                firstStarted.countDown();
                try {
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

            executor.execute(secondStarted::countDown);
            assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));
            assertThrows(RejectedExecutionException.class, () -> executor.execute(() -> {
            }));
        } finally {
            releaseFirst.countDown();
            executor.close();
        }
    }

    @Test
    void boundedQueueKeepsAcceptedTasksWhenProducerRacesExhaustedPermits() throws Exception {
        ManagedExecutor executor = ManagedExecutors.newQueuedVirtualExecutor("racing", "racing-vt-",
                1, 1, (thread, throwable) -> { });
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch exhausted = new CountDownLatch(1);
        CountDownLatch producerSubmitted = new CountDownLatch(1);
        CountDownLatch secondFinished = new CountDownLatch(1);
        CountDownLatch thirdFinished = new CountDownLatch(1);
        // Pause only admission, keeping the real bounded deque and dispatcher under test.
        Semaphore controlledPermits = new Semaphore(1) {
            @Override
            public boolean tryAcquire() {
                boolean acquired = super.tryAcquire();
                if (!acquired) {
                    exhausted.countDown();
                    try {
                        assertTrue(producerSubmitted.await(5, TimeUnit.SECONDS));
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                    }
                }
                return acquired;
            }

            @Override
            public void acquire() throws InterruptedException {
                if (availablePermits() == 0) {
                    exhausted.countDown();
                }
                super.acquire();
            }
        };
        // Start the same production loop after installing the admission barrier, avoiding a constructor race.
        Field dispatcherField = executor.getClass().getDeclaredField("dispatcher");
        dispatcherField.setAccessible(true);
        ExecutorService originalDispatcher = (ExecutorService) dispatcherField.get(executor);
        originalDispatcher.shutdownNow();
        assertTrue(originalDispatcher.awaitTermination(5, TimeUnit.SECONDS));
        Field permits = executor.getClass().getDeclaredField("permits");
        permits.setAccessible(true);
        permits.set(executor, controlledPermits);
        Method dispatchLoop = executor.getClass().getDeclaredMethod("dispatchLoop");
        dispatchLoop.setAccessible(true);
        Thread controlledDispatcher = Thread.ofVirtual().start(() -> {
            try {
                dispatchLoop.invoke(executor);
            } catch (ReflectiveOperationException exception) {
                throw new AssertionError(exception);
            }
        });
        try {
            executor.execute(() -> {
                firstStarted.countDown();
                try {
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
            });
            assertTrue(firstStarted.await(5, TimeUnit.SECONDS));
            executor.execute(secondFinished::countDown);
            assertTrue(exhausted.await(5, TimeUnit.SECONDS));
            boolean thirdAccepted = false;
            try {
                executor.execute(thirdFinished::countDown);
                thirdAccepted = true;
            } catch (RejectedExecutionException expected) {
                // A full queue may reject; every accepted task must still progress.
            }
            producerSubmitted.countDown();
            releaseFirst.countDown();
            assertTrue(secondFinished.await(2, TimeUnit.SECONDS), "An accepted queued task must not deadlock");
            if (thirdAccepted) {
                assertTrue(thirdFinished.await(2, TimeUnit.SECONDS), "A racing accepted task must not be stranded");
            }
        } finally {
            producerSubmitted.countDown();
            releaseFirst.countDown();
            executor.close();
            controlledDispatcher.interrupt();
            controlledDispatcher.join(5000);
            assertFalse(controlledDispatcher.isAlive());
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void queuedShutdownInterruptsIdleAndAdmissionWaits(boolean activeTask) throws Exception {
        ManagedExecutor executor = ManagedExecutors.newQueuedVirtualExecutor("closing", "closing-vt-",
                1, 1, (thread, throwable) -> { });
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicBoolean queuedTaskRan = new AtomicBoolean();
        try {
            if (activeTask) {
                executor.execute(() -> {
                    started.countDown();
                    try {
                        release.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                    }
                });
                assertTrue(started.await(5, TimeUnit.SECONDS));
                executor.execute(() -> queuedTaskRan.set(true));
            }
            executor.close();
            Field dispatcher = executor.getClass().getDeclaredField("dispatcher");
            dispatcher.setAccessible(true);
            assertTrue(((ExecutorService) dispatcher.get(executor)).awaitTermination(5, TimeUnit.SECONDS));
            assertFalse(queuedTaskRan.get());
            assertThrows(RejectedExecutionException.class, () -> executor.execute(() -> { }));
        } finally {
            release.countDown();
            executor.close();
        }
    }

    @Test
    void shouldDiscardOldestTaskWhenDiscardOldestExecutorQueueIsFull() throws Exception {
        ManagedExecutor executor = ManagedExecutors.newDiscardOldestVirtualExecutor("discard-oldest",
                "discard-oldest-vt-", 1, 1, 1, (thread, throwable) -> {
                });
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch thirdStarted = new CountDownLatch(1);
        AtomicBoolean secondExecuted = new AtomicBoolean(false);
        AtomicBoolean thirdVirtual = new AtomicBoolean(false);
        try {
            executor.execute(() -> {
                firstStarted.countDown();
                try {
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

            executor.execute(() -> secondExecuted.set(true));
            executor.execute(() -> {
                thirdVirtual.set(Thread.currentThread().isVirtual());
                thirdStarted.countDown();
            });

            releaseFirst.countDown();
            assertTrue(thirdStarted.await(5, TimeUnit.SECONDS));
            assertFalse(secondExecuted.get());
            assertTrue(thirdVirtual.get());
        } finally {
            releaseFirst.countDown();
            executor.close();
        }
    }
}
