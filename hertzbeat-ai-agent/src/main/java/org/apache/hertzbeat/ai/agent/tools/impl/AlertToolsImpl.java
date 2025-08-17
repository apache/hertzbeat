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
import org.apache.hertzbeat.ai.agent.adapters.MonitorServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.apache.hertzbeat.ai.agent.tools.AlertTools;
import org.apache.hertzbeat.ai.agent.utils.UtilityClass;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Implementation of Alert Tools functionality for alarm data queries and management
 */
@Slf4j
@Service
public class AlertToolsImpl implements AlertTools {
    @Autowired
    private AlertServiceAdapter alertServiceAdapter;
    @Autowired
    private MonitorServiceAdapter monitorServiceAdapter;

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
            
            COMMON USE CASES:
            - Recent active alerts: alertType='single', status='firing', sort='startAt', order='desc'
            - Historical analysis: alertType='single', status='resolved', pageSize=50
            - Alert grouping overview: alertType='group', status='all'
            - Search specific issues: search='cpu', alertType='single', status='firing'
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

    @Override
    @Tool(name = "get_frequent_alerts", description = """
            Get analysis of most frequent alarms within a specified time range.
            Helps identify recurring issues and monitors that trigger alerts most often.
            Time range values: '1h', '6h', '24h' (1 day), '7d' (7 days).
            """)
    public String getFrequentAlerts(
            @ToolParam(description = "Time range: '1h', '6h', '24h', '7d' (default: 24h)", required = false) String timeRange,
            @ToolParam(description = "Maximum number of frequent alerts to return (default: 10)", required = false) Integer limit) {

        try {
            log.info("Getting frequent alerts: timeRange={}, limit={}", timeRange, limit);

            if (timeRange == null || timeRange.trim().isEmpty()) {
                timeRange = "24h";
            }
            if (limit == null || limit <= 0) {
                limit = 10;
            }

            // Get recent alerts and analyze frequency
            Page<SingleAlert> recentAlerts = alertServiceAdapter.getSingleAlerts("all", null, "startAt", "desc", 0, 100);
            
            // Count alerts by content/fingerprint
            Map<String, Integer> alertFrequency = new HashMap<>();
            Map<String, SingleAlert> alertExamples = new HashMap<>();
            
            long cutoffTime = System.currentTimeMillis() - UtilityClass.parseTimeRangeToMillis(timeRange);
            
            for (SingleAlert alert : recentAlerts.getContent()) {
                if (alert.getStartAt() != null && alert.getStartAt() >= cutoffTime) {
                    String key = alert.getContent() != null ? alert.getContent() : alert.getFingerprint();
                    if (key != null) {
                        alertFrequency.put(key, alertFrequency.getOrDefault(key, 0) + 1);
                        if (!alertExamples.containsKey(key)) {
                            alertExamples.put(key, alert);
                        }
                    }
                }
            }

            StringBuilder response = new StringBuilder();
            response.append("FREQUENT ALERTS ANALYSIS (").append(timeRange).append(")\n");
            response.append("==========================================\n\n");

            if (alertFrequency.isEmpty()) {
                response.append("No alerts found in the specified time range.");
                return response.toString();
            }

            // Sort by frequency
            alertFrequency.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .limit(limit)
                    .forEach(entry -> {
                        String alertKey = entry.getKey();
                        Integer count = entry.getValue();
                        SingleAlert example = alertExamples.get(alertKey);
                        
                        response.append("Alert: ").append(alertKey).append("\n");
                        response.append("Frequency: ").append(count).append(" times\n");
                        if (example != null) {
                            response.append("Status: ").append(example.getStatus()).append("\n");
                            if (example.getLabels() != null && !example.getLabels().isEmpty()) {
                                response.append("Labels: ").append(example.getLabels()).append("\n");
                            }
                        }
                        response.append("\n");
                    });

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get frequent alerts: {}", e.getMessage(), e);
            return "Error analyzing frequent alerts: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "get_abnormal_monitors", description = """
            Get list of monitoring items that are currently abnormal (offline, unreachable, or have active alerts).
            Shows monitors with their current status and when the abnormality occurred.
            """)
    public String getAbnormalMonitors(
            @ToolParam(description = "Time range to check: '1h', '6h', '24h', '7d' (default: 24h)", required = false) String timeRange) {

        try {
            log.info("Getting abnormal monitors for timeRange: {}", timeRange);

            if (timeRange == null || timeRange.trim().isEmpty()) {
                timeRange = "24h";
            }

            StringBuilder response = new StringBuilder();
            response.append("ABNORMAL MONITORS REPORT\n");
            response.append("========================\n\n");

            // Get monitors with status issues (offline, unreachable)
            Page<Monitor> offlineMonitors = monitorServiceAdapter.getMonitors(null, null, null, (byte) 2, "gmtUpdate", "desc", 0, 50, null);
            Page<Monitor> unreachableMonitors = monitorServiceAdapter.getMonitors(null, null, null, (byte) 3, "gmtUpdate", "desc", 0, 50, null);
            
            // Get recent firing alerts
            Page<SingleAlert> firingAlerts = alertServiceAdapter.getSingleAlerts("firing", null, "startAt", "desc", 0, 50);
            
            response.append("OFFLINE MONITORS:\n");
            if (offlineMonitors.getContent().isEmpty()) {
                response.append("- No offline monitors\n");
            } else {
                for (Monitor monitor : offlineMonitors.getContent()) {
                    response.append("- ID: ").append(monitor.getId())
                           .append(" | Name: ").append(monitor.getName())
                           .append(" | Type: ").append(monitor.getApp())
                           .append(" | Host: ").append(monitor.getHost())
                           .append(" | Status: Offline\n");
                }
            }

            response.append("\nUNREACHABLE MONITORS:\n");
            if (unreachableMonitors.getContent().isEmpty()) {
                response.append("- No unreachable monitors\n");
            } else {
                for (Monitor monitor : unreachableMonitors.getContent()) {
                    response.append("- ID: ").append(monitor.getId())
                           .append(" | Name: ").append(monitor.getName())
                           .append(" | Type: ").append(monitor.getApp())
                           .append(" | Host: ").append(monitor.getHost())
                           .append(" | Status: Unreachable\n");
                }
            }

            response.append("\nMONITORS WITH ACTIVE ALERTS:\n");
            if (firingAlerts.getContent().isEmpty()) {
                response.append("- No active alerts\n");
            } else {
                for (SingleAlert alert : firingAlerts.getContent()) {
                    response.append("- Alert ID: ").append(alert.getId())
                           .append(" | Content: ").append(alert.getContent())
                           .append(" | Started: ").append(UtilityClass.formatTimestamp(alert.getStartAt()))
                           .append(" | Triggers: ").append(alert.getTriggerTimes()).append("\n");
                }
            }

            int totalAbnormal = offlineMonitors.getContent().size() + unreachableMonitors.getContent().size() + firingAlerts.getContent().size();
            response.append("\nSUMMARY: ").append(totalAbnormal).append(" abnormal items found");

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get abnormal monitors: {}", e.getMessage(), e);
            return "Error retrieving abnormal monitors: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "get_monitor_alerts", description = """
            Search alerts related to a specific monitor by monitor ID or monitor name.
            Returns all alerts associated with the specified monitor within the given time range.
            """)
    public String getMonitorAlerts(
            @ToolParam(description = "Monitor ID to search alerts for (optional if monitorName provided)", required = false) Long monitorId,
            @ToolParam(description = "Monitor name to search alerts for (optional if monitorId provided)", required = false) String monitorName,
            @ToolParam(description = "Time range: '1h', '6h', '24h', '7d' (default: 24h)", required = false) String timeRange) {

        try {
            log.info("Getting alerts for monitor: ID={}, name={}, timeRange={}", monitorId, monitorName, timeRange);

            if (monitorId == null && (monitorName == null || monitorName.trim().isEmpty())) {
                return "Error: Either monitor ID or monitor name must be provided";
            }

            if (timeRange == null || timeRange.trim().isEmpty()) {
                timeRange = "24h";
            }

            StringBuilder response = new StringBuilder();
            response.append("ALERTS FOR MONITOR");
            if (monitorId != null) {
                response.append(" (ID: ").append(monitorId).append(")");
            }
            if (monitorName != null) {
                response.append(" (Name: ").append(monitorName).append(")");
            }
            response.append("\n").append("=".repeat(50)).append("\n\n");

            // Search alerts by monitor ID or name
            String searchTerm = monitorId != null ? monitorId.toString() : monitorName;
            Page<SingleAlert> alerts = alertServiceAdapter.getSingleAlerts("all", searchTerm, "startAt", "desc", 0, 50);
            
            long cutoffTime = System.currentTimeMillis() - UtilityClass.parseTimeRangeToMillis(timeRange);
            
            int alertCount = 0;
            for (SingleAlert alert : alerts.getContent()) {
                if (alert.getStartAt() != null && alert.getStartAt() >= cutoffTime) {
                    alertCount++;
                    response.append("Alert #").append(alertCount).append(":\n");
                    response.append("- ID: ").append(alert.getId()).append("\n");
                    response.append("- Status: ").append(alert.getStatus()).append("\n");
                    response.append("- Content: ").append(alert.getContent()).append("\n");
                    response.append("- Trigger Times: ").append(alert.getTriggerTimes()).append("\n");
                    response.append("- Started: ").append(UtilityClass.formatTimestamp(alert.getStartAt())).append("\n");
                    if (alert.getEndAt() != null) {
                        response.append("- Ended: ").append(UtilityClass.formatTimestamp(alert.getEndAt())).append("\n");
                    }
                    response.append("\n");
                }
            }

            if (alertCount == 0) {
                response.append("No alerts found for this monitor in the specified time range.");
            } else {
                response.append("Total alerts found: ").append(alertCount);
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get monitor alerts: {}", e.getMessage(), e);
            return "Error retrieving monitor alerts: " + e.getMessage();
        }
    }


}
