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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/**
 * Test case for {@link InMemoryCommonDataQueue}
 */
@ExtendWith(OutputCaptureExtension.class)
class InMemoryCommonDataQueueTest {

    private static final int CAPACITY = InMemoryCommonDataQueue.QUEUE_CAPACITY;

    private static final Duration SEND_TIMEOUT = Duration.ofSeconds(10);

    private InMemoryCommonDataQueue queue;

    @BeforeEach
    void setUp() {
        queue = new InMemoryCommonDataQueue();
    }

    @Test
    void testMetricsData() throws InterruptedException {

        var metricsData = CollectRep.MetricsData.newBuilder().build();

        queue.sendMetricsData(metricsData);

        CollectRep.MetricsData polledMetricsData = queue.pollMetricsDataToAlerter();

        assertNotNull(polledMetricsData);
        assertEquals(metricsData, polledMetricsData);
    }

    @Test
    void testLogEntry() throws InterruptedException {
        
        // Create a test log entry with comprehensive data
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("service.name", "hertzbeat");
        attributes.put("service.version", "1.0.0");
        
        Map<String, Object> resource = new HashMap<>();
        resource.put("host.name", "localhost");
        resource.put("os.type", "linux");
        
        LogEntry.InstrumentationScope scope = LogEntry.InstrumentationScope.builder()
                .name("org.apache.hertzbeat.test")
                .version("1.0.0")
                .build();
        
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .observedTimeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(9) // INFO level
                .severityText("INFO")
                .body("Test log message for hertzbeat queue")
                .attributes(attributes)
                .resource(resource)
                .instrumentationScope(scope)
                .traceId("1234567890abcdef1234567890abcdef")
                .spanId("1234567890abcdef")
                .traceFlags(1)
                .build();
        
        // Test sending and polling log entry
        queue.sendLogEntry(logEntry);
        
        LogEntry polledLogEntry = queue.pollLogEntry();
        
        assertNotNull(polledLogEntry);
        assertEquals(logEntry.getSeverityText(), polledLogEntry.getSeverityText());
        assertEquals(logEntry.getBody(), polledLogEntry.getBody());
        assertEquals(logEntry.getTraceId(), polledLogEntry.getTraceId());
        assertEquals(logEntry.getSpanId(), polledLogEntry.getSpanId());
    }
    
    @Test
    void testLogEntryToStorage() throws InterruptedException {
        
        // Create a simple log entry for storage test
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(17) // ERROR level
                .severityText("ERROR")
                .body("Error log message for storage")
                .build();
        
        // Test sending and polling log entry to storage
        queue.sendLogEntryToStorage(logEntry);
        
        LogEntry polledLogEntry = queue.pollLogEntryToStorage();
        
        assertNotNull(polledLogEntry);
        assertEquals(logEntry.getSeverityText(), polledLogEntry.getSeverityText());
        assertEquals(logEntry.getBody(), polledLogEntry.getBody());
        assertEquals(logEntry.getSeverityNumber(), polledLogEntry.getSeverityNumber());
    }

    @Test
    void testGetQueueSizeMetricsInfo() {

        Map<String, Integer> metricsInfo = queue.getQueueSizeMetricsInfo();
        
        assertEquals(0, metricsInfo.get("metricsDataToAlertQueue"));
        assertEquals(0, metricsInfo.get("metricsDataToStorageQueue"));
        assertEquals(0, metricsInfo.get("logEntryQueue"));
        assertEquals(0, metricsInfo.get("logEntryToStorageQueue"));
        
        // Add metrics data and log entries
        queue.sendMetricsData(CollectRep.MetricsData.newBuilder().build());
        queue.sendLogEntry(LogEntry.builder().body("Test log").build());
        queue.sendLogEntryToStorage(LogEntry.builder().body("Storage log").build());

        metricsInfo = queue.getQueueSizeMetricsInfo();
        
        assertEquals(1, metricsInfo.get("metricsDataToAlertQueue"));
        assertEquals(0, metricsInfo.get("metricsDataToStorageQueue"));
        assertEquals(1, metricsInfo.get("logEntryQueue"));
        assertEquals(1, metricsInfo.get("logEntryToStorageQueue"));
    }

    @Test
    void testDestroy() {
        
        // Add both metrics data and log entries before destroy
        queue.sendMetricsData(CollectRep.MetricsData.newBuilder().build());
        queue.sendLogEntry(LogEntry.builder().body("Test log").build());
        queue.sendLogEntryToStorage(LogEntry.builder().body("Storage log").build());

        queue.destroy();

        Map<String, Integer> metricsInfo = queue.getQueueSizeMetricsInfo();
        
        assertEquals(0, metricsInfo.get("metricsDataToAlertQueue"));
        assertEquals(0, metricsInfo.get("metricsDataToStorageQueue"));
        assertEquals(0, metricsInfo.get("logEntryQueue"));
        assertEquals(0, metricsInfo.get("logEntryToStorageQueue"));
    }

    @Test
    void testBoundedQueuesKeepAcceptedEntriesInFifoOrder() throws Exception {
        List<CollectRep.MetricsData> metrics = metricsSequence();
        CollectRep.MetricsData rejectedMetrics = metrics(4, "rejected-metrics");
        assertBoundedFifo(metrics, rejectedMetrics, queue::sendMetricsData,
                queue::pollMetricsDataToAlerter, "metricsDataToAlertQueue");
        assertBoundedFifo(metrics, rejectedMetrics, queue::sendMetricsDataToStorage,
                queue::pollMetricsDataToStorage, "metricsDataToStorageQueue");
        assertBoundedFifo(metrics, rejectedMetrics, queue::sendServiceDiscoveryData,
                queue::pollServiceDiscoveryData, null);
        assertBoundedFifo(logSequence("alert-"), logEntry("alert-rejected"),
                queue::sendLogEntry, queue::pollLogEntry, "logEntryQueue");
        assertBoundedFifo(logSequence("storage-"), logEntry("storage-rejected"),
                queue::sendLogEntryToStorage, queue::pollLogEntryToStorage, "logEntryToStorageQueue");
    }

    @Test
    void testFreedSlotAcceptsSentinelAtTail() throws Exception {
        List<CollectRep.MetricsData> metrics = metricsSequence();
        CollectRep.MetricsData rejectedMetrics = metrics(4, "rejected-metrics");
        CollectRep.MetricsData sentinelMetrics = metrics(5, "sentinel-metrics");
        assertFreedSlotReused(metrics, rejectedMetrics, sentinelMetrics, queue::sendMetricsData,
                queue::pollMetricsDataToAlerter, "metricsDataToAlertQueue");
        assertFreedSlotReused(metrics, rejectedMetrics, sentinelMetrics, queue::sendMetricsDataToStorage,
                queue::pollMetricsDataToStorage, "metricsDataToStorageQueue");
        assertFreedSlotReused(metrics, rejectedMetrics, sentinelMetrics, queue::sendServiceDiscoveryData,
                queue::pollServiceDiscoveryData, null);
        assertFreedSlotReused(logSequence("alert-"), logEntry("alert-rejected"), logEntry("alert-sentinel"),
                queue::sendLogEntry, queue::pollLogEntry, "logEntryQueue");
        assertFreedSlotReused(logSequence("storage-"), logEntry("storage-rejected"), logEntry("storage-sentinel"),
                queue::sendLogEntryToStorage, queue::pollLogEntryToStorage, "logEntryToStorageQueue");
    }

    @Test
    void testSaturatedQueueDoesNotBlockAnother() throws Exception {
        CollectRep.MetricsData alert = metrics(1, "alert");
        CollectRep.MetricsData alertRejected = metrics(2, "alert-rejected");
        CollectRep.MetricsData stored = metrics(3, "stored");
        CollectRep.MetricsData discovered = metrics(4, "discovered");
        LogEntry independentLog = logEntry("independent-log");

        assertTimeoutPreemptively(SEND_TIMEOUT, () -> {
            for (int i = 0; i < CAPACITY; i++) {
                queue.sendMetricsData(alert);
            }
            queue.sendMetricsData(alertRejected);
            queue.sendMetricsDataToStorage(stored);
            queue.sendServiceDiscoveryData(discovered);
            queue.sendLogEntry(independentLog);
        });

        Map<String, Integer> sizes = queue.getQueueSizeMetricsInfo();
        assertEquals(CAPACITY, sizes.get("metricsDataToAlertQueue"));
        assertEquals(1, sizes.get("metricsDataToStorageQueue"));
        assertEquals(1, sizes.get("logEntryQueue"));
        assertSame(stored, pollWithin(queue::pollMetricsDataToStorage));
        assertSame(discovered, pollWithin(queue::pollServiceDiscoveryData));
        assertSame(independentLog, pollWithin(queue::pollLogEntry));
        assertSame(alert, pollWithin(queue::pollMetricsDataToAlerter));
        assertEquals(CAPACITY - 1, queue.getQueueSizeMetricsInfo().get("metricsDataToAlertQueue"));
    }

    @Test
    void testLogBatchOverflowFillsOnlyRemainingSlots() throws Exception {
        assertTimeoutPreemptively(SEND_TIMEOUT, () -> {
            queue.sendLogEntryToAlertBatch(null);
            queue.sendLogEntryToAlertBatch(List.of());
            queue.sendLogEntryToStorageBatch(null);
            queue.sendLogEntryToStorageBatch(List.of());
        });
        assertEquals(0, queue.getQueueSizeMetricsInfo().get("logEntryQueue"));
        assertEquals(0, queue.getQueueSizeMetricsInfo().get("logEntryToStorageQueue"));

        List<LogEntry> alertPrefix = logSequence("alert-single-").subList(0, 3);
        List<LogEntry> alertBatch = logSequence("alert-batch-");
        assertTimeoutPreemptively(SEND_TIMEOUT, () -> {
            alertPrefix.forEach(queue::sendLogEntry);
            queue.sendLogEntryToAlertBatch(alertBatch);
            queue.sendLogEntryToAlertBatch(null);
            queue.sendLogEntryToAlertBatch(List.of());
        });
        assertEquals(CAPACITY, queue.getQueueSizeMetricsInfo().get("logEntryQueue"));
        List<LogEntry> expectedAlert = new ArrayList<>(alertPrefix);
        expectedAlert.addAll(alertBatch.subList(0, CAPACITY - alertPrefix.size()));
        assertEquals(expectedAlert, drain(queue::pollLogEntry, CAPACITY));
        assertNoFurtherEntry(queue::pollLogEntry);

        List<LogEntry> storagePrefix = logSequence("storage-single-").subList(0, CAPACITY - 1);
        List<LogEntry> storageBatch = List.of(
                logEntry("storage-batch-0"),
                logEntry("storage-batch-1"),
                logEntry("storage-batch-2"),
                logEntry("storage-batch-3"));
        assertTimeoutPreemptively(SEND_TIMEOUT, () -> {
            storagePrefix.forEach(queue::sendLogEntryToStorage);
            queue.sendLogEntryToStorageBatch(storageBatch);
            queue.sendLogEntryToStorage(logEntry("storage-after-full"));
            queue.sendLogEntryToStorageBatch(null);
            queue.sendLogEntryToStorageBatch(List.of());
        });
        assertEquals(CAPACITY, queue.getQueueSizeMetricsInfo().get("logEntryToStorageQueue"));
        List<LogEntry> expectedStorage = new ArrayList<>(storagePrefix);
        expectedStorage.add(storageBatch.get(0));
        assertEquals(expectedStorage, drain(queue::pollLogEntryToStorage, CAPACITY));
        assertNoFurtherEntry(queue::pollLogEntryToStorage);
    }

    @Test
    void testConcurrentProducersDoNotExceedCapacity() throws Exception {
        int producers = 8;
        LogEntry entry = logEntry("concurrent");
        ExecutorService pool = Executors.newFixedThreadPool(producers);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger maxDepth = new AtomicInteger();
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int producer = 0; producer < producers; producer++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    for (int i = 0; i < CAPACITY; i++) {
                        queue.sendLogEntry(entry);
                        if ((i & 127) == 0) {
                            int depth = queue.getQueueSizeMetricsInfo().get("logEntryQueue");
                            maxDepth.accumulateAndGet(depth, Math::max);
                            if (depth > CAPACITY) {
                                throw new IllegalStateException("depth " + depth);
                            }
                        }
                    }
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> future : futures) {
                future.get(30, TimeUnit.SECONDS);
            }
            int depth = queue.getQueueSizeMetricsInfo().get("logEntryQueue");
            assertEquals(CAPACITY, depth);
            assertTrue(maxDepth.get() <= CAPACITY);
        } finally {
            start.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void testOverflowWarningIsRateLimitedAndOmitsPayload(CapturedOutput output) throws Exception {
        LogEntry keptLog = logEntry("kept-log");
        LogEntry secretLog = logEntry("log-payload-7f3a9c");
        CollectRep.MetricsData keptMetrics = metrics(1, "kept-metric");
        CollectRep.MetricsData secretMetrics = metrics(2, "metric-payload-7f3a9c");
        assertTimeoutPreemptively(SEND_TIMEOUT, () -> {
            for (int i = 0; i < CAPACITY; i++) {
                queue.sendLogEntry(keptLog);
                queue.sendMetricsData(keptMetrics);
            }
            for (int i = 0; i < 30; i++) {
                queue.sendLogEntry(secretLog);
                queue.sendMetricsData(secretMetrics);
            }
        });

        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int producer = 0; producer < 4; producer++) {
                futures.add(pool.submit(() -> {
                    for (int i = 0; i < 50; i++) {
                        queue.sendLogEntry(secretLog);
                        queue.sendMetricsData(secretMetrics);
                    }
                    return null;
                }));
            }
            for (Future<?> future : futures) {
                future.get(10, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        String logs = output.getAll();
        assertEquals(1, countOf(logs, "queue=logEntryQueue "));
        assertEquals(1, countOf(logs, "queue=metricsDataToAlertQueue "));
        assertFalse(logs.contains("log-payload-7f3a9c"));
        assertFalse(logs.contains("metric-payload-7f3a9c"));
    }

    @Test
    void testStorageDiscoveryAndBatchDrain() throws Exception {
        CollectRep.MetricsData stored = metrics(11, "storage-round-trip");
        queue.sendMetricsDataToStorage(stored);
        assertSame(stored, pollWithin(queue::pollMetricsDataToStorage));

        CollectRep.MetricsData discovered = metrics(12, "discovery-round-trip");
        queue.sendServiceDiscoveryData(discovered);
        assertSame(discovered, pollWithin(queue::pollServiceDiscoveryData));

        List<LogEntry> alertBatch = List.of(logEntry("batch-alert-0"), logEntry("batch-alert-1"), logEntry("batch-alert-2"));
        queue.sendLogEntryToAlertBatch(alertBatch);
        assertEquals(alertBatch.subList(0, 2), queue.pollLogEntryToAlertBatch(2));
        assertEquals(alertBatch.subList(2, 3), queue.pollLogEntryToAlertBatch(2));
        assertEquals(List.of(), queue.pollLogEntryToAlertBatch(2));

        List<LogEntry> storageBatch = List.of(logEntry("batch-storage-0"), logEntry("batch-storage-1"));
        queue.sendLogEntryToStorageBatch(storageBatch);
        assertEquals(storageBatch, queue.pollLogEntryToStorageBatch(10));
        assertEquals(List.of(), queue.pollLogEntryToStorageBatch(1));
    }

    @Test
    void testDestroyDropsBacklogAndAcceptsFreshSentinel() throws Exception {
        CollectRep.MetricsData oldMetrics = metrics(1, "old-metrics");
        LogEntry oldLog = logEntry("old-log");
        assertTimeoutPreemptively(SEND_TIMEOUT, () -> {
            for (int i = 0; i < CAPACITY; i++) {
                queue.sendMetricsData(oldMetrics);
                queue.sendMetricsDataToStorage(oldMetrics);
                queue.sendServiceDiscoveryData(oldMetrics);
                queue.sendLogEntry(oldLog);
                queue.sendLogEntryToStorage(oldLog);
            }
        });

        queue.destroy();

        Map<String, Integer> sizes = queue.getQueueSizeMetricsInfo();
        assertEquals(0, sizes.get("metricsDataToAlertQueue"));
        assertEquals(0, sizes.get("metricsDataToStorageQueue"));
        assertEquals(0, sizes.get("logEntryQueue"));
        assertEquals(0, sizes.get("logEntryToStorageQueue"));

        CollectRep.MetricsData freshMetrics = metrics(2, "fresh-metrics");
        LogEntry freshLog = logEntry("fresh-log");
        queue.sendMetricsData(freshMetrics);
        queue.sendMetricsDataToStorage(freshMetrics);
        queue.sendServiceDiscoveryData(freshMetrics);
        queue.sendLogEntry(freshLog);
        queue.sendLogEntryToStorage(freshLog);

        assertSame(freshMetrics, pollWithin(queue::pollMetricsDataToAlerter));
        assertSame(freshMetrics, pollWithin(queue::pollMetricsDataToStorage));
        assertSame(freshMetrics, pollWithin(queue::pollServiceDiscoveryData));
        assertSame(freshLog, pollWithin(queue::pollLogEntry));
        assertSame(freshLog, pollWithin(queue::pollLogEntryToStorage));
        assertNoFurtherEntry(queue::pollMetricsDataToAlerter);
        assertNoFurtherEntry(queue::pollMetricsDataToStorage);
        assertNoFurtherEntry(queue::pollServiceDiscoveryData);
        assertNoFurtherEntry(queue::pollLogEntry);
        assertNoFurtherEntry(queue::pollLogEntryToStorage);
    }

    private <T> void assertBoundedFifo(List<T> accepted, T rejected, Consumer<T> send, Callable<T> poll, String sizeKey)
            throws Exception {
        assertEquals(CAPACITY, accepted.size());
        assertTimeoutPreemptively(SEND_TIMEOUT, () -> {
            accepted.forEach(send);
            send.accept(rejected);
            send.accept(rejected);
        });
        if (sizeKey != null) {
            assertEquals(CAPACITY, queue.getQueueSizeMetricsInfo().get(sizeKey));
        }
        assertEquals(accepted, drain(poll, CAPACITY));
        assertNoFurtherEntry(poll);
    }

    private <T> void assertFreedSlotReused(List<T> accepted, T rejected, T sentinel, Consumer<T> send, Callable<T> poll,
            String sizeKey) throws Exception {
        assertEquals(CAPACITY, accepted.size());
        assertTimeoutPreemptively(SEND_TIMEOUT, () -> {
            accepted.forEach(send);
            send.accept(rejected);
        });
        if (sizeKey != null) {
            assertEquals(CAPACITY, queue.getQueueSizeMetricsInfo().get(sizeKey));
        }
        assertEquals(accepted.get(0), pollWithin(poll));
        assertTimeoutPreemptively(Duration.ofSeconds(5), () -> send.accept(sentinel));
        if (sizeKey != null) {
            assertEquals(CAPACITY, queue.getQueueSizeMetricsInfo().get(sizeKey));
        }
        List<T> expected = new ArrayList<>(accepted.subList(1, accepted.size()));
        expected.add(sentinel);
        assertEquals(expected, drain(poll, expected.size()));
        assertNoFurtherEntry(poll);
    }

    private <T> T pollWithin(Callable<T> poll) throws Exception {
        return drain(poll, 1).get(0);
    }

    private <T> List<T> drain(Callable<T> poll, int count) throws Exception {
        ExecutorService executor = newPollExecutor();
        Future<List<T>> future = executor.submit(() -> {
            List<T> drained = new ArrayList<>(count);
            for (int i = 0; i < count; i++) {
                drained.add(poll.call());
            }
            return drained;
        });
        try {
            return future.get(30, TimeUnit.SECONDS);
        } catch (TimeoutException timeout) {
            future.cancel(true);
            throw new AssertionError("drain timed out after " + count + " expected entries", timeout);
        } catch (InterruptedException interrupted) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw interrupted;
        } catch (ExecutionException failure) {
            future.cancel(true);
            Throwable cause = failure.getCause();
            if (cause instanceof RuntimeException) {
                throw (RuntimeException) cause;
            }
            if (cause instanceof Error) {
                throw (Error) cause;
            }
            throw failure;
        } finally {
            executor.shutdownNow();
        }
    }

    private static void assertNoFurtherEntry(Callable<?> poll) throws Exception {
        ExecutorService executor = newPollExecutor();
        Future<?> future = executor.submit(poll);
        try {
            future.get(500, TimeUnit.MILLISECONDS);
            fail("expected no further queued entry");
        } catch (TimeoutException expected) {
            future.cancel(true);
        } catch (InterruptedException interrupted) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw interrupted;
        } finally {
            executor.shutdownNow();
        }
    }

    private static ExecutorService newPollExecutor() {
        return Executors.newSingleThreadExecutor(runnable -> {
            Thread thread = new Thread(runnable, "in-memory-queue-poll");
            thread.setDaemon(true);
            return thread;
        });
    }

    private static List<CollectRep.MetricsData> metricsSequence() {
        CollectRep.MetricsData first = metrics(1, "first");
        CollectRep.MetricsData middle = metrics(2, "middle");
        CollectRep.MetricsData last = metrics(3, "last");
        List<CollectRep.MetricsData> accepted = new ArrayList<>(CAPACITY);
        accepted.add(first);
        for (int i = 0; i < CAPACITY - 2; i++) {
            accepted.add(middle);
        }
        accepted.add(last);
        return accepted;
    }

    private static CollectRep.MetricsData metrics(long id, String message) {
        return CollectRep.MetricsData.newBuilder().setId(id).setMsg(message).build();
    }

    private static List<LogEntry> logSequence(String prefix) {
        List<LogEntry> accepted = new ArrayList<>(CAPACITY);
        for (int i = 0; i < CAPACITY; i++) {
            accepted.add(logEntry(prefix + i));
        }
        return accepted;
    }

    private static LogEntry logEntry(String body) {
        return LogEntry.builder().body(body).build();
    }

    private static int countOf(String text, String token) {
        int count = 0;
        int from = 0;
        while (true) {
            int found = text.indexOf(token, from);
            if (found < 0) {
                return count;
            }
            count++;
            from = found + token.length();
        }
    }

}
