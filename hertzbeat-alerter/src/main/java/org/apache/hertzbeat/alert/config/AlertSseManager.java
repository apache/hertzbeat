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

import org.apache.hertzbeat.common.support.SseEmitterRegistry;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * SSE manager for alert.
 *
 * <p>Note: the lifecycle of a subscription - its timeout, the ceiling on how many may be held
 * and the cleanup of the ones that went away - belongs to {@link SseEmitterRegistry}; what is
 * alert specific is only the event these subscribers are waiting for.
 */
@Component
public class AlertSseManager {

    private static final String ALERT_EVENT = "ALERT_EVENT";

    private final SseEmitterRegistry registry = new SseEmitterRegistry("alert");

    /**
     * Registers a subscription for the given client.
     *
     * @param clientId Identifier of the subscriber, unique per subscription
     * @return The emitter the controller returns to spring
     */
    public SseEmitter createEmitter(Long clientId) {
        return registry.createEmitter(clientId);
    }

    /**
     * Delivers one alert to every live subscriber.
     *
     * @param data Serialised alert payload
     */
    @Async
    public void broadcast(String data) {
        registry.broadcast(ALERT_EVENT, data);
    }

    void setMaxEmitters(int maxEmitters) {
        registry.setMaxEmitters(maxEmitters);
    }

    int subscriptionCount() {
        return registry.subscriptionCount();
    }
}
