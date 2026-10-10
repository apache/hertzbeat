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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.Test;

/** Ensures an already-completed JVM fatal result cannot be hidden by a later stop. */
class AgentRuntimeBlockingTaskRunnerTest {

    @Test
    void completedFatalErrorsShouldWinOverSubsequentStop() throws Exception {
        assertFatalWins(new TestVirtualMachineError());
        assertFatalWins(new ThreadDeath());
        assertFatalWins(new LinkageError("fatal linkage"));
    }

    @Test
    void completedNonFatalErrorMayStillConvergeToStop() throws Exception {
        GatedExecutor worker = new GatedExecutor();
        AgentRuntimeBlockingTaskRunner runner = new AgentRuntimeBlockingTaskRunner(worker);
        AgentRuntimeControl control = new AgentRuntimeControl("trace-1", "run-1", Clock.systemUTC());
        try (control; ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<Object> result = caller.submit(() -> runner.run("test operation", Duration.ofSeconds(5), control,
                    () -> {
                        throw new AssertionError("nonfatal");
                    }));
            assertTrue(worker.failureObserved.await(5, TimeUnit.SECONDS));
            control.stop("stopped after worker completion");
            worker.releaseFailure.countDown();

            ExecutionException thrown = assertThrows(ExecutionException.class,
                    () -> result.get(5, TimeUnit.SECONDS));
            assertInstanceOf(AgentRuntimeStoppedException.class, thrown.getCause());
        } finally {
            worker.close();
        }
    }

    private void assertFatalWins(Error fatal) throws Exception {
        GatedExecutor worker = new GatedExecutor();
        AgentRuntimeBlockingTaskRunner runner = new AgentRuntimeBlockingTaskRunner(worker);
        AgentRuntimeControl control = new AgentRuntimeControl("trace-1", "run-1", Clock.systemUTC());
        try (control; ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<Object> result = caller.submit(() -> runner.run("test operation", Duration.ofSeconds(5), control,
                    () -> {
                        throw fatal;
                    }));
            assertTrue(worker.failureObserved.await(5, TimeUnit.SECONDS));
            control.stop("stopped after worker completion");
            worker.releaseFailure.countDown();

            ExecutionException thrown = assertThrows(ExecutionException.class,
                    () -> result.get(5, TimeUnit.SECONDS));
            assertInstanceOf(fatal.getClass(), thrown.getCause());
        } finally {
            worker.close();
        }
    }

    private static final class GatedExecutor extends AbstractExecutorService implements AutoCloseable {

        private final ExecutorService delegate = Executors.newSingleThreadExecutor();
        private final CountDownLatch failureObserved = new CountDownLatch(1);
        private final CountDownLatch releaseFailure = new CountDownLatch(1);

        @Override
        public <T> Future<T> submit(Callable<T> task) {
            return new GatedFuture<>(delegate.submit(task), failureObserved, releaseFailure);
        }

        @Override
        public void shutdown() {
            delegate.shutdown();
        }

        @Override
        public List<Runnable> shutdownNow() {
            return delegate.shutdownNow();
        }

        @Override
        public boolean isShutdown() {
            return delegate.isShutdown();
        }

        @Override
        public boolean isTerminated() {
            return delegate.isTerminated();
        }

        @Override
        public boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException {
            return delegate.awaitTermination(timeout, unit);
        }

        @Override
        public void execute(Runnable command) {
            delegate.execute(command);
        }

        @Override
        public void close() {
            releaseFailure.countDown();
            shutdownNow();
        }
    }

    private record GatedFuture<T>(Future<T> delegate, CountDownLatch failureObserved,
                                  CountDownLatch releaseFailure) implements Future<T> {

        @Override
        public boolean cancel(boolean mayInterruptIfRunning) {
            return delegate.cancel(mayInterruptIfRunning);
        }

        @Override
        public boolean isCancelled() {
            return delegate.isCancelled();
        }

        @Override
        public boolean isDone() {
            return delegate.isDone();
        }

        @Override
        public T get() throws InterruptedException, ExecutionException {
            try {
                return delegate.get();
            } catch (ExecutionException failure) {
                gateFailure();
                throw failure;
            }
        }

        @Override
        public T get(long timeout, TimeUnit unit)
                throws InterruptedException, ExecutionException, TimeoutException {
            try {
                return delegate.get(timeout, unit);
            } catch (ExecutionException failure) {
                gateFailure();
                throw failure;
            }
        }

        private void gateFailure() throws InterruptedException {
            failureObserved.countDown();
            releaseFailure.await(5, TimeUnit.SECONDS);
        }
    }

    private static final class TestVirtualMachineError extends VirtualMachineError {
    }
}
