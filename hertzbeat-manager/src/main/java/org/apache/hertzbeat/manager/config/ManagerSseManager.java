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
import org.apache.hertzbeat.common.entity.dto.ImportTaskMessage;
import org.apache.hertzbeat.common.entity.dto.ManagerMessage;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manager SSE
 */
@Slf4j
@Component
public class ManagerSseManager {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(Long clientId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitter.onCompletion(() -> removeEmitter(clientId));
        emitter.onTimeout(() -> removeEmitter(clientId));
        emitters.put(clientId, emitter);
        return emitter;
    }

    @Async
    public void broadcast(String eventName, String data) {
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .id(String.valueOf(System.currentTimeMillis()))
                        .name(eventName)
                        .data(data));
            } catch (IOException | IllegalStateException e) {
                emitter.complete();
                removeEmitter(clientId);
            } catch (Exception exception) {
                log.error("Failed to broadcast manager message data to client: {}", exception.getMessage());
                emitter.complete();
                removeEmitter(clientId);
            }
        });
    }

    public void broadcastImportTaskInProgress(String taskName, Integer progress){
        ManagerMessage managerMessage = ImportTaskMessage.createInProgressMessage(taskName, progress);
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    public void broadcastImportTaskSuccess(String taskName){
        ManagerMessage managerMessage = ImportTaskMessage.createCompletedMessage(taskName);
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    public void broadcastImportTaskFail(String taskName, String errMsg){
        ManagerMessage managerMessage = ImportTaskMessage.createFailedMessage(taskName, errMsg);
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    private void removeEmitter(Long clientId) {
        emitters.remove(clientId);
    }
}