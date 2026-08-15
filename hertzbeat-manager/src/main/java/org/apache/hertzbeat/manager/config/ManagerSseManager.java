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

import org.apache.hertzbeat.common.constants.ManagerEventTypeEnum;
import org.apache.hertzbeat.common.entity.dto.ImportTaskMessage;
import org.apache.hertzbeat.common.entity.dto.ManagerMessage;
import org.apache.hertzbeat.common.support.SseEmitterRegistry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Manager SSE.
 *
 * <p>Note: the lifecycle of a subscription - its timeout, the ceiling on how many may be held
 * and the cleanup of the ones that went away - belongs to {@link SseEmitterRegistry}; what is
 * manager specific is only the events these subscribers are waiting for.
 */
@Component
public class ManagerSseManager {

    private final SseEmitterRegistry registry = new SseEmitterRegistry("manager");

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
     * Delivers one manager event to every live subscriber.
     *
     * @param eventName Name of the sse event, which is what the ui subscribes by
     * @param data Serialised payload
     */
    @Async
    public void broadcast(String eventName, String data) {
        registry.broadcast(eventName, data);
    }

    public void broadcastImportTaskInProgress(String taskName, Integer progress) {
        final ManagerMessage managerMessage = ImportTaskMessage.createInProgressMessage(taskName, progress);
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    public void broadcastImportTaskSuccess(String taskName) {
        final ManagerMessage managerMessage = ImportTaskMessage.createCompletedMessage(taskName);
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    public void broadcastImportTaskFail(String taskName, String errMsg) {
        final ManagerMessage managerMessage = ImportTaskMessage.createFailedMessage(taskName, errMsg);
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    void setMaxEmitters(int maxEmitters) {
        registry.setMaxEmitters(maxEmitters);
    }

    int subscriptionCount() {
        return registry.subscriptionCount();
    }
}
