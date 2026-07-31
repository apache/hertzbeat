/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.config;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.ManagerEventTypeEnum;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Manages the manager event stream and its canonical reread notifications. */
@Slf4j
@Component
public class ManagerSseManager implements ApplicationListener<ContextClosedEvent> {

    public static final String READY_EVENT = "manager-ready";
    public static final long RECONNECT_MILLIS = 3_000L;

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final AtomicLong eventSequence = new AtomicLong();
    private final Object lifecycleMonitor = new Object();
    private boolean closing;

    public SseEmitter createEmitter(Long clientId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitter.onCompletion(() -> removeEmitter(clientId));
        emitter.onTimeout(() -> removeEmitter(clientId));
        emitter.onError(error -> removeEmitter(clientId));
        synchronized (lifecycleMonitor) {
            if (closing) {
                emitter.complete();
                return emitter;
            }
            emitters.put(clientId, emitter);
        }
        try {
            emitter.send(SseEmitter.event()
                    .id(nextEventId())
                    .name(READY_EVENT)
                    .reconnectTime(RECONNECT_MILLIS)
                    .data(JsonUtil.toJson(new ManagerStreamReady(1, "CANONICAL_REREAD"))));
        } catch (IOException | IllegalStateException exception) {
            tryCompleteAndClean(clientId, emitter);
        }
        return emitter;
    }

    @Async
    public void broadcast(String eventName, String data) {
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .id(nextEventId())
                        .name(eventName)
                        .data(data));
            } catch (IOException | IllegalStateException exception) {
                tryCompleteAndClean(clientId, emitter);
            } catch (Exception exception) {
                log.error("Failed to broadcast manager message data to client: {}", exception.getMessage());
                tryCompleteAndClean(clientId, emitter);
            }
        });
    }

    @Async
    public void broadcastImportTaskChanged() {
        // Global SSE is only a reread trigger; workspace-scoped task state stays behind the canonical GET APIs.
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(),
                JsonUtil.toJson(new ImportTaskChanged(1, "CANONICAL_REREAD")));
    }

    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        // Complete requests before the embedded server enters graceful shutdown so SSE cannot consume its grace period.
        Map<Long, SseEmitter> activeEmitters;
        synchronized (lifecycleMonitor) {
            closing = true;
            activeEmitters = new HashMap<>(emitters);
            emitters.clear();
        }
        activeEmitters.forEach(this::tryCompleteAndClean);
    }

    private void tryCompleteAndClean(Long clientId, SseEmitter emitter) {
        try {
            Optional.ofNullable(emitter).ifPresent(ResponseBodyEmitter::complete);
        } catch (Throwable exception) {
            log.debug("Failed to complete emitter for client {}: {}", clientId, exception.getMessage());
        }
        removeEmitter(clientId);
    }

    private void removeEmitter(Long clientId) {
        emitters.remove(clientId);
    }

    private String nextEventId() {
        return Long.toString(eventSequence.incrementAndGet());
    }

    private record ManagerStreamReady(int schemaVersion, String delivery) {
    }

    private record ImportTaskChanged(int schemaVersion, String delivery) {
    }
}
