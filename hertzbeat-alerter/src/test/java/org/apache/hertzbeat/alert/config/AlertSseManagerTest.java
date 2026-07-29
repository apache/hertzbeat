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

package org.apache.hertzbeat.alert.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Alert SSE delivery and reconnection contract tests.
 */
class AlertSseManagerTest {

    @Test
    void newSubscriberReceivesImmediateReconnectContract() {
        RecordingSseEmitter emitter = new RecordingSseEmitter();
        AlertSseManager manager = new AlertSseManager(() -> emitter);

        assertEquals(emitter, manager.createEmitter(1L));
        assertEquals(1, emitter.events.size());
        String event = eventText(emitter.events.get(0));
        assertTrue(event.contains("event:ALERT_STREAM_READY"));
        assertTrue(event.contains("retry:3000"));
        assertTrue(event.contains("data:{}"));
    }

    @Test
    void broadcastDeliversNamedEventsWithDistinctIds() {
        RecordingSseEmitter emitter = new RecordingSseEmitter();
        AlertSseManager manager = new AlertSseManager(() -> emitter);
        manager.createEmitter(1L);

        manager.broadcast("{\"id\":7,\"status\":\"firing\"}");
        manager.broadcast("{\"id\":7,\"status\":\"acknowledged\"}");

        assertEquals(3, emitter.events.size());
        String first = eventText(emitter.events.get(1));
        String second = eventText(emitter.events.get(2));
        assertTrue(first.contains("event:ALERT_EVENT"));
        assertTrue(first.contains("{\"id\":7,\"status\":\"firing\"}"));
        assertTrue(second.contains("event:ALERT_EVENT"));
        assertTrue(second.contains("{\"id\":7,\"status\":\"acknowledged\"}"));
        assertNotEquals(eventId(first), eventId(second));
    }

    @Test
    void groupMutationUsesExplicitEventNameAndSharedLogicalEventId() {
        RecordingSseEmitter firstEmitter = new RecordingSseEmitter();
        RecordingSseEmitter secondEmitter = new RecordingSseEmitter();
        Queue<RecordingSseEmitter> emitters = new ArrayDeque<>(List.of(firstEmitter, secondEmitter));
        AlertSseManager manager = new AlertSseManager(emitters::remove);
        manager.createEmitter(1L);
        manager.createEmitter(2L);

        manager.broadcastGroupMutation("{\"id\":7,\"mutation\":\"GROUP_DELETED\"}");

        String first = eventText(firstEmitter.events.get(1));
        String second = eventText(secondEmitter.events.get(1));
        assertTrue(first.contains("event:ALERT_GROUP_MUTATION"));
        assertTrue(second.contains("event:ALERT_GROUP_MUTATION"));
        assertEquals(eventId(first), eventId(second));
    }

    @Test
    void failedConnectionCanReconnectAndReceiveLaterAlerts() {
        RecordingSseEmitter failedEmitter = new RecordingSseEmitter();
        RecordingSseEmitter reconnectedEmitter = new RecordingSseEmitter();
        AtomicReference<RecordingSseEmitter> current = new AtomicReference<>(failedEmitter);
        AlertSseManager manager = new AlertSseManager(current::get);
        manager.createEmitter(1L);
        failedEmitter.failSends = true;

        manager.broadcast("{\"id\":7,\"status\":\"firing\"}");

        assertTrue(failedEmitter.completed);
        current.set(reconnectedEmitter);
        manager.createEmitter(1L);
        manager.broadcast("{\"id\":7,\"status\":\"resolved\"}");

        assertEquals(2, reconnectedEmitter.events.size());
        assertTrue(eventText(reconnectedEmitter.events.get(1)).contains("\"status\":\"resolved\""));
    }

    @Test
    void replacedConnectionCannotRemoveNewSameClientOwner() {
        RecordingSseEmitter oldEmitter = new RecordingSseEmitter();
        RecordingSseEmitter newEmitter = new RecordingSseEmitter();
        Queue<RecordingSseEmitter> emitters = new ArrayDeque<>(List.of(oldEmitter, newEmitter));
        AlertSseManager manager = new AlertSseManager(emitters::remove);

        manager.createEmitter(1L);
        manager.createEmitter(1L);
        oldEmitter.signalCompletion();
        manager.broadcast("{\"id\":7,\"status\":\"resolved\"}");

        assertTrue(oldEmitter.completed);
        assertEquals(2, newEmitter.events.size());
        assertTrue(eventText(newEmitter.events.get(1)).contains("\"status\":\"resolved\""));
    }

    @Test
    void unexpectedSendFailureDoesNotLogExceptionOrAlertBody() {
        String privateDetail = "private-exception-and-alert-body";
        RecordingSseEmitter emitter = new RecordingSseEmitter();
        AlertSseManager manager = new AlertSseManager(() -> emitter);
        Logger logger = (Logger) LoggerFactory.getLogger(AlertSseManager.class);
        Level originalLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            manager.createEmitter(1L);
            emitter.runtimeFailure = new UnsupportedOperationException(privateDetail);
            emitter.completeFailure = new IllegalArgumentException(privateDetail);

            manager.broadcast("{\"content\":\"" + privateDetail + "\"}");

            String logs = appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .reduce("", String::concat);
            assertFalse(logs.contains(privateDetail));
            assertTrue(logs.contains(UnsupportedOperationException.class.getSimpleName()));
            assertTrue(logs.contains(IllegalArgumentException.class.getSimpleName()));
        } finally {
            logger.setLevel(originalLevel);
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void closesActiveEmittersAndRejectsLateSubscribersDuringShutdown() {
        RecordingSseEmitter activeEmitter = new RecordingSseEmitter();
        RecordingSseEmitter lateEmitter = new RecordingSseEmitter();
        Queue<RecordingSseEmitter> emitters = new ArrayDeque<>(List.of(activeEmitter, lateEmitter));
        AlertSseManager manager = new AlertSseManager(emitters::remove);
        manager.createEmitter(1L);

        manager.onApplicationEvent(new ContextClosedEvent(mock(ConfigurableApplicationContext.class)));
        manager.createEmitter(2L);
        manager.broadcast("{\"id\":7,\"status\":\"resolved\"}");

        assertTrue(activeEmitter.completed);
        assertTrue(lateEmitter.completed);
        assertEquals(1, activeEmitter.events.size());
        assertTrue(lateEmitter.events.isEmpty());
    }

    private static String eventText(SseEmitter.SseEventBuilder event) {
        StringBuilder text = new StringBuilder();
        event.build().forEach(part -> text.append(part.getData()));
        return text.toString();
    }

    private static String eventId(String event) {
        return event.lines()
                .filter(line -> line.startsWith("id:"))
                .findFirst()
                .orElseThrow();
    }

    private static final class RecordingSseEmitter extends SseEmitter {

        private final List<SseEventBuilder> events = new ArrayList<>();
        private boolean failSends;
        private boolean completed;
        private RuntimeException runtimeFailure;
        private RuntimeException completeFailure;
        private Runnable completionCallback;

        @Override
        public void send(SseEventBuilder builder) throws IOException {
            if (runtimeFailure != null) {
                throw runtimeFailure;
            }
            if (failSends) {
                throw new IOException("private alert payload");
            }
            events.add(builder);
        }

        @Override
        public void complete() {
            if (completeFailure != null) {
                throw completeFailure;
            }
            completed = true;
        }

        @Override
        public void onCompletion(Runnable callback) {
            completionCallback = callback;
        }

        private void signalCompletion() {
            completionCallback.run();
        }
    }
}
