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

import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Bounds Greptime read query concurrency and cancels work that exceeds its deadline.
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeQueryGuard implements AutoCloseable {

    private final Semaphore permits;
    private final Duration queryTimeout;
    private final Duration admissionWait;
    private final ExecutorService queryExecutor;

    public GreptimeQueryGuard(
            @Value("${warehouse.store.greptime.query.max-concurrency:8}") int maxConcurrency,
            @Value("${warehouse.store.greptime.query.timeout:5s}") Duration queryTimeout,
            @Value("${warehouse.store.greptime.query.admission-wait:100ms}") Duration admissionWait) {
        if (maxConcurrency < 1) {
            throw new IllegalArgumentException("Greptime query max concurrency must be positive");
        }
        if (queryTimeout.isNegative() || queryTimeout.isZero()) {
            throw new IllegalArgumentException("Greptime query timeout must be positive");
        }
        if (admissionWait.isNegative()) {
            throw new IllegalArgumentException("Greptime query admission wait cannot be negative");
        }
        this.permits = new Semaphore(maxConcurrency, true);
        this.queryTimeout = queryTimeout;
        this.admissionWait = admissionWait;
        this.queryExecutor = Executors.newThreadPerTaskExecutor(
                Thread.ofVirtual().name("greptime-query-", 0).factory());
    }

    /**
     * Run one Greptime read query within the configured admission and execution budgets.
     *
     * @param query query operation
     * @param <T> query result type
     * @return query result
     */
    public <T> T execute(Callable<T> query) {
        acquirePermit();
        Future<T> future;
        try {
            future = queryExecutor.submit(() -> {
                try {
                    return query.call();
                } finally {
                    permits.release();
                }
            });
        } catch (RejectedExecutionException exception) {
            permits.release();
            throw new QueryRejectedException("Greptime query executor is unavailable", exception);
        }

        try {
            return future.get(queryTimeout.toNanos(), TimeUnit.NANOSECONDS);
        } catch (TimeoutException exception) {
            future.cancel(true);
            throw new QueryTimeoutException("Greptime query exceeded " + queryTimeout, exception);
        } catch (InterruptedException exception) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw new QueryInterruptedException("Interrupted while waiting for Greptime query", exception);
        } catch (ExecutionException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            if (cause instanceof Error error) {
                throw error;
            }
            throw new QueryExecutionException("Greptime query failed", cause);
        }
    }

    private void acquirePermit() {
        try {
            if (!permits.tryAcquire(admissionWait.toNanos(), TimeUnit.NANOSECONDS)) {
                throw new QueryRejectedException("Greptime query concurrency limit reached");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new QueryInterruptedException("Interrupted while waiting for Greptime query admission", exception);
        }
    }

    @Override
    @PreDestroy
    public void close() {
        queryExecutor.shutdownNow();
    }

    /** Query exceeded its execution deadline. */
    public static class QueryTimeoutException extends RuntimeException {

        public QueryTimeoutException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /** Query could not enter the finite concurrency window. */
    public static class QueryRejectedException extends RuntimeException {

        public QueryRejectedException(String message) {
            super(message);
        }

        public QueryRejectedException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /** Caller was interrupted during admission or execution. */
    public static class QueryInterruptedException extends RuntimeException {

        public QueryInterruptedException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /** Query failed with a checked exception. */
    public static class QueryExecutionException extends RuntimeException {

        public QueryExecutionException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
