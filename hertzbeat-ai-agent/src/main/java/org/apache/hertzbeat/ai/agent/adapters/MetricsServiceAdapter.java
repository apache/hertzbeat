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

package org.apache.hertzbeat.ai.agent.adapters;

import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;

/**
 * Interface that provides access to metrics information by retrieving metrics data
 * through the underlying metrics service.
 */
public interface MetricsServiceAdapter {

    /**
     * Check warehouse storage server status
     * @return true if warehouse is available, false otherwise
     */
    Boolean getWarehouseStorageServerStatus();

    /**
     * Query real-time metrics data
     * @param monitorId Monitor ID
     * @param metrics Metrics name
     * @return Real-time metrics data
     */
    MetricsData getMetricsData(Long monitorId, String metrics);

    /**
     * Query historical metrics data
     * @param monitorId Monitor ID
     * @param app Monitor type
     * @param metrics Metrics name
     * @param metric Metric field name
     * @param label Label filter
     * @param history Query historical time period
     * @param interval Whether to aggregate data
     * @return Historical metrics data
     */
    MetricsHistoryData getMetricHistoryData(Long monitorId, String app, String metrics, String metric, String label, String history, Boolean interval);
}