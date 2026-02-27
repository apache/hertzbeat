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

package org.apache.hertzbeat.alert.controller;

import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * SSE controller for alert
 */
@RestController
@RequestMapping(path = "/api/alert/sse", produces = {TEXT_EVENT_STREAM_VALUE})
public class AlertSseController {

    private final AlertSseManager emitterManager;

    public AlertSseController(AlertSseManager emitterManager) {
        this.emitterManager = emitterManager;
    }

    @GetMapping(path = "/subscribe")
    public SseEmitter subscribe() {
        Long clientId = SnowFlakeIdGenerator.generateId();
        return emitterManager.createEmitter(clientId);
    }
}