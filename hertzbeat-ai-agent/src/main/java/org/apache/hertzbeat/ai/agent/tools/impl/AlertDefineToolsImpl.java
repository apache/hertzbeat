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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.usthe.sureness.subject.SubjectSum;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.adapters.AlertDefineServiceAdapter;
import org.apache.hertzbeat.ai.agent.pojo.dto.Hierarchy;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.apache.hertzbeat.ai.agent.tools.AlertDefineTools;
import org.apache.hertzbeat.ai.agent.utils.UtilityClass;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Implementation of Alert Define Tools functionality
 */
@Slf4j
@Service
public class AlertDefineToolsImpl implements AlertDefineTools {
    @Autowired
    private AlertDefineServiceAdapter alertDefineServiceAdapter;


    @Override
    @Tool(name = "create_alert_rule", description = """
            ALERT RULE means when to alert a user
            THESE ARE ALERT RULES WITH THRESHOLD VALUES. USERS CAN SPECIFY THE THRESHOLD VALUES FOR EXAMPLE,
            IF THE USER SAYS "ALERT ME WHEN MY COST EXCEEDS 700, THE EXPRESSION SHOULD BE 'cost > 700' NOT 'cost < 700'.
            APPLY THE SAME LOGIC FOR LESS THAN OPERATOR.
            Create a HertzBeat alert rule based on app hierarchy structure and user requirements.
            It is important to first understand the hierarchy of apps, metrics, and field conditions
            Each app has its own metrics and each metric has its own field conditions.
            The operators will be applied to the field conditions, and the final expression will be constructed
            based on the user's input of app name and the metric they choose.
            CRITICAL WORKFLOW Do all of this iteratively with user interaction at each step
                1. ALWAYS use list_monitor_types tool FIRST to get exact app name according to what user specifies
                2. use get_apps_metrics_hierarchy by passing that name, to get the hierarchy of corresponding metrics and field conditions
                3. Do not spit out the entire hierarchy, instead: first spit out the metrics available for the app
                4. Ask the user to choose a metric from the available metrics
                5. Based on the metric chosen, present the available field conditions/params
                6. You will construct the proper expression with field conditions
                7. once this tool successfully executes, ask the user if they want to bind any existing monitors to this alert rule,
                get the monitors list for a particular app using the query_monitors tool.
                8. based on the user's output, conditionally call the bind_monitors_to_alert_rule tool to bind monitors to the alert rule
             VERY VERY IMPORTANT:
                 - ALWAYS USE the value field from the get_apps_metrics_hierarchy's json response when creating alert expressions on the field parameters
            
            EXAMPLES FOR FIELD CONDITION EXPRESSION( Do not copy these examples, they are just for reference ):
            These are all just examples, you can take inspiration from them and create a rule based on hierarchy, always ask the user for all params, do not assume them, even for these examples:
            
            1. Kafka JVM Alert:
               - App: "kafka", Metric: "jvm_basic"
               - Field condition: equals(VmName, "myVM")
               - Field condition expression: equals(VmName, "myVM")
            
            2. LLM Credits Alert:
               - App: "openai", Metric: "credit_grants"
               - Field condition: total_granted > some_value
               - Field condition  expression: total_granted > 1000
            
            3. HBase Master Alert:
               - App: "hbase_master", Metric: "server"
               - Field condition: heap_memory_used > 80 or some_factor<100
               - Field condition  expression: heap_memory_used > 80 or some_factor<100
            
            4. Complex OpenAI Credits Alert:
               - App: "openai", Metric: "credit_grants"
               - Field condition: total_used > 123 and total_granted > 333 and (total_granted > 3444 and total_paid_available < 5556)
               - Field condition expression: total_used > 123 and total_granted > 333 and (total_granted > 3444 and total_paid_available < 5556)
            
            FIELD CONDITIONS GUIDANCE:
            - Field names come from metric's children in hierarchy (leaf nodes)
            - Use the "value" field from the metric's children, not the label when creating conditions
            - Supported operators: >, <, >=, <=, ==, !=, exists(), !exists() for numeric fields
            - equals(), contains(), matches(),exists(), !equals(), !contains(), !matches(), !exists() for string fields
            - Supported logical operators: and, or to connect different field parameter rules or rulesets
            - ONLY USE THESE OPERATORS, when creating conditions, do not use any other operators
            - Support grouping with parentheses: (condition1 and condition2) or condition3
            - String values should be quoted: equals(VmName, "my-vm")
            - Simple conditions: heap_memory_used > 80, total_granted <= 1000
            - Complex conditions: total_used > 123 and total_granted > 333 and (total_granted > 3444 and total_paid_available < 5556)
            
            PRIORITY LEVELS:
            - 0: Critical (immediate action required)
            - 1: Warning (attention needed, default)
            - 2: Info (informational only)
            """)
    public String createAlertRule(
            @ToolParam(description = "Alert rule name (required, must be unique)", required = true) String name,
            @ToolParam(description = "App name from hierarchy (must match exact hierarchy app value)", required = true) String app,
            @ToolParam(description = "Metrics name from hierarchy (must match exact hierarchy metrics value)", required = true) String metrics,
            @ToolParam(description = "Field conditions expression)", required = true) String fieldConditions,
            @ToolParam(description = "Alert rule type: 'realtime' (default) or 'periodic'", required = false) String type,
            @ToolParam(description = "Execution period in seconds (only for periodic rules, default: 300)", required = false) Integer period,
            @ToolParam(description = "Number of consecutive violations before triggering (default: 3)", required = false) Integer times,
            @ToolParam(description = "Alert priority as integer: 0=critical, 1=warning, 2=info (default: 1)", required = false) Integer priority,
            @ToolParam(description = "Alert rule description (optional)", required = false) String description,
            @ToolParam(description = "Alert message template with variables (optional)", required = false) String template,
            @ToolParam(description = "Data source type: 'promql' (default)", required = false) String datasource,
            @ToolParam(description = "Labels as key:value pairs separated by commas (e.g., 'env:prod,severity:critical')", required = false) String labels,
            @ToolParam(description = "Annotations as key:value pairs separated by commas (e.g., 'summary:High CPU')", required = false) String annotations,
            @ToolParam(description = "Whether to enable the rule immediately (default: true)", required = false) Boolean enable) {

        try {
            log.info("Creating HertzBeat alert rule: name={}, app={}, metrics={}, fieldConditions={}", name, app, metrics, fieldConditions);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in create_alert_rule tool: {}", subjectSum);

            // Validate required parameters
            if (name == null || name.trim().isEmpty()) {
                return "Error: Alert rule name is required";
            }
            if (app == null || app.trim().isEmpty()) {
                return "Error: App name is required (use get_apps_metrics_hierarchy to find exact names)";
            }
            if (metrics == null || metrics.trim().isEmpty()) {
                return "Error: Metrics name is required (use get_apps_metrics_hierarchy to find exact names)";
            }
            if (fieldConditions == null || fieldConditions.trim().isEmpty()) {
                return "Error: Field conditions are required (e.g., 'equals(VmName, \"arora\")', 'total_granted > 1000')";
            }

            // Set defaults
            if (type == null || type.trim().isEmpty()) {
                type = "realtime";
            }
            if (times == null || times <= 0) {
                times = 3;
            }
            if (priority == null) {
                priority = 1; // Default to warning
            }
            if (enable == null) {
                enable = true;
            }
            if (datasource == null || datasource.trim().isEmpty()) {
                datasource = "promql";
            }

            // Validate alert type
            if (!type.equals("realtime") && !type.equals("periodic")) {
                return "Error: Alert type must be 'realtime' or 'periodic'";
            }

            // Validate priority
            if (priority < 0 || priority > 2) {
                return "Error: Priority must be 0 (critical), 1 (warning), or 2 (info)";
            }

            // For periodic rules, validate period parameter
            if (type.equals("periodic")) {
                if (period == null || period <= 0) {
                    period = 300; // Default 5 minutes
                }
            }

            // CRITICAL VALIDATION: Verify app-metric-field relationships using hierarchy
            String validationResult = validateHierarchyRelationships(app.trim(), metrics.trim(), fieldConditions.trim());
            if (!validationResult.equals("VALID")) {
                return validationResult; // Return validation error message
            }

            // EXPRESSION VALIDATION: Verify field conditions syntax and operators
            String expressionValidation = UtilityClass.validateExpressionSyntax(fieldConditions.trim());
            if (!expressionValidation.equals("VALID")) {
                return expressionValidation; // Return expression validation error message
            }

            String expr = String.format("equals(__app__,\"%s\") && equals(__metrics__,\"%s\") && %s", 
                    app.trim(), metrics.trim(), fieldConditions.trim());



            // Parse labels if provided
            Map<String, String> labelsMap = new HashMap<>();
            if (labels != null && !labels.trim().isEmpty()) {
                labelsMap.putAll(UtilityClass.parseKeyValuePairs(labels));
            }
            // Add severity based on priority
            String severityLabel = priority == 0 ? "critical" : (priority == 1 ? "warning" : "info");
            labelsMap.put("severity", severityLabel);

            // Parse annotations if provided
            Map<String, String> annotationsMap = new HashMap<>();
            if (annotations != null && !annotations.trim().isEmpty()) {
                annotationsMap.putAll(UtilityClass.parseKeyValuePairs(annotations));
            }
            // Add default annotations if not provided
            if (!annotationsMap.containsKey("summary")) {
                annotationsMap.put("summary", description != null ? description :
                    String.format("Alert for %s %s when %s", app, metrics, fieldConditions));
            }
            if (!annotationsMap.containsKey("description")) {
                annotationsMap.put("description", String.format("Monitor %s metrics %s with conditions: %s", app, metrics, fieldConditions));
            }

            // Generate default template if not provided
            if (template == null || template.trim().isEmpty()) {
                template = String.format("Alert: %s %s - %s", app, metrics, fieldConditions);
            }

            // Create comprehensive alert definition
            AlertDefine alertDefine = AlertDefine.builder()
                    .name(name.trim())
                    .type(type)
                    .expr(expr)
                    .period(period)
                    .times(times)
                    .labels(labelsMap)
                    .annotations(annotationsMap)
                    .template(template)
                    .datasource(datasource)
                    .enable(enable)
                    .build();

            AlertDefine createdAlertDefine = alertDefineServiceAdapter.addAlertDefine(alertDefine);

            // Note: Monitor binding is handled separately via bind_monitors_to_alert_rule tool
            String bindingNote = String.format(" (Use bind_monitors_to_alert_rule tool to associate specific monitors)");

            log.info("Successfully created alert rule '{}' with ID: {}", name, createdAlertDefine.getId());
            
            StringBuilder response = new StringBuilder();
            response.append(String.format("Successfully created %s alert rule '%s' with ID: %d\n", 
                    type, name, createdAlertDefine.getId()));
            response.append(String.format("Expression: %s\n", expr));
            response.append(String.format("Priority: %d (%s)\n", priority, severityLabel));
            response.append(String.format("Trigger after: %d consecutive violations\n", times));
            if (type.equals("periodic")) {
                response.append(String.format("Execution period: %d seconds\n", period));
            }
            response.append(String.format("Data source: %s\n", datasource));
            response.append(String.format("Enabled: %s\n", enable));
            if (!labelsMap.isEmpty()) {
                response.append(String.format("Labels: %s\n", labelsMap));
            }
            response.append(bindingNote);

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to create alert rule '{}': {}", name, e.getMessage(), e);
            return "Error creating alert rule '" + name + "': " + e.getMessage();
        }
    }

    // ... other existing methods would go here ...

    @Override
    @Tool(name = "list_alert_rules", description = """
            List existing alert rules with filtering options.
            Shows configured thresholds and alert definitions.
            """)
    public String listAlertRules(
            @ToolParam(description = "Search term for rule name or description", required = false) String search,
            @ToolParam(description = "Filter by monitor type", required = false) String monitorType,
            @ToolParam(description = "Filter by enabled status", required = false) Boolean enabled,
            @ToolParam(description = "Page index (default: 0)", required = false) Integer pageIndex,
            @ToolParam(description = "Page size (default: 10)", required = false) Integer pageSize) {

        try {
            log.info("Listing alert rules: search={}, monitorType={}, enabled={}", search, monitorType, enabled);

            if (pageIndex == null || pageIndex < 0) {
                pageIndex = 0;
            }
            if (pageSize == null || pageSize <= 0) {
                pageSize = 10;
            }

            Page<AlertDefine> result = alertDefineServiceAdapter.getAlertDefines(
                    search, monitorType, enabled, "gmtCreate", "desc", pageIndex, pageSize);

            StringBuilder response = new StringBuilder();
            response.append("Found ").append(result.getContent().size())
                    .append(" alert rules (Total: ").append(result.getTotalElements()).append("):\n\n");

            for (AlertDefine alertDefine : result.getContent()) {
                response.append("Rule ID: ").append(alertDefine.getId()).append("\n");
                response.append("Name: ").append(alertDefine.getName()).append("\n");
                response.append("Expression: ").append(alertDefine.getExpr()).append("\n");
                response.append("Type: ").append(alertDefine.getType()).append("\n");
                response.append("Trigger Times: ").append(alertDefine.getTimes()).append("\n");
                response.append("Enabled: ").append(alertDefine.isEnable()).append("\n");

                if (alertDefine.getLabels() != null && !alertDefine.getLabels().isEmpty()) {
                    response.append("Labels: ").append(alertDefine.getLabels()).append("\n");
                }
                if (alertDefine.getAnnotations() != null && !alertDefine.getAnnotations().isEmpty()) {
                    response.append("Summary: ").append(alertDefine.getAnnotations().get("summary")).append("\n");
                }
                response.append("Created: ").append(alertDefine.getGmtCreate()).append("\n");
                response.append("\n");
            }

            if (result.getContent().isEmpty()) {
                response.append("No alert rules found matching the specified criteria.");
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to list alert rules: {}", e.getMessage(), e);
            return "Error retrieving alert rules: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "toggle_alert_rule", description = """
            Enable or disable an alert rule.
            Allows activating or deactivating threshold monitoring.
            """)
    public String toggleAlertRule(
            @ToolParam(description = "Alert rule ID", required = true) Long ruleId,
            @ToolParam(description = "Whether to enable the rule", required = true) Boolean enabled) {

        try {
            log.info("Toggling alert rule ID: {} to enabled: {}", ruleId, enabled);

            alertDefineServiceAdapter.toggleAlertDefineStatus(ruleId, enabled);

            log.info("Successfully toggled alert rule ID: {} to enabled: {}", ruleId, enabled);
            return String.format("Successfully %s alert rule ID: %d",
                    enabled ? "enabled" : "disabled", ruleId);

        } catch (Exception e) {
            log.error("Failed to toggle alert rule ID {}: {}", ruleId, e.getMessage(), e);
            return "Error toggling alert rule: " + e.getMessage();
        }
    }


    @Override
    @Tool(name = "get_alert_rule_details", description = """
            Get detailed information about a specific alert rule.
            Shows complete threshold configuration and rule settings.
            """)
    public String getAlertRuleDetails(
            @ToolParam(description = "Alert rule ID", required = true) Long ruleId) {

        try {
            log.info("Getting alert rule details for ID: {}", ruleId);

            AlertDefine alertDefine = alertDefineServiceAdapter.getAlertDefine(ruleId);
            if (alertDefine == null) {
                return "Alert rule with ID " + ruleId + " not found";
            }

            StringBuilder response = new StringBuilder();
            response.append("ALERT RULE DETAILS\n");
            response.append("==================\n\n");

            response.append("Rule ID: ").append(alertDefine.getId()).append("\n");
            response.append("Name: ").append(alertDefine.getName()).append("\n");
            response.append("Type: ").append(alertDefine.getType()).append("\n");
            response.append("Expression: ").append(alertDefine.getExpr()).append("\n");
            response.append("Trigger Times: ").append(alertDefine.getTimes()).append("\n");
            response.append("Enabled: ").append(alertDefine.isEnable()).append("\n");

            if (alertDefine.getPeriod() != null) {
                response.append("Period: ").append(alertDefine.getPeriod()).append(" seconds\n");
            }

            if (alertDefine.getLabels() != null && !alertDefine.getLabels().isEmpty()) {
                response.append("Labels: ").append(alertDefine.getLabels()).append("\n");
            }

            if (alertDefine.getAnnotations() != null && !alertDefine.getAnnotations().isEmpty()) {
                response.append("Annotations: ").append(alertDefine.getAnnotations()).append("\n");
            }

            if (alertDefine.getTemplate() != null) {
                response.append("Template: ").append(alertDefine.getTemplate()).append("\n");
            }

            response.append("Created: ").append(alertDefine.getGmtCreate()).append("\n");
            response.append("Modified: ").append(alertDefine.getGmtUpdate()).append("\n");
            response.append("Creator: ").append(alertDefine.getCreator()).append("\n");
            response.append("Modifier: ").append(alertDefine.getModifier()).append("\n");

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get alert rule details for ID {}: {}", ruleId, e.getMessage(), e);
            return "Error retrieving alert rule details: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "get_apps_metrics_hierarchy", description = """
            Get the hierarchical structure of all available apps and their metrics for alert rule creation.
            This tool provides the exact app name, metric name and corresponding param names according to each metric.
            Returns structured JSON data showing the complete hierarchy with field parameters for alert expressions.
            
            JSON Structure:
            - app: The application name
            - description: Tool description
            - hierarchy: Array of hierarchical data
              - Each node has: value, label, type, description
              - Leaf nodes have: dataType (numeric/string), unit (if applicable)
              - Non-leaf nodes have: children array
             VERY IMPORTANT:
              - ALWAYS USE the value field from the field parameters when creating alert expressions.
            
            This structured data is needed to create proper alert expressions.
            """)
    public String getAppsMetricsHierarchy(
            @ToolParam(description = "App/Monitor type to get hierarchy for (e.g., 'linux', 'mysql', 'website')", required = true) String app) {

        try {
            log.info("Getting apps metrics hierarchy for app: {}", app);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in get_apps_metrics_hierarchy tool: {}", subjectSum);

            List<Hierarchy> hierarchies;
            hierarchies = alertDefineServiceAdapter.getAppHierarchy(app.trim().toLowerCase(), "en-US");


            ObjectMapper mapper = new ObjectMapper();
            ObjectNode result = mapper.createObjectNode();

            result.put("app", app.toUpperCase());

            if (hierarchies != null && !hierarchies.isEmpty()) {
                ArrayNode hierarchyArray = mapper.createArrayNode();
                for (Hierarchy hierarchy : hierarchies) {
                    hierarchyArray.add(UtilityClass.formatHierarchyAsJson(mapper, hierarchy));
                }
                result.set("hierarchy", hierarchyArray);
            } else {
                result.put("message", "No hierarchy data available");
            }

            String jsonResult = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);
            log.info("Hierarchy JSON: {}", jsonResult);

            return jsonResult;

        } catch (Exception e) {
            log.error("Failed to get apps metrics hierarchy: {}", e.getMessage(), e);
            return "Error retrieving apps metrics hierarchy: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "bind_monitors_to_alert_rule", description = """
            Bind monitors to an alert rule.
            Call this tool if users want to bind specific monitors to their alert rule.
            Get the right monitor ids for a particular app using the query_monitors tool.
            Get the alert rule ID from the create_alert_rule tool output OR use the list_alert_rules tool with app_name search filter, if the output of create_alert_rule is not applicable.
            If monitors are already bound, this will add the new ones to the existing bindings.
            """)
    public String bindMonitorsToAlertRule(
            @ToolParam(description = "Alert rule ID to bind monitors to", required = true) Long ruleId,
            @ToolParam(description = "Comma-separated list of monitor IDs to bind", required = true) String monitorIds) {
        try {
            log.info("Binding monitors to alert rule ID: {}, monitors: {}", ruleId, monitorIds);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in bind_monitors_to_alert_rule tool: {}", subjectSum);

            if (ruleId == null || ruleId <= 0) {
                return "Error: Valid alert rule ID is required";
            }
            if (monitorIds == null) {
                return "Error: Monitor IDs are required";
            }

            // Get the existing alert rule
            AlertDefine existingRule = alertDefineServiceAdapter.getAlertDefine(ruleId);
            if (existingRule == null) {
                return String.format("Error: Alert rule with ID %d not found", ruleId);
            }

            // Parse monitor IDs from comma-separated string
            String[] monitorIdArray = monitorIds.split(",");
            List<String> validMonitorIds = new ArrayList<>();
            
            for (String monitorId : monitorIdArray) {
                String trimmedId = monitorId.trim();
                if (!trimmedId.isEmpty()) {
                    try {
                        Long.parseLong(trimmedId); // Validate it's a number
                        validMonitorIds.add(trimmedId);
                    } catch (NumberFormatException e) {
                        return String.format("Error: Invalid monitor ID '%s'. Monitor IDs must be numeric.", trimmedId);
                    }
                }
            }
            
            if (validMonitorIds.isEmpty()) {
                return "Error: No valid monitor IDs provided";
            }

            // Build the monitor instance condition
            String monitorCondition;
            if (validMonitorIds.size() == 1) {
                monitorCondition = String.format("equals(__instance__, \"%s\")", validMonitorIds.get(0));
            } else {
                StringBuilder conditionBuilder = new StringBuilder("(");
                for (int i = 0; i < validMonitorIds.size(); i++) {
                    if (i > 0) {
                        conditionBuilder.append(" or ");
                    }
                    conditionBuilder.append(String.format("equals(__instance__, \"%s\")", validMonitorIds.get(i)));
                }
                conditionBuilder.append(")");
                monitorCondition = conditionBuilder.toString();
            }

            // Get the current expression and modify it
            String currentExpr = existingRule.getExpr();
            String newExpr;
            
            // Check if the expression already has __instance__ conditions
            if (currentExpr.contains("__instance__")) {
                // Extract existing monitor IDs and merge with new ones
                List<String> existingMonitorIds = UtilityClass.extractExistingMonitorIds(currentExpr);
                
                // Add new monitor IDs that aren't already present
                for (String newId : validMonitorIds) {
                    if (!existingMonitorIds.contains(newId)) {
                        existingMonitorIds.add(newId);
                    }
                }
                
                String updatedMonitorCondition;
                if (existingMonitorIds.size() == 1) {
                    updatedMonitorCondition = String.format("equals(__instance__, \"%s\")", existingMonitorIds.get(0));
                } else {
                    StringBuilder conditionBuilder = new StringBuilder("(");
                    for (int i = 0; i < existingMonitorIds.size(); i++) {
                        if (i > 0) {
                            conditionBuilder.append(" or ");
                        }
                        conditionBuilder.append(String.format("equals(__instance__, \"%s\")", existingMonitorIds.get(i)));
                    }
                    conditionBuilder.append(")");
                    updatedMonitorCondition = conditionBuilder.toString();
                }
                
                // Replace existing __instance__ conditions with updated ones
                newExpr = UtilityClass.replaceInstanceConditions(currentExpr, updatedMonitorCondition);
                
                // Update the alert rule
                existingRule.setExpr(newExpr);
                alertDefineServiceAdapter.modifyAlertDefine(existingRule);
                
                log.info("Successfully added monitors {} to existing bindings for alert rule ID: {}", validMonitorIds, ruleId);
                return String.format("Successfully added %d new monitor(s) to alert rule ID %d.\nTotal bound monitors: %s\nUpdated expression: %s", 
                    validMonitorIds.size(), ruleId, String.join(", ", existingMonitorIds), newExpr);
            }
            
            // Insert the monitor condition after the metrics condition
            // Pattern: equals(__app__,"app") && equals(__metrics__,"metric") && [existing_conditions]
            // Result: equals(__app__,"app") && equals(__metrics__,"metric") && [monitor_condition] && [existing_conditions]
            
            if (currentExpr.matches(".*equals\\(__app__,\"[^\"]+\"\\)\\s*&&\\s*equals\\(__metrics__,\"[^\"]+\"\\)\\s*&&\\s*.*")) {
                // Find the position after the metrics condition
                String metricsPattern = "equals\\(__metrics__,\"[^\"]+\"\\)";
                java.util.regex.Pattern regex = java.util.regex.Pattern.compile(metricsPattern);
                java.util.regex.Matcher matcher = regex.matcher(currentExpr);
                
                if (matcher.find()) {
                    int metricsEnd = matcher.end();
                    // Find the " && " after the metrics condition
                    int andPosition = currentExpr.indexOf(" && ", metricsEnd);
                    if (andPosition != -1) {
                        String beforeAndPosition = currentExpr.substring(0, andPosition + 4); // Include " && "
                        String afterAndPosition = currentExpr.substring(andPosition + 4); // Everything after " && "
                        newExpr = beforeAndPosition + monitorCondition + " && " + afterAndPosition;
                    } else {
                        return String.format("Error: Unable to find field conditions after metrics in expression: %s", currentExpr);
                    }
                } else {
                    return String.format("Error: Unable to parse metrics condition in expression: %s", currentExpr);
                }
            } else {
                return String.format("Error: Expression format not supported for monitor binding: %s", currentExpr);
            }

            // Update the alert rule
            existingRule.setExpr(newExpr);
            alertDefineServiceAdapter.modifyAlertDefine(existingRule);

            log.info("Successfully bound monitors {} to alert rule ID: {}", validMonitorIds, ruleId);
            return String.format("Successfully bound %d monitor(s) to alert rule ID %d.\nMonitor IDs: %s\nUpdated expression: %s", 
                validMonitorIds.size(), ruleId, String.join(", ", validMonitorIds), newExpr);

        } catch (Exception e) {
            log.error("Failed to bind monitors to alert rule ID {}: {}", ruleId, e.getMessage(), e);
            return String.format("Error binding monitors to alert rule: %s", e.getMessage());
        }
    }


    /**
     * Validates that the app, metric, and field conditions are valid according to hierarchy
     * @param app App name to validate
     * @param metrics Metric name to validate for the app
     * @param fieldConditions Field conditions to validate for the metric
     * @return "VALID" if all relationships are correct, error message otherwise
     */
    private String validateHierarchyRelationships(String app, String metrics, String fieldConditions) {
        try {
            log.debug("Validating hierarchy relationships: app={}, metrics={}, fieldConditions={}", app, metrics, fieldConditions);

            // Get hierarchy for the specified app
            List<Hierarchy> hierarchies = alertDefineServiceAdapter.getAppHierarchy(app.toLowerCase(), "en-US");

            if (hierarchies == null || hierarchies.isEmpty()) {
                return String.format("Error: App '%s' not found in hierarchy. Please use list_monitor_types to get valid app names.", app);
            }

            // Find the metric in the app's hierarchy
            Hierarchy metricHierarchy = UtilityClass.findMetricInHierarchy(hierarchies, metrics);
            if (metricHierarchy == null) {
                return String.format("Error: Metric '%s' not found for app '%s'. Please use get_apps_metrics_hierarchy to get valid metrics for this app.", metrics, app);
            }

            // Extract field names from field conditions and validate them
            List<String> fieldNames = UtilityClass.extractFieldNamesFromConditions(fieldConditions);
            for (String fieldName : fieldNames) {
                if (!UtilityClass.isFieldValidForMetric(metricHierarchy, fieldName)) {
                    return String.format("Error: Field '%s' not found for metric '%s' in app '%s'. Please use get_apps_metrics_hierarchy to get valid field parameters.", fieldName, metrics, app);
                }
            }

            log.debug("Hierarchy validation passed for app={}, metrics={}", app, metrics);
            return "VALID";

        } catch (Exception e) {
            log.error("Error during hierarchy validation: {}", e.getMessage(), e);
            return String.format("Error: Unable to validate hierarchy relationships: %s", e.getMessage());
        }
    }

}