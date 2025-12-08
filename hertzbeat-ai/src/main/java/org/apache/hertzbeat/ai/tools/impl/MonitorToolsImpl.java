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

package org.apache.hertzbeat.ai.tools.impl;

import com.usthe.sureness.subject.SubjectSum;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.config.McpContextHolder;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.ai.utils.UtilityClass;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.tools.MonitorTools;
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
    private MonitorService monitorService;
    @Autowired
    private AppService appService;

    /**
     * Tool to query monitor information with flexible filtering and pagination.
     * Supports filtering by monitor IDs, type, status, host, labels, sorting, and
     * pagination.
     * Returns detailed monitor information including ID, name, type, host, and status.
     */
    @Override
    @Tool(name = "query_monitors", description = """
            HertzBeat: Query Existing/configured monitors in HertzBeat.
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

            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject: {}", subjectSum);

            Page<Monitor> result = monitorService.getMonitors(
                    ids, app, search, status, sort, order, pageIndex, pageSize, labels);
            log.debug("MonitorService.getMonitors result: {}", result);

            StringBuilder response = new StringBuilder();
            response.append("MONITOR QUERY RESULTS\n");
            response.append("====================\n\n");

            // Include statistics if requested
            if (includeStats) {
                // Get status distribution by calling with different status values
                long onlineCount = monitorService.getMonitors(null, app, search, (byte) 1, null, null, 0, 1000, labels).getTotalElements();
                long offlineCount = monitorService.getMonitors(null, app, search, (byte) 2, null, null, 0, 1000, labels).getTotalElements();
                long unreachableCount = monitorService.getMonitors(null, app, search, (byte) 3, null, null, 0, 1000, labels).getTotalElements();
                long pausedCount = monitorService.getMonitors(null, app, search, (byte) 0, null, null, 0, 1000, labels).getTotalElements();

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
                       .append(" | Instance: ").append(monitor.getInstance())
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
            HertzBeat: Add a new monitoring target to HertzBeat with comprehensive configuration.
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

            PARAMETER MAPPING: Use the 'params' parameter to pass all monitor-specific configuration.
            The params should be a JSON string containing key-value pairs for the monitor type.
            Use get_monitor_additional_params tool to see what parameters are required for each monitor type.

            PARAMS EXAMPLES:
            - Website: {"host":"example.com", "port":"443", "uri":"/api/health", "ssl":"true", "method":"GET"}
            - Linux: {"host":"192.168.1.10", "port":"22", "username":"root", "password":"xxx"}
            - MySQL: {"host":"db.server.com", "port":"3306", "username":"admin", "password":"xxx", "database":"mydb"}
            - Redis: {"host":"redis.server.com", "port":"6379", "password":"xxx"}
            """)
    public String addMonitor(
            @ToolParam(description = "Monitor name (required)", required = true) String name,
            @ToolParam(description = "Monitor type: website, mysql, postgresql, redis, linux, windows, etc.", required = true) String app,
            @ToolParam(description = "Collection interval in seconds (default: 600)", required = false) Integer intervals,
            @ToolParam(description = "Monitor-specific parameters as JSON string. "
                    + "Use get_monitor_additional_params to see required fields. "
                    + "Example: {\"host\":\"192.168.1.1\", \"port\":\"22\", \"username\":\"root\"}",
                    required = true) String params,
            @ToolParam(description = "Monitor description (optional)", required = false) String description) {

        try {
            log.info("Adding monitor: name={}, app={}", name, app);

            // Validate required parameters
            if (name == null || name.trim().isEmpty()) {
                return "Error: Monitor name is required";
            }
            if (app == null || app.trim().isEmpty()) {
                return "Error: Monitor type/application is required";
            }
            if (params == null || params.trim().isEmpty()) {
                return "Error: Monitor params is required. Use get_monitor_additional_params to see required fields for this monitor type.";
            }

            // Set defaults
            if (intervals == null || intervals < 10) {
                intervals = 600;
            }

            // Parse params to extract host and port for instance
            List<Param> paramList = parseParams(params);
            String host = paramList.stream()
                    .filter(p -> "host".equals(p.getField()))
                    .map(Param::getParamValue)
                    .findFirst()
                    .orElse("");
            String port = paramList.stream()
                    .filter(p -> "port".equals(p.getField()))
                    .map(Param::getParamValue)
                    .findFirst()
                    .orElse(null);

            String instance = (port != null && !port.isEmpty()) ? host.trim() + ":" + port : host.trim();

            // Create Monitor entity
            Monitor monitor = Monitor.builder()
                    .name(name.trim())
                    .app(app.toLowerCase().trim())
                    .instance(instance)
                    .intervals(intervals)
                    .status((byte) 1)
                    .type((byte) 0)
                    .description(description != null ? description.trim() : "")
                    .build();

            // Validate that all required parameters for this monitor type are provided
            try {
                MonitorDto monitorDto = MonitorDto.builder().monitor(monitor).params(paramList).build();
                monitorService.validate(monitorDto, false);
            } catch (IllegalArgumentException argumentException) {
                if (argumentException.getMessage().contains("required")) {
                    return String.format("Error: %s. "
                            + "Or use get_monitor_additional_params tool to see all required parameters.",
                        argumentException.getMessage());
                } else {
                    return String.format("Error: %s. ", argumentException.getMessage());
                }
            }
            monitorService.addMonitor(monitor, paramList, null, null);
            log.info("Successfully added monitor '{}' with ID: {}", monitor.getName(), monitor.getId());
            return String.format("Successfully added %s monitor '%s' with ID: %d (Instance: %s, Interval: %d seconds)",
                    app.toUpperCase(), monitor.getName(), monitor.getId(), monitor.getInstance(), monitor.getIntervals());

        } catch (Exception e) {
            log.error("Failed to add monitor '{}': {}", name, e.getMessage(), e);
            return "Error adding monitor '" + name + "': " + e.getMessage();
        }
    }

    /**
     * Parse params JSON string to list of Param objects
     */
    private List<Param> parseParams(String params) {
        List<Param> paramList = new ArrayList<>();

        if (params == null || params.trim().isEmpty()) {
            return paramList;
        }

        try {
            String cleaned = params.trim();
            // Remove outer braces if present
            if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
                cleaned = cleaned.substring(1, cleaned.length() - 1);
            }

            // Split by comma, but handle values that might contain commas within quotes
            List<String> pairs = splitJsonPairs(cleaned);

            for (String pair : pairs) {
                int colonIndex = pair.indexOf(':');
                if (colonIndex > 0) {
                    String key = pair.substring(0, colonIndex).trim().replaceAll("\"", "");
                    String value = pair.substring(colonIndex + 1).trim().replaceAll("\"", "");

                    // Determine param type based on field name
                    byte paramType = determineParamType(key);
                    paramList.add(Param.builder().field(key).paramValue(value).type(paramType).build());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse params: {}", e.getMessage());
        }

        return paramList;
    }

    /**
     * Split JSON key-value pairs, handling quoted values that may contain commas
     */
    private List<String> splitJsonPairs(String json) {
        List<String> pairs = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (char c : json.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
                current.append(c);
            } else if (c == ',' && !inQuotes) {
                if (current.length() > 0) {
                    pairs.add(current.toString().trim());
                    current = new StringBuilder();
                }
            } else {
                current.append(c);
            }
        }

        if (current.length() > 0) {
            pairs.add(current.toString().trim());
        }

        return pairs;
    }

    /**
     * Determine param type based on field name
     */
    private byte determineParamType(String fieldName) {
        if ("password".equalsIgnoreCase(fieldName) || "privateKey".equalsIgnoreCase(fieldName)) {
            return (byte) 2; // Password type
        } else if ("port".equalsIgnoreCase(fieldName) || "timeout".equalsIgnoreCase(fieldName)) {
            return (byte) 0; // Number type
        }
        return (byte) 1; // Default string type
    }

    @Override
    @Tool(name = "list_monitor_types", description = """
            HertzBeat: List all available monitor types that can be added to HertzBeat.
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

            // Get available monitor types from app service
            Map<String, String> monitorTypes = appService.getI18nApps(language);

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
    @Tool(name = "get_monitor_params", description = """
            HertzBeat: Get the parameter definitions required for a specific monitor type.
            This tool shows what parameters are needed when adding a monitor of the specified type,
            ALWAYS use this before adding a monitor to understand what parameters the user needs to provide.
            Use the app parameter to specify the monitor type/application name (e.g., 'linux', 'mysql', 'redis') this can be obtained from the list_monitor_types tool.
            """)
    public String getMonitorParams(
            @ToolParam(description = "Monitor type/application name (e.g., 'linux', 'mysql', 'redis')", required = true) String app) {

        try {
            log.info("Getting parameter definitions for monitor type: {}", app);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in get_monitor_param_defines tool: {}", subjectSum);

            // Validate required parameter
            if (app == null || app.trim().isEmpty()) {
                return "Error: Monitor type/application parameter is required";
            }

            // Get parameter definitions from app service
            List<ParamDefine> paramDefines = appService.getAppParamDefines(app.toLowerCase().trim());

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
