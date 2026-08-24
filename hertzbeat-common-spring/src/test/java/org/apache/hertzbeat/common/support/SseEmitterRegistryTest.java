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

package org.apache.hertzbeat.common.support;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.verify;
import java.lang.reflect.Field;
import java.util.Map;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedConstruction;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Test case for {@link SseEmitterRegistry}.
 *
 * <p>Every open subscription holds a request thread for as long as it lives, so both how long
 * one may live and how many may exist at once have to be bounded, and every way a
 * subscription can end has to give its slot back.
 */
class SseEmitterRegistryTest {

    private SseEmitterRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new SseEmitterRegistry("test");
    }

    /**
     * An unbounded emitter never expires on its own, so a client that goes away without
     * closing cleanly keeps holding its request thread until the container notices.
     */
    @Test
    void testSubscriptionsAreGivenFiniteTimeout() {
        final SseEmitter emitter = registry.createEmitter(1L);

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
        registry.setMaxEmitters(2);

        registry.createEmitter(1L);
        registry.createEmitter(2L);
        final ResponseStatusException thrown =
                assertThrows(ResponseStatusException.class, () -> registry.createEmitter(3L));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, thrown.getStatusCode());
        assertEquals(2, registry.subscriptionCount());
    }

    /**
     * The cap must not become a permanent lockout: once a dead subscription is cleaned up,
     * its slot has to be available again.
     */
    @Test
    void testDroppedSubscriptionFreesItsSlot() throws Exception {
        registry.setMaxEmitters(1);
        registry.createEmitter(1L);
        assertThrows(ResponseStatusException.class, () -> registry.createEmitter(2L));

        // A client that went away makes the next send fail, which is how the registry notices
        final SseEmitter deadEmitter = mock(SseEmitter.class);
        doThrow(new IllegalStateException("client gone")).when(deadEmitter).send(any(SseEmitter.SseEventBuilder.class));
        replaceEmitter(1L, deadEmitter);

        registry.broadcast("TEST_EVENT", "{\"id\":1}");

        assertEquals(0, registry.subscriptionCount());
        assertNotNull(registry.createEmitter(2L));
    }

    /**
     * Nothing else frees the slot of a subscription that dies on an error: a stream that only
     * broadcasts now and then would let a failed client hold its slot indefinitely and the
     * ceiling would drift into a permanent lockout.
     */
    @Test
    @SuppressWarnings("unchecked")
    void testErroredSubscriptionFreesItsSlot() {
        registry.setMaxEmitters(1);

        try (MockedConstruction<SseEmitter> construction = mockConstruction(SseEmitter.class)) {
            registry.createEmitter(1L);
            final SseEmitter created = construction.constructed().get(0);
            final ArgumentCaptor<Consumer<Throwable>> onError = ArgumentCaptor.forClass(Consumer.class);
            verify(created).onError(onError.capture());

            onError.getValue().accept(new IllegalStateException("client gone"));

            assertEquals(0, registry.subscriptionCount());
        }
    }

    /**
     * Completing a dropped subscription is a courtesy, so a container that refuses it must
     * not keep the subscription registered and its slot taken.
     */
    @Test
    void testSubscriptionIsDroppedEvenWhenCompletingItFails() throws Exception {
        registry.createEmitter(1L);
        final SseEmitter unusableEmitter = mock(SseEmitter.class);
        doThrow(new IllegalStateException("client gone"))
                .when(unusableEmitter).send(any(SseEmitter.SseEventBuilder.class));
        doThrow(new RuntimeException("complete failed")).when(unusableEmitter).complete();
        replaceEmitter(1L, unusableEmitter);

        assertDoesNotThrow(() -> registry.broadcast("TEST_EVENT", "{\"id\":1}"));

        assertFalse(emitters().containsKey(1L), "a subscription that cannot be completed still has to be dropped");
        assertEquals(0, registry.subscriptionCount());
    }

    /**
     * A slot is taken before the subscription exists, so anything that goes wrong between the
     * two has to give it back: nothing ends up in the map to be removed later, and the slot
     * would be held until the process restarts.
     */
    @Test
    void testSlotIsGivenBackWhenRegisteringFails() {
        registry.setMaxEmitters(1);

        try (MockedConstruction<SseEmitter> failing = mockConstruction(SseEmitter.class, (mock, context) -> {
            throw new IllegalStateException("cannot open a subscription");
        })) {
            // The failure is raised through mockito, so what reaches the caller is whatever it
            // wraps the initializer's exception in; only that it fails matters here
            assertThrows(RuntimeException.class, () -> registry.createEmitter(1L));
        }

        assertEquals(0, registry.subscriptionCount());
        assertNotNull(registry.createEmitter(2L), "a failed registration must not spend the ceiling");
    }

    /**
     * A caller that has no id for its subscriber cannot be registered at all, so it must be
     * turned away before it takes a slot rather than after.
     */
    @Test
    void testSubscriptionWithoutClientIdTakesNoSlot() {
        assertThrows(NullPointerException.class, () -> registry.createEmitter(null));

        assertEquals(0, registry.subscriptionCount());
    }

    /**
     * The ceiling has to hold for subscriptions that arrive together, which is the only case
     * that matters: a burst is what exhausts the thread pool, and a burst is exactly what a
     * check of the current count followed by a separate registration lets straight through.
     */
    @Test
    void testCeilingHoldsWhenSubscriptionsArriveTogether() throws Exception {
        final int maxEmitters = 10;
        final int racers = 200;
        registry.setMaxEmitters(maxEmitters);
        final CyclicBarrier allReady = new CyclicBarrier(racers);
        final AtomicInteger accepted = new AtomicInteger();
        final ExecutorService pool = Executors.newFixedThreadPool(racers);

        try {
            for (int i = 0; i < racers; i++) {
                final long clientId = i;
                pool.submit(() -> {
                    try {
                        // Every thread is released at the same instant, so they all reach the
                        // ceiling check together
                        allReady.await(10, TimeUnit.SECONDS);
                        registry.createEmitter(clientId);
                        accepted.incrementAndGet();
                    } catch (ResponseStatusException refused) {
                        // Expected for everyone who arrives after the ceiling is reached
                    } catch (Exception e) {
                        Thread.currentThread().interrupt();
                    }
                });
            }
            pool.shutdown();
            assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS), "subscriptions did not settle");
        } finally {
            pool.shutdownNow();
        }

        assertEquals(maxEmitters, accepted.get(), "more subscriptions were accepted than the ceiling allows");
        assertEquals(maxEmitters, registry.subscriptionCount());
    }

    /**
     * Stands in for a client that went away: the registry only learns about it when a send
     * fails, which needs an emitter that fails on demand.
     */
    private void replaceEmitter(Long clientId, SseEmitter emitter) throws Exception {
        emitters().put(clientId, emitter);
    }

    @SuppressWarnings("unchecked")
    private Map<Long, SseEmitter> emitters() throws Exception {
        final Field emittersField = SseEmitterRegistry.class.getDeclaredField("emitters");
        emittersField.setAccessible(true);
        return (Map<Long, SseEmitter>) emittersField.get(registry);
    }
}
