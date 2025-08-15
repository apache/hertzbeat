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
import org.apache.hertzbeat.ai.agent.adapters.AlertDefineServiceAdapter;
import org.apache.hertzbeat.ai.agent.adapters.MonitorServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.apache.hertzbeat.ai.agent.tools.AlertDefineTools;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Implementation of Alert Definition Tools functionality for threshold configuration
 */
@Slf4j
@Service
public class AlertDefineToolsImpl implements AlertDefineTools {
    @Autowired
    private AlertDefineServiceAdapter alertDefineServiceAdapter;
    @Autowired
    private MonitorServiceAdapter monitorServiceAdapter;

    @Override
    @Tool(name = "create_alert_rule", description = """
            Create a new alert rule with threshold configuration for natural language requests.
            
            Examples of natural language requests this tool handles:
            - "Trigger an alarm when web service response time exceeds 5 seconds"
            - "Send notification when database connection pool usage exceeds 90%"
            - "Alert me when CPU usage is above 85% for 3 consecutive checks"
            - "Create alert for disk space usage over 80%"
            - "Monitor memory usage and alert when above 75%"
            
            Common metric field names by monitor type:
            - HTTP: responseTime, status, size
            - CPU/System: usage, utilization
            - Memory: usage, used_percent, available_percent
            - Disk: usage, used_percent, free_space
            - Database: connections, pool_usage, response_time
            - Network: bandwidth_usage, packet_loss, latency
            
            Operators: > (greater than), < (less than), >= (greater or equal), <= (less or equal), == (equals), != (not equals)
            Priority: critical, warning, info
            """)
    public String createAlertRule(
            @ToolParam(description = "Alert rule name", required = true) String name,
            @ToolParam(description = "Monitor ID to apply rule to (optional if monitorType provided)", required = false) Long monitorId,
            @ToolParam(description = "Metrics type to apply rule", required = true) String monitorType,
            @ToolParam(description = "Metric field name (e.g., 'responseTime', 'usage', 'connections')", required = true) String metric,
            @ToolParam(description = "Comparison operator: >, <, >=, <=, ==, !=", required = true) String operator,
            @ToolParam(description = "Threshold value (e.g., '5000', '90', '80.5')", required = true) String threshold,
            @ToolParam(description = "Number of consecutive violations before triggering (default: 3)", required = true) Integer times,
            @ToolParam(description = "Alert priority: critical, warning, emergency (default: warning)", required = true) String priority,
            @ToolParam(description = "Alert rule description", required = false) String description) {

        try {
            log.info("Creating alert rule: name={}, metric={}, operator={}, threshold={}", name, metric, operator, threshold);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in create_alert_rule tool: {}", subjectSum);

            // Validate required parameters
            if (name == null || name.trim().isEmpty()) {
                return "Error: Alert rule name is required";
            }
            if (metric == null || metric.trim().isEmpty()) {
                return "Error: Metric field name is required";
            }
            if (!isValidOperator(operator)) {
                return "Error: Valid operator is required (>, <, >=, <=, ==, !=)";
            }
            if (threshold == null || threshold.trim().isEmpty()) {
                return "Error: Threshold value is required";
            }

            // Set defaults
            if (times == null || times <= 0) {
                times = 1;
            }
            if (priority == null || priority.trim().isEmpty()) {
                priority = "warning";
            }

            // Validate priority
            if (!isValidPriority(priority)) {
                return "Error: Priority must be 'critical', 'warning', or 'info'";
            }

            // Create expression based on metric and operator
            String expression = buildExpression(metric, operator, threshold);

            // Create alert definition
            Map<String, String> labels = new HashMap<>();
            labels.put("priority", priority.toLowerCase());
            if (monitorType != null) {
                labels.put("monitor_type", monitorType);
            }

            Map<String, String> annotations = new HashMap<>();
            annotations.put("summary", description != null ? description : 
                String.format("Alert when %s %s %s", metric, operator, threshold));
            annotations.put("description", String.format("Monitor metric '%s' has exceeded threshold", metric));

            AlertDefine alertDefine = AlertDefine.builder()
                    .name(name.trim())
                    .type("realtime") // Real-time threshold monitoring
                    .expr(expression)
                    .times(times)
                    .labels(labels)
                    .annotations(annotations)
                    .template(String.format("Alert: {{ $labels.instance }} %s is {{ $value }}", metric))
                    .enable(true)
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
            } else if (monitorType != null) {
                bindingNote = String.format(" (Rule will apply to all '%s' type monitors)", monitorType);
            }

            log.info("Successfully created alert rule '{}' with ID: {}", name, createdAlertDefine.getId());
            return String.format("Successfully created alert rule '%s' with ID: %d. " 
                    + "Expression: %s, Priority: %s, Trigger after: %d consecutive violations%s", 
                    name, createdAlertDefine.getId(), expression, priority, times, bindingNote);

        } catch (Exception e) {
            log.error("Failed to create alert rule '{}': {}", name, e.getMessage(), e);
            return "Error creating alert rule '" + name + "': " + e.getMessage();
        }
    }

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
    @Tool(name = "delete_alert_rule", description = """
            Delete an alert rule permanently.
            Removes the threshold configuration and stops monitoring.
            """)
    public String deleteAlertRule(
            @ToolParam(description = "Alert rule ID", required = true) Long ruleId) {

        try {
            log.info("Deleting alert rule ID: {}", ruleId);

            boolean deleted = alertDefineServiceAdapter.deleteAlertDefine(ruleId);
            
            if (deleted) {
                log.info("Successfully deleted alert rule ID: {}", ruleId);
                return String.format("Successfully deleted alert rule ID: %d", ruleId);
            } else {
                return String.format("Alert rule ID: %d not found or could not be deleted", ruleId);
            }

        } catch (Exception e) {
            log.error("Failed to delete alert rule ID {}: {}", ruleId, e.getMessage(), e);
            return "Error deleting alert rule: " + e.getMessage();
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
}