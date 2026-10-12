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

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(15)
class TargetJdbcConnectionHandoffTest {

    @Test
    void reusableSuccessorWaitsForPhysicalHandoffAndRejectsConcurrentAcquire() throws Exception {
        try (Fixture fixture = new Fixture(); ExecutorService caller = Executors.newSingleThreadExecutor()) {
            fixture.firstFailure();
            Future<TargetJdbcConnectionErrorCode> next = caller.submit(() -> acquire(fixture.factory, deadline()));
            fixture.awaitHandoff();
            assertThat(next.isDone()).isFalse();
            assertThat(acquire(fixture.factory, deadline())).isEqualTo(TargetJdbcConnectionErrorCode.OPERATION_CONFLICT);
            fixture.release.countDown();
            assertThat(next.get(5, TimeUnit.SECONDS)).isEqualTo(TargetJdbcConnectionErrorCode.UNAVAILABLE);
            assertThat(fixture.calls.get()).isEqualTo(2);
            assertThat(fixture.factory.settleFailedAcquire(deadline())).isEqualTo(TargetJdbcFailedAcquireSettlement.REUSABLE);
            assertThat(acquire(fixture.factory, deadline())).isEqualTo(TargetJdbcConnectionErrorCode.UNAVAILABLE);
            assertThat(fixture.calls.get()).isEqualTo(3);
            fixture.assertWiped();
        }
    }

    @Test
    void handoffExpiryUsesOriginalDeadlineAndLeavesFactoryReusable() throws Exception {
        try (Fixture fixture = new Fixture(); ExecutorService caller = Executors.newSingleThreadExecutor()) {
            fixture.firstFailure();
            AtomicLong clock = new AtomicLong();
            JdbcMetadataMigrationDeadline budget = JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), clock::get);
            Future<TargetJdbcConnectionErrorCode> next = caller.submit(() -> acquire(fixture.factory, budget));
            fixture.awaitHandoff();
            clock.set(TimeUnit.SECONDS.toNanos(5));
            assertThat(next.get(5, TimeUnit.SECONDS)).isEqualTo(TargetJdbcConnectionErrorCode.TIMEOUT);
            assertThat(fixture.calls.get()).isEqualTo(1);
            assertThat(fixture.factory.settleFailedAcquire(deadline())).isEqualTo(TargetJdbcFailedAcquireSettlement.REUSABLE);
            fixture.release.countDown();
            assertThat(acquire(fixture.factory, deadline())).isEqualTo(TargetJdbcConnectionErrorCode.UNAVAILABLE);
            fixture.assertWiped();
        }
    }

    @Test
    void interruptDuringHandoffRestoresInterruptWithoutPoisoningFactory() throws Exception {
        try (Fixture fixture = new Fixture(); ExecutorService caller = Executors.newSingleThreadExecutor()) {
            fixture.firstFailure();
            AtomicReference<Thread> thread = new AtomicReference<>();
            Future<Boolean> next = caller.submit(() -> {
                thread.set(Thread.currentThread());
                return acquire(fixture.factory, deadline()) == TargetJdbcConnectionErrorCode.TIMEOUT
                        && Thread.currentThread().isInterrupted();
            });
            fixture.awaitHandoff();
            thread.get().interrupt();
            assertThat(next.get(5, TimeUnit.SECONDS)).isTrue();
            assertThat(fixture.factory.settleFailedAcquire(deadline())).isEqualTo(TargetJdbcFailedAcquireSettlement.REUSABLE);
            fixture.release.countDown();
            assertThat(acquire(fixture.factory, deadline())).isEqualTo(TargetJdbcConnectionErrorCode.UNAVAILABLE);
        }
    }

    @Test
    void closeDuringHandoffClearsSlotWithoutExecutingTheSuccessor() throws Exception {
        try (Fixture fixture = new Fixture(); ExecutorService caller = Executors.newSingleThreadExecutor()) {
            fixture.firstFailure();
            Future<TargetJdbcConnectionErrorCode> next = caller.submit(() -> acquire(fixture.factory, deadline()));
            fixture.awaitHandoff();
            fixture.factory.close();
            assertThat(next.get(5, TimeUnit.SECONDS)).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
            assertThat(fixture.calls.get()).isEqualTo(1);
            assertThat(fixture.factory.settleFailedAcquire(deadline())).isEqualTo(TargetJdbcFailedAcquireSettlement.TERMINAL_CLOSED);
            assertThat(acquire(fixture.factory, deadline())).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
    }

    @Test
    void executorShutdownDuringHandoffRemainsTerminal() throws Exception {
        try (Fixture fixture = new Fixture(); ExecutorService caller = Executors.newSingleThreadExecutor()) {
            fixture.firstFailure();
            Future<TargetJdbcConnectionErrorCode> next = caller.submit(() -> acquire(fixture.factory, deadline()));
            fixture.awaitHandoff();
            fixture.worker.shutdown();
            assertThat(next.get(5, TimeUnit.SECONDS)).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
            assertThat(fixture.factory.settleFailedAcquire(deadline())).isEqualTo(TargetJdbcFailedAcquireSettlement.TERMINAL_CLOSED);
            assertThat(fixture.calls.get()).isEqualTo(1);
        }
    }

    @Test
    void rejectionWithoutCompletedPredecessorRemainsTerminal() {
        ThreadPoolExecutor rejecting = new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>()) {
            @Override
            public void execute(Runnable task) {
                throw new java.util.concurrent.RejectedExecutionException("private failure");
            }
        };
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(rejecting, worker(), Runnable::run,
                (target, username, password, budget) -> { throw new SQLException(); },
                new TargetJdbcConnectionVerifier(Runnable::run))) {
            assertThat(acquire(factory, deadline())).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
            assertThat(acquire(factory, deadline())).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
    }

    private static TargetJdbcConnectionErrorCode acquire(
            TargetJdbcConnectionFactory factory, JdbcMetadataMigrationDeadline budget) {
        try (SecretValue password = SecretValue.of("unused-fixture")) {
            factory.acquire(new MetadataDatabaseSettings(MetadataDatabaseKind.MYSQL,
                    "jdbc:mysql://example.invalid/hertzbeat?sslMode=REQUIRED", "unused-fixture"), password, budget);
            throw new AssertionError("Expected isolated connector failure");
        } catch (TargetJdbcConnectionException failure) {
            assertThat(failure).hasNoCause();
            return failure.code();
        }
    }

    private static JdbcMetadataMigrationDeadline deadline() {
        return JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), System::nanoTime);
    }

    private static ThreadPoolExecutor worker() {
        return new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>());
    }

    private static final class Fixture implements AutoCloseable {
        private final CountDownLatch unwinding = new CountDownLatch(1);
        private final CountDownLatch release = new CountDownLatch(1);
        private final CountDownLatch offering = new CountDownLatch(1);
        private final AtomicReference<Throwable> hookFailure = new AtomicReference<>();
        private final AtomicReference<char[]> seenPassword = new AtomicReference<>();
        private final AtomicInteger calls = new AtomicInteger();
        private final ThreadPoolExecutor worker;
        private final TargetJdbcConnectionFactory factory;

        private Fixture() {
            worker = new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>()) {
                @Override
                public void execute(Runnable task) {
                    try {
                        super.execute(task);
                    } catch (java.util.concurrent.RejectedExecutionException rejection) {
                        offering.countDown();
                        throw rejection;
                    }
                }

                @Override
                protected void afterExecute(Runnable task, Throwable failure) {
                    if (failure != null) {
                        hookFailure.compareAndSet(null, failure);
                    }
                    if (unwinding.getCount() != 0) {
                        unwinding.countDown();
                        boolean interrupted = false;
                        while (release.getCount() != 0) {
                            try {
                                if (!release.await(5, TimeUnit.SECONDS)) {
                                    hookFailure.compareAndSet(null, new AssertionError("release timed out"));
                                    break;
                                }
                            } catch (InterruptedException ignored) {
                                interrupted = true;
                            }
                        }
                        if (interrupted) {
                            Thread.currentThread().interrupt();
                        }
                    }
                }
            };
            factory = new TargetJdbcConnectionFactory(worker, worker(), Runnable::run,
                    (target, username, password, budget) -> {
                        seenPassword.set(password);
                        calls.incrementAndGet();
                        throw new SQLException("isolated unavailable connector");
                    }, new TargetJdbcConnectionVerifier(Runnable::run));
        }

        private void firstFailure() throws Exception {
            assertThat(acquire(factory, deadline())).isEqualTo(TargetJdbcConnectionErrorCode.UNAVAILABLE);
            assertThat(unwinding.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(factory.settleFailedAcquire(deadline())).isEqualTo(TargetJdbcFailedAcquireSettlement.REUSABLE);
            assertWiped();
        }

        private void awaitHandoff() throws Exception {
            assertThat(offering.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(worker.getQueue()).isEmpty();
        }

        private void assertWiped() {
            assertThat(seenPassword.get()).containsOnly('\0');
        }

        @Override
        public void close() throws Exception {
            release.countDown();
            factory.close();
            assertThat(worker.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
            assertThat(hookFailure.get()).isNull();
        }
    }
}
