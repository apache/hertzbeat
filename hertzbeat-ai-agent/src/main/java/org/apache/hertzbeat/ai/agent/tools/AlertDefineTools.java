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

package org.apache.hertzbeat.ai.agent.tools;

/**
 * Tools for alert definition and threshold configuration operations
 */
public interface AlertDefineTools {

    /**
     * Create a new alert rule with HertzBeat's expression format based on app hierarchy

     * 
     * @param name Alert rule name (required, must be unique)
     * @param app App name from hierarchy (must match exact hierarchy app value)
     * @param metrics Metrics name from hierarchy (must match exact hierarchy metrics value)
     * @param fieldConditions Field-specific conditions from metric's children (e.g., "VmName = 'arora'", "total_granted > 1000", 
     *                       "total_used > 123 and total_granted > 333 and (total_granted > 3444 and total_paid_available < 5556)")
     * @param type Alert rule type: 'realtime' (default) or 'periodic'
     * @param period Execution period in seconds (only for periodic rules, default: 300)
     * @param times Number of consecutive violations before triggering (default: 3)
     * @param priority Alert priority as integer: 0=critical, 1=warning, 2=info (default: 1)
     * @param description Alert rule description (optional)
     * @param template Alert message template with variables (optional)
     * @param datasource Data source type: 'promql' (default)
     * @param labels Labels as key:value pairs separated by commas
     * @param annotations Annotations as key:value pairs separated by commas
     * @param enable Whether to enable the rule immediately (default: true)
     * @return Result message with rule ID if successful
     */
    String createAlertRule(String name, String app, String metrics, String fieldConditions,
                          String type, Integer period, Integer times, Integer priority, String description,
                          String template, String datasource, String labels, String annotations, Boolean enable);

    /**
     * List existing alert rules with filtering
     * @param search Search term for rule name or description
     * @param monitorType Filter by monitor type
     * @param enabled Filter by enabled status
     * @param pageIndex Page index
     * @param pageSize Page size
     * @return Formatted list of alert rules
     */
    String listAlertRules(String search, String monitorType, Boolean enabled, Integer pageIndex, Integer pageSize);

    /**
     * Enable or disable an alert rule
     * @param ruleId Alert rule ID
     * @param enabled Whether to enable the rule
     * @return Result message
     */
    String toggleAlertRule(Long ruleId, Boolean enabled);

    /**
     * Get detailed information about an alert rule
     * @param ruleId Alert rule ID
     * @return Detailed rule information
     */
    String getAlertRuleDetails(Long ruleId);


    /**
     * Get the hierarchical structure of available apps and metrics for alert rule creation
     * @param app App type to get hierarchy for (optional, gets all if not specified)
     * @return Hierarchical structure showing apps and their available metrics
     */
    String getAppsMetricsHierarchy(String app);

    /**
     * Bind monitors to an alert rule by modifying the alert expression
     * @param ruleId Alert rule ID to bind monitors to
     * @param monitorIds Comma-separated list of monitor IDs to bind
     * @return Result message indicating success or failure
     */
    String bindMonitorsToAlertRule(Long ruleId, String monitorIds);
}