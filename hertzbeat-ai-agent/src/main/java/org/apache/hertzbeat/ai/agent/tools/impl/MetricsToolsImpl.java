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
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
    @Tool(name = "query_realtime_metrics", description = """
            Get the supported monitor types/names from the list_monitor_types tool, make sure to use right name in the next call
            Use the query_monitors tool to find monitor IDs in case the user does not tell the id explicitly. You might have to use this multiple times based on the user's query
            Get real-time metrics data for a specific monitor.
            Returns current metrics values including CPU, memory, disk usage, etc.
            Based on the monitor type/name, use the get_apps_metrics_hierarchy tool to get the metrics hierarchy. i.e., metrics and the field parameter (sub-metric).
            Each metric has its submetrics as well for example: cpu has field parameters or sub-metrics  like 'usage', 'load', 'core'. These value might be numeric or string
            User might ask about specific metrics like 'cpu usage', 'memory used', 'disk available', etc.
            So use this tool to get the real-time metrics data for the monitor- user asked the specific metrics for, along with any logical or numeric conditions if the user mentions
            In case of multiple monitors matching the user's description, you might have to call query_realtime_metrics tool mutliple times with different parameters.
            
            
            EXAMPLE WORKFLOW
            
            If the user asks for 'cpu usage' for a particular monitor or multiple matching monitors like 'web server', 'database server', etc.
            Get the closest matching monitor name from list_monitor_types tool.
            Call query_monitors tool to get the monitor ID/IDs with the obtained monitor type
            Call get_apps_metrics_hierarchy tool to get all the metrics (type=metric) for the obtained monitor type
            Call query_realtime_metrics tool with each of the IDs and the closest matching metrics name (e.g., 'cpu', 'memory', etc.)
            From the result, do whatever operation user wants you to do with the data. In this example case display the cpu usage for each matching monitor.
            """)
    public String getRealtimeMetrics(
            @ToolParam(description = "Monitor ID", required = true) Long monitorId,
            @ToolParam(description = "Metrics name (e.g., 'system', 'cpu', 'memory') obtained from get_apps_metrics_hierarchy result", required = true) String metrics) {
        try {
            log.info("Getting real-time metrics for monitor {} and metrics {}", monitorId, metrics);
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current subject in get_realtime_metrics tool: {}", subjectSum);

            MetricsData metricsData = metricsServiceAdapter.getMetricsData(monitorId, metrics);

            if (metricsData == null) {
                return String.format("No real-time metrics data found for monitor ID %d and metrics '%s'", monitorId, metrics);
            }

            StringBuilder response = new StringBuilder();
            response.append("REAL-TIME METRICS DATA\n");
            response.append("=".repeat(50)).append("\n");
            response.append("Monitor ID: ").append(monitorId).append("\n");
            response.append("Metrics: ").append(metrics).append("\n");
            response.append("=".repeat(50)).append("\n\n");

            if (metricsData.getValueRows() != null && !metricsData.getValueRows().isEmpty()) {
                List<Field> fields = metricsData.getFields();

                response.append("Available Field Parameters (Sub-metrics):\n");
                response.append("-".repeat(40)).append("\n");

                for (ValueRow valueRow : metricsData.getValueRows()) {
                    // Show labels if available
                    if (valueRow.getLabels() != null && !valueRow.getLabels().isEmpty()) {
                        response.append("Instance Labels: ").append(valueRow.getLabels()).append("\n");
                        response.append("-".repeat(20)).append("\n");
                    }

                    List<Value> values = valueRow.getValues();
                    for (int i = 0; i < values.size() && i < fields.size(); i++) {
                        Field field = fields.get(i);
                        Value value = values.get(i);

                        // Enhanced field information display
                        response.append("• Field Parameter: ").append(field.getName());
                        if (field.getUnit() != null && !field.getUnit().isEmpty()) {
                            response.append(" (").append(field.getUnit()).append(")");
                        }
                        response.append("\n");

                        response.append("  Current Value: ").append(value.getOrigin());

                        // Add data type indication
                        try {
                            Double.parseDouble(value.getOrigin());
                            response.append(" [Numeric]");
                        } catch (NumberFormatException e) {
                            response.append(" [String]");
                        }
                        response.append("\n\n");
                    }

                    if (valueRow.getLabels() != null && !valueRow.getLabels().isEmpty()) {
                        response.append("-".repeat(20)).append("\n");
                    }
                }
            } else {
                response.append("No field parameter data available for metrics '").append(metrics).append("'.\n");
                response.append("Use get_apps_metrics_hierarchy tool to check available metrics for this monitor type.");
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
            Use the query_monitors tool to find the correct monitor IDs/ name or type for the monitor(s) user asked the metrics for
            Pass that name into the get_apps_metrics_hierarchy tool to get the metrics hierarchy i.e metrics and the field paramater
            DO NOT USE THE LABEL FIELD ALWAYS USE THE VALUE FIELD FROM THE HIERARCHY JSON
            Ask user to provide the filters for labels, history and interval aggregation
            """)
    public String getHistoricalMetrics(
            @ToolParam(description = "Monitor ID", required = true) Long monitorId,
            @ToolParam(description = "Monitor type (e.g., 'linux', 'mysql', 'http')", required = true) String app,
            @ToolParam(description = "Metrics name (e.g., 'target', 'cpu', 'memory')", required = true) String metrics,
            @ToolParam(description = "Field Parameter (e.g., 'usage', 'used', 'available')", required = false) String fieldParameter,
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
                    monitorId, app, metrics, fieldParameter, label, history, interval);

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

}