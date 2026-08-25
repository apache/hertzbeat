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

package org.apache.hertzbeat.warehouse.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class GreptimeQueryGuardTest {

    @Test
    void cancelsQueryWhenDeadlineExpires() throws InterruptedException {
        AtomicBoolean interrupted = new AtomicBoolean();
        CountDownLatch cancellationObserved = new CountDownLatch(1);

        try (GreptimeQueryGuard guard = new GreptimeQueryGuard(
                1, Duration.ofMillis(50), Duration.ofMillis(10))) {
            assertThrows(GreptimeQueryGuard.QueryTimeoutException.class, () -> guard.execute(() -> {
                try {
                    Thread.sleep(Duration.ofSeconds(5));
                    return "late";
                } catch (InterruptedException exception) {
                    interrupted.set(true);
                    cancellationObserved.countDown();
                    throw exception;
                }
            }));

            assertTrue(cancellationObserved.await(1, TimeUnit.SECONDS));
            assertTrue(interrupted.get());
        }
    }

    @Test
    void rejectsNewQueryAfterShortAdmissionWait() throws Exception {
        CountDownLatch queryStarted = new CountDownLatch(1);
        CountDownLatch releaseQuery = new CountDownLatch(1);

        try (GreptimeQueryGuard guard = new GreptimeQueryGuard(
                1, Duration.ofSeconds(2), Duration.ofMillis(20));
             ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<String> first = caller.submit(() -> guard.execute(() -> {
                queryStarted.countDown();
                releaseQuery.await();
                return "first";
            }));
            assertTrue(queryStarted.await(1, TimeUnit.SECONDS));

            assertThrows(GreptimeQueryGuard.QueryRejectedException.class,
                    () -> guard.execute(() -> "second"));

            releaseQuery.countDown();
            assertEquals("first", get(first));
            assertEquals("third", guard.execute(() -> "third"));
        }
    }

    private static <T> T get(Future<T> future) throws InterruptedException, ExecutionException {
        return future.get();
    }
}
