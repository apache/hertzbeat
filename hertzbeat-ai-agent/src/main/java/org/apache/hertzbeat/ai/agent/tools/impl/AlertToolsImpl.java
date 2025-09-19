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
import org.apache.hertzbeat.ai.agent.adapters.AlertServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.apache.hertzbeat.ai.agent.tools.AlertTools;
import org.apache.hertzbeat.ai.agent.utils.UtilityClass;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;


/**
 * Implementation of Alert Tools functionality for alarm data queries and management
 */
@Slf4j
@Service
public class AlertToolsImpl implements AlertTools {
    @Autowired
    private AlertServiceAdapter alertServiceAdapter;

    @Override
    @Tool(name = "query_alerts", description = """
            Query alerts with comprehensive filtering and pagination options.
            
            ALERT TYPES:
            - Pass alertType='single' for individual alert instances
            - Pass alertType='group' for grouped/aggregated alerts
            - Pass alertType='both' to get both types (separate sections)
            
            STATUS FILTERING:
            - 'firing': Currently active alerts requiring attention
            - 'resolved': Previously active alerts that have been cleared
            - 'all': Both firing and resolved alerts (default)
            
            SEARCH & FILTERING:
            - search: Search in alert content, labels, or descriptions
            - sort: Order by 'startAt' (trigger time), 'triggerTimes' (frequency), 'status'
            - order: 'asc' (oldest first) or 'desc' (newest first, default)
            
            PAGINATION:
            - pageIndex: Page number starting from 0
            - pageSize: Number of alerts per page (default: 10, max recommended: 50)
            
            EXAMPLE AND COMMON USE CASES:
            - Recent active alerts: alertType='single', status='firing', sort='startAt', order='desc'
            - Historical analysis: alertType='single', status='resolved', pageSize=50
            - Alert grouping overview: alertType='group', status='all'
            - Search specific issues: search='cpu', alertType='single', status='firing'
            - Find abnormal monitors: status='firing' to get active alerts indicating monitor issues
            - Monitor-specific alerts: use search parameter with monitor ID or name to find related alerts
            - Frequent alerts analysis: sort='triggerTimes', order='desc' to find most frequently triggered alerts
            - Recent recurring issues: status='all', sort='triggerTimes', order='desc', pageSize=20
            """)
    public String queryAlerts(
            @ToolParam(description = "Alert type: 'single' (individual alerts), 'group' (grouped alerts), 'both' (default: single)", required = false) String alertType,
            @ToolParam(description = "Alert status: 'firing' (active), 'resolved' (cleared), 'all' (default: all)", required = false) String status,
            @ToolParam(description = "Search term for alert content or labels", required = false) String search,
            @ToolParam(description = "Sort field: 'startAt', 'triggerTimes', 'status' (default: startAt)", required = false) String sort,
            @ToolParam(description = "Sort order: 'asc' or 'desc' (default: desc)", required = false) String order,
            @ToolParam(description = "Page index starting from 0 (default: 0)", required = false) Integer pageIndex,
            @ToolParam(description = "Page size, 1-50 recommended (default: 10)", required = false) Integer pageSize) {

        try {
            log.info("Querying alerts: alertType={}, status={}, search={}, sort={}, order={}", alertType, status, search, sort, order);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in query_alerts tool: {}", subjectSum);

            // Set defaults
            if (alertType == null || alertType.trim().isEmpty()) {
                alertType = "single";
            }
            if (status == null || status.trim().isEmpty()) {
                status = "all";
            }
            if (sort == null || sort.trim().isEmpty()) {
                sort = "startAt";
            }
            if (order == null || order.trim().isEmpty()) {
                order = "desc";
            }
            if (pageIndex == null) {
                pageIndex = 0;
            }
            if (pageSize == null) {
                pageSize = 10;
            }

            StringBuilder response = new StringBuilder();
            response.append("ALERT QUERY RESULTS\n");
            response.append("===================\n\n");

            // Handle different alert types
            if ("single".equalsIgnoreCase(alertType) || "both".equalsIgnoreCase(alertType)) {
                Page<SingleAlert> singleResult = alertServiceAdapter.getSingleAlerts(status, search, sort, order, pageIndex, pageSize);
                
                response.append("SINGLE ALERTS:\n");
                response.append("Found ").append(singleResult.getContent().size()).append(" single alerts (Total: ").append(singleResult.getTotalElements()).append("):\n\n");

                for (SingleAlert alert : singleResult.getContent()) {
                    response.append("Alert ID: ").append(alert.getId()).append("\n");
                    response.append("Status: ").append(alert.getStatus()).append("\n");
                    response.append("Content: ").append(alert.getContent() != null ? alert.getContent() : "No content").append("\n");
                    response.append("Trigger Times: ").append(alert.getTriggerTimes()).append("\n");
                    
                    if (alert.getStartAt() != null) {
                        response.append("Started At: ").append(UtilityClass.formatTimestamp(alert.getStartAt())).append("\n");
                    }
                    if (alert.getActiveAt() != null) {
                        response.append("Active At: ").append(UtilityClass.formatTimestamp(alert.getActiveAt())).append("\n");
                    }
                    if (alert.getEndAt() != null) {
                        response.append("Ended At: ").append(UtilityClass.formatTimestamp(alert.getEndAt())).append("\n");
                    }
                    
                    if (alert.getLabels() != null && !alert.getLabels().isEmpty()) {
                        response.append("Labels: ").append(alert.getLabels()).append("\n");
                    }
                    response.append("\n");
                }

                if (singleResult.getContent().isEmpty()) {
                    response.append("No single alerts found matching the specified criteria.\n");
                }
            }

            // Handle group alerts
            if ("group".equalsIgnoreCase(alertType) || "both".equalsIgnoreCase(alertType)) {
                if ("both".equalsIgnoreCase(alertType)) {
                    response.append("\n");
                }
                
                Page<GroupAlert> groupResult = alertServiceAdapter.getGroupAlerts(status, search, sort, order, pageIndex, pageSize);
                
                response.append("GROUP ALERTS:\n");
                response.append("Found ").append(groupResult.getContent().size()).append(" group alerts (Total: ").append(groupResult.getTotalElements()).append("):\n\n");

                for (GroupAlert alert : groupResult.getContent()) {
                    response.append("Group Alert ID: ").append(alert.getId()).append("\n");
                    response.append("Status: ").append(alert.getStatus()).append("\n");
                    response.append("Group Key: ").append(alert.getGroupKey() != null ? alert.getGroupKey() : "No group key").append("\n");
                    
                    if (alert.getGmtCreate() != null) {
                        response.append("Created At: ").append(alert.getGmtCreate()).append("\n");
                    }
                    if (alert.getGmtUpdate() != null) {
                        response.append("Updated At: ").append(alert.getGmtUpdate()).append("\n");
                    }
                    
                    if (alert.getCommonLabels() != null && !alert.getCommonLabels().isEmpty()) {
                        response.append("Common Labels: ").append(alert.getCommonLabels()).append("\n");
                    }
                    if (alert.getCommonAnnotations() != null && !alert.getCommonAnnotations().isEmpty()) {
                        response.append("Annotations: ").append(alert.getCommonAnnotations()).append("\n");
                    }
                    response.append("\n");
                }

                if (groupResult.getContent().isEmpty()) {
                    response.append("No group alerts found matching the specified criteria.\n");
                }
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to query alerts: {}", e.getMessage(), e);
            return "Error retrieving alerts: " + e.getMessage();
        }
    }


    @Override
    @Tool(name = "get_alerts_summary", description = """
            Get alerts summary statistics including total counts, status distribution, and recent trends.
            Returns comprehensive overview of the current alerting status across all monitors.
            """)
    public String getAlertsSummary() {
        try {
            log.info("Getting alerts summary");
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in get_alerts_summary tool: {}", subjectSum);

            AlertSummary summary = alertServiceAdapter.getAlertsSummary();

            StringBuilder response = new StringBuilder();
            response.append("ALERTS SUMMARY\n");
            response.append("==============\n\n");

            if (summary != null) {
                response.append("Total Alerts: ").append(summary.getTotal()).append("\n");
                response.append("Handled Alerts: ").append(summary.getDealNum()).append("\n");
                response.append("Handling Rate: ").append(String.format("%.1f", summary.getRate())).append("%\n\n");

                response.append("Priority Breakdown (Unhandled):\n");
                response.append("- Critical: ").append(summary.getPriorityCriticalNum()).append("\n");
                response.append("- Emergency: ").append(summary.getPriorityEmergencyNum()).append("\n");
                response.append("- Warning: ").append(summary.getPriorityWarningNum()).append("\n\n");

                long totalUnhandled = summary.getPriorityCriticalNum() + summary.getPriorityEmergencyNum() + summary.getPriorityWarningNum();
                response.append("Total Unhandled Alerts: ").append(totalUnhandled).append("\n");

                if (totalUnhandled > 0) {
                    response.append("\nUnhandled Alert Distribution:\n");
                    response.append("- Critical: ").append(String.format("%.1f", (summary.getPriorityCriticalNum() * 100.0 / totalUnhandled))).append("%\n");
                    response.append("- Emergency: ").append(String.format("%.1f", (summary.getPriorityEmergencyNum() * 100.0 / totalUnhandled))).append("%\n");
                    response.append("- Warning: ").append(String.format("%.1f", (summary.getPriorityWarningNum() * 100.0 / totalUnhandled))).append("%\n");
                }
            } else {
                response.append("No alert summary data available.");
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get alerts summary: {}", e.getMessage(), e);
            return "Error retrieving alerts summary: " + e.getMessage();
        }
    }

}
