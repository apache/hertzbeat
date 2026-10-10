/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.controller;

import java.util.List;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskService;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskView;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Canonical monitor import task reads used after live SSE notifications or reconnects. */
@RestController
@RequestMapping("/api/manager/import-tasks")
public class ImportTaskController {

    private final ImportTaskService importTaskService;

    public ImportTaskController(ImportTaskService importTaskService) {
        this.importTaskService = importTaskService;
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<Message<ImportTaskView>> getTask(@PathVariable String taskId) {
        return importTaskService.find(taskId, AuthTokenRequestContext.currentWorkspaceId())
                .map(task -> ResponseEntity.ok(Message.success(task)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping
    public Message<List<ImportTaskView>> listTasks(@RequestParam(defaultValue = "20") int limit) {
        return Message.success(importTaskService.list(AuthTokenRequestContext.currentWorkspaceId(), limit));
    }
}
