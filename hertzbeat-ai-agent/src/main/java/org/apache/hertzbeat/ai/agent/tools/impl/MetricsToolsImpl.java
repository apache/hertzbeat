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
import org.apache.hertzbeat.ai.agent.adapters.MetricsServiceAdapter;
import org.apache.hertzbeat.ai.agent.adapters.MonitorServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.apache.hertzbeat.ai.agent.tools.MetricsTools;
import org.apache.hertzbeat.common.entity.dto.Field;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.dto.ValueRow;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Implementation of Metrics Tools functionality for metrics data queries and analysis
 */
@Slf4j
@Service
public class MetricsToolsImpl implements MetricsTools {
    @Autowired
    private MetricsServiceAdapter metricsServiceAdapter;
    @Autowired
    private MonitorServiceAdapter monitorServiceAdapter;

    @Override
    @Tool(name = "get_realtime_metrics", description = """
            Get real-time metrics data for a specific monitor.
            Returns current metrics values including CPU, memory, disk usage, etc.
            Use the query_monitors tool to find monitor IDs/name in case the user does not tell the name explicitly
            """)
    public String getRealtimeMetrics(
            @ToolParam(description = "Monitor ID", required = true) Long monitorId,
            @ToolParam(description = "Metrics name (e.g., 'system', 'cpu', 'memory')", required = true) String metrics) {

        try {
            log.info("Getting real-time metrics for monitor {} and metrics {}", monitorId, metrics);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in get_realtime_metrics tool: {}", subjectSum);

            MetricsData metricsData = metricsServiceAdapter.getMetricsData(monitorId, metrics);

            if (metricsData == null) {
                return String.format("No real-time metrics data found for monitor ID %d and metrics '%s'", monitorId, metrics);
            }

            StringBuilder response = new StringBuilder();
            response.append("REAL-TIME METRICS: ").append(metrics).append(" (Monitor ID: ").append(monitorId).append(")\n");
            response.append("=".repeat(50)).append("\n\n");

            if (metricsData.getValueRows() != null && !metricsData.getValueRows().isEmpty()) {
                List<Field> fields = metricsData.getFields();
                for (ValueRow valueRow : metricsData.getValueRows()) {
                    if (valueRow.getLabels() != null && !valueRow.getLabels().isEmpty()) {
                        response.append("Labels: ").append(valueRow.getLabels()).append("\n");
                    }
                    
                    List<Value> values = valueRow.getValues();
                    for (int i = 0; i < values.size() && i < fields.size(); i++) {
                        Field field = fields.get(i);
                        Value value = values.get(i);
                        
                        response.append("Field: ").append(field.getName()).append("\n");
                        response.append("Value: ").append(value.getOrigin()).append("\n");
                        if (field.getUnit() != null) {
                            response.append("Unit: ").append(field.getUnit()).append("\n");
                        }
                        response.append("\n");
                    }
                }
            } else {
                response.append("No metric values available for the specified metrics.");
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get real-time metrics: {}", e.getMessage(), e);
            return "Error retrieving real-time metrics: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "get_historical_metrics", description = """
            Get historical metrics data for analysis and trending.
            Returns time-series data for specified metrics over a time range.
            Use the query_monitors tool to find monitor IDs/name/type for the monitor user asked the metrics for
            Ask user to provide the filters for labels, history and interval aggregation
            """)
    public String getHistoricalMetrics(
            @ToolParam(description = "Monitor ID", required = true) Long monitorId,
            @ToolParam(description = "Monitor type (e.g., 'linux', 'mysql', 'http')", required = true) String app,
            @ToolParam(description = "Metrics name (e.g., 'system', 'cpu', 'memory')", required = true) String metrics,
            @ToolParam(description = "Specific metric field (e.g., 'usage', 'used', 'available')", required = false) String metric,
            @ToolParam(description = "Label filter for specific instances", required = false) String label,
            @ToolParam(description = "Time range (e.g., '1h', '6h', '24h', '7d')", required = false) String history,
            @ToolParam(description = "Whether to aggregate data with intervals", required = false) Boolean interval) {

        try {
            log.info("Getting historical metrics for monitor {} and metrics {}", monitorId, metrics);

            if (history == null || history.trim().isEmpty()) {
                history = "24h";
            }
            if (interval == null) {
                interval = true;
            }

            MetricsHistoryData historyData = metricsServiceAdapter.getMetricHistoryData(
                    monitorId, app, metrics, metric, label, history, interval);

            if (historyData == null) {
                return String.format("No historical metrics data found for monitor ID %d and metrics '%s'", monitorId, metrics);
            }

            StringBuilder response = new StringBuilder();
            response.append("HISTORICAL METRICS: ").append(metrics).append(" (Monitor ID: ").append(monitorId).append(")\n");
            response.append("Time Range: ").append(history).append(" | Interval Aggregation: ").append(interval).append("\n");
            response.append("=".repeat(60)).append("\n\n");

            if (historyData.getValues() != null && !historyData.getValues().isEmpty()) {
                response.append("Field: ").append(historyData.getField() != null ? historyData.getField().getName() : "Unknown").append("\n");
                
                // Calculate total data points
                int totalPoints = historyData.getValues().values().stream()
                        .mapToInt(List::size)
                        .sum();
                response.append("Data Points: ").append(totalPoints).append("\n");
                
                // Show sample data points (first 10) from all value lists
                int count = 0;
                response.append("\nSample Data Points:\n");
                for (Map.Entry<String, List<Value>> entry : historyData.getValues().entrySet()) {
                    String labelKey = entry.getKey();
                    List<Value> values = entry.getValue();
                    
                    for (Value value : values) {
                        if (count >= 10) break;
                        response.append("Label: ").append(labelKey)
                               .append(" | Time: ").append(value.getTime())
                               .append(" | Value: ").append(value.getOrigin()).append("\n");
                        count++;
                    }
                    if (count >= 10) break;
                }
                
                if (totalPoints > 10) {
                    response.append("... and ").append(totalPoints - 10).append(" more data points\n");
                }
            } else {
                response.append("No historical data points available.");
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get historical metrics: {}", e.getMessage(), e);
            return "Error retrieving historical metrics: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "get_high_usage_monitors", description = """
            Find monitors with high resource usage above specified threshold.
            Helps identify systems that need attention or optimization.
            """)
    public String getHighUsageMonitors(
            @ToolParam(description = "Type of metric to check (cpu, memory, disk, network)", required = true) String metricType,
            @ToolParam(description = "Threshold percentage (e.g., 80 for 80%)", required = true) Double threshold,
            @ToolParam(description = "Monitor type filter (optional)", required = false) String monitorType) {

        try {
            log.info("Getting high usage monitors for metric type {} with threshold {}", metricType, threshold);

            StringBuilder response = new StringBuilder();
            response.append("HIGH USAGE MONITORS: ").append(metricType.toUpperCase()).append(" > ").append(threshold).append("%\n");
            response.append("=".repeat(50)).append("\n\n");

            // Get monitors to check
            Page<Monitor> monitors = monitorServiceAdapter.getMonitors(null, monitorType, null, (byte) 1, "name", "asc", 0, 100, null);

            List<String> highUsageMonitors = new ArrayList<>();

            for (Monitor monitor : monitors.getContent()) {
                try {
                    String metricsName = getMetricsNameForType(metricType);
                    MetricsData metricsData = metricsServiceAdapter.getMetricsData(monitor.getId(), metricsName);
                    
                    if (metricsData != null && metricsData.getValueRows() != null) {
                        List<Field> fields = metricsData.getFields();
                        for (ValueRow valueRow : metricsData.getValueRows()) {
                            List<Value> values = valueRow.getValues();
                            for (int i = 0; i < values.size() && i < fields.size(); i++) {
                                Field field = fields.get(i);
                                Value value = values.get(i);
                                
                                if (isUsageField(field.getName(), metricType)) {
                                    try {
                                        double usage = Double.parseDouble(value.getOrigin());
                                        if (usage > threshold) {
                                            highUsageMonitors.add(String.format("• Monitor: %s (ID: %d) | Host: %s | %s Usage: %.1f%%",
                                                    monitor.getName(), monitor.getId(), monitor.getHost(), 
                                                    metricType.toUpperCase(), usage));
                                            break;
                                        }
                                    } catch (NumberFormatException ignored) {
                                        // Skip non-numeric values
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.debug("Could not get metrics for monitor {}: {}", monitor.getId(), e.getMessage());
                }
            }

            if (highUsageMonitors.isEmpty()) {
                response.append("No monitors found with ").append(metricType).append(" usage above ").append(threshold).append("%.");
            } else {
                response.append("Found ").append(highUsageMonitors.size()).append(" monitors with high ").append(metricType).append(" usage:\n\n");
                highUsageMonitors.forEach(monitor -> response.append(monitor).append("\n"));
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get high usage monitors: {}", e.getMessage(), e);
            return "Error retrieving high usage monitors: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "get_usage_trend", description = """
            Get usage trend data for various metrics with time-series analysis.
            
            SUPPORTED METRIC TYPES:
            - metricType='cpu': CPU usage percentage over time
            - metricType='memory': Memory usage percentage over time
            - metricType='disk': Disk space usage percentage over time
            - metricType='network': Network bandwidth usage over time
            - metricType='custom': Custom metric with specified field name
            
            TIME RANGES:
            - '1h': Last 1 hour with 5-minute intervals
            - '6h': Last 6 hours with 15-minute intervals
            - '24h': Last 24 hours with hourly intervals
            - '7d': Last 7 days with daily averages
            - '30d': Last 30 days with weekly averages
            
            TARGET SPECIFICATION:
            - Provide monitorId for specific monitor by database ID
            - Provide host for monitor lookup by host/IP address
            - If both provided, monitorId takes precedence
            
            OUTPUT FORMAT:
            - Returns time-series data with timestamps and values
            - Values as numeric percentages or raw metric values
            - Formatted for trend analysis and performance monitoring
            
            COMMON USE CASES:
            - Server performance: metricType='cpu', monitorId=123, timeRange='24h'
            - Capacity planning: metricType='disk', host='server01.local', timeRange='7d'
            - Memory trends: metricType='memory', host='192.168.1.10', timeRange='6h'
            - Custom metrics: metricType='custom', customField='response_time', timeRange='1h'
            """)
    public String getUsageTrend(
            @ToolParam(description = "Metric type: 'cpu', 'memory', 'disk', 'network', 'custom' (required)", required = true) String metricType,
            @ToolParam(description = "Monitor ID for specific monitor (optional if host provided)", required = false) Long monitorId,
            @ToolParam(description = "Server host/IP address for monitor lookup (optional if monitorId provided)", required = false) String host,
            @ToolParam(description = "Time range: '1h', '6h', '24h', '7d', '30d' (default: '24h')", required = false) String timeRange,
            @ToolParam(description = "Custom metric field name (required only when metricType='custom')", required = false) String customField) {

        try {
            if (metricType == null || metricType.trim().isEmpty()) {
                return "Error: metricType is required. Use 'cpu', 'memory', 'disk', 'network', or 'custom'";
            }

            // Validate and set defaults
            metricType = metricType.toLowerCase().trim();
            if (timeRange == null || timeRange.trim().isEmpty()) {
                timeRange = "24h";
            }

            // For custom metrics, require customField
            if ("custom".equals(metricType) && (customField == null || customField.trim().isEmpty())) {
                return "Error: customField is required when metricType='custom'";
            }

            // Determine metric field and display name
            String metricField = "usage";  // Default for most metrics
            String displayName = metricType.toUpperCase();
            String metricsName = getMetricsNameForType(metricType);

            if ("custom".equals(metricType)) {
                metricField = customField;
                displayName = "Custom (" + customField + ")";
                metricsName = "system"; // Default to system metrics for custom fields
            }

            return getUsageTrendData(displayName, metricsName, metricField, monitorId, host, timeRange);

        } catch (Exception e) {
            log.error("Failed to get usage trend for {}: {}", metricType, e.getMessage(), e);
            return "Error retrieving usage trend: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "get_system_metrics_summary", description = """
            Get comprehensive system metrics summary across multiple monitors.
            Provides overview of current resource usage across the infrastructure.
            """)
    public String getSystemMetricsSummary(
            @ToolParam(description = "Monitor type filter (optional)", required = false) String monitorType,
            @ToolParam(description = "Comma-separated metric types (cpu,memory,disk)", required = false) String metricTypes) {

        try {
            log.info("Getting system metrics summary for monitor type {} and metrics {}", monitorType, metricTypes);

            if (metricTypes == null || metricTypes.trim().isEmpty()) {
                metricTypes = "cpu,memory,disk";
            }

            String[] types = metricTypes.split(",");
            
            StringBuilder response = new StringBuilder();
            response.append("SYSTEM METRICS SUMMARY\n");
            response.append("======================\n\n");

            // Get all online monitors
            Page<Monitor> monitors = monitorServiceAdapter.getMonitors(null, monitorType, null, (byte) 1, "name", "asc", 0, 100, null);
            
            response.append("Total Monitors: ").append(monitors.getTotalElements()).append("\n\n");

            for (String type : types) {
                type = type.trim().toLowerCase();
                response.append(type.toUpperCase()).append(" METRICS:\n");
                response.append("-".repeat(20)).append("\n");

                List<String> metricsSummary = new ArrayList<>();
                for (Monitor monitor : monitors.getContent()) {
                    try {
                        String metricsName = getMetricsNameForType(type);
                        MetricsData metricsData = metricsServiceAdapter.getMetricsData(monitor.getId(), metricsName);
                        
                        if (metricsData != null && metricsData.getValueRows() != null) {
                            List<Field> fields = metricsData.getFields();
                            for (ValueRow valueRow : metricsData.getValueRows()) {
                                List<Value> values = valueRow.getValues();
                                for (int i = 0; i < values.size() && i < fields.size(); i++) {
                                    Field field = fields.get(i);
                                    Value value = values.get(i);
                                    
                                    if (isUsageField(field.getName(), type)) {
                                        try {
                                            double usage = Double.parseDouble(value.getOrigin());
                                            metricsSummary.add(String.format("• %s: %.1f%%", monitor.getName(), usage));
                                            break;
                                        } catch (NumberFormatException ignored) {
                                            // Skip non-numeric values
                                        }
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.debug("Could not get metrics for monitor {}: {}", monitor.getId(), e.getMessage());
                    }
                }

                if (metricsSummary.isEmpty()) {
                    response.append("No ").append(type).append(" metrics available\n");
                } else {
                    metricsSummary.forEach(metric -> response.append(metric).append("\n"));
                }
                response.append("\n");
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get system metrics summary: {}", e.getMessage(), e);
            return "Error retrieving system metrics summary: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "get_warehouse_status", description = """
            Check the status of the metrics storage warehouse system.
            Returns whether the metrics storage is operational and accessible.
            """)
    public String getWarehouseStatus() {
        try {
            log.info("Checking warehouse storage status");

            Boolean status = metricsServiceAdapter.getWarehouseStorageServerStatus();

            StringBuilder response = new StringBuilder();
            response.append("METRICS WAREHOUSE STATUS\n");
            response.append("========================\n\n");

            if (status != null && status) {
                response.append("Status: ONLINE ✓\n");
                response.append("The metrics storage warehouse is operational and accessible.\n");
                response.append("Historical metrics data queries are available.");
            } else {
                response.append("Status: OFFLINE ✗\n");
                response.append("The metrics storage warehouse is not accessible.\n");
                response.append("Only real-time metrics may be available.");
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get warehouse status: {}", e.getMessage(), e);
            return "Error checking warehouse status: " + e.getMessage();
        }
    }

    /**
     * Helper method to get usage trend for a specific metric type
     */
    private String getUsageTrendData(String displayName, String metricsName, String metricField, 
                                Long monitorId, String host, String timeRange) {
        try {
            if (timeRange == null || timeRange.trim().isEmpty()) {
                timeRange = "24h";
            }

            // Find monitor if only host is provided
            if (monitorId == null && host != null) {
                Page<Monitor> monitors = monitorServiceAdapter.getMonitors(null, null, host, (byte) 1, "name", "asc", 0, 1, null);
                if (!monitors.getContent().isEmpty()) {
                    monitorId = monitors.getContent().get(0).getId();
                } else {
                    return "No monitor found for host: " + host;
                }
            }

            if (monitorId == null) {
                return "Either monitor ID or host must be provided";
            }

            MetricsHistoryData historyData = metricsServiceAdapter.getMetricHistoryData(
                    monitorId, "linux", metricsName, metricField, null, timeRange, true);

            StringBuilder response = new StringBuilder();
            response.append(displayName.toUpperCase()).append(" USAGE TREND\n");
            response.append("Monitor ID: ").append(monitorId).append(" | Time Range: ").append(timeRange).append("\n");
            response.append("=".repeat(40)).append("\n\n");

            if (historyData != null && historyData.getValues() != null && !historyData.getValues().isEmpty()) {
                // Calculate total data points
                int totalPoints = historyData.getValues().values().stream()
                        .mapToInt(List::size)
                        .sum();
                response.append("Data Points: ").append(totalPoints).append("\n\n");
                response.append("Trend Data (suitable for charting):\n");
                
                for (Map.Entry<String, List<Value>> entry : historyData.getValues().entrySet()) {
                    List<Value> values = entry.getValue();
                    for (Value value : values) {
                        response.append(value.getTime()).append(",").append(value.getOrigin()).append("\n");
                    }
                }
            } else {
                response.append("No trend data available for the specified time range.");
            }

            return response.toString();

        } catch (Exception e) {
            log.error("Failed to get {} usage trend: {}", displayName, e.getMessage(), e);
            return "Error retrieving " + displayName.toLowerCase() + " usage trend: " + e.getMessage();
        }
    }

    /**
     * Helper method to get metrics name for a metric type
     */
    private String getMetricsNameForType(String metricType) {
        switch (metricType.toLowerCase()) {
            case "cpu":
                return "cpu";
            case "memory":
                return "memory";
            case "disk":
                return "disk";
            case "network":
                return "network";
            default:
                return "system";
        }
    }

    /**
     * Helper method to check if a field represents usage for a metric type
     */
    private boolean isUsageField(String field, String metricType) {
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
}