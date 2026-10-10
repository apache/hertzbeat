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

package org.apache.hertzbeat.warehouse.query.admission;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Isolates observability reads in bounded per-signal lanes without moving work off the request thread.
 *
 * <p>Executing inline preserves request-scoped security context and avoids a second executor and timeout layer.
 * Backend deadlines remain owned by the storage-specific query guard.</p>
 */
@Service
public class ObservabilityQueryAdmissionService {

    private final Map<String, Lane> lanes;

    @Autowired
    public ObservabilityQueryAdmissionService(
            @Value("${hertzbeat.observability.query.admission.metrics.max-concurrent-requests:8}")
            int metricsMaxConcurrentRequests,
            @Value("${hertzbeat.observability.query.admission.logs.max-concurrent-requests:8}")
            int logsMaxConcurrentRequests,
            @Value("${hertzbeat.observability.query.admission.traces.max-concurrent-requests:8}")
            int tracesMaxConcurrentRequests,
            @Value("${hertzbeat.observability.query.admission.topology.max-concurrent-requests:4}")
            int topologyMaxConcurrentRequests,
            @Value("${hertzbeat.observability.query.admission.queue-capacity:8}")
            int queueCapacity,
            @Value("${hertzbeat.observability.query.admission.max-queue-wait:100ms}")
            Duration maxQueueWait) {
        this.lanes = Map.of(
                "metrics", new Lane("metrics", metricsMaxConcurrentRequests, queueCapacity, maxQueueWait),
                "logs", new Lane("logs", logsMaxConcurrentRequests, queueCapacity, maxQueueWait),
                "traces", new Lane("traces", tracesMaxConcurrentRequests, queueCapacity, maxQueueWait),
                "topology", new Lane("topology", topologyMaxConcurrentRequests, queueCapacity, maxQueueWait));
    }

    /** Execute a query in the lane dedicated to its signal. */
    public <T> T execute(String signal, Supplier<T> operation) {
        Lane lane = lanes.get(signal);
        if (lane == null) {
            throw new IllegalArgumentException("Unsupported observability query signal: " + signal);
        }
        return lane.execute(Objects.requireNonNull(operation, "operation"));
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
            if (!admittedRequests.tryAcquire()) {
                throw failure(ObservabilityQueryAdmissionException.Reason.OVERLOADED, null);
            }
            boolean active = false;
            try {
                if (!activeRequests.tryAcquire(maxQueueWaitNanos, TimeUnit.NANOSECONDS)) {
                    throw failure(ObservabilityQueryAdmissionException.Reason.OVERLOADED, null);
                }
                active = true;
                return operation.get();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw failure(ObservabilityQueryAdmissionException.Reason.CANCELLED, exception);
            } finally {
                if (active) {
                    activeRequests.release();
                }
                admittedRequests.release();
            }
        }

        private ObservabilityQueryAdmissionException failure(
                ObservabilityQueryAdmissionException.Reason reason, Throwable cause) {
            return new ObservabilityQueryAdmissionException(signal, reason, cause);
        }

        private static long durationNanos(Duration duration) {
            if (duration == null || duration.isNegative()) {
                throw new IllegalArgumentException("maxQueueWait must be zero or positive");
            }
            try {
                return duration.toNanos();
            } catch (ArithmeticException ignored) {
                return Long.MAX_VALUE;
            }
        }
    }
}
