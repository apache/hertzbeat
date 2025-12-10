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

package org.apache.hertzbeat.log.notice;

import jakarta.annotation.PreDestroy;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * SSE manager for log with batch processing support for high TPS scenarios
 */
@Component
@Slf4j
@Getter
public class LogSseManager {
    
    private static final long BATCH_INTERVAL_MS = 200;
    private static final int MAX_BATCH_SIZE = 1000;
    private static final int MAX_QUEUE_SIZE = 10000;
    
    private final Map<Long, SseSubscriber> emitters = new ConcurrentHashMap<>();
    private final Queue<LogEntry> logQueue = new ConcurrentLinkedQueue<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "sse-batch-scheduler");
        t.setDaemon(true);
        return t;
    });
    private final ExecutorService senderPool = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "sse-sender");
        t.setDaemon(true);
        return t;
    });
    private final AtomicLong queueSize = new AtomicLong(0);

    public LogSseManager() {
        scheduler.scheduleAtFixedRate(this::flushBatch, BATCH_INTERVAL_MS, BATCH_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
        senderPool.shutdown();
        try {
            scheduler.awaitTermination(2, TimeUnit.SECONDS);
            senderPool.awaitTermination(2, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        scheduler.shutdownNow();
        senderPool.shutdownNow();
    }

    /**
     * Create a new SSE emitter for a client with specified filters
     */
    public SseEmitter createEmitter(Long clientId, LogSseFilterCriteria filters) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitter.onCompletion(() -> removeEmitter(clientId));
        emitter.onTimeout(() -> removeEmitter(clientId));
        emitter.onError((ex) -> removeEmitter(clientId));

        emitters.put(clientId, new SseSubscriber(emitter, filters));
        return emitter;
    }

    /**
     * Queue log entry for batch processing
     */
    public void broadcast(LogEntry logEntry) {
        if (queueSize.incrementAndGet() > MAX_QUEUE_SIZE) {
            queueSize.decrementAndGet();
            return;
        }
        boolean offered = logQueue.offer(logEntry);
        if (!offered) {
            queueSize.decrementAndGet();
            log.warn("Failed to enqueue log entry: {}", logEntry);
        }
    }

    /**
     * Flush queued logs to all subscribers in batch
     */
    private void flushBatch() {
        try {
            if (logQueue.isEmpty() || emitters.isEmpty()) {
                return;
            }

            List<LogEntry> batch = new ArrayList<>(MAX_BATCH_SIZE);
            LogEntry entry;
            while (batch.size() < MAX_BATCH_SIZE && (entry = logQueue.poll()) != null) {
                batch.add(entry);
                queueSize.decrementAndGet();
            }

            if (batch.isEmpty()) {
                return;
            }

            // Send to each subscriber in parallel
            for (Map.Entry<Long, SseSubscriber> e : emitters.entrySet()) {
                Long clientId = e.getKey();
                SseSubscriber subscriber = e.getValue();
                List<LogEntry> filtered = filterLogs(batch, subscriber.filters);
                if (!filtered.isEmpty()) {
                    senderPool.submit(() -> sendToSubscriber(clientId, subscriber.emitter, filtered));
                }
            }
        } catch (Exception e) {
            log.error("Error in flushBatch: {}", e.getMessage(), e);
        }
    }

    private void sendToSubscriber(Long clientId, SseEmitter emitter, List<LogEntry> logs) {
        try {
            long batchTimestamp = System.currentTimeMillis();
            int sequenceNumber = 0;
            for (LogEntry logEntry : logs) {
                String eventId = batchTimestamp + "-" + sequenceNumber++;
                emitter.send(SseEmitter.event()
                        .id(eventId)
                        .name("LOG_EVENT")
                        .data(logEntry));
            }
        } catch (IOException | IllegalStateException e) {
            safeComplete(clientId, emitter);
        } catch (Exception e) {
            log.error("Failed to send to client {}: {}", clientId, e.getMessage());
            safeComplete(clientId, emitter);
        }
    }

    private void safeComplete(Long clientId, SseEmitter emitter) {
        try {
            emitter.complete();
        } catch (Exception ignored) {
        }
        removeEmitter(clientId);
    }

    private List<LogEntry> filterLogs(List<LogEntry> logs, LogSseFilterCriteria filters) {
        if (filters == null) {
            return logs;
        }
        List<LogEntry> filtered = new ArrayList<>();
        for (LogEntry log : logs) {
            if (filters.matches(log)) {
                filtered.add(log);
            }
        }
        return filtered;
    }

    private void removeEmitter(Long clientId) {
        emitters.remove(clientId);
    }

    public long getQueueSize() {
        return queueSize.get();
    }

    /**
     * SseSubscriber for SseEmitter and LogSseFilterCriteria
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SseSubscriber {
        private SseEmitter emitter;
        private LogSseFilterCriteria filters;
    }
}
