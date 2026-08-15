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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import java.lang.reflect.Field;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.support.SseEmitterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Test case for {@link AlertSseManager}.
 *
 * <p>Note: how a subscription is bounded and cleaned up is covered by
 * {@code SseEmitterRegistryTest}; what is left here is what makes this stream the alert one.
 */
class AlertSseManagerTest {

    private AlertSseManager alertSseManager;

    @BeforeEach
    void setUp() {
        alertSseManager = new AlertSseManager();
    }

    /**
     * The ui subscribes by event name, so an alert delivered under any other name reaches
     * nobody even though the connection is up.
     */
    @Test
    void testAlertsAreDeliveredUnderTheAlertEventName() throws Exception {
        alertSseManager.createEmitter(1L);
        final SseEmitter subscriber = mock(SseEmitter.class);
        emitters().put(1L, subscriber);

        alertSseManager.broadcast("{\"id\":1}");

        final ArgumentCaptor<SseEmitter.SseEventBuilder> event =
                ArgumentCaptor.forClass(SseEmitter.SseEventBuilder.class);
        verify(subscriber).send(event.capture());
        final String rendered = event.getValue().build().stream()
                .map(part -> String.valueOf(part.getData()))
                .collect(Collectors.joining());
        assertTrue(rendered.contains("event:ALERT_EVENT"), "alerts must be delivered as ALERT_EVENT, was " + rendered);
        assertTrue(rendered.contains("{\"id\":1}"), "the alert payload must be delivered as is, was " + rendered);
    }

    /**
     * The manager has to hand its subscriptions to a registry rather than hold them itself,
     * otherwise none of the bounds that registry enforces apply to this stream.
     */
    @Test
    void testSubscriptionsAreBoundedByTheRegistry() {
        alertSseManager.setMaxEmitters(1);

        assertNotNull(alertSseManager.createEmitter(1L));
        final ResponseStatusException thrown =
                assertThrows(ResponseStatusException.class, () -> alertSseManager.createEmitter(2L));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, thrown.getStatusCode());
        assertEquals(1, alertSseManager.subscriptionCount());
    }

    @SuppressWarnings("unchecked")
    private Map<Long, SseEmitter> emitters() throws Exception {
        final Field registryField = AlertSseManager.class.getDeclaredField("registry");
        registryField.setAccessible(true);
        final Object registry = registryField.get(alertSseManager);
        final Field emittersField = SseEmitterRegistry.class.getDeclaredField("emitters");
        emittersField.setAccessible(true);
        return (Map<Long, SseEmitter>) emittersField.get(registry);
    }
}
