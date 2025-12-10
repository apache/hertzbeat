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

package org.apache.hertzbeat.log.notice;

import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
        SseEmitter emitter = logSseManager.createEmitter(CLIENT_ID, new LogSseFilterCriteria());

        // Then: The emitter should be created and stored
        assertNotNull(emitter);
        assertEquals(Long.MAX_VALUE, emitter.getTimeout());
        assertTrue(logSseManager.getEmitters().containsKey(CLIENT_ID));
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
        await().atMost(500, TimeUnit.MILLISECONDS).untilAsserted(() -> 
            verify(mockEmitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class))
        );
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
    void shouldRemoveEmitterWhenBroadcastFails() throws IOException {
        // Given: A client whose emitter will throw an exception on send
        SseEmitter mockEmitter = mock(SseEmitter.class);
        doThrow(new IOException("Connection closed")).when(mockEmitter).send(any(SseEmitter.SseEventBuilder.class));
        subscribeClient(CLIENT_ID, null, mockEmitter);
        assertTrue(logSseManager.getEmitters().containsKey(CLIENT_ID));

        LogEntry log = createLogEntry("ERROR", "An error occurred");

        // When: A log is broadcast, causing an exception
        logSseManager.broadcast(log);

        // Then: The failing emitter should be completed and removed
        await().atMost(500, TimeUnit.MILLISECONDS).untilAsserted(() -> {
            verify(mockEmitter).complete();
            assertFalse(logSseManager.getEmitters().containsKey(CLIENT_ID));
        });
    }

    /**
     * Helper method to create a subscriber and inject a mock emitter for testing
     */
    private void subscribeClient(Long clientId, LogSseFilterCriteria filters, SseEmitter mockEmitter) {
        logSseManager.createEmitter(clientId, filters);
        LogSseManager.SseSubscriber subscriber = logSseManager.getEmitters().get(clientId);
        subscriber.setEmitter(mockEmitter);
    }

    /**
     * Helper method to create LogEntry instances
     */
    private LogEntry createLogEntry(String severityText, String body) {
        return LogEntry.builder()
                .severityText(severityText)
                .body(body)
                .build();
    }
}