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

package org.apache.hertzbeat.observability.ingestion.admission;

import io.grpc.Context;
import io.grpc.Status;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionBackpressureHeaders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Bounded admission control for OTLP storage writes.
 */
@Service
public class OtlpIngestionAdmissionService {

    private final Lane metrics;
    private final Lane logs;
    private final Lane traces;

    @Autowired
    public OtlpIngestionAdmissionService(
            @Value("${hertzbeat.otlp.ingestion.admission.max-concurrent-requests:32}") int maxConcurrentRequests,
            @Value("${hertzbeat.otlp.ingestion.admission.queue-capacity:32}") int queueCapacity,
            @Value("${hertzbeat.otlp.ingestion.admission.max-queue-wait:100ms}") Duration maxQueueWait) {
        this.metrics = new Lane("metrics", maxConcurrentRequests, queueCapacity, maxQueueWait);
        this.logs = new Lane("logs", maxConcurrentRequests, queueCapacity, maxQueueWait);
        this.traces = new Lane("traces", maxConcurrentRequests, queueCapacity, maxQueueWait);
    }

    /**
     * Execute one storage write through the lane dedicated to its signal.
     *
     * @param signal OTLP signal name
     * @param operation storage operation
     * @param <T> result type
     * @return operation result
     */
    public <T> T execute(String signal, Supplier<T> operation) {
        return lane(signal).execute(Objects.requireNonNull(operation, "operation"));
    }

    private Lane lane(String signal) {
        return switch (signal) {
            case "metrics" -> metrics;
            case "logs" -> logs;
            case "traces" -> traces;
            default -> throw new IllegalArgumentException("Unsupported OTLP signal: " + signal);
        };
    }

    private static final class Lane {

        private final String signal;
        private final Semaphore admittedRequests;
        private final Semaphore activeRequests;
        private final long maxQueueWaitNanos;

        private Lane(String signal, int maxConcurrentRequests, int queueCapacity, Duration maxQueueWait) {
            if (maxConcurrentRequests <= 0) {
                throw new IllegalArgumentException("maxConcurrentRequests must be greater than zero");
            }
            if (queueCapacity < 0) {
                throw new IllegalArgumentException("queueCapacity must not be negative");
            }
            long admissionCapacity = (long) maxConcurrentRequests + queueCapacity;
            if (admissionCapacity > Integer.MAX_VALUE) {
                throw new IllegalArgumentException("Combined admission capacity exceeds the supported limit");
            }
            this.signal = signal;
            this.admittedRequests = new Semaphore((int) admissionCapacity, true);
            this.activeRequests = new Semaphore(maxConcurrentRequests, true);
            this.maxQueueWaitNanos = durationNanos(maxQueueWait);
        }

        private <T> T execute(Supplier<T> operation) {
            Context requestContext = Context.current();
            Thread requestThread = Thread.currentThread();
            Context.CancellationListener cancellationListener = ignored -> requestThread.interrupt();
            requestContext.addListener(cancellationListener, Runnable::run);
            if (!admittedRequests.tryAcquire()) {
                requestContext.removeListener(cancellationListener);
                throw requestContext.isCancelled() ? cancelled(null) : busy();
            }
            boolean active = false;
            try {
                if (requestContext.isCancelled()) {
                    throw cancelled(null);
                }
                if (!activeRequests.tryAcquire(maxQueueWaitNanos, TimeUnit.NANOSECONDS)) {
                    throw busy();
                }
                active = true;
                T result = operation.get();
                if (requestContext.isCancelled()) {
                    Thread.interrupted();
                    throw cancelled(null);
                }
                return result;
            } catch (InterruptedException exception) {
                if (!requestContext.isCancelled()) {
                    Thread.currentThread().interrupt();
                }
                throw cancelled(exception);
            } catch (RuntimeException exception) {
                if (requestContext.isCancelled()) {
                    Thread.interrupted();
                    throw cancelled(exception);
                }
                throw exception;
            } finally {
                if (active) {
                    activeRequests.release();
                }
                admittedRequests.release();
                requestContext.removeListener(cancellationListener);
            }
        }

        private RuntimeException busy() {
            return OtlpIngestionBackpressureHeaders.statusRuntimeException(
                    Status.RESOURCE_EXHAUSTED, "OTLP " + signal + " ingestion is busy.", null);
        }

        private RuntimeException cancelled(Throwable cause) {
            return Status.CANCELLED
                    .withDescription("OTLP " + signal + " ingestion was cancelled.")
                    .withCause(cause)
                    .asRuntimeException();
        }

        private static long durationNanos(Duration duration) {
            if (duration == null || duration.isNegative() || duration.isZero()) {
                return 0L;
            }
            try {
                return duration.toNanos();
            } catch (ArithmeticException ignored) {
                return Long.MAX_VALUE;
            }
        }
    }
}
