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

package org.apache.hertzbeat.observability.logs.controller;

import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.service.LogSseService;
import org.apache.hertzbeat.observability.logs.sse.LogSseFilterCriteria;
import org.springframework.http.MediaType;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;

/**
 * SSE controller for log streaming with filtering support
 */
@RestController
@RequestMapping(path = "/api/logs/sse", produces = {TEXT_EVENT_STREAM_VALUE})
public class LogSseController {

    private final LogSseService logSseService;

    public LogSseController(LogSseService logSseService) {
        this.logSseService = logSseService;
    }

    /**
     * Subscribe to log events with optional filtering
     * @param filterCriteria Filter criteria for log events (all parameters are optional)
     * @return SSE emitter for streaming log events
     */
    @GetMapping(path = "/subscribe")
    @Operation(summary = "Subscribe to log events with optional filtering", description = "Subscribe to log events with optional filtering")
    public ResponseEntity<?> subscribe(@ModelAttribute LogSseFilterCriteria filterCriteria) {
        return withCriteria(filterCriteria, () -> ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .header("Cache-Control", "no-cache, no-transform")
                .header("X-Accel-Buffering", "no")
                .body(logSseService.subscribe(filterCriteria)));
    }

    @GetMapping(path = "/validate", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Validate live log filters without opening a subscription")
    public ResponseEntity<?> validate(@ModelAttribute LogSseFilterCriteria filterCriteria) {
        return withCriteria(filterCriteria, () -> {
            logSseService.validate(filterCriteria);
            return ResponseEntity.ok(Message.success(null));
        });
    }

    private ResponseEntity<?> withCriteria(LogSseFilterCriteria filterCriteria, java.util.function.Supplier<ResponseEntity<?>> operation) {
        String workspaceId = AuthTokenRequestContext.currentAuthenticatedWorkspaceId();
        if (workspaceId == null || workspaceId.isBlank()) {
            return ResponseEntity.status(403).build();
        }
        filterCriteria.setWorkspaceId(workspaceId);
        try {
            return operation.get();
        } catch (LogFilterQueryException invalid) {
            Message<LogFilterQueryException.Detail> message = Message.fail(
                    CommonConstants.PARAM_INVALID_CODE, LogFilterQueryException.ERROR_CODE);
            message.setData(invalid.detail());
            return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON).body(message);
        } catch (IllegalArgumentException ignored) {
            return ResponseEntity.badRequest().build();
        }
    }

}
