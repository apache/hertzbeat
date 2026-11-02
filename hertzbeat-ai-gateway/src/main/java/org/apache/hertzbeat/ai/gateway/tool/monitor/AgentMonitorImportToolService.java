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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskService;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskView;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Read import outcomes only in the trusted invocation workspace. */
@Service
public class AgentMonitorImportToolService {
    private final ImportTaskService imports;

    public AgentMonitorImportToolService(ImportTaskService imports) {
        this.imports = imports;
    }

    @Tool(name = "monitor.import_list", description = "List recent monitor imports in the trusted current workspace. History is process-local and is lost on manager restart.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public java.util.List<ImportTaskView> importList(@ToolParam(description = "Limit from 1 to 100.") int limit) {
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Limit must be from 1 to 100");
        }
        return imports.list(workspace(), limit);
    }

    private String workspace() {
        String workspace = AgentToolContextSupport.invocation().getRequest().getWorkspaceId();
        if (workspace == null || workspace.isBlank()) {
            throw new IllegalArgumentException("Trusted workspace is required");
        }
        return workspace;
    }

    @Tool(name = "monitor.import_status", description = "Read a monitor import task in the current workspace; inspect its terminal status after native file import.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public ImportTaskView importStatus(@ToolParam(description = "Native monitor import task id.") String taskId) {
        if (taskId == null || taskId.isBlank() || taskId.length() > 128) {
            throw new IllegalArgumentException("A bounded import task id is required");
        }
        String workspace = AgentToolContextSupport.invocation().getRequest().getWorkspaceId();
        if (workspace == null || workspace.isBlank()) {
            throw new IllegalArgumentException("Trusted workspace is required");
        }
        return imports.find(taskId, workspace).orElseThrow(() -> new IllegalArgumentException("Import task not found"));
    }
}
