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

package org.apache.hertzbeat.common.queue.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.DataQueueConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * In-memory {@link CommonDataQueue} used when {@code common.queue.type=memory}
 * and when no queue type is configured.
 *
 * <p>Each of the five queues retains at most {@value #QUEUE_CAPACITY} entries.
 * Producers use non-blocking {@code offer}. When a queue is full the incoming
 * entry is discarded and entries already queued stay in FIFO order, so a stalled
 * consumer cannot block the producer. The policy is lossy for metrics, logs, and
 * service discovery events. It bounds how many entries are retained, not payload
 * bytes or total JVM memory, and it does not prevent every out-of-memory failure.
 * {@value #QUEUE_CAPACITY} is a conservative initial choice, not a benchmark result.
 * Installations that need durable buffering should use an external queue.
 * Overflow logs at most one warning per queue per minute, and that warning names
 * the queue without the metric or log payload.
 */
@Configuration
@ConditionalOnProperty(
        prefix = DataQueueConstants.PREFIX,
        name = DataQueueConstants.NAME,
        havingValue = DataQueueConstants.IN_MEMORY,
        matchIfMissing = true
)
@Slf4j
@Primary
public class InMemoryCommonDataQueue implements CommonDataQueue, DisposableBean {

    /**
     * Maximum number of entries retained in each in-memory queue.
     *
     * <p>Overflow discards incoming entries instead of growing without a ceiling.
     * The value bounds entry count only. It is a conservative initial policy, not a
     * measured limit that prevents every out-of-memory error.
     */
    public static final int QUEUE_CAPACITY = 10_000;

    private static final long OVERFLOW_WARN_INTERVAL_NANOS = TimeUnit.MINUTES.toNanos(1);

    private static final String METRICS_DATA_TO_ALERT_QUEUE = "metricsDataToAlertQueue";
    private static final String METRICS_DATA_TO_STORAGE_QUEUE = "metricsDataToStorageQueue";
    private static final String SERVICE_DISCOVERY_DATA_QUEUE = "serviceDiscoveryDataQueue";
    private static final String LOG_ENTRY_QUEUE = "logEntryQueue";
    private static final String LOG_ENTRY_TO_STORAGE_QUEUE = "logEntryToStorageQueue";

    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToAlertQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToStorageQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> serviceDiscoveryDataQueue;
    private final LinkedBlockingQueue<LogEntry> logEntryQueue;
    private final LinkedBlockingQueue<LogEntry> logEntryToStorageQueue;
    private final OverflowWarning metricsDataToAlertOverflow = new OverflowWarning();
    private final OverflowWarning metricsDataToStorageOverflow = new OverflowWarning();
    private final OverflowWarning serviceDiscoveryOverflow = new OverflowWarning();
    private final OverflowWarning logEntryOverflow = new OverflowWarning();
    private final OverflowWarning logEntryToStorageOverflow = new OverflowWarning();

    public InMemoryCommonDataQueue() {
        metricsDataToAlertQueue = new LinkedBlockingQueue<>(QUEUE_CAPACITY);
        metricsDataToStorageQueue = new LinkedBlockingQueue<>(QUEUE_CAPACITY);
        serviceDiscoveryDataQueue = new LinkedBlockingQueue<>(QUEUE_CAPACITY);
        logEntryQueue = new LinkedBlockingQueue<>(QUEUE_CAPACITY);
        logEntryToStorageQueue = new LinkedBlockingQueue<>(QUEUE_CAPACITY);
    }

    public Map<String, Integer> getQueueSizeMetricsInfo() {
        Map<String, Integer> metrics = new HashMap<>(8);
        metrics.put(METRICS_DATA_TO_ALERT_QUEUE, metricsDataToAlertQueue.size());
        metrics.put(METRICS_DATA_TO_STORAGE_QUEUE, metricsDataToStorageQueue.size());
        metrics.put(LOG_ENTRY_QUEUE, logEntryQueue.size());
        metrics.put(LOG_ENTRY_TO_STORAGE_QUEUE, logEntryToStorageQueue.size());
        return metrics;
    }

    @Override
    public CollectRep.MetricsData pollServiceDiscoveryData() throws InterruptedException {
        return serviceDiscoveryDataQueue.take();
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException {
        return metricsDataToAlertQueue.take();
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToStorage() throws InterruptedException {
        return metricsDataToStorageQueue.take();
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        offerEntry(metricsDataToAlertQueue, metricsData, METRICS_DATA_TO_ALERT_QUEUE, metricsDataToAlertOverflow);
    }

    @Override
    public void sendMetricsDataToStorage(CollectRep.MetricsData metricsData) {
        offerEntry(metricsDataToStorageQueue, metricsData, METRICS_DATA_TO_STORAGE_QUEUE, metricsDataToStorageOverflow);
    }

    @Override
    public void sendServiceDiscoveryData(CollectRep.MetricsData metricsData) {
        offerEntry(serviceDiscoveryDataQueue, metricsData, SERVICE_DISCOVERY_DATA_QUEUE, serviceDiscoveryOverflow);
    }

    @Override
    public void sendLogEntry(LogEntry logEntry) {
        offerEntry(logEntryQueue, logEntry, LOG_ENTRY_QUEUE, logEntryOverflow);
    }

    @Override
    public LogEntry pollLogEntry() throws InterruptedException {
        return logEntryQueue.take();
    }

    @Override
    public void sendLogEntryToStorage(LogEntry logEntry) {
        offerEntry(logEntryToStorageQueue, logEntry, LOG_ENTRY_TO_STORAGE_QUEUE, logEntryToStorageOverflow);
    }

    @Override
    public LogEntry pollLogEntryToStorage() throws InterruptedException {
        return logEntryToStorageQueue.take();
    }

    @Override
    public void sendLogEntryToAlertBatch(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }
        for (LogEntry logEntry : logEntries) {
            sendLogEntry(logEntry);
        }
    }

    @Override
    public List<LogEntry> pollLogEntryToAlertBatch(int maxBatchSize) throws InterruptedException {
        List<LogEntry> batch = new ArrayList<>(maxBatchSize);
        LogEntry first = logEntryQueue.poll(1, TimeUnit.SECONDS);
        if (first != null) {
            batch.add(first);
            logEntryQueue.drainTo(batch, maxBatchSize - 1);
        }
        return batch;
    }

    @Override
    public void sendLogEntryToStorageBatch(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }
        for (LogEntry logEntry : logEntries) {
            sendLogEntryToStorage(logEntry);
        }
    }

    @Override
    public List<LogEntry> pollLogEntryToStorageBatch(int maxBatchSize) throws InterruptedException {
        List<LogEntry> batch = new ArrayList<>(maxBatchSize);
        LogEntry first = logEntryToStorageQueue.poll(1, TimeUnit.SECONDS);
        if (first != null) {
            batch.add(first);
            logEntryToStorageQueue.drainTo(batch, maxBatchSize - 1);
        }
        return batch;
    }

    @Override
    public void destroy() {
        metricsDataToAlertQueue.clear();
        metricsDataToStorageQueue.clear();
        serviceDiscoveryDataQueue.clear();
        logEntryQueue.clear();
        logEntryToStorageQueue.clear();
    }

    private <T> void offerEntry(LinkedBlockingQueue<T> dataQueue, T entry, String queueName, OverflowWarning overflow) {
        if (!dataQueue.offer(entry)) {
            overflow.record(queueName);
        }
    }

    /**
     * Rate-limits overflow warnings for one queue with {@link System#nanoTime()}.
     * The first discard in a window logs immediately. Later discards in that minute
     * only advance the count reported by the next window, so a full queue cannot
     * emit one warning per dropped entry.
     */
    private static final class OverflowWarning {

        private final AtomicLong nextWarnAtNanos = new AtomicLong(Long.MIN_VALUE);
        private final AtomicLong discarded = new AtomicLong();

        private void record(String queueName) {
            discarded.incrementAndGet();
            if (!tryAcquire()) {
                return;
            }
            long discardedCount = discarded.getAndSet(0);
            log.warn("in-memory queue overflow queue={} capacity={} discarded={}; incoming entries discarded, queued entries retained in order",
                    queueName, QUEUE_CAPACITY, Math.max(discardedCount, 1L));
        }

        private boolean tryAcquire() {
            long now = System.nanoTime();
            while (true) {
                long nextWarnAt = nextWarnAtNanos.get();
                if (now < nextWarnAt) {
                    return false;
                }
                if (nextWarnAtNanos.compareAndSet(nextWarnAt, nextWarnDeadline(now))) {
                    return true;
                }
            }
        }

        private static long nextWarnDeadline(long now) {
            if (now > Long.MAX_VALUE - OVERFLOW_WARN_INTERVAL_NANOS) {
                return Long.MAX_VALUE;
            }
            return now + OVERFLOW_WARN_INTERVAL_NANOS;
        }
    }
}
