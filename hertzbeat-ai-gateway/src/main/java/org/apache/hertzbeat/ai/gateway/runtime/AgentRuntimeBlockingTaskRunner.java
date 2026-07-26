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

import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.Callable;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.util.StringUtils;

/**
 * Executes blocking runtime operations with operation timeout and runtime cancellation.
 */
public class AgentRuntimeBlockingTaskRunner {

    private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool(
            new DaemonThreadFactory("agent-runtime-blocking"));

    public <T> T run(String operation, Duration timeout, AgentRuntimeControl control, Callable<T> callable) {
        // Runtime operations must be named and bounded before work is submitted to the shared executor.
        if (!StringUtils.hasText(operation)) {
            throw new IllegalArgumentException("operation must not be blank");
        }
        Objects.requireNonNull(timeout, "timeout must not be null");
        if (timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("timeout must be positive");
        }
        Objects.requireNonNull(callable, "callable must not be null");
        AgentRuntimeControl safeControl = Objects.requireNonNull(control, "control must not be null");
        safeControl.checkpoint();
        Future<T> future = EXECUTOR.submit(callable);
        AutoCloseable abortRegistration = safeControl.onAbort(() -> future.cancel(true));
        try {
            return await(operation, timeout, safeControl, future);
        } catch (AgentRuntimeStoppedException | AgentRuntimeOperationTimeoutException exception) {
            throw exception;
        } catch (ExecutionException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            if (cause instanceof Error error) {
                throw error;
            }
            throw new IllegalStateException(cause);
        } catch (InterruptedException exception) {
            throw new AgentRuntimeStoppedException("Runtime was interrupted.");
        } catch (CancellationException exception) {
            safeControl.checkpoint();
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("Runtime abort hook cleanup failed.", exception);
        } finally {
            closeQuietly(abortRegistration);
        }
    }

    private <T> T await(String operation, Duration timeout, AgentRuntimeControl control, Future<T> future)
            throws InterruptedException, ExecutionException {
        long timeoutMs = Math.max(1L, timeout.toMillis());
        try {
            T value = future.get(timeoutMs, TimeUnit.MILLISECONDS);
            control.checkpoint();
            return value;
        } catch (TimeoutException exception) {
            future.cancel(true);
            control.checkpoint();
            throw new AgentRuntimeOperationTimeoutException(operation, timeout);
        } catch (CancellationException exception) {
            control.checkpoint();
            throw exception;
        } catch (InterruptedException exception) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            control.stop("Runtime was interrupted.");
            control.checkpoint();
            throw exception;
        } catch (ExecutionException exception) {
            control.checkpoint();
            throw exception;
        }
    }

    private void closeQuietly(AutoCloseable closeable) {
        try {
            closeable.close();
        } catch (Exception ignored) {
            // Abort registrations are best-effort cleanup only.
        }
    }

    private static final class DaemonThreadFactory implements ThreadFactory {

        private final String prefix;
        private final AtomicInteger sequence = new AtomicInteger();

        private DaemonThreadFactory(String prefix) {
            this.prefix = prefix;
        }

        @Override
        public Thread newThread(Runnable runnable) {
            Thread thread = new Thread(runnable, prefix + "-" + sequence.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        }
    }
}
