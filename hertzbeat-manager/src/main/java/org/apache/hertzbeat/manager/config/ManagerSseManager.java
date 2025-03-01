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
import org.apache.hertzbeat.common.constants.NotifyLevelEnum;
import org.apache.hertzbeat.common.entity.manager.ManagerMessage;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manager SSE Manager
 */
@Component
public class ManagerSseManager {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("msg");

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
            } catch (IOException e) {
                emitter.complete();
                removeEmitter(clientId);
            }
        });
    }

    public void broadcastImportTaskProcess(String taskName, Integer process){
        ManagerMessage managerMessage = new ManagerMessage(NotifyLevelEnum.INFO.getValue(), ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(),
                String.format(bundle.getString("manager_import_task_progress"), taskName, process));
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    public void broadcastImportTaskSuccess(String taskName){
        ManagerMessage managerMessage = new ManagerMessage(NotifyLevelEnum.SUCCESS.getValue(), ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(),
                String.format(bundle.getString("manager_import_task_success"), taskName));
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    public void broadcastImportTaskFail(String taskName, String errMsg){
        ManagerMessage managerMessage = new ManagerMessage(NotifyLevelEnum.ERROR.getValue(), ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(),
                String.format(bundle.getString("manager_import_task_fail"), taskName, errMsg));
        broadcast(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), JsonUtil.toJson(managerMessage));
    }

    private void removeEmitter(Long clientId) {
        emitters.remove(clientId);
    }
}