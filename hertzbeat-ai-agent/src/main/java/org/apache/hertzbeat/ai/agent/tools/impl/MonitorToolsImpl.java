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

package org.apache.hertzbeat.ai.agent.tools.impl;

import com.usthe.sureness.subject.SubjectSum;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.adapters.MonitorServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.agent.tools.MonitorTools;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.apache.hertzbeat.common.entity.manager.Monitor;

import java.util.List;

/**
 * Implementation of Monitoring Tools functionality
 */
@Slf4j
@Service
public class MonitorToolsImpl implements MonitorTools {

    @Autowired
    private MonitorServiceAdapter monitorServiceAdapter;


    /**
     * Tool to query monitor information with flexible filtering and pagination.
     * Supports filtering by monitor IDs, type, status, host, labels, sorting, and
     * pagination.
     * Returns monitor names as string.
     */
    @Override
    @Tool(name = "list_monitors", returnDirect = true, description = """
            Query monitor information with flexible filtering and pagination.
            Supports filtering by monitor IDs, type, status, host, labels, sorting, and pagination.
            Returns results as String. When no parameters are available, pass the default value as mentioned below. If the user doesn't provide any specific parameter, the default value will be used.
            """)
    public String listMonitors(
            @ToolParam(description = "List of monitor IDs to filter (default: empty list)", required = false) List<Long> ids,
            @ToolParam(description = "Monitor type, e.g., 'linux' (default: null)", required = false) String app,
            @ToolParam(description = "Monitor status (0: no monitor, 1: usable, 2: disabled, 9: all) (default: null)", required = false) Byte status,
            @ToolParam(description = "Fuzzy search for host or name (default: null)", required = false) String search,
            @ToolParam(description = "Monitor labels, e.g., 'env:prod,instance:22' (default: null)", required = false) String labels,
            @ToolParam(description = "Sort field, e.g., 'name' (default: gmtCreate)", required = false) String sort,
            @ToolParam(description = "Sort order, 'asc' or 'desc' (default: desc)", required = false) String order,
            @ToolParam(description = "Page index (default: 0)", required = false) Integer pageIndex,
            @ToolParam(description = "Page size (default: 8)", required = false) Integer pageSize) {
        try {
            Page<Monitor> result = monitorServiceAdapter.getMonitors(ids, app, search, status, sort, order, pageIndex, pageSize, labels);
            log.debug("MonitorServiceAdapter.getMonitors result: {}", result);
            return result.getContent().stream().map(Monitor::getName).toList().toString();
        } catch (Exception e) {
            return "error is" + e.getMessage();
        }
    }

    @Override
    @Tool(name = "add_monitor", description = "Add a new monitor")
    public String addMonitor(@ToolParam(description = "Name of the monitor") String name) {
        log.debug("Adding monitor with name: {}", name);
        SubjectSum subjectSum = McpContextHolder.getSubject();
        log.debug("Current subject in tool: {}", subjectSum);
        return "Monitor added: " + name;
    }

}
