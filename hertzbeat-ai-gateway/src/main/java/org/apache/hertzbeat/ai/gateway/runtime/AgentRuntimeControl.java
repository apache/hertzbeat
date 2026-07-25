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

import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.util.StringUtils;

/**
 * Shared stop-signal and cancellation control for one runtime invocation.
 */
public final class AgentRuntimeControl implements AutoCloseable {

    private final Clock clock;
    private final String traceId;
    private final String runUid;
    private final Object monitor = new Object();
    private final CopyOnWriteArrayList<Runnable> abortHandlers = new CopyOnWriteArrayList<>();
    private final AtomicReference<String> stopMessage = new AtomicReference<>();

    private volatile boolean closed;

    public AgentRuntimeControl(String traceId, String runUid, Clock clock) {
        // Runtime controls are created from a validated context and require stable cancellation identities.
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
        if (!StringUtils.hasText(traceId) || !StringUtils.hasText(runUid)) {
            throw new IllegalArgumentException("traceId and runUid must not be blank");
        }
        this.traceId = traceId;
        this.runUid = runUid;
    }

    public static AgentRuntimeControl forContext(AgentRuntimeContext context, Clock clock) {
        // Context construction owns runtime identity validation; null cannot produce a usable control.
        Objects.requireNonNull(context, "context must not be null");
        return new AgentRuntimeControl(context.getTraceId(), context.getRunUid(), clock);
    }

    public String getTraceId() {
        return traceId;
    }

    public String getRunUid() {
        return runUid;
    }

    public boolean isStopRequested() {
        return stopMessage.get() != null;
    }

    public void checkpoint() {
        String message = stopMessage.get();
        if (message != null) {
            throw new AgentRuntimeStoppedException(message);
        }
    }

    public void stop(String message) {
        if (!StringUtils.hasText(message)) {
            throw new IllegalArgumentException("Runtime stop message is required");
        }
        if (closed || !stopMessage.compareAndSet(null, message)) {
            return;
        }
        synchronized (monitor) {
            monitor.notifyAll();
        }
        for (Runnable abortHandler : abortHandlers) {
            runAbortHandler(abortHandler);
        }
    }

    public AutoCloseable onAbort(Runnable action) {
        Objects.requireNonNull(action, "action must not be null");
        if (stopMessage.get() != null) {
            runAbortHandler(action);
            return () -> { };
        }
        abortHandlers.add(action);
        if (stopMessage.get() != null && abortHandlers.remove(action)) {
            runAbortHandler(action);
        }
        return () -> abortHandlers.remove(action);
    }

    public void sleep(Duration duration) {
        checkpoint();
        // Retry configuration validates a positive backoff before the control receives it.
        Objects.requireNonNull(duration, "duration must not be null");
        if (duration.isZero() || duration.isNegative()) {
            throw new IllegalArgumentException("duration must be positive");
        }
        long requestedMs = duration.toMillis();
        long sleepDeadlineNanos = safeAdd(System.nanoTime(), TimeUnit.MILLISECONDS.toNanos(requestedMs));
        synchronized (monitor) {
            while (stopMessage.get() == null) {
                long remainingNanos = sleepDeadlineNanos - System.nanoTime();
                if (remainingNanos <= 0L) {
                    break;
                }
                try {
                    long waitMillis = Math.min(TimeUnit.NANOSECONDS.toMillis(remainingNanos), 100L);
                    int waitNanos = waitMillis == 0L ? (int) Math.min(remainingNanos, 999_999L) : 0;
                    monitor.wait(waitMillis, waitNanos);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    stop("Runtime was interrupted.");
                    break;
                }
            }
        }
        checkpoint();
    }

    @Override
    public void close() {
        closed = true;
        abortHandlers.clear();
        synchronized (monitor) {
            monitor.notifyAll();
        }
    }

    private void runAbortHandler(Runnable abortHandler) {
        try {
            abortHandler.run();
        } catch (RuntimeException ignored) {
            // Abort hooks are best effort; the stop signal is already recorded.
        }
    }

    private static long safeAdd(long left, long right) {
        if (Long.MAX_VALUE - left < right) {
            return Long.MAX_VALUE;
        }
        if (right < 0 && Long.MIN_VALUE - right > left) {
            return Long.MIN_VALUE;
        }
        return left + right;
    }

}
