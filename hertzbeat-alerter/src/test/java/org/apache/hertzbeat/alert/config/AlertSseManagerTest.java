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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

/**
 * alert sse manager test
 */
public class AlertSseManagerTest {

    private AlertSseManager alertSseManager;

    @BeforeEach
    void setUp() {
        alertSseManager = new AlertSseManager();
    }

    @Test
    void testCompleteThrowsException() throws Exception {
        SseEmitter emitter = alertSseManager.createEmitter(1L);
        assertNotNull(emitter);

        Map<Long, SseEmitter> emitters = new HashMap<>();
        SseEmitter spyEmitter = mock(SseEmitter.class);
        
        doThrow(new IllegalStateException("Simulated output stream error")).when(spyEmitter).send(any(SseEmitter.SseEventBuilder.class));
        doThrow(new RuntimeException("Complete failed")).when(spyEmitter).complete();
        
        emitters.put(1L, spyEmitter);

        Field emittersField = AlertSseManager.class.getDeclaredField("emitters");
        emittersField.setAccessible(true);
        emittersField.set(alertSseManager, emitters);

        assertThrows(RuntimeException.class, () -> alertSseManager.broadcast("{\"id\":1,\"content\":\"Test alert\"}"));
        Map<Long, SseEmitter> currentEmitters = (Map<Long, SseEmitter>) emittersField.get(alertSseManager);
        assertFalse(currentEmitters.containsKey(1L), "Emitter should still exist because complete() threw exception");
    }

    /**
     * An unbounded emitter never expires on its own, so a client that goes away without
     * closing cleanly keeps holding its request thread until the container notices.
     */
    @Test
    void testSubscriptionsAreGivenFiniteTimeout() {
        SseEmitter emitter = alertSseManager.createEmitter(1L);

        assertNotNull(emitter.getTimeout());
        assertTrue(emitter.getTimeout() > 0 && emitter.getTimeout() < Long.MAX_VALUE,
                "timeout must be finite, was " + emitter.getTimeout());
    }

    /**
     * Each open subscription occupies a request thread, so enough of them in parallel
     * exhaust the container's pool and take the whole application down.
     */
    @Test
    void testSubscriptionsBeyondLimitAreRefused() {
        alertSseManager.setMaxEmitters(2);

        alertSseManager.createEmitter(1L);
        alertSseManager.createEmitter(2L);
        ResponseStatusException thrown =
                assertThrows(ResponseStatusException.class, () -> alertSseManager.createEmitter(3L));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, thrown.getStatusCode());
        assertEquals(2, alertSseManager.subscriptionCount());
    }

    /**
     * The cap must not become a permanent lockout: once a dead subscription is cleaned up,
     * its slot has to be available again.
     */
    @Test
    void testDroppedSubscriptionFreesItsSlot() throws Exception {
        alertSseManager.setMaxEmitters(1);
        alertSseManager.createEmitter(1L);
        assertThrows(ResponseStatusException.class, () -> alertSseManager.createEmitter(2L));

        // a client that went away makes the next send fail, which is how the manager notices
        SseEmitter deadEmitter = mock(SseEmitter.class);
        doThrow(new IllegalStateException("client gone")).when(deadEmitter).send(any(SseEmitter.SseEventBuilder.class));
        Field emittersField = AlertSseManager.class.getDeclaredField("emitters");
        emittersField.setAccessible(true);
        ((Map<Long, SseEmitter>) emittersField.get(alertSseManager)).put(1L, deadEmitter);

        alertSseManager.broadcast("{\"id\":1}");

        assertEquals(0, alertSseManager.subscriptionCount());
        assertNotNull(alertSseManager.createEmitter(2L));
    }
}