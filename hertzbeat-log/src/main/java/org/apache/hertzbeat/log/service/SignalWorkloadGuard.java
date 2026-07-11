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

package org.apache.hertzbeat.log.service;

import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

/** Isolates signal reads and writes with bounded concurrency and a short bounded queue. */
@Component
public class SignalWorkloadGuard {

    private static final Duration QUEUE_WAIT = Duration.ofMillis(50);
    private final Map<Workload, Slot> slots = new EnumMap<>(Workload.class);

    public SignalWorkloadGuard() {
        this(Map.of(
                Workload.METRICS, new Limits(8, 16),
                Workload.LOG_LIST, new Limits(8, 16),
                Workload.LOG_AGGREGATE, new Limits(4, 8),
                Workload.TRACES, new Limits(6, 12),
                Workload.OTLP_WRITE, new Limits(16, 32)));
    }

    SignalWorkloadGuard(Map<Workload, Limits> limits) {
        limits.forEach((workload, value) -> slots.put(workload, new Slot(value)));
    }

    public <T> T execute(Workload workload, Supplier<T> operation) {
        Slot slot = slots.get(workload);
        if (slot == null || !slot.queue().tryAcquire()) {
            throw new SignalQueryRejectedException(workload.name());
        }
        boolean acquired = false;
        try {
            acquired = slot.active().tryAcquire(QUEUE_WAIT.toMillis(), TimeUnit.MILLISECONDS);
            if (!acquired) {
                throw new SignalQueryRejectedException(workload.name());
            }
            return operation.get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new SignalQueryRejectedException(workload.name());
        } finally {
            slot.queue().release();
            if (acquired) {
                slot.active().release();
            }
        }
    }

    /** Independently limited signal workload families. */
    public enum Workload {
        METRICS,
        LOG_LIST,
        LOG_AGGREGATE,
        TRACES,
        OTLP_WRITE
    }

    /** Active and waiting request limits for a workload family. */
    record Limits(int concurrency, int queueSize) {
    }

    private record Slot(Semaphore active, Semaphore queue) {

        private Slot(Limits limits) {
            this(new Semaphore(limits.concurrency(), true), new Semaphore(limits.queueSize(), true));
        }
    }
}
