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

import java.io.IOException;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Holds the live server sent event subscriptions of one stream and owns their lifecycle.
 *
 * <p>What: hands an emitter to each subscriber, keeps the live ones, broadcasts an event to
 * all of them and drops the ones that have gone away.
 *
 * <p>How: hold one instance per stream and name it after that stream, so refusals and
 * broadcast failures stay tellable apart in the log. The instance is not a bean: a stream
 * owns its registry the way it owns its subscribers.
 *
 * <p>Note: an open subscription occupies a request thread for as long as it lives, so both
 * how long one may live and how many may exist at once are bounded here. Each stream used to
 * carry its own copy of this lifecycle and the copies drifted - one released the slot of a
 * subscription that died on an error and the other did not, so on that stream a failed
 * subscriber held its slot until the process restarted.
 */
@Slf4j
public class SseEmitterRegistry {

    /**
     * How long a subscription may stay open before the client has to reconnect.
     *
     * <p>An unbounded timeout means a subscription never expires on its own, so a client that
     * goes away without closing cleanly holds its request thread until the container notices.
     * A finite timeout bounds that. It is only safe because the ui reconnects when the stream
     * ends: it reads through `fetch` rather than `EventSource`, so it has to reconnect itself,
     * and it does.
     */
    private static final long EMITTER_TIMEOUT_MILLIS = 30 * 60 * 1000L;

    /** Name of the stream these subscriptions belong to, used to make log lines tellable apart. */
    private final String streamName;

    /**
     * Cap on concurrently held subscriptions. Each one occupies a request thread, so without
     * a ceiling enough parallel subscriptions exhaust the container's thread pool and take
     * the whole application down with them.
     */
    @Setter
    private int maxEmitters = 1000;

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    /**
     * Slots taken by held subscriptions, reserved before the subscription is registered.
     *
     * <p>Reading `emitters.size()` and then putting into it would let every request of a
     * parallel burst pass the same check and register anyway, which is exactly the burst the
     * ceiling exists to survive. Claiming a slot by compare-and-set makes the ceiling hold no
     * matter how many requests arrive at once. The counter can briefly run ahead of the map,
     * between the claim and the put, which only ever refuses one subscription too early.
     */
    private final AtomicInteger heldSlots = new AtomicInteger();

    /**
     * @param streamName Name of the stream, used in log lines only
     */
    public SseEmitterRegistry(String streamName) {
        this.streamName = streamName;
    }

    /**
     * Registers a subscription for the given client.
     *
     * <p>When: from the request thread serving a subscribe request. The returned emitter is
     * what the controller hands back to spring, which keeps the request open around it.
     *
     * @param clientId Identifier of the subscriber, unique per subscription, not null
     * @return The emitter the caller returns from its controller method
     * @throws ResponseStatusException With {@code 503} when the stream already holds as many
     *         subscriptions as it may
     * @throws NullPointerException When {@code clientId} is null, which is checked before a
     *         slot is taken so that a caller that gets this wrong cannot spend the ceiling
     */
    public SseEmitter createEmitter(Long clientId) {
        Objects.requireNonNull(clientId, "clientId of an sse subscription must not be null");
        claimSlot();
        boolean registered = false;
        try {
            final SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MILLIS);
            emitter.onCompletion(() -> removeEmitter(clientId));
            emitter.onTimeout(() -> removeEmitter(clientId));
            // Without this a subscription that dies on an error keeps its slot: a stream that
            // broadcasts rarely notices nothing, and the slot is held until the process restarts
            emitter.onError(ex -> removeEmitter(clientId));
            // The id is a fresh snowflake per subscription, so this never replaces a live emitter
            emitters.put(clientId, emitter);
            registered = true;
            return emitter;
        } finally {
            if (!registered) {
                // The slot is only ever given back by removing the subscription from the map,
                // so one that never got in there would hold its slot until the process restarts
                heldSlots.decrementAndGet();
            }
        }
    }

    /**
     * Sends one event to every live subscription and drops the ones the send fails for.
     *
     * <p>Note: a failing send is how a client that went away is noticed, so the failure is
     * expected rather than exceptional and only unforeseen ones are logged at error level.
     *
     * @param eventName Name of the sse event, which is what the ui subscribes by
     * @param data Payload to deliver, already serialised
     */
    public void broadcast(String eventName, String data) {
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .id(String.valueOf(System.currentTimeMillis()))
                        .name(eventName)
                        .data(data));
            } catch (IOException | IllegalStateException e) {
                tryCompleteAndClean(clientId, emitter);
            } catch (Exception e) {
                log.error("Failed to broadcast {} data to client: {}", streamName, e.getMessage());
                tryCompleteAndClean(clientId, emitter);
            }
        });
    }

    /**
     * @return How many subscriptions this stream currently holds
     */
    public int subscriptionCount() {
        return heldSlots.get();
    }

    private void claimSlot() {
        while (true) {
            final int held = heldSlots.get();
            if (held >= maxEmitters) {
                log.warn("Refused {} subscription, already holding {} of at most {}", streamName, held, maxEmitters);
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Too many " + streamName + " subscriptions");
            }
            if (heldSlots.compareAndSet(held, held + 1)) {
                return;
            }
        }
    }

    private void tryCompleteAndClean(Long clientId, SseEmitter emitter) {
        try {
            Optional.ofNullable(emitter).ifPresent(ResponseBodyEmitter::complete);
        } catch (Throwable e) {
            log.debug("Failed to complete emitter for client {}: {}", clientId, e.getMessage());
        }
        // Execute clear
        removeEmitter(clientId);
    }

    /**
     * A subscription can be dropped more than once for the same client: a send failure cleans
     * it up and completing it fires the completion callback on top of that. The slot is only
     * released for the removal that actually took the emitter out of the map, so the count
     * cannot drift below what is held and quietly reopen the ceiling.
     */
    private void removeEmitter(Long clientId) {
        if (emitters.remove(clientId) != null) {
            heldSlots.decrementAndGet();
        }
    }
}
