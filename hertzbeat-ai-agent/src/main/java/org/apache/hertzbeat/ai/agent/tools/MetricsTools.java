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
     * Check warehouse storage server status
     * @return Status of the metrics storage system
     */
    String getWarehouseStatus();

}
