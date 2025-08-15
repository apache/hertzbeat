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
     * Create a new alert rule with threshold configuration
     * @param name Alert rule name
     * @param monitorId Monitor ID to apply the rule to (optional if monitorType provided)
     * @param monitorType Monitor type to apply the rule to (optional if monitorId provided)
     * @param metric Metric field name (e.g., "usage", "responseTime", "connections")
     * @param operator Comparison operator (>, <, >=, <=, ==, !=)
     * @param threshold Threshold value
     * @param times Number of consecutive violations before triggering alert
     * @param priority Alert priority (critical, warning, info)
     * @param description Alert rule description
     * @return Result message with rule ID if successful
     */
    String createAlertRule(String name, Long monitorId, String monitorType, String metric, 
                          String operator, String threshold, Integer times, String priority, String description);

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
     * Update an existing alert rule threshold
     * @param ruleId Alert rule ID
     * @param threshold New threshold value
     * @param operator New comparison operator (optional)
     * @param times New trigger times (optional)
     * @return Result message
     */
    String updateAlertThreshold(Long ruleId, String threshold, String operator, Integer times);

    /**
     * Enable or disable an alert rule
     * @param ruleId Alert rule ID
     * @param enabled Whether to enable the rule
     * @return Result message
     */
    String toggleAlertRule(Long ruleId, Boolean enabled);

    /**
     * Delete an alert rule
     * @param ruleId Alert rule ID
     * @return Result message
     */
    String deleteAlertRule(Long ruleId);

    /**
     * Get detailed information about an alert rule
     * @param ruleId Alert rule ID
     * @return Detailed rule information
     */
    String getAlertRuleDetails(Long ruleId);
}