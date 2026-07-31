/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.logs.sse;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.FutureTask;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Unit tests for {@link LogSseManager}.
 */
class LogSseManagerTest {

    private LogSseManager logSseManager;
    private static final Long CLIENT_ID = 1L;

    @BeforeEach
    void setUp() {
        logSseManager = new LogSseManager();
    }

    @AfterEach
    void tearDown() {
        logSseManager.shutdown();
    }

    @Test
    void shouldCreateAndStoreEmitter() {
        // When: Creating a new emitter for a client
        SseEmitter emitter = logSseManager.createEmitter(CLIENT_ID, defaultWorkspaceCriteria());

        // Then: The emitter should be created and stored
        assertNotNull(emitter);
        assertEquals(Long.MAX_VALUE, emitter.getTimeout());
        assertTrue(hasSubscriber(CLIENT_ID));
    }

    @Test
    void registrationMustSendContentFreeReadinessComment() throws IOException {
        SseEmitter emitter = mock(SseEmitter.class);
        List<Object> sentFragments = new CopyOnWriteArrayList<>();
        doAnswer(invocation -> {
            invocation.<SseEmitter.SseEventBuilder>getArgument(0).build().stream()
                    .map(org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
                            .DataWithMediaType::getData)
                    .forEach(sentFragments::add);
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));

        logSseManager.createEmitter(CLIENT_ID, defaultWorkspaceCriteria(), emitter);

        assertEquals(List.of(":ready\n\n"), sentFragments);
        assertTrue(hasSubscriber(CLIENT_ID));
    }

    @Test
    void failedReadinessMustRetireSubscriberWithoutLeakingFailureDetail() throws IOException {
        Logger logger = (Logger) LoggerFactory.getLogger(LogSseManager.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        SseEmitter ioEmitter = mock(SseEmitter.class);
        doAnswer(invocation -> {
            throw new IOException("Authorization: Bearer private-readiness-token");
        }).when(ioEmitter).send(any(SseEmitter.SseEventBuilder.class));
        SseEmitter stateEmitter = mock(SseEmitter.class);
        doAnswer(invocation -> {
            throw new IllegalStateException("private-illegal-state-detail");
        }).when(stateEmitter).send(any(SseEmitter.SseEventBuilder.class));

        try {
            logSseManager.createEmitter(CLIENT_ID, defaultWorkspaceCriteria(), ioEmitter);
            logSseManager.createEmitter(CLIENT_ID + 1, defaultWorkspaceCriteria(), stateEmitter);

            assertFalse(hasSubscriber(CLIENT_ID));
            assertFalse(hasSubscriber(CLIENT_ID + 1));
            verify(ioEmitter).complete();
            verify(stateEmitter).complete();
            assertTrue(appender.list.stream().noneMatch(event ->
                    event.getFormattedMessage().contains("Authorization")
                            || event.getFormattedMessage().contains("Bearer")
                            || event.getFormattedMessage().contains("private-readiness-token")
                            || event.getFormattedMessage().contains("private-illegal-state-detail")));
            assertTrue(appender.list.stream().allMatch(event -> event.getThrowableProxy() == null));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void shouldRejectNullOrUnboundWorkspaceCriteria() {
        assertThrows(IllegalArgumentException.class,
                () -> logSseManager.createEmitter(CLIENT_ID, null));
        assertThrows(IllegalArgumentException.class,
                () -> logSseManager.createEmitter(CLIENT_ID, new LogSseFilterCriteria()));
        assertFalse(hasSubscriber(CLIENT_ID));
    }

    @Test
    void subscriberRegistrationMustShareTheBroadcastQueueBoundary() throws Exception {
        Object queueLock = readPrivateField("queueLock");
        FutureTask<SseEmitter> registration = new FutureTask<>(
                () -> logSseManager.createEmitter(CLIENT_ID, defaultWorkspaceCriteria()));
        Thread registrationThread;
        synchronized (queueLock) {
            registrationThread = Thread.ofVirtual().start(registration);
            Thread.sleep(100);
            assertFalse(registration.isDone());
        }

        assertNotNull(registration.get(1, TimeUnit.SECONDS));
        registrationThread.join();
    }

    @Test
    void shouldBroadcastLogWhenFilterMatches() throws IOException {
        // Given: A client with a filter for "INFO" logs
        LogSseFilterCriteria filters = new LogSseFilterCriteria();
        filters.setSeverityText("INFO");
        SseEmitter mockEmitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, filters, mockEmitter);

        LogEntry infoLog = createLogEntry("INFO", "An informational message");

        // When: An "INFO" log is broadcast
        logSseManager.broadcast(infoLog);

        // Then: The log should be sent to the client (wait for batch processing)
        await().atMost(2, TimeUnit.SECONDS).untilAsserted(() ->
            verify(mockEmitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class))
        );
    }

    @Test
    void shouldSendBatchOnVirtualThread() throws IOException, InterruptedException {
        SseEmitter mockEmitter = mock(SseEmitter.class);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        CountDownLatch latch = new CountDownLatch(1);
        subscribeClient(CLIENT_ID, null, mockEmitter);
        doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return null;
        }).when(mockEmitter).send(any(SseEmitter.SseEventBuilder.class));

        logSseManager.broadcast(createLogEntry("INFO", "virtual-thread-send"));

        assertTrue(latch.await(1, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void shouldNotBroadcastLogWhenFilterDoesNotMatch() throws IOException, InterruptedException {
        // Given: A client with a filter for "ERROR" logs
        LogSseFilterCriteria filters = new LogSseFilterCriteria();
        filters.setSeverityText("ERROR");
        SseEmitter mockEmitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, filters, mockEmitter);

        LogEntry infoLog = createLogEntry("INFO", "An informational message");

        // When: An "INFO" log is broadcast
        logSseManager.broadcast(infoLog);

        // Wait for batch processing
        Thread.sleep(300);

        // Then: The log should NOT be sent to the client
        verify(mockEmitter, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void shouldBroadcastLogWhenSubscriberHasNoFilters() throws IOException {
        // Given: A client subscribed with no filters (null)
        SseEmitter mockEmitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, null, mockEmitter);

        LogEntry anyLog = createLogEntry("DEBUG", "A debug message");

        // When: Any log is broadcast
        logSseManager.broadcast(anyLog);

        // Then: The log should be sent to the client (wait for batch processing)
        await().atMost(500, TimeUnit.MILLISECONDS).untilAsserted(() ->
            verify(mockEmitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class))
        );
    }

    @Test
    void shouldBroadcastOnlyToMatchingSubscribers() throws IOException, InterruptedException {
        // Given: Two clients with different filters
        LogSseFilterCriteria infoFilter = new LogSseFilterCriteria();
        infoFilter.setSeverityText("INFO");
        SseEmitter infoEmitter = mock(SseEmitter.class);
        subscribeClient(1L, infoFilter, infoEmitter);

        LogSseFilterCriteria errorFilter = new LogSseFilterCriteria();
        errorFilter.setSeverityText("ERROR");
        SseEmitter errorEmitter = mock(SseEmitter.class);
        subscribeClient(2L, errorFilter, errorEmitter);

        LogEntry infoLog = createLogEntry("INFO", "An informational message");

        // When: An "INFO" log is broadcast
        logSseManager.broadcast(infoLog);

        // Wait for batch processing
        await().atMost(500, TimeUnit.MILLISECONDS).untilAsserted(() ->
            verify(infoEmitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class))
        );

        // Then: The log is sent only to the client subscribed to "INFO" logs
        verify(errorEmitter, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void shouldBroadcastOnlyWithinSubscriberWorkspace() throws IOException, InterruptedException {
        LogSseFilterCriteria filters = new LogSseFilterCriteria();
        filters.setWorkspaceId("team-a");
        SseEmitter emitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, filters, emitter);

        logSseManager.broadcast(LogEntry.builder()
                .resource(Map.of("hertzbeat.workspace_id", "team-b"))
                .body("other workspace")
                .build());

        Thread.sleep(300);
        verify(emitter, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void shouldRemoveEmitterWhenBroadcastFails() throws IOException {
        // Given: A client whose emitter will throw an exception on send
        SseEmitter mockEmitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, null, mockEmitter);
        doAnswer(invocation -> {
            throw new IOException("Connection closed");
        }).when(mockEmitter).send(any(SseEmitter.SseEventBuilder.class));
        assertTrue(hasSubscriber(CLIENT_ID));

        LogEntry log = createLogEntry("ERROR", "An error occurred");

        // When: A log is broadcast, causing an exception
        logSseManager.broadcast(log);

        // Then: The failing emitter should be completed and removed
        await().atMost(500, TimeUnit.MILLISECONDS).untilAsserted(() -> {
            verify(mockEmitter).complete();
            assertFalse(hasSubscriber(CLIENT_ID));
        });
    }

    @Test
    void shouldDropLogsWhenQueueSizeLimitReached() {
        stopScheduler();
        subscribeClient(CLIENT_ID, new LogSseFilterCriteria(), mock(SseEmitter.class));
        for (int i = 0; i < 10_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "log-" + i));
        }

        assertEquals(10_000, logSseManager.getQueueSize());
        assertEquals(10_000, queuedEntryCount());
    }

    @Test
    void queueOverflowMustEmitOneContentFreeGapEventForTheBurst() throws Exception {
        stopScheduler();
        SseEmitter emitter = mock(SseEmitter.class);
        CountDownLatch gapSent = new CountDownLatch(1);
        AtomicInteger gapEvents = new AtomicInteger();
        doAnswer(invocation -> {
            SseEmitter.SseEventBuilder event = invocation.getArgument(0);
            event.build().stream()
                    .map(org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
                            .DataWithMediaType::getData)
                    .filter(LogSseManager.LogStreamGap.class::isInstance)
                    .map(LogSseManager.LogStreamGap.class::cast)
                    .forEach(gap -> {
                        assertEquals("queue_overflow", gap.reason());
                        assertTrue(gap.observedAt() > 0);
                        assertEquals(2L, recordLong(gap, "droppedCount"));
                        gapEvents.incrementAndGet();
                        gapSent.countDown();
                    });
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        subscribeClient(CLIENT_ID, null, emitter);
        for (int i = 0; i < 10_002; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "sensitive-body-" + i));
        }

        for (int batch = 1; batch <= 10; batch++) {
            invokeFlushBatch();
            int expectedEvents = batch == 10 ? 10_001 : batch * 1_000;
            await().atMost(2, TimeUnit.SECONDS).untilAsserted(() ->
                    verify(emitter, times(expectedEvents)).send(any(SseEmitter.SseEventBuilder.class)));
        }

        assertTrue(gapSent.await(2, TimeUnit.SECONDS));
        assertEquals(1, gapEvents.get());
        assertEquals(0, logSseManager.getQueueSize());
    }

    @Test
    void subscriberJoiningDuringOverflowMustOnlyCountLaterDroppedLogs() throws Exception {
        stopScheduler();
        SseEmitter existingEmitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, null, existingEmitter);
        for (int i = 0; i < 10_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "before-subscribe-" + i));
        }

        SseEmitter laterEmitter = mock(SseEmitter.class);
        List<LogSseManager.LogStreamGap> gaps = new CopyOnWriteArrayList<>();
        doAnswer(invocation -> {
            invocation.<SseEmitter.SseEventBuilder>getArgument(0).build().stream()
                    .map(org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
                            .DataWithMediaType::getData)
                    .filter(LogSseManager.LogStreamGap.class::isInstance)
                    .map(LogSseManager.LogStreamGap.class::cast)
                    .forEach(gaps::add);
            return null;
        }).when(laterEmitter).send(any(SseEmitter.SseEventBuilder.class));
        subscribeClient(CLIENT_ID + 1, null, laterEmitter);
        logSseManager.broadcast(createLogEntry("INFO", "after-subscribe"));

        for (int batch = 1; batch <= 10; batch++) {
            invokeFlushBatch();
            int expectedExistingEvents = batch == 10 ? 10_001 : batch * 1_000;
            await().atMost(2, TimeUnit.SECONDS).untilAsserted(() ->
                    verify(existingEmitter, times(expectedExistingEvents))
                            .send(any(SseEmitter.SseEventBuilder.class)));
        }

        await().atMost(2, TimeUnit.SECONDS).untilAsserted(() -> assertEquals(1, gaps.size()));
        assertEquals(1L, gaps.get(0).droppedCount());
    }

    @Test
    void subscriberJoiningAfterAnOverflowEpisodeMustNotReceiveItsHistoricalGap() throws Exception {
        stopScheduler();
        SseEmitter existingEmitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, null, existingEmitter);
        for (int i = 0; i < 10_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "before-subscribe-" + i));
        }

        SseEmitter laterEmitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID + 1, null, laterEmitter);
        for (int batch = 1; batch <= 10; batch++) {
            invokeFlushBatch();
            int expectedExistingEvents = batch == 10 ? 10_001 : batch * 1_000;
            await().atMost(2, TimeUnit.SECONDS).untilAsserted(() ->
                    verify(existingEmitter, times(expectedExistingEvents))
                            .send(any(SseEmitter.SseEventBuilder.class)));
        }

        verify(laterEmitter, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void releasedOverflowCapacityMustAcceptNewLogsBehindTheGapMarker() throws Exception {
        stopScheduler();
        subscribeClient(CLIENT_ID, null, mock(SseEmitter.class));
        for (int i = 0; i < 10_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "overflow-" + i));
        }

        invokeFlushBatch();
        logSseManager.broadcast(createLogEntry("INFO", "accepted-after-release"));

        assertEquals(9_001, logSseManager.getQueueSize());
        assertEquals(9_002, queuedEntryCount());
        assertFalse(hasPendingGap());
    }

    @Test
    void multipleOverflowMarkersMustRemainOrderedAndCountOnlyDroppedRecords() throws Exception {
        stopScheduler();
        SseEmitter emitter = mock(SseEmitter.class);
        List<Long> eventIds = new CopyOnWriteArrayList<>();
        List<Object> sentData = new CopyOnWriteArrayList<>();
        doAnswer(invocation -> {
            captureEvent(invocation.getArgument(0), eventIds, sentData);
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        subscribeClient(CLIENT_ID, null, emitter);
        for (int i = 0; i < 10_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "first-overflow-" + i));
        }
        invokeFlushBatch();
        await().atMost(2, TimeUnit.SECONDS).until(() -> sentData.size() == 1_000);
        for (int i = 0; i < 1_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "second-overflow-" + i));
        }

        for (int batch = 0; batch < 12 && (queuedEntryCount() > 0 || hasPendingGap()); batch++) {
            invokeFlushBatch();
            awaitSubscriberSenderIdle(CLIENT_ID);
        }

        assertEquals(11_002, sentData.size());
        List<LogSseManager.LogStreamGap> gaps = sentData.stream()
                .filter(LogSseManager.LogStreamGap.class::isInstance)
                .map(LogSseManager.LogStreamGap.class::cast)
                .toList();
        assertEquals(2, gaps.size());
        assertEquals(1L, recordLong(gaps.get(0), "droppedCount"));
        assertEquals(1L, recordLong(gaps.get(1), "droppedCount"));
        assertEquals(List.of(10_001L, 11_002L), eventIds.stream()
                .filter(id -> id == 10_001L || id == 11_002L)
                .toList());
        for (int index = 1; index < eventIds.size(); index++) {
            assertTrue(eventIds.get(index) > eventIds.get(index - 1));
        }
        assertEquals(0, queuedEntryCount());
        assertFalse(hasPendingGap());
    }

    @Test
    void matchingLogsAndOverflowGapMustShareOneOrderedDispatch() throws Exception {
        stopScheduler();
        SseEmitter emitter = mock(SseEmitter.class);
        CountDownLatch heartbeatSendStarted = new CountDownLatch(1);
        CountDownLatch releaseHeartbeatSend = new CountDownLatch(1);
        List<Object> sentData = new CopyOnWriteArrayList<>();
        AtomicBoolean blockNextSend = new AtomicBoolean(false);
        doAnswer(invocation -> {
            SseEmitter.SseEventBuilder event = invocation.getArgument(0);
            event.build().stream()
                    .map(org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
                            .DataWithMediaType::getData)
                    .filter(data -> data instanceof LogEntry || data instanceof LogSseManager.LogStreamGap)
                    .forEach(sentData::add);
            if (blockNextSend.compareAndSet(true, false)) {
                heartbeatSendStarted.countDown();
                releaseHeartbeatSend.await(2, TimeUnit.SECONDS);
            }
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        subscribeClient(CLIENT_ID, null, emitter);
        for (int i = 0; i < 10_002; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "overflow-" + i));
        }
        for (int batch = 1; batch <= 9; batch++) {
            invokeFlushBatch();
            int expectedEvents = batch * 1_000;
            await().atMost(2, TimeUnit.SECONDS).until(() -> sentData.size() == expectedEvents);
        }
        blockNextSend.set(true);
        invokeHeartbeats();
        assertTrue(heartbeatSendStarted.await(1, TimeUnit.SECONDS));

        invokeFlushBatch();

        try {
            assertTrue(hasSubscriber(CLIENT_ID));
            releaseHeartbeatSend.countDown();
            await().atMost(2, TimeUnit.SECONDS).untilAsserted(() -> {
                assertTrue(hasSubscriber(CLIENT_ID));
                assertEquals(10_001, sentData.size());
                assertTrue(sentData.subList(0, sentData.size() - 1).stream()
                        .allMatch(LogEntry.class::isInstance));
                assertTrue(sentData.getLast() instanceof LogSseManager.LogStreamGap);
            });
        } finally {
            releaseHeartbeatSend.countDown();
        }
    }

    @Test
    void overflowGapMustFollowEveryOlderQueuedLogWithoutEventIdRegression() throws Exception {
        stopScheduler();
        SseEmitter emitter = mock(SseEmitter.class);
        List<Long> eventIds = new CopyOnWriteArrayList<>();
        List<Object> sentData = new CopyOnWriteArrayList<>();
        doAnswer(invocation -> {
            SseEmitter.SseEventBuilder event = invocation.getArgument(0);
            event.build().forEach(item -> {
                Object data = item.getData();
                if (data instanceof String text && text.startsWith("id:")) {
                    int lineEnd = text.indexOf('\n');
                    eventIds.add(Long.parseLong(text.substring(3, lineEnd).trim()));
                } else if (data instanceof LogEntry || data instanceof LogSseManager.LogStreamGap) {
                    sentData.add(data);
                }
            });
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        subscribeClient(CLIENT_ID, null, emitter);
        for (int i = 0; i < 10_002; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "overflow-" + i));
        }

        for (int batch = 1; batch <= 10; batch++) {
            invokeFlushBatch();
            int expectedEvents = batch == 10 ? 10_001 : batch * 1_000;
            await().atMost(2, TimeUnit.SECONDS).until(() -> sentData.size() == expectedEvents);
        }

        assertEquals(10_001, sentData.size());
        assertTrue(sentData.subList(0, 10_000).stream().allMatch(LogEntry.class::isInstance));
        assertTrue(sentData.getLast() instanceof LogSseManager.LogStreamGap);
        assertEquals(10_002L, eventIds.getLast());
        for (int index = 1; index < eventIds.size(); index++) {
            assertTrue(eventIds.get(index) > eventIds.get(index - 1));
        }
    }

    @Test
    void subscriberRegisteredDuringLossMustReceiveGapForLaterDrop() throws Exception {
        stopScheduler();
        subscribeClient(1L, null, mock(SseEmitter.class));
        for (int i = 0; i < 10_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "before-registration-" + i));
        }
        SseEmitter laterSubscriber = mock(SseEmitter.class);
        List<Object> sentData = new CopyOnWriteArrayList<>();
        doAnswer(invocation -> {
            invocation.<SseEmitter.SseEventBuilder>getArgument(0).build().stream()
                    .map(org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
                            .DataWithMediaType::getData)
                    .filter(data -> data instanceof LogEntry || data instanceof LogSseManager.LogStreamGap)
                    .forEach(sentData::add);
            return null;
        }).when(laterSubscriber).send(any(SseEmitter.SseEventBuilder.class));
        subscribeClient(2L, null, laterSubscriber);
        logSseManager.broadcast(createLogEntry("INFO", "after-registration-drop"));

        for (int batch = 0; batch < 10; batch++) {
            invokeFlushBatch();
            Thread.sleep(20);
        }

        await().atMost(2, TimeUnit.SECONDS).untilAsserted(() -> {
            assertEquals(1, sentData.size());
            assertTrue(sentData.getFirst() instanceof LogSseManager.LogStreamGap);
        });
    }

    @Test
    void subscriberRegisteredAfterPendingLossMustNotReceiveHistoricalGap() throws Exception {
        stopScheduler();
        subscribeClient(1L, null, mock(SseEmitter.class));
        for (int i = 0; i < 10_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "historical-" + i));
        }
        SseEmitter laterSubscriber = mock(SseEmitter.class);
        subscribeClient(2L, null, laterSubscriber);

        for (int batch = 0; batch < 10; batch++) {
            invokeFlushBatch();
            Thread.sleep(20);
        }

        Thread.sleep(100);
        verify(laterSubscriber, never()).send(any(SseEmitter.SseEventBuilder.class));
        assertTrue(hasSubscriber(2L));
    }

    @Test
    void subscriptionMustUseImmutableCompiledFilterSnapshot() throws Exception {
        LogSseFilterCriteria filters = new LogSseFilterCriteria();
        filters.setSeverityText("INFO");
        SseEmitter emitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, filters, emitter);
        filters.setSeverityText("ERROR");

        logSseManager.broadcast(createLogEntry("INFO", "snapshot-match"));
        invokeFlushBatch();

        await().atMost(1, TimeUnit.SECONDS).untilAsserted(() ->
                verify(emitter).send(any(SseEmitter.SseEventBuilder.class)));
    }

    @Test
    void matcherFailureMustRetireOnlyTheAffectedSubscriber() throws Exception {
        LogSseFilterCriteria failingFilter = new LogSseFilterCriteria();
        failingFilter.setResourceFilter("failure.key=value");
        SseEmitter failingEmitter = mock(SseEmitter.class);
        subscribeClient(1L, failingFilter, failingEmitter);
        SseEmitter healthyEmitter = mock(SseEmitter.class);
        subscribeClient(2L, null, healthyEmitter);
        Map<String, Object> resource = new HashMap<>();
        resource.put("hertzbeat_workspace_id", "default");
        Map<String, Object> throwingResource = new HashMap<>(resource) {
            @Override
            public Object get(Object key) {
                if ("failure.key".equals(key) || "failure_key".equals(key)) {
                    throw new IllegalStateException("matcher failure");
                }
                return super.get(key);
            }
        };

        logSseManager.broadcast(LogEntry.builder().resource(throwingResource).body("safe").build());
        invokeFlushBatch();

        await().atMost(1, TimeUnit.SECONDS).untilAsserted(() -> {
            assertFalse(hasSubscriber(1L));
            verify(failingEmitter).complete();
            verify(healthyEmitter).send(any(SseEmitter.SseEventBuilder.class));
            assertTrue(hasSubscriber(2L));
        });
    }

    @Test
    void failedHeartbeatMustRetireSilentSubscriber() throws Exception {
        stopScheduler();
        SseEmitter emitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, null, emitter);
        doAnswer(invocation -> {
            throw new IOException("silent disconnect");
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));

        invokeHeartbeats();

        await().atMost(1, TimeUnit.SECONDS).untilAsserted(() -> {
            assertFalse(hasSubscriber(CLIENT_ID));
            verify(emitter).complete();
        });
    }

    @Test
    void shutdownMustBoundAndTerminateSubscriberSenders() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, null, emitter);
        ExecutorService sender = subscriberSender(CLIENT_ID);

        logSseManager.shutdown();

        assertTrue(sender.awaitTermination(1, TimeUnit.SECONDS));
        assertFalse(hasSubscriber(CLIENT_ID));
        verify(emitter).complete();
    }

    @Test
    void shutdownMustCompleteEmitterBeforeInterruptingAndAwaitingBlockedWrite() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        CountDownLatch sendStarted = new CountDownLatch(1);
        CountDownLatch emitterCompleted = new CountDownLatch(1);
        doAnswer(invocation -> {
            emitterCompleted.countDown();
            return null;
        }).when(emitter).complete();
        subscribeClient(CLIENT_ID, null, emitter);
        doAnswer(invocation -> {
            sendStarted.countDown();
            while (!emitterCompleted.await(50, TimeUnit.MILLISECONDS)) {
                // The real response write is released by emitter completion, not executor interruption.
            }
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        ExecutorService sender = subscriberSender(CLIENT_ID);
        logSseManager.broadcast(createLogEntry("INFO", "blocked-write"));
        invokeFlushBatch();
        assertTrue(sendStarted.await(1, TimeUnit.SECONDS));

        long startedAt = System.nanoTime();
        logSseManager.shutdown();
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);

        assertTrue(elapsedMillis < 1_000);
        assertTrue(sender.awaitTermination(1, TimeUnit.SECONDS));
        verify(emitter).complete();
    }

    @Test
    void shouldNotQueueOrReplayLogsBroadcastWithoutSubscribers() throws IOException {
        logSseManager.broadcast(createLogEntry("INFO", "before-subscribe"));

        assertEquals(0, logSseManager.getQueueSize());
        assertEquals(0, queuedEntryCount());

        SseEmitter emitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, null, emitter);
        logSseManager.broadcast(createLogEntry("INFO", "after-subscribe"));

        await().atMost(1, TimeUnit.SECONDS).untilAsserted(() ->
                verify(emitter, times(1)).send(any(SseEmitter.SseEventBuilder.class)));
    }

    @Test
    void newSubscriberMustNotReceiveQueuedLogsFromBeforeRegistration() throws Exception {
        SseEmitter existingEmitter = mock(SseEmitter.class);
        subscribeClient(1L, null, existingEmitter);
        logSseManager.broadcast(createLogEntry("INFO", "before-second-subscription"));

        SseEmitter newEmitter = mock(SseEmitter.class);
        subscribeClient(2L, null, newEmitter);
        logSseManager.broadcast(createLogEntry("INFO", "after-second-subscription"));
        invokeFlushBatch();

        await().atMost(1, TimeUnit.SECONDS).untilAsserted(() ->
                verify(newEmitter, times(1)).send(any(SseEmitter.SseEventBuilder.class)));
    }

    @Test
    void shouldSerializeBatchesForEachSubscriber() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        CountDownLatch firstSendStarted = new CountDownLatch(1);
        CountDownLatch releaseFirstSend = new CountDownLatch(1);
        AtomicInteger activeSends = new AtomicInteger();
        AtomicInteger maximumConcurrentSends = new AtomicInteger();
        subscribeClient(CLIENT_ID, null, emitter);
        doAnswer(invocation -> {
            int active = activeSends.incrementAndGet();
            maximumConcurrentSends.accumulateAndGet(active, Math::max);
            firstSendStarted.countDown();
            try {
                releaseFirstSend.await(1, TimeUnit.SECONDS);
            } finally {
                activeSends.decrementAndGet();
            }
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        for (int i = 0; i < 1_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "log-" + i));
        }

        invokeFlushBatch();
        assertTrue(firstSendStarted.await(1, TimeUnit.SECONDS));
        invokeFlushBatch();
        Thread.sleep(100);

        try {
            assertEquals(1, maximumConcurrentSends.get());
        } finally {
            releaseFirstSend.countDown();
        }
    }

    @Test
    void failedReplacedEmitterMustNotRemoveCurrentSubscription() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(LogSseManager.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        SseEmitter replacedEmitter = mock(SseEmitter.class);
        CountDownLatch sendStarted = new CountDownLatch(1);
        CountDownLatch releaseSend = new CountDownLatch(1);
        subscribeClient(CLIENT_ID, null, replacedEmitter);
        doAnswer(invocation -> {
            sendStarted.countDown();
            releaseSend.await(1, TimeUnit.SECONDS);
            throw new IOException("Authorization: Bearer secret telemetry-body");
        }).when(replacedEmitter).send(any(SseEmitter.SseEventBuilder.class));
        logSseManager.broadcast(createLogEntry("ERROR", "Token=secret telemetry-body"));
        invokeFlushBatch();
        assertTrue(sendStarted.await(1, TimeUnit.SECONDS));

        SseEmitter currentEmitter = mock(SseEmitter.class);
        subscribeClient(CLIENT_ID, null, currentEmitter);
        releaseSend.countDown();

        await().atMost(1, TimeUnit.SECONDS).untilAsserted(() -> {
            verify(replacedEmitter).complete();
            assertSame(currentEmitter, subscriberEmitter(CLIENT_ID));
        });
        try {
            assertTrue(appender.list.stream().noneMatch(event ->
                    event.getFormattedMessage().contains("Authorization")
                            || event.getFormattedMessage().contains("Bearer")
                            || event.getFormattedMessage().contains("secret")
                            || event.getFormattedMessage().contains("telemetry-body")));
            assertTrue(appender.list.stream().allMatch(event -> event.getThrowableProxy() == null));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void slowSubscriberBacklogMustBeBoundedAndRejectedSubscriberRemoved() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        CountDownLatch firstSendStarted = new CountDownLatch(1);
        CountDownLatch releaseFirstSend = new CountDownLatch(1);
        subscribeClient(CLIENT_ID, null, emitter);
        doAnswer(invocation -> {
            firstSendStarted.countDown();
            releaseFirstSend.await(2, TimeUnit.SECONDS);
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        for (int i = 0; i < 2_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "log-" + i));
        }

        invokeFlushBatch();
        assertTrue(firstSendStarted.await(1, TimeUnit.SECONDS));
        invokeFlushBatch();
        invokeFlushBatch();

        try {
            await().atMost(1, TimeUnit.SECONDS).untilAsserted(() -> {
                verify(emitter).complete();
                assertFalse(hasSubscriber(CLIENT_ID));
                assertEquals(0, logSseManager.getQueueSize());
                assertEquals(0, queuedEntryCount());
            });
        } finally {
            releaseFirstSend.countDown();
        }
    }

    @Test
    void subscriberMustBeRetiredWhenGapCannotEnterBoundedSender() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        CountDownLatch firstSendStarted = new CountDownLatch(1);
        CountDownLatch releaseFirstSend = new CountDownLatch(1);
        subscribeClient(CLIENT_ID, null, emitter);
        doAnswer(invocation -> {
            firstSendStarted.countDown();
            releaseFirstSend.await(2, TimeUnit.SECONDS);
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        for (int i = 0; i < 1_001; i++) {
            logSseManager.broadcast(createLogEntry("INFO", "log-" + i));
        }
        invokeFlushBatch();
        assertTrue(firstSendStarted.await(1, TimeUnit.SECONDS));
        invokeFlushBatch();

        invokeGapSubmission(CLIENT_ID, subscriber(CLIENT_ID));

        try {
            await().atMost(1, TimeUnit.SECONDS).untilAsserted(() -> {
                verify(emitter).complete();
                assertFalse(hasSubscriber(CLIENT_ID));
            });
        } finally {
            releaseFirstSend.countDown();
        }
    }

    /**
     * Helper method to create a subscriber and inject a mock emitter for testing
     */
    private void subscribeClient(Long clientId, LogSseFilterCriteria filters, SseEmitter mockEmitter) {
        if (filters == null) {
            filters = defaultWorkspaceCriteria();
        } else if (filters.getWorkspaceId() == null) {
            filters.setWorkspaceId("default");
        }
        logSseManager.createEmitter(clientId, filters, mockEmitter);
        clearInvocations(mockEmitter);
    }

    private LogSseFilterCriteria defaultWorkspaceCriteria() {
        LogSseFilterCriteria criteria = new LogSseFilterCriteria();
        criteria.setWorkspaceId("default");
        return criteria;
    }

    /**
     * Helper method to create LogEntry instances
     */
    private LogEntry createLogEntry(String severityText, String body) {
        return LogEntry.builder()
                .severityText(severityText)
                .body(body)
                .resource(Map.of("hertzbeat.workspace_id", "default"))
                .build();
    }

    private void invokeFlushBatch() throws NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        Method flushBatch = LogSseManager.class.getDeclaredMethod("flushBatch");
        flushBatch.setAccessible(true);
        flushBatch.invoke(logSseManager);
    }

    private void invokeGapSubmission(Long clientId, Object subscriber)
            throws NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        Method submitGap = LogSseManager.class.getDeclaredMethod(
                "submitToSubscriber",
                Long.class,
                subscriber.getClass(),
                List.class);
        submitGap.setAccessible(true);
        submitGap.invoke(logSseManager, clientId, subscriber,
                List.of(new LogSseManager.QueuedGap(10_001, 10_002, System.currentTimeMillis())));
    }

    private void invokeHeartbeats()
            throws NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        Method sendHeartbeats = LogSseManager.class.getDeclaredMethod("sendHeartbeats");
        sendHeartbeats.setAccessible(true);
        sendHeartbeats.invoke(logSseManager);
    }

    private Object readPrivateField(String fieldName) throws ReflectiveOperationException {
        java.lang.reflect.Field field = LogSseManager.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        return field.get(logSseManager);
    }

    @SuppressWarnings("unchecked")
    private Map<Long, Object> subscribers() {
        try {
            return (Map<Long, Object>) readPrivateField("emitters");
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    private Object subscriber(Long clientId) {
        return subscribers().get(clientId);
    }

    private boolean hasSubscriber(Long clientId) {
        return subscribers().containsKey(clientId);
    }

    private SseEmitter subscriberEmitter(Long clientId) {
        try {
            Object subscriber = subscriber(clientId);
            java.lang.reflect.Field emitter = subscriber.getClass().getDeclaredField("emitter");
            emitter.setAccessible(true);
            return (SseEmitter) emitter.get(subscriber);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    private ExecutorService subscriberSender(Long clientId) {
        try {
            Object subscriber = subscriber(clientId);
            java.lang.reflect.Field sender = subscriber.getClass().getDeclaredField("sender");
            sender.setAccessible(true);
            return (ExecutorService) sender.get(subscriber);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    private void awaitSubscriberSenderIdle(Long clientId) {
        ThreadPoolExecutor sender = (ThreadPoolExecutor) subscriberSender(clientId);
        await().atMost(2, TimeUnit.SECONDS)
                .until(() -> sender.getActiveCount() == 0 && sender.getQueue().isEmpty());
    }

    private int queuedEntryCount() {
        try {
            return ((Queue<?>) readPrivateField("logQueue")).size();
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    private boolean hasPendingGap() {
        try {
            return ((java.util.concurrent.atomic.AtomicReference<?>) readPrivateField("pendingGap")).get() != null;
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    private long recordLong(Object record, String accessor) {
        try {
            Method method = record.getClass().getDeclaredMethod(accessor);
            method.setAccessible(true);
            return ((Number) method.invoke(record)).longValue();
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    private void captureEvent(
            SseEmitter.SseEventBuilder event, List<Long> eventIds, List<Object> sentData) {
        event.build().forEach(item -> {
            Object data = item.getData();
            if (data instanceof String text && text.startsWith("id:")) {
                int lineEnd = text.indexOf('\n');
                eventIds.add(Long.parseLong(text.substring(3, lineEnd).trim()));
            } else if (data instanceof LogEntry || data instanceof LogSseManager.LogStreamGap) {
                sentData.add(data);
            }
        });
    }

    private void stopScheduler() {
        try {
            ((ScheduledExecutorService) readPrivateField("scheduler")).shutdownNow();
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
