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

package org.apache.hertzbeat.log.notice;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SSE manager for log
 */
@Component
@Slf4j
@Getter
public class LogSseManager {
    private final Map<Long, SseSubscriber> emitters = new ConcurrentHashMap<>();

    /**
     * Create a new SSE emitter for a client with specified filters
     * @param clientId The unique identifier for the client
     * @param filters The filters to apply to the log data
     * @return The SSE emitter
     */
    public SseEmitter createEmitter(Long clientId, LogSseFilterCriteria filters) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitter.onCompletion(() -> removeEmitter(clientId));
        emitter.onTimeout(() -> removeEmitter(clientId));
        emitter.onError((ex) -> removeEmitter(clientId));

        SseSubscriber subscriber = new SseSubscriber(emitter, filters);
        emitters.put(clientId, subscriber);
        return emitter;
    }

    /**
     * Broadcast log data to all subscribers
     * @param logEntry The log data to broadcast
     */
    @Async
    public void broadcast(LogEntry logEntry) {
        emitters.forEach((clientId, subscriber) -> {
            try {
                // Check if the log entry matches the subscriber's filter criteria
                if (subscriber.filters == null || subscriber.filters.matches(logEntry)) {
                    subscriber.emitter.send(SseEmitter.event()
                            .id(String.valueOf(System.currentTimeMillis()))
                            .name("LOG_EVENT")
                            .data(logEntry));
                }
            } catch (IOException | IllegalStateException e) {
                subscriber.emitter.complete();
                removeEmitter(clientId);
            } catch (Exception exception) {
                log.error("Failed to broadcast log to client: {}", exception.getMessage());
                subscriber.emitter.complete();
                removeEmitter(clientId);
            }
        });
    }

    private void removeEmitter(Long clientId) {
        emitters.remove(clientId);
    }
    
    /**
     * SSE subscriber
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SseSubscriber {
        /**
         * The SSE emitter for streaming log events
         */
        private SseEmitter emitter;
        /**
         * The filters for streaming log events
         */
        private LogSseFilterCriteria filters;
    }
}
