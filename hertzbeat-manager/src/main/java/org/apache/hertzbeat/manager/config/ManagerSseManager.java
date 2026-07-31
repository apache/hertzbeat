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

package org.apache.hertzbeat.manager.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.ManagerEventTypeEnum;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Manager SSE
 */
@Slf4j
@Component
public class ManagerSseManager {
    public static final String READY_EVENT = "manager-ready";
    public static final long RECONNECT_MILLIS = 3_000L;

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final AtomicLong eventSequence = new AtomicLong();

    public SseEmitter createEmitter(Long clientId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitter.onCompletion(() -> removeEmitter(clientId));
        emitter.onTimeout(() -> removeEmitter(clientId));
        emitters.put(clientId, emitter);
        try {
            emitter.send(SseEmitter.event()
                    .id(nextEventId())
                    .name(READY_EVENT)
                    .reconnectTime(RECONNECT_MILLIS)
                    .data(JsonUtil.toJson(new ManagerStreamReady(1, "CANONICAL_REREAD"))));
        } catch (IOException | IllegalStateException e) {
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
            } catch (IOException | IllegalStateException e) {
                tryCompleteAndClean(clientId, emitter);
            } catch (Exception exception) {
                log.error("Failed to broadcast manager message data to client: {}", exception.getMessage());
                tryCompleteAndClean(clientId, emitter);
            }
        });
    }

    private void tryCompleteAndClean(Long clientId, SseEmitter emitter) {
        try {
            Optional.ofNullable(emitter).ifPresent(ResponseBodyEmitter::complete);
        } catch (Throwable e) {
            log.debug("Failed to complete emitter for client {}: {}", clientId, e.getMessage());
        }
        // execute clear
        removeEmitter(clientId);
    }

    @Async
    public void broadcastImportTaskChanged() {
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(),
                JsonUtil.toJson(new ImportTaskChanged(1, "CANONICAL_REREAD")));
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
