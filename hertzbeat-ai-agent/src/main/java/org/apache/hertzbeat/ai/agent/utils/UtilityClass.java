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

package org.apache.hertzbeat.ai.agent.utils;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.pojo.dto.Hierarchy;

import java.lang.reflect.Method;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Utility class providing helper methods for field expression validation, parsing,
 * hierarchy management, timestamp formatting and metric/status conversions.
 * This class contains stateless utility methods used across the application for
 * common operations and validations.
 */
@Slf4j
@lombok.experimental.UtilityClass
public class UtilityClass {
    
    /**
     * Validates the syntax of field conditions expression
     * @param fieldConditions Field conditions string to validate
     * @return "VALID" if syntax is correct, error message otherwise
     */
    
    public String validateExpressionSyntax(String fieldConditions) {
        try {
            log.debug("Validating expression syntax: {}", fieldConditions);

            // Check for basic syntax requirements
            if (fieldConditions == null || fieldConditions.trim().isEmpty()) {
                return "Error: Field conditions cannot be empty";
            }

            // Check for balanced parentheses
            if (!hasBalancedParentheses(fieldConditions)) {
                return "Error: Unbalanced parentheses in field conditions. Please check your expression syntax.";
            }

            // Validate operators used in the expression
            String operatorValidation = validateOperators(fieldConditions);
            if (!operatorValidation.equals("VALID")) {
                return operatorValidation;
            }

            // Validate logical connectors
            String logicalValidation = validateLogicalConnectors(fieldConditions);
            if (!logicalValidation.equals("VALID")) {
                return logicalValidation;
            }

            // Validate function syntax (equals, contains, etc.)
            String functionValidation = validateFunctions(fieldConditions);
            if (!functionValidation.equals("VALID")) {
                return functionValidation;
            }

            log.debug("Expression syntax validation passed for: {}", fieldConditions);
            return "VALID";

        } catch (Exception e) {
            log.error("Error during expression syntax validation: {}", e.getMessage(), e);
            return String.format("Error: Unable to validate expression syntax: %s", e.getMessage());
        }
    }

    /**
     * Checks if parentheses are balanced in the expression
     */
    public boolean hasBalancedParentheses(String expression) {
        int count = 0;
        for (char c : expression.toCharArray()) {
            if (c == '(') {
                count++;
            } else if (c == ')') {
                count--;
                if (count < 0) {
                    return false; // More closing than opening
                }
            }
        }
        return count == 0; // Should be perfectly balanced
    }

    /**
     * Validates that only supported operators are used
     */
    public String validateOperators(String fieldConditions) {
        // Define supported operators for different field types
        String[] numericOperators = {">", "<", ">=", "<=", "==", "!=", "exists()", "!exists()"};
        String[] stringOperators = {"equals(", "contains(", "matches(", "exists()", "!equals(", "!contains(", "!matches(", "!exists()"};
        String[] logicalOperators = {" and ", " or "};

        // Remove quotes and function calls temporarily for operator checking
        String tempExpression = fieldConditions
                .replaceAll("\"[^\"]*\"", "VALUE") // Remove quoted strings
                .replaceAll("'[^']*'", "VALUE")    // Remove single quoted strings
                .replaceAll("\\w+\\([^)]*\\)", "FUNCTION"); // Remove function calls

        // Check for invalid operators (common mistakes)
        String[] invalidOperators = {"&&", "||", "AND", "OR", "=", "!="};
        for (String invalidOp : invalidOperators) {
            if (tempExpression.contains(invalidOp)) {
                if (invalidOp.equals("&&") || invalidOp.equals("||")) {
                    return String.format("Error: Use 'and'/'or' instead of '%s' for logical operations", invalidOp);
                }
                if (invalidOp.equals("AND") || invalidOp.equals("OR")) {
                    return String.format("Error: Use lowercase '%s' for logical operations", invalidOp.toLowerCase());
                }
                if (invalidOp.equals("=")) {
                    return "Error: Use '==' for equality comparison, not '='";
                }
            }
        }

        // Check for unsupported special characters that might indicate syntax errors
        if (tempExpression.matches(".*[#$%^&*+\\[\\]{}|\\\\;:'\"`~].*")) {
            return "Error: Expression contains unsupported special characters. Use only supported operators and functions.";
        }

        return "VALID";
    }

    /**
     * Validates logical connectors syntax
     */
    public String validateLogicalConnectors(String fieldConditions) {
        // Check for proper spacing around logical operators
        if (fieldConditions.matches(".*(\\S(and|or)\\S).*")) {
            return "Error: Logical operators 'and'/'or' must be surrounded by spaces";
        }

        // Check for consecutive logical operators
        if (fieldConditions.matches(".*(and\\s+and|or\\s+or|and\\s+or\\s+and|or\\s+and\\s+or).*")) {
            return "Error: Consecutive logical operators found. Use parentheses to group conditions properly.";
        }

        // Check for logical operators at the beginning or end
        String trimmed = fieldConditions.trim();
        if (trimmed.startsWith("and ") || trimmed.startsWith("or ")
                || trimmed.endsWith(" and") || trimmed.endsWith(" or")) {
            return "Error: Expression cannot start or end with logical operators 'and'/'or'";
        }

        return "VALID";
    }

    /**
     * Validates function syntax (equals, contains, matches, etc.)
     */
    public String validateFunctions(String fieldConditions) {
        // Check for properly formed function calls
        String[] supportedFunctions = {"equals", "contains", "matches", "exists", "!equals", "!contains", "!matches", "!exists"};

        // Find all function-like patterns
        java.util.regex.Pattern functionPattern = java.util.regex.Pattern.compile("(!?\\w+)\\s*\\(([^)]*)\\)");
        java.util.regex.Matcher matcher = functionPattern.matcher(fieldConditions);

        while (matcher.find()) {
            String functionName = matcher.group(1);
            String functionArgs = matcher.group(2);

            // Check if function is supported
            boolean isSupported = false;
            for (String supportedFunc : supportedFunctions) {
                if (functionName.equals(supportedFunc)) {
                    isSupported = true;
                    break;
                }
            }

            if (!isSupported) {
                return String.format("Error: Unsupported function '%s'. Supported functions: %s",
                        functionName, String.join(", ", supportedFunctions));
            }

            // Validate function arguments
            if (functionName.equals("exists") || functionName.equals("!exists")) {
                // exists() should have one parameter or no parameters
                String[] args = functionArgs.trim().isEmpty() ? new String[0] : functionArgs.split(",");
                if (args.length > 1) {
                    return String.format("Error: Function '%s' should have at most one parameter", functionName);
                }
            } else {
                // Other functions should have exactly 2 parameters
                String[] args = functionArgs.split(",");
                if (args.length != 2) {
                    return String.format("Error: Function '%s' requires exactly 2 parameters (field, value)", functionName);
                }

                // Check that parameters are not empty
                for (String arg : args) {
                    if (arg.trim().isEmpty()) {
                        return String.format("Error: Function '%s' has empty parameter", functionName);
                    }
                }
            }
        }

        return "VALID";
    }

    /**
     * Helper method to validate operator
     */
    public boolean isValidOperator(String operator) {
        return operator != null && (operator.equals(">") || operator.equals("<")
                || operator.equals(">=") || operator.equals("<=")
                || operator.equals("==") || operator.equals("!="));
    }

    /**
     * Helper method to validate priority
     */
    public boolean isValidPriority(String priority) {
        return priority != null && (priority.equalsIgnoreCase("critical")
                || priority.equalsIgnoreCase("warning") || priority.equalsIgnoreCase("info"));
    }

    /**
     * Helper method to build expression
     */
    public String buildExpression(String metric, String operator, String threshold) {
        return String.format("%s %s %s", metric, operator, threshold);
    }

    /**
     * Helper method to parse existing expression into components
     */
    public String[] parseExpression(String expression) {
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
    public Map<String, String> parseKeyValuePairs(String input) {
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
     * Recursively searches for a metric in the hierarchy
     */
    public Hierarchy findMetricInHierarchy(List<Hierarchy> hierarchies, String metricName) {
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
    public boolean isFieldValidForMetric(Hierarchy metricHierarchy, String fieldName) {
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
    public List<String> extractFieldNamesFromConditions(String fieldConditions) {
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
    public String extractFieldFromEquals(String condition) {
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
    public String extractFieldFromComparison(String condition) {
        // Pattern: fieldName operator value
        // Updated to include all supported operators
        String[] operators = {" >= ", " <= ", " > ", " < ", " == ", " != "};

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

    /**
     * Helper method to format hierarchy structure as JSON recursively
     */
    public ObjectNode formatHierarchyAsJson(ObjectMapper mapper, Hierarchy hierarchy) {
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
    
    /**
     * Format timestamp to readable format
     */
    public String formatTimestamp(Long timestamp) {
        if (timestamp == null) {
            return "N/A";
        }
        LocalDateTime dateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
        return dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    /**
     * Parse time range string to milliseconds
     */
    public long parseTimeRangeToMillis(String timeRange) {
        return switch (timeRange.toLowerCase()) {
            case "1h" -> 60 * 60 * 1000L;
            case "6h" -> 6 * 60 * 60 * 1000L;
            case "24h" -> 24 * 60 * 60 * 1000L;
            case "7d" -> 7 * 24 * 60 * 60 * 1000L;
            default -> 24 * 60 * 60 * 1000L; // default to 24h
        };
    }

    /**
     * Helper method to convert monitor status byte to readable text
     * @param status The status byte from monitor
     * @return Human-readable status text
     */
    public String getStatusText(Byte status) {
        if (status == null) {
            return "Unknown";
        }
        return switch (status) {
            case 0 -> "Paused";
            case 1 -> "Online";
            case 2 -> "Offline";
            case 3 -> "Unreachable";
            default -> "Unknown (" + status + ")";
        };
    }

    /**
     * Helper method to get metrics name for a metric type
     */
    public String getMetricsNameForType(String metricType) {
        return switch (metricType.toLowerCase()) {
            case "cpu" -> "cpu";
            case "memory" -> "memory";
            case "disk" -> "disk";
            case "network" -> "network";
            default -> "system";
        };
    }

    /**
     * Helper method to check if a field represents usage for a metric type
     */
    public boolean isUsageField(String field, String metricType) {
        if (field == null) return false;

        String fieldLower = field.toLowerCase();
        String typeLower = metricType.toLowerCase();

        return fieldLower.contains("usage")
                || fieldLower.contains("percent")
                || fieldLower.contains("util")
                || (typeLower.equals("cpu") && (fieldLower.contains("cpu") || fieldLower.contains("idle")))
                || (typeLower.equals("memory") && fieldLower.contains("memory"))
                || (typeLower.equals("disk") && fieldLower.contains("disk"));
    }

    /**
     * Convert manager module Hierarchy objects to ai-agent module Hierarchy objects
     * This handles the cross-module DTO conversion to avoid ClassCastException
     */
    public List<Hierarchy> convertToAgentHierarchies(List<?> managerHierarchies) {
        List<Hierarchy> agentHierarchies = new ArrayList<>();

        for (Object managerHierarchy : managerHierarchies) {
            Hierarchy agentHierarchy = convertToAgentHierarchy(managerHierarchy);
            agentHierarchies.add(agentHierarchy);
        }

        return agentHierarchies;
    }

    /**
     * Convert a single manager Hierarchy object to ai-agent Hierarchy object using reflection
     */
    public Hierarchy convertToAgentHierarchy(Object managerHierarchy) {
        try {
            Hierarchy agentHierarchy = new Hierarchy();

            // Use reflection to copy properties from manager DTO to agent DTO
            Class<?> managerClass = managerHierarchy.getClass();

            // Copy basic properties
            agentHierarchy.setCategory(getStringField(managerHierarchy, managerClass, "category"));
            agentHierarchy.setValue(getStringField(managerHierarchy, managerClass, "value"));
            agentHierarchy.setLabel(getStringField(managerHierarchy, managerClass, "label"));
            agentHierarchy.setIsLeaf(getBooleanField(managerHierarchy, managerClass, "isLeaf"));
            agentHierarchy.setHide(getBooleanField(managerHierarchy, managerClass, "hide"));
            agentHierarchy.setType(getByteField(managerHierarchy, managerClass, "type"));
            agentHierarchy.setUnit(getStringField(managerHierarchy, managerClass, "unit"));

            // Handle children recursively
            List<?> managerChildren = getListField(managerHierarchy, managerClass, "children");
            if (managerChildren != null && !managerChildren.isEmpty()) {
                List<Hierarchy> agentChildren = convertToAgentHierarchies(managerChildren);
                agentHierarchy.setChildren(agentChildren);
            }

            return agentHierarchy;

        } catch (Exception e) {
            log.error("Failed to convert manager hierarchy to agent hierarchy: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to convert hierarchy", e);
        }
    }

    public String getStringField(Object obj, Class<?> clazz, String fieldName) {
        try {
            Method getter = clazz.getMethod("get" + capitalize(fieldName));
            Object value = getter.invoke(obj);
            return value != null ? value.toString() : null;
        } catch (Exception e) {
            log.debug("Could not get string field '{}': {}", fieldName, e.getMessage());
            return null;
        }
    }

    public Boolean getBooleanField(Object obj, Class<?> clazz, String fieldName) {
        try {
            Method getter = clazz.getMethod("get" + capitalize(fieldName));
            Object value = getter.invoke(obj);
            return value instanceof Boolean ? (Boolean) value : null;
        } catch (Exception e) {
            try {
                // Try alternative getter pattern for boolean fields
                Method isGetter = clazz.getMethod("is" + capitalize(fieldName));
                Object value = isGetter.invoke(obj);
                return value instanceof Boolean ? (Boolean) value : null;
            } catch (Exception e2) {
                log.debug("Could not get boolean field '{}': {}", fieldName, e.getMessage());
                return null;
            }
        }
    }

    public Byte getByteField(Object obj, Class<?> clazz, String fieldName) {
        try {
            Method getter = clazz.getMethod("get" + capitalize(fieldName));
            Object value = getter.invoke(obj);
            return value instanceof Byte ? (Byte) value : null;
        } catch (Exception e) {
            log.debug("Could not get byte field '{}': {}", fieldName, e.getMessage());
            return null;
        }
    }

    public List<?> getListField(Object obj, Class<?> clazz, String fieldName) {
        try {
            Method getter = clazz.getMethod("get" + capitalize(fieldName));
            Object value = getter.invoke(obj);
            return value instanceof List ? (List<?>) value : null;
        } catch (Exception e) {
            log.debug("Could not get list field '{}': {}", fieldName, e.getMessage());
            return null;
        }
    }

    public String capitalize(String str) {
        if (str == null || str.isEmpty()) {
            return str;
        }
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }


    /**
     * Extract existing monitor IDs from the alert expression
     * @param expression The alert expression containing __instance__ conditions
     * @return List of existing monitor IDs
     */
    public List<String> extractExistingMonitorIds(String expression) {
        List<String> monitorIds = new ArrayList<>();
        String pattern = "equals\\(__instance__,\\s*\"([^\"]+)\"\\)";
        java.util.regex.Pattern regex = java.util.regex.Pattern.compile(pattern);
        java.util.regex.Matcher matcher = regex.matcher(expression);

        while (matcher.find()) {
            monitorIds.add(matcher.group(1));
        }

        return monitorIds;
    }

    /**
     * Replace existing __instance__ conditions in the expression with new ones
     * @param expression The current expression
     * @param newMonitorCondition The new monitor condition to replace with
     * @return Updated expression
     */
    public String replaceInstanceConditions(String expression, String newMonitorCondition) {
        // More precise pattern to match complete __instance__ condition blocks without cutting field parameters
        // Pattern matches either:
        // 1. Single: equals(__instance__, "id")
        // 2. Multiple: (equals(__instance__, "id1") or equals(__instance__, "id2") or ...)

        // First try to match grouped conditions: (equals(__instance__, "id1") or equals(__instance__, "id2"))
        String groupedPattern = "\\(\\s*equals\\(__instance__,\\s*\"[^\"]+\"\\)(?:\\s+or\\s+equals\\(__instance__,\\s*\"[^\"]+\"\\))*\\s*\\)";
        if (expression.matches(".*" + groupedPattern + ".*")) {
            return expression.replaceFirst(groupedPattern, newMonitorCondition);
        }

        // Then try single condition: equals(__instance__, "id")
        String singlePattern = "equals\\(__instance__,\\s*\"[^\"]+\"\\)";
        if (expression.matches(".*" + singlePattern + ".*")) {
            return expression.replaceFirst(singlePattern, newMonitorCondition);
        }

        // If no match found, return original expression
        return expression;
    }

}
