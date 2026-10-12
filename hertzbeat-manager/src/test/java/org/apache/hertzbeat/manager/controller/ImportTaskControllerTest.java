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

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ImportTaskControllerTest {

    @AfterEach
    void clearContext() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void readsCanonicalTaskOnlyInsideCurrentWorkspace() throws Exception {
        ImportTaskService service = new ImportTaskService(null);
        String taskId = service.create("team-a").taskId();
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ImportTaskController(service)).build();

        AuthTokenRequestContext.bindWorkspaceId("team-a");
        mockMvc.perform(MockMvcRequestBuilders.get("/api/manager/import-tasks/{taskId}", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.taskId").value(taskId))
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.errorCode").doesNotExist());

        AuthTokenRequestContext.bindWorkspaceId("team-b");
        mockMvc.perform(MockMvcRequestBuilders.get("/api/manager/import-tasks/{taskId}", taskId))
                .andExpect(status().isNotFound());
    }
}
