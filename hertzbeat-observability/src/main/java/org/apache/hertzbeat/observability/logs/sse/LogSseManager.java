/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.logs.sse;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Predicate;

/**
 * SSE manager for log with batch processing support for high TPS scenarios
 */
@Component
@Slf4j
public class LogSseManager {

    private static final long BATCH_INTERVAL_MS = 200;
    private static final long HEARTBEAT_INTERVAL_MS = 15_000;
    private static final long SHUTDOWN_TIMEOUT_MS = 2_000;
    private static final int MAX_BATCH_SIZE = 1000;
    private static final int MAX_QUEUE_SIZE = 10000;
    private static final int MAX_PENDING_BATCHES_PER_SUBSCRIBER = 1;

    private final Map<Long, SseSubscriber> emitters = new ConcurrentHashMap<>();
    private final Queue<QueuedItem> logQueue = new ConcurrentLinkedQueue<>();
    private final Object queueLock = new Object();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "sse-batch-scheduler");
        t.setDaemon(true);
        return t;
    });
    private final AtomicLong queueSize = new AtomicLong(0);
    private final AtomicLong broadcastSequence = new AtomicLong(0);
    private final AtomicBoolean closed = new AtomicBoolean(false);
    private final AtomicReference<PendingGap> pendingGap = new AtomicReference<>();

    public LogSseManager() {
        scheduler.scheduleAtFixedRate(this::flushBatch, BATCH_INTERVAL_MS, BATCH_INTERVAL_MS, TimeUnit.MILLISECONDS);
        scheduler.scheduleAtFixedRate(
                this::sendHeartbeats, HEARTBEAT_INTERVAL_MS, HEARTBEAT_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    public void shutdown() {
        if (!closed.compareAndSet(false, true)) {
            return;
        }
        scheduler.shutdownNow();
        List<SseSubscriber> subscribers = new ArrayList<>(emitters.values());
        emitters.clear();
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(SHUTDOWN_TIMEOUT_MS);
        subscribers.forEach(subscriber -> {
            subscriber.retired.set(true);
            safeEmitterComplete(subscriber);
        });
        subscribers.forEach(SseSubscriber::shutdownNow);
        for (SseSubscriber subscriber : subscribers) {
            subscriber.awaitTermination(deadline);
        }
        try {
            long remaining = deadline - System.nanoTime();
            if (remaining > 0) {
                scheduler.awaitTermination(remaining, TimeUnit.NANOSECONDS);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        synchronized (queueLock) {
            logQueue.clear();
            queueSize.set(0);
            pendingGap.set(null);
        }
    }

    /**
     * Create a new SSE emitter for a client with specified filters
     */
    public SseEmitter createEmitter(Long clientId, LogSseFilterCriteria filters) {
        return createEmitter(clientId, filters, new SseEmitter(Long.MAX_VALUE));
    }

    SseEmitter createEmitter(Long clientId, LogSseFilterCriteria filters, SseEmitter emitter) {
        if (filters == null) {
            throw new IllegalArgumentException("Workspace-bound log filters are required");
        }
        Predicate<LogEntry> matcher = filters.compile();
        ExecutorService sender = new ThreadPoolExecutor(
                1,
                1,
                0,
                TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(MAX_PENDING_BATCHES_PER_SUBSCRIBER),
                Thread.ofVirtual()
                        .name("sse-subscriber-sender-", 0)
                        .uncaughtExceptionHandler((thread, throwable) ->
                                log.error("SSE subscriber sender task failed."))
                        .factory(),
                new ThreadPoolExecutor.AbortPolicy());
        SseSubscriber subscriber;
        SseSubscriber replaced;
        synchronized (queueLock) {
            subscriber = new SseSubscriber(emitter, matcher, broadcastSequence.get(), sender);
            emitter.onCompletion(() -> removeEmitter(clientId, subscriber));
            emitter.onTimeout(() -> removeEmitter(clientId, subscriber));
            emitter.onError((ex) -> removeEmitter(clientId, subscriber));
            replaced = emitters.put(clientId, subscriber);
        }
        if (replaced != null) {
            retireSubscriber(replaced);
        }
        if (closed.get()) {
            safeComplete(clientId, subscriber);
        }
        return emitter;
    }

    /**
     * Queue log entry for batch processing
     */
    public void broadcast(LogEntry logEntry) {
        if (logEntry == null || closed.get() || emitters.isEmpty()) {
            return;
        }
        synchronized (queueLock) {
            if (closed.get() || emitters.isEmpty()) {
                return;
            }
            long sequence = broadcastSequence.incrementAndGet();
            if (queueSize.get() >= MAX_QUEUE_SIZE) {
                recordDroppedSequence(sequence);
                return;
            }
            if (logQueue.offer(new QueuedLog(sequence, logEntry))) {
                queueSize.incrementAndGet();
            } else {
                recordDroppedSequence(sequence);
                log.warn("Failed to enqueue SSE log entry.");
            }
        }
    }

    private void recordDroppedSequence(long sequence) {
        long observedAt = System.currentTimeMillis();
        pendingGap.updateAndGet(existing -> existing == null
                ? new PendingGap(sequence, sequence, observedAt)
                : new PendingGap(existing.firstDroppedSequence, sequence, observedAt));
    }

    /**
     * Flush queued logs to all subscribers in batch
     */
    private void flushBatch() {
        try {
            if (logQueue.isEmpty() && pendingGap.get() == null) {
                return;
            }

            List<QueuedItem> batch = new ArrayList<>(MAX_BATCH_SIZE + 1);
            synchronized (queueLock) {
                int logCount = 0;
                QueuedItem item = logQueue.peek();
                while (item != null && (logCount < MAX_BATCH_SIZE || item instanceof QueuedGap)) {
                    batch.add(logQueue.poll());
                    if (item instanceof QueuedLog) {
                        logCount++;
                        queueSize.decrementAndGet();
                    }
                    item = logQueue.peek();
                }
                PendingGap loss = pendingGap.getAndSet(null);
                if (loss != null) {
                    logQueue.offer(new QueuedGap(
                            loss.firstDroppedSequence, loss.lastDroppedSequence, loss.observedAt));
                }
            }

            for (Map.Entry<Long, SseSubscriber> e : emitters.entrySet()) {
                Long clientId = e.getKey();
                SseSubscriber subscriber = e.getValue();
                try {
                    List<QueuedItem> filtered = filterItems(batch, subscriber);
                    if (!filtered.isEmpty()) {
                        submitToSubscriber(clientId, subscriber, filtered);
                    }
                } catch (RuntimeException e1) {
                    log.error("SSE log subscriber filter failed.");
                    safeComplete(clientId, subscriber);
                }
            }
        } catch (Exception e) {
            log.error("SSE log batch flush failed.");
        }
    }

    private void submitToSubscriber(Long clientId, SseSubscriber subscriber, List<QueuedItem> items) {
        try {
            subscriber.sender.execute(() -> sendToSubscriber(clientId, subscriber, items));
        } catch (RejectedExecutionException ignored) {
            safeComplete(clientId, subscriber);
        }
    }

    private void sendToSubscriber(Long clientId, SseSubscriber subscriber, List<QueuedItem> items) {
        try {
            for (QueuedItem item : items) {
                if (emitters.get(clientId) != subscriber || subscriber.retired.get()) {
                    return;
                }
                if (item instanceof QueuedLog queuedLog) {
                    subscriber.emitter.send(SseEmitter.event()
                            .id(Long.toString(queuedLog.sequence))
                            .name("LOG_EVENT")
                            .data(queuedLog.entry));
                } else if (item instanceof QueuedGap queuedGap) {
                    subscriber.emitter.send(SseEmitter.event()
                            .id(Long.toString(queuedGap.lastDroppedSequence))
                            .name("LOG_STREAM_GAP")
                            .data(new LogStreamGap(
                                    queuedGap.observedAt, "queue_overflow", queuedGap.droppedCount())));
                }
            }
        } catch (IOException | IllegalStateException e) {
            safeComplete(clientId, subscriber);
        } catch (Exception e) {
            log.error("SSE log delivery failed.");
            safeComplete(clientId, subscriber);
        }
    }

    private void safeComplete(Long clientId, SseSubscriber subscriber) {
        removeEmitter(clientId, subscriber);
        retireSubscriber(subscriber);
    }

    private List<QueuedItem> filterItems(List<QueuedItem> items, SseSubscriber subscriber) {
        List<QueuedItem> filtered = new ArrayList<>();
        for (QueuedItem item : items) {
            if (item.sequence() <= subscriber.subscribedAfterSequence) {
                continue;
            }
            if (item instanceof QueuedGap queuedGap) {
                long firstVisibleSequence = queuedGap.firstDroppedSequence;
                if (firstVisibleSequence <= subscriber.subscribedAfterSequence) {
                    // item.sequence() already proved that the watermark is below Long.MAX_VALUE.
                    firstVisibleSequence = subscriber.subscribedAfterSequence + 1;
                }
                filtered.add(new QueuedGap(
                        firstVisibleSequence, queuedGap.lastDroppedSequence, queuedGap.observedAt));
            } else if (item instanceof QueuedLog queuedLog && subscriber.matcher.test(queuedLog.entry)) {
                filtered.add(item);
            }
        }
        return filtered;
    }

    private void sendHeartbeats() {
        if (closed.get()) {
            return;
        }
        emitters.forEach((clientId, subscriber) -> {
            try {
                subscriber.sender.execute(() -> sendHeartbeat(clientId, subscriber));
            } catch (RejectedExecutionException ignored) {
                safeComplete(clientId, subscriber);
            }
        });
    }

    private void sendHeartbeat(Long clientId, SseSubscriber subscriber) {
        if (emitters.get(clientId) != subscriber || subscriber.retired.get()) {
            return;
        }
        try {
            subscriber.emitter.send(SseEmitter.event().comment("keepalive"));
        } catch (IOException | IllegalStateException e) {
            safeComplete(clientId, subscriber);
        } catch (Exception e) {
            log.error("SSE log heartbeat delivery failed.");
            safeComplete(clientId, subscriber);
        }
    }

    private void removeEmitter(Long clientId, SseSubscriber subscriber) {
        if (emitters.remove(clientId, subscriber)) {
            retireSubscriber(subscriber);
        }
    }

    private void retireSubscriber(SseSubscriber subscriber) {
        if (!subscriber.retired.compareAndSet(false, true)) {
            return;
        }
        safeEmitterComplete(subscriber);
        subscriber.shutdownNow();
    }

    private void safeEmitterComplete(SseSubscriber subscriber) {
        try {
            subscriber.emitter.complete();
        } catch (Exception ignored) {
        }
    }

    public long getQueueSize() {
        return queueSize.get();
    }

    /**
     * SseSubscriber for SseEmitter and LogSseFilterCriteria
     */
    private static final class SseSubscriber {
        private final SseEmitter emitter;
        private final Predicate<LogEntry> matcher;
        private final long subscribedAfterSequence;
        private final ExecutorService sender;
        private final AtomicBoolean retired = new AtomicBoolean(false);

        private SseSubscriber(SseEmitter emitter, Predicate<LogEntry> matcher,
                              long subscribedAfterSequence, ExecutorService sender) {
            this.emitter = emitter;
            this.matcher = matcher;
            this.subscribedAfterSequence = subscribedAfterSequence;
            this.sender = sender;
        }

        private void shutdownNow() {
            if (sender != null) {
                sender.shutdownNow();
            }
        }

        private void awaitTermination(long deadline) {
            long remaining = deadline - System.nanoTime();
            try {
                if (remaining > 0) {
                    sender.awaitTermination(remaining, TimeUnit.NANOSECONDS);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private sealed interface QueuedItem permits QueuedLog, QueuedGap {
        long sequence();
    }

    record QueuedLog(long sequence, LogEntry entry) implements QueuedItem {
    }

    record QueuedGap(long firstDroppedSequence, long lastDroppedSequence, long observedAt) implements QueuedItem {

        @Override
        public long sequence() {
            return lastDroppedSequence;
        }

        long droppedCount() {
            return lastDroppedSequence - firstDroppedSequence + 1;
        }
    }

    record PendingGap(long firstDroppedSequence, long lastDroppedSequence, long observedAt) {
    }

    record LogStreamGap(long observedAt, String reason, long droppedCount) {
    }
}
