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

package org.apache.hertzbeat.alert.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * SSE manager for alert
 */
@Slf4j
@Component
public class AlertSseManager implements ApplicationListener<ContextClosedEvent> {

    private static final long RECONNECT_TIME_MILLIS = 3_000L;

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final Object lifecycleMonitor = new Object();
    private final AtomicLong eventSequence = new AtomicLong(System.currentTimeMillis());
    private final Supplier<SseEmitter> emitterFactory;
    private boolean closing;

    public AlertSseManager() {
        this(() -> new SseEmitter(Long.MAX_VALUE));
    }

    AlertSseManager(Supplier<SseEmitter> emitterFactory) {
        this.emitterFactory = Objects.requireNonNull(emitterFactory);
    }

    /**
     * Opens a reconnectable stream. The ready event is a convergence trigger:
     * clients must reread canonical alert state rather than expect replay from
     * this in-memory stream.
     */
    public SseEmitter createEmitter(Long clientId) {
        SseEmitter emitter = emitterFactory.get();
        emitter.onCompletion(() -> removeEmitter(clientId, emitter));
        emitter.onTimeout(() -> removeEmitter(clientId, emitter));
        emitter.onError((ex) -> removeEmitter(clientId, emitter));
        SseEmitter replacedEmitter;
        synchronized (lifecycleMonitor) {
            if (closing) {
                tryComplete(emitter);
                return emitter;
            }
            replacedEmitter = emitters.put(clientId, emitter);
        }
        if (replacedEmitter != null && replacedEmitter != emitter) {
            tryCompleteAndClean(clientId, replacedEmitter);
        }
        try {
            emitter.send(SseEmitter.event()
                    .name("ALERT_STREAM_READY")
                    .data("{}")
                    .reconnectTime(RECONNECT_TIME_MILLIS));
        } catch (IOException | IllegalStateException exception) {
            tryCompleteAndClean(clientId, emitter);
        }
        return emitter;
    }

    @Async
    public void broadcast(String data) {
        broadcast(data, "ALERT_EVENT");
    }

    @Async
    public void broadcastGroupMutation(String data) {
        broadcast(data, "ALERT_GROUP_MUTATION");
    }

    private void broadcast(String data, String eventName) {
        String eventId = String.valueOf(eventSequence.incrementAndGet());
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .id(eventId)
                        .name(eventName)
                        .data(data));
            } catch (IOException | IllegalStateException e) {
                tryCompleteAndClean(clientId, emitter);
            } catch (Exception exception) {
                log.error("Failed to broadcast alert data to client: {}",
                        exception.getClass().getSimpleName());
                tryCompleteAndClean(clientId, emitter);
            }
        });
    }

    private void tryCompleteAndClean(Long clientId, SseEmitter emitter) {
        tryComplete(emitter);
        removeEmitter(clientId, emitter);
    }

    private void tryComplete(SseEmitter emitter) {
        try {
            Optional.ofNullable(emitter).ifPresent(ResponseBodyEmitter::complete);
        } catch (Throwable e) {
            log.debug("Failed to complete alert emitter: {}", e.getClass().getSimpleName());
        }
    }

    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        // Complete requests before the embedded server enters graceful shutdown;
        // otherwise long-lived SSE responses can consume the entire shutdown grace period.
        Map<Long, SseEmitter> activeEmitters;
        synchronized (lifecycleMonitor) {
            closing = true;
            activeEmitters = new HashMap<>(emitters);
            emitters.clear();
        }
        activeEmitters.forEach(this::tryCompleteAndClean);
    }

    private void removeEmitter(Long clientId, SseEmitter emitter) {
        emitters.remove(clientId, emitter);
    }
}
