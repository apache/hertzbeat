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

package org.apache.hertzbeat.ai.adapters.impl;

import com.usthe.sureness.subject.SubjectSum;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.adapters.MetricsServiceAdapter;
import org.apache.hertzbeat.ai.config.McpContextHolder;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.springframework.stereotype.Component;

/**
 * Implementation of the MetricsServiceAdapter interface that provides access to metrics information
 * through direct service injection instead of reflection.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MetricsServiceAdapterImpl implements MetricsServiceAdapter {

    private final MetricsDataService metricsDataService;

    @Override
    public Boolean getWarehouseStorageServerStatus() {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getWarehouseStorageServerStatus: {}", subjectSum);

            Boolean result = metricsDataService.getWarehouseStorageServerStatus();
            
            log.debug("Successfully retrieved warehouse storage server status: {}", result);
            return result;

        } catch (Exception e) {
            log.error("Failed to invoke getWarehouseStorageServerStatus via adapter", e);
            throw new RuntimeException("Failed to invoke getWarehouseStorageServerStatus via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public MetricsData getMetricsData(Long monitorId, String metrics) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getMetricsData: {}", subjectSum);

            MetricsData result = metricsDataService.getMetricsData(monitorId, metrics);
            
            log.debug("Successfully retrieved metrics data for monitor {} and metrics {}", monitorId, metrics);
            return result;

        } catch (Exception e) {
            log.error("Failed to invoke getMetricsData via adapter for monitor {} and metrics {}", monitorId, metrics, e);
            throw new RuntimeException("Failed to invoke getMetricsData via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public MetricsHistoryData getMetricHistoryData(Long monitorId, String app, String metrics, String metric, String label, String history, Boolean interval) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getMetricHistoryData: {}", subjectSum);

            MetricsHistoryData result = metricsDataService.getMetricHistoryData(
                    monitorId, app, metrics, metric, label, history, interval);
            
            log.debug("Successfully retrieved historical metrics data for monitor {} and metrics {}", monitorId, metrics);
            return result;

        } catch (Exception e) {
            log.error("Failed to invoke getMetricHistoryData via adapter for monitor {} and metrics {}", monitorId, metrics, e);
            throw new RuntimeException("Failed to invoke getMetricHistoryData via adapter: " + e.getMessage(), e);
        }
    }
}
