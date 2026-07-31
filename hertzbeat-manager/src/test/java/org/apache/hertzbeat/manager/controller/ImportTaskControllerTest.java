/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
