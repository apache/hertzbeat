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

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

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
