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
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
     * Returns detailed monitor information including ID, name, type, host, and status.
     */
    @Override
    @Tool(name = "query_monitors", description = """
            Comprehensive monitor querying with flexible filtering, pagination, and specialized views.
            
            MONITOR STATUSES:
            - status=1: Online/Active monitors (healthy, responding normally)
            - status=2: Offline monitors (not responding, connection failed)  
            - status=3: Unreachable monitors (network/connectivity issues)
            - status=0: Paused monitors (manually disabled/suspended)
            - status=9 or null: All monitors regardless of status (default)
            
            COMMON USE CASES & PARAMETER COMBINATIONS:
            
            1. BASIC MONITOR LISTING:
               - Default: No parameters (shows all monitors, 8 per page)
               - By type: app='linux' (show only Linux monitors)
               - Search: search='web' (find monitors with 'web' in name/host)
            
            2. STATUS-BASED QUERIES:
               - Healthy monitors: status=1, pageSize=50
               - Problem monitors: status=2 or status=3, pageSize=50
               - Offline monitors only: status=2
               - Unreachable monitors only: status=3
               - Paused monitors: status=0
            
            3. MONITORING HEALTH OVERVIEW:
               - All statuses with statistics: status=9, includeStats=true, pageSize=100
               - Unhealthy monitors: Pass both status=2 AND status=3 (make 2 separate calls)
            
            4. ADVANCED FILTERING:
               - Specific monitor types: app='mysql', status=1 (healthy MySQL monitors)
               - Label-based: labels='env:prod,critical:true'
               - Host search: search='192.168' (find by IP pattern)
               - Monitor IDs: ids=[1,2,3] (specific monitors by ID)
            
            5. SORTING & PAGINATION:
               - Recently updated: sort='gmtUpdate', order='desc'
               - Alphabetical: sort='name', order='asc'
               - By creation: sort='gmtCreate', order='desc' (newest first)
               - Large datasets: pageSize=50-100 for bulk operations
            
            RESPONSE FORMAT:
            - includeStats=true: Adds status distribution summary at top
            - Default: Simple list with ID, name, type, host, status
            - Shows total count and pagination info
            """)
    public String queryMonitors(
            @ToolParam(description = "Specific monitor IDs to retrieve (optional)", required = false) List<Long> ids,
            @ToolParam(description = "Monitor type filter: 'linux', 'mysql', 'http', 'redis', etc. (optional)", required = false) String app,
            @ToolParam(description = "Monitor status: 1=online, 2=offline, 3=unreachable, 0=paused, 9=all (default: 9)", required = false) Byte status,
            @ToolParam(description = "Search in monitor names or hosts (partial matching)", required = false) String search,
            @ToolParam(description = "Label filters, format: 'key1:value1,key2:value2'", required = false) String labels,
            @ToolParam(description = "Sort field: 'name', 'gmtCreate', 'gmtUpdate', 'status', 'app' (default: gmtCreate)", required = false) String sort,
            @ToolParam(description = "Sort order: 'asc' (ascending) or 'desc' (descending, default)", required = false) String order,
            @ToolParam(description = "Page number starting from 0 (default: 0)", required = false) Integer pageIndex,
            @ToolParam(description = "Items per page: 1-100 recommended (default: 20)", required = false) Integer pageSize,
            @ToolParam(description = "Include status statistics summary (default: false)", required = false) Boolean includeStats) {
        try {
            // Set defaults
            if (pageSize == null || pageSize <= 0) {
                pageSize = 20;
            }
            if (pageIndex == null) {
                pageIndex = 0;
            }
            if (includeStats == null) {
                includeStats = false;
            }
            
            Page<Monitor> result = monitorServiceAdapter.getMonitors(ids, app, search, status, sort, order, pageIndex, pageSize, labels);
            log.debug("MonitorServiceAdapter.getMonitors result: {}", result);
            
            StringBuilder response = new StringBuilder();
            response.append("MONITOR QUERY RESULTS\n");
            response.append("====================\n\n");
            
            // Include statistics if requested
            if (includeStats) {
                // Get status distribution by calling with different status values
                long onlineCount = monitorServiceAdapter.getMonitors(null, app, search, (byte) 1, null, null, 0, 1000, labels).getTotalElements();
                long offlineCount = monitorServiceAdapter.getMonitors(null, app, search, (byte) 2, null, null, 0, 1000, labels).getTotalElements();
                long unreachableCount = monitorServiceAdapter.getMonitors(null, app, search, (byte) 3, null, null, 0, 1000, labels).getTotalElements();
                long pausedCount = monitorServiceAdapter.getMonitors(null, app, search, (byte) 0, null, null, 0, 1000, labels).getTotalElements();
                
                response.append("STATUS OVERVIEW:\n");
                response.append("- Online: ").append(onlineCount).append("\n");
                response.append("- Offline: ").append(offlineCount).append("\n"); 
                response.append("- Unreachable: ").append(unreachableCount).append("\n");
                response.append("- Paused: ").append(pausedCount).append("\n");
                
                long total = onlineCount + offlineCount + unreachableCount + pausedCount;
                if (total > 0) {
                    double healthPercentage = (onlineCount * 100.0) / total;
                    response.append("- Health Rate: ").append(String.format("%.1f", healthPercentage)).append("%\n");
                }
                response.append("\n");
            }
            
            response.append("Query Results: ").append(result.getContent().size())
                   .append(" monitors (Total: ").append(result.getTotalElements()).append(")\n");
            
            if (result.getTotalPages() > 1) {
                response.append("Page ").append(pageIndex + 1).append(" of ").append(result.getTotalPages()).append("\n");
            }
            response.append("\n");
            
            for (Monitor monitor : result.getContent()) {
                response.append("ID: ").append(monitor.getId())
                       .append(" | Name: ").append(monitor.getName())
                       .append(" | Type: ").append(monitor.getApp())
                       .append(" | Host: ").append(monitor.getHost())
                       .append(" | Status: ").append(getStatusText(monitor.getStatus()));
                       
                // Add creation date for better context
                if (monitor.getGmtCreate() != null) {
                    response.append(" | Created: ").append(monitor.getGmtCreate().toString().substring(0, 10));
                }
                response.append("\n");
            }
            
            if (result.getContent().isEmpty()) {
                response.append("No monitors found matching the specified criteria.\n");
                response.append("Try adjusting your filters or search terms.");
            }
            
            return response.toString();
        } catch (Exception e) {
            return "Error retrieving monitors: " + e.getMessage();
        }
    }


    @Override
    @Tool(name = "add_monitor", description = """
            Add a new monitoring target to HertzBeat with comprehensive configuration.
            This tool helps create monitors for various services and systems in response to natural language requests.
            
            Examples of natural language requests this tool handles:
            - "I want to monitor the response time of a web service at http://example.com"
            - "Please help me add monitoring for a database connection pool on server 192.168.1.10"
            - "Add monitoring for Linux server health metrics on host myserver.local"
            - "Monitor MySQL database performance on database.company.com"
            
            The tool supports many monitor types: http, mysql, postgresql, redis, linux, windows, etc.
            Use list_monitor_types to see all available types.
            Use get_monitor_param_defines to understand required parameters for each type.
            
            For web services (response time monitoring):
            - Use type: 'http'
            - Provide the URL as host parameter
            
            For database monitoring:
            - Use type: 'mysql', 'postgresql', 'redis', etc.
            - Provide database host, port, and credentials
            """)
    public String addMonitor(
            @ToolParam(description = "Monitor name (required)", required = true) String name,
            @ToolParam(description = "Monitor type/application: linux, mysql, http, redis, postgresql, etc.", required = true) String app,
            @ToolParam(description = "Target host: IP address or domain name", required = true) String host,
            @ToolParam(description = "Target port (optional, depends on monitor type)", required = false) Integer port,
            @ToolParam(description = "Collection interval in seconds (default: 600)", required = false) Integer intervals,
            @ToolParam(description = "Username for authentication (optional)", required = false) String username,
            @ToolParam(description = "Password for authentication (optional)", required = false) String password,
            @ToolParam(description = "Monitor description (optional)", required = false) String description) {
        
        try {
            log.info("Adding monitor: name={}, app={}, host={}", name, app, host);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in add_monitor tool: {}", subjectSum);
            
            // Validate required parameters
            if (name == null || name.trim().isEmpty()) {
                return "Error: Monitor name is required";
            }
            if (app == null || app.trim().isEmpty()) {
                return "Error: Monitor type/application is required";
            }
            if (host == null || host.trim().isEmpty()) {
                return "Error: Host is required";
            }
            
            // Set default values
            if (intervals == null || intervals < 10) {
                intervals = 600; // Default 10 minutes
            }
            
            // Create Monitor entity
            Monitor monitor = Monitor.builder()
                    .name(name.trim())
                    .app(app.toLowerCase().trim())
                    .host(host.trim())
                    .intervals(intervals)
                    .status((byte) 1) // Status: Up
                    .type((byte) 0)   // Type: Normal
                    .description(description != null ? description.trim() : "")
                    .build();
            
            // Create parameters list
            List<Param> params = new ArrayList<>();
            
            // Add host parameter (always required)
            params.add(Param.builder()
                    .field("host")
                    .paramValue(host.trim())
                    .type((byte) 0)
                    .build());
            
            // Add port parameter if provided
            if (port != null && port > 0) {
                params.add(Param.builder()
                        .field("port")
                        .paramValue(port.toString())
                        .type((byte) 0)
                        .build());
            }
            
            // Add authentication parameters if provided
            if (username != null && !username.trim().isEmpty()) {
                params.add(Param.builder()
                        .field("username")
                        .paramValue(username.trim())
                        .type((byte) 1) // Type: Password
                        .build());
            }
            
            if (password != null && !password.trim().isEmpty()) {
                params.add(Param.builder()
                        .field("password")
                        .paramValue(password.trim())
                        .type((byte) 1) // Type: Password
                        .build());
            }
            
            // Add timeout parameter (default)
            params.add(Param.builder()
                    .field("timeout")
                    .paramValue("6000")
                    .type((byte) 0)
                    .build());
            
            // Call the adapter to add the monitor
            Long monitorId = monitorServiceAdapter.addMonitor(monitor, params, null);
            
            log.info("Successfully added monitor '{}' with ID: {}", name, monitorId);
            return String.format("Successfully added monitor '%s' with ID: %d. Monitor type: %s, Host: %s, Interval: %d seconds", 
                    name, monitorId, app, host, intervals);
            
        } catch (Exception e) {
            log.error("Failed to add monitor '{}': {}", name, e.getMessage(), e);
            return "Error adding monitor '" + name + "': " + e.getMessage();
        }
    }
    
    @Override
    @Tool(name = "list_monitor_types", description = """
            List all available monitor types that can be added to HerzBeat.
            This tool shows all supported monitor types with their display names.
            Use this to see what types of monitors you can create with the add_monitor tool.
            """)
    public String listMonitorTypes(
            @ToolParam(description = "Language code for localized names (en-US, zh-CN, etc.). Default: en-US", required = false) String language) {
        
        try {
            log.info("Listing available monitor types for language: {}", language);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in list_monitor_types tool: {}", subjectSum);
            
            // Set default language if not provided
            if (language == null || language.trim().isEmpty()) {
                language = "en-US";
            }
            
            // Get available monitor types from adapter
            Map<String, String> monitorTypes = monitorServiceAdapter.getAvailableMonitorTypes(language);
            
            if (monitorTypes == null || monitorTypes.isEmpty()) {
                return "No monitor types are currently available.";
            }
            
            // Format the response as a nice list
            StringBuilder response = new StringBuilder();
            response.append("Available Monitor Types (Total: ").append(monitorTypes.size()).append("):\n\n");
            
            // Sort monitor types alphabetically by key
            List<Map.Entry<String, String>> sortedTypes = monitorTypes.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .collect(Collectors.toList());
            
            for (Map.Entry<String, String> entry : sortedTypes) {
                String typeKey = entry.getKey();
                String displayName = entry.getValue();
                response.append("• ").append(typeKey)
                       .append(" - ").append(displayName)
                       .append("\n");
            }
            
            response.append("\nTo add a monitor, use the add_monitor tool with one of these types as the 'app' parameter.");
            response.append("\nExample: add_monitor(name='my-server', app='linux', host='192.168.1.100')");
            
            log.info("Successfully listed {} monitor types", monitorTypes.size());
            return response.toString();
            
        } catch (Exception e) {
            log.error("Failed to list monitor types: {}", e.getMessage(), e);
            return "Error retrieving monitor types: " + e.getMessage();
        }
    }
    
    @Override
    @Tool(name = "get_monitor_param_defines", description = """
            Get the parameter definitions required for a specific monitor type.
            This tool shows what parameters are needed when adding a monitor of the specified type,
            including field names, data types, validation rules, and whether they are required.
            Use this before adding a monitor to understand what parameters you need to provide.
            """)
    public String getMonitorParamDefines(
            @ToolParam(description = "Monitor type/application name (e.g., 'linux', 'mysql', 'redis')", required = true) String app) {
        
        try {
            log.info("Getting parameter definitions for monitor type: {}", app);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in get_monitor_param_defines tool: {}", subjectSum);
            
            // Validate required parameter
            if (app == null || app.trim().isEmpty()) {
                return "Error: Monitor type/application parameter is required";
            }
            
            // Get parameter definitions from adapter
            List<ParamDefine> paramDefines = monitorServiceAdapter.getMonitorParamDefines(app);
            
            if (paramDefines == null || paramDefines.isEmpty()) {
                return String.format("No parameter definitions found for monitor type '%s'. "
                   + "This monitor type may not exist or may not require additional parameters.", app);
            }
            
            // Format the response
            StringBuilder response = new StringBuilder();
            response.append(String.format("Parameter Definitions for Monitor Type '%s' (Total: %d):\n\n", 
                app, paramDefines.size()));
            
            for (ParamDefine paramDefine : paramDefines) {
                response.append("• Field: ").append(paramDefine.getField()).append("\n");
                
                // Add display name if available
                if (paramDefine.getName() != null && !paramDefine.getName().toString().trim().isEmpty()) {
                    response.append("  Name: ").append(paramDefine.getName()).append("\n");
                }
                
                // Add type
                if (paramDefine.getType() != null && !paramDefine.getType().trim().isEmpty()) {
                    response.append("  Type: ").append(paramDefine.getType()).append("\n");
                }
                
                // Add required status
                response.append("  Required: ").append(paramDefine.isRequired() ? "Yes" : "No").append("\n");
                
                // Add default value if present
                if (paramDefine.getDefaultValue() != null && !paramDefine.getDefaultValue().trim().isEmpty()) {
                    response.append("  Default: ").append(paramDefine.getDefaultValue()).append("\n");
                }
                
                // Add validation range if present
                if (paramDefine.getRange() != null && !paramDefine.getRange().trim().isEmpty()) {
                    response.append("  Range: ").append(paramDefine.getRange()).append("\n");
                }
                
                // Add limit if present
                if (paramDefine.getLimit() != null) {
                    response.append("  Limit: ").append(paramDefine.getLimit()).append("\n");
                }
                
                // Add placeholder text if present
                if (paramDefine.getPlaceholder() != null && !paramDefine.getPlaceholder().trim().isEmpty()) {
                    response.append("  Placeholder: ").append(paramDefine.getPlaceholder()).append("\n");
                }
                
                response.append("\n");
            }
            
            response.append("To add a monitor of this type, use the add_monitor tool with these parameters.\n");
            response.append(String.format("Example: add_monitor(name='my-monitor', app='%s', host='your-host', ...)", app));
            
            log.info("Successfully retrieved {} parameter definitions for monitor type: {}", paramDefines.size(), app);
            return response.toString();
            
        } catch (Exception e) {
            log.error("Failed to get parameter definitions for monitor type '{}': {}", app, e.getMessage(), e);
            return "Error retrieving parameter definitions for monitor type '" + app + "': " + e.getMessage();
        }
    }

    /**
     * Helper method to convert monitor status byte to readable text
     * @param status The status byte from monitor
     * @return Human-readable status text
     */
    private String getStatusText(Byte status) {
        if (status == null) {
            return "Unknown";
        }
        switch (status) {
            case 0:
                return "Paused";
            case 1:
                return "Online";
            case 2:
                return "Offline";
            case 3:
                return "Unreachable";
            default:
                return "Unknown (" + status + ")";
        }
    }

}
