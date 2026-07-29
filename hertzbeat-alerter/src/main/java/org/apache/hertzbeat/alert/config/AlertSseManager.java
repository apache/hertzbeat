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

import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SSE manager for alert
 */
@Slf4j
@Component
public class AlertSseManager {

    /**
     * How long a subscription may stay open before the client has to reconnect.
     *
     * <p>`Long.MAX_VALUE` meant a subscription never expired on its own, so a client that
     * went away without closing cleanly held its request thread until the container noticed.
     * A finite timeout bounds that; browsers reconnect on timeout, and the ui re-subscribes.
     */
    private static final long EMITTER_TIMEOUT_MILLIS = 30 * 60 * 1000L;

    /**
     * Cap on concurrently held subscriptions. Each one occupies a request thread, so without
     * a ceiling enough parallel subscriptions exhaust the container's thread pool and take
     * the whole application down with them.
     */
    @Setter
    private int maxEmitters = 1000;

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(Long clientId) {
        if (emitters.size() >= maxEmitters) {
            log.warn("Refused alert subscription, already holding {} of at most {}", emitters.size(), maxEmitters);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Too many alert subscriptions");
        }
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MILLIS);
        emitter.onCompletion(() -> removeEmitter(clientId));
        emitter.onTimeout(() -> removeEmitter(clientId));
        emitter.onError((ex) -> removeEmitter(clientId));
        emitters.put(clientId, emitter);
        return emitter;
    }

    int subscriptionCount() {
        return emitters.size();
    }

    @Async
    public void broadcast(String data) {
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .id(String.valueOf(System.currentTimeMillis()))
                        .name("ALERT_EVENT")
                        .data(data));
            } catch (IOException | IllegalStateException e) {
                tryCompleteAndClean(clientId, emitter);
            } catch (Exception exception) {
                log.error("Failed to broadcast alert data to client: {}", exception.getMessage());
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

    private void removeEmitter(Long clientId) {
        emitters.remove(clientId);
    }
}
