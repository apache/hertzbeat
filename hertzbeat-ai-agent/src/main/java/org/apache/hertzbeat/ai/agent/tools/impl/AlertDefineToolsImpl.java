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
             VERY VERY IMPORTANT:
                 - ALWAYS USE the value field from the get_apps_metrics_hierarchy's json response when creating alert expressions on the field parameters
            
            EXPRESSION FORMAT:
            equals(__app__,"appname") && equals(__metrics__,"metricname") && [field_conditions]
            
            EXAMPLES ( Do not copy these examples, they are just for reference ):
            These are all just examples, you can take inspiration from them and create a rule based on hierarchy, always ask the user for all params, do not assume them, even for these examples:
            
            1. Kafka JVM Alert:
               - App: "kafka", Metric: "jvm_basic"
               - Field condition: equals(VmName, "arora")
               - Final expression: equals(__app__,"kafka") && equals(__metrics__,"jvm_basic") && equals(VmName, "arora")
            
            2. LLM Credits Alert:
               - App: "openai", Metric: "credit_grants"
               - Field condition: total_granted > some_value
               - Final expression: equals(__app__,"openai") && equals(__metrics__,"credit_grants") && total_granted > 1000
            
            3. HBase Master Alert:
               - App: "hbase_master", Metric: "server"
               - Field condition: heap_memory_used > 80
               - Final expression: equals(__app__,"hbase_master") && equals(__metrics__,"server") && heap_memory_used > 80
            
            4. Complex OpenAI Credits Alert:
               - App: "openai", Metric: "credit_grants"
               - Field condition: total_used > 123 and total_granted > 333 and (total_granted > 3444 and total_paid_available < 5556)
               - Final expression: equals(__app__,"openai") && equals(__metrics__,"credit_grants") &&
                 total_used > 123 and total_granted > 333 and (total_granted > 3444 and total_paid_available < 5556)
            
            FIELD CONDITIONS GUIDANCE:
            - Field names come from metric's children in hierarchy (leaf nodes)
            - Use the "value" field from the metric's children, not the label when creating conditions
            - Supported operators: >, <, >=, <=, ==, !=, equals()
            - Supported logical operators: and, or, not
            - ONLY USE THESE OPERATORS, when creating conditions, do not use any other operators
            - Support grouping with parentheses: (condition1 and condition2) or condition3
            - String values should be quoted: equals(VmName, "arora")
            - Simple conditions: heap_memory_used > 80, total_granted <= 1000
            - Complex conditions: total_used > 123 and total_granted > 333 and (total_granted > 3444 and total_paid_available < 5556)
            
            PRIORITY LEVELS:
            - 0: Critical (immediate action required)
            - 1: Warning (attention needed, default)
            - 2: Info (informational only)
            """)
    public String createAlertRule(
            @ToolParam(description = "Alert rule name (required, must be unique)", required = true) String name,
            @ToolParam(description = "Monitor ID to bind rule to (optional, can bind later)", required = false) Long monitorId,
            @ToolParam(description = "App name from hierarchy (must match exact hierarchy app value)", required = true) String app,
            @ToolParam(description = "Metrics name from hierarchy (must match exact hierarchy metrics value)", required = true) String metrics,
            @ToolParam(description = "Field conditions from metric's children (e.g., 'equals(VmName, \"my-vm\")', "
                    + "'total_granted > 1000', 'total_used > 123 and (total_granted > 3444)')", required = true) String fieldConditions,
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

            // Build the proper HertzBeat expression format
            // Format: equals(__app__,"appname") && equals(__metrics__,"metricname") && [field_conditions]
            String expr = String.format("equals(__app__,\"%s\") && equals(__metrics__,\"%s\") && %s", 
                    app.trim(), metrics.trim(), fieldConditions.trim());

            // Parse labels if provided
            Map<String, String> labelsMap = new HashMap<>();
            if (labels != null && !labels.trim().isEmpty()) {
                labelsMap.putAll(parseKeyValuePairs(labels));
            }
            // Add severity based on priority
            String severityLabel = priority == 0 ? "critical" : (priority == 1 ? "warning" : "info");
            labelsMap.put("severity", severityLabel);

            // Parse annotations if provided
            Map<String, String> annotationsMap = new HashMap<>();
            if (annotations != null && !annotations.trim().isEmpty()) {
                annotationsMap.putAll(parseKeyValuePairs(annotations));
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

            // If monitorId specified, bind the monitor to the alert definition
            String bindingNote = "";
            if (monitorId != null) {
                boolean bound = alertDefineServiceAdapter.bindMonitorToAlertDefine(createdAlertDefine.getId(), monitorId);
                if (bound) {
                    bindingNote = String.format(" (Successfully bound to monitor ID %d)", monitorId);
                } else {
                    bindingNote = String.format(" (Warning: Failed to bind to monitor ID %d - manual binding may be required)", monitorId);
                }
            } else {
                bindingNote = String.format(" (Rule will apply to all %s monitors with %s metrics)", app, metrics);
            }

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
    @Tool(name = "update_alert_threshold", description = """
            Update the threshold value and settings for an existing alert rule.
            Allows modifying trigger conditions for established rules.
            """)
    public String updateAlertThreshold(
            @ToolParam(description = "Alert rule ID", required = true) Long ruleId,
            @ToolParam(description = "New threshold value", required = true) String threshold,
            @ToolParam(description = "New comparison operator (optional)", required = false) String operator,
            @ToolParam(description = "New trigger times (optional)", required = false) Integer times) {

        try {
            log.info("Updating alert threshold for rule ID: {}", ruleId);

            AlertDefine existingRule = alertDefineServiceAdapter.getAlertDefine(ruleId);
            if (existingRule == null) {
                return "Error: Alert rule with ID " + ruleId + " not found";
            }

            // Parse current expression to extract components
            String currentExpr = existingRule.getExpr();
            String[] parts = parseExpression(currentExpr);
            if (parts == null) {
                return "Error: Cannot parse current expression: " + currentExpr;
            }

            String metric = parts[0];
            String currentOperator = parts[1];

            // Use provided values or keep existing ones
            String newOperator = operator != null ? operator : currentOperator;
            Integer newTimes = times != null ? times : existingRule.getTimes();

            if (!isValidOperator(newOperator)) {
                return "Error: Invalid operator. Use >, <, >=, <=, ==, or !=";
            }

            // Build new expression
            String newExpression = buildExpression(metric, newOperator, threshold);

            // Update the rule
            existingRule.setExpr(newExpression);
            existingRule.setTimes(newTimes);

            alertDefineServiceAdapter.updateAlertDefine(existingRule);

            log.info("Successfully updated alert rule ID: {}", ruleId);
            return String.format("Successfully updated alert rule ID: %d. New expression: %s, Trigger times: %d",
                    ruleId, newExpression, newTimes);

        } catch (Exception e) {
            log.error("Failed to update alert threshold for rule ID {}: {}", ruleId, e.getMessage(), e);
            return "Error updating alert threshold: " + e.getMessage();
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

    /**
     * Helper method to validate operator
     */
    private boolean isValidOperator(String operator) {
        return operator != null && (operator.equals(">") || operator.equals("<")
                || operator.equals(">=") || operator.equals("<=")
                || operator.equals("==") || operator.equals("!="));
    }

    /**
     * Helper method to validate priority
     */
    private boolean isValidPriority(String priority) {
        return priority != null && (priority.equalsIgnoreCase("critical")
                || priority.equalsIgnoreCase("warning") || priority.equalsIgnoreCase("info"));
    }

    /**
     * Helper method to build expression
     */
    private String buildExpression(String metric, String operator, String threshold) {
        return String.format("%s %s %s", metric, operator, threshold);
    }

    /**
     * Helper method to parse existing expression into components
     */
    private String[] parseExpression(String expression) {
        if (expression == null || expression.trim().isEmpty()) {
            return null;
        }

        // Simple parsing for basic expressions like "metric > value"
        String[] operators = {">", "<", ">=", "<=", "==", "!="};
        for (String op : operators) {
            if (expression.contains(" " + op + " ")) {
                String[] parts = expression.split(" " + op + " ");
                if (parts.length == 2) {
                    return new String[]{parts[0].trim(), op, parts[1].trim()};
                }
            }
        }
        return null;
    }

    /**
     * Helper method to parse key-value pairs from a string
     * Format: "key1:value1, key2:value2, ..."
     */
    private Map<String, String> parseKeyValuePairs(String input) {
        Map<String, String> result = new HashMap<>();
        if (input == null || input.trim().isEmpty()) {
            return result;
        }

        String[] pairs = input.split(",");
        for (String pair : pairs) {
            String[] keyValue = pair.split(":");
            if (keyValue.length == 2) {
                result.put(keyValue[0].trim(), keyValue[1].trim());
            }
        }
        return result;
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
            Hierarchy metricHierarchy = findMetricInHierarchy(hierarchies, metrics);
            if (metricHierarchy == null) {
                return String.format("Error: Metric '%s' not found for app '%s'. Please use get_apps_metrics_hierarchy to get valid metrics for this app.", metrics, app);
            }
            
            // Extract field names from field conditions and validate them
            List<String> fieldNames = extractFieldNamesFromConditions(fieldConditions);
            for (String fieldName : fieldNames) {
                if (!isFieldValidForMetric(metricHierarchy, fieldName)) {
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

    /**
     * Recursively searches for a metric in the hierarchy
     */
    private Hierarchy findMetricInHierarchy(List<Hierarchy> hierarchies, String metricName) {
        for (Hierarchy hierarchy : hierarchies) {
            // Check if this is the metric we're looking for
            if (metricName.equals(hierarchy.getValue())) {
                // Verify it has field children (leaf nodes)
                if (hierarchy.getChildren() != null && !hierarchy.getChildren().isEmpty()) {
                    boolean hasLeafChildren = hierarchy.getChildren().stream()
                        .anyMatch(child -> child.getIsLeaf() != null && child.getIsLeaf());
                    if (hasLeafChildren) {
                        return hierarchy;
                    }
                }
            }
            
            // Recursively search in children
            if (hierarchy.getChildren() != null) {
                Hierarchy found = findMetricInHierarchy(hierarchy.getChildren(), metricName);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    /**
     * Checks if a field is valid for the given metric
     */
    private boolean isFieldValidForMetric(Hierarchy metricHierarchy, String fieldName) {
        if (metricHierarchy.getChildren() == null) {
            return false;
        }
        
        for (Hierarchy child : metricHierarchy.getChildren()) {
            if (child.getIsLeaf() != null && child.getIsLeaf() && fieldName.equals(child.getValue())) {
                return true;
            }
            // Also check nested children
            if (child.getChildren() != null && isFieldValidForMetric(child, fieldName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Extracts field names from field conditions string
     * Handles simple cases like "field > 80", "equals(field, 'value')", complex expressions
     */
    private List<String> extractFieldNamesFromConditions(String fieldConditions) {
        List<String> fieldNames = new ArrayList<>();
        
        // Split by logical operators (and, or) and parentheses, but preserve the field names
        // This is a simple implementation - could be enhanced with a proper parser
        String[] parts = fieldConditions.split("\\s+(and|or|&&|\\|\\|)\\s+|[()]+");
        
        for (String part : parts) {
            part = part.trim();
            if (part.isEmpty()) {
                continue;
            }
            
            // Handle equals() function: equals(fieldName, "value")
            if (part.contains("equals(")) {
                String fieldName = extractFieldFromEquals(part);
                if (fieldName != null && !fieldNames.contains(fieldName)) {
                    fieldNames.add(fieldName);
                }
            } else {
                // Handle simple comparisons: fieldName > value, fieldName <= value
                String fieldName = extractFieldFromComparison(part);
                if (fieldName != null && !fieldNames.contains(fieldName)) {
                    fieldNames.add(fieldName);
                }
            }
        }
        
        return fieldNames;
    }

    /**
     * Extracts field name from equals() function
     */
    private String extractFieldFromEquals(String condition) {
        // Pattern: equals(fieldName, "value") or equals(fieldName, value)
        int startParen = condition.indexOf('(');
        int comma = condition.indexOf(',');
        
        if (startParen != -1 && comma != -1 && comma > startParen) {
            String fieldName = condition.substring(startParen + 1, comma).trim();
            // Remove quotes if present
            if (fieldName.startsWith("\"") && fieldName.endsWith("\"")) {
                fieldName = fieldName.substring(1, fieldName.length() - 1);
            }
            return fieldName;
        }
        return null;
    }

    /**
     * Extracts field name from comparison operation
     */
    private String extractFieldFromComparison(String condition) {
        // Pattern: fieldName operator value
        String[] operators = {" >= ", " <= ", " > ", " < ", " == ", " != ", " = "};
        
        for (String operator : operators) {
            if (condition.contains(operator)) {
                String fieldName = condition.split(operator)[0].trim();
                // Basic validation - field names shouldn't contain quotes or special chars
                if (fieldName.matches("[a-zA-Z_][a-zA-Z0-9_]*")) {
                    return fieldName;
                }
            }
        }
        return null;
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
                    hierarchyArray.add(formatHierarchyAsJson(mapper, hierarchy));
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

    /**
     * Helper method to format hierarchy structure as JSON recursively
     */
    private ObjectNode formatHierarchyAsJson(ObjectMapper mapper, Hierarchy hierarchy) {
        ObjectNode node = mapper.createObjectNode();

        node.put("value", hierarchy.getValue());
        node.put("label", hierarchy.getLabel());

        if (hierarchy.getIsLeaf() != null && hierarchy.getIsLeaf()) {
            // Leaf node - actual metric field parameter
            node.put("type", "field_parameter");

            if (hierarchy.getType() != null) {
                node.put("dataType", hierarchy.getType() == 0 ? "numeric" : "string");
            }
            if (hierarchy.getUnit() != null && !hierarchy.getUnit().trim().isEmpty()) {
                node.put("unit", hierarchy.getUnit());
            }
            node.put("description", "Available field parameter for alert conditions");
        } else {
            // Category, app, or metric node
            // Determine node type based on children
            boolean hasLeafChildren = hierarchy.getChildren().stream()
                    .anyMatch(child -> child.getIsLeaf() != null && child.getIsLeaf());

            if (hasLeafChildren) {
                node.put("type", "metric");
                node.put("description", "Metric with available field parameters");
            } else {
                node.put("type", "app");
                node.put("description", "Application with available metrics");
            }

            if (hierarchy.getChildren() != null && !hierarchy.getChildren().isEmpty()) {
                ArrayNode childrenArray = mapper.createArrayNode();
                for (Hierarchy child : hierarchy.getChildren()) {
                    childrenArray.add(formatHierarchyAsJson(mapper, child));
                }
                node.set("children", childrenArray);

            }
        }

        return node;
    }
}