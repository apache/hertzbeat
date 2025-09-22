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
import org.apache.hertzbeat.ai.agent.utils.UtilityClass;
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
            Query Existing/configured monitors in HertzBeat.
            This tool retrieves monitors based on various filters and parameters.
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
                       .append(" | Status: ").append(UtilityClass.getStatusText(monitor.getStatus()));
                       
                // Add creation date for better context
                if (monitor.getGmtCreate() != null) {
                    response.append(" | Created: ").append(monitor.getGmtCreate().toString(), 0, 10);
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
            This tool dynamically handles different parameter requirements for each monitor type.
            
            This tool creates monitors with proper app-specific parameters.
            
            *********
            VERY IMPORTANT:
            ALWAYS use get_monitor_additional_params to check the additional required parameters for the chosen type before adding a monitor or even mentioning it.
            Use list_monitor_types tool to see available monitor type names to use here in the app parameter.
            Use the information obtained from this to query user for parameters.
            If the User has not given any parameters, ask them to provide the necessary parameters, until all the necessary parameters are provided.
            **********
            
            Examples of natural language requests this tool handles:
            - "Monitor website example.com with HTTPS on port 443"
            - "Add MySQL monitoring for database server at 192.168.1.10 with user admin"
            - "Monitor Linux server health on host server.company.com via SSH"
            - "Set up Redis monitoring on localhost port 6379 with password"
            
            PARAMETER MAPPING: The tool intelligently maps common parameters:
            - host: Target server/domain
            - port: Service port (auto-detected if not specified)
            - username: Authentication username
            - password: Authentication password
            - database: Database name (for DB monitors)
            - additionalParams: JSON string for app-specific parameters (to be obtained from get_monitor_param_defines)
            
            ADDITIONAL PARAMETERS EXAMPLES:
            - Website: {"uri":"/api/health", "ssl":"true", "method":"POST"}
            - Linux: {"privateKey":"ssh-key-content", "script":"custom-script"}
            - Database: {"url":"jdbc:mysql://custom", "timeout":"10000"}
            """)
    public String addMonitor(
            @ToolParam(description = "Monitor name (required)", required = true) String name,
            @ToolParam(description = "Monitor type: website, mysql, postgresql, redis, linux, windows, etc.", required = true) String app,
            @ToolParam(description = "Target host: IP address or domain name", required = true) String host,
            @ToolParam(description = "Target port (optional, auto-detected if not specified)", required = false) Integer port,
            @ToolParam(description = "Collection interval in seconds (default: 600)", required = false) Integer intervals,
            @ToolParam(description = "Username for authentication (optional)", required = false) String username,
            @ToolParam(description = "Password for authentication (optional)", required = false) String password,
            @ToolParam(description = "Database name (for database monitors)", required = false) String database,
            @ToolParam(description = "Additional app-specific parameters as JSON: {\"uri\":\"/api\", \"ssl\":\"true\", \"method\":\"POST\"}", required = false) String additionalParams,
            @ToolParam(description = "Monitor description (optional)", required = false) String description) {
        
        try {
            log.info("Adding monitor: name={}, app={}, host={}", name, app, host);
            
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
            
            // Set defaults
            if (intervals == null || intervals < 10) {
                intervals = 600;
            }
            
            // Create Monitor entity
            Monitor monitor = Monitor.builder()
                    .name(name.trim())
                    .app(app.toLowerCase().trim())
                    .host(host.trim())
                    .intervals(intervals)
                    .status((byte) 1)
                    .type((byte) 0)
                    .description(description != null ? description.trim() : "")
                    .build();
            
            List<Param> params = createBasicParams(host, port, username, password, database, additionalParams);
            
            // Validate that all required parameters for this monitor type are provided
            try {
                List<ParamDefine> requiredParams = monitorServiceAdapter.getMonitorParamDefines(app);
                log.info("Checking required parameters for monitor type '{}': {}", app, requiredParams);
                List<String> missingParams = new ArrayList<>();
                
                for (ParamDefine paramDefine : requiredParams) {
                    if (paramDefine.isRequired()) {
                        String fieldName = paramDefine.getField();
                        boolean hasParam = params.stream()
                                .anyMatch(param -> fieldName.equals(param.getField()));
                        if (!hasParam) {
                            missingParams.add(fieldName);
                        }
                    }
                }
                
                if (!missingParams.isEmpty()) {
                    return String.format("Error: Missing required parameters for monitor type '%s': %s. "
                            + "Use get_monitor_additional_params tool to see all required parameters.", 
                            app, String.join(", ", missingParams));
                }
            } catch (Exception e) {
                log.warn("Could not validate required parameters for monitor type '{}': {}", app, e.getMessage());
            }
            
            // Call adapter - it handles all the complexity (validation, defaults, app-specific logic)
            Long monitorId = monitorServiceAdapter.addMonitor(monitor, params, null);
            
            log.info("Successfully added monitor '{}' with ID: {}", name, monitorId);
            return String.format("Successfully added %s monitor '%s' with ID: %d (Host: %s, Interval: %d seconds)", 
                    app.toUpperCase(), name, monitorId, host, intervals);
            
        } catch (Exception e) {
            log.error("Failed to add monitor '{}': {}", name, e.getMessage(), e);
            return "Error adding monitor '" + name + "': " + e.getMessage();
        }
    }
    
    /**
     * Create basic parameter list from user inputs
     */
    private List<Param> createBasicParams(String host, Integer port, String username, 
                                         String password, String database, String additionalParams) {
        List<Param> params = new ArrayList<>();
        
        // Add host (always required)
        params.add(Param.builder().field("host").paramValue(host.trim()).type((byte) 1).build());
        
        // Add optional common parameters
        if (port != null) {
            params.add(Param.builder().field("port").paramValue(port.toString()).type((byte) 0).build());
        }
        if (username != null && !username.trim().isEmpty()) {
            params.add(Param.builder().field("username").paramValue(username.trim()).type((byte) 1).build());
        }
        if (password != null && !password.trim().isEmpty()) {
            params.add(Param.builder().field("password").paramValue(password.trim()).type((byte) 2).build());
        }
        if (database != null && !database.trim().isEmpty()) {
            params.add(Param.builder().field("database").paramValue(database.trim()).type((byte) 1).build());
        }
        
        // Parse additional parameters if provided
        if (additionalParams != null && !additionalParams.trim().isEmpty()) {
            try {
                String cleaned = additionalParams.trim().replaceAll("[{}]", "");
                String[] pairs = cleaned.split(",");
                for (String pair : pairs) {
                    String[] keyValue = pair.split(":");
                    if (keyValue.length == 2) {
                        String key = keyValue[0].trim().replaceAll("\"", "");
                        String value = keyValue[1].trim().replaceAll("\"", "");
                        params.add(Param.builder().field(key).paramValue(value).type((byte) 1).build());
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse additionalParams: {}", e.getMessage());
            }
        }
        
        return params;
    }
    
    @Override
    @Tool(name = "list_monitor_types", description = """
            List all available monitor types that can be added to HertzBeat.
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
                    .toList();
            
            for (Map.Entry<String, String> entry : sortedTypes) {
                String typeKey = entry.getKey();
                String displayName = entry.getValue();
                response.append("• ").append(typeKey)
                       .append(" - ").append(displayName)
                       .append("\n");
            }
            
            response.append("\nTo add a monitor, use the add_monitor tool with one of these types as the 'app' parameter.");

            log.info("Successfully listed {} monitor types", monitorTypes);
            return response.toString();
            
        } catch (Exception e) {
            log.error("Failed to list monitor types: {}", e.getMessage(), e);
            return "Error retrieving monitor types: " + e.getMessage();
        }
    }
    
    @Override
    @Tool(name = "get_monitor_additional_params", description = """
            Get the parameter definitions required for a specific monitor type.
            This tool shows what parameters are needed when adding a monitor of the specified type,
            ALWAYS use this before adding a monitor to understand what parameters the user needs to provide.
            Use the app parameter to specify the monitor type/application name (e.g., 'linux', 'mysql', 'redis') this can be obtained from the list_monitor_types tool.
            """)
    public String getMonitorAdditionalParams(
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



}
