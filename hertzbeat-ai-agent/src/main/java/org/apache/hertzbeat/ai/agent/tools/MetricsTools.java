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
 * Tools for metrics data operations and queries
 */
public interface MetricsTools {

    /**
     * Get real-time metrics data for a monitor
     * @param monitorId Monitor ID
     * @param metrics Metrics name (e.g., "system", "cpu", "memory")
     * @return Formatted real-time metrics data
     */
    String getRealtimeMetrics(Long monitorId, String metrics);

    /**
     * Get historical metrics data for a monitor
     * @param monitorId Monitor ID
     * @param app Monitor type (e.g., "linux", "mysql", "http")
     * @param metrics Metrics name (e.g., "system", "cpu", "memory")
     * @param metric Specific metric field (e.g., "usage", "used", "available")
     * @param label Label filter for specific instances
     * @param history Time range (e.g., "1h", "6h", "24h", "7d")
     * @param interval Whether to aggregate data with intervals
     * @return Historical metrics data formatted for display
     */
    String getHistoricalMetrics(Long monitorId, String app, String metrics, String metric, String label, String history, Boolean interval);

    /**
     * Find monitors with high resource usage
     * @param metricType Type of metric to check (cpu, memory, disk, network)
     * @param threshold Threshold percentage (e.g., 80 for 80%)
     * @param monitorType Monitor type filter (optional)
     * @return List of monitors exceeding the threshold
     */
    String getHighUsageMonitors(String metricType, Double threshold, String monitorType);

    /**
     * Get usage trend data for various metrics with comprehensive charting support
     * @param metricType Metric type: 'cpu', 'memory', 'disk', 'network', 'custom'
     * @param monitorId Monitor ID for specific monitor (optional if host provided)
     * @param host Server host/IP address for monitor lookup (optional if monitorId provided)
     * @param timeRange Time range: '1h', '6h', '24h', '7d', '30d'
     * @param customField Custom metric field name (required only when metricType='custom')
     * @return Time-series usage data suitable for charting and analysis
     */
    String getUsageTrend(String metricType, Long monitorId, String host, String timeRange, String customField);

    /**
     * Get comprehensive system metrics summary for multiple monitors
     * @param monitorType Monitor type filter (optional)
     * @param metricTypes Comma-separated metric types (cpu,memory,disk)
     * @return Summary of current system metrics across monitors
     */
    String getSystemMetricsSummary(String monitorType, String metricTypes);

    /**
     * Check warehouse storage server status
     * @return Status of the metrics storage system
     */
    String getWarehouseStatus();

}
